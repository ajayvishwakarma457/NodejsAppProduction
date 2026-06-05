# Centralized Error Handling Middleware

This document outlines the design architecture, error categories, database/auth token translation handlers, and testing strategies for our centralized exception management system.

---

## 1. Core Architectural Goals

A production-grade Node.js API must implement a single centralized error handling middleware to enforce:
1. **Safety**: Prevent programming errors (database bugs, syntax mistakes, connection drop exceptions) from leaking internal system stack traces or server properties to end clients.
2. **Context-Dependent Output**: Output full debug stack traces in development, but return clean, user-friendly responses in production.
3. **Structured Logging**: Log operational problems as `warnings` and actual program crashes as `errors` with trace stacks routed to files.
4. **Translation Layer**: Translate library exceptions (like Mongoose schemas, MongoDB duplicates, or JWT expired signatures) into standard HTTP responses.

---

## 2. Operational vs. Non-Operational Errors

We define errors into two categories:
* **Operational Errors**: Predictable, expected failures during execution (e.g. invalid inputs, route 404s, expired tokens, duplicate sign-up emails). These are created using our custom `AppError` class and return friendly messages with appropriate HTTP status codes (e.g. `400`, `401`, `403`, `404`).
* **Programming/Internal Errors**: Unpredicted bugs or system failures (e.g. `TypeError`, Mongoose connection drop, disk full). In production, these are logged with full stack traces and returned to the client as a standardized `500 Internal Server Error` with a generic message: `"Something went very wrong!"`.

---

## 3. Mongoose & JWT Translation Map

We integrated translation functions inside [errorMiddleware.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/middlewares/v1/errorMiddleware.js) to map library errors to operational API errors:

| Library Error | Name / Code | Action / Translation message | HTTP Status |
| :--- | :--- | :--- | :--- |
| **Mongoose Cast Error** | `CastError` | Maps malformed IDs/paths. Returns: `Invalid <path>: <value>.` | `400 Bad Request` |
| **MongoDB Duplicate Key** | `code: 11000` | Extracts duplicate field value using regex. Returns: `Duplicate field value: <val>. Please use another value!` | `400 Bad Request` |
| **Mongoose Validation** | `ValidationError` | Consolidates nested error messages. Returns: `Invalid input data: <message1>. <message2>.` | `400 Bad Request` |
| **JWT Verification** | `JsonWebTokenError` | Catches invalid signatures or tampered keys. Returns: `Invalid authentication token. Please log in again!` | `401 Unauthorized` |
| **JWT Expiration** | `TokenExpiredError` | Handles expired JWTs. Returns: `Your session has expired. Please log in again!` | `401 Unauthorized` |

---

## 4. Test Verification Suite

We developed a unit test suite in [errorMiddleware.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/unit/errorMiddleware.test.js) asserting all conditions:
* Verifies that dev mode delivers complete error stacks.
* Verifies that prod mode hides database secrets.
* Asserts translation mapping results for all 5 error types.
