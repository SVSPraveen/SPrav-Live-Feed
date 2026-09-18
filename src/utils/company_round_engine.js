/**
 * company_round_engine.js
 * =======================
 * Global Interview Round Expectations & Hiring Intelligence Engine.
 * 
 * Delivers curated, multi-stage hiring loop intelligence for 50+ global
 * enterprises, Indian IT giants, Indian product unicorns, European/APAC
 * leaders, and fintech institutions — backed by an intelligent archetype
 * inference engine for unlisted companies worldwide.
 */

// ─── Company Categories & Taxonomy ──────────────────────────────────────────
export const COMPANY_CATEGORIES = {
  all: { id: 'all', label: 'All Companies' },
  global_faang: { id: 'global_faang', label: 'Global FAANG & Big Tech', region: 'Global' },
  india_unicorns: { id: 'india_unicorns', label: 'Indian Unicorns & SaaS', region: 'India' },
  india_giants: { id: 'india_giants', label: 'Indian IT Giants (SIs)', region: 'India' },
  europe_apac: { id: 'europe_apac', label: 'Europe & APAC Tech', region: 'Global' },
  fintech_quant: { id: 'fintech_quant', label: 'FinTech & Quant', region: 'Global' }
};

// ─── Standard Architectural Interview Archetypes (Universal Fallbacks) ────────
export const COMPANY_ARCHETYPES = {
  enterprise_si_consulting: {
    id: 'enterprise_si_consulting',
    label: 'Enterprise System Integrator & IT Consulting',
    ats: 'TCS iON / Internal Portal / Workday',
    typicalTimeline: '3–6 weeks',
    description: 'Structured multi-tier process emphasizing analytical aptitude, core computer science fundamentals, OOP principles, and client readiness.',
    rounds: [
      { 
        name: 'Online Aptitude & Cognitive Assessment (NQT/OA)', 
        desc: '60–90 min: Quantitative aptitude, logical reasoning, verbal ability, and pseudo-code/programming logic.',
        prepTip: 'Practice speed math, data interpretation, and syntax tracing in C/C++/Java/Python.'
      },
      { 
        name: 'Core Technical Assessment (DSA & CS Fundamentals)', 
        desc: '45–60 min: Data structures (Arrays, Strings, Linked Lists), OOPs, SQL queries, DBMS, and OS basics.',
        prepTip: 'Review ACID properties, normalization, indexing, memory management, and OOP pillars (polymorphism, encapsulation).'
      },
      { 
        name: 'Technical Deep Dive & Project Defense', 
        desc: '45 min: Line-by-line inspection of candidate resume projects, architecture decisions, and edge-case handling.',
        prepTip: 'Be prepared to draw your project component diagrams and explain why you chose your specific database/framework.'
      },
      { 
        name: 'Managerial & Problem Solving Round', 
        desc: '30–45 min: Scenario-based questions, team conflict resolution, production debugging approaches, and client communication.',
        prepTip: 'Use the STAR method for behavioral answers and demonstrate willingness to adapt to new technology stacks.'
      },
      { 
        name: 'HR & Fitment Round', 
        desc: '20–30 min: Relocation readiness, shift flexibility, background verification details, and career trajectory.',
        prepTip: 'Confirm location preferences and show enthusiasm for the company\'s global client portfolio.'
      }
    ]
  },

  tech_product_unicorn: {
    id: 'tech_product_unicorn',
    label: 'Tech Product Unicorn / High-Growth Startup',
    ats: 'Greenhouse / Lever / Ashby',
    typicalTimeline: '2–4 weeks',
    description: 'Fast-paced, engineering-first loop prioritizing modular clean coding (Machine Coding/LLD), scalable high-level design (HLD), and high autonomy.',
    rounds: [
      { 
        name: 'Recruiter Screening & Context Call', 
        desc: '30 min: Background, tech stack proficiency, career motivations, and compensation expectations.',
        prepTip: 'Have a crisp 2-minute elevator pitch highlighting tangible production impact (latency drops, scale handled).'
      },
      { 
        name: 'Online Coding Assessment (OA)', 
        desc: '60–90 min HackerRank/CodeSignal: 2–3 algorithmic problem-solving tasks with strict time/space complexity.',
        prepTip: 'Focus on clean LeetCode Medium algorithms (Trees, Graphs, DP, Sliding Window).'
      },
      { 
        name: 'Machine Coding Round (Low-Level Design / LLD)', 
        desc: '90–120 min live coding: Design and implement a working, in-memory object-oriented application (e.g. Splitwise, Parking Lot, In-memory Cache, Ride Matching) with full OOP and unit tests.',
        prepTip: 'Structure code into clean models, services, repositories, and exceptions. Use SOLID principles and design patterns (Factory, Strategy).'
      },
      { 
        name: 'High-Level System Design (HLD)', 
        desc: '60 min: Architect a scalable distributed system (e.g. Flash Sale, Real-time Order Dispatch, Notification Fanout, URL Shortener).',
        prepTip: 'Establish functional/non-functional requirements first, then draw API contracts, data models, caching layers, and database sharding.'
      },
      { 
        name: 'Hiring Manager & Culture Bar-Raiser', 
        desc: '45–60 min: Past architectural trade-offs, engineering failures, bias for action, and customer empathy.',
        prepTip: 'Demonstrate first-principles thinking, high ownership, and comfort with fast iterative deployments.'
      }
    ]
  },

  saas_product: {
    id: 'saas_product',
    label: 'B2B SaaS / Product Platform',
    ats: 'Greenhouse / Lever / SmartRecruiters',
    typicalTimeline: '3–5 weeks',
    description: 'Rigorous craft-oriented loop testing practical application development, API design, database schema modeling, and customer-first engineering.',
    rounds: [
      { 
        name: 'Technical Screen / Take-Home Challenge', 
        desc: 'Take-home assignment or 60 min live CoderPad session evaluating real-world API implementation or refactoring.',
        prepTip: 'Write comprehensive unit tests, clear README instructions, and handle edge cases (empty inputs, rate limits).'
      },
      { 
        name: 'Practical Coding & System Internals', 
        desc: '60 min: Hands-on coding, concurrency, data streaming, or asynchronous event processing in your primary language.',
        prepTip: 'Understand internal language runtimes (JVM memory, Node event loop, Go goroutines, Python GIL).'
      },
      { 
        name: 'SaaS Architecture & Multi-Tenancy Design', 
        desc: '60 min: Design multi-tenant cloud architecture, tenant isolation, role-based access control (RBAC), and webhooks.',
        prepTip: 'Discuss database multi-tenancy models (shared schema vs isolated DBs) and reliable webhook delivery with exponential backoff.'
      },
      { 
        name: 'Engineering Culture & Founder Fitment', 
        desc: '45 min: Product philosophy, open-source mindset, customer empathy, and long-term craft commitment.',
        prepTip: 'Research the company\'s core product ethos and share how you think about developer productivity and customer retention.'
      }
    ]
  },

  fintech_quant: {
    id: 'fintech_quant',
    label: 'FinTech, High-Frequency Trading & Banking Systems',
    ats: 'Workday / Taleo / Greenhouse',
    typicalTimeline: '3–5 weeks',
    description: 'Ultra-rigorous engineering evaluation emphasizing sub-millisecond latency, zero-loss idempotency, distributed transactions, and mathematical rigor.',
    rounds: [
      { 
        name: 'Online Assessment (Math & Advanced DSA)', 
        desc: '90–120 min HackerRank: High-difficulty algorithms, combinatorics, probability, or low-level systems questions.',
        prepTip: 'Practice graph theory, bit manipulation, and probability puzzles.'
      },
      { 
        name: 'Technical Screen (Low-Latency & Concurrency)', 
        desc: '60 min: Memory layouts, lock-free data structures, multithreading, and cache line optimization.',
        prepTip: 'Brush up on synchronization primitives, volatile/atomic variables, and network socket programming.'
      },
      { 
        name: 'Financial Systems Architecture (HLD)', 
        desc: '60 min: Design ledger systems, double-entry bookkeeping, payment gateway routing, or order book matching engines.',
        prepTip: 'Emphasize ACID consistency, two-phase commit, idempotent webhooks, and zero-loss audit trails.'
      },
      { 
        name: 'Superday Panel & Values Assessment', 
        desc: '3–4 consecutive interviews covering algorithms, architectural trade-offs, regulatory compliance, and risk appetite.',
        prepTip: 'Remain composed under pressure and clearly articulate trade-offs between throughput, latency, and consistency.'
      }
    ]
  },

  ai_deeptech: {
    id: 'ai_deeptech',
    label: 'AI Research, DeepTech & GPU Infrastructure',
    ats: 'Greenhouse / Lever',
    typicalTimeline: '2–4 weeks',
    description: 'Evaluation tailored for high-throughput model training, GPU cluster orchestration, tensor optimization, and scalable inference.',
    rounds: [
      { 
        name: 'Technical Screen (Systems & Math)', 
        desc: '60 min: Systems programming (Python/C++), parallel computing, and applied linear algebra.',
        prepTip: 'Review matrix operations, CUDA kernels, memory bandwidth bottlenecks, and SIMD parallelism.'
      },
      { 
        name: 'ML Infrastructure & Distributed Systems', 
        desc: '60 min: Designing GPU training clusters, parameter servers, pipeline parallelism, and low-latency inference serving.',
        prepTip: 'Discuss vLLM/Triton inference engines, KV caching, quantization techniques (FP8/INT4), and checkpointing.'
      },
      { 
        name: 'Applied Algorithmic Deep Dive', 
        desc: '60 min: Algorithms optimized for large-scale vectorized compute, graph neural representations, or streaming telemetry.',
        prepTip: 'Write clean, memory-efficient code and explain CPU-to-GPU bus transfer trade-offs.'
      },
      { 
        name: 'AI Safety, Ethics & Mission Alignment', 
        desc: '45 min: Alignment with responsible scaling, transparency, security vulnerabilities in AI, and research collaboration.',
        prepTip: 'Express thoughtful perspectives on AI alignment, safety evaluations, and open-source contributions.'
      }
    ]
  },

  general_tech_standard: {
    id: 'general_tech_standard',
    label: 'Standard Modern Technology Loop',
    ats: 'Workday / Greenhouse / Lever',
    typicalTimeline: '3–4 weeks',
    description: 'Standard multi-stage modern tech interview process covering recruiter fit, hands-on coding, architectural design, and behavioral alignment.',
    rounds: [
      { 
        name: 'Recruiter Screening Call', 
        desc: '30 min: Background review, role scope, tech stack familiarity, and candidate timeline.',
        prepTip: 'Highlight your top 2 relevant achievements matching the core job description requirements.'
      },
      { 
        name: 'Technical Coding Screen (OA / Live Pairing)', 
        desc: '45–60 min: Problem solving, data structures, and edge-case handling on CoderPad or HackerRank.',
        prepTip: 'Think out loud, discuss brute force first, then optimize time/space complexity before typing.'
      },
      { 
        name: 'System Design & Architecture Round', 
        desc: '60 min: Designing scalable systems, data persistence, caching, APIs, and microservices.',
        prepTip: 'Lead the discussion, ask clarifying questions on traffic volume, and highlight failure modes.'
      },
      { 
        name: 'Hiring Manager & Team Collaboration', 
        desc: '45 min: Behavioral scenarios, cross-functional collaboration, and past engineering delivery.',
        prepTip: 'Prepare 3 strong STAR-format stories demonstrating cross-team problem solving.'
      }
    ]
  }
};

// ─── Curated Global & Regional Company Round Expectations Database ─────────────
export const COMPANY_ROUND_EXPECTATIONS = {
  // ──────────────────────────────────────────────────────────────────────────
  // 1. Global FAANG & US Big Tech
  // ──────────────────────────────────────────────────────────────────────────
  'Google': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '4–8 weeks',
    ats: 'Google Internal (GH-derivative)',
    rounds: [
      { name: 'Resume Screen', desc: 'ATS keyword + recruiter review', prepTip: 'Quantify metrics with X-Y-Z formula: Accomplished [X] as measured by [Y] by doing [Z].' },
      { name: 'Technical Phone Screen', desc: '45–60 min DSA on Google Docs / CoderPad', prepTip: 'Code without IDE autocomplete; communicate time and space complexity upfront.' },
      { name: 'Coding Onsite × 3', desc: 'Algorithms, Data Structures, Complexity Analysis', prepTip: 'Practice LeetCode hard problems on Graphs, DP, Trees, and Topological Sort.' },
      { name: 'System Design Onsite', desc: 'Distributed systems, scalability, data flow', prepTip: 'Focus on scalability trade-offs, CAP theorem, and RPC communication patterns.' },
      { name: 'Googleyness & Leadership', desc: 'Values, ambiguity resolution, collaboration', prepTip: 'Prepare stories showing doing the right thing, navigating ambiguity, and intellectual humility.' }
    ]
  },
  'Meta': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Meta Internal',
    rounds: [
      { name: 'Recruiter Call', desc: 'Background, expectations, timeline alignment', prepTip: 'Clarify target level (E4/E5/E6) and engineering track.' },
      { name: 'Technical Screen', desc: '45 min CoderPad with 2 LeetCode Mediums', prepTip: 'Speed is critical: solve 2 medium problems with running code in 40 minutes.' },
      { name: 'Coding Onsite × 2', desc: 'Rapid problem solving, edge case testing', prepTip: 'Verify edge cases (empty inputs, large values) before declaring code complete.' },
      { name: 'System Design Onsite', desc: 'Product Architecture / Systems Architecture', prepTip: 'Drive the 45 minutes: API design, data storage, feed generation, and caching.' },
      { name: 'Behavioral & Leadership', desc: 'Conflict resolution, past failures, team impact', prepTip: 'Emphasize Move Fast, Be Bold, and Focus on Long-Term Impact.' }
    ]
  },
  'Amazon': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Amazon iCIMS',
    rounds: [
      { name: 'Resume Screen', desc: 'ATS scanner checking role competencies', prepTip: 'Align resume with 16 Leadership Principles (LPs).' },
      { name: 'Online Assessment (OA)', desc: 'HackerRank: 2 DSA questions (90m) + Work Style Assessment', prepTip: 'Pass 100% test cases; answer work style assessment with decisive LP alignment.' },
      { name: 'Technical Phone Screen', desc: '1 hour live coding + 2 Leadership Principles', prepTip: 'Dedicate 20 minutes to Customer Obsession and Ownership LP stories.' },
      { name: 'Loop Onsite × 4–5', desc: '2× Coding, 1× System Design, 1× Bar Raiser (LP-heavy)', prepTip: 'Every interviewer evaluates 2 specific LPs. Prepare 6 distinct detailed STAR stories.' }
    ]
  },
  'Microsoft': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '4–7 weeks',
    ats: 'Microsoft Talent World',
    rounds: [
      { name: 'Recruiter Phone Screen', desc: '30 min career history & behavioral alignment', prepTip: 'Showcase growth mindset and passion for Azure/cloud platforms.' },
      { name: 'Online Assessment / Tech Phone', desc: 'Codility assessment or 45 min Teams screen', prepTip: 'Focus on clean, readable code and boundary condition handling.' },
      { name: 'Onsite Loop × 4', desc: 'Coding, System Design, Debugging, Problem Solving', prepTip: 'Demonstrate collaborative problem solving and openness to feedback.' },
      { name: 'As Appropriate (AA) Round', desc: 'Senior Partner/Director hiring manager decision round', prepTip: 'Discuss technical vision, career growth, and customer impact at scale.' }
    ]
  },
  'Apple': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '4–8 weeks',
    ats: 'Apple Internal',
    rounds: [
      { name: 'Team Recruiter Screen', desc: 'Team-specific resume review', prepTip: 'Highlight domain expertise matching the exact hardware/software organization.' },
      { name: 'Technical Phone Screen × 2', desc: 'Domain-specific coding & low-level architecture', prepTip: 'Expect questions on memory management, cache performance, and OS internals.' },
      { name: 'Onsite Loop × 5–6', desc: 'Deep technical specialization, coding, code review', prepTip: 'Apple interviews are team-specific; be prepared for deep dives into past pull requests.' },
      { name: 'Director / VP Chat', desc: 'Cultural and strategic alignment', prepTip: 'Show obsession with product perfection, user privacy, and cross-functional craft.' }
    ]
  },
  'Netflix': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Lever',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Culture memo alignment & technical history', prepTip: 'Read the Netflix Culture Memo thoroughly beforehand.' },
      { name: 'Technical Phone Screen', desc: '1 hour architecture & coding discussion', prepTip: 'Focus on distributed resilience, microservices, and observability.' },
      { name: 'Onsite Round 1 (Technical)', desc: 'System design, microservices, resiliency', prepTip: 'Discuss chaos engineering, client-side resilience, and high-throughput streaming.' },
      { name: 'Onsite Round 2 (Culture)', desc: 'Heavy bar-raiser on Netflix Culture memo with Director', prepTip: 'Prepare to discuss context over control, high performance, and candid feedback.' }
    ]
  },
  'Stripe': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Project overview and team matching', prepTip: 'Show curiosity about financial infrastructure and developer tooling.' },
      { name: 'Technical Screen (1h)', desc: 'Live coding on CoderPad (practical API/data parsing)', prepTip: 'Focus on writing working, testable code rather than exotic algorithms.' },
      { name: 'Onsite: Practical Coding', desc: 'Write clean, testable code in your own IDE', prepTip: 'You can use your own editor and Google documentation; prioritize bug-free implementation.' },
      { name: 'Onsite: Debugging', desc: 'Troubleshoot and fix bugs in a large unfamiliar codebase', prepTip: 'Read stack traces, add logging, and isolate reproducing test cases systematically.' },
      { name: 'Onsite: System Design', desc: 'Design financial infrastructure or reliable messaging', prepTip: 'Emphasize idempotency, reconciliation, and zero double-spend guarantees.' },
      { name: 'Onsite: Integration & Comms', desc: 'Explain technical concepts and integrate an API', prepTip: 'Communicate clearly as if guiding an external developer through an SDK.' }
    ]
  },
  'Databricks': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Background & interest in distributed data', prepTip: 'Express understanding of Spark, Lakehouse, or distributed query engines.' },
      { name: 'Take-Home Project or Coding OA', desc: '4-hour systems challenge or 75m CodeSignal', prepTip: 'Write benchmarkable, multi-threaded code with clean error handling.' },
      { name: 'Architecture Screen', desc: 'Discuss take-home architecture and design choices', prepTip: 'Defend trade-offs made in data structures, concurrency, and serialization.' },
      { name: 'Onsite × 4', desc: 'Distributed systems design, coding, systems internals, values', prepTip: 'Deep dive into storage engines, distributed consensus (Raft/Paxos), and query optimization.' }
    ]
  },
  'Uber': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'iCIMS',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Scope, salary expectations, role fit', prepTip: 'Clarify level expectations (L4/L5a/L5b).' },
      { name: 'CodeSignal OA (GCA)', desc: '70 min General Coding Assessment (4 algorithmic tasks)', prepTip: 'Aim for 800+ score on CodeSignal; solve Q1/Q2 fast to preserve time for Q4 (matrix/simulation).' },
      { name: 'Technical Phone Screen', desc: 'Live coding + architectural trade-offs', prepTip: 'Communicate constantly and test your solution with sample inputs.' },
      { name: 'Onsite × 4', desc: 'Algorithms × 2, System Architecture, Behavioral Bar-Raiser', prepTip: 'Prepare geospatial indexing (H3/S2), real-time ETA routing, and dispatch architecture.' }
    ]
  },
  'Airbnb': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Role match & candidate journey', prepTip: 'Highlight passion for community, hospitality, and product craftsmanship.' },
      { name: 'HackerRank OA', desc: '90 min algorithmic coding challenge', prepTip: 'Focus on graph search, string manipulation, and dynamic programming.' },
      { name: 'Technical Phone Screen', desc: 'Live pair programming', prepTip: 'Write clean, modular code with descriptive variable naming.' },
      { name: 'Onsite × 4', desc: 'Coding, System Design, Core Values Interview × 2', prepTip: 'Core values interviews carry equal veto weight; practice Champion the Mission and Be a Host.' }
    ]
  },
  'OpenAI': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Chat', desc: 'Mission alignment & safety consciousness', prepTip: 'Express thoughtful views on AGI trajectory, safety, and scalable alignment.' },
      { name: 'Technical Screen (1h)', desc: 'Systems programming, high-throughput Python/C++', prepTip: 'Write high-performance code with memory and GPU throughput considerations.' },
      { name: 'Onsite: Algorithmic Coding', desc: 'DSA, high-performance computing, clean code', prepTip: 'Master algorithms supporting high-dimensional search, embeddings, and tensors.' },
      { name: 'Onsite: ML Infra / Distributed Design', desc: 'GPU cluster orchestration, caching, checkpointing', prepTip: 'Discuss tensor parallelism, pipeline parallelism, and distributed KV cache architecture.' },
      { name: 'Onsite: Research/Domain Deep Dive', desc: 'Presentation or live problem solving in area of expertise', prepTip: 'Prepare a 20-minute deep dive on your most technically complex past engineering project.' },
      { name: 'Onsite: AI Safety & Culture', desc: 'Alignment, responsible scaling, team collaboration', prepTip: 'Demonstrate intellectual honesty, safety-first mindset, and collaborative humility.' }
    ]
  },
  'Anthropic': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Call', desc: 'Alignment with public-benefit AI research', prepTip: 'Show deep interest in AI safety research, constitutional AI, and interpretability.' },
      { name: 'Technical Screen (1h)', desc: 'Practical systems coding & algorithmic efficiency', prepTip: 'Write idiomatic, robust code with strict type annotations and error checks.' },
      { name: 'Onsite × 4', desc: 'Applied systems design, coding, AI safety reasoning, team fit', prepTip: 'Discuss distributed training resilience, prompt evaluations, and safety filters.' }
    ]
  },
  'NVIDIA': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'Technical Phone Screen', desc: 'CUDA/C++, parallel computing, algorithms (1h)', prepTip: 'Brush up on thread blocks, shared memory, and memory coalescing.' },
      { name: 'Onsite: Computer Architecture', desc: 'Memory hierarchy, GPU kernels, cache coherence', prepTip: 'Explain L1/L2 cache latency, PCIe/NVLink bandwidth, and GPU warp scheduling.' },
      { name: 'Onsite: Algorithms & Coding', desc: 'High-performance algorithms, multithreading', prepTip: 'Write lock-free queues or parallel reduction algorithms.' },
      { name: 'Onsite: Deep Learning / Systems Design', desc: 'TensorRT, distributed training, or driver systems', prepTip: 'Discuss kernel fusion, FP8 precision scaling, and multi-node NCCL communications.' },
      { name: 'Onsite: Team Culture', desc: 'First-principles thinking & technical passion', prepTip: 'Emphasize speed, high craftsmanship, and love for accelerated computing.' }
    ]
  },
  'Salesforce': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'HackerRank OA', desc: '90 min algorithmic coding + problem solving', prepTip: 'Practice standard LeetCode Medium algorithms in Java or Python.' },
      { name: 'Technical Phone Screen', desc: 'Java/Python coding on CoderPad', prepTip: 'Focus on object-oriented architecture and database query efficiency.' },
      { name: 'Onsite × 4', desc: 'Coding × 2, Enterprise System Design, Ohana Culture & Leadership', prepTip: 'Highlight enterprise reliability, trust, and multi-tenant cloud architecture.' }
    ]
  },
  'Snowflake': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Experience with databases, distributed systems', prepTip: 'Highlight background in C++, Go, or high-throughput storage engines.' },
      { name: 'HackerRank OA', desc: '90 min: 2 DSA problems with strict performance bounds', prepTip: 'Optimize both time and space complexity to pass 100% hidden test cases.' },
      { name: 'Technical Phone Screen', desc: 'Live coding & database internals discussion', prepTip: 'Review columnar storage formats, LSM trees, and B-tree indexes.' },
      { name: 'Onsite × 4–5', desc: 'Distributed systems, query engine design, coding, team fit', prepTip: 'Discuss separation of compute and storage, query planning, and vectorized execution.' }
    ]
  },
  'Palantir': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Lever',
    rounds: [
      { name: 'Karat Technical Screen', desc: '1 hour outsourced technical interview (coding + systems)', prepTip: 'Prepare Karat-style question patterns: 3-part coding problem with escalating complexity.' },
      { name: 'Decomposition Phone Screen', desc: 'High-level real-world scenario problem decomposition', prepTip: 'Break ambiguous real-world problems into clear modular services.' },
      { name: 'Onsite: Algorithmic Coding', desc: 'Practical algorithms and edge-case handling', prepTip: 'Focus on graph traversals and clean data transformation.' },
      { name: 'Onsite: System Decomposition', desc: 'Design and decompose complex enterprise architecture', prepTip: 'Discuss data ingestion, ontology modeling, and fine-grained access permissions.' },
      { name: 'Onsite: Behavioral & Mission', desc: 'Critical thinking, ethics, and mission alignment', prepTip: 'Show genuine passion for hard mission-critical enterprise engineering.' }
    ]
  },
  'LinkedIn': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Microsoft Talent World',
    rounds: [
      { name: 'Recruiter Phone Screen', desc: 'Background & team preferences', prepTip: 'Show familiarity with Kafka, distributed graphs, or high-scale web platforms.' },
      { name: 'HackerRank OA', desc: '60–90 min coding assessment', prepTip: 'Practice data structure problems on trees, maps, and two pointers.' },
      { name: 'Technical Phone Screen', desc: '1 hour live coding (DSA)', prepTip: 'Write clean Java/Python code and test edge cases proactively.' },
      { name: 'Onsite × 4', desc: 'Algorithms × 2, Distributed System Design, Culture & Craft', prepTip: 'Prepare social network graph architectures, feed caching, and rate limiting.' }
    ]
  },
  'Adobe': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'HackerRank OA', desc: '90 min: 2–3 algorithmic coding problems + technical MCQs', prepTip: 'Review core algorithms and OOP concepts.' },
      { name: 'Technical Screen', desc: '45–60 min live coding on data structures & complexity', prepTip: 'Write clean code and explain big-O bounds.' },
      { name: 'Onsite Loop × 4', desc: 'DSA, Low-Level Design (LLD), Distributed Cloud Architecture, HR', prepTip: 'Prepare image/document processing pipelines, real-time collaboration, and cloud storage.' }
    ]
  },
  'Oracle': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Oracle Cloud HCM',
    rounds: [
      { name: 'Online Assessment', desc: '60–90 min coding and database queries on HackerRank', prepTip: 'Practice complex SQL queries (joins, window functions) and core DSA.' },
      { name: 'Technical Interview 1', desc: 'Algorithms, data structures, and OOP principles', prepTip: 'Focus on Java/C++ memory management, threads, and concurrency.' },
      { name: 'Technical Interview 2 (System Design)', desc: 'Cloud infrastructure (OCI), distributed database scaling, and microservices', prepTip: 'Discuss database replication, high availability, and disaster recovery.' },
      { name: 'Hiring Manager Round', desc: 'Project discussions, behavioral fitment, and team alignment', prepTip: 'Demonstrate technical problem solving on enterprise-grade infrastructure.' }
    ]
  },
  'Cisco': {
    category: 'global_faang',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'Online Assessment', desc: 'HackerRank coding + networking / OS fundamentals', prepTip: 'Review OSI model, TCP/IP, sockets, and basic algorithms.' },
      { name: 'Technical Interview 1', desc: 'Live coding, pointers, memory allocation, and networking protocols', prepTip: 'Be prepared for C/C++ memory management and data structures.' },
      { name: 'Technical Interview 2', desc: 'System architecture, microservices, and security concepts', prepTip: 'Discuss API gateway routing, TLS handshakes, and cloud networking.' },
      { name: 'Managerial & HR', desc: 'Team fit, past project challenges, and organizational culture', prepTip: 'Show strong collaborative mindset and continuous learning.' }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 2. Indian IT Giants & Global System Integrators
  // ──────────────────────────────────────────────────────────────────────────
  'Tata Consultancy Services (TCS)': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–6 weeks',
    ats: 'TCS iON / Internal Portal',
    rounds: [
      { 
        name: 'TCS NQT (National Qualifier Test)', 
        desc: '120 min: Cognitive Aptitude (Numerical, Verbal, Reasoning) + Hands-on Coding (2 algorithmic problems).',
        prepTip: 'Practice TCS NQT past question papers; score above 75% in cognitive section to unlock Digital/Prime interview tier.'
      },
      { 
        name: 'Technical Interview 1 (Fundamentals & DSA)', 
        desc: '45–60 min: OOPs, Core Java/Python/C++, SQL queries, normalization, and standard DSA (Sorting, Arrays, Strings).',
        prepTip: 'Be ready to write clean SQL queries (group by, joins, subqueries) and explain OOP pillars with real-world examples.'
      },
      { 
        name: 'Managerial Interview (TR 2)', 
        desc: '30–45 min: Scenario analysis, live project walkthrough, conflict handling, and industry domain understanding.',
        prepTip: 'Explain your final year / primary project end-to-end; detail your personal contribution, tech stack choices, and challenges.'
      },
      { 
        name: 'HR Interview', 
        desc: '20 min: Work location preference, shift readiness, background check verification, and service bond/agreement.',
        prepTip: 'Demonstrate flexibility regarding project allocation, continuous upskilling, and geographic relocation.'
      }
    ]
  },
  'Infosys': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–6 weeks',
    ats: 'Infosys Careers / Internal',
    rounds: [
      { 
        name: 'Online Test (InfyTQ / HackWithInfy / Qualifier)', 
        desc: '100 min: Logical reasoning, quantitative aptitude, verbal ability, and 2–3 algorithmic coding questions.',
        prepTip: 'Focus on dynamic programming, greedy algorithms, and string manipulation for Specialist Programmer / Digital Specialist Engineer tiers.'
      },
      { 
        name: 'Technical Interview (Core Engineering & Projects)', 
        desc: '45 min: Detailed discussion of resume projects, web architecture, DBMS, operating systems, and live coding.',
        prepTip: 'Expect questions on indexing, primary/foreign keys, REST API methods, and your preferred programming language internals.'
      },
      { 
        name: 'HR & Fitment Discussion', 
        desc: '20 min: Behavioral fit, communication skills, career aspirations, and willingness to learn emerging technologies.',
        prepTip: 'Express enthusiasm for Infosys Wings1 certifications, continuous training, and global client delivery.'
      }
    ]
  },
  'Wipro': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–5 weeks',
    ats: 'Wipro Elite / Elite NTH',
    rounds: [
      { 
        name: 'Elite NTH Online Assessment', 
        desc: '128 min: English comprehension, quantitative/logical aptitude, written communication (essay), and 2 coding challenges.',
        prepTip: 'Ensure grammatical accuracy in written essay; solve at least 1 coding problem completely with all test cases.'
      },
      { 
        name: 'Technical Interview', 
        desc: '45 min: Programming fundamentals, database queries, web development basics, and academic/internship projects.',
        prepTip: 'Be confident in data structures (Linked Lists, Stacks, Queues) and explain your project repository structure.'
      },
      { 
        name: 'HR Interview', 
        desc: '15–20 min: Communication assessment, relocation flexibility, work authorization, and corporate culture alignment.',
        prepTip: 'Show strong communication clarity and positive attitude toward global enterprise consulting.'
      }
    ]
  },
  'HCLTech': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–5 weeks',
    ats: 'HCL Internal Portal',
    rounds: [
      { 
        name: 'Online Aptitude & Technical Test', 
        desc: '90 min: Quantitative, logical reasoning, core computer science MCQs, and 1–2 programming tasks.',
        prepTip: 'Review OS concepts (threads, deadlocks), networking basics, and C/Java syntax.'
      },
      { 
        name: 'Technical Interview Round', 
        desc: '45 min: Live coding, debugging, database management, and architecture of past delivered systems.',
        prepTip: 'Write clean code on whiteboard / shared notepad and walk through each variable state.'
      },
      { 
        name: 'Managerial & HR Discussion', 
        desc: '30 min: Problem-solving approach, customer-centric mindset, domain interest, and compensation structure.',
        prepTip: 'Highlight adaptability to cross-functional enterprise workflows and learning agility.'
      }
    ]
  },
  'Cognizant': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–6 weeks',
    ats: 'Cognizant GenC / Elevate',
    rounds: [
      { 
        name: 'Skill Assessment & Coding (GenC / Elevate)', 
        desc: '100 min: Analytical skills, domain technical MCQs, and hands-on algorithmic coding.',
        prepTip: 'For Elevate/Next tiers, practice advanced data structures, full-stack API concepts, and cloud basics.'
      },
      { 
        name: 'Technical Interview', 
        desc: '45 min: Practical problem solving, SQL queries, framework deep dive (React, Spring Boot, Node, Django), and project defense.',
        prepTip: 'Be ready to explain how your project connects frontend, backend, and database.'
      },
      { 
        name: 'HR Interview', 
        desc: '20 min: Communication evaluation, role fitment, location preferences, and onboarding schedule.',
        prepTip: 'Demonstrate strong English communication, collaboration skills, and enthusiasm for enterprise modernization.'
      }
    ]
  },
  'Tech Mahindra': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–5 weeks',
    ats: 'Tech Mahindra Portal',
    rounds: [
      { 
        name: 'Online Aptitude & English Test', 
        desc: '75 min: Quantitative, logical, verbal assessment, followed by conversational English round.',
        prepTip: 'Practice online speaking and listening tests; maintain clear pronunciation and pacing.'
      },
      { 
        name: 'Technical Assessment & Coding', 
        desc: '60 min: 2 programming questions + core CS fundamentals.',
        prepTip: 'Focus on strings, arrays, and basic sorting algorithms.'
      },
      { 
        name: 'Technical & HR Combined Interview', 
        desc: '45 min: Resume verification, project discussion, programming concepts, and corporate readiness.',
        prepTip: 'Present your strengths clearly and discuss your favorite programming languages and learning projects.'
      }
    ]
  },
  'LTIMindtree': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–5 weeks',
    ats: 'LTI Internal',
    rounds: [
      { 
        name: 'Online Cognitive & Coding Assessment', 
        desc: '90 min: Quantitative, logical reasoning, CS fundamentals, and 2 hands-on coding problems.',
        prepTip: 'Focus on time management; ensure both coding questions pass basic and hidden edge test cases.'
      },
      { 
        name: 'Technical Interview', 
        desc: '45 min: In-depth questions on OOPs, data structures, database schema design, and web services.',
        prepTip: 'Demonstrate clear understanding of RESTful APIs, HTTP verbs, and SQL join types.'
      },
      { 
        name: 'HR Discussion', 
        desc: '20 min: Career trajectory, soft skills, shift flexibility, and company overview.',
        prepTip: 'Express alignment with LTIMindtree’s digital engineering and cloud transformation focus.'
      }
    ]
  },
  'Accenture': {
    category: 'india_giants',
    region: 'India',
    typicalTimeline: '3–6 weeks',
    ats: 'Accenture Workday / Internal',
    rounds: [
      { 
        name: 'Cognitive & Technical Assessment', 
        desc: '90 min: Critical thinking, problem solving, abstract reasoning, and technical MCQs (pseudo-code, cloud, network security).',
        prepTip: 'Score above threshold to immediately advance to the coding assessment round.'
      },
      { 
        name: 'Coding Assessment', 
        desc: '45 min: 2 algorithmic coding problems in your language of choice.',
        prepTip: 'Focus on clean implementation and handling boundary conditions (negative values, duplicates).'
      },
      { 
        name: 'Automated Communication Assessment', 
        desc: '20 min: AI-evaluated spoken English test measuring sentence mastery, vocabulary, fluency, and pronunciation.',
        prepTip: 'Use a quiet room, high-quality microphone, and speak in a steady, natural conversational tone.'
      },
      { 
        name: 'Technical & Managerial Interview', 
        desc: '30–45 min: Practical application of technologies, case study scenarios, and behavioral questions.',
        prepTip: 'Demonstrate how you learn new tech quickly and resolve real-world team challenges.'
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 3. Indian Product Unicorns & High-Growth Tech
  // ──────────────────────────────────────────────────────────────────────────
  'Zoho': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '1–3 weeks',
    ats: 'Zoho People / Internal',
    rounds: [
      { 
        name: 'Round 1: Basic Programming & Aptitude', 
        desc: 'Written/Online test: Logical reasoning, pattern printing, pointers/syntax in C/C++/Java (no standard libraries permitted in initial rounds).',
        prepTip: 'Practice nested loop pattern printing, matrix manipulation, and basic number theory without using built-in helper functions.'
      },
      { 
        name: 'Round 2: Advanced Programming (DSA)', 
        desc: '90 min: 5 complex algorithmic problems on strings, recursion, back-tracking, and dynamic programming.',
        prepTip: 'Implement algorithms from scratch without library shortcuts (e.g. write your own string tokenizer or sorting function).'
      },
      { 
        name: 'Round 3: Machine Coding / Application Building', 
        desc: '2–3 hours: Design and implement a complete console application (e.g. Railway Ticket Reservation, Banking System, Splitwise, Toll Payment System).',
        prepTip: 'Structure code with clean classes, clear separation of models and business logic, and handle full input-output loops gracefully.'
      },
      { 
        name: 'Round 4: Technical Deep Dive & Code Review', 
        desc: '60 min: Senior engineer reviews your Machine Coding code, questioning edge cases, memory optimization, and time complexity.',
        prepTip: 'Walk through your code confidently, explain why you chose specific data structures, and optimize on the fly.'
      },
      { 
        name: 'Round 5: HR & Culture Round', 
        desc: '30 min: Long-term career vision, willingness to craft software in Chennai/Tenkasi/rural hubs, and intellectual curiosity.',
        prepTip: 'Zoho values deep craft, patience, humility, and low attrition; avoid appearing like a short-term resume hopper.'
      }
    ]
  },
  'Freshworks': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse / Lever',
    rounds: [
      { 
        name: 'Recruiter Screening Call', 
        desc: '30 min: Career overview, tech stack alignment, and motivation for customer engagement software.',
        prepTip: 'Highlight experience with SaaS products, multi-tenancy, or high-concurrency web services.'
      },
      { 
        name: 'Online Coding Assessment (OA)', 
        desc: '90 min HackerRank: 2–3 algorithmic problems on arrays, trees, and dynamic programming.',
        prepTip: 'Ensure optimal time and space complexity; test edge cases thoroughly.'
      },
      { 
        name: 'Machine Coding / Low-Level Design (LLD)', 
        desc: '90 min: Live coding an object-oriented system with clean abstractions, design patterns, and unit tests.',
        prepTip: 'Apply SOLID principles; clearly articulate your Strategy, Factory, or Observer pattern choices.'
      },
      { 
        name: 'High-Level System Design (HLD)', 
        desc: '60 min: Architect a scalable SaaS microservice (e.g. Helpdesk Ticket Routing, Omnichannel Chat, Event Ingestion).',
        prepTip: 'Detail database indexing, Redis caching, Kafka message queues, and tenant rate limiting.'
      },
      { 
        name: 'Culture & Leadership Round', 
        desc: '45 min: Freshworks values (CHAT: Craftsmanship, Happy Work Environment, Agility, True Friend to Customers).',
        prepTip: 'Prepare stories showing customer-first trade-offs and rapid delivery under shifting requirements.'
      }
    ]
  },
  'Swiggy': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Lever',
    rounds: [
      { 
        name: 'Recruiter Screen', 
        desc: '30 min: Experience, current CTC/expectations, and past ownership in fast-paced teams.',
        prepTip: 'Quantify your contributions to uptime, throughput, or revenue metrics.'
      },
      { 
        name: 'Online Coding Assessment', 
        desc: '90 min HackerRank/HackerEarth: 2 medium-to-hard algorithmic problems.',
        prepTip: 'Practice graph traversals (BFS/DFS, Dijkstra) and dynamic programming.'
      },
      { 
        name: 'Machine Coding Round (LLD)', 
        desc: '120 min: Implement an extensible, working low-level system (e.g. Delivery Partner Allocation, Food Cart Pricing Engine, Surge Multiplier).',
        prepTip: 'Write executable, modular code with clear interfaces, unit tests, and error handling within 90 minutes.'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: High-scale real-time tracking, live driver GPS updates, order dispatch state machine, and caching.',
        prepTip: 'Address high write throughput, geospatial indexing (H3/QuadTree), WebSockets, and Redis pub/sub.'
      },
      { 
        name: 'Hiring Manager / Values Round', 
        desc: '45 min: Bias for action, fast execution, failure recovery, and engineering leadership.',
        prepTip: 'Show high agency, extreme ownership, and willingness to dive deep into production issues.'
      }
    ]
  },
  'Zomato': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse / Lever',
    rounds: [
      { 
        name: 'Recruiter Screening', 
        desc: '30 min: Technical background, scale handled, and team fit.',
        prepTip: 'Highlight hands-on production engineering and high autonomy.'
      },
      { 
        name: 'Technical Screen (Live Coding)', 
        desc: '60 min: 2 algorithmic coding problems + discussions on memory and optimization.',
        prepTip: 'Code cleanly on CoderPad; discuss multiple approaches before selecting the optimal one.'
      },
      { 
        name: 'Machine Coding / System Decomposition', 
        desc: '90–120 min: Building a working service module (e.g. Flash Sale Reservation, Restaurant Menu Cache, Review Pipeline).',
        prepTip: 'Ensure clean class structure, thread-safety, and meaningful unit tests.'
      },
      { 
        name: 'Distributed System Design (HLD)', 
        desc: '60 min: High-traffic flash sales, order fulfillment, surge pricing, and live analytics.',
        prepTip: 'Focus on distributed locking, eventual consistency, database sharding, and fault tolerance.'
      },
      { 
        name: 'Founder / VP Engineering Round', 
        desc: '45 min: First-principles reasoning, high ownership, speed of execution, and culture fit.',
        prepTip: 'Speak concisely, think from the end-user perspective, and show high technical conviction.'
      }
    ]
  },
  'Razorpay': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { 
        name: 'Recruiter Screening', 
        desc: '30 min: Architecture background, fintech experience, and motivation.',
        prepTip: 'Demonstrate appreciation for financial reliability and zero-tolerance for data loss.'
      },
      { 
        name: 'Machine Coding Round (LLD)', 
        desc: '120 min: Design and implement a working system (e.g. Payment Gateway Router, Ledger Book, Invoice Generator, Smart Routing).',
        prepTip: 'Write clean, testable code in Java/Go/Python with complete design patterns and edge case coverage.'
      },
      { 
        name: 'Data Structures & Algorithms', 
        desc: '60 min: 2 LeetCode Medium/Hard algorithmic challenges.',
        prepTip: 'Focus on trees, graphs, and heap-based prioritization algorithms.'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: Architecting high-concurrency payment routing, idempotent transaction processing, and reconciliation pipelines.',
        prepTip: 'Emphasize idempotency keys, distributed locks, database replication, and sub-second SLAs.'
      },
      { 
        name: 'Hiring Manager & Culture Fit', 
        desc: '45 min: Transparency, customer obsession, dealing with incidents, and ethical engineering.',
        prepTip: 'Share past experiences dealing with high-severity outages and constructive retrospectives.'
      }
    ]
  },
  'Flipkart': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '3–5 weeks',
    ats: 'Workday / Greenhouse',
    rounds: [
      { 
        name: 'Online Coding Challenge', 
        desc: '90 min HackerEarth/HackerRank: 2–3 algorithmic problems.',
        prepTip: 'Practice dynamic programming, graph algorithms, and string algorithms.'
      },
      { 
        name: 'Machine Coding Round (LLD)', 
        desc: '120 min: Build an in-memory shopping cart, locker pickup system, or inventory reservation engine.',
        prepTip: 'Flipkart invented the Machine Coding format; practice finishing in 90 mins with runnable code and unit tests.'
      },
      { 
        name: 'Data Structures & Problem Solving', 
        desc: '60 min: Core algorithmic problem solving and optimization.',
        prepTip: 'Explain edge cases, memory overhead, and optimize from O(N^2) to O(N log N).'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: Big Billion Day scale, flash sales, e-commerce catalog search, and distributed inventory management.',
        prepTip: 'Detail distributed caching, message queues (Kafka), database partitioning, and rate limiters.'
      },
      { 
        name: 'Hiring Manager Round', 
        desc: '45 min: Past architecture decisions, trade-offs made, and cultural alignment.',
        prepTip: 'Showcase humility, data-driven decision making, and customer-first mindset.'
      }
    ]
  },
  'CRED': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Lever / Greenhouse',
    rounds: [
      { 
        name: 'Recruiter Screen', 
        desc: '30 min: Background, high-standard engineering portfolio, and expectations.',
        prepTip: 'Highlight high aesthetic standards, product sense, and clean code philosophy.'
      },
      { 
        name: 'Coding & LLD Round', 
        desc: '90 min: Clean code, extensible OOP modeling, and algorithmic correctness.',
        prepTip: 'CRED maintains an exceptionally high bar for clean, elegant code and design patterns.'
      },
      { 
        name: 'High-Level System Design', 
        desc: '60 min: Fintech transaction processing, reward distribution pipelines, and event-driven architecture.',
        prepTip: 'Discuss Kafka event sourcing, CDC (Change Data Capture), and horizontal scaling.'
      },
      { 
        name: 'Bar Raiser / Leadership Round', 
        desc: '45 min: Extreme ownership, aesthetic standards, velocity, and creative problem solving.',
        prepTip: 'Demonstrate deep passion for building polished, world-class user experiences.'
      }
    ]
  },
  'PhonePe': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Workday',
    rounds: [
      { 
        name: 'Online Coding Assessment', 
        desc: '90 min HackerEarth: 2–3 algorithmic problems with mathematical / efficiency emphasis.',
        prepTip: 'Practice LeetCode hard dynamic programming and graph problems.'
      },
      { 
        name: 'DSA & Problem Solving', 
        desc: '60 min: Live algorithmic coding with senior engineer.',
        prepTip: 'Communicate clearly and write production-grade code on a shared whiteboard.'
      },
      { 
        name: 'Machine Coding / LLD', 
        desc: '120 min: Implement a UPI payment routing engine, wallet state machine, or coupon allocation service.',
        prepTip: 'Focus on thread-safety, modular design, clean entity models, and runnable tests.'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: Ultra-high volume UPI transactions, zero-data-loss guarantees, and distributed idempotency.',
        prepTip: 'Discuss Cassandra, HBase, Kafka, active-active multi-region failover, and rate limiting.'
      },
      { 
        name: 'Techno-Managerial Round', 
        desc: '45 min: System reliability, engineering management, and organizational leadership.',
        prepTip: 'Demonstrate high technical depth combined with strategic business perspective.'
      }
    ]
  },
  'Postman': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { 
        name: 'Recruiter Screening', 
        desc: '30 min: Developer tooling interest, engineering background, and product mindset.',
        prepTip: 'Showcase experience with API protocols (REST, GraphQL, gRPC, WebSockets).'
      },
      { 
        name: 'Technical Take-Home or Live API Coding', 
        desc: '60–90 min: Building or debugging a clean API service with comprehensive tests and documentation.',
        prepTip: 'Treat your API as a first-class product with clean schemas, validations, and status codes.'
      },
      { 
        name: 'Architecture & System Design', 
        desc: '60 min: Real-time collaborative workspace, API gateway architecture, and collection syncing.',
        prepTip: 'Discuss real-time conflict resolution (OT/CRDTs), WebSockets, and caching.'
      },
      { 
        name: 'Culture & Engineering Values', 
        desc: '45 min: Empathy for developers, open source mindset, and collaboration.',
        prepTip: 'Demonstrate passion for simplifying developer workflows worldwide.'
      }
    ]
  },
  'BrowserStack': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { 
        name: 'Online Coding Challenge', 
        desc: '90 min HackerRank: 2–3 algorithmic problems.',
        prepTip: 'Review algorithmic problem solving on arrays, trees, and hashing.'
      },
      { 
        name: 'Practical Coding & Systems Programming', 
        desc: '60 min: Concurrency, networking, process management, and browser virtualization.',
        prepTip: 'Brush up on operating systems internals, WebRTC, and socket multiplexing.'
      },
      { 
        name: 'System Design', 
        desc: '60 min: Device cloud allocation, real-time video streaming, and latency minimization.',
        prepTip: 'Discuss queueing theory, pool allocation, and geo-distributed cloud infrastructure.'
      },
      { 
        name: 'Director / HR Round', 
        desc: '45 min: High-growth execution, engineering excellence, and culture fit.',
        prepTip: 'Show hunger to solve complex infrastructure and testing problems.'
      }
    ]
  },
  'Zepto': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '1–3 weeks',
    ats: 'Lever',
    rounds: [
      { 
        name: 'Online Coding Assessment', 
        desc: '90 min: Algorithms, data structures, and edge case problem solving.',
        prepTip: 'Focus on graphs, priority queues, and sorting.'
      },
      { 
        name: 'Machine Coding Round', 
        desc: '90–120 min: Build dark store inventory allocation or order batching service.',
        prepTip: 'Write clean, modular code and verify boundary conditions.'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: Real-time 10-minute delivery routing, surge demand management, and dark store inventory sync.',
        prepTip: 'Discuss geospatial indexing, WebSockets for rider tracking, and distributed caching.'
      },
      { 
        name: 'Hiring Manager Round', 
        desc: '45 min: High bias for action, fast execution, and rapid problem resolution.',
        prepTip: 'Demonstrate resilience and excitement for high-velocity quick-commerce execution.'
      }
    ]
  },
  'Meesho': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Lever',
    rounds: [
      { 
        name: 'Online Coding Assessment', 
        desc: '90 min: Algorithmic problems on arrays, strings, and dynamic programming.',
        prepTip: 'Ensure optimal time and space complexity.'
      },
      { 
        name: 'Machine Coding Round (LLD)', 
        desc: '90–120 min: Social commerce reseller commission calculator or catalog feed parser.',
        prepTip: 'Focus on clean OOP design, testability, and separation of concerns.'
      },
      { 
        name: 'System Design (HLD)', 
        desc: '60 min: E-commerce catalog search, reseller ordering pipeline, and high-concurrency order placement.',
        prepTip: 'Detail caching strategies, Kafka event streaming, and database partitioning.'
      },
      { 
        name: 'Culture & Values Round', 
        desc: '45 min: User-first mindset, frugality, innovation, and empowerment of small businesses.',
        prepTip: 'Demonstrate genuine interest in serving Bharat (tier 2/3 Indian users).'
      }
    ]
  },
  'Zerodha': {
    category: 'india_unicorns',
    region: 'India',
    typicalTimeline: '2–4 weeks',
    ats: 'Internal FOSS Portal',
    rounds: [
      { 
        name: 'Open Source / Portfolio Review', 
        desc: 'Async screening of public code, GitHub contributions, FOSS engagement, or technical blog posts.',
        prepTip: 'Zerodha heavily favors developers who contribute to open source and understand systems from first principles.'
      },
      { 
        name: 'Technical Live Coding & Systems Deep Dive', 
        desc: '60 min: Hands-on coding in Python/Go/PostgreSQL with emphasis on simplicity, memory footprint, and low overhead.',
        prepTip: 'Avoid over-engineering; Zerodha values simple, robust architectures over trendy distributed frameworks.'
      },
      { 
        name: 'Low-Latency Financial Systems & Architecture', 
        desc: '60 min: High-frequency market data streaming, order book architecture, and zero-downtime database migrations.',
        prepTip: 'Demonstrate deep knowledge of concurrency, WebSockets, Redis pub/sub, and PostgreSQL optimization.'
      },
      { 
        name: 'CTO / Leadership & Philosophy Round', 
        desc: '45 min: Alignment with Zerodha’s non-corporate, low-churn, boot-strapped product philosophy.',
        prepTip: 'Read Kailash Nadh’s engineering essays; articulate the importance of simplicity and patient engineering.'
      }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 4. European & APAC Tech Leaders
  // ──────────────────────────────────────────────────────────────────────────
  'Spotify': {
    category: 'europe_apac',
    region: 'Europe',
    typicalTimeline: '3–5 weeks',
    ats: 'Lever / Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Band model, engineering culture, and team fit', prepTip: 'Understand the Spotify engineering model (squads, chapters, guilds).' },
      { name: 'Technical Screen (1h)', desc: 'Live coding on CoderPad (practical algorithmic problem)', prepTip: 'Write clean, testable code and communicate trade-offs.' },
      { name: 'Onsite: System Design', desc: 'Music streaming, playlist recommendations, distributed audio caches', prepTip: 'Discuss content delivery networks (CDNs), audio chunking, and recommendation caches.' },
      { name: 'Onsite: Practical Architecture & Pairing', desc: 'Hands-on live refactoring or feature extension with an engineer', prepTip: 'Treat the interviewer as a teammate; ask clarifying questions and test incrementally.' },
      { name: 'Onsite: Culture & Collaboration', desc: 'Values, team autonomy, and Swedish collaborative mindset', prepTip: 'Emphasize psychological safety, feedback culture, and collective ownership.' }
    ]
  },
  'Atlassian': {
    category: 'europe_apac',
    region: 'APAC',
    typicalTimeline: '3–5 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Background, team match, and career motivation', prepTip: 'Familiarize yourself with Atlassian values.' },
      { name: 'HackerRank OA', desc: '60–90 min coding challenge', prepTip: 'Practice standard data structure questions in Java or TypeScript.' },
      { name: 'Pair Programming Screen', desc: '1 hour practical live coding, refactoring, and unit testing', prepTip: 'Focus on clean code, edge cases, and unit tests rather than algorithmic tricks.' },
      { name: 'System Design', desc: 'Jira/Confluence cloud scale, multi-tenancy, and real-time collaboration', prepTip: 'Discuss multi-tenant data partitioning, tenant isolation, and WebSockets.' },
      { name: 'Values Interview', desc: 'Open Company, No Bullshit; Build with Heart and Balance', prepTip: 'Prepare authentic stories showing transparency, empathy, and customer advocacy.' }
    ]
  },
  'Canva': {
    category: 'europe_apac',
    region: 'APAC',
    typicalTimeline: '2–4 weeks',
    ats: 'Greenhouse',
    rounds: [
      { name: 'Recruiter Screen', desc: 'Mission alignment & candidate journey', prepTip: 'Learn about Canva’s mission to empower the world to design.' },
      { name: 'Coding / Take-Home Challenge', desc: 'Frontend/backend practical coding challenge', prepTip: 'Deliver clean, modular code with clean UI/API boundaries and tests.' },
      { name: 'System Architecture', desc: 'Real-time collaborative canvas, asset rendering pipelines', prepTip: 'Discuss operational transformation, WebGL rendering, and image generation queues.' },
      { name: 'Values & Crazy Big Goals', desc: 'Empower the world to design, be a good human, dream big', prepTip: 'Demonstrate collaborative humility, creative problem solving, and ambition.' }
    ]
  },
  'Booking.com': {
    category: 'europe_apac',
    region: 'Europe',
    typicalTimeline: '3–5 weeks',
    ats: 'SmartRecruiters',
    rounds: [
      { name: 'HackerRank OA', desc: '75 min algorithmic coding challenge', prepTip: 'Practice string search, graph traversal, and dynamic programming.' },
      { name: 'Technical Phone Screen', desc: 'Live coding + discussion of past architectures', prepTip: 'Explain your reasoning aloud and optimize time complexity.' },
      { name: 'System Design Onsite', desc: 'Hotel search ranking, high-availability booking engine', prepTip: 'Discuss caching, read-heavy vs write-heavy scale, and distributed transaction rollbacks.' },
      { name: 'Commercial & Behavioral Fit', desc: 'Business impact, experimentation (A/B testing), and teamwork', prepTip: 'Show understanding of conversion funnels and hypothesis-driven development.' }
    ]
  },
  'Grab': {
    category: 'europe_apac',
    region: 'APAC',
    typicalTimeline: '3–5 weeks',
    ats: 'Workday / Greenhouse',
    rounds: [
      { name: 'HackerRank OA', desc: '90 min: 2–3 algorithmic problems', prepTip: 'Review graph algorithms and spatial coordinates.' },
      { name: 'Live Coding (DSA)', desc: '1 hour CoderPad session on algorithms and data structures', prepTip: 'Write clean code and test boundary conditions.' },
      { name: 'Machine Coding / System Design', desc: 'Ride hailing, food dispatching, fintech wallet infrastructure', prepTip: 'Discuss geospatial hashing, real-time driver availability, and payment reliability.' },
      { name: 'The Grab Way (Culture)', desc: 'Heart, Hunger, Honour, Humility', prepTip: 'Prepare stories showing grit, humility, and customer dedication.' }
    ]
  },
  'Shopee': {
    category: 'europe_apac',
    region: 'APAC',
    typicalTimeline: '2–4 weeks',
    ats: 'Internal / Lever',
    rounds: [
      { name: 'Online Assessment', desc: '90 min: 2–3 algorithmic problems', prepTip: 'Practice LeetCode medium/hard dynamic programming and tree algorithms.' },
      { name: 'Technical Round 1 (DSA & Concurrency)', desc: 'Algorithms, memory concurrency, network protocols', prepTip: 'Be prepared for multithreading, mutexes, and socket programming.' },
      { name: 'Technical Round 2 (System Design)', desc: 'High-throughput flash sales, MySQL sharding, Redis caching', prepTip: 'Address inventory race conditions, distributed locks, and database read replicas.' },
      { name: 'HR / Management Fitment', desc: 'Career goals, team collaboration, and resilience', prepTip: 'Showcase fast learning and adaptability in high-growth environments.' }
    ]
  },

  // ──────────────────────────────────────────────────────────────────────────
  // 5. Global FinTech, Quant & Banking
  // ──────────────────────────────────────────────────────────────────────────
  'Goldman Sachs': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Goldman Internal / Taleo',
    rounds: [
      { name: 'HackerRank OA', desc: '120 min: 2 algorithmic problems + math/combinatorics questions', prepTip: 'Practice discrete math, probability, and standard algorithms.' },
      { name: 'CoderPad Technical Screen', desc: '1 hour data structures, memory, concurrency', prepTip: 'Write clean Java/C++/Python code and optimize edge cases.' },
      { name: 'Superday × 3–4', desc: 'Algorithms, Financial System Design, Behavioral & Values', prepTip: 'Show deep rigor, compliance mindset, and high algorithmic clarity.' }
    ]
  },
  'Citadel': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '2–4 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'HackerRank OA', desc: '90 min: Advanced C++/Python, math, probability, DSA', prepTip: 'Expect high-difficulty math and algorithmic puzzles.' },
      { name: 'Quant / Systems Phone Screen', desc: 'Low-latency concepts, memory layout, algorithms', prepTip: 'Review cache lines, atomic operations, and memory alignment.' },
      { name: 'Virtual Onsite × 4–5', desc: 'High-speed coding, data structures, puzzle/probability, culture', prepTip: 'Demonstrate elite problem-solving velocity and intellectual precision under pressure.' }
    ]
  },
  'Bloomberg': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'Technical Phone Screen', desc: '45 min live HackerRank coding (C++ or Python)', prepTip: 'Write clean code and test boundary conditions thoroughly.' },
      { name: 'Technical Screen 2', desc: 'System architecture & memory management', prepTip: 'Discuss data streaming, low-latency queues, and thread safety.' },
      { name: 'Onsite Loop × 3', desc: 'Data structures, distributed systems, HR/Engineering manager', prepTip: 'Emphasize real-time market data handling, terminal scale, and team communication.' }
    ]
  },
  'Morgan Stanley': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday / Taleo',
    rounds: [
      { name: 'Online Assessment', desc: '90 min: Aptitude, core CS questions, and coding', prepTip: 'Review Java/C++ basics, algorithms, and OOP concepts.' },
      { name: 'Technical Interview 1', desc: 'Data structures, algorithms, and project architecture', prepTip: 'Explain database design, indexing, and multithreading.' },
      { name: 'Technical Interview 2', desc: 'System design, financial services security, and microservices', prepTip: 'Discuss reliable transaction handling, messaging queues, and auditability.' },
      { name: 'Professional Fitment Round', desc: 'Behavioral scenarios, integrity, and regulatory awareness', prepTip: 'Demonstrate high personal integrity and compliance awareness.' }
    ]
  },
  'JPMorgan Chase': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '3–6 weeks',
    ats: 'Workday',
    rounds: [
      { name: 'HackerRank Coding Challenge', desc: '60–90 min: 2 algorithmic coding problems', prepTip: 'Focus on arrays, hash maps, and sorting.' },
      { name: 'Superday Interview 1 (Technical)', desc: 'Live coding, object-oriented design, and database queries', prepTip: 'Write modular code and explain design patterns.' },
      { name: 'Superday Interview 2 (Architecture)', desc: 'Cloud modernization, enterprise resiliency, and API design', prepTip: 'Discuss AWS cloud architecture, containerization, and microservices.' },
      { name: 'Superday Interview 3 (Behavioral)', desc: 'Leadership, teamwork, and client-first delivery', prepTip: 'Prepare stories showing ethical decision making and teamwork.' }
    ]
  },
  'Visa': {
    category: 'fintech_quant',
    region: 'Global',
    typicalTimeline: '3–5 weeks',
    ats: 'SmartRecruiters',
    rounds: [
      { name: 'Online Assessment', desc: '90 min: 2 coding questions + core computer science MCQs', prepTip: 'Review algorithms and database fundamentals.' },
      { name: 'Technical Screen', desc: '45–60 min live coding on CoderPad', prepTip: 'Write clean code and analyze complexity.' },
      { name: 'Onsite: System Design', desc: 'High-throughput payment networks, transaction settlement, and fraud detection', prepTip: 'Discuss sub-second SLAs, distributed caching, and zero data loss.' },
      { name: 'Onsite: Values & Leadership', desc: 'Integrity, collaboration, and client focus', prepTip: 'Emphasize security, compliance, and cross-functional leadership.' }
    ]
  }
};

// ─── Alias & Brand Variations Dictionary ──────────────────────────────────────
export const COMPANY_ALIASES = {
  // TCS
  'tcs': 'Tata Consultancy Services (TCS)',
  'tata consultancy': 'Tata Consultancy Services (TCS)',
  'tata consultancy services': 'Tata Consultancy Services (TCS)',
  'tata': 'Tata Consultancy Services (TCS)',

  // Infosys
  'infy': 'Infosys',
  'infosys technologies': 'Infosys',
  'infosys ltd': 'Infosys',

  // Wipro
  'wipro technologies': 'Wipro',
  'wipro ltd': 'Wipro',

  // HCL
  'hcl': 'HCLTech',
  'hcl tech': 'HCLTech',
  'hcl technologies': 'HCLTech',

  // Cognizant
  'cts': 'Cognizant',
  'cognizant technology solutions': 'Cognizant',

  // Tech Mahindra
  'techm': 'Tech Mahindra',
  'tech mahindra ltd': 'Tech Mahindra',

  // LTI / Mindtree
  'lti': 'LTIMindtree',
  'mindtree': 'LTIMindtree',
  'lti mindtree': 'LTIMindtree',

  // Accenture
  'accenture india': 'Accenture',

  // Big Tech
  'goog': 'Google',
  'alphabet': 'Google',
  'fb': 'Meta',
  'facebook': 'Meta',
  'amzn': 'Amazon',
  'aws': 'Amazon',
  'msft': 'Microsoft',
  'aapl': 'Apple',
  'nflx': 'Netflix',
  'nvda': 'NVIDIA',
  'sf': 'Salesforce',

  // Indian Unicorns
  'zomato / blinkit': 'Zomato',
  'blinkit': 'Zomato',
  'swiggy instamart': 'Swiggy',
  'instamart': 'Swiggy',
  'razorpay software': 'Razorpay',
  'cred club': 'CRED',
  'freshworks inc': 'Freshworks',
  'zoho corp': 'Zoho',
  'postman inc': 'Postman',
  'browser stack': 'BrowserStack',

  // Global & APAC
  'shopee / sea group': 'Shopee',
  'sea group': 'Shopee',
  'jp morgan': 'JPMorgan Chase',
  'jpmc': 'JPMorgan Chase',
  'chase': 'JPMorgan Chase',
  'morgan stanley & co': 'Morgan Stanley',
  'goldman': 'Goldman Sachs'
};

// ─── Intelligent Matcher & Archetype Inferencing ─────────────────────────────
/**
 * Resolves comprehensive interview round expectations for any company in the world.
 * 
 * 1. Exact match against curated 50+ company database
 * 2. Brand alias / abbreviation resolution (TCS, HCL, FB, AMZN, etc.)
 * 3. Case-insensitive substring / fuzzy matching
 * 4. Archetype-based inferencing for unlisted companies
 * 5. Universal modern engineering pipeline fallback
 * 
 * @param {string} companyName - Target employer name
 * @param {object} options - Optional overrides
 * @returns {object} Full company round expectations object
 */
export function getCompanyRoundExpectations(companyName = '', options = {}) {
  const raw = String(companyName || '').trim();
  if (!raw) {
    return {
      company: 'Target Company',
      isVerifiedCompany: false,
      archetype: 'general_tech_standard',
      category: 'general',
      region: 'Global',
      ats: 'Standard ATS (Workday / Greenhouse / Lever)',
      typicalTimeline: '3–4 weeks',
      rounds: COMPANY_ARCHETYPES.general_tech_standard.rounds
    };
  }

  // 1. Direct match
  if (COMPANY_ROUND_EXPECTATIONS[raw]) {
    return {
      company: raw,
      isVerifiedCompany: true,
      isArchetype: false,
      ...COMPANY_ROUND_EXPECTATIONS[raw]
    };
  }

  const lower = raw.toLowerCase();

  // 2. Direct alias match
  if (COMPANY_ALIASES[lower] && COMPANY_ROUND_EXPECTATIONS[COMPANY_ALIASES[lower]]) {
    const canonicalName = COMPANY_ALIASES[lower];
    return {
      company: canonicalName,
      isVerifiedCompany: true,
      isArchetype: false,
      ...COMPANY_ROUND_EXPECTATIONS[canonicalName]
    };
  }

  // 3. Case-insensitive exact match in curated dictionary
  for (const [key, data] of Object.entries(COMPANY_ROUND_EXPECTATIONS)) {
    if (key.toLowerCase() === lower) {
      return {
        company: key,
        isVerifiedCompany: true,
        isArchetype: false,
        ...data
      };
    }
  }

  // 4. Whole-word alias match (e.g. "TCS Developer" -> TCS)
  for (const [alias, canonical] of Object.entries(COMPANY_ALIASES)) {
    const escaped = alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escaped}($|\\s|[^a-zA-Z0-9])`, 'i');
    if (regex.test(raw)) {
      if (COMPANY_ROUND_EXPECTATIONS[canonical]) {
        return {
          company: canonical,
          isVerifiedCompany: true,
          isArchetype: false,
          ...COMPANY_ROUND_EXPECTATIONS[canonical]
        };
      }
    }
  }

  // 5. Whole-word brand match (e.g. "Zoho Corporation" -> Zoho)
  for (const [key, data] of Object.entries(COMPANY_ROUND_EXPECTATIONS)) {
    const brandName = key.replace(/\s*\(.*?\)\s*/g, '').trim();
    if (brandName.length >= 3) {
      const escaped = brandName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`(^|\\s|[^a-zA-Z0-9])${escaped}($|\\s|[^a-zA-Z0-9])`, 'i');
      if (regex.test(raw)) {
        return {
          company: key,
          isVerifiedCompany: true,
          isArchetype: false,
          ...data
        };
      }
    }
  }

  // 4. Keyword-based Archetype Inferencing for unlisted companies
  // Fintech / Quant
  if (/\b(bank|banking|capital|financial|finance|fintech|securities|invest|investing|investment|trading|payments?|credit|wealth|fund|funds|quant|arbitrage|hedge|algo|broker|defi|crypto)\b/i.test(raw)) {
    const arch = COMPANY_ARCHETYPES.fintech_quant;
    return {
      company: raw,
      isVerifiedCompany: false,
      isArchetype: true,
      archetype: arch.id,
      category: 'fintech_quant',
      region: 'Global / FinTech',
      ats: arch.ats,
      typicalTimeline: arch.typicalTimeline,
      description: arch.description,
      rounds: arch.rounds
    };
  }

  // AI / DeepTech
  if (/\b(ai|artificial intelligence|robotics|autonomous|ml|deeptech|neural|compute|gpu|quantum|llm|vision|nlp)\b/i.test(raw)) {
    const arch = COMPANY_ARCHETYPES.ai_deeptech;
    return {
      company: raw,
      isVerifiedCompany: false,
      isArchetype: true,
      archetype: arch.id,
      category: 'global_faang',
      region: 'Global / AI',
      ats: arch.ats,
      typicalTimeline: arch.typicalTimeline,
      description: arch.description,
      rounds: arch.rounds
    };
  }

  // IT Services / Consulting / SIs
  if (/\b(consulting|consultancy|services?|technologies|solutions|infotech|systems?|infosystem|software services|outsourcing|advisory|global services)\b/i.test(raw)) {
    const arch = COMPANY_ARCHETYPES.enterprise_si_consulting;
    return {
      company: raw,
      isVerifiedCompany: false,
      isArchetype: true,
      archetype: arch.id,
      category: 'india_giants',
      region: 'Global / Enterprise',
      ats: arch.ats,
      typicalTimeline: arch.typicalTimeline,
      description: arch.description,
      rounds: arch.rounds
    };
  }

  // SaaS Platform
  if (/\b(saas|cloud|crm|erp|platform|analytics|api|developer|devops|security|monitoring|observability|b2b)\b/i.test(raw)) {
    const arch = COMPANY_ARCHETYPES.saas_product;
    return {
      company: raw,
      isVerifiedCompany: false,
      isArchetype: true,
      archetype: arch.id,
      category: 'india_unicorns',
      region: 'Global / SaaS',
      ats: arch.ats,
      typicalTimeline: arch.typicalTimeline,
      description: arch.description,
      rounds: arch.rounds
    };
  }

  // Product Startup / Unicorn
  if (/\b(labs?|app|apps|pay|commerce|delivery|quick|mart|cart|scale|ventures|hq|consumer|d2c)\b/i.test(raw)) {
    const arch = COMPANY_ARCHETYPES.tech_product_unicorn;
    return {
      company: raw,
      isVerifiedCompany: false,
      isArchetype: true,
      archetype: arch.id,
      category: 'india_unicorns',
      region: 'Global / Startup',
      ats: arch.ats,
      typicalTimeline: arch.typicalTimeline,
      description: arch.description,
      rounds: arch.rounds
    };
  }

  // 5. Universal Standard Tech Fallback
  const standard = COMPANY_ARCHETYPES.general_tech_standard;
  return {
    company: raw,
    isVerifiedCompany: false,
    isArchetype: true,
    archetype: standard.id,
    category: 'all',
    region: 'Global',
    ats: standard.ats,
    typicalTimeline: standard.typicalTimeline,
    description: standard.description,
    rounds: standard.rounds
  };
}

/**
 * Searches and filters companies for the UI selector / search bar.
 * 
 * @param {string} query - Search query
 * @param {string} categoryFilter - Category filter id
 * @returns {Array<{ name: string, data: object }>} Matching companies
 */
export function searchCompanies(query = '', categoryFilter = 'all') {
  const q = (query || '').toLowerCase().trim();
  
  return Object.entries(COMPANY_ROUND_EXPECTATIONS)
    .filter(([name, data]) => {
      // Category check
      if (categoryFilter && categoryFilter !== 'all' && data.category !== categoryFilter) {
        return false;
      }
      
      if (!q) return true;
      
      // Name match
      if (name.toLowerCase().includes(q)) return true;
      // ATS match
      if (data.ats && data.ats.toLowerCase().includes(q)) return true;
      // Round name/desc match
      if (data.rounds && data.rounds.some(r => r.name.toLowerCase().includes(q) || r.desc.toLowerCase().includes(q))) {
        return true;
      }
      
      return false;
    })
    .map(([name, data]) => ({ name, ...data }));
}
