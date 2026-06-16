#ifndef HTTP_PARSER_H
#define HTTP_PARSER_H

#define MAX_METHOD_SIZE 16
#define MAX_PATH_SIZE 1024
#define MAX_VERSION_SIZE 16


typedef struct http_request_line
{
    char method[MAX_METHOD_SIZE];
    char path[MAX_PATH_SIZE];
    char version[MAX_VERSION_SIZE];
} http_request_line_t;

int parse_http_request_line(const char *raw_request, http_request_line_t *request);

#endif // HTTP_PARSER_H