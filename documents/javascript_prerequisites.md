# JavaScript & Node.js Prerequisites Reference Guide

This document covers the fundamental concepts of JavaScript and the Node.js runtime environment that are crucial for building high-performance, production-ready applications.

---

## 1. Scopes, Closures, Prototypes & the `this` Keyword

### Scopes
Scope determines the accessibility (visibility) of variables in your code.
- **Global Scope**: Variables declared outside of any function or block. Accessible everywhere.
- **Function Scope**: Variables declared with `var`, `let`, or `const` inside a function are local to that function.
- **Block Scope**: Introduced in ES6, variables declared with `let` and `const` inside `{}` curly braces are accessible only within that block. `var` is **not** block-scoped and leaks out.

```javascript
if (true) {
  var leaked = "I am accessible outside!";
  let blocked = "I am only accessible here.";
}
console.log(leaked); // Works
console.log(blocked); // ReferenceError
```

### Closures
A **closure** is the combination of a function bundled together with references to its surrounding state (the lexical environment). In other words, a closure gives an inner function access to the outer function's scope even after the outer function has returned.
* **Use Cases**: Data encapsulation (private variables), function factories, and state preservation.

```javascript
function createCounter() {
  let count = 0; // Encapsulated private variable
  return {
    increment() { return ++count; },
    getCount() { return count; }
  };
}
const myCounter = createCounter();
myCounter.increment(); // 1
console.log(myCounter.getCount()); // 1
// console.log(count); // ReferenceError (count is private)
```

### Prototypes & Inheritance
JavaScript is a prototype-based language. Every object has an internal link to another object called its **prototype**.
* **Prototype Chain**: When trying to access a property that doesn't exist on an object, JavaScript searches down the prototype chain until it finds it or hits `null`.
* **Prototypal Inheritance**: Sharing methods and properties between objects without duplicating code in memory.

```javascript
function Animal(name) {
  this.name = name;
}
Animal.prototype.speak = function() {
  return `${this.name} makes a noise.`;
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor
  this.breed = breed;
}
Dog.prototype = Object.create(Animal.prototype); // Inheritance
Dog.prototype.constructor = Dog;
```

### The `this` Keyword
The value of `this` is determined by *how* a function is called (runtime binding):
1. **Implicit Binding**: Pointing to the object calling the method (`obj.method()`).
2. **Explicit Binding**: Manually setting `this` using `.call()`, `.apply()`, or `.bind()`.
3. **Default Binding**: In non-strict mode, global object (`window` or `global`); in strict mode, `undefined`.
4. **Lexical Binding**: **Arrow functions** do not have their own `this`. They inherit `this` from the enclosing lexical parent context.

---

## 2. ES6+ Features

### Arrow Functions
* Do not have their own `this`, `arguments`, or `super`.
* Shorter syntax with implicit return for single-line expressions.

### Destructuring
Extract data from arrays or objects into distinct variables easily.
```javascript
const user = { username: 'Alice', age: 25 };
const { username, age, location = 'Global' } = user;
```

### Spread & Rest Operators (`...`)
* **Spread**: Unpacks elements of an array or properties of an object.
* **Rest**: Packs multiple elements into a single array (typically in function parameters).

```javascript
// Spread
const arr = [1, 2];
const combined = [...arr, 3, 4];

// Rest
function sum(...args) {
  return args.reduce((a, b) => a + b, 0);
}
```

### Template Literals
Enclosed by backticks (\``\`), template literals support multi-line strings, expression interpolation (`${expression}`), and tagged templates.

---

## 3. Promises and Async/Await

### Promises
An object representing the eventual completion (or failure) of an asynchronous operation.
* **States**: `pending`, `fulfilled`, or `rejected`.
* **Methods**: `.then()`, `.catch()`, `.finally()`.

### Promise Combinators
* `Promise.all([p1, p2])`: Fails fast if any promise rejects; succeeds only when all succeed.
* `Promise.allSettled([p1, p2])`: Waits for all promises to settle (resolve or reject) and returns an array of status objects.
* `Promise.race([p1, p2])`: Settles as soon as the first promise settles (either resolves or rejects).

### Async/Await
Syntactic sugar built on top of Promises to make asynchronous code write and read like synchronous code.
* Uses standard `try/catch` blocks for clean, readable error handling.

---

## 4. The Node.js Event Loop

Node.js is single-threaded, but it achieves high concurrency using an asynchronous, event-driven architecture powered by **libuv**.

```
   ┌───────────────────────────┐
   │          TIMERS           │  <-- setTimeout, setInterval
   └─────────────┬─────────────┘
                 ▼
   ┌───────────────────────────┐
   │     PENDING CALLBACKS     │  <-- System/Network errors
   └─────────────┬─────────────┘
                 ▼
   ┌───────────────────────────┐
   │       IDLE, PREPARE       │  <-- Node internal use only
   └─────────────┬─────────────┘
                 ▼
   ┌───────────────────────────┐
   │           POLL            │  <-- Retrives I/O events; executes callbacks
   └─────────────┬─────────────┘
                 ▼
   ┌───────────────────────────┐
   │           CHECK           │  <-- setImmediate callbacks
   └─────────────┬─────────────┘
                 ▼
   ┌───────────────────────────┐
   │      CLOSE CALLBACKS      │  <-- socket.on('close')
   └───────────────────────────┘
```

### Call Stack, Microtasks, and Macrotasks
1. **Call Stack**: Executes synchronous JavaScript.
2. **Microtask Queue**: Processed immediately after the current operation finishes (before transitioning to the next phase of the event loop).
   * **Priority 1**: `process.nextTick`
   * **Priority 2**: Promise `.then()` / `.catch()` callbacks
3. **Macrotask Queue**: Executes async APIs in their respective phases (e.g., Timers, Check, Poll).

> [!IMPORTANT]
> Within an I/O callback, `setImmediate` is guaranteed to execute *before* `setTimeout(fn, 0)`, because the loop transitions from the **Poll** phase to the **Check** phase next.

---

## 5. CommonJS (CJS) vs ES Modules (ESM)

Node.js supports two module formats:

| Feature | CommonJS (CJS) | ES Modules (ESM) |
|---|---|---|
| **Syntax** | `require()` / `module.exports` | `import` / `export` |
| **Loading** | Synchronous & Dynamic | Asynchronous & Static (Analyzed at compile-time) |
| **Top-Level Await** | ❌ Not supported |  Supported |
| **File Extension** | `.js` (default in Node) | `.mjs` (or `"type": "module"` in package.json) |
| **Global variables** | Has `__dirname`, `__filename` | ❌ Must use `import.meta.url` to resolve paths |
