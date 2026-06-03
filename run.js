const readline = require('readline');
const { exec } = require('child_process');
const path = require('path');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const menu = `
\x1b[35m==================================================
   Node.js Roadmap: 1. JavaScript Prerequisites
==================================================\x1b[0m
1. Scope, Closures, Prototypes & the 'this' keyword
2. ES6+ Features (Arrow, Destructuring, Spread/Rest)
3. Promises & Async/Await (Async control flow)
4. Node.js Event Loop, Call Stack & Microtask Queue
5. CommonJS (CJS) vs ES Modules (ESM)
6. Run All Demos Sequentially
0. Exit

\x1b[32mSelect an option to run (0-6): \x1b[0m`;

function executeScript(file) {
  const filePath = path.join(__dirname, 'prerequisites', file);
  console.log(`\n\x1b[2mExecuting: node ${file}...\x1b[0m\n`);
  
  exec(`node "${filePath}"`, (error, stdout, stderr) => {
    if (error) {
      console.error(`\x1b[31mError: ${error.message}\x1b[0m`);
      showMenuAndPrompt();
      return;
    }
    if (stderr) {
      console.error(`\x1b[31mStderr: ${stderr}\x1b[0m`);
    }
    console.log(stdout);
    showMenuAndPrompt();
  });
}

function showMenuAndPrompt() {
  rl.question(menu, (answer) => {
    const choice = answer.trim();
    switch (choice) {
      case '1':
        executeScript('01_scopes_closures_this.js');
        break;
      case '2':
        executeScript('02_es6_features.js');
        break;
      case '3':
        executeScript('03_promises_async_await.js');
        break;
      case '4':
        executeScript('04_event_loop.js');
        break;
      case '5':
        // Run both CJS and ESM scripts
        console.log(`\n\x1b[2mExecuting both CommonJS and ES Module demos...\x1b[0m\n`);
        exec(`node "${path.join(__dirname, 'prerequisites', '05_modules_cjs.js')}"`, (e1, out1) => {
          console.log(out1);
          exec(`node "${path.join(__dirname, 'prerequisites', '05_modules_esm.mjs')}"`, (e2, out2) => {
            console.log(out2);
            showMenuAndPrompt();
          });
        });
        break;
      case '6':
        console.log('\n\x1b[34mRunning all demos sequentially...\x1b[0m\n');
        executeSequentially([
          '01_scopes_closures_this.js',
          '02_es6_features.js',
          '03_promises_async_await.js',
          '04_event_loop.js'
        ]);
        break;
      case '0':
        console.log('\n\x1b[32mExiting... Happy coding!\x1b[0m\n');
        rl.close();
        break;
      default:
        console.log('\n\x1b[31mInvalid option. Please choose between 0 and 6.\x1b[0m');
        showMenuAndPrompt();
        break;
    }
  });
}

function executeSequentially(scripts) {
  if (scripts.length === 0) {
    // Run modules at the end
    exec(`node "${path.join(__dirname, 'prerequisites', '05_modules_cjs.js')}"`, (e1, out1) => {
      console.log(out1);
      exec(`node "${path.join(__dirname, 'prerequisites', '05_modules_esm.mjs')}"`, (e2, out2) => {
        console.log(out2);
        showMenuAndPrompt();
      });
    });
    return;
  }
  const nextScript = scripts.shift();
  const filePath = path.join(__dirname, 'prerequisites', nextScript);
  exec(`node "${filePath}"`, (error, stdout) => {
    console.log(stdout);
    executeSequentially(scripts);
  });
}

// Start the app
showMenuAndPrompt();
