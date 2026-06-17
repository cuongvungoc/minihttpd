#include "http_parser.h"
#include <string.h>
#include <stdio.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <unistd.h>
#include <arpa/inet.h>
#include <sys/sendfile.h>
#include <errno.h>

#include "util.h"
#include "status.h"
#include "http_response.h"

#define ROOT_PATH "/"
#define WEB_ROOT_DIR "./www"
#define INDEX_FILE_PATH "/index.html"

typedef enum
{
    FILE_OK = 0,
    FILE_FORBIDDEN = 403,
    FILE_NOT_FOUND = 404,
    FILE_INTERNAL_ERROR = 500

} file_verification_result_code_t;

/* Get the relative path for the requested file */
static void get_relative_path(const char *request_path, char *relative_path, size_t size)
{
    /* If the request path is the root, serve the index file */
    if (strcmp(request_path, ROOT_PATH) == 0) {
        request_path = INDEX_FILE_PATH;
    }

    if (snprintf(relative_path, size, "%s%s", WEB_ROOT_DIR, request_path) < 0) 
    {
        fprintf(stderr, "Failed to create relative path.\n");
    }
}

/* Verify the requested file */
static int verify_request_file(const char *path)
{
    struct stat st;

    if (stat(path, &st) != 0)
    {
        return FILE_NOT_FOUND;
    }

    if (!S_ISREG(st.st_mode) || S_ISDIR(st.st_mode))
    {
        return FILE_FORBIDDEN;
    }

    return FILE_OK;
}

/* Get the size of a file by its path */
static off_t get_file_size(const char *path)
{
    struct stat st;

    if (stat(path, &st) != 0)
    {
        fprintf(stderr, "Failed to get file size: %s\n", path);
        return -1;
    }

    return st.st_size;
}

/* Convert relative file path to absolute path */
int serve_static_file(int client_socket, const char *path)
{
    char relative_path[MAX_PATH_SIZE] = {0};
    off_t file_size = 0;
    file_verification_result_code_t file_verify_code = 0;

    get_relative_path(path, relative_path, sizeof(relative_path));
    printf("Serving static file: %s\n", relative_path);

    /* Verify the requested file */
    file_verify_code = verify_request_file(relative_path);
    if (file_verify_code != FILE_OK)
    {
        send_error_response(client_socket, file_verify_code);
        fprintf(stderr, "File verification failed: %d\n", file_verify_code);
        return FALSE;
    }

    file_size = get_file_size(relative_path);
    if (file_size < 0)
    {
        /* Send 500 Internal Server Error */
        send_error_response(client_socket, STATUS_INTERNAL_SERVER_ERROR);
        return FALSE;
    }

    /* Send the file response */
    send_file_response(client_socket, STATUS_OK, "text/html", relative_path, file_size);
    return TRUE;
}
