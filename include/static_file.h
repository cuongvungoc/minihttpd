#ifndef STATIC_FILE_H
#define STATIC_FILE_H

#include <sys/types.h>

void serve_static_file(const char *path, int client_socket);

#endif /* STATIC_FILE_H */