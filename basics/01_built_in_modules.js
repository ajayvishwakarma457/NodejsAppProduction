// ==========================================
// 1. Built-in Modules: fs, path, os, events, http
// ==========================================

console.log("\x1b[35m=== 1. Node.js Built-in Modules ===\x1b[0m\n");

const fs = require('fs');
const path = require('path');
const os = require('os');
const EventEmitter = require('events');
const http = require('http');

// --- A. path Module ---
console.log("\x1b[36m--- path Module ---\x1b[0m");
const samplePath = path.join(__dirname, 'test_dir', 'file.txt');
console.log("  Resolved path.join:", samplePath);
console.log("  Base name:", path.basename(samplePath));
console.log("  Extension name:", path.extname(samplePath));

// --- B. os Module ---
console.log("\n\x1b[36m--- os Module ---\x1b[0m");
console.log("  Platform:", os.platform());
console.log("  CPU Architecture:", os.arch());
console.log("  Total Memory:", (os.totalmem() / (1024 ** 3)).toFixed(2), "GB");
console.log("  Free Memory:", (os.freemem() / (1024 ** 3)).toFixed(2), "GB");

// --- C. fs Module (FileSystem) ---
console.log("\n\x1b[36m--- fs Module ---\x1b[0m");
const tempFile = path.join(__dirname, 'temp_fs_demo.txt');

// Writing asynchronously
fs.writeFile(tempFile, 'Hello Node.js built-in fs!', 'utf8', (err) => {
  if (err) throw err;
  console.log("  1. File written successfully.");

  // Reading asynchronously
  fs.readFile(tempFile, 'utf8', (readErr, data) => {
    if (readErr) throw readErr;
    console.log("  2. File read content:", data);

    // Deleting (cleaning up)
    fs.unlink(tempFile, (unlinkErr) => {
      if (unlinkErr) throw unlinkErr;
      console.log("  3. File cleaned up.");
      runEventsDemo();
    });
  });
});

// --- D. events Module (EventEmitter) ---
function runEventsDemo() {
  console.log("\n\x1b[36m--- events Module (EventEmitter) ---\x1b[0m");
  const myEmitter = new EventEmitter();

  // Register listener
  myEmitter.on('greet', (name) => {
    console.log(`  Event received! Hello, ${name}!`);
  });

  // Emit event
  myEmitter.emit('greet', 'Developer');
  runHttpDemo();
}

// --- E. http Module ---
function runHttpDemo() {
  console.log("\n\x1b[36m--- http Module ---\x1b[0m");
  const server = http.createServer((req, res) => {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain');
    res.end('Hello World from basic Node.js http server!\n');
  });

  const PORT = 3000;
  server.listen(PORT, () => {
    console.log(`  HTTP Server listening on http://localhost:${PORT}`);
    console.log("  (Closing HTTP server immediately for demo purposes)");
    server.close();
  });
}
