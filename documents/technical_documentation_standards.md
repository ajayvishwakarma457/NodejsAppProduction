# Technical Documentation Writing Standards

This document establishes the guidelines, formatting rules, and maintenance workflows for writing technical documentation in this codebase.

---

## 1. Documentation as Code

Documentation is a first-class citizen of this codebase. It is stored in the repository, versioned via Git, and updated in the same pull requests as the corresponding code changes.

### The Maintenance Golden Rule
> [!IMPORTANT]
> If a code change alters an API endpoint schema, environment variable, database model structure, deployment configuration, or architectural pattern, **updating the corresponding markdown documentation is a mandatory blocker for PR approval.**

---

## 2. Formatting & Markdown Guidelines

All `.md` documents in the codebase should follow these formatting rules:

### A. Style and Tone
* **Be Concise**: Avoid verbose explanations. Use bullet points and tables for scannability.
* **Keep Lines Short**: Break down dense paragraphs to prevent text wrapping issues in editor previews.
* **Include Code Schemes**: Link code symbols, paths, and configurations using clickable workspace links:
  * `[container.js](file:///Users/spakcomm-ajay/Documents/Roadmap/NodejsAppProduction/src/config/container.js)`

### B. Visualizations (Mermaid)
Always illustrate workflows, sequencing, and deployment topologies using **Mermaid diagrams**. 
* Wrap Mermaid code blocks using standard markdown tags: ` ```mermaid `
* Quote labels containing special characters to prevent rendering syntax breaks: e.g., `id["Label (Context)"]`.

---

## 3. API Documentation (Swagger & OpenAPI)

All HTTP APIs must be documented using OpenAPI 3.0 annotations or Swagger parameters.
* **Location**: Keep routes documented inline or in unified configurations.
* **Requirement**: Specify:
  * HTTP method and endpoint path.
  * Required Request headers (e.g. `x-user-id`, `Authorization`).
  * Request schema (JSON parameters).
  * Response codes (e.g., `200 OK`, `400 Bad Request`, `401 Unauthorized`, `500 Internal Error`) with schemas.

---

## 4. Checklist for Reviewing Documentation

When reviewing a pull request that modifies or introduces documentation:
- [ ] Are all path file scheme links clickable and correct?
- [ ] Do code snippet blocks specify the programming language syntax highlighting (e.g. ` ```javascript `)?
- [ ] Is there a single, clear `<h1>` title at the top of the file?
- [ ] Are warnings and tips highlighted using alert syntax (e.g., `> [!NOTE]`, `> [!WARNING]`)?
