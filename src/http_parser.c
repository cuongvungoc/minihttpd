#include "http_parser.h"
#include <string.h>
#include <stdio.h>

#include "util.h"
#include "static_file.h"
#include "http_response.h"


typedef enum
{
    HTTP_PARSE_OK = 0,
    HTTP_PARSE_BAD_REQUEST = 400,
    HTTP_PARSE_URI_TOO_LONG = 414,
    HTTP_PARSE_METHOD_NOT_ALLOWED = 405,
    HTTP_PARSE_VERSION_NOT_SUPPORTED = 505

} http_parse_result_t;

/* Parse the HTTP request line
 * Returns HTTP_PARSE_OK on success, or an error code on failure.
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


/* Handle the HTTP request */
int handle_http_request(char *raw_request, int client_socket)
{
    http_request_line_t http_request_line = {0};
    char *http_request_line_str = NULL;
    http_parse_result_t parse_result = {0};

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

    serve_static_file(client_socket, http_request_line.path);

    return TRUE;
}
