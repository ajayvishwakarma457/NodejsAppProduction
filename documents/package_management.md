# NPM Package Management Reference Guide

This document describes how dependencies, scripts, versioning, and command execution work using Node Package Manager (NPM).

---

## 1. NPM Commands & Lockfiles

### Key NPM Commands
* `npm init -y`: Initializes a new Node.js project by creating a basic `package.json` file.
* `npm install <package>` (or `npm i <package>`): Installs a package and adds it to `dependencies`.
* `npm install --save-dev <package>` (or `npm i -D <package>`): Installs a package and adds it to `devDependencies`.
* `npm ci` (Clean Install): Used in CI/CD pipelines. It skips package resolution and installs the exact versions listed in `package-lock.json` directly. It deletes the existing `node_modules` before installing.
* `npm run <script-name>`: Runs a defined script command from the `package.json`.

### The Role of `package-lock.json`
* **Purpose**: Locks down the exact dependency tree (including nested sub-dependencies) to ensure deterministic builds.
* **Why it matters**: Without `package-lock.json`, running `npm install` on two different developer machines or servers might resolve minor/patch updates differently, leading to bugs that are hard to reproduce.

---

## 2. `package.json` Anatomy

The `package.json` file is the manifest of your Node.js application, managing scripts, metadata, and dependencies.

### Key Fields:
* **`name` & `version`**: Identify the project.
* **`main`**: The entry point file for the application.
* **`scripts`**: Command-line shortcuts for running tasks (e.g. starting a server, running tests, or linting).
* **`dependencies`**: Packages required to run the application in production (e.g., `express`, `dotenv`, `mongoose`).
* **`devDependencies`**: Packages only needed for development and testing (e.g., `nodemon`, `jest`, `typescript`).
* **`engines`**: Restricts which versions of Node.js and package managers are allowed to execute the code.

```json
{
  "name": "my-app",
  "version": "1.0.0",
  "scripts": {
    "start": "node app.js",
    "dev": "nodemon app.js"
  },
  "dependencies": {
    "dotenv": "^17.0.0"
  },
  "devDependencies": {
    "nodemon": "^3.0.0"
  },
  "engines": {
    "node": ">=18.0.0"
  }
}
```

---

## 3. Semantic Versioning (SemVer)

NPM uses Semantic Versioning to determine what range of updates are acceptable when installing or updating packages.

Format: **`MAJOR.MINOR.PATCH`**
* **`MAJOR`**: Incompatible API changes (breaking changes).
* **`MINOR`**: Add functionality in a backwards-compatible manner (features).
* **`PATCH`**: Backwards-compatible bug fixes.

### Operators:
* **Caret (`^`)**: Installs minor and patch updates (e.g., `^1.2.3` permits `>=1.2.3 <2.0.0`). **This is the NPM default.**
* **Tilde (`~`)**: Installs patch updates only (e.g., `~1.2.3` permits `>=1.2.3 <1.3.0`).
* **Exact (No prefix)**: Installs the exact version only (e.g., `1.2.3`).
* **Asterisk (`*`)**: Matches any version (discouraged in production).

---

## 4. `npx` (Node Package Executor)

`npx` is a utility tool that comes bundled with NPM (v5.2.0+).

* **Purpose**: It allows you to execute Node.js packages directly from the npm registry without installing them globally or permanently in your project.
* **How it works**: It fetches the package, caches it temporarily, runs the executable bin, and discards it.
* **Common Use Cases**:
  * Creating a template project: `npx create-react-app my-app` or `npx -y create-vite-app@latest ./`
  * Running a local tool: `npx nodemon app.js` (if nodemon isn't globally installed)
  * Checking versions: `npx firebase-tools --version`
