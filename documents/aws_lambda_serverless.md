# AWS Lambda Serverless Guide (Cold Starts, Layers & SnapStart)

This document provides guidelines for deploying the Node.js production application serverless services on **AWS Lambda** with high performance and low latency.

---

## 1. Directory Structure

All AWS Lambda files are organized under:
- Handler definition: [handler.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/aws-lambda/handler.js)
- Dependency layer specification: [package.json](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/aws-lambda/layers/nodejs/package.json)
- Serverless configuration: [serverless-lambda.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/aws-lambda/serverless-lambda.yml)

---

## 2. Cold Start Mitigation for Node.js

Cold starts represent the latency incurred when Lambda boots a new execution container (downloading code, initializing runtime, and running initialization code).

We optimize Node.js cold starts using the following strategies:

### A. Shared Dependency Layers
By moving large libraries (like `mongoose`, database clients, utility libs) into a **Lambda Layer**, we exclude them from the deployment package. This reduces package sizes from megabytes to kilobytes, significantly speeding up container unzip times.

### B. Connection Reuse (Warm Starts)
We instantiate connection pools (like Mongoose connections) **outside** the handler function scope. Warm starts (subsequent requests routed to already running containers) skip database initializations entirely:
```javascript
// Instantiated globally, reused in future requests
let cachedDbConnection = null; 
```
Setting `context.callbackWaitsForEmptyEventLoop = false` stops AWS Lambda from waiting for the Node.js event loop to drain, letting it return responses instantly without disconnecting database pool threads.

### C. Provisioned Concurrency
Provisioned Concurrency initializes a requested number of execution environments beforehand. Incoming requests route instantly to pre-warmed containers with **zero cold starts**. We configure this directly in our Serverless manifest:
```yaml
provisionedConcurrency: 2
concurrencyAutoscaling: true
```

---

## 3. AWS Lambda SnapStart Context

> [!NOTE]
> **AWS Lambda SnapStart** is an AWS optimization that takes a snapshot of a fully initialized execution environment and resumes from it for subsequent starts, reducing startup times to sub-second. 
> 
> Currently, **SnapStart is supported natively on Java runtimes only (Java 11, 17, 21)**. 

### Node.js Alternatives to SnapStart
To achieve SnapStart-like performance in Node.js, apply these configurations:
1. **Optimize Memory Sizes**: Increasing memory allocates proportional CPU. A 1024MB or 2048MB configuration speeds up runtime initialization and database handshakes during boot.
2. **Minify & Bundle**: Use a bundler like `esbuild` to tree-shake and bundle code into a single file to eliminate costly file filesystem lookups (`require` calls) during initialization.
