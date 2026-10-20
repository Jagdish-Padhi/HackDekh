# HackDekh Production Scalability, Architecture & Defense Blueprint (fix.md)

>**Document Purpose:** An architectural roadmap detailing current technical debt, bottlenecks, trade-offs, and step-by-step production-grade fixes. This serves as your engineering reference to build and defend the HackDekh architecture in technical interviews and system design discussions.


---

## 1. Executive Summary & Architectural Overview

HackDekh is structured as a **Modular Monolith** containing:
* **Identity**: Authentication (JWT, OAuth, email activation), user profile management.
* **Catalog**: Querying, filtering, sorting, caching, and serving hackathons.
* **Ingestion**: Multi-platform data extraction (MLH, Devfolio, Unstop, Devpost, Hack2Skill).
* **Team**: Collaboration, squad formation, invite links, join codes.
* **Tracking**: Stage tracking, reflection timelines, milestone monitoring.

### The System Evolution Spectrum

```
[PHASE 0 Current State]          [PHASE 1 Immediate Hardening]         [PHASE 2 Advanced Scalability]
- Scrapers = Controllers = DB        - Redis-backed distributed rate limiters - Read-heavy DB Indexing & Pagination
- In-memory Node rate limiting       - Modular boundary contracts (no leaks)  - Cache tagging & versioning
- In-memory filtering/sorting        - Precomputed normalized DB fields       - Dedicated Ingestion Workers
- redis.keys() cache wipes            - Connection resiliency & graceful exits - Event-driven domain messaging
```

---

## 2. Deep Dive: Current Bottlenecks & Architectural Flaws

### Issue 1: Ingestion "Adapters" are God Files (Single Responsibility Principle Violation)
* **What is happening:** 
  Files inside `modules/ingestion/adapters/*.adapter.ts` currently perform 4 separate responsibilities:
  1. Network request & HTML extraction via Cheerio (`axios.get`, `cheerio.load`).
  2. Express controller logic (`req: any, res: any`, `res.status(200).json(...)`).
  3. Domain mapping & validation.
  4. Database persistence (`hackathon.findOneAndUpdate(...)`).
* **Why it breaks at scale:**
  * **Failure Blast Radius:** If MLH changes its HTML DOM structure and Cheerio throws, the failure is coupled directly to the HTTP controller and database write pipeline.
  * **Testability:** Scrapers cannot be unit tested without mocking Express `req`/`res` and Mongoose models simultaneously.
  * **Architectural Misnomer:** An Adapter in clean architecture adapts an external interface to an internal domain port. It should not be an Express controller or direct database updater.
* **Production Standard:** 
  Separate into **Providers** (fetch raw data) -> **Transformers** (normalize to DTO) -> **Services/Repositories** (save/upsert). Express HTTP routes belong strictly in `controllers/`.

### Issue 2: Synchronous Ingestion in the API Process & Multi-Pod Cron Multiplier
* **What is happening:**
  `infrastructure/scheduler/scrapeScheduler.ts` uses `node-cron` inside `app.ts`. At 3:00 AM, it triggers `runAllScrapers()`, running all 5 scrapers sequentially in the same V8 process serving user requests.
* **Why it breaks at scale:**
  * **Event Loop Starvation:** Scrapers making dozens of outgoing HTTP calls and parsing multi-megabyte HTML strings lock CPU cycles, spiking API response latency (p99) for normal web users.
  * **Cron Multiplication under Horizontal Scaling:** If you run 4 backend replicas (Kubernetes pods or PM2 cluster), **all 4 pods trigger the cron at 3:00 AM simultaneously**. You send 4x the traffic to upstream sites (Devfolio, Unstop), risking IP bans, CAPTCHAs, and database write lock contention.
* **Production Standard:**
  Use an asynchronous distributed job queue (**BullMQ** over Redis) with dedicated worker processes. The scheduler emits a single job: `queue.add('scrape', { source: 'devfolio' })`. Only one worker picks up the job.

### Issue 3: In-Memory Rate Limiting in a Distributed System
* **What is happening:**
  `shared/middlewares/rateLimiter.ts` uses default `express-rate-limit` in-memory memory store.
* **Why it breaks at scale:**
  * Each server instance maintains its own rate limit map. Behind an NGINX load balancer across 3 pods, a client allowed 15 login attempts can actually execute 3 * 15 = 45 attempts.
  * High-frequency IP-spoofing attacks allocate thousands of keys in Node process memory, risking `Out of Memory` (OOM) crashes.
* **Production Standard:** 
  Connect `rate-limit-redis` to your existing Redis instance (`redisClient`), ensuring single-source-of-truth across all API instances.

### Issue 4: In-Memory Catalog Filtering/Sorting & Zero Database Pagination
* **What is happening:**
  In `catalog/services/hackathon.service.ts`:
  1. `hackathon.find(query).lean()` fetches **all** matching records from MongoDB into Node memory.
  2. A JavaScript loop iterates through all items, runs custom regex currency conversions (`getPrizeAmountInINR`), and checks expiration.
  3. `activeList.sort(...)` and `expiredList.sort(...)` sort thousands of JavaScript objects in V8 memory.
  4. There is no `limit` or `skip` parameter in the database query.
* **Why it breaks at scale:**
  * Memory usage scales with O(N) where N is total hackathons. When hackathon volume grows to 10,000+, every cache miss causes memory spikes and high Garbage Collection (GC) pauses.
  * MongoDB B-tree indexes are bypassed because sorting is done in Node.js runtime instead of the database engine.
* **Production Standard:**
  * **Ingestion-Time Normalization:** Compute `prizeAmountINR` (numeric) during the ingestion pipeline and store it directly in MongoDB with an index `{ deadline: 1, prizeAmountINR: -1 }`.
  * **Keyset / OffsetPagination:** Enforce `page` and `pageSize` (default 20, max 100) at the Mongo query level.

### Issue 5: Dangerous Redis Cache Invalidation (KEYS**)
* **What is happening:**
  In `infrastructure/cache/redis.ts`:
  `${'r``}ts\n  const keys = await redisClient.keys("hackathons:list:*");\n  if (keys.length > 0) await redisClient.del(keys);\n  ```
* **Why it breaks at scale:**
  * Redis is single-threaded. `KEYS` is an o(N) operation that inspects every key in the database.
  * In production with millions of active session tokens and cached items, running `KEYS *` blocks all other operations for hundreds of milliseconds, causing timeout cascades in client requests.
* **Production Standard:**
  * Use **Cache Versioning**: Store a global key `hackathons:g_version = 1`. Include it in cache keys (`hackathons:v1*list:...`). Invalidation is simply `INCR hackathons:g_version`. Old keys expire via TTL automatically without blocking.
  * Alternatively, use non-blocking cursor-based iteration: `SCAN`.

### Issue 6: Cross-Module Boundary Violations & Orphan Routes
* **What is happening:**
  * `stage.routes.ts` is never mounted in `app.ts`.
  * `team.routes.ts` directly imports `stage.controller.ts` from `../../tracking/controllers/stage.controller.ts`.
  * `team.service.ts` directly imports Mongoose `Stage` model from `../../tracking/models/stage.model.ts`.
  * `user.controller.ts` imports from `../../tracking/services/stage.service.ts`.
* **Why it breaks at scale:**
  * Defeats the purpose of a **Modular Monolith** by tightly coupling database schemas across domains. If tracking or teams are ever split into a separate service, breaking changes require rewriting all modules.
* **Production Standard:** Modules must communicate only through public service interfaces exported from `tracking/index.ts`, never via rawMongoose models.


---

## 3. Phase-Wise Implementation Roadmap

### Phase 1: Structural Cleanliness & Boundary Enforcement (Immediate)

***Step 1.1: Re-architect Ingestion to Clean ETL (Extract-Transform-Load)**
* Rename `modules/ingestion/adapters/` to `poverviders/` (collectors).
* Define a strict `IngestionProvider` interface:
  ```ts
  export interface IngestionProvider<TRaw = unknown> {
    readonly name: string;
    readonly sourceUrl: string;
    fetchRaw(): Promise<TRaw[]>;
  }
  ```
* Extract Express `req, res` out of scrapers into `ingestion.controller.ts`.
* Transformation: `transformers/` receives raw scraped payloads and maps them to a canonical `NormalizedHackathon` DTO.
* Persistence: `transformers` do not write to Mongo; the `IngestionPipelineService` calls the Catalog repository to depluplicate and upsert.

***Step 1.2: Plug Redis into Express Rate Limiter**
* Install `rate-limit-redis`.
* Pass `SendCommand` from your existing `redisClient` into the rate limiters so limits are shared distributed across all nodes.

***Step 1.3: Decouple Tracking & Team Domain Boundaries**
* Export domain service methods from `modules/tracking/index.ts` (e.g. `trackingService.createStageForTeam(...)`).
* Prevent `team.service.ts` from directly importing `multiple/stage.model.ts`.

### Phase 2: Database & Query Performance (Production Grade)

***Step 2.1: Normalize Numeric Fields at Ingestion Time**
* Add `prizeAmountINR: { type: Number, index: true }` and `isExpired: { type: Boolean, index: true }` directly inside `hackathon.model.ts`.
* Move currency conversion out of query time into ingestion time. Catalog queries should never do regex currency parsing on the fly.

***Step 2.2: True Database Pagination & Indexes**
* Add compound indexes for the primary query patterns:
  ``ts
  hackSchema.index({ isExpired: 1, deadline: 1, prizeAmountINR: -1 });
  `ackSchema.index({ platform: 1, isExpired: 1 });
  ```
* Enforce `page` or cursor-style pagination directly in the MongoDB query (`.skip(skip).limit(limit)`) instead of sorting thousands of items in Node.js memory.

***Step 2.3: Non-Blocking Cache Invalidation (Version Tagger**
* Replace on-demand `redis.keys()` with a version counter in Redis:
  ```ts
  export const getCacheVersion = async () => {
    const v = await redisClient.get("hackathons:cache_version");
    return v ? parseInt(v, 10) : 1;
  };
  export const invalidateHackathonCache = async () => {
    await redisClient.incr("hackathons:cache_version");
  };
  ```
* Cache keys become: `hackathons:v{version}:list:hash`. Invalidation is an instantaneous O(1) INCR. Old entries automatically evict via ttl without blocking Redis.

### Phase 3: Advanced Distributed Scale (Queues & Resiliency)

***Step 3.1: Distributed Ingestion Pipeline with BullMQ__

  * Extract cron execution out of the API server into a background worker process.
  * The scheduler simply pushes a job into Redis queue with exponential backoff, retries, and dead-letter queue for alerting.

***Step 3.2: Circuit Breaker & Proxy Rotation**
* Wrap external HTTP calls with a circuit breaker (e.g. Opossum). If Unstop or Devpost returns 429s or 503s repeatedly, trip the breaker to prevent exhausting worker resources and receiving IP bans.

***Step 3.3: Observability & Graceful Shutdown**
* Add a standard graceful shutdown handler for `SIGINT` and `SIGTERM` so inflight requests finish, Redis connections drain, and MongoDB pools close cleanly.


---

## 4. How to Defend This Architecture in Engineering Interviews

### Q1: Why Modular Monolith instead of Microservices from Day 1?
> *Starting with microservices adds distributed tracing overhead, network serialization costs, and eventual consistency complexity before domain boundaries stabilize. I chose a Modular Monolith with strict boundary rules: internal controllers and models remain private; cross-module interaction occurs strictly via exported services. When team size or traffic demands it, any module (such as Ingestion or Tracking) can be extracted into an independent microservice with zero changes to business logic.*

### Q2: How do you handle scrapers failing or platforms blocking your IP?
> *We decoupled ingestion into a 3-layer ETL architecture: Provider (Extract) -> Transformer (Normalize) -> Loader (Upsert). Each provider runs via a distributed BullMQ queue with exponential backoff and jitter. We run user-agent rotation, proxy routing through scraper utilities, and a circuit breaker that trips if an upstream platform starts returning 429s or 503s, preserving worker resources and avoiding IP bans.*

### Q3: Why did you avoid sorting in Node.js memory?
> *Initially, calculating dynamic currency exchange rates on the fly led to in-memory array manipulation in Node.js. But that violates basic scalability principles: it causes o(N) memory bloat, high garbage collection pauses, and fails under high concurrent load. We moved normalization to ingestion time, storing a canonical numeric `prizeAmountINR` field in MongoDB. This allowed us to leverage compound B-tree indexes and database-level keyset pagination.*

### Q4: How does your caching strategy avoid stale data and Redis CPU spikes?
>**Instead of using dangerous O(N) KEYS * commands which block Redis single-threaded event loop, we implemented Cache Versioning. The cache key includes a global version tag. Invalidating the entire hackathon catalog takes an instantaneous O(1) INCR operation. Old keys naturally expire via TTL without holding locks.*


---

## 5. Verification Checklist

- [ ] `npm test` runs with zero failures (Integration & Unit suites pass).
- [ ] A: No `KEYS** calls exist in production Redis logic.
- [ ] B: No Express `req, res` objects exist inside ingestion providers or domain services.
- [ ] C: No module reaches into another module internal `models/` directory.
- [ ] D: Database queries for lists include pagination parameters (`limit`, `skip`/cursor).
- [ ] E: All external network calls include explicit timeouts and retry policies.
