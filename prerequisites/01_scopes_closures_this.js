// ==========================================
// 1. Scopes, Closures, Prototypes & 'this'
// ==========================================

console.log("\x1b[35m=== 1. Scopes, Closures, Prototypes & 'this' ===\x1b[0m\n");

// --- A. Scope (Global, Function, Block) ---
console.log("\x1b[36m--- A. Scope ---\x1b[0m");
const globalVar = "I am Global";

function scopeDemo() {
  const functionVar = "I am Function Scoped";
  if (true) {
    var varVariable = "I leak out of block (var)";
    let letVariable = "I am blocked (let)";
    const constVariable = "I am blocked (const)";
    console.log("  Inside block:", letVariable, constVariable);
  }
  console.log("  Inside function, accessing block var:", varVariable);
  try {
    console.log(letVariable);
  } catch (err) {
    console.log("  Inside function, accessing let (Error expected):", err.message);
  }
}
scopeDemo();

// --- B. Closures ---
console.log("\n\x1b[36m--- B. Closures ---\x1b[0m");
function createCounter() {
  let count = 0; // Encapsulated private state
  return {
    increment: () => {
      count++;
      return count;
    },
    decrement: () => {
      count--;
      return count;
    },
    getCount: () => count
  };
}

const counter = createCounter();
console.log("  Increment 1:", counter.increment()); // 1
console.log("  Increment 2:", counter.increment()); // 2
console.log("  Current Count:", counter.getCount()); // 2
console.log("  Attempting to access private 'count' directly:", counter.count); // undefined

// --- C. Prototypes & Prototypal Inheritance ---
console.log("\n\x1b[36m--- C. Prototypes ---\x1b[0m");
function Animal(name) {
  this.name = name;
}
// Adding method to prototype so instances share it rather than copying it
Animal.prototype.speak = function() {
  return `${this.name} makes a noise.`;
};

function Dog(name, breed) {
  Animal.call(this, name); // Call parent constructor with current context
  this.breed = breed;
}
// Set up prototype chain inheritance
Dog.prototype = Object.create(Animal.prototype);
Dog.prototype.constructor = Dog;

// Override method
Dog.prototype.speak = function() {
  return `${this.name} (a ${this.breed}) barks!`;
};

const myDog = new Dog("Rex", "German Shepherd");
console.log("  Dog's speak():", myDog.speak());
console.log("  Dog instanceof Dog:", myDog instanceof Dog); // true
console.log("  Dog instanceof Animal:", myDog instanceof Animal); // true

// --- D. The 'this' Keyword ---
console.log("\n\x1b[36m--- D. The 'this' Keyword ---\x1b[0m");

const user = {
  username: "Alice",
  greet() {
    console.log(`  Implicit Binding - Hello, I am ${this.username}`);
  }
};
user.greet();

const externalGreet = user.greet;
try {
  externalGreet(); // Lost context
} catch (err) {
  console.log("  Lost binding (Error/Undefined expected):", err.message);
}

// Explicit Binding: call, apply, bind
console.log("  Explicit Binding (call):");
const person1 = { username: "Bob" };
const person2 = { username: "Charlie" };

user.greet.call(person1); // Bob
user.greet.apply(person2); // Charlie

const boundGreet = user.greet.bind(person1);
console.log("  Explicit Binding (bound function):");
boundGreet(); // Bob

// Lexical binding in Arrow functions (arrows don't have their own 'this')
const arrowUser = {
  username: "Diana",
  regularFunc: function() {
    setTimeout(function() {
      console.log("    Regular setTimeout (dynamic this):", this.username); // undefined (in Node.js timeout context)
    }, 10);
  },
  arrowFunc: function() {
    setTimeout(() => {
      console.log("    Arrow setTimeout (lexical this):", this.username); // Diana
    }, 10);
  }
};

arrowUser.regularFunc();
arrowUser.arrowFunc();
