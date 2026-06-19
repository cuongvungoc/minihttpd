#include "http_parser.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#include "utils.h"
#include "static_file.h"
#include "http_response.h"

#define DOUBLE_DOT ".."
#define DOUBLE_DOT_ENCODED "%2e%2e"
#define URL_PERCENT_CHAR '%'
#define URL_PLUS_CHAR '+'
#define URL_SPACE_CHAR ' '
#define URL_HEX_HIGH_OFFSET 1
#define URL_HEX_LOW_OFFSET 2
#define URL_ENCODED_CHAR_LEN 3
#define HEX_BITS_PER_DIGIT 4
#define HTTP_HEADER_SEPARATOR ':'
#define HTTP_HEADER_HOST "Host"
#define HTTP_HEADER_CONNECTION "Connection"
#define HTTP_HEADER_CONTENT_TYPE "Content-Type"
#define HTTP_HEADER_CONTENT_LENGTH "Content-Length"
typedef enum
{
    HTTP_PARSE_OK = 0,
    HTTP_PARSE_BAD_REQUEST = 400,
    HTTP_PARSE_URI_TOO_LONG = 414,
    HTTP_PARSE_METHOD_NOT_ALLOWED = 405,
    HTTP_PARSE_VERSION_NOT_SUPPORTED = 505

} http_parse_result_t;

const char * const http_versions[] =
{
    [HTTP_VER_0_9] = "HTTP/0.9",
    [HTTP_VER_1_0] = "HTTP/1.0",
    [HTTP_VER_1_1] = "HTTP/1.1",
};


/* URL decode a percent-encoded string */
static int url_decode(const char *src, char *dst, size_t dst_size)
{
    size_t src_idx = 0;
    size_t dst_idx = 0;
    int high = 0;
    int low = 0;

    if (!src || !dst || dst_size == 0)
        return FALSE;

    while (src[src_idx] != '\0')
    {
        if (dst_idx >= dst_size - 1)
        {
            return FALSE;
        }

        if (src[src_idx] == URL_PERCENT_CHAR)
        {
            if (src[src_idx + URL_HEX_HIGH_OFFSET] == '\0' ||
                src[src_idx + URL_HEX_LOW_OFFSET] == '\0')
            {
                return FALSE;
            }

            high = hex_to_int(src[src_idx + URL_HEX_HIGH_OFFSET]);
            low  = hex_to_int(src[src_idx + URL_HEX_LOW_OFFSET]);

            if (high < 0 || low < 0)
            {
                return FALSE;
            }

            dst[dst_idx++] = (char)((high << HEX_BITS_PER_DIGIT) | low);
            src_idx += URL_ENCODED_CHAR_LEN;
        }
        else if (src[src_idx] == URL_PLUS_CHAR)
        {
            dst[dst_idx++] = URL_SPACE_CHAR;
            src_idx++;
        }
        else
        {
            dst[dst_idx++] = src[src_idx++];
        }
    }

    dst[dst_idx] = '\0';

    printf("src: %s, dest: %s\n", src, dst);

    return TRUE;
}


/* Check if the requested path is inside the web root directory */
static int is_path_inside_web_root_dir(const char *web_root_dir, const char *absolute_path)
{
    size_t root_len = 0;
    char *absolute_root_path = NULL;

    absolute_root_path = realpath(web_root_dir, NULL);
    if (absolute_root_path == NULL)
    {
        fprintf(stderr, "Failed to resolve web root directory: %s\n", web_root_dir);
        return FALSE;
    }

    root_len = strlen(absolute_root_path);

    if (strncmp(absolute_root_path, absolute_path, root_len) != 0)
    {
        return FALSE;
    }

    SAFE_FREE(absolute_root_path);
    return TRUE;
}


/* Validate the requested path */
static int validate_path(const char *path)
{
    char *absolute_path = NULL;

    /* Check for path traversal attempts */
    if (strstr(path, DOUBLE_DOT) != NULL)
    {
        fprintf(stderr, "Path traversal attempt detected - double dot: %s\n", path);
        return FALSE;
    }

    /* Resolve the absolute path */
    absolute_path = realpath(path, NULL);
    if (absolute_path == NULL)
    {
        fprintf(stderr, "Failed to resolve absolute path: %s\n", path);
        return TRUE;
    }

    /* Reject absolute paths */
    if (strcmp(absolute_path, path) == 0)
    {
        fprintf(stderr, "Path traversal attempt detected - reject absolute paths: %s\n", path);
        SAFE_FREE(absolute_path);
        return FALSE;
    }

    /* Check if the requested path is inside the web root directory */
    if (is_path_inside_web_root_dir(WEB_ROOT_DIR, absolute_path) == FALSE)
    {
        fprintf(stderr, "Path traversal attempt detected - path not inside root: %s\n", path);
        SAFE_FREE(absolute_path);
        return FALSE;
    }

    SAFE_FREE(absolute_path);
    return TRUE;
}


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


/* Parse the HTTP request line
 * Returns HTTP_PARSE_OK on success, or a corresponding error code on failure.
 */
static int parse_http_request_line(const char *request, http_request_t *req)
{
    int i = 0;
    char ver_support = FALSE;

    if (sscanf(request, "%15s %1023s %15s", req->method, req->path, req->version) != HTTP_REQUEST_LINE_NUM)
    {
        return HTTP_PARSE_BAD_REQUEST;
    }

    for (i = 0; i < HTTP_VER_NUM; i++)
    {
        if (strcmp(req->version, http_versions[i]) == 0)
        {
            ver_support = TRUE;
            break;
        }
    }

    if (ver_support == FALSE)
    {
        return HTTP_PARSE_VERSION_NOT_SUPPORTED;
    }

    return HTTP_PARSE_OK;
}

static int parse_http_header_line(char *line, http_request_t *req)
{
    char *separator = NULL;
    char *header_name = NULL;
    char *header_value = NULL;

    separator = strchr(line, HTTP_HEADER_SEPARATOR);
    if (!separator)
    {
        return HTTP_PARSE_BAD_REQUEST;
    }

    *separator = '\0';

    header_name = line;
    header_value = separator + 1;

    while (*header_value == SPACE_CHAR)
    {
        header_value++;
    }

    if (strcasecmp(header_name, HTTP_HEADER_HOST) == 0)
    {
        SAFE_STRNCPY(req->host, header_value, sizeof(req->host));
    }
    else if (strcasecmp(header_name, HTTP_HEADER_CONNECTION) == 0)
    {
        SAFE_STRNCPY(req->connection, header_value, sizeof(req->connection));
    }
    else if (strcasecmp(header_name, HTTP_HEADER_CONTENT_TYPE) == 0)
    {
        SAFE_STRNCPY(req->content_type, header_value, sizeof(req->content_type));
    }
    else if (strcasecmp(header_name, HTTP_HEADER_CONTENT_LENGTH) == 0)
    {
        req->content_length = (size_t)strtoull(header_value, NULL, 10);
    }

    return HTTP_PARSE_OK;
}


/* Parse HTTP request
 *
 * - Parse HTTP request line (Method, Path, Version)
 * - Parse other HTTP header (Host, Connection, Content-Type, Content-Length) 
 *
 * Return:
 * - HTTP_PARSE_OK if success
 * - Other Error code corresponding HTTP code if failure
 */
static int parse_http_request(const char *request, http_request_t *req)
{
    char *line_start = NULL;
    char *line_end = NULL;
    char buffer[MAX_HTTP_HEADER_SIZE] = {0};
    http_parse_result_t parse_result = HTTP_PARSE_OK;

    printf("parse_http_request : %s", request);

    if (!request || !req)
        return HTTP_PARSE_BAD_REQUEST;

    if (strlen(request) >= sizeof(buffer))
        return HTTP_PARSE_BAD_REQUEST;

    SAFE_STRNCPY(buffer, request, sizeof(buffer));

    /* Parse request line*/
    parse_result = parse_http_request_line(buffer, req);
    if (parse_result != HTTP_PARSE_OK)
        return parse_result;


    line_end = strstr(buffer, CRLF);
    if (!line_end)
        return HTTP_PARSE_BAD_REQUEST;

    *line_end = '\0';
    line_start = line_end + HTTP_CRLF_LEN;

    while (*line_start)
    {
        line_end = strstr(line_start, CRLF);
        if (!line_end)
            return HTTP_PARSE_BAD_REQUEST;


        /* Empty line -> End of header */
        if (line_end == line_start)
            break;

        *line_end = '\0';

        parse_result = parse_http_header_line(line_start, req);
        if (parse_result != HTTP_PARSE_OK)
            return parse_result;

        line_start = line_end + HTTP_CRLF_LEN;

    }

    return HTTP_PARSE_OK;
}


static void dump_http_header(http_request_t *req)
{
    printf("Method: %s\n", req->method);
    printf("Path: %s\n", req->path);
    printf("Version: %s\n", req->version);
    printf("Host: %s\n", req->host);
    printf("Connnection: %s\n", req->connection);
    printf("Content Type: %s\n", req->content_type);
}


/* Handle the HTTP request */
int handle_http_request(char *raw_request, int client_socket)
{
    http_request_t http_request = {0};
    http_parse_result_t parse_result = {0};
    char relative_path[MAX_PATH_SIZE] = {0};

    parse_result = parse_http_request(raw_request, &http_request);
    if (parse_result != HTTP_PARSE_OK)
    {
        send_error_response(client_socket, parse_result);
        return FALSE;
    }

    dump_http_header(&http_request);

    /* URL decode the requested path */
    if (url_decode(http_request.path, http_request.path, sizeof(http_request.path)) == FALSE)
    {
        send_error_response(client_socket, HTTP_PARSE_BAD_REQUEST);
        return FALSE;
    }

    get_relative_path(http_request.path, relative_path, sizeof(relative_path));

    /* Validate the requested path */
    if (validate_path(relative_path) == FALSE)
    {
        send_error_response(client_socket, STATUS_FORBIDDEN);
        return FALSE;
    }

    /* Serve the requested static file */
    serve_static_file(client_socket, relative_path);

    return TRUE;
}
