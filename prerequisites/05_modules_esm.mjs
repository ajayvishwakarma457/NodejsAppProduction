// ==========================================
// 5B. ES Modules (ESM) Module Example
// ==========================================

console.log("\x1b[35m=== 5B. ES Modules (import / export) ===\x1b[0m\n");

export const multiply = (a, b) => a * b;
export const divide = (a, b) => a / b;

export default function greet(name) {
  return `Hello, ${name} (from ESM default export)`;
}

console.log("  In ES Modules, exports are static and defined using the 'export' keyword.");
console.log("  ESM supports top-level await and is the modern standard for JavaScript.");
