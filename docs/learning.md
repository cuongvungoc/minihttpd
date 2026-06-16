## Socket
## HTTP
### HTTP Request Line
An HTTP Request line is the very first line of an HTTP request message sent from a client to a server.

According to RFC 2616 standard, a standard HTTP/1.1 request line:
- use space-separated elements
- terminates with a carriage return and line feed (CRLF):
```
Request-Line = Method + SP + Request-URI + SP + HTTP-Version + CRLF
```
- Method: Action to perform
  - GET: fetch data
  - POST: submit data
  - PUT: update data
  - DELETE: remove data
- Request-URI: The path to the specific resource on the server, often containing a query string.
- HTTP-Version: Indicates the specific structure of the rest of the message so the server knows how to respond.
- CRLF: Carriage Return + Line Feed `\r\n`, end of HTTP header is doube CRLF `\r\n\r\n`

Example:
```
GET /api/products?id=42 HTTP/1.1
```

- GET: Method
- /api/products?id=42: Request-URI / Target
- HTTP/1.1: Protocol version
### HTTP Response Status Line
An HTTP response status line is the very first line of an HTTP response message sent from a server to a client.
```
Response-Line = HTTP-Version + SF + Status Code + SP + Reason Phrase + CRLF
```

Example:
```
HTTP/1.1 200 OK
```

The 5 status code classes
| Range | Class Type | Meaning & Core Function | Example |
| :--- | :--- | :--- | :--- |
| **`1xx`** | Informational | Request received; server is continuing the process. | `HTTP/1.1 101 Switching Protocols` |
| **`2xx`** | Success | The action was successfully received, understood, and accepted. | `HTTP/1.1 200 OK` |
| **`3xx`** | Redirection | Further action or a different URL is needed to complete the request. | `HTTP/1.1 301 Moved Permanently` |
| **`4xx`** | Client Error | The request contains bad syntax or cannot be fulfilled by the caller. | `HTTP/1.1 404 Not Found` |
| **`5xx`** | Server Error | The server failed to fulfill an apparently valid request. | `HTTP/1.1 500 Internal Server Error` |

### HTTP Header
**TODO**: List all options here


Example:
```
GET /index.html HTTP/1.1\r\n
Host: ://example.com\r\n
User-Agent: Mozilla/5.0\r\n
Accept: text/html\r\n
\r\n
```

### HTTP Request Format
```
[Request Line] e.g., METHOD TARGET VERSION\r\n
[Headers]      e.g., Header-Name: Value\r\n
\r\n           (An empty line consisting of a single carriage return and line feed)
[Message Body] (Optional payload data)
```

## MIME Type
A MIME type (Multipurpose Internet Mail Extensions) is a two-part identifier used on the internet to define the format of a file or content. 

Structure: 
```
type/subtype
```

- Type: Represents the general category (e.g., text, image, audio, video).
- Subtype: Identifies the exact kind of data (e.g., html for text, jpeg for images).