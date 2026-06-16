#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <arpa/inet.h>

#include "util.h"

#define PORT 8080
#define BUFFER_SIZE 1024
#define ADDR "127.0.0.1"
#define MAX_CONNECTIONS 5
#define CRLF "\r\n"
#define DOUBLE_CRLF "\r\n\r\n"

int main()
{
    int server_socket;
    int client_socket;
    struct sockaddr_in server_addr;
    struct sockaddr_in client_addr;
    socklen_t client_len = sizeof(client_addr);
    
    int opt = 1;
    int bytes_received = 0;
    int total_bytes_received = 0;
    char buffer[BUFFER_SIZE] = {0};
    // char response[BUFFER_SIZE] = {0};

    const char *http_response = 
                "HTTP/1.1 200 OK\r\n"
                "Content-Type: text/html\r\n"
                "Content-Length: 46\r\n"
                "Connection: close\r\n"
                "\r\n"
                "<html><body><h1>Hello HTTP</h1></body></html>";

    /* Create the TCP socket */
    server_socket = socket(AF_INET, SOCK_STREAM, 0);
    if (server_socket == -1)
    {
        perror("socket");
        return 1;
    }

    /* Allow quick reuse of the port after shutdown */
    if (setsockopt(server_socket, SOL_SOCKET, SO_REUSEADDR, &opt, sizeof(opt)) == -1)
    {
        perror("setsockopt");
        close(server_socket);
        return 1;
    }

    /* Define the server address configurations */
    server_addr.sin_family = AF_INET;
    server_addr.sin_addr.s_addr = INADDR_ANY;
    server_addr.sin_port = htons(PORT);

    /* Bind the socket to the specified address and port */
    if (bind(server_socket, (struct sockaddr *)&server_addr, sizeof(server_addr)) == -1)
    {
        perror("bind");
        close(server_socket);
        return 1;
    }

    /* Start listening for incoming connections */
    if (listen(server_socket, MAX_CONNECTIONS) == -1)
    {
        perror("listen");
        close(server_socket);
        return 1;
    }

    printf("Server is listening on %s:%d\n", ADDR, PORT);

    while (TRUE)
    {
        /* Accept a new incoming connection */
        client_socket = accept(server_socket, (struct sockaddr *)&client_addr, &client_len);
        if (client_socket == -1)
        {
            perror("accept");
            continue;
        }

        printf("Accepted connection from %s:%d\n", inet_ntoa(client_addr.sin_addr), ntohs(client_addr.sin_port));

        /* Handle the client connection */
        while (TRUE)
        {
            bytes_received = recv(client_socket, buffer, BUFFER_SIZE - 1, 0);
            if (bytes_received < 0)
            {
                break;
            }
            total_bytes_received += bytes_received;
            buffer[total_bytes_received] = '\0';

            /* Check for end of HTTP headers */
            if (strstr(buffer, DOUBLE_CRLF) != NULL)
            {
                break;
            }
        }

        printf("Request: %s\n", buffer);

        /* Response to client */
        send(client_socket, http_response, strlen(http_response), 0);

        /* Close the client socket */
        close(client_socket);
    }

    /* Close the server socket */
    close(server_socket);
    return 0;
}