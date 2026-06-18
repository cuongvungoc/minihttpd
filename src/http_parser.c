#include "http_parser.h"
#include <string.h>
#include <stdio.h>
#include <stdlib.h>

#include "utils.h"
#include "static_file.h"
#include "http_response.h"

#define DOUBLE_DOT ".."
#define DOUBLE_DOT_ENCODED "%2e%2e"
typedef enum
{
    HTTP_PARSE_OK = 0,
    HTTP_PARSE_BAD_REQUEST = 400,
    HTTP_PARSE_URI_TOO_LONG = 414,
    HTTP_PARSE_METHOD_NOT_ALLOWED = 405,
    HTTP_PARSE_VERSION_NOT_SUPPORTED = 505

} http_parse_result_t;


/* Parse the HTTP request line
 * Returns HTTP_PARSE_OK on success, or a corresponding error code on failure.
 */
int parse_http_request_line(const char *http_request_line_str, http_request_line_t *request)
{
    char *delimiters = " ";
    char *save_context = NULL;
    char *token = NULL;

    /* Parse the HTTP method */
    token = strtok_r((char *)http_request_line_str, delimiters, &save_context);
    if (token == NULL) {
        fprintf(stderr, "Failed to parse HTTP method.\n");
        return HTTP_PARSE_BAD_REQUEST;
    }
    strncpy(request->method, token, MAX_METHOD_SIZE - 1);
    request->method[MAX_METHOD_SIZE - 1] = '\0';

    /* Parse the HTTP path */
    token = strtok_r(NULL, delimiters, &save_context);
    if (token == NULL) {
        fprintf(stderr, "Failed to parse HTTP path.\n");
        return HTTP_PARSE_BAD_REQUEST;
    }
    if (strlen(token) >= MAX_PATH_SIZE) {
        fprintf(stderr, "HTTP path is too long.\n");
        return HTTP_PARSE_URI_TOO_LONG;
    }
    strncpy(request->path, token, MAX_PATH_SIZE - 1);
    request->path[MAX_PATH_SIZE - 1] = '\0';

    /* Parse the HTTP version */
    token = strtok_r(NULL, delimiters, &save_context);
    if (token == NULL) {
        fprintf(stderr, "Failed to parse HTTP version.\n");
        return HTTP_PARSE_BAD_REQUEST;
    }
    strncpy(request->version, token, MAX_VERSION_SIZE - 1);
    request->version[MAX_VERSION_SIZE - 1] = '\0';


    return HTTP_PARSE_OK;
}


/* URL decode a percent-encoded string */
static int url_decode(const char *src, char *dst, size_t dst_size)
{
    size_t i = 0;
    size_t j = 0;
    int high = 0;
    int low = 0;

    if (!src || !dst || dst_size == 0)
        return FALSE;

    while (src[i] != '\0')
    {
        if (j >= dst_size - 1)
        {
            return FALSE;
        }

        if (src[i] == '%')
        {
            if (src[i + 1] == '\0' || src[i + 2] == '\0')
            {
                return FALSE;
            }

            high = hex_to_int(src[i + 1]);
            low  = hex_to_int(src[i + 2]);

            if (high < 0 || low < 0)
            {
                return FALSE;
            }

            dst[j++] = (char)((high << 4) | low);
            i += 3;
        }
        else if (src[i] == '+')
        {
            dst[j++] = ' ';
            i++;
        }
        else
        {
            dst[j++] = src[i++];
        }
    }

    dst[j] = '\0';

    printf("src: %s, dest: %s", src, dst);

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

    free(absolute_root_path);
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
        free(absolute_path);
        return FALSE;
    }

    /* Check if the requested path is inside the web root directory */
    if (is_path_inside_web_root_dir(WEB_ROOT_DIR, absolute_path) == FALSE)
    {
        fprintf(stderr, "Path traversal attempt detected - path not inside root: %s\n", path);
        free(absolute_path);
        return FALSE;
    }

    free(absolute_path);
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


/* Handle the HTTP request */
int handle_http_request(char *raw_request, int client_socket)
{
    http_request_line_t http_request_line = {0};
    http_parse_result_t parse_result = {0};
    char *http_request_line_str = NULL;
    char relative_path[MAX_PATH_SIZE] = {0};

    /* Parse the HTTP request line */
    http_request_line_str = strtok(raw_request, CRLF);
    if (http_request_line_str == NULL)
    {
        printf("Failed to parse HTTP request line.\n");
        return FALSE;
    }

    parse_result = parse_http_request_line(http_request_line_str, &http_request_line);
    if (parse_result != HTTP_PARSE_OK) {
        send_error_response(client_socket, parse_result);
        return FALSE;
    }

    /* URL decode the requested path */
    if (url_decode(http_request_line.path, http_request_line.path, sizeof(http_request_line.path)) == FALSE)
    {
        send_error_response(client_socket, HTTP_PARSE_BAD_REQUEST);
        return FALSE;
    }

    get_relative_path(http_request_line.path, relative_path, sizeof(relative_path));

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
