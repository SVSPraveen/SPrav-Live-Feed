/**
 * technical_screening_engine.js
 * ==============================
 * Targeted Technical Screening Question Generator & Answer Evaluator.
 * Generates tailored screening questions directly from ATS X-Ray missing skill gaps.
 * 100% client-side, zero server dependencies, zero cost.
 */

export const SKILL_QUESTION_MAP = {
  javascript: [
    {
      question: "Can you explain how JavaScript's Event Loop, Microtask queue, and Macrotask queue interact when handling Promises vs setTimeout?",
      difficulty: "intermediate",
      idealHints: ["event loop", "call stack", "microtask", "macrotask", "promises", "settimeout", "queue"],
      whyAsked: "Tests deep understanding of asynchronous JavaScript execution order and concurrency.",
      sampleAnswer: "Microtasks (Promises, queueMicrotask) execute immediately after the current call stack clears, before the next macrotask (setTimeout, setInterval, I/O) is processed."
    },
    {
      question: "What are closures in JavaScript, and what is a practical real-world scenario where you used one to solve a bug or manage state?",
      difficulty: "basic",
      idealHints: ["lexical scope", "outer function", "state preservation", "encapsulation", "memory leak"],
      whyAsked: "Fundamental JavaScript interview question evaluating scope control and data encapsulation.",
      sampleAnswer: "A closure is a function that retains access to its lexical scope even when invoked outside that scope, useful for data privacy and memoization."
    },
    {
      question: "What is the difference between == and === in JavaScript, and give a real case where == caused a subtle production bug.",
      difficulty: "basic",
      idealHints: ["type coercion", "strict equality", "nan", "null undefined", "0 == false", "'' == 0"],
      whyAsked: "Catches candidates who learned JS surface-level without understanding its type system.",
      sampleAnswer: "=== checks value and type with no coercion. == applies implicit coercion, so 0 == false is true and '' == 0 is true — both surprising in conditionals."
    },
    {
      question: "Explain the difference between call(), apply(), and bind() in JavaScript with a concrete example.",
      difficulty: "intermediate",
      idealHints: ["this binding", "partial application", "arguments array", "fn reference", "currying"],
      whyAsked: "Tests mastery of JavaScript's dynamic 'this' binding and function composition patterns.",
      sampleAnswer: "call() invokes immediately with listed args; apply() takes args as an array; bind() returns a new function with 'this' permanently bound — ideal for event callbacks."
    },
    {
      question: "How does JavaScript's prototype chain work, and how do ES6 classes map onto it under the hood?",
      difficulty: "intermediate",
      idealHints: ["prototype chain", "__proto__", "Object.create", "constructor", "inheritance", "class syntax sugar"],
      whyAsked: "Distinguishes candidates who understand JavaScript's real object model vs those who only know syntax sugar.",
      sampleAnswer: "Every object has a __proto__ pointing to its prototype. ES6 class syntax is syntactic sugar over prototype-chain delegation; 'extends' sets up the prototype chain."
    },
    {
      question: "What are WeakMap and WeakSet in JavaScript, and when would you choose them over Map and Set?",
      difficulty: "advanced",
      idealHints: ["garbage collection", "memory leak", "weak references", "object keys", "private data"],
      whyAsked: "Tests knowledge of JavaScript memory management and data structure selection for performance-sensitive code.",
      sampleAnswer: "WeakMap/WeakSet hold weak references — if the key object has no other references, it's garbage-collected automatically, preventing memory leaks in caches or DOM maps."
    },
    {
      question: "How would you detect and fix a memory leak in a JavaScript single-page application?",
      difficulty: "advanced",
      idealHints: ["heap snapshot", "devtools memory", "event listeners", "detached DOM", "closure reference", "clearInterval"],
      whyAsked: "Senior SPA engineers must debug memory under real-world long-running sessions.",
      sampleAnswer: "Take heap snapshots before and after suspected operations in DevTools Memory tab. Look for growing retained size — common causes are unremoved event listeners, global arrays, or retained DOM references."
    }
  ],
  typescript: [
    {
      question: "How do Generics and Conditional Types in TypeScript enable type-safe, reusable API response wrappers?",
      difficulty: "intermediate",
      idealHints: ["generics", "conditional types", "type inference", "infer keyword", "union types", "type safety"],
      whyAsked: "Evaluates ability to design robust, scalable type definitions for large applications.",
      sampleAnswer: "Generics allow parameterizing types, while conditional types (T extends U ? X : Y) allow dynamic type resolution based on arguments or return types."
    },
    {
      question: "What is the difference between 'type' and 'interface' in TypeScript, and when would you choose one over the other?",
      difficulty: "basic",
      idealHints: ["interface", "type alias", "declaration merging", "unions", "primitives", "extensibility"],
      whyAsked: "Tests standard TypeScript architecture and best-practice conventions.",
      sampleAnswer: "Interfaces support declaration merging and are ideal for public API surface shapes, whereas type aliases support unions, tuples, and mapped types."
    },
    {
      question: "Explain TypeScript's 'unknown' vs 'any' type, and when should you use each?",
      difficulty: "basic",
      idealHints: ["any", "unknown", "type narrowing", "type guard", "unsafe assignment", "inference"],
      whyAsked: "Tests understanding of TypeScript's type safety guarantees and where they can break down.",
      sampleAnswer: "'any' disables type checking entirely. 'unknown' requires narrowing before use, preserving type safety for external/untrusted data like API responses."
    },
    {
      question: "What are TypeScript decorators, and how are they used in frameworks like Angular or NestJS?",
      difficulty: "advanced",
      idealHints: ["decorator", "class decorator", "metadata", "reflect-metadata", "DI", "nestjs", "experimental"],
      whyAsked: "Relevant for enterprise TypeScript engineers working with decorator-heavy frameworks.",
      sampleAnswer: "Decorators are functions that apply metadata or behavior to classes/methods at definition time, commonly used for DI, routing, and validation in NestJS/Angular."
    },
    {
      question: "How do you use TypeScript's 'as const' and template literal types to model strongly typed configurations?",
      difficulty: "intermediate",
      idealHints: ["as const", "literal type", "template literal", "readonly", "inference", "discriminated union"],
      whyAsked: "Tests advanced TypeScript patterns for config safety and compile-time validation.",
      sampleAnswer: "'as const' infers the narrowest literal type from an object literal. Template literal types like `${Env}-api` create exhaustive type-safe string unions."
    },
    {
      question: "Explain TypeScript's mapped types and how you would build a 'DeepPartial' or 'DeepReadonly' utility type.",
      difficulty: "advanced",
      idealHints: ["mapped type", "keyof", "Partial", "Readonly", "recursive type", "utility types"],
      whyAsked: "Evaluates advanced TypeScript meta-programming ability for library or SDK development.",
      sampleAnswer: "Mapped types iterate over a type's keys with [K in keyof T]. DeepPartial recursively wraps nested objects: type DeepPartial<T> = { [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K] }."
    },
    {
      question: "How does TypeScript's structural (duck) typing differ from nominal typing, and what are the implications?",
      difficulty: "intermediate",
      idealHints: ["structural typing", "duck typing", "nominal", "brand", "shape", "compatibility"],
      whyAsked: "Tests conceptual understanding of TypeScript's type system vs Java/C# nominal typing.",
      sampleAnswer: "TypeScript checks shape compatibility, not identity. Two types with identical shapes are assignable even if named differently — unlike Java where types must explicitly extend each other."
    }
  ],
  python: [
    {
      question: "How does Python's Global Interpreter Lock (GIL) affect multithreaded CPU-bound tasks, and how do you achieve true parallelism?",
      difficulty: "intermediate",
      idealHints: ["gil", "cpython", "multiprocessing", "asyncio", "cpu-bound", "i/o-bound", "concurrency"],
      whyAsked: "Crucial for backend engineers designing high-throughput data or API pipelines.",
      sampleAnswer: "The GIL prevents multiple native threads from executing Python bytecode simultaneously. For CPU-bound work, use multiprocessing or Celery workers."
    },
    {
      question: "Can you explain Python decorators and write a conceptual example of a caching or auth decorator?",
      difficulty: "basic",
      idealHints: ["wrapper", "functools.wraps", "higher-order function", "arguments", "memoization"],
      whyAsked: "Standard Python idiom for cross-cutting concerns like logging, timing, and authentication.",
      sampleAnswer: "A decorator takes a function, wraps it with additional behavior (like cache check or auth validation), and returns the decorated callable."
    },
    {
      question: "Explain Python generators and the 'yield' keyword — how do they differ from returning a list?",
      difficulty: "intermediate",
      idealHints: ["generator", "yield", "lazy evaluation", "memory", "iteration", "send()", "coroutine"],
      whyAsked: "Tests understanding of lazy evaluation and memory-efficient data processing in Python.",
      sampleAnswer: "Generators produce values on demand via yield without materializing the full sequence — crucial for streaming large datasets without OOM errors."
    },
    {
      question: "How does Python manage memory with reference counting and the cyclic garbage collector?",
      difficulty: "advanced",
      idealHints: ["reference counting", "gc module", "cyclic references", "__del__", "weak references", "memory leak"],
      whyAsked: "Tests production-level Python memory management knowledge for long-running services.",
      sampleAnswer: "CPython uses reference counting as the primary mechanism; the gc module handles cyclic references that reference counting alone cannot free."
    },
    {
      question: "What is the difference between @staticmethod and @classmethod in Python?",
      difficulty: "basic",
      idealHints: ["cls", "self", "factory method", "inheritance", "no instance"],
      whyAsked: "Tests clean Python OOP design and understanding of method types.",
      sampleAnswer: "@staticmethod takes no implicit arg and is a plain function in class scope. @classmethod takes cls (the class itself), enabling subclass-aware factory patterns."
    },
    {
      question: "Explain Python's async/await and when you would use asyncio vs threading vs multiprocessing.",
      difficulty: "intermediate",
      idealHints: ["asyncio", "coroutine", "event loop", "io-bound", "cpu-bound", "thread pool executor"],
      whyAsked: "Senior Python engineers must select the right concurrency model for the workload type.",
      sampleAnswer: "asyncio for high-concurrency I/O (web scraping, API calls), threading for I/O-bound with blocking libs, multiprocessing for CPU-bound tasks like number crunching."
    },
    {
      question: "How do context managers and the 'with' statement work in Python, and how would you write a custom one?",
      difficulty: "basic",
      idealHints: ["__enter__", "__exit__", "contextlib", "resource management", "exception handling"],
      whyAsked: "Evaluates resource lifecycle management and Pythonic code patterns.",
      sampleAnswer: "Context managers implement __enter__ and __exit__. contextlib.contextmanager lets you write generator-based context managers without a class."
    }
  ],
  react: [
    {
      question: "How do React 18 Concurrent features (like useTransition, Suspense) prevent UI freezes during heavy state updates?",
      difficulty: "intermediate",
      idealHints: ["concurrent mode", "usetransition", "suspense", "priority lane", "non-blocking", "fiber"],
      whyAsked: "Evaluates modern React rendering optimization and user experience architecture.",
      sampleAnswer: "useTransition marks state updates as non-urgent transitions, allowing React to interrupt rendering for higher-priority user inputs."
    },
    {
      question: "Explain the rules of React hooks and the inner working of the dependency array in useEffect.",
      difficulty: "basic",
      idealHints: ["render order", "call top-level", "object identity", "usecallback", "usememo", "stale closures"],
      whyAsked: "Tests foundational React knowledge and ability to debug stale closures and infinite re-render loops.",
      sampleAnswer: "Hooks rely on stable call order linked to the Fiber tree; omitting dependencies causes stale closures, while unstable object references trigger excess renders."
    },
    {
      question: "How does React's reconciliation algorithm (Fiber) decide what to re-render, and how do you optimize with React.memo?",
      difficulty: "intermediate",
      idealHints: ["reconciliation", "fiber", "virtual dom", "react.memo", "shallow comparison", "key prop"],
      whyAsked: "Evaluates ability to optimize large React applications for render performance.",
      sampleAnswer: "React Fiber performs a diff of the virtual DOM tree. React.memo wraps components to skip re-renders when props are shallowly equal — effective for pure, expensive components."
    },
    {
      question: "What is the difference between controlled and uncontrolled components in React forms?",
      difficulty: "basic",
      idealHints: ["controlled", "uncontrolled", "useRef", "value vs defaultValue", "onChange", "DOM state"],
      whyAsked: "Common interview question evaluating React form architecture patterns.",
      sampleAnswer: "Controlled components store form state in React state; uncontrolled components use refs to read values from the DOM directly. Controlled is preferred for validation."
    },
    {
      question: "How do you handle side effects and data fetching correctly in React — what are the pitfalls of useEffect for async calls?",
      difficulty: "intermediate",
      idealHints: ["useEffect", "cleanup function", "race condition", "abort controller", "react query", "loading state"],
      whyAsked: "Tests real-world experience with async data fetching edge cases like race conditions and stale data.",
      sampleAnswer: "Return a cleanup function with an AbortController to cancel in-flight requests when the component unmounts or dependencies change — prevents race conditions."
    },
    {
      question: "Explain React Context API vs Redux — when is each appropriate?",
      difficulty: "intermediate",
      idealHints: ["context", "redux", "re-render", "subscriber", "middleware", "thunk", "devtools"],
      whyAsked: "Evaluates state management architecture decisions for complex applications.",
      sampleAnswer: "Context is ideal for low-frequency global state (theme, auth). Redux is better for high-frequency updates with complex transformations, middleware, and time-travel debugging."
    },
    {
      question: "What is React Server Components (RSC), and how do they differ from Client Components?",
      difficulty: "advanced",
      idealHints: ["rsc", "server", "no interactivity", "zero bundle", "async", "use client", "streaming"],
      whyAsked: "Tests awareness of modern React architecture patterns used in Next.js 13+ and React 19.",
      sampleAnswer: "RSCs render on the server with no client JS sent, enabling async data access and zero bundle cost. 'use client' marks components needing browser interactivity."
    }
  ],
  docker: [
    {
      question: "How do multi-stage Docker builds reduce image attack surface and final container size for production?",
      difficulty: "intermediate",
      idealHints: ["multi-stage", "layer caching", "base image", "scratch", "distroless", "build artifacts"],
      whyAsked: "DevOps and cloud readiness check to ensure secure, minimal production container deployments.",
      sampleAnswer: "Multi-stage builds separate the compile environment from runtime, copying only final binaries/assets into a minimal distroless or alpine base image."
    },
    {
      question: "Explain Docker networking modes (bridge, host, overlay) and how containers communicate in a Docker Compose environment.",
      difficulty: "basic",
      idealHints: ["bridge", "host", "overlay", "dns resolution", "compose network", "ports"],
      whyAsked: "Tests container communication and local microservices debugging competence.",
      sampleAnswer: "Docker Compose creates a shared user-defined bridge network where containers resolve each other by service name via built-in DNS."
    },
    {
      question: "How does Docker layer caching work, and how should a Dockerfile be ordered to maximize cache hit rates?",
      difficulty: "basic",
      idealHints: ["layer caching", "cache invalidation", "package.json copy before src", "run apt-get update && apt-get install", "order of operations"],
      whyAsked: "Tests practical CI/CD build efficiency and Dockerfile optimization best practices.",
      sampleAnswer: "Each Dockerfile instruction creates a layer. If a layer changes, all subsequent layers must rebuild. Place rarely changing layers (installing OS packages, copying package.json) before frequently changing application source code."
    },
    {
      question: "What is the difference between ENTRYPOINT and CMD in a Dockerfile, and how do they interact?",
      difficulty: "basic",
      idealHints: ["entrypoint", "cmd", "exec form", "shell form", "default arguments", "overriding"],
      whyAsked: "Standard Docker packaging question to evaluate understanding of container execution semantics.",
      sampleAnswer: "ENTRYPOINT defines the executable to run; CMD defines default arguments that can be easily overridden at runtime. In exec form ['node', 'server.js'], CMD passes default parameters to ENTRYPOINT."
    },
    {
      question: "How do you run containers securely without root privileges (rootless containers, USER directive)?",
      difficulty: "intermediate",
      idealHints: ["user directive", "rootless", "least privilege", "capabilities", "chown", "security context"],
      whyAsked: "Evaluates container security hardening standards for production enterprise environments.",
      sampleAnswer: "Create a dedicated unprivileged user and group inside the Dockerfile with the USER directive, ensure proper ownership of working directories, and drop unnecessary Linux capabilities (cap-drop=ALL)."
    },
    {
      question: "Explain Docker volumes vs bind mounts vs tmpfs mounts and their respective performance trade-offs.",
      difficulty: "intermediate",
      idealHints: ["named volumes", "bind mount", "tmpfs", "host filesystem", "data persistence", "io performance"],
      whyAsked: "Tests understanding of persistent storage architectures and container filesystem boundaries.",
      sampleAnswer: "Named volumes are managed by Docker in /var/lib/docker/volumes with best portability and isolation. Bind mounts map exact host paths directly (ideal for local dev). tmpfs mounts in host memory only for ephemeral sensitive data."
    },
    {
      question: "What are Docker build arguments (ARG) vs environment variables (ENV), and why shouldn't ARG be used for secrets?",
      difficulty: "advanced",
      idealHints: ["arg", "env", "build time vs runtime", "docker history", "secrets leak", "buildkit secret mount"],
      whyAsked: "Evaluates awareness of critical security vulnerabilities in container CI/CD build pipelines.",
      sampleAnswer: "ARG is available only during build time, while ENV persists in the running container image. However, ARG values are baked into image layer metadata and visible via 'docker history'. Use BuildKit secret mounts (--mount=type=secret) for safe credential injection."
    }
  ],
  kubernetes: [
    {
      question: "What is the difference between Kubernetes Liveness, Readiness, and Startup probes, and what happens if a Readiness probe fails?",
      difficulty: "intermediate",
      idealHints: ["liveness", "readiness", "startup", "traffic routing", "pod restart", "service endpoints"],
      whyAsked: "Essential for microservice resilience and zero-downtime rolling deployments.",
      sampleAnswer: "A failing readiness probe removes the Pod from Service endpoints so it stops receiving traffic, whereas a failing liveness probe triggers container restart."
    },
    {
      question: "Describe Kubernetes Deployments, ReplicaSets, and Pods, and how a rolling update rollout works.",
      difficulty: "basic",
      idealHints: ["deployment", "replicaset", "pod", "rolling update", "maxunavailable", "maxsurge"],
      whyAsked: "Checks fundamental cluster architecture and deployment lifecycle management.",
      sampleAnswer: "A Deployment manages ReplicaSets, which maintain the desired count of Pods. Rolling updates incrementally create a new ReplicaSet while draining the old."
    }
  ],
  node: [
    {
      question: "How does Node.js process I/O asynchronously via Libuv thread pool vs the main event loop?",
      difficulty: "intermediate",
      idealHints: ["libuv", "thread pool", "event loop", "non-blocking", "fs operations", "uv_threadpool_size"],
      whyAsked: "Determines if the candidate understands Node.js throughput bottlenecks and CPU vs I/O trade-offs.",
      sampleAnswer: "Network I/O uses OS epoll/kqueue on the main thread, while file system, DNS, and crypto operations offload to Libuv's thread pool."
    },
    {
      question: "How do you prevent unhandled promise rejections and manage memory leaks in a long-running Node.js service?",
      difficulty: "basic",
      idealHints: ["unhandledrejection", "process.on", "event emitters", "heap dump", "gc", "graceful shutdown"],
      whyAsked: "Standard backend reliability and production operational hygiene question.",
      sampleAnswer: "Catch all async errors, listen to unhandledRejection/uncaughtException, and profile heap snapshots to detect detached listeners or global caches."
    },
    {
      question: "Explain Node.js Streams, pipe, and how backpressure is handled when writing fast producers to slow consumers.",
      difficulty: "intermediate",
      idealHints: ["streams", "readable", "writable", "transform", "backpressure", "highWaterMark", "drain event"],
      whyAsked: "Tests capability to handle large files and HTTP payloads without consuming excessive memory.",
      sampleAnswer: "Streams process data in chunks. When a consumer's internal buffer hits highWaterMark, stream.write() returns false; the producer must pause until the consumer emits the 'drain' event. stream.pipeline() handles this automatically."
    },
    {
      question: "What is the difference between worker_threads, cluster module, and child_process in Node.js?",
      difficulty: "intermediate",
      idealHints: ["worker_threads", "cluster", "child_process", "shared memory", "ipc", "cpu-bound"],
      whyAsked: "Evaluates concurrency architecture decisions for scaling Node.js applications.",
      sampleAnswer: "Cluster forks multiple independent Node processes sharing a server port. child_process runs external system commands or scripts. worker_threads run JavaScript threads sharing memory (ArrayBuffers), ideal for CPU-heavy tasks."
    },
    {
      question: "How does Node.js module resolution differ between CommonJS (require) and ES Modules (import)?",
      difficulty: "basic",
      idealHints: ["commonjs", "esm", "require", "import", "synchronous vs asynchronous", "top-level await", "tree shaking"],
      whyAsked: "Standard module system question essential for modern Node.js codebase migration and packaging.",
      sampleAnswer: "CommonJS is synchronous and resolves at runtime with dynamic require(). ESM is static, asynchronous, evaluated before execution, supports tree-shaking and top-level await, and requires file extensions in modern Node."
    },
    {
      question: "How do you implement graceful shutdown in a Node.js microservice handling active HTTP connections?",
      difficulty: "advanced",
      idealHints: ["sigterm", "sigint", "server.close", "keep-alive", "drain connections", "process.exit", "readiness probe"],
      whyAsked: "Critical for zero-downtime rolling deploys in Kubernetes and container environments.",
      sampleAnswer: "Listen for SIGTERM/SIGINT, stop accepting new connections with server.close(), set readiness probes to unhealthy, wait for in-flight requests to complete with a timeout safeguard, then close database pools and exit."
    },
    {
      question: "How do you diagnose and fix a CPU spike or Event Loop lag in a production Node.js application?",
      difficulty: "advanced",
      idealHints: ["event loop lag", "perf_hooks", "clinic.js", "v8 profiler", "blocked thread", "json.parse", "sync regex"],
      whyAsked: "Assesses senior-level production troubleshooting and performance engineering skills.",
      sampleAnswer: "Use perf_hooks monitorEventLoopDelay to detect lag, generate CPU profiles with v8-profiler or clinic flame, and inspect for blocking synchronous operations like massive JSON.parse, catastrophic regex backtracking, or cryptographic hashing on the main thread."
    }
  ],
  aws: [
    {
      question: "How would you architect a highly available, fault-tolerant web service on AWS across multiple Availability Zones?",
      difficulty: "intermediate",
      idealHints: ["alb", "auto scaling", "multi-az", "rds aurora", "s3", "cloudfront", "route 53"],
      whyAsked: "Evaluates cloud architecture and disaster recovery readiness.",
      sampleAnswer: "Distribute stateless instances across multiple AZs behind an ALB with Auto Scaling, using multi-AZ RDS or DynamoDB for data persistence."
    },
    {
      question: "Explain IAM policies, roles, and the principle of least privilege in securing AWS infrastructure.",
      difficulty: "basic",
      idealHints: ["iam role", "least privilege", "assume role", "temporary credentials", "sts", "policy arn"],
      whyAsked: "Validates cloud security baseline knowledge.",
      sampleAnswer: "Grant only the minimal necessary actions and resource ARNs via IAM roles rather than hardcoding static access keys."
    }
  ],
  sql: [
    {
      question: "How do B-Tree indexes work in relational databases, and what queries cause index scans vs full table scans?",
      difficulty: "intermediate",
      idealHints: ["b-tree", "composite index", "leftmost prefix", "cardinality", "explain analyze", "table scan"],
      whyAsked: "Evaluates SQL performance tuning and database indexing fundamentals.",
      sampleAnswer: "B-Trees allow O(log N) lookups; using leading wildcards (LIKE '%abc') or functions on indexed columns forces full table scans."
    },
    {
      question: "Explain database ACID properties and the difference between READ COMMITTED and SERIALIZABLE isolation levels.",
      difficulty: "basic",
      idealHints: ["atomicity", "consistency", "isolation", "durability", "dirty read", "phantom read"],
      whyAsked: "Core relational database transaction integrity concept.",
      sampleAnswer: "ACID ensures reliable transactions. READ COMMITTED prevents dirty reads, whereas SERIALIZABLE prevents phantom reads by locking or MVCC serialization."
    },
    {
      question: "Explain the difference between ROW_NUMBER(), RANK(), and DENSE_RANK() in SQL window functions.",
      difficulty: "intermediate",
      idealHints: ["window functions", "partition by", "order by", "rank ties", "dense_rank no gaps", "row_number unique"],
      whyAsked: "Tests practical mastery of analytical window functions used heavily in reporting and deduplication queries.",
      sampleAnswer: "ROW_NUMBER assigns distinct consecutive integers. RANK gives identical values the same rank and skips following ranks (1, 2, 2, 4). DENSE_RANK assigns identical values the same rank without gaps (1, 2, 2, 3)."
    },
    {
      question: "How do Common Table Expressions (CTEs) and recursive CTEs work, and when are they preferred over subqueries?",
      difficulty: "intermediate",
      idealHints: ["cte", "with clause", "recursive cte", "hierarchical data", "anchor member", "readability", "materialization"],
      whyAsked: "Evaluates ability to query complex graphs, organizational charts, and maintain clean SQL structure.",
      sampleAnswer: "CTEs use 'WITH' to create readable named result sets. Recursive CTEs use an anchor query UNION ALL a recursive step, ideal for traversing hierarchical data like category trees or management hierarchies."
    },
    {
      question: "Explain database normalization (1NF through 3NF/BCNF) and when deliberate denormalization is warranted.",
      difficulty: "basic",
      idealHints: ["1nf atomic", "2nf full dependency", "3nf transitive dependency", "denormalization", "oltp vs olap", "read performance"],
      whyAsked: "Core relational schema architecture principle every backend developer must master.",
      sampleAnswer: "1NF requires atomic values; 2NF removes partial key dependencies; 3NF eliminates transitive dependencies. Deliberate denormalization is used in read-heavy or analytics systems to eliminate costly multi-table joins."
    },
    {
      question: "What causes deadlocks in relational databases, and what architectural strategies prevent them?",
      difficulty: "advanced",
      idealHints: ["deadlock", "lock ordering", "transaction isolation", "lock escalation", "deadlock detection", "retry logic"],
      whyAsked: "Assesses production-level transaction design under high concurrent write loads.",
      sampleAnswer: "Deadlocks happen when two transactions hold locks the other needs in reverse order. Prevent them by enforcing consistent lock acquisition order across services, keeping transactions short, and using optimistic locking."
    },
    {
      question: "How do database query planners choose between Nested Loop, Hash Join, and Merge Join?",
      difficulty: "advanced",
      idealHints: ["nested loop", "hash join", "merge join", "cardinality", "sorting cost", "explain plan"],
      whyAsked: "Tests deep query optimization and understanding of internal database execution engines.",
      sampleAnswer: "Nested Loop is chosen when one side is small and the other indexed. Hash Join builds an in-memory hash table for unsorted large sets. Merge Join is used when both input sets are already sorted on the join key."
    }
  ],
  postgresql: [
    {
      question: "How does PostgreSQL MVCC (Multi-Version Concurrency Control) work, and why is VACUUM necessary?",
      difficulty: "intermediate",
      idealHints: ["mvcc", "xmin", "xmax", "dead tuples", "vacuum", "autovacuum", "table bloat"],
      whyAsked: "Differentiates basic SQL writers from senior PostgreSQL engineers.",
      sampleAnswer: "Postgres updates create new row versions (tuples). Dead tuples remain until autovacuum reclaims space for new writes."
    },
    {
      question: "When would you choose JSONB columns in PostgreSQL over standard normalized relational tables?",
      difficulty: "basic",
      idealHints: ["jsonb", "gin index", "schema flexibility", "normalization", "query performance"],
      whyAsked: "Tests pragmatic schema design decisions and modern Postgres capabilities.",
      sampleAnswer: "JSONB is great for dynamic attributes or third-party payloads, indexable via GIN, but core relational entities should remain normalized."
    }
  ],
  mongodb: [
    {
      question: "How do replica sets and write concerns (e.g. w: 'majority', j: true) guarantee data durability in MongoDB?",
      difficulty: "intermediate",
      idealHints: ["replica set", "write concern", "majority", "journaling", "election", "failover"],
      whyAsked: "Tests understanding of distributed document database consistency guarantees.",
      sampleAnswer: "Write concern 'majority' ensures data is committed to more than half of the replica set members before acknowledging the client."
    },
    {
      question: "Explain MongoDB aggregation pipelines and give an example of using $match, $group, and $lookup.",
      difficulty: "basic",
      idealHints: ["aggregation pipeline", "$match", "$group", "$lookup", "indexing", "stages"],
      whyAsked: "Evaluates query structuring and data transformation inside MongoDB.",
      sampleAnswer: "Pipelines process documents through multistage transformations: $match filters early, $group aggregates, and $lookup joins related collections."
    }
  ],
  redis: [
    {
      question: "How do you design a distributed lock in Redis (Redlock algorithm), and what failure modes must you handle?",
      difficulty: "advanced",
      idealHints: ["distributed lock", "redlock", "set nx px", "clock drift", "lease expiration", "ttl"],
      whyAsked: "Tests distributed systems concurrency and cache-as-coordination design.",
      sampleAnswer: "Use SET key uuid NX PX ttl. Ensure release scripts check UUID equality via Lua script so locks aren't released prematurely after timeouts."
    },
    {
      question: "What are the common eviction policies in Redis (volatile-lru, allkeys-lru), and how do you handle cache stampedes?",
      difficulty: "basic",
      idealHints: ["eviction policy", "lru", "cache stampede", "ttl jitter", "mutex", "read-through"],
      whyAsked: "Tests production caching architectures and outage prevention.",
      sampleAnswer: "Allkeys-LRU evicts least recently used keys when memory fills. Mitigate cache stampedes with probabilistic early expiration or mutex locks."
    }
  ],
  graphql: [
    {
      question: "How do you solve the N+1 query problem in GraphQL servers using DataLoader?",
      difficulty: "intermediate",
      idealHints: ["n+1 problem", "dataloader", "batching", "caching", "resolvers", "sql join"],
      whyAsked: "Essential GraphQL backend performance question.",
      sampleAnswer: "DataLoader batches individual fetch requests that happen within a single tick of the event loop into a single bulk query."
    },
    {
      question: "What are the trade-offs of GraphQL compared to REST APIs regarding caching, over-fetching, and complexity?",
      difficulty: "basic",
      idealHints: ["over-fetching", "under-fetching", "http caching", "schema", "schema stitching", "client control"],
      whyAsked: "Checks architectural judgement when picking API protocols.",
      sampleAnswer: "GraphQL eliminates over/under-fetching with typed schemas, but loses standard HTTP response caching and introduces resolver query complexity."
    }
  ],
  golang: [
    {
      question: "How do Go goroutines, channels, and the select statement work together to build non-blocking worker pools?",
      difficulty: "intermediate",
      idealHints: ["goroutine", "channels", "select", "worker pool", "buffered channel", "sync.waitgroup"],
      whyAsked: "Evaluates mastery of Go's core concurrency primitives.",
      sampleAnswer: "Worker pools consume jobs from a buffered channel via worker goroutines, using sync.WaitGroup to coordinate completion and select for timeouts/cancellations."
    },
    {
      question: "Explain the difference between value receivers and pointer receivers on Go structs and when to use each.",
      difficulty: "basic",
      idealHints: ["pointer receiver", "value receiver", "mutation", "copy overhead", "interface implementation"],
      whyAsked: "Fundamental Go type and memory semantics.",
      sampleAnswer: "Use pointer receivers if methods need to mutate struct fields or the struct is large to avoid copy overhead; otherwise value receivers are thread-safe copies."
    }
  ],
  java: [
    {
      question: "How does the JVM garbage collector (G1GC or ZGC) balance throughput versus stop-the-world pause times?",
      difficulty: "intermediate",
      idealHints: ["jvm", "g1gc", "zgc", "stop-the-world", "eden space", "young generation", "tenured"],
      whyAsked: "Tests production JVM performance tuning and memory management knowledge.",
      sampleAnswer: "G1GC divides memory into regions to collect high-garbage regions first within target pause bounds; ZGC performs concurrent compaction for sub-millisecond pauses."
    },
    {
      question: "Explain the difference between HashMap and ConcurrentHashMap in Java multithreaded environments.",
      difficulty: "basic",
      idealHints: ["concurrenthashmap", "hashmap", "thread safety", "bucket locking", "cas operations", "reentrantlock"],
      whyAsked: "Classic Java concurrency and collection framework question.",
      sampleAnswer: "HashMap is not thread-safe; ConcurrentHashMap uses node-level synchronized blocks and CAS operations for concurrent reads and writes without full table locks."
    }
  ],
  cicd: [
    {
      question: "How do you design a zero-downtime CI/CD deployment pipeline with automated canary analysis and rollback triggers?",
      difficulty: "intermediate",
      idealHints: ["canary", "blue-green", "automated rollback", "smoke test", "prometheus metrics", "pipeline stages"],
      whyAsked: "Evaluates automated deployment safety and continuous delivery maturity.",
      sampleAnswer: "Deploy the new build to a 5% canary tier, monitor error rates and latency against baseline for 10 minutes, and trigger automated rollback if thresholds breach."
    },
    {
      question: "What strategies do you use to secure secrets and sensitive credentials in GitHub Actions or GitLab CI pipelines?",
      difficulty: "basic",
      idealHints: ["oidc", "masked secrets", "vault", "least privilege", "runner isolation", "environment secrets"],
      whyAsked: "Evaluates DevSecOps best practices for pipeline security.",
      sampleAnswer: "Use OIDC short-lived credentials with cloud providers instead of long-lived static tokens, and protect environments with branch rules."
    }
  ],
  system_design: [
    {
      question: "How would you design a distributed rate limiter that handles 100,000 requests per second across multiple data centers?",
      difficulty: "advanced",
      idealHints: ["token bucket", "leaky bucket", "redis", "sliding window", "eventual consistency", "latency"],
      whyAsked: "Core senior engineering architecture and distributed systems screening question.",
      sampleAnswer: "Use a sliding window counter or token bucket algorithm with Redis clusters, local in-memory batching, and eventual consistency between regions."
    },
    {
      question: "Explain horizontal scaling vs vertical scaling and how to eliminate single points of failure in web applications.",
      difficulty: "basic",
      idealHints: ["horizontal scaling", "load balancing", "statelessness", "failover", "spof", "redundancy"],
      whyAsked: "Foundational system architecture question.",
      sampleAnswer: "Vertical scaling increases hardware capacity; horizontal scaling adds nodes. Eliminate SPOF by making app servers stateless and adding database replicas with auto-failover."
    }
  ],
  kafka: [
    {
      question: "How do Kafka consumer groups, partition assignments, and consumer rebalances impact message processing order and throughput?",
      difficulty: "intermediate",
      idealHints: ["consumer group", "partitions", "rebalance", "partition key", "ordering guarantee", "offset commit"],
      whyAsked: "Evaluates streaming architecture and distributed messaging expertise.",
      sampleAnswer: "Kafka guarantees message order only within a single partition. Increasing partitions increases concurrency, but triggers rebalances when consumers join or leave."
    },
    {
      question: "What is the difference between at-least-once, at-most-once, and exactly-once delivery semantics in Kafka?",
      difficulty: "basic",
      idealHints: ["exactly-once", "at-least-once", "at-most-once", "idempotent producer", "transactions", "ack"],
      whyAsked: "Crucial for event-driven reliability and payment/financial messaging.",
      sampleAnswer: "At-least-once commits offsets after processing (may duplicate); at-most-once commits before (may drop); exactly-once uses idempotent producers and 2-phase transactions."
    }
  ],
  nextjs: [
    {
      question: "Explain the difference between Server Components and Client Components in Next.js App Router and how data flows between them.",
      difficulty: "intermediate",
      idealHints: ["server components", "client components", "use client", "bundle size", "hydration", "streaming"],
      whyAsked: "Tests mastery of modern React Server Components architecture in production Next.js apps.",
      sampleAnswer: "Server Components execute only on the server with zero client bundle impact; Client Components hydrate on the browser and handle interactivity via 'use client'."
    },
    {
      question: "How does Incremental Static Regeneration (ISR) work in Next.js, and how does it compare to SSR?",
      difficulty: "basic",
      idealHints: ["isr", "revalidate", "stale-while-revalidate", "ssr", "static generation", "cache"],
      whyAsked: "Evaluates web rendering performance strategies for content-heavy applications.",
      sampleAnswer: "ISR serves cached static pages while revalidating them in the background on incoming requests after a revalidation period."
    }
  ],
  tailwind: [
    {
      question: "How does Tailwind CSS work at build-time using PurgeCSS / JIT mode, and how do you handle dynamic class names safely?",
      difficulty: "basic",
      idealHints: ["jit engine", "purgecss", "safelist", "dynamic classes", "utility-first", "bundle size"],
      whyAsked: "Tests understanding of modern CSS tooling and preventing stripped CSS classes in production.",
      sampleAnswer: "Tailwind's JIT scans raw files for exact string tokens. Constructing classes dynamically (e.g. `bg-${color}-500`) breaks scanner detection; use complete class lookups or safelists."
    }
  ],
  rust: [
    {
      question: "How does Rust achieve memory safety without a garbage collector through its ownership and borrowing system?",
      difficulty: "intermediate",
      idealHints: ["ownership", "borrow checker", "lifetimes", "raii", "mutable reference", "aliasing"],
      whyAsked: "Core Rust question evaluating understanding of compiler guarantees.",
      sampleAnswer: "Rust assigns every value a unique owner. The borrow checker enforces either multiple immutable references (&T) or exactly one mutable reference (&mut T) at compile time."
    }
  ],
  csharp: [
    {
      question: "Explain async/await in C# and how the SynchronizationContext interacts with Task.ConfigureAwait(false).",
      difficulty: "intermediate",
      idealHints: ["async await", "task", "configureawait", "synchronizationcontext", "deadlock", "thread pool"],
      whyAsked: "Critical for high-performance .NET web APIs and avoiding UI/thread deadlocks.",
      sampleAnswer: "ConfigureAwait(false) allows resumed execution to run on any available thread pool thread rather than capturing and returning to the original SynchronizationContext."
    }
  ]
};

/**
 * Normalizes skill strings to key tokens for dictionary lookup.
 * E.g. "React.js" -> "react", "NodeJS" -> "node", "PostgreSQL / Postgres" -> "postgresql"
 */
export function normalizeSkillToken(skill) {
  if (!skill || typeof skill !== 'string') return '';
  const s = skill.toLowerCase().trim();
  if (s.includes('react') && !s.includes('native')) return 'react';
  if (s.includes('node')) return 'node';
  if (s.includes('typescript') || s === 'ts') return 'typescript';
  if (s.includes('javascript') || s === 'js') return 'javascript';
  if (s.includes('python') || s.includes('django') || s.includes('fastapi')) return 'python';
  if (s.includes('kube') || s === 'k8s') return 'kubernetes';
  if (s.includes('docker') || s.includes('container')) return 'docker';
  if (s.includes('postgres') || s.includes('psql')) return 'postgresql';
  if (s.includes('mongo')) return 'mongodb';
  if (s.includes('redis')) return 'redis';
  if (s.includes('graphql')) return 'graphql';
  if (s.includes('next')) return 'nextjs';
  if (s.includes('tailwind')) return 'tailwind';
  if (s.includes('aws') || s.includes('amazon')) return 'aws';
  if (s.includes('kafka')) return 'kafka';
  if (s.includes('system design') || s.includes('architecture')) return 'system_design';
  if (s.includes('ci/cd') || s.includes('cicd') || s.includes('devops') || s.includes('pipeline')) return 'cicd';
  if (s.includes('golang') || s === 'go') return 'golang';
  if (s.includes('c#') || s.includes('.net') || s.includes('dotnet')) return 'csharp';
  if (s.includes('rust')) return 'rust';
  if (s.includes('java') && !s.includes('script')) return 'java';
  if (s.includes('sql')) return 'sql';
  return s.replace(/[^a-z0-9]/g, '');
}

/**
 * Generates structured technical screening questions for missing skill gaps.
 * Uses curated map where available, falling back to dynamic context questions.
 * @param {string[]} gaps - Array of missing skill gap strings (from ATS X-Ray)
 * @param {string} [targetRole='Software Engineer'] - Target job role
 * @returns {Array} Structured question objects
 */
export function buildFallbackSkillGapQuestions(gaps = [], targetRole = 'Software Engineer') {
  if (!Array.isArray(gaps) || gaps.length === 0) {
    // Return standard foundational screening questions if no gaps are supplied
    return [
      {
        id: 'gap_q_default_1',
        skill: 'Architecture & Design',
        category: 'technical_screening',
        question: `In your work as a ${targetRole}, how do you evaluate technical trade-offs between delivery velocity and code maintainability?`,
        difficulty: 'intermediate',
        idealHints: ['trade-offs', 'tech debt', 'maintainability', 'scalability', 'automated testing'],
        whyAsked: 'Core technical leadership question for engineering roles.',
        sampleAnswer: 'Structure code modularly with comprehensive unit tests so short-term implementations can be refactored safely without regressions.'
      },
      {
        id: 'gap_q_default_2',
        skill: 'Production Debugging',
        category: 'technical_screening',
        question: 'Walk me through how you isolate and diagnose a high-latency issue or intermittent 500 error in production.',
        difficulty: 'intermediate',
        idealHints: ['logs', 'metrics', 'tracing', 'apm', 'reproduction', 'root cause analysis'],
        whyAsked: 'Tests practical operational reliability and debugging methodology.',
        sampleAnswer: 'Check APM latency traces, inspect distributed request IDs across services, verify database connection pools, and reproduce under isolated load.'
      }
    ];
  }

  const results = [];
  const seenIds = new Set();

  gaps.forEach((gap, idx) => {
    const token = normalizeSkillToken(gap);
    const curatedList = SKILL_QUESTION_MAP[token];

    if (curatedList && curatedList.length > 0) {
      curatedList.forEach((item, qIdx) => {
        const id = `gap_q_${token}_${qIdx}`;
        if (!seenIds.has(id)) {
          seenIds.add(id);
          results.push({
            id,
            skill: gap,
            category: 'technical_screening',
            question: item.question,
            difficulty: item.difficulty || 'intermediate',
            idealHints: item.idealHints || [],
            whyAsked: item.whyAsked || `${gap} was flagged as a missing skill in ATS X-Ray.`,
            sampleAnswer: item.sampleAnswer || ''
          });
        }
      });
    } else {
      // Dynamic fallback for custom/niche skills
      const id = `gap_q_dynamic_${idx}`;
      if (!seenIds.has(id)) {
        seenIds.add(id);
        results.push({
          id,
          skill: gap,
          category: 'technical_screening',
          question: `Can you explain your experience with ${gap} and how you would architect solutions with it in a ${targetRole || 'production'} environment?`,
          difficulty: 'intermediate',
          idealHints: [gap.toLowerCase(), 'architecture', 'best practices', 'trade-offs', 'production'],
          whyAsked: `${gap} was identified as an ATS missing skill gap for ${targetRole}.`,
          sampleAnswer: `Explain how you leveraged ${gap} in past projects, outlining the architectural trade-offs, performance considerations, and how you ensured stability.`
        });
      }
    }
  });

  return results;
}

/**
 * Builds a prompt for WebGPU / Local LLM to generate targeted technical screening questions.
 * @param {string[]} gaps - Array of missing skills
 * @param {string} targetRole - Job role
 * @returns {string} Prompt text
 */
export function buildTechScreeningPrompt(gaps = [], targetRole = 'Software Engineer') {
  const gapList = Array.isArray(gaps) && gaps.length > 0 ? gaps.join(', ') : 'core engineering skills';
  return `You are an expert technical interviewer screening a candidate for the role of "${targetRole}".
The candidate's ATS resume scan revealed missing skill gaps in: ${gapList}.

Generate 3 to 5 realistic, deep technical screening questions that directly probe the candidate's practical mastery of these specific gap areas.
Return ONLY valid JSON matching this exact structure:
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
{
  "questions": [
    {
      "skill": "Skill Name",
      "question": "The realistic technical interview question",
      "difficulty": "intermediate",
      "idealHints": ["key concept 1", "key concept 2", "key concept 3"],
      "whyAsked": "Why this question tests the specific ATS gap"
    }
  ]
}`;
}

/**
 * Scores a user's answer against ideal hints deterministically ($0 cost, 100% private).
 * @param {string} answer - Spoken or typed response
 * @param {string[]} idealHints - List of expected technical keywords/concepts
 * @returns {Object} Score, matched hints, missing hints, and actionable feedback
 */
export function scoreSkillAnswer(answer = '', idealHints = []) {
  const cleanAnswer = (typeof answer === 'string' ? answer : '').trim().toLowerCase();
  
  if (!cleanAnswer || cleanAnswer.length < 15) {
    return {
      score: 10,
      matchedHints: [],
      missingHints: idealHints,
      feedback: 'Answer is too brief to evaluate. Elaborate on your technical approach, underlying architecture, and real-world implementation.'
    };
  }

  if (!Array.isArray(idealHints) || idealHints.length === 0) {
    // Length-based heuristic fallback
    const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
    const score = Math.min(90, Math.max(30, Math.round(wordCount * 1.5)));
    return {
      score,
      matchedHints: [],
      missingHints: [],
      feedback: wordCount > 50 
        ? 'Solid response length. To make it stronger, highlight specific architectural trade-offs and production metrics.'
        : 'Good start. Expand on how you handle edge cases and performance trade-offs.'
    };
  }

  const matched = [];
  const missing = [];

  idealHints.forEach(hint => {
    const h = hint.toLowerCase().trim();
    if (!h) return;
    // Check if the answer contains the keyword or phrase
    if (cleanAnswer.includes(h)) {
      matched.push(hint);
    } else {
      // Check partial tokens for multi-word hints
      const tokens = h.split(/\s+/).filter(t => t.length > 3);
      if (tokens.length > 1 && tokens.some(t => cleanAnswer.includes(t))) {
        matched.push(hint);
      } else {
        missing.push(hint);
      }
    }
  });

  const matchRatio = matched.length / idealHints.length;
  const wordCount = cleanAnswer.split(/\s+/).filter(Boolean).length;
  // Combine keyword coverage (70%) with detail length (30%)
  const lengthScore = Math.min(100, (wordCount / 60) * 100);
  const keywordScore = matchRatio * 100;
  const score = Math.round(keywordScore * 0.7 + lengthScore * 0.3);

  let feedback = '';
  if (score >= 80) {
    feedback = `Exceptional technical depth! You covered key concepts: ${matched.slice(0, 3).join(', ')}.`;
  } else if (score >= 50) {
    feedback = `Good technical coverage. You addressed ${matched.length} of ${idealHints.length} key concepts. Consider mentioning: ${missing.slice(0, 2).join(', ')}.`;
  } else {
    feedback = `Technical coverage could be stronger. To convince interviewers, explicitly explain: ${missing.slice(0, 3).join(', ')}.`;
  }

  // ── L6 Staff Engineer Brutal & Actionable Critique ──
  const critiquePoints = [];

  // 1. Passive Voice Detection
  const passivePhrases = [
    'was responsible for', 'helped with', 'assisted in', 'worked on',
    'was involved in', 'tried to', 'did some', 'helped to', 'contributed to'
  ];
  const detectedPassive = passivePhrases.find(p => cleanAnswer.includes(p));
  if (detectedPassive) {
    critiquePoints.push(`Passive voice detected: Replace "${detectedPassive}" with decisive ownership verbs ("Architected", "Engineered", "Optimized", "Spearheaded").`);
  }

  // 2. Scale & Metric Detection
  const hasMetric = /(\d+(?:\.\d+)?%|\b\d+x\b|\b\d+\s*(?:ms|s|sec|min|hours|days|qps|rps|req\/s|users|events|records|nodes|instances|gb|mb|tb)\b|\$\d+[\d,]*)/i.test(cleanAnswer);
  if (!hasMetric && wordCount > 25) {
    critiquePoints.push('Lacks production scale metrics: Mention throughput, p99 latency, user volume, or percent improvements to anchor real-world credibility.');
  }

  // 3. Synthesize Concrete L6 Staff Model Phrasing
  const primaryConcept = matched[0] || idealHints[0] || 'the core architecture';
  const missingContext = missing.length > 0 ? missing.slice(0, 2).join(' and ') : 'fail-safe rollback guarantees';
  const l6ModelAnswer = `In our production environment, we addressed ${primaryConcept} by engineering a decoupled pipeline leveraging ${matched.slice(0, 2).join(' and ') || 'targeted primitives'} alongside ${missingContext}. This reduced tail p99 latency from 340ms to 42ms and sustained 25,000 QPS under peak traffic with zero dropped transactions.`;

  if (critiquePoints.length > 0) {
    feedback += ` | L6 Staff Critique: ${critiquePoints.join(' ')}`;
  }

  return {
    score: Math.min(100, Math.max(15, score)),
    matchedHints: matched,
    missingHints: missing,
    feedback,
    l6Critique: {
      hasPassiveVoice: Boolean(detectedPassive),
      hasMetric,
      critiquePoints,
      l6ModelAnswer
    }
  };
}
