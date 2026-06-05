# CI/CD Pipelines Integration Guide

This guide details the continuous integration (CI) and continuous deployment (CD) setups configured for the codebase across three major CI engines: GitHub Actions, GitLab CI, and CircleCI.

---

## 1. Pipeline Architecture

Each configuration enforces a standard multi-stage build, check, and test verification process:

```
[ Code Commit / PR ]
         │
         ▼
 ┌───────────────┐
 │  Dependency   │ ◄─── Restores cached node_modules
 │  Installation │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │   Unit and    │ ◄─── Runs Jest tests against running
 │  Integration  │      MongoDB & Redis Service Containers
 │     Tests     │
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │ Docker Image  │ ◄─── Builds production multi-stage Docker
 │  Verification │      layers to ensure compilability
 └───────┬───────┘
         │
         ▼
 ┌───────────────┐
 │  Kubernetes   │ ◄─── Verifies YAML syntaxes and structural
 │  Validation   │      schemas of deployment manifests
 └───────────────┘
```

---

## 2. CI Pipelines Configuration Files

### A. GitHub Actions (`.github/workflows/ci.yml`)
Located at [.github/workflows/ci.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.github/workflows/ci.yml).
- **Service Containers**: Automatically launches `mongo:6.0` on port `27017` and `redis:7-alpine` on port `6379`.
- **Node Setup**: Uses `actions/setup-node@v4` with auto-caching of npm configurations.
- **Docker builds**: Generates images for monolith and all three microservices.

### B. GitLab CI (`.gitlab-ci.yml`)
Located at [.gitlab-ci.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.gitlab-ci.yml).
- **Docker-in-Docker (dind)**: Uses standard `docker:dind` daemon service for building production images.
- **Service Bindings**: Connects `mongo:6.0` (aliased as `mongodb`) and `redis:7-alpine` (aliased as `redis`) as backend services.
- **Caching**: Configured caching across pipelines using `package-lock.json` hash keys.

### C. CircleCI (`.circleci/config.yml`)
Located at [.circleci/config.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/.circleci/config.yml).
- **CircleCI Node Executor**: Uses optimized Node.js base executor image.
- **Remote Docker Engine**: Standard `setup_remote_docker` step to build secure container architectures.
- **Manifest Check**: Installs local `kubectl` to dry-run validation mappings.

---

## 3. Configuration & Variable Mapping

All pipelines configure environment defaults for the test suites:
- `NODE_ENV`: `test`
- `MONGODB_URI`: Points to the local database container host (e.g. `mongodb://localhost:27017/test_db` or `mongodb://mongodb:27017/test_db`)
- `REDIS_HOST`: Points to the Redis container instance
- `JWT_SECRET` / `SESSION_SECRET`: Set to dummy values during pipeline executions.
