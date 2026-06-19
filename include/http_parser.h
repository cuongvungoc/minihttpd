#ifndef __HTTP_PARSER_H__
#define __HTTP_PARSER_H__

#include <stdio.h>

#define MAX_METHOD_SIZE 16
#define MAX_PATH_SIZE 1024
#define MAX_VERSION_SIZE 16
#define HTTP_REQUEST_LINE_NUM 3
// #define MAX_HTTP_HEADER_SIZE 8192

typedef enum
{
    HTTP_VER_0_9,
    HTTP_VER_1_0,
    HTTP_VER_1_1,
    HTTP_VER_NUM,
} http_version_t;

// typedef enum
// {
//     HTTP_METHOD_GET,
//     HTTP_METHOD_POST,
//     HTTP_METHOD_HEAD,
//     HTTP_METHOD_OPTIONS,
//     HTTP_METHOD_PUT,
//     HTTP_METHOD_PATCH,
//     HTTP_METHOD_DELETE,
// } http_method_t;

typedef struct http_request
{
    /* HTTP request line*/
    char method[MAX_METHOD_SIZE];
    char path[MAX_PATH_SIZE];
    char version[MAX_VERSION_SIZE];

    char host[256];
    char connection[64];
    char content_type[128];

    size_t content_length;
} http_request_t;


// int parse_http_request_line(const char *raw_request, http_request_t *request);
int handle_http_request(char *raw_request, int client_socket);

#endif // HTTP_PARSER_H