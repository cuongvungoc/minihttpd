#include <sys/types.h>
#include <errno.h>
#include <arpa/inet.h>
#include <sys/sendfile.h>
#include "http_response.h"
#include "utils.h"


/* Send an exact number of bytes over a socket */
static int socket_send_exact(int client_socket, const void *buf, size_t len)
{
    const char *p = buf;
    size_t sent_total = 0;
    ssize_t sent = 0;

    while (sent_total < len)
    {
        sent = send(client_socket, p + sent_total, len - sent_total, 0);

        if (sent < 0)
        {
            if (errno == EINTR)
                continue;
            return FALSE;
        }

        if (sent == 0)
            return FALSE;

        sent_total += sent;
    }

    return TRUE;
}


/* Get the reason phrase for a given status code */
static const char *get_reason_phrase(status_code_t status_code)
{
    switch (status_code)
    {
    case STATUS_OK:
        return "OK";
    case STATUS_BAD_REQUEST:
        return "Bad Request";
    case STATUS_FORBIDDEN:
        return "Forbidden";
    case STATUS_NOT_FOUND:
        return "Not Found";
    case STATUS_METHOD_NOT_ALLOWED:
        return "Method Not Allowed";
    case STATUS_URI_TOO_LONG:
        return "URI Too Long";
    case STATUS_INTERNAL_SERVER_ERROR:
        return "Internal Server Error";
    case STATUS_NOT_IMPLEMENTED:
        return "Not Implemented";
    }
    return "Unknown Status";
}


/* Send an error response */
int send_error_response(int client_socket, int status_code)
{
    char header[256] = {0};
    int header_len = 0;
    const char *status_text = get_reason_phrase(status_code);

    header_len = snprintf(header, sizeof(header),
                          "HTTP/1.1 %d %s\r\n"
                          "Content-Type: text/html\r\n"
                          "Connection: close\r\n"
                          "\r\n"
                          "<html><body><h1>%d %s</h1></body></html>",
                          status_code, status_text,
                          status_code, status_text);

    if (header_len < 0 || header_len >= (int)sizeof(header))
    {
        return FALSE;
    }

    return socket_send_exact(client_socket, header, header_len);
}


/* Send a file response */
int send_file_response(int client_socket, int status_code, const char *content_type, const char *relative_path, off_t file_size)
{
    FILE *file = NULL;
    char header[MAX_HTTP_HEADER_SIZE] = {0};
    int header_len = 0;
    off_t offset = 0;
    ssize_t sent = 0;
    const char *status_text = get_reason_phrase(status_code);

    file = fopen(relative_path, "rb");
    if (file == NULL)
    {
        fprintf(stderr, "Failed to open file: %s\n", relative_path);
        /* Both ENOENT and EACCES result in a 404 response for protected files */
        if (errno == ENOENT || errno == EACCES)
        {
            send_error_response(client_socket, STATUS_NOT_FOUND);
        }
        else
        {
            send_error_response(client_socket, STATUS_INTERNAL_SERVER_ERROR);
        }
        return FALSE;
    }

    header_len = snprintf(header, sizeof(header),
                          "HTTP/1.1 %d %s\r\n"
                          "Content-Type: %s\r\n"
                          "Content-Length: %lld\r\n"
                          "Connection: close\r\n"
                          "\r\n",
                          status_code, status_text,
                          content_type,
                          (long long)file_size);

    if (!socket_send_exact(client_socket, header, header_len))
    {
        fprintf(stderr, "Failed to send response header\n");
        fclose(file);
        return FALSE;
    }

    while (offset < file_size)
    {
        sent = sendfile(client_socket, fileno(file), &offset, file_size - offset);
        if (sent < 0)
        {
            if (errno == EINTR)
                continue;

            fprintf(stderr, "Failed to send response body\n");
            fclose(file);
            return FALSE;
        }

        /* Check if the entire file has been sent */
        if (sent == 0)
            break;
    }

    fclose(file);
    return TRUE;
}