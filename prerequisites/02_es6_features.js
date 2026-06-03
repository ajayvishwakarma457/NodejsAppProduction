// ==========================================
// 2. ES6+ Features
// ==========================================

console.log("\x1b[35m=== 2. ES6+ Features ===\x1b[0m\n");

// --- A. Arrow Functions ---
console.log("\x1b[36m--- A. Arrow Functions ---\x1b[0m");
// Concise syntax, implicit returns
const add = (a, b) => a + b;
console.log("  Implicit return: add(5, 7) =", add(5, 7));

// --- B. Destructuring ---
console.log("\n\x1b[36m--- B. Destructuring ---\x1b[0m");
// Object destructuring with renaming and default values
const config = { host: "localhost", port: 8080, secure: true };
const { host, port: serverPort, secure = false } = config;
console.log(`  Host: ${host}, Port: ${serverPort}, Secure: ${secure}`);

// Array destructuring
const rgb = [255, 128, 0];
const [red, green, blue] = rgb;
console.log(`  Red: ${red}, Green: ${green}, Blue: ${blue}`);

// --- C. Spread and Rest Operators (...) ---
console.log("\n\x1b[36m--- C. Spread and Rest Operators ---\x1b[0m");
// Spread (expanding arrays/objects)
const baseArray = [1, 2];
const combinedArray = [0, ...baseArray, 3, 4];
console.log("  Spread array:", combinedArray);

const defaultSettings = { theme: "dark", notifications: true };
const userSettings = { ...defaultSettings, notifications: false, source: "user" };
console.log("  Spread object override settings:", userSettings);

// Rest (collecting arguments or remaining properties)
function sumAll(...numbers) {
  return numbers.reduce((total, num) => total + num, 0);
}
console.log("  Rest arguments sumAll(1, 2, 3, 4, 5) =", sumAll(1, 2, 3, 4, 5));

const { theme, ...otherConfig } = userSettings;
console.log("  Rest destructuring (theme excluded):", otherConfig);

// --- D. Template Literals ---
console.log("\n\x1b[36m--- D. Template Literals ---\x1b[0m");
const name = "Developer";
const role = "Backend Architect";
console.log(`  Multi-line Interpolation:
    Hello ${name},
    Welcome to the ${role} course!`);
