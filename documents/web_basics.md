# Web Basics Reference Guide

This document covers the foundational internet protocols and standards required to design, develop, and test web APIs.

---

## 1. HTTP Protocol Fundamentals

HTTP (Hypertext Transfer Protocol) is an application-layer protocol for transmitting hypermedia documents. It operates on a client-server model.

### HTTP Methods (Verbs)
Methods tell the server what action to perform on the targeted resource:
* **`GET`**: Retrieve a representation of a resource. Should be safe and idempotent (read-only).
* **`POST`**: Submit data to be processed, often creating a new resource. Non-idempotent.
* **`PUT`**: Replace an entire existing resource, or create it if it doesn't exist. Idempotent.
* **`PATCH`**: Apply partial modifications to a resource. Non-idempotent.
* **`DELETE`**: Remove the specified resource. Idempotent.

### HTTP Status Codes
The response status code indicates whether a specific request was successful.
* **`1xx` (Informational)**: Request received, continuing process.
* **`2xx` (Successful)**:
  * `200 OK`: Success (general).
  * `201 Created`: Resource successfully created (usually after POST/PUT).
  * `204 No Content`: Success, but no response body (usually after DELETE).
* **`3xx` (Redirection)**: Further action needs to be taken (e.g., `301 Moved Permanently`, `302 Found`).
* **`4xx` (Client Errors)**:
  * `400 Bad Request`: Invalid request syntax or validation error.
  * `401 Unauthorized`: Client is not authenticated.
  * `403 Forbidden`: Client is authenticated but lacks permission.
  * `404 Not Found`: Resource does not exist.
* **`5xx` (Server Errors)**:
  * `500 Internal Server Error`: The server encountered an unexpected error.
  * `502 Bad Gateway`: Invalid response from an upstream server.
  * `503 Service Unavailable`: Server is overloaded or down for maintenance.

### HTTP Headers
Headers pass additional information between client and server:
* **Request Headers**: `Authorization` (bearer tokens), `Accept` (desired media type), `User-Agent`.
* **Response Headers**: `Content-Type` (e.g., `application/json`), `Set-Cookie`, `Cache-Control`.

### Cookies
Small blocks of data created by the server and stored on the client's browser. Used for session management, user tracking, and personalization.
* **Attributes**: `HttpOnly` (blocks JS access for XSS protection), `Secure` (HTTPS only), `SameSite` (prevents CSRF).

---

## 2. REST Principles & API Design Conventions

REST (Representational State Transfer) is an architectural style for designing networked applications.

### Core Principles
1. **Statelessness**: Each request must contain all the information necessary to understand and process it. The server stores no session context about the client.
2. **Client-Server Separation**: Clients and servers can evolve independently as long as the interface contract is maintained.
3. **Uniform Interface**: Resources are identified in requests (usually via URIs) and manipulated using standard representations (like JSON).

### API Design Conventions
* **Use nouns, not verbs** for endpoint paths:
  * ❌ `POST /getUserProfile`
  *   `GET /users/:id`
* **Use plurals** for resource collections:
  * `/users`, `/products`, `/orders`
* **Represent relationships** using nested paths:
  * `GET /users/42/orders` (Get all orders belonging to user 42)

---

## 3. JSON Request & Response Handling

JSON (JavaScript Object Notation) is the de facto standard format for API data exchange.

* **Serialization (Stringify)**: Converting an in-memory object to a JSON string for transmission.
  `const jsonString = JSON.stringify({ name: "Alice" });`
* **Deserialization (Parse)**: Parsing an incoming JSON string back into a runtime JavaScript object.
  `const obj = JSON.parse(jsonString);`

---

## 4. API Testing Tools (Postman)

To develop, debug, and document APIs efficiently, you need utility clients to construct HTTP requests manually.

### Postman
Postman is the industry-standard API client and testing platform.
* **Key Features**:
  * **Request Builder**: Send GET, POST, PUT, DELETE requests with custom headers, query params, cookies, and bodies (JSON, form-data).
  * **Environments**: Define variables (like `baseUrl`, `accessToken`) to easily switch between Local, Staging, and Production setups.
  * **Collections**: Group related endpoints together. Collections can be exported as JSON files and checked into Git.
  * **Pre-request & Test Scripts**: Write Javascript code to automatically run before a request (e.g. hash parameters) or validate response data (e.g. check for status code 200).

