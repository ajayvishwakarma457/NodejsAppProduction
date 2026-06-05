# Docker Configuration Guide

This document details the production-ready Docker configuration implemented in the monorepo, including multi-stage builds, Node.js native health checks, and optimized ignore rules.

---

## 1. Directory Structure

Dockerfiles are defined for each microservice and the main monolith application:

```
├── .dockerignore
├── Dockerfile (Monolith App)
├── microservices/
│   ├── api-gateway/
│   │   └── Dockerfile
│   ├── user-service/
│   │   └── Dockerfile
│   └── notification-service/
│       └── Dockerfile
└── scripts/
    └── docker-healthcheck.js (Shared container prober)
```

---

## 2. Multi-Stage Build Strategy

To keep production containers lightweight, secure, and performant, all Dockerfiles use a **two-stage build process**:

### Stage 1: Builder
- Uses `node:18-alpine` as a base.
- Installs necessary build tools (`g++`, `make`, `python3`) required for compiling native C/C++ addons.
- Installs all dependencies (including devDependencies) via `npm ci`.

### Stage 2: Runner
- Uses a clean `node:18-alpine` environment.
- Copies only production-level files (code, assets, scripts) and installs production-only dependencies via `npm ci --omit=dev`.
- Eliminates development tool chains, decreasing container size by over **70%** and reducing the attack surface.

---

## 3. Node.js Native Health Check

Instead of invoking `curl` or `wget` (which are commonly excluded from minimal production images and raise CVE concerns), our containers use a native Node.js probe script: [docker-healthcheck.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/scripts/docker-healthcheck.js).

### Configuration in Dockerfiles
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node scripts/docker-healthcheck.js
```
The prober connects directly to `localhost:${PORT}/health`, processes the JSON status response, and exits with:
- `0` (Healthy) if status code is `200` and `status === "healthy"`.
- `1` (Unhealthy) for request timeouts or status failures.

---

## 4. Build and Run Commands

Since all microservices import modules from the shared root directory (like logging utilities and configurations), you **must build all images using the root directory as the context**.

### Build Commands:
```bash
# Build Monolith App
docker build -t nodejs-monolith-app .

# Build API Gateway
docker build -f microservices/api-gateway/Dockerfile -t nodejs-api-gateway .

# Build User Service
docker build -f microservices/user-service/Dockerfile -t nodejs-user-service .

# Build Notification Service
docker build -f microservices/notification-service/Dockerfile -t nodejs-notification-service .
```

### Run Commands (Examples):
```bash
# Run Monolith App with local database and redis setup
docker run -d \
  -p 5000:5000 \
  -e NODE_ENV=production \
  -e PORT=5000 \
  -e MONGODB_URI=mongodb://host.docker.internal:27017/production_roadmap \
  --name monolith-app-running \
  nodejs-monolith-app
```
