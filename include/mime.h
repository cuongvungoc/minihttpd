#ifndef __MIME_H__
#define __MIME_H__

typedef struct mime_type {
    const char *extension;
    const char *type;
} mime_type_t;

const char *get_mime_type(const char *path);

#endif // __MIME_H__