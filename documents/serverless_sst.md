# Serverless Framework & SST (Serverless Stack) Guide

This guide covers deployment, architectural details, and local development operations using **Serverless Framework** and **SST (Serverless Stack)**.

---

## 1. Directory Structure

All configuration files are organized under:
- **Serverless Framework Config**: [serverless-lambda.yml](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/aws-lambda/serverless-lambda.yml)
- **SST Project config**: [sst.config.ts](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/sst/sst.config.ts)
- **SST Package definition**: [package.json](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/serverless/sst/package.json)

---

## 2. Comparison: YAML vs. Type-Safe Infrastructure

| Feature | Serverless Framework (`serverless.yml`) | SST (`sst.config.ts`) |
| :--- | :--- | :--- |
| **Config Language** | YAML | TypeScript / JavaScript |
| **State Driver** | AWS CloudFormation | AWS CDK (Cloud Development Kit) |
| **Type Safety** | Schema validation only | Complete autocomplete & build compile type checks |
| **Local Testing** | Emulated mocks (`serverless-offline`) | Live Lambda Development (`sst dev` tunnel) |

---

## 3. SST Live Lambda Development (`sst dev`)

One of SST's features is **Live Lambda Development**:
- **How it works**: When you run `sst dev`, SST establishes a WebSocket tunnel connection between your local computer and a proxy function deployed in your AWS account.
- **Immediate Iteration**: Instead of uploading code to AWS on every change, requests hitting your AWS Lambda URL are routed back to your local computer, executed, and the response is sent back instantly. You can set local breakpoints and modify code without wait times.

---

## 4. Operational Commands

### A. Serverless Framework Commands
Run from the `serverless/aws-lambda/` directory:
* **Deploy function stack**:
  ```bash
  npx serverless deploy
  ```
* **Invoke function remotely**:
  ```bash
  npx serverless invoke -f api
  ```

### B. SST Commands
Run from the `serverless/sst/` directory:
* **Start Live Dev Server**:
  ```bash
  npx sst dev
  ```
* **Deploy to AWS**:
  ```bash
  npx sst deploy --stage prod
  ```
