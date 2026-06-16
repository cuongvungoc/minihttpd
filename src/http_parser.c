#include "http_parser.h"
#include <string.h>
#include <stdio.h>
#include "util.h"

int parse_http_request_line(const char *raw_request, http_request_line_t *request)
{
    char *delimiters = " ";
    char *save_context = NULL;
    char *token = NULL;

    token = strtok_r((char *)raw_request, delimiters, &save_context);
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