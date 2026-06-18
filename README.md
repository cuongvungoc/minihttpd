# minihttpd
A tiny web server built from scratch for learning purposes.

## Milestone 1: Build a TCP echo server

Build a TCP echo server following the image below.

Build:
- Create a stream socket
- Bind the socket into an address and port
- Accept the client
- Read raw data
- Send fixed response

Test:
```
nc 127.0.0.1 8080
```
<div style="text-align:center">
	<img src="./img/stream_socket.jpeg">
	<p><em>Overview of system calls used with stream socket</em></p>
</div>

## Milestone 2: Minimal HTTP

Build:
- Parse method/path/version
- Send valid HTTP response
- Support GET /

Test:
```
curl -v http://127.0.0.1:8080/
```

### Build a simplest HTTP server
**Goal**: Respond to every request with a fixed HTML page.
- listen on port 8080
- read request into buffer
- print request to terminal
- send fixed HTTP response
- close client

Example request from browser:
```
GET / HTTP/1.1
Host: 127.0.0.1:8080
User-Agent: curl/8.x
Accept: */*
```

Server response:
```
HTTP/1.1 200 OK
Content-Type: text/html
Content-Length: 46
Connection: close

<html><body><h1>Hello HTTP</h1></body></html>
```

### Parse the HTTP Request Line
**Goal**: Extract
```
method
path
HTTP version
```
From
```
GET /index.html HTTP/1.1
```
Into
```
method = "GET"
path = "/index.html"
version = "HTTP/1.1"
```

Test:
```
http://127.0.0.1:8080/
```

Expected output:

```http
Method: GET
Path: /
Version: HTTP/1.1
```

## Milestone 3: Static file server
### Serve static files
Map URL paths to files

Example: 
```
URL:  /index.html
Root: ./www
File: ./www/index.html
``` 

Basic file serving flow
- parse path
- convert URL path to filesystem path
- check if file exists
- check if regular file
- open file
- send HTTP headers
- send file body
- close file

### Add HTTP Error Response
The server must not crash or return garbage when something fails.

Implement these response:
```
400 Bad Request
403 Forbidden
404 Not Found
405 Method Not Allowed
414 URI Too Long
500 Internal Server Error
501 Not Implemented
```

Example response
```http
HTTP/1.1 404 Not Found
Content-Type: text/html
Content-Length: 48
Connection: close

<html><body><h1>404 Not Found</h1></body></html>
```

Test
```sh
chmod 000 www/forbidden.html
curl -v http://127.0.0.1:8080/notfound.html
curl -v http://127.0.0.1:8080/longuri(length > 1024).html
printf 'GET  HTTP/1.1\r\n\r\n' | nc 127.0.0.1 8080
curl -v http://127.0.0.1:8080/forbidden.html
...
```

Expected:
```http
HTTP/1.1 404 Not Found
HTTP/1.1 414 URI Too Long
HTTP/1.1 400 Bad Request
HTTP/1.1 403 Forbidden
...
```

### MIME Detection
**Goal**:
Return correct `Content-Type`.

Examples:
```
.html  -> text/html
.css   -> text/css
.js    -> application/javascript
.json  -> application/json
.png   -> image/png
.jpg   -> image/jpeg
.txt   -> text/plain
```

Test:
```sh
curl -I http://127.0.0.1:8080/index.html
curl -I http://127.0.0.1:8080/style.css
```

## Milestone 4: Secure Path Handling
### Protect against path traversal
Path traversal (also known as directory traversal) is a web security vulnerability that allows attackers to read arbitrary files and directories stored on a server. By manipulating file path parameters with sequences like "../", an attacker can "traverse" outside the intended directory to access sensitive data.

Dangerous request:
```http
GET /../../../../etc/passwd HTTP/1.1
```
If the server naively does this:
```c
snprintf(full_path, sizeof(full_path), "%s%s", root, path);
```
Then attacker may access files outside the web root

**Goal**: Implement path validation to avoid path traversal

Rule:
- reject paths containing `..`
- reject absolute filesystem paths
- reject encoded traversal like `%2e%2e`
- normalize URL path
- ensure resolved path stays inside document root

Test:
```sh
# --path-as-is to bypass URL normally of curl follow RFC 3986
curl --path-as-is http://127.0.0.1:8080/../../../../etc/passwd
curl -v http://127.0.0.1:8080/%2e%2e/%2e%2e/etc/passwd
```

Expected:
```
403 Forbidden
```

### URL Decode
HTTP URLs may contain encoded characters.

Example:
```
%20 -> space
%2F -> /
%2e -> .
```

URL Decode example:
```
Input:  /hello%20world.html
Output: /hello world.html
```

**NOTE**: URL-decode before checking for traversal.

Test:
```sh
echo 'hello' > 'www/hello world.txt'
curl http://127.0.0.1:8080/hello%20world.txt
```
