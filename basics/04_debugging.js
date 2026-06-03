// ==========================================
// 4. Debugging: node --inspect, console.trace
// ==========================================

console.log("\x1b[35m=== 4. Debugging Node.js ===\x1b[0m\n");

// --- A. console.trace() ---
console.log("\x1b[36m--- A. console.trace() ---\x1b[0m");
console.log("  console.trace prints a stack trace to stderr at the point where it is called.");

function level3() {
  console.log("  Generating stack trace:");
  console.trace("Trace at Level 3");
}

function level2() {
  level3();
}

function level1() {
  level2();
}

level1();

// --- B. Debugging with node --inspect ---
console.log("\n\x1b[36m--- B. Chrome DevTools Inspector & VS Code Debugger ---\x1b[0m");
console.log("  To debug Node.js code with chrome-devtools, start Node with the inspection flag:");
console.log("\x1b[33m  node --inspect-brk file.js\x1b[0m");
console.log("  Open chrome://inspect in Google Chrome and click 'Open dedicated DevTools for Node' to debug step-by-step.");
