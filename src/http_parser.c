#include "http_parser.h"
#include <string.h>
#include <stdio.h>

#include "util.h"
#include "static_file.h"


/* Parse the HTTP request line */
int parse_http_request_line(const char *http_request_line_str, http_request_line_t *request)
{
    char *delimiters = " ";
    char *save_context = NULL;
    char *token = NULL;

    token = strtok_r((char *)http_request_line_str, delimiters, &save_context);
    if (token != NULL) {
        strncpy(request->method, token, MAX_METHOD_SIZE - 1);
        request->method[MAX_METHOD_SIZE - 1] = '\0';
    }

    token = strtok_r(NULL, delimiters, &save_context);
    if (token != NULL) {
        strncpy(request->path, token, MAX_PATH_SIZE - 1);
        request->path[MAX_PATH_SIZE - 1] = '\0';
    }

    token = strtok_r(NULL, delimiters, &save_context);
    if (token != NULL) {
        strncpy(request->version, token, MAX_VERSION_SIZE - 1);
        request->version[MAX_VERSION_SIZE - 1] = '\0';
    }

    return TRUE;
}


/* Handle the HTTP request */
int handle_http_request(char *raw_request, int client_socket)
{
    http_request_line_t http_request_line = {0};
    char *http_request_line_str = NULL;

    http_request_line_str = strtok(raw_request, CRLF);
    if (http_request_line_str == NULL)
    {
        printf("Failed to parse HTTP request line.\n");
        return FALSE;
    }

    if (!parse_http_request_line(raw_request, &http_request_line)) {
        return FALSE;
    }

    serve_static_file(http_request_line.path, client_socket);

    return TRUE;
}
