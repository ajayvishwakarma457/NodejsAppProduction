# CORS (Cross-Origin Resource Sharing) Configuration

Cross-Origin Resource Sharing (CORS) is a browser security mechanism that uses HTTP headers to tell browsers to give a web application running at one origin access to selected resources from a different origin.

In production, restricting access via CORS is critical to prevent malicious websites from reading sensitive data from your APIs.

---

## Configuration & Implementation

We installed the official `cors` middleware package to handle configuration.

```bash
npm install cors
npm install -D @types/cors
```

### 1. Registering CORS in the Express Stack
CORS middleware is registered globally in [src/app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js):

```javascript
const express = require('express');
const cors = require('cors');

const app = express();

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (e.g. mobile apps, curl, Postman)
    if (!origin) return callback(null, true);

    const allowedOrigins = process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(',').map(o => o.trim())
      : [];

    // In development mode, allow all if CORS_ORIGIN is not explicitly configured
    if (process.env.NODE_ENV === 'development' && allowedOrigins.length === 0) {
      return callback(null, true);
    }

    if (allowedOrigins.indexOf(origin) !== -1 || allowedOrigins.includes('*')) {
      callback(null, true);
    } else {
      const error = new Error('Not allowed by CORS');
      error.statusCode = 403; // Forbidden status code
      callback(error);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
```

---

## Settings Explained

### `origin`
* **Dynamic Origin Whitelist**: Parses a comma-separated list of allowed origins from `process.env.CORS_ORIGIN`.
* **Non-Browser Client Support**: Requests without an `Origin` header (like servers, CLI tools, mobile apps) are automatically allowed by checking `!origin`.
* **Dev Mode Fallback**: If no origin is explicitly declared in development mode, it allows any connection for seamless testing.

### `methods`
* Restricts allowed HTTP methods to the specified list: `['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']`.

### `allowedHeaders`
* Restricts which custom HTTP headers can be sent with the request (e.g., `Authorization` tokens, custom client identifiers).

### `credentials`
* Set to `true` to allow browsers to send cookies, authorization headers, or TLS client certificates across domains.

### `optionsSuccessStatus`
* Set to `200` to ensure legacy browsers (e.g., IE11, smart TVs) correctly respond to standard preflight `OPTIONS` requests.

---

## Environment Configuration
Configure the allowed origins in your [.env](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.env) file:

```env
CORS_ORIGIN=http://localhost:3000,http://localhost:4000,https://myproductionapp.com
```
