// ==========================================
// 1. TypeScript Types, Interfaces, Enums & Generics
// ==========================================

console.log("\x1b[35m=== 1. TypeScript Core Fundamentals ===\x1b[0m\n");

// --- A. Basic Types ---
console.log("\x1b[36m--- A. Basic Types ---\x1b[0m");
const isDev: boolean = true;
const age: number = 30;
const devName: string = "TypeScript Dev";
const skills: string[] = ["TypeScript", "Node.js", "Express"];
const randomVal: unknown = "Could be anything, need type checking/assertion to use";

console.log(`  Boolean: ${isDev}, Number: ${age}, String: ${devName}`);
console.log(`  Array:`, skills);
if (typeof randomVal === "string") {
  console.log(`  Type Guarded Unknown value: ${randomVal.toUpperCase()}`);
}

// --- B. Interfaces & Type Aliases ---
console.log("\n\x1b[36m--- B. Interfaces & Type Aliases ---\x1b[0m");
interface Employee {
  readonly id: number; // Cannot be modified
  name: string;
  role: string;
  department?: string; // Optional field
}

// Type alias
type Manager = Employee & {
  teamSize: number;
};

const dev: Employee = { id: 101, name: "Alice", role: "Software Engineer" };
const teamLead: Manager = { id: 102, name: "Bob", role: "Team Lead", department: "Engineering", teamSize: 5 };

console.log("  Employee object (Interface):", dev);
console.log("  Manager object (Intersection Type):", teamLead);

// --- C. Enums ---
console.log("\n\x1b[36m--- C. Enums (Numeric & String) ---\x1b[0m");
enum UserRole {
  Admin = "ADMIN",
  User = "USER",
  Guest = "GUEST"
}
const activeRole: UserRole = UserRole.Admin;
console.log("  Active User Role Enum:", activeRole); // "ADMIN"

// --- D. Generics ---
console.log("\n\x1b[36m--- D. Generics ---\x1b[0m");

// Generic function
function wrapInArray<T>(item: T): T[] {
  return [item];
}

const stringArray = wrapInArray<string>("TypeScript");
const numberArray = wrapInArray<number>(100);
console.log("  Generic Wrapped Strings:", stringArray);
console.log("  Generic Wrapped Numbers:", numberArray);

// Generic interface
interface ApiResponse<T> {
  status: "success" | "error";
  data: T;
}

const userResponse: ApiResponse<{ name: string; age: number }> = {
  status: "success",
  data: { name: "Alice", age: 25 }
};
console.log("  Generic API Response Payload:", userResponse.data);
