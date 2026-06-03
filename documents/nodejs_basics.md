# Node.js Basics Reference Guide

This document covers the core building blocks of Node.js: runtime design, built-in modules, environment configuration, error handling patterns, and basic debugging tools.

---

## 1. Node.js Runtime & V8 Engine

Node.js is a runtime environment that allows you to execute JavaScript on the server.
* **V8 Engine**: Developed by Google for Chrome, it compiles JavaScript directly into native machine code instead of executing it as bytecode. Node.js binds V8 with C++ libraries to expose OS-level APIs (like file access or networking).
* **Single-Threaded Event Loop**: Unlike multithreaded servers (like Apache) that create a new thread per request, Node.js uses a single thread to handle concurrent operations using asynchronous non-blocking callbacks.

---

## 2. Built-in Modules

Node.js provides a robust set of core modules out-of-the-box:

### `path`
Helps resolve file and directory paths across different Operating Systems (Windows uses `\`, macOS/Linux use `/`).
* `path.join(...paths)`: Joins all arguments together and normalizes the resulting path.
* `path.resolve(...paths)`: Resolves to an absolute path.
* `path.basename(path)`: Returns the last portion of a path (filename).
* `path.extname(path)`: Returns the extension of the path.

### `fs` (File System)
Used to read, write, update, delete, and monitor files/directories. It has synchronous, callback, and promise-based variants.
```javascript
const fs = require('fs');
// Asynchronous callback-style reading
fs.readFile('file.txt', 'utf8', (err, data) => {
  if (err) throw err;
  console.log(data);
});
```

### `os`
Exposes information about the host operating system (CPU architecture, memory, platform, network interfaces).
```javascript
const os = require('os');
console.log(os.platform()); // 'darwin', 'win32', etc.
console.log(os.totalmem()); // Total RAM in bytes
```

### `events` (EventEmitter)
A class used to handle custom events. Node.js is heavily event-driven; many core modules (like streams, http, net) inherit from `EventEmitter`.
```javascript
const EventEmitter = require('events');
const emitter = new EventEmitter();

emitter.on('eventSignature', (arg) => console.log('Heard:', arg));
emitter.emit('eventSignature', 'data payload');
```

### `http`
Allows Node.js to transfer data over the Hyper Text Transfer Protocol (HTTP) and spin up a lightweight web server.
```javascript
const http = require('http');
const server = http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.end('Hello Node!');
});
server.listen(3000);
```

---

## 3. Environment Variables with `dotenv`

Environment variables separate codebase configuration (APIs, secrets, ports) from application logic.
* **`dotenv` package**: Loads configuration key-value pairs from a `.env` file at the project root into `process.env` at app startup.

```javascript
// Setup
require('dotenv').config();

const port = process.env.PORT || 3000;
const dbPassword = process.env.DB_PASSWORD;
```

> [!WARNING]
> Never commit your `.env` file containing production secrets to version control. Always add `.env` to your `.gitignore` file and provide a `.env.example` template with placeholder values instead.

---

## 4. Error Handling Patterns

### Try / Catch (Synchronous & Async/Await)
Used to catch exceptions thrown synchronously or inside `async` functions.
```javascript
try {
  JSON.parse("invalid-json");
} catch (error) {
  console.error("Failed to parse JSON:", error.message);
}
```

### Error-First Callbacks
Standard callback pattern in CJS-era Node.js libraries. The first argument is reserved for the error object, followed by the success data.
```javascript
function callback(err, data) {
  if (err) {
    // Handle error
    return console.error(err);
  }
  // Success flow
  console.log(data);
}
```

### Process Events: Uncaught Exception & Unhandled Rejection
* `uncaughtException`: Triggered when an exception bubbles all the way back to the event loop without being caught.
* `unhandledRejection`: Emitted when a Promise is rejected and no error handler is attached.

```javascript
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});
```

---

## 5. Debugging Tools

### Stack Tracing (`console.trace`)
Prints a stack trace to standard error (`stderr`), detailing the execution path (functions called) leading up to that line of code.

### Node Inspector (`--inspect`)
Node.js comes with a built-in debugging agent that communicates via WebSockets.
1. Run: `node --inspect-brk app.js` (breaks on the first line).
2. Open Google Chrome and go to: `chrome://inspect`
3. Click **Configure...** to add `localhost:9229` (default port).
4. Click **Open dedicated DevTools for Node** to debug code line-by-line with full breakpoints, scopes, and call stack analysis.
