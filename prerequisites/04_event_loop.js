// ==========================================
// 4. Event Loop, Call Stack & Microtask Queue
// ==========================================

const fs = require('fs');

console.log("\x1b[35m=== 4. Node.js Event Loop Execution Phases ===\x1b[0m\n");

console.log("1. Synchronous Code - START");

// Macrotask: Timers phase
setTimeout(() => {
  console.log("10. setTimeout (Timer Phase) - Macrotask");
}, 0);

// Macrotask: Check phase
setImmediate(() => {
  console.log("11. setImmediate (Check Phase) - Macrotask");
});

// Microtask: process.nextTick (runs before promise microtasks!)
process.nextTick(() => {
  console.log("3. process.nextTick 1 - High Priority Microtask");
  
  process.nextTick(() => {
    console.log("5. Nested process.nextTick - run immediately inside nextTick queue");
  });
});

// Microtask: Promise resolves (Job Queue / Promise Microtask Queue)
Promise.resolve().then(() => {
  console.log("6. Promise.then 1 - Microtask");
  
  Promise.resolve().then(() => {
    console.log("8. Nested Promise.then - run inside microtask queue");
  });
});

process.nextTick(() => {
  console.log("4. process.nextTick 2");
});

Promise.resolve().then(() => {
  console.log("7. Promise.then 2");
});

// File I/O (Poll phase)
fs.readFile(__filename, () => {
  console.log("\x1b[33m\n--- Inside fs.readFile I/O Callback ---\x1b[0m");
  
  // Inside I/O callbacks, setImmediate ALWAYS runs before setTimeout(0)
  setTimeout(() => {
    console.log("  3. setTimeout inside I/O callback");
  }, 0);
  
  setImmediate(() => {
    console.log("  1. setImmediate inside I/O callback (runs immediately after poll phase)");
  });
  
  process.nextTick(() => {
    console.log("  2. process.nextTick inside I/O callback");
  });
});

console.log("2. Synchronous Code - END");

// Execution flow explanation:
// 1. Call Stack runs all synchronous logs: '1. Synchronous Code - START', then '2. Synchronous Code - END'.
// 2. Call Stack is empty. Process the Microtask Queue:
//    - process.nextTick queue is processed first: '3. process.nextTick 1', '4. process.nextTick 2'.
//    - The nested nextTick gets added and runs next: '5. Nested process.nextTick'.
//    - Next, Promise microtasks queue: '6. Promise.then 1', '7. Promise.then 2'.
//    - The nested Promise.then gets added and runs: '8. Nested Promise.then'.
// 3. Now the microtask queues are clear. The Event Loop goes to macrotasks.
// 4. Timers phase: '10. setTimeout'.
// 5. Poll/Check phases: '11. setImmediate'.
// 6. I/O completes: fs.readFile callback runs, queuing new events.
