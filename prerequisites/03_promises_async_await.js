// ==========================================
// 3. Promises and Async/Await
// ==========================================

console.log("\x1b[35m=== 3. Promises and Async/Await ===\x1b[0m\n");

// Mock function simulating network delay
function fetchData(id, shouldFail = false) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      if (shouldFail) {
        reject(new Error(`Failed to fetch data for ID ${id}`));
      } else {
        resolve({ id, data: `Mock data payload for ID ${id}` });
      }
    }, 500);
  });
}

// --- A. Promise Chains ---
console.log("\x1b[36m--- A. Promise Chains (.then, .catch, .finally) ---\x1b[0m");

fetchData(1)
  .then((res) => {
    console.log("  Step 1 Result:", res);
    return fetchData(2); // Chain another promise
  })
  .then((res) => {
    console.log("  Step 2 Result:", res);
    return fetchData(3, true); // Chain a failing promise
  })
  .then((res) => {
    console.log("  Step 3 Result (Should not print):", res);
  })
  .catch((err) => {
    console.log("  Caught expected error:", err.message);
  })
  .finally(() => {
    console.log("  Finally block: Clean up executed.");
    runAsyncAwaitSection();
  });

// --- B. Async / Await ---
async function runAsyncAwaitSection() {
  console.log("\n\x1b[36m--- B. Async / Await with try/catch ---\x1b[0m");
  try {
    console.log("  Fetching user profile...");
    const profile = await fetchData(100);
    console.log("  Profile fetched:", profile);

    console.log("  Fetching settings (this will fail)...");
    const settings = await fetchData(101, true);
    console.log("  Settings:", settings);
  } catch (err) {
    console.log("  Caught error in catch block:", err.message);
  } finally {
    console.log("  Async/Await finally block executed.");
    runParallelPromisesSection();
  }
}

// --- C. Parallel execution with Promise APIs ---
async function runParallelPromisesSection() {
  console.log("\n\x1b[36m--- C. Promise Combinators (all, allSettled, race) ---\x1b[0m");

  const promise1 = fetchData(1, false);
  const promise2 = fetchData(2, false);
  const promise3 = fetchData(3, true); // Will reject

  // 1. Promise.all (Fails fast if any promise rejects)
  try {
    console.log("  Executing Promise.all...");
    await Promise.all([promise1, promise2, promise3]);
  } catch (err) {
    console.log("  Promise.all failed fast as expected:", err.message);
  }

  // Need to recreate promises since they might be settled
  const p1 = fetchData(10, false);
  const p2 = fetchData(11, false);
  const p3 = fetchData(12, true);

  // 2. Promise.allSettled (Returns status of all promises regardless of success/failure)
  console.log("  Executing Promise.allSettled...");
  const results = await Promise.allSettled([p1, p2, p3]);
  results.forEach((res, index) => {
    if (res.status === "fulfilled") {
      console.log(`    Result ${index}: Success ->`, res.value);
    } else {
      console.log(`    Result ${index}: Rejected ->`, res.reason.message);
    }
  });

  // 3. Promise.race (First one to settle wins - success or failure)
  const raceFast = new Promise((resolve) => setTimeout(() => resolve("Fast win!"), 50));
  const raceSlow = new Promise((resolve) => setTimeout(() => resolve("Slow lose"), 200));

  console.log("  Executing Promise.race...");
  const winner = await Promise.race([raceFast, raceSlow]);
  console.log("    Winner:", winner);
}
