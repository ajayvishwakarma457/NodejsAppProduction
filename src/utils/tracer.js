const { AsyncLocalStorage } = require('async_hooks');

// Instantiate global AsyncLocalStorage context to store correlation IDs
const asyncLocalStorage = new AsyncLocalStorage();

module.exports = asyncLocalStorage;
