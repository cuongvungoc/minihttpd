#ifndef __UTIL_H__
#define __UTIL_H__

#include <string.h>

#define TRUE 1
#define FALSE 0

#define CRLF "\r\n"
#define DOUBLE_CRLF "\r\n\r\n"
#define HTTP_CRLF_LEN (sizeof(CRLF) - 1)
#define MAX_HTTP_HEADER_SIZE 4096
#define MAX_URL_SIZE 1024

#define ROOT_PATH "/"
#define WEB_ROOT_DIR "./www"
#define INDEX_FILE_PATH "/index.html"

#define SPACE_CHAR ' '

#define SAFE_STRNCPY(dst, src, size)       \
    do                                     \
    {                                      \
        if ((size) > 0)                    \
        {                                  \
            strncpy((dst), (src), (size) - 1); \
            (dst)[(size) - 1] = '\0';      \
        }                                  \
    } while (0)


#define SAFE_FREE(ptr) do { free(ptr); (ptr) = NULL; } while(0)

int hex_to_int(char c);

#endif // __UTIL_H__
