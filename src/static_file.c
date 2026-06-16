#include "http_parser.h"
#include <string.h>
#include <stdio.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/sendfile.h>

#include "util.h"

#define ROOT_PATH "/"
#define WEB_ROOT_DIR "./www"
#define INDEX_FILE_PATH "/index.html"

/* Get the relative path for the requested file */
static void get_relative_path(const char *request_path, char *relative_path, size_t size)
{
    /* If the request path is the root, serve the index file */
    if (strcmp(request_path, ROOT_PATH) == 0) {
        request_path = INDEX_FILE_PATH;
    }
    if (snprintf(relative_path, size, "%s%s", WEB_ROOT_DIR, request_path) < 0) 
    {
        fprintf(stderr, "Failed to create relative path.\n");
    }
}

/* Check if a file exists */
static int is_file_exists(const char *path)
{
    struct stat buffer;
    return (stat(path, &buffer) == 0) ? TRUE : FALSE;
}

/* Check if a file is a regular file */
static int is_regular_file(const char *path)
{
    struct stat buffer;

    if (path == NULL)
    {
        return FALSE;
    }

    if (stat(path, &buffer) != 0)
    {
        return FALSE;
    }

    return S_ISREG(buffer.st_mode) ? TRUE : FALSE;
}

/* Get the size of a file by its file descriptor */
static long get_file_size_by_fd(int fd)
{
    struct stat st;

    if (fstat(fd, &st) != 0)
        return -1;

    return st.st_size;
}


static int send_all(int client_socket, const void *buf, size_t len)
{
    const char *p = buf;
    size_t sent_total = 0;
    ssize_t sent = 0;

    while (sent_total < len)
    {
        sent = send(client_socket, p + sent_total, len - sent_total, 0);

        if (sent < 0)
        {
            // if (errno == EINTR)
            //     continue;
            return FALSE;
        }

        if (sent == 0)
            return FALSE;

        sent_total += sent;
    }

    return TRUE;
}

/* Convert relative file path to absolute path */
void serve_static_file(const char *path, int client_socket)
{
    char relative_path[MAX_PATH_SIZE] = {0};
    FILE *file = NULL;
    char header[512] = {0};
    int header_len = 0;
    long file_size = 0;
    off_t offset = 0;
    ssize_t sent = 0;

    get_relative_path(path, relative_path, sizeof(relative_path));
    printf("Serving static file: %s\n", relative_path);

    if (!is_file_exists(relative_path) || !is_regular_file(relative_path))
    {
        // Handle 404 Not Found
    }

    /* Serve the file */
    file = fopen(relative_path, "rb");
    if (file == NULL)
    {
        fprintf(stderr, "Failed to open file: %s\n", relative_path);
        return;
    }

    file_size = get_file_size_by_fd(fileno(file));
    if (file_size < 0)
    {
        fclose(file);

        /* Send 500 Internal Server Error */
        return;
    }

    header_len = snprintf(header,
                          sizeof(header),
                          "HTTP/1.1 200 OK\r\n"
                          "Content-Type: %s\r\n"
                          "Content-Length: %ld\r\n"
                          "Connection: close\r\n"
                          "\r\n",
                          "text/html",
                          file_size);
    
    
    if (header_len < 0 || header_len >= (int)sizeof(header))
    {
        fclose(file);
        return;
    }

    /* Send the response headers */
    if (send_all(client_socket, header, header_len) < 0)
    {
        fclose(file);
        return;
    }

    /* Send the response body */
    while (offset < file_size)
    {
        sent = sendfile(client_socket,
                        fileno(file),
                        &offset,
                        file_size - offset);

        if (sent < 0)
        {
            // if (errno == EINTR)
            //     continue;

            perror("sendfile");
            break;
        }

        if (sent == 0)
            break;
    }

    fclose(file);
}
