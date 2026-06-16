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
```
Method: GET
Path: /
Version: HTTP/1.1
```