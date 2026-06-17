#ifndef STATIC_FILE_H
#define STATIC_FILE_H

#include <sys/types.h>

int serve_static_file(int client_socket, const char *path);

#endif /* STATIC_FILE_H */