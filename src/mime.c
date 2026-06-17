#include "mime.h"
#include "string.h"

#define DEFAULT_MIME_TYPE "application/octet-stream"

static mime_type_t mime_types[] = {
    { "txt", "text/plain" },
    { "html", "text/html" },
    { "htm", "text/html" },
    { "css", "text/css" },
    { "js", "application/javascript" },

    { "png", "image/png" },
    { "jpg", "image/jpeg" },
    { "jpeg", "image/jpeg" },
    { "gif", "image/gif" },
    { "svg", "image/svg+xml" },
    { "ico", "image/x-icon" },

    { "json", "application/json" },
    { "zip", "application/zip" },
    { "tar", "application/x-tar" },
    { "tar.gz", "application/x-compress-tar" },
    { "xml", "application/xml" },
    { "pdf", "application/pdf" },
    { NULL, NULL }
};

/* Get the MIME type from the file path */
const char *get_mime_type(const char *path)
{
    int i = 0;
    const char *extension = strrchr(path, '.');
    if (!extension)
        return DEFAULT_MIME_TYPE;

    extension++;

    for (i = 0; mime_types[i].extension != NULL; i++)
    {
        if (strcmp(extension, mime_types[i].extension) == 0)
            return mime_types[i].type;
    }

    return DEFAULT_MIME_TYPE;
}