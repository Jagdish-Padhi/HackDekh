const API_URL = "http://localhost:3000/api/v1/hackathons";

const TOTAL_REQUESTS = 10;

async function requestAPI(): Promise<number> {
  const start = performance.now();

  const response = await fetch(API_URL);

  const end = performance.now();

  if (!response.ok) {
    throw new Error(`API returned status ${response.status}`);
  }

  await response.json();

  return end - start;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return (
    values.reduce((sum, value) => sum + value, 0) / values.length
  );
}

async function runRequests(): Promise<number[]> {
  const latencies: number[] = [];

  for (let i = 1; i <= TOTAL_REQUESTS; i++) {
    const latency = await requestAPI();

    latencies.push(latency);

    console.log(
      `Request ${String(i).padStart(2, " ")} | ` +
      `${latency.toFixed(2).padStart(8, " ")} ms`
    );
  }

  console.log("----------------------------------------");

  return latencies;
}

async function waitForEnter(): Promise<void> {
  process.stdin.setEncoding("utf8");

  return new Promise((resolve) => {
    process.stdin.once("data", () => {
      resolve();
    });
  });
}

async function runBenchmark(): Promise<void> {
  console.log("\n====================================================");
  console.log("        HACKDEKH REDIS CACHE BENCHMARK");
  console.log("====================================================");
  console.log(`Endpoint : ${API_URL}`);
  console.log(`Requests : ${TOTAL_REQUESTS}`);
  console.log("====================================================\n");

  // ==================================================
  // WARM-UP
  // ==================================================

  console.log("WARM-UP REQUEST");
  console.log("----------------------------------------");

  const warmupLatency = await requestAPI();

  console.log(
    `Warm-up latency: ${warmupLatency.toFixed(2)} ms`
  );

  console.log(
    "Warm-up request is excluded from benchmark.\n"
  );

  // ==================================================
  // PHASE 1 — DATABASE
  // ==================================================

  console.log("PHASE 1: DATABASE REQUESTS");
  console.log("----------------------------------------");
  console.log("Make sure CACHE_ENABLED=false\n");

  const dbLatencies = await runRequests();

  const dbAverage = average(dbLatencies);

  console.log(
    `Average database latency: ${dbAverage.toFixed(2)} ms\n`
  );

  // ==================================================
  // PHASE 2 — REDIS CACHE
  // ==================================================

  console.log("PHASE 2: REDIS CACHE");
  console.log("----------------------------------------");

  console.log("Before continuing:");
  console.log("1. Set CACHE_ENABLED=true");
  console.log("2. Clear Redis key:");
  console.log("   DEL hackathons:list:all");
  console.log("3. Press ENTER here\n");

  await waitForEnter();

  console.log("Running cached requests...\n");

  const cacheLatencies = await runRequests();

  // First request is:
  // Redis MISS → MongoDB → Redis SET
  //
  // Therefore exclude request 1.
  const redisHitLatencies = cacheLatencies.slice(1);

  const redisAverage = average(redisHitLatencies);

  console.log(
    `First request (CACHE MISS): ${cacheLatencies[0]?.toFixed(2) ?? "0"} ms`
  );

  console.log(
    `Average Redis HIT latency: ${redisAverage.toFixed(2)} ms\n`
  );

  // ==================================================
  // FINAL RESULTS
  // ==================================================

  const speedup = dbAverage / redisAverage;

  console.log("====================================================");
  console.log("                  FINAL RESULTS");
  console.log("====================================================");

  console.log(
    `Database average latency : ${dbAverage.toFixed(2)} ms`
  );

  console.log(
    `Redis HIT average latency: ${redisAverage.toFixed(2)} ms`
  );

  console.log(
    `Performance speedup      : ${speedup.toFixed(2)}x`
  );

  console.log("====================================================\n");

  console.log("Conclusion:");
  console.log(
    "Redis cache hits reduce API response latency by avoiding repeated database queries."
  );
}

// ==================================================
// START BENCHMARK
// ==================================================

runBenchmark().catch((error) => {
  console.error("\nBenchmark failed:");
  console.error(error);
});