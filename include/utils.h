#ifndef __UTIL_H__
#define __UTIL_H__

#define TRUE 1
#define FALSE 0

#define CRLF "\r\n"
#define DOUBLE_CRLF "\r\n\r\n"
#define MAX_HTTP_HEADER_SIZE 4096
#define MAX_URL_SIZE 1024

#define ROOT_PATH "/"
#define WEB_ROOT_DIR "./www"
#define INDEX_FILE_PATH "/index.html"

int hex_to_int(char c);

#endif // __UTIL_H__