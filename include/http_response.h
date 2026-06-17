#ifndef __HTTP_RESPONSE_H__
#define __HTTP_RESPONSE_H__

#include "status.h"

int send_error_response(int client_socket, int status_code);
int send_file_response(int client_socket, int status_code, const char *content_type, const char *relative_path, off_t file_size);

#endif /* __HTTP_RESPONSE_H__ */