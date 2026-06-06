# Vercel Edge Functions Guide

This document describes how to deploy and develop Vercel Edge Functions within the Node.js production application.

---

## 1. Directory Structure

All Vercel Edge resources are organized under:
- Handler Entrypoint: [edge-handler.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/vercel-edge/api/edge-handler.js)
- Routing Manifest: [vercel.json](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/vercel-edge/vercel.json)

---

## 2. Vercel Configuration & Routing

Vercel utilizes a `vercel.json` file in the root of the serverless project directory to define routing and execution mappings.

```json
{
  "version": 2,
  "routes": [
    {
      "src": "/api/edge/greet",
      "dest": "/api/edge-handler.js"
    }
  ]
}
```

The route `/api/edge/greet` routes directly to `/api/edge-handler.js`, which exports the Edge runtime config:
```javascript
module.exports.config = {
  runtime: 'edge', // Compiles the function using Vercel's V8 edge pool
};
```

---

## 3. Development Commands

To develop and test Vercel Edge functions locally:

### A. Run Local CLI Dev Server
Vercel CLI provides a Miniflare-based emulation engine matching production Edge parameters locally:
```bash
npx vercel dev
```

### B. Deployment
Deploy instantly to Vercel's Edge network:
```bash
npx vercel --prod
```

---

## 4. Edge Database Connectivity Guidelines
V8 Isolates do not support standard raw TCP/UDP sockets. When building database integrations on Vercel Edge, apply these guidelines:
1. **HTTP/REST Database Drivers**: Use database HTTP connection wrappers (like PlanetScale Serverless, Neon Serverless Postgres, or MongoDB Atlas Data API).
2. **Prisma Accelerate**: Connect database client query engines via Prisma Accelerate connection pooling proxy over HTTP.
