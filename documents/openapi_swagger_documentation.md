# OpenAPI / Swagger Documentation

This document describes the configuration, routing setup, and interface definitions for serving interactive **OpenAPI / Swagger API documentation** directly from our Express application.

---

## 1. Interactive Swagger Architecture

To achieve an industry-standard interface documentation pattern:
* We expose the Swagger UI under the global `/api-docs` route.
* The documentation is backed by a structured OpenAPI v3.0.3 specification file ([swagger.json](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/swagger.json)).
* **Security Integrations**: Standardizes documentation parameters for both JSON Web Tokens (Bearer Authentication) and header API Keys (`x-api-key`), allowing developers to authorize directly inside the Swagger UI browser panel and test endpoints live.

---

## 2. API Schema Definition (`src/swagger.json`)

The schema maps routes, schemas, inputs, outputs, and parameters:

```json
{
  "openapi": "3.0.3",
  "info": {
    "title": "Node.js Application Production API",
    "description": "Interactive Swagger API documentation...",
    "version": "1.0.0"
  },
  "servers": [
    { "url": "http://localhost:5000/api/v1" }
  ],
  "paths": {
    "/auth/register": { ... },
    "/users": {
      "get": {
        "summary": "Get all users",
        "parameters": [
          { "name": "type", "in": "query", "description": "Pagination scheme" },
          { "name": "sort", "in": "query", "description": "Sort order" },
          { "name": "fields", "in": "query", "description": "Field limiting selection" }
        ],
        "responses": { ... }
      }
    }
  },
  "components": {
    "securitySchemes": {
      "BearerAuth": {
        "type": "http",
        "scheme": "bearer",
        "bearerFormat": "JWT"
      },
      "ApiKeyAuth": {
        "type": "apiKey",
        "in": "header",
        "name": "x-api-key"
      }
    }
  }
}
```

---

## 3. Mounting UI Route in Express

We mount the Swagger serving routes globally in [app.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/app.js):

```javascript
const swaggerUi = require('swagger-ui-express');
const swaggerDocument = require('./swagger.json');

// Mount Swagger interactive API documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
```

### Content Security Policy (CSP) Tuning
Helmet by default blocks inline CSS styles and dynamic script assets that Swagger UI uses to build its HTML page. To ensure the interactive documentation renders correctly, we configure Helmet dynamically:
```javascript
app.use(helmet({
  contentSecurityPolicy: false // Disables CSP explicitly to render Swagger UI
}));
```

---

## 4. Local Execution

When running the application locally (`npm run dev`), the interactive endpoint is available at:
* **Swagger UI Docs**: [http://localhost:5000/api-docs](http://localhost:5000/api-docs) (redirects cleanly to `/api-docs/`).

We verify endpoint responses and trailing slash redirects automatically using our integration test suite in [swaggerIntegration.test.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/tests/integration/swaggerIntegration.test.js).
