import { storageVault } from './browser_storage_vault.js';
import { hybridLLM } from './hybrid_llm_client.js';
import { parseAndSanitizeJSON, buildLearningRoadmapPrompt, LEARNING_PROMPT } from './webgpu_tasks.js';

export { LEARNING_PROMPT, buildLearningRoadmapPrompt };

/**
 * Computes the candidate's application momentum purely from vault data without AI.
 * 
 * @param {Array} jobs - Scanned jobs list
 * @param {Array} applications - Submitted applications history
 * @returns {{ velocity: number, trend: 'up'|'down'|'flat', daysSinceLastApp: number|null, stalled: boolean }}
 */
export function computeMomentumScore(jobs = [], applications = [], targetPerWeek = 5) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 3600000;

  const validApps = Array.isArray(applications) ? [...applications] : [];
  // Sort descending by applied_at to guarantee applications[0] is the most recent
  validApps.sort((a, b) => new Date(b.applied_at || 0).getTime() - new Date(a.applied_at || 0).getTime());

  const thisWeek = validApps.filter(a => {
    if (!a?.applied_at) return false;
    const t = new Date(a.applied_at).getTime();
    return !Number.isNaN(t) && (now - t) < oneWeek && (now - t) >= 0;
  }).length;

  const lastWeek = validApps.filter(a => {
    if (!a?.applied_at) return false;
    const t = new Date(a.applied_at).getTime();
    if (Number.isNaN(t)) return false;
    const age = now - t;
    return age >= oneWeek && age < 2 * oneWeek;
  }).length;

  const velocity = thisWeek;
  const trend = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'flat';
  
  let daysSinceLastApp = null;
  if (validApps.length > 0 && validApps[0]?.applied_at) {
    const lastTimestamp = new Date(validApps[0].applied_at).getTime();
    if (!Number.isNaN(lastTimestamp)) {
      daysSinceLastApp = Math.max(0, Math.floor((now - lastTimestamp) / 86400000));
    }
  }

  const target = typeof targetPerWeek === 'number' && targetPerWeek > 0 ? targetPerWeek : 5;
  const progressPct = Math.min(100, Math.round((velocity / target) * 100));
  const appsNeeded = Math.max(0, target - velocity);
  const statusMessage = appsNeeded === 0
    ? `Weekly target reached (${velocity}/${target} applications)! 🎯`
    : `${appsNeeded} more application${appsNeeded === 1 ? '' : 's'} needed to hit your weekly target of ${target}.`;

  return {
    velocity,
    trend,
    daysSinceLastApp,
    stalled: daysSinceLastApp !== null && daysSinceLastApp > 3,
    target,
    progressPct,
    appsNeeded,
    statusMessage
  };
}

/**
 * Curated skill-to-resource directory mapping top 50 in-demand engineering skills
 * to 3 free learning resources: Official Documentation, Premier Free Course,
 * and Production GitHub Project specification to build.
 * No AI required — works 100% offline.
 */
export const SKILL_RESOURCES = {
  react: {
    skill: 'React',
    category: 'Frontend',
    docs: { title: 'React Official Documentation & Interactive Tutorials', url: 'https://react.dev' },
    course: { title: 'Full Stack Open — Deep Dive into Modern Web Development (Univ. of Helsinki)', url: 'https://fullstackopen.com' },
    project: { title: 'Interactive Real-Time Kanban Task Board', url: 'https://github.com/topics/kanban-board', description: 'Build a drag-and-drop workflow visualizer with optimistic updates, keyboard navigation, and local persistence.' }
  },
  typescript: {
    skill: 'TypeScript',
    category: 'Languages',
    docs: { title: 'TypeScript Official Handbook', url: 'https://www.typescriptlang.org/docs/' },
    course: { title: 'Total TypeScript Core Essentials (Matt Pocock)', url: 'https://www.totaltypescript.com/tutorials' },
    project: { title: 'Type-Safe Runtime Schema Validator', url: 'https://github.com/colinhacks/zod', description: 'Implement an end-to-end schema validation library with TypeScript generic type inference.' }
  },
  javascript: {
    skill: 'JavaScript',
    category: 'Languages',
    docs: { title: 'MDN Web Docs — Modern JavaScript Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript' },
    course: { title: 'The Modern JavaScript Tutorial (javascript.info)', url: 'https://javascript.info' },
    project: { title: 'Zero-Dependency Async Promise Queue & Event Emitter', url: 'https://github.com/topics/javascript-project', description: 'Build a custom concurrency-limited asynchronous queue with retry policies and typed event emitters.' }
  },
  python: {
    skill: 'Python',
    category: 'Languages',
    docs: { title: 'Python 3 Official Documentation & Language Tutorial', url: 'https://docs.python.org/3/tutorial/' },
    course: { title: 'Harvard CS50P: Introduction to Programming with Python', url: 'https://cs50.harvard.edu/python/' },
    project: { title: 'Asynchronous Web Scraper & CLI ETL Pipeline', url: 'https://github.com/topics/python-cli', description: 'Develop an async pipeline extracting structured telemetry from public APIs with SQLite export.' }
  },
  nodejs: {
    skill: 'Node.js',
    category: 'Backend',
    docs: { title: 'Node.js Official Documentation & Guides', url: 'https://nodejs.org/en/docs' },
    course: { title: 'freeCodeCamp Node.js and Express Course', url: 'https://www.freecodecamp.org/learn' },
    project: { title: 'High-Throughput Streaming Reverse Proxy', url: 'https://github.com/topics/nodejs-backend', description: 'Construct a streaming reverse proxy server utilizing Node.js Streams and worker thread pools.' }
  },
  nextjs: {
    skill: 'Next.js',
    category: 'Frontend',
    docs: { title: 'Next.js App Router Documentation', url: 'https://nextjs.org/docs' },
    course: { title: 'Next.js Official Learn Course', url: 'https://nextjs.org/learn' },
    project: { title: 'SEO-Optimized Technical Documentation Portal', url: 'https://github.com/vercel/next.js/tree/canary/examples', description: 'Deploy a server-rendered documentation portal utilizing Incremental Static Regeneration (ISR).' }
  },
  docker: {
    skill: 'Docker',
    category: 'DevOps',
    docs: { title: 'Docker Official Documentation & Manuals', url: 'https://docs.docker.com/' },
    course: { title: 'Docker for Beginners by Docker Captains (freeCodeCamp)', url: 'https://www.freecodecamp.org/news/docker-training-course-for-beginners/' },
    project: { title: 'Multi-Stage Microservice Compose Blueprint', url: 'https://github.com/docker/awesome-compose', description: 'Containerize a 3-tier REST API with multi-stage build caching, non-root users, and healthchecks.' }
  },
  kubernetes: {
    skill: 'Kubernetes',
    category: 'DevOps',
    docs: { title: 'Kubernetes Official Documentation & Tasks', url: 'https://kubernetes.io/docs/home/' },
    course: { title: 'Kubernetes Official Interactive Tutorials', url: 'https://kubernetes.io/docs/tutorials/' },
    project: { title: 'Self-Healing Helm Chart with Ingress & HPA', url: 'https://github.com/topics/helm-chart', description: 'Deploy auto-scaling stateless services with Horizontal Pod Autoscaling and TLS ingress on Minikube.' }
  },
  aws: {
    skill: 'AWS',
    category: 'Cloud',
    docs: { title: 'AWS Cloud Documentation & Architecture Center', url: 'https://docs.aws.amazon.com/' },
    course: { title: 'AWS Cloud Practitioner Essentials (AWS Skill Builder)', url: 'https://explore.skillbuilder.aws' },
    project: { title: 'Serverless Event-Driven Pipeline (Lambda + S3 + SQS)', url: 'https://github.com/aws-samples', description: 'Architect an automated document processing pipeline with S3 event triggers and SQS queues.' }
  },
  postgresql: {
    skill: 'PostgreSQL',
    category: 'Data',
    docs: { title: 'PostgreSQL Official Documentation', url: 'https://www.postgresql.org/docs/' },
    course: { title: 'Use The Index, Luke! (SQL Indexing Guide by Markus Winand)', url: 'https://use-the-index-luke.com/' },
    project: { title: 'Partitioned Time-Series Metrics Database', url: 'https://github.com/topics/postgresql', description: 'Design a high-volume time-series schema with range partitioning, indexes, and advisory locks.' }
  },
  go: {
    skill: 'Go',
    category: 'Languages',
    docs: { title: 'The Go Programming Language Tour & Docs', url: 'https://go.dev/doc/' },
    course: { title: 'Learn Go with Tests (Chris James)', url: 'https://quii.gitbook.io/learn-go-with-tests/' },
    project: { title: 'Concurrent Token-Bucket Rate Limiter', url: 'https://github.com/topics/golang-project', description: 'Build a thread-safe distributed rate limiter using Go channels, goroutines, and mutex locks.' }
  },
  rust: {
    skill: 'Rust',
    category: 'Languages',
    docs: { title: 'The Rust Programming Language Book', url: 'https://doc.rust-lang.org/book/' },
    course: { title: 'Rust by Example & Rustlings', url: 'https://github.com/rust-lang/rustlings' },
    project: { title: 'High-Performance In-Memory Key-Value Store', url: 'https://github.com/tokio-rs/mini-redis', description: 'Construct a lightweight mini-Redis clone with asynchronous Tokio networking and serde.' }
  },
  java: {
    skill: 'Java',
    category: 'Languages',
    docs: { title: 'Oracle Java Documentation & JDK Specs', url: 'https://docs.oracle.com/en/java/' },
    course: { title: 'University of Helsinki MOOC: Java Programming', url: 'https://java-programming.mooc.fi/' },
    project: { title: 'Concurrent Job Scheduler with Thread Pools', url: 'https://github.com/topics/java-project', description: 'Engineer an executor-service based recurring task runner with cron expressions and metrics.' }
  },
  cpp: {
    skill: 'C++',
    category: 'Languages',
    docs: { title: 'cppreference.com — C++ Reference', url: 'https://en.cppreference.com/w/' },
    course: { title: 'Learn C++ (learncpp.com)', url: 'https://www.learncpp.com/' },
    project: { title: 'Lock-Free Ring Buffer & Memory Pool Allocator', url: 'https://github.com/topics/cpp-project', description: 'Implement an atomic circular buffer for high-frequency low-latency inter-thread messaging.' }
  },
  csharp: {
    skill: 'C# / .NET',
    category: 'Languages',
    docs: { title: '.NET Documentation & C# Language Tour', url: 'https://learn.microsoft.com/en-us/dotnet/' },
    course: { title: 'Microsoft Learn: C# for Beginners', url: 'https://learn.microsoft.com/en-us/training/paths/csharp-first-steps/' },
    project: { title: 'Clean Architecture REST API in ASP.NET Core', url: 'https://github.com/jasontaylordev/CleanArchitecture', description: 'Build a modular Web API using CQRS with MediatR, Entity Framework Core, and fluent validation.' }
  },
  graphql: {
    skill: 'GraphQL',
    category: 'Backend',
    docs: { title: 'GraphQL Official Guide & Specifications', url: 'https://graphql.org/learn/' },
    course: { title: 'How to GraphQL (Fullstack Tutorial)', url: 'https://www.howtographql.com/' },
    project: { title: 'Federated GraphQL Gateway with Dataloader', url: 'https://github.com/graphql/dataloader', description: 'Design a GraphQL schema with batching dataloaders to eliminate N+1 query bottlenecks.' }
  },
  redis: {
    skill: 'Redis',
    category: 'Data',
    docs: { title: 'Redis Official Documentation & Commands', url: 'https://redis.io/docs/' },
    course: { title: 'Redis University Free Online Courses', url: 'https://university.redis.io/' },
    project: { title: 'Distributed Cache & Pub/Sub Message Bus', url: 'https://github.com/topics/redis', description: 'Implement cache-aside patterns with TTL expiration and pub/sub notifications.' }
  },
  mongodb: {
    skill: 'MongoDB',
    category: 'Data',
    docs: { title: 'MongoDB Official Documentation & Manual', url: 'https://www.mongodb.com/docs/' },
    course: { title: 'MongoDB University Free Learning Paths', url: 'https://learn.mongodb.com/' },
    project: { title: 'Document Data Store with Aggregation Pipelines', url: 'https://github.com/topics/mongodb', description: 'Design indexing strategies and multi-stage aggregation pipelines for analytics dashboards.' }
  },
  mysql: {
    skill: 'MySQL',
    category: 'Data',
    docs: { title: 'MySQL 8.0 Reference Manual', url: 'https://dev.mysql.com/doc/refman/8.0/en/' },
    course: { title: 'SQLBolt — Interactive Lessons in SQL', url: 'https://sqlbolt.com/' },
    project: { title: 'ACID Transactional E-Commerce Checkout Schema', url: 'https://github.com/topics/mysql', description: 'Model relational inventory schemas enforcing foreign key constraints and transactional integrity.' }
  },
  kafka: {
    skill: 'Apache Kafka',
    category: 'Data',
    docs: { title: 'Apache Kafka Official Documentation', url: 'https://kafka.apache.org/documentation/' },
    course: { title: 'Confluent Developer Kafka 101 Course', url: 'https://developer.confluent.io/learn-kafka/' },
    project: { title: 'Event-Driven Real-Time Order Stream Consumer', url: 'https://github.com/topics/apache-kafka', description: 'Implement consumer groups with offset management, dead-letter queues, and idempotent producers.' }
  },
  linux: {
    skill: 'Linux',
    category: 'Systems',
    docs: { title: 'Linux Journey — Learn Linux from Scratch', url: 'https://linuxjourney.com/' },
    course: { title: 'The Linux Command Line (William Shotts, free PDF)', url: 'https://linuxcommand.org/tlcl.php' },
    project: { title: 'Automated Server Health Monitoring Bash Suite', url: 'https://github.com/topics/bash-scripting', description: 'Author POSIX-compliant shell automation monitoring CPU, memory, and disk with Slack webhooks.' }
  },
  git: {
    skill: 'Git',
    category: 'Tools',
    docs: { title: 'Pro Git Book (Scott Chacon & Ben Straub)', url: 'https://git-scm.com/book/en/v2' },
    course: { title: 'Learn Git Branching (Interactive Visualizer)', url: 'https://learngitbranching.js.org/' },
    project: { title: 'Monorepo Trunk-Based Release Pipeline', url: 'https://github.com/topics/git-workflow', description: 'Configure automated changelog generation, semantic version tagging, and rebasing hooks.' }
  },
  terraform: {
    skill: 'Terraform',
    category: 'DevOps',
    docs: { title: 'HashiCorp Terraform Official Documentation', url: 'https://developer.hashicorp.com/terraform/docs' },
    course: { title: 'Terraform Beginner to Master (freeCodeCamp)', url: 'https://www.freecodecamp.org/news/learn-terraform-course/' },
    project: { title: 'Modular Cloud VPC & Cluster Infrastructure as Code', url: 'https://github.com/terraform-aws-modules', description: 'Author reusable Terraform modules provisioning secure VPCs, subnets, and security groups.' }
  },
  cicd: {
    skill: 'CI/CD & GitHub Actions',
    category: 'DevOps',
    docs: { title: 'GitHub Actions Official Documentation', url: 'https://docs.github.com/en/actions' },
    course: { title: 'GitHub Skills — Continuous Integration and Delivery', url: 'https://skills.github.com/' },
    project: { title: 'End-to-End Test, Matrix Build & Deploy Pipeline', url: 'https://github.com/topics/github-actions', description: 'Build a multi-platform matrix CI workflow with automated test parallelization and artifact uploads.' }
  },
  fastapi: {
    skill: 'FastAPI',
    category: 'Backend',
    docs: { title: 'FastAPI Official Documentation & Tutorial', url: 'https://fastapi.tiangolo.com/' },
    course: { title: 'FastAPI Interactive Tutorial by Sebastián Ramírez', url: 'https://fastapi.tiangolo.com/tutorial/' },
    project: { title: 'Async RESTful Microservice with Pydantic v2', url: 'https://github.com/tiangolo/full-stack-fastapi-template', description: 'Engineer an asynchronous API with OpenAPI docs, dependency injection, and JWT auth.' }
  },
  django: {
    skill: 'Django',
    category: 'Backend',
    docs: { title: 'Django Official Documentation & Getting Started', url: 'https://docs.djangoproject.com/' },
    course: { title: 'Mozilla Developer Network Django Web Framework Guide', url: 'https://developer.mozilla.org/en-US/docs/Learn/Server-side/Django' },
    project: { title: 'Production SaaS Backend with Django REST Framework', url: 'https://github.com/topics/django-rest-framework', description: 'Implement custom user models, permissions, serializer validation, and Celery task queues.' }
  },
  flask: {
    skill: 'Flask',
    category: 'Backend',
    docs: { title: 'Flask Official Documentation & Tutorial', url: 'https://flask.palletsprojects.com/' },
    course: { title: 'The Flask Mega-Tutorial by Miguel Grinberg', url: 'https://blog.miguelgrinberg.com/post/the-flask-mega-tutorial-part-i-hello-world' },
    project: { title: 'Lightweight RESTful Microservice with SQLAlchemy', url: 'https://github.com/topics/flask-api', description: 'Build a modular Flask microservice utilizing blueprints, SQLAlchemy ORM, and pytest.' }
  },
  springboot: {
    skill: 'Spring Boot',
    category: 'Backend',
    docs: { title: 'Spring Boot Reference Documentation', url: 'https://docs.spring.io/spring-boot/docs/current/reference/html/' },
    course: { title: 'Spring Academy Free Courses', url: 'https://spring.academy/' },
    project: { title: 'Microservice with Spring Data JPA and Resilience4j', url: 'https://github.com/spring-projects/spring-petclinic', description: 'Create a resilient service with circuit breakers, rate limiting, and JPA repository caching.' }
  },
  vue: {
    skill: 'Vue.js',
    category: 'Frontend',
    docs: { title: 'Vue.js Official Documentation & Tutorial', url: 'https://vuejs.org/guide/introduction.html' },
    course: { title: 'Vue School Free Courses & Guides', url: 'https://vueschool.io/' },
    project: { title: 'Reactive Dashboard with Composition API & Pinia', url: 'https://github.com/topics/vue3', description: 'Build a reactive administrative portal utilizing Vue 3 script setup and Pinia state.' }
  },
  angular: {
    skill: 'Angular',
    category: 'Frontend',
    docs: { title: 'Angular Official Documentation & Interactive Tour', url: 'https://angular.dev/' },
    course: { title: 'Angular University Free Guides', url: 'https://angular-university.io/' },
    project: { title: 'Enterprise Single-Page App with Signals & RxJS', url: 'https://github.com/topics/angular-project', description: 'Develop an enterprise data portal using standalone components, signals, and typed forms.' }
  },
  svelte: {
    skill: 'Svelte',
    category: 'Frontend',
    docs: { title: 'Svelte 5 Documentation & Interactive Tutorial', url: 'https://svelte.dev/tutorial' },
    course: { title: 'Svelte Handbook by Flavio Copes', url: 'https://flaviocopes.com/svelte/' },
    project: { title: 'Blazing Fast Static-First Web App with Runes', url: 'https://github.com/sveltejs/kit', description: 'Create a lightweight zero-bundle-overhead client application using Svelte runes.' }
  },
  tailwind: {
    skill: 'Tailwind CSS',
    category: 'Frontend',
    docs: { title: 'Tailwind CSS Official Documentation & Core Concepts', url: 'https://tailwindcss.com/docs' },
    course: { title: 'Tailwind CSS from Scratch (freeCodeCamp)', url: 'https://www.freecodecamp.org/news/learn-tailwind-css-full-course/' },
    project: { title: 'Dark Mode Glassmorphic Design System', url: 'https://github.com/topics/tailwind-components', description: 'Build an accessible responsive component kit featuring custom color scales and dark mode.' }
  },
  webgpu: {
    skill: 'WebGPU',
    category: 'Graphics / ML',
    docs: { title: 'MDN WebGPU API Documentation & Specs', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebGPU_API' },
    course: { title: 'WebGPU Fundamentals by Greggman', url: 'https://webgpufundamentals.org/' },
    project: { title: 'In-Browser Compute Shader Matrix Multiplication', url: 'https://github.com/gpuweb/gpuweb', description: 'Implement parallel compute shaders executing accelerated tensor multiplication in pure JavaScript.' }
  },
  pytorch: {
    skill: 'PyTorch',
    category: 'AI / ML',
    docs: { title: 'PyTorch Official Documentation & Tutorials', url: 'https://pytorch.org/tutorials/' },
    course: { title: 'Deep Learning with PyTorch (fast.ai)', url: 'https://course.fast.ai/' },
    project: { title: 'Custom Transformer Attention Mechanism from Scratch', url: 'https://github.com/karpathy/nanoGPT', description: 'Train a lightweight generative language model with custom multi-head self-attention.' }
  },
  tensorflow: {
    skill: 'TensorFlow',
    category: 'AI / ML',
    docs: { title: 'TensorFlow Official Documentation & Guides', url: 'https://www.tensorflow.org/learn' },
    course: { title: 'Google Machine Learning Crash Course', url: 'https://developers.google.com/machine-learning/crash-course' }
  },
  llm: {
    skill: 'LLMs & Prompt Engineering',
    category: 'AI / ML',
    docs: { title: 'OpenAI Developer Platform & Prompt Engineering Guide', url: 'https://platform.openai.com/docs/guides/prompt-engineering' },
    course: { title: 'ChatGPT Prompt Engineering for Developers (DeepLearning.AI)', url: 'https://www.deeplearning.ai/short-courses/' },
    project: { title: 'Autonomous Multi-Turn Agent with Function Calling', url: 'https://github.com/topics/llm-agent', description: 'Construct a tool-calling AI assistant with conversational memory and schema validation.' }
  },
  langchain: {
    skill: 'LangChain & LangGraph',
    category: 'AI / ML',
    docs: { title: 'LangChain & LangGraph Official Documentation', url: 'https://python.langchain.com/docs/get_started/introduction' },
    course: { title: 'DeepLearning.AI LangChain for LLM Application Development', url: 'https://www.deeplearning.ai/short-courses/' },
    project: { title: 'Cyclic Multi-Agent Workflow with State Graphs', url: 'https://github.com/langchain-ai/langgraph', description: 'Build a multi-agent critique-and-refine workflow managing dynamic state loops.' }
  },
  rag: {
    skill: 'RAG & Vector Search',
    category: 'AI / ML',
    docs: { title: 'Qdrant & Vector Search Documentation', url: 'https://qdrant.tech/documentation/' },
    course: { title: 'Hugging Face Open Source RAG Course', url: 'https://huggingface.co/learn' },
    project: { title: 'Hybrid Dense/Sparse Semantic Document Retrieval Engine', url: 'https://github.com/topics/rag', description: 'Build an end-to-end RAG system blending dense embeddings with BM25 keyword rankings.' }
  },
  elasticsearch: {
    skill: 'Elasticsearch',
    category: 'Data',
    docs: { title: 'Elasticsearch Official Guide & Reference', url: 'https://www.elastic.co/guide/en/elasticsearch/reference/current/index.html' },
    course: { title: 'Complete Guide to Elasticsearch (freeCodeCamp)', url: 'https://www.freecodecamp.org/news/learn-elasticsearch/' },
    project: { title: 'Fuzzy Multi-Field Search Engine with Highlighting', url: 'https://github.com/topics/elasticsearch', description: 'Configure custom analyzers, n-gram tokenizers, and relevance boosting for autocomplete search.' }
  },
  spark: {
    skill: 'Apache Spark',
    category: 'Data',
    docs: { title: 'Apache Spark Official Programming Guides', url: 'https://spark.apache.org/docs/latest/' },
    course: { title: 'Databricks Apache Spark Free Academy Courses', url: 'https://www.databricks.com/learn' },
    project: { title: 'Large-Scale Distributed Clickstream Aggregator', url: 'https://github.com/topics/apache-spark', description: 'Process structured streaming events with windowed aggregations and Parquet partitioned writes.' }
  },
  pandas: {
    skill: 'Pandas',
    category: 'Data',
    docs: { title: 'Pandas Official User Guide & API Reference', url: 'https://pandas.pydata.org/docs/user_guide/index.html' },
    course: { title: 'Kaggle Pandas Micro-Course', url: 'https://www.kaggle.com/learn/pandas' },
    project: { title: 'Automated Financial Dataset Profiler & Clean Pipeline', url: 'https://github.com/topics/pandas', description: 'Build automated data hygiene pipelines handling missing values, pivots, and datetime parsing.' }
  },
  systemdesign: {
    skill: 'System Design',
    category: 'Architecture',
    docs: { title: 'System Design Primer by Donne Martin', url: 'https://github.com/donnemartin/system-design-primer' },
    course: { title: 'MIT 6.824: Distributed Systems Online Lectures', url: 'https://pdos.csail.mit.edu/6.824/' },
    project: { title: 'Scalable Distributed URL Shortener Architectural Blueprint', url: 'https://github.com/topics/system-design', description: 'Design architecture specifications covering consistent hashing, caching layers, and DB sharding.' }
  },
  microservices: {
    skill: 'Microservices',
    category: 'Architecture',
    docs: { title: 'Microservices Architecture Patterns by Chris Richardson', url: 'https://microservices.io/' },
    course: { title: 'Microsoft Cloud Design Patterns', url: 'https://learn.microsoft.com/en-us/azure/architecture/patterns/' },
    project: { title: 'Saga Pattern Distributed Transaction Coordinator', url: 'https://github.com/topics/microservices-architecture', description: 'Implement compensating transactions across independent payment, inventory, and order services.' }
  },
  grpc: {
    skill: 'gRPC',
    category: 'Backend',
    docs: { title: 'gRPC Official Documentation & Guides', url: 'https://grpc.io/docs/' },
    course: { title: 'Protocol Buffers Official Developer Guide', url: 'https://protobuf.dev/' },
    project: { title: 'Bi-Directional Streaming RPC Service', url: 'https://github.com/topics/grpc', description: 'Define proto3 contracts and build high-throughput client/server streaming with interceptors.' }
  },
  playwright: {
    skill: 'Playwright',
    category: 'Testing',
    docs: { title: 'Playwright Official Documentation & API', url: 'https://playwright.dev/' },
    course: { title: 'Playwright Free Video Guides & Tutorials', url: 'https://playwright.dev/docs/intro' },
    project: { title: 'Parallelized Cross-Browser Visual Regression Suite', url: 'https://github.com/topics/playwright', description: 'Author end-to-end user journey tests with snapshot assertions and multi-worker execution.' }
  },
  jest: {
    skill: 'Jest / Testing',
    category: 'Testing',
    docs: { title: 'Jest Official Documentation & Guides', url: 'https://jestjs.io/docs/getting-started' },
    course: { title: 'Kent C. Dodds: Testing JavaScript Principles', url: 'https://testingjavascript.com/' },
    project: { title: 'Test-Driven (TDD) Financial Calculation Engine', url: 'https://github.com/topics/jest', description: 'Develop a financial amortization calculator following strict TDD with property-based testing.' }
  },
  gcp: {
    skill: 'Google Cloud Platform (GCP)',
    category: 'Cloud',
    docs: { title: 'Google Cloud Platform Official Documentation', url: 'https://cloud.google.com/docs' },
    course: { title: 'Google Cloud Skills Boost Free Tier', url: 'https://www.cloudskillsboost.google/' },
    project: { title: 'Serverless Cloud Run Container with Cloud Pub/Sub', url: 'https://github.com/GoogleCloudPlatform', description: 'Deploy a containerized microservice to Google Cloud Run handling Pub/Sub push subscriptions.' }
  },
  azure: {
    skill: 'Microsoft Azure',
    category: 'Cloud',
    docs: { title: 'Microsoft Azure Documentation & Architecture Center', url: 'https://learn.microsoft.com/en-us/azure/' },
    course: { title: 'Microsoft Learn Azure Fundamentals (AZ-900 Path)', url: 'https://learn.microsoft.com/en-us/training/paths/azure-fundamentals/' },
    project: { title: 'Event-Driven Serverless Azure Functions with Cosmos DB', url: 'https://github.com/Azure-Samples', description: 'Construct serverless functions reacting to Cosmos DB change feeds with managed identities.' }
  },
  websockets: {
    skill: 'WebSockets',
    category: 'Backend',
    docs: { title: 'MDN WebSockets API Guide', url: 'https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API' },
    course: { title: 'Real-Time Web Applications with WebSockets (freeCodeCamp)', url: 'https://www.freecodecamp.org/news' },
    project: { title: 'Collaborative Live Document Presence Server', url: 'https://github.com/topics/websocket', description: 'Engineer a real-time collaborative workspace broadcasting cursor positions and heartbeats.' }
  },
  sql: {
    skill: 'SQL',
    category: 'Data',
    docs: { title: 'PostgreSQL SQL Reference & Syntax Guide', url: 'https://www.postgresql.org/docs/current/sql.html' },
    course: { title: 'Select Star SQL (Interactive Real-World Queries)', url: 'https://selectstarsql.com/' },
    project: { title: 'Complex Window Functions & Cohort Retention Analyzer', url: 'https://github.com/topics/sql-analytics', description: 'Write analytical SQL queries calculating monthly cohort retention, rolling averages, and percentiles.' }
  }
};

/**
 * Returns curated free resources (docs, course, project) for a given skill name,
 * supporting casing, spaces, and canonical abbreviations.
 */
export function getSkillResources(skillName) {
  if (!skillName) return null;
  const raw = String(skillName).toLowerCase().trim();
  const normalized = raw.replace(/[\s._\-/+]/g, '');

  const ALIASES = {
    js: 'javascript',
    ts: 'typescript',
    reactjs: 'react',
    next: 'nextjs',
    node: 'nodejs',
    golang: 'go',
    k8s: 'kubernetes',
    kube: 'kubernetes',
    postgres: 'postgresql',
    psql: 'postgresql',
    c: 'cpp',
    cplusplus: 'cpp',
    dotnet: 'csharp',
    net: 'csharp',
    cs: 'csharp',
    action: 'cicd',
    githubaction: 'cicd',
    actions: 'cicd',
    githubactions: 'cicd',
    promptengineering: 'llm',
    langgraph: 'langchain',
    vectordb: 'rag',
    vectordatabase: 'rag',
    qdrant: 'rag',
    chroma: 'rag',
    chromadb: 'rag',
    pinecone: 'rag',
    vitest: 'jest',
    cypress: 'playwright',
    e2e: 'playwright',
    googlecloud: 'gcp',
    googlecloudplatform: 'gcp',
    msazure: 'azure',
    websocket: 'websockets',
    socketio: 'websockets',
    sse: 'websockets',
    rdbms: 'sql',
    tailwindcss: 'tailwind'
  };

  const matchedKey = ALIASES[normalized] || normalized;
  return SKILL_RESOURCES[matchedKey] || null;
}

/**
 * Hardcoded directories of premier zero-cost learning platforms per skill category:
 * MDN Web Docs, freeCodeCamp, Harvard CS50, and YouTube Masterclass playlists.
 * Zero external APIs needed • 100% offline & client-side.
 */
export function getFreeLearningPlatforms(skillName = '') {
  if (!skillName) return null;
  const rawSkill = String(skillName).trim();
  const lower = rawSkill.toLowerCase();
  const encoded = encodeURIComponent(rawSkill);

  // Determine category
  let category = 'Engineering';
  let mdnUrl = `https://developer.mozilla.org/en-US/search?q=${encoded}`;
  let fccUrl = `https://www.freecodecamp.org/news/search/?query=${encoded}`;
  let cs50Url = 'https://cs50.harvard.edu/x/';
  let cs50Label = 'CS50x: Computer Science';
  let ytQuery = `${rawSkill} full course tutorial`;

  const isWebFrontend = /\b(react|vue|angular|svelte|html|css|javascript|typescript|tailwind|next|nuxt|frontend|web|dom|canvas|webgl|redux|sass|vite|webpack|ui)\b/i.test(lower);
  const isBackend = /\b(node|express|nest|go|golang|rust|python|django|flask|fastapi|java|spring|c#|\.net|dotnet|c\+\+|ruby|rails|php|laravel|grpc|graphql|rest|microservices|kafka|rabbitmq|redis|celery|socket|backend)\b/i.test(lower);
  const isCloudDevOps = /\b(docker|kubernetes|k8s|aws|gcp|azure|terraform|ci\/cd|cicd|github actions|linux|bash|ansible|helm|prometheus|grafana|nginx|cloud|devops|sre)\b/i.test(lower);
  const isDataAiMl = /\b(sql|postgres|postgresql|mysql|mongodb|nosql|pandas|numpy|pytorch|tensorflow|keras|ml|ai|machine learning|deep learning|llm|nlp|spark|databricks|snowflake|dbt|data)\b/i.test(lower);
  const isTesting = /\b(jest|vitest|cypress|playwright|selenium|mocha|testing|qa|test|automation)\b/i.test(lower);
  const isSecurity = /\b(cybersecurity|security|owasp|auth|jwt|oauth|penetration|infosec|cryptography)\b/i.test(lower);

  if (isWebFrontend) {
    category = 'Frontend';
    mdnUrl = `https://developer.mozilla.org/en-US/search?q=${encoded}`;
    fccUrl = 'https://www.freecodecamp.org/learn/front-end-development-libraries/';
    cs50Url = 'https://cs50.harvard.edu/web/';
    cs50Label = 'CS50W: Web Programming';
    ytQuery = `${rawSkill} crash course full tutorial`;
  } else if (isBackend) {
    category = 'Backend';
    mdnUrl = lower.includes('javascript') || lower.includes('node') ? 'https://developer.mozilla.org/en-US/docs/Learn/Server-side' : `https://developer.mozilla.org/en-US/search?q=${encoded}`;
    fccUrl = 'https://www.freecodecamp.org/learn/back-end-development-and-apis/';
    cs50Url = lower.includes('python') ? 'https://cs50.harvard.edu/python/' : 'https://cs50.harvard.edu/x/';
    cs50Label = lower.includes('python') ? 'CS50P: Python Programming' : 'CS50x: Computer Science';
    ytQuery = `${rawSkill} backend course complete tutorial`;
  } else if (isCloudDevOps) {
    category = 'DevOps / Cloud';
    mdnUrl = 'https://developer.mozilla.org/en-US/docs/Glossary';
    fccUrl = 'https://www.freecodecamp.org/news/tag/devops/';
    cs50Url = 'https://cs50.harvard.edu/x/';
    cs50Label = 'CS50x: Infrastructure & Systems';
    ytQuery = `${rawSkill} course devops full tutorial`;
  } else if (isDataAiMl) {
    category = 'Data / AI';
    mdnUrl = 'https://developer.mozilla.org/en-US/docs/Web/API';
    fccUrl = lower.includes('python') || lower.includes('pandas')
      ? 'https://www.freecodecamp.org/learn/data-analysis-with-python/'
      : 'https://www.freecodecamp.org/learn/machine-learning-with-python/';
    cs50Url = 'https://cs50.harvard.edu/ai/';
    cs50Label = 'CS50AI: Artificial Intelligence';
    ytQuery = `${rawSkill} full course machine learning tutorial`;
  } else if (isTesting) {
    category = 'Testing & QA';
    mdnUrl = 'https://developer.mozilla.org/en-US/docs/Learn/Tools_and_testing';
    fccUrl = 'https://www.freecodecamp.org/learn/quality-assurance/';
    cs50Url = 'https://cs50.harvard.edu/web/';
    cs50Label = 'CS50W: CI/CD & Testing';
    ytQuery = `${rawSkill} testing tutorial full course`;
  } else if (isSecurity) {
    category = 'Security';
    mdnUrl = 'https://developer.mozilla.org/en-US/docs/Web/Security';
    fccUrl = 'https://www.freecodecamp.org/learn/information-security/';
    cs50Url = 'https://cs50.harvard.edu/cybersecurity/';
    cs50Label = 'CS50S: Cybersecurity';
    ytQuery = `${rawSkill} cybersecurity hands on course`;
  }

  const ytUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(ytQuery)}`;

  return {
    skill: rawSkill,
    category,
    providers: [
      { id: 'mdn', name: 'MDN Web Docs', label: 'MDN Reference', url: mdnUrl, icon: '📖', color: '#005a9c' },
      { id: 'fcc', name: 'freeCodeCamp', label: 'freeCodeCamp Course', url: fccUrl, icon: '🎓', color: '#0a0a23' },
      { id: 'cs50', name: 'Harvard CS50', label: cs50Label, url: cs50Url, icon: '🏛️', color: '#a51c30' },
      { id: 'yt', name: 'YouTube', label: 'YouTube Masterclass', url: ytUrl, icon: '▶️', color: '#ff0000' }
    ]
  };
}

/**
 * Resolves comprehensive learning resources for ANY skill (top 50 curated or dynamic category).
 * Guaranteed to return docs, course, project, and hardcoded provider links for MDN, freeCodeCamp, CS50, and YouTube.
 */
export function resolveSkillLearningResources(skillName = '') {
  if (!skillName) return null;
  const curated = getSkillResources(skillName);
  const platforms = getFreeLearningPlatforms(skillName);

  if (curated) {
    return {
      ...curated,
      platforms: platforms?.providers || []
    };
  }

  return {
    skill: String(skillName).trim(),
    category: platforms?.category || 'Engineering',
    docs: { title: `${skillName} Reference Documentation`, url: platforms?.providers?.[0]?.url || `https://devdocs.io/#q=${encodeURIComponent(skillName)}` },
    course: { title: `${skillName} Full Course (${platforms?.providers?.[1]?.name || 'freeCodeCamp'})`, url: platforms?.providers?.[1]?.url || `https://www.freecodecamp.org/news/search/?query=${encodeURIComponent(skillName)}` },
    project: { title: `${skillName} Production Starter Project`, url: `https://github.com/topics/${encodeURIComponent(String(skillName).toLowerCase().replace(/[\s._/]+/g, '-'))}`, description: `Hands-on reference project demonstrating ${skillName} in practice.` },
    platforms: platforms?.providers || []
  };
}


/**
 * Curated domain study roadmaps for common engineering skill gaps.
 */
export const SKILL_DOMAINS = {
  docker: {
    w1: { focus: 'Container Internals, Namespaces & Multi-Stage Builds', resource: 'Docker Official Docs (docs.docker.com) & "Docker Deep Dive" by Nigel Poulton' },
    w2: { focus: 'Build a Multi-Container Microservice with Healthchecks & Compose', project: 'Dockerize a 3-tier REST API (Node/Go + Redis + Postgres) with volume persistence and rootless user security' },
    w3: { focus: 'Contribute Dockerfiles/compose templates to open-source starter kits', project: 'Submit a multi-stage cache optimization PR to Awesome-Compose or an active CNCF ecosystem repo' },
    w4: { focus: 'Production hardening, image vulnerability scanning & resume integration', project: 'Containerized legacy monolith into 3 microservices with Trivy CVE audits; reduced Docker image size by 68%' }
  },
  kubernetes: {
    w1: { focus: 'K8s Control Plane, Pod Lifecycle & Declarative YAML Architecture', resource: 'Kubernetes Official Documentation (kubernetes.io/docs/tutorials) & "Kubernetes in Action"' },
    w2: { focus: 'Deploy Self-Healing Workloads with Ingress & ConfigMaps on Minikube/Kind', project: 'Configure an auto-scaling HPA deployment with Prometheus health metrics and TLS ingress ingress-nginx' },
    w3: { focus: 'Contribute Helm charts or manifests to open-source packages', project: 'Contribute a deployment Helm chart or bug fix to ArtifactHub or CNCF sandbox project' },
    w4: { focus: 'Production cluster security review & quantify impact for resume', project: 'Architected Kubernetes cluster deployment with horizontal pod autoscaling, zero-downtime rolling updates & 99.9% uptime' }
  },
  react: {
    w1: { focus: 'Modern React 19, Server Components, Concurrent Mode & Hooks Mechanics', resource: 'Official React Documentation (react.dev) & Dan Abramov\'s "Overreacted"' },
    w2: { focus: 'Build an Accessible, High-Performance Virtualized State Dashboard', project: 'Build a responsive real-time data visualizer using React 19, custom hooks, and optimized memoization without layout shifts' },
    w3: { focus: 'Contribute UI component accessibility or test coverage to open-source', project: 'Contribute ARIA accessibility fixes or unit tests to Radix UI, Shadcn, or Cal.com' },
    w4: { focus: 'Lighthouse 100 benchmark documentation & bullet craft', project: 'Engineered responsive React interface achieving 100/100 Lighthouse performance and reducing time-to-interactive by 42%' }
  },
  typescript: {
    w1: { focus: 'Advanced Type System: Generics, Conditional Types, Mapped Types & Template Literals', resource: '"TypeScript Handbook" (typescriptlang.org) & Matt Pocock\'s TotalTypeScript' },
    w2: { focus: 'Build a Type-Safe Schema Validator and Inference Library', project: 'Implement an end-to-end type-safe API client with runtime validation inspired by Zod and tRPC' },
    w3: { focus: 'Contribute strict typing definitions to open-source libraries', project: 'Submit type refinement pull requests or DefinitelyTyped (@types) definitions for popular JavaScript packages' },
    w4: { focus: 'Document strict type safety migration & resume metric synthesis', project: 'Refactored JavaScript codebase to strict TypeScript with zero any assertions, eliminating 90%+ of runtime type errors' }
  },
  python: {
    w1: { focus: 'Modern Python 3.12+, AsyncIO Event Loop, Generators & Type Hinting', resource: 'Official Python Tutorial (python.org) & "Fluent Python" by Luciano Ramalho' },
    w2: { focus: 'Build an Asynchronous High-Throughput Web Service with FastAPI', project: 'Create an asynchronous worker service with Redis caching, Pydantic v2 schemas, and pytest-asyncio coverage' },
    w3: { focus: 'Contribute to an active Python open-source package', project: 'Triage issues or submit test/performance pull requests to FastAPI, HTTPX, or Scikit-Learn' },
    w4: { focus: 'Benchmark async throughput & write quantifiable resume bullet', project: 'Engineered asynchronous FastAPI microservice handling 4,500+ requests/sec with sub-25ms P99 latency' }
  },
  aws: {
    w1: { focus: 'Core AWS Architecture: IAM Least Privilege, VPC Networking, ECS & S3', resource: 'AWS Skill Builder Free Tier & "AWS Certified Solutions Architect Study Guide"' },
    w2: { focus: 'Build Serverless / Containerized Cloud Infrastructure via Terraform/CDK', project: 'Provision an automated CI/CD pipeline deploying a containerized application to AWS ECS Fargate with CloudWatch alarms' },
    w3: { focus: 'Contribute cloud templates to open-source Terraform modules', project: 'Submit security audit or module improvements to the community Terraform AWS modules on GitHub' },
    w4: { focus: 'Cloud cost optimization audit & resume quantification', project: 'Provisioned cloud-native AWS infrastructure using Terraform IaC, slashing monthly cloud hosting expenses by 35%' }
  },
  kafka: {
    w1: { focus: 'Event-Driven Architecture, Brokers, Partitions & Consumer Groups', resource: 'Apache Kafka Official Documentation (kafka.apache.org) & "Kafka: The Definitive Guide"' },
    w2: { focus: 'Build a High-Throughput Real-Time Event Stream Processor', project: 'Implement an event pipeline with consumer rebalance listeners, dead-letter queues, and idempotency guarantees' },
    w3: { focus: 'Contribute consumer client fixes or docs to open-source Kafka ecosystem', project: 'Submit performance improvements or bug fixes to confluent-kafka-go, kafkajs, or Sarama' },
    w4: { focus: 'Production cluster observability & resume impact bullet craft', project: 'Architected distributed Apache Kafka pipeline processing 25,000 events/sec with sub-50ms end-to-end latency' }
  },
  terraform: {
    w1: { focus: 'IaC Declarative Syntax, State Management, Remote Backends & State Locks', resource: 'HashiCorp Official Tutorials (developer.hashicorp.com/terraform) & "Terraform: Up and Running"' },
    w2: { focus: 'Build Modular Multi-Environment Cloud Infrastructure', project: 'Create reusable Terraform modules for VPC networking, ALB load balancers, and autoscaling groups with DynamoDB state locks' },
    w3: { focus: 'Contribute module refinements or documentation to community registries', project: 'Submit security audit improvements or feature additions to community Terraform AWS/GCP modules' },
    w4: { focus: 'Infrastructure cost estimation & bullet synthesis', project: 'Automated multi-region cloud provisioning using modular Terraform IaC, eliminating manual config drift and speeding deploy times by 75%' }
  },
  go: {
    w1: { focus: 'Go Idioms, Goroutines, Channels, Mutexes & Memory Allocation', resource: '"The Go Programming Language" by Donovan & Kernighan and go.dev/tour' },
    w2: { focus: 'Build a Concurrent Low-Latency Microservice with Graceful Shutdown', project: 'Develop an HTTP/2 REST microservice with worker pool pattern, context propagation, and structured logging' },
    w3: { focus: 'Contribute to an active Go open-source tool or library', project: 'Contribute benchmark tests or bug fixes to standard library issues or top Go repos like Gin, Fiber, or Cobra' },
    w4: { focus: 'Benchmark memory allocations & write quantifiable resume achievement', project: 'Engineered high-concurrency Go microservice serving 12,000 req/sec with zero allocations on hot paths' }
  },
  rust: {
    w1: { focus: 'Ownership, Borrow Checker, Lifetimes & Zero-Cost Abstractions', resource: '"The Rust Programming Language" (doc.rust-lang.org/book) & Rustlings' },
    w2: { focus: 'Build a Memory-Safe CLI Utility or High-Performance Network Service', project: 'Implement an asynchronous TCP network proxy or fast file analyzer using Tokio and Clap' },
    w3: { focus: 'Contribute unit tests or documentation to Rust crates', project: 'Submit code quality pull requests to popular crates on crates.io or participate in This Week in Rust issues' },
    w4: { focus: 'Measure memory footprint vs C++ and document resume bullet', project: 'Developed memory-safe Rust background daemon with sub-10MB RAM footprint, eliminating all memory safety vulnerabilities' }
  },
  graphql: {
    w1: { focus: 'GraphQL Schemas, SDL, Resolvers, Query AST & DataLoader Batching', resource: 'GraphQL Official Docs (graphql.org/learn) & Apollo Odyssey' },
    w2: { focus: 'Build a Type-Safe Federated GraphQL Gateway', project: 'Build a GraphQL service solving the N+1 problem with DataLoader, schema stitching, and JWT authentication' },
    w3: { focus: 'Contribute schemas or resolver test suites to open-source', project: 'Contribute resolver bug fixes or typing improvements to Apollo Server, Yoga, or GraphQL-JS' },
    w4: { focus: 'Measure network payload reduction & craft resume metric', project: 'Architected GraphQL gateway replacing 14 legacy REST endpoints, slashing mobile network payload size by 54%' }
  },
  redis: {
    w1: { focus: 'In-Memory Data Structures, Persistence (RDB/AOF) & Eviction Policies', resource: 'Redis Official University (university.redis.com) & "Redis in Action"' },
    w2: { focus: 'Build a Distributed Rate Limiter & Cache Layer with Lua Scripts', project: 'Implement sliding-window rate limiting, write-through caching, and pub/sub messaging in Redis with Atomic Lua' },
    w3: { focus: 'Contribute client documentation or benchmarks to open-source Redis drivers', project: 'Submit test coverage or connection pool optimizations to redis-py, ioredis, or go-redis' },
    w4: { focus: 'Benchmark database offload & synthesize resume impact', project: 'Engineered Redis caching tier with sliding-window rate limiting, dropping primary database read load by 62%' }
  },
  postgresql: {
    w1: { focus: 'Relational Modeling, Indexing (B-Tree, GIN, BRIN) & EXPLAIN ANALYZE', resource: 'PostgreSQL Official Documentation (postgresql.org/docs) & "Use The Index, Luke!"' },
    w2: { focus: 'Optimize Slow Queries, Connection Pooling & ACID Transactions', project: 'Configure PgBouncer, optimize complex multi-table joins, implement partition pruning, and resolve deadlocks' },
    w3: { focus: 'Contribute SQL migration tools or test cases to open-source ORMs', project: 'Contribute query optimization or index migration fixes to Prisma, Drizzle, or SQLAlchemy' },
    w4: { focus: 'Quantify query latency reduction for resume bullet', project: 'Optimized mission-critical PostgreSQL queries with composite GIN indexing, slashing P99 execution time from 1.4s to 45ms' }
  },
  nextjs: {
    w1: { focus: 'Next.js 15 App Router, React Server Components, Server Actions & Streaming', resource: 'Next.js Official Learn Course (nextjs.org/learn) & Vercel Documentation' },
    w2: { focus: 'Build a Production Edge-Rendered SaaS Application', project: 'Build a full-stack App Router application with Server Actions, optimistic UI updates, dynamic OG image generation, and edge caching' },
    w3: { focus: 'Contribute bug reports, docs, or repro templates to Next.js repository', project: 'Triage discussions or submit documentation fixes to Vercel/Next.js GitHub repository' },
    w4: { focus: 'Document Core Web Vitals score & resume accomplishment', project: 'Architected Next.js web platform achieving sub-second Largest Contentful Paint (LCP) and 99+ SEO performance scores' }
  },
  pytorch: {
    w1: { focus: 'Tensors, Autograd Mechanics, Neural Network Modules & CUDA Accelerators', resource: 'PyTorch Official Tutorials (pytorch.org/tutorials) & "Deep Learning with PyTorch"' },
    w2: { focus: 'Fine-Tune an Open LLM or Vision Transformer on Custom Data', project: 'Build an end-to-end training and inference pipeline with PyTorch DataLoader, mixed-precision FP16, and evaluation metrics' },
    w3: { focus: 'Contribute model documentation or unit tests to Hugging Face or PyTorch', project: 'Submit bug fixes or example recipes to Hugging Face Transformers, Accelerate, or PyTorch-Lightning' },
    w4: { focus: 'Quantify model latency and inference throughput on resume', project: 'Engineered PyTorch inference pipeline using 4-bit quantization and torch.compile, accelerating inference throughput by 3.2x' }
  },
  system_design: {
    w1: { focus: 'Scalability Fundamentals, CAP Theorem, Consistency Models & Caching Tiers', resource: '"Designing Data-Intensive Applications" by Martin Kleppmann & ByteByteGo' },
    w2: { focus: 'Design and Prototype a Globally Distributed System', project: 'Prototype a distributed URL shortener or rate limiter with consistent hashing, load balancer simulation, and failover replicas' },
    w3: { focus: 'Contribute architectural diagrams or reference implementations to open-source', project: 'Submit case studies or system design implementations to open-source knowledge bases' },
    w4: { focus: 'Document high-availability architecture & resume synthesis', project: 'Architected fault-tolerant distributed system with multi-region failover, maintaining 99.99% availability during peak traffic spikes' }
  },
  cybersecurity: {
    w1: { focus: 'Threat Modeling (STRIDE), OWASP Top 10 & Zero Trust Architecture', resource: 'OWASP Foundation Guides (owasp.org) & NIST Cybersecurity Framework (SP 800-207)' },
    w2: { focus: 'Hands-On AppSec Lab: Vulnerability Remediation & Secure IAM', project: 'Build a hardened OAuth2/OIDC auth service with rate limiting, input sanitization, CSRF tokens, and RBAC' },
    w3: { focus: 'Contribute Security Rules or Documentation to Open-Source Scanners', project: 'Contribute Semgrep rules, Trivy CVE detectors, or security audit PRs to open-source tools' },
    w4: { focus: 'Automate DevSecOps Pipeline & Resume Quantification', project: 'Architected automated SAST/DAST CI/CD security scanning pipeline, eliminating 85%+ of high-severity vulnerabilities prior to production' }
  },
  data_engineering: {
    w1: { focus: 'Data Modeling (Star/Snowflake Schema), Lakehouse Architecture & SQL Optimization', resource: '"Designing Data-Intensive Applications" & dbt Official Tutorials (docs.getdbt.com)' },
    w2: { focus: 'Build a Distributed Batch & Streaming Pipeline with Spark & dbt', project: 'Build an end-to-end ELT pipeline transforming 10M+ raw records into dimensional models using dbt and Apache Spark' },
    w3: { focus: 'Contribute Data Connectors or Transformations to Open-Source Ecosystem', project: 'Contribute a dbt adapter model, Airflow provider fix, or PySpark optimization PR to GitHub open-source' },
    w4: { focus: 'Data Pipeline SLAs, Data Quality Checks & Resume Metrics', project: 'Engineered scalable dbt & Snowflake ELT lakehouse architecture processing 15M records daily with 99.8% pipeline SLA' }
  },
  embedded_c: {
    w1: { focus: 'Embedded C, Memory Layout, Interrupts & Register-Level Programming', resource: '"Making Embedded Systems" by Elecia White & ARM Cortex-M Architecture Manuals' },
    w2: { focus: 'Develop a Real-Time Firmware Task Runner on FreeRTOS', project: 'Write a multi-tasking FreeRTOS firmware application managing UART/SPI sensor communication with priority queues and mutexes' },
    w3: { focus: 'Contribute Drivers or Examples to Open-Source Embedded Repositories', project: 'Submit sensor driver PRs or board support package enhancements to Zephyr RTOS or FreeRTOS community repos' },
    w4: { focus: 'Firmware Static Analysis, Memory Footprint Optimization & Resume Bullet', project: 'Developed deterministic FreeRTOS embedded firmware for ARM Cortex-M with zero heap fragmentation and sub-1ms ISR latency' }
  },
  mobile_development: {
    w1: { focus: 'Declarative Mobile UI (SwiftUI / Jetpack Compose) & State Architecture', resource: 'Apple Developer Documentation & Android Developers Modern Android Development (developer.android.com)' },
    w2: { focus: 'Build an Offline-First Mobile Application with Local Cache & Sync', project: 'Build an offline-first iOS/Android app with reactive state management, background sync, and encrypted SQLite persistence' },
    w3: { focus: 'Contribute Mobile Components or Bug Fixes to Open-Source Libraries', project: 'Contribute UI bug fixes, dark mode accessibility, or tests to popular Swift, Kotlin, or React Native libraries' },
    w4: { focus: 'App Launch Time Benchmarking & Quantifiable Resume Impact', project: 'Engineered responsive native mobile application with offline-first synchronization, slashing cold start launch time by 40%' }
  },
  qa_automation: {
    w1: { focus: 'Test Automation Pyramid, Test Design Patterns & Framework Architecture', resource: 'Official Playwright Documentation (playwright.dev) & Martin Fowler\'s "Testing Strategies"' },
    w2: { focus: 'Build a Production-Grade E2E Test Suite with Parallel Execution', project: 'Implement an automated Playwright/Cypress end-to-end suite with Page Object Model, network mocking, and visual regression tests' },
    w3: { focus: 'Contribute Test Utilities or CI Actions to Open-Source Frameworks', project: 'Submit reporter enhancements, fixture improvements, or test fixes to Playwright, Cypress, or Testcontainers' },
    w4: { focus: 'Integrate Parallel CI Test Gates & Synthesize Resume Metric', project: 'Architected automated Playwright E2E testing suite running 450+ specs in parallel CI, reducing regression testing cycle from 6 hours to 8 minutes' }
  }
};

/**
 * Deterministic, realistic 4-week self-study curriculum fallback when LLM is unavailable.
 */
export function getFallbackLearningRoadmap(missingSkills = [], targetRole = 'Software Engineer') {
  const skillsList = Array.isArray(missingSkills) ? missingSkills.filter(Boolean) : [String(missingSkills || '')];
  const primarySkill = (skillsList[0] || 'Modern Engineering Stacks').trim();
  const lowerSkill = primarySkill.toLowerCase();

  // Check matching domain preset
  for (const [key, preset] of Object.entries(SKILL_DOMAINS)) {
    let isMatch = false;
    if (key === 'go') {
      isMatch = /\b(go|golang)\b/i.test(lowerSkill);
    } else if (key === 'system_design') {
      isMatch = lowerSkill.includes('system design') || lowerSkill.includes('system_design');
    } else if (key === 'cybersecurity') {
      isMatch = lowerSkill.includes('cybersecurity') || lowerSkill.includes('infosec') || lowerSkill.includes('appsec') || /\bsecurity\b/i.test(lowerSkill);
    } else if (key === 'data_engineering') {
      isMatch = lowerSkill.includes('data engineering') || lowerSkill.includes('data_engineering') || lowerSkill.includes('dbt') || lowerSkill.includes('snowflake');
    } else if (key === 'embedded_c') {
      isMatch = lowerSkill.includes('embedded') || lowerSkill.includes('firmware') || lowerSkill.includes('rtos');
    } else if (key === 'mobile_development') {
      isMatch = lowerSkill.includes('mobile') || lowerSkill.includes('swiftui') || lowerSkill.includes('react native') || lowerSkill.includes('flutter');
    } else if (key === 'qa_automation') {
      isMatch = lowerSkill.includes('qa') || lowerSkill.includes('sdet') || lowerSkill.includes('playwright') || lowerSkill.includes('cypress') || lowerSkill.includes('selenium');
    } else {
      isMatch = lowerSkill.includes(key);
    }

    if (isMatch) {
      return {
        weeks: [
          {
            week: 1,
            focus: `Week 1: ${preset.w1.focus}`,
            resource: preset.w1.resource,
            project: `Read core chapters, implement hands-on code katas, and configure local sandbox environment for ${primarySkill}.`
          },
          {
            week: 2,
            focus: `Week 2: ${preset.w2.focus}`,
            resource: `GitHub public references and official ${primarySkill} repository examples`,
            project: preset.w2.project
          },
          {
            week: 3,
            focus: `Week 3: ${preset.w3.focus}`,
            resource: `GitHub Explore & Good First Issues for ${primarySkill}`,
            project: preset.w3.project
          },
          {
            week: 4,
            focus: `Week 4: ${preset.w4.focus}`,
            resource: 'Markdown project README, GitHub Pages/Vercel deployment & ATS resume guidelines',
            project: preset.w4.project
          }
        ]
      };
    }
  }

  // Curated resource mapping fallback
  const curated = getSkillResources(primarySkill);
  if (curated) {
    return {
      weeks: [
        {
          week: 1,
          focus: `Week 1: Core Fundamentals & Paradigm Mastery for ${curated.skill}`,
          resource: `${curated.docs.title} (${curated.docs.url}) & ${curated.course.title} (${curated.course.url})`,
          project: `Establish development environment, complete syntax katas, and master idiomatic patterns for ${curated.skill}.`
        },
        {
          week: 2,
          focus: `Week 2: Hands-On Milestone: ${curated.project.title}`,
          resource: `${curated.course.title} & Reference Spec: ${curated.project.url}`,
          project: `${curated.project.description}`
        },
        {
          week: 3,
          focus: `Week 3: Open-Source Contribution Target with ${curated.skill}`,
          resource: `GitHub Explore tags: #good-first-issue, #help-wanted filtered by ${curated.skill}`,
          project: `Identify an active open-source project using ${curated.skill}, replicate an open issue, write reproduction tests, and submit a PR.`
        },
        {
          week: 4,
          focus: `Week 4: Project Documentation & Tailored ATS Resume Integration`,
          resource: `Technical writing best practices (Google Technical Writing Course) & STAR bullet frameworks`,
          project: `Publish comprehensive project README with architecture diagrams; add tailored bullet: "Engineered scalable ${curated.skill} solution for ${targetRole} workflows, boosting system reliability and test coverage."`
        }
      ]
    };
  }

  // Generic realistic fallback adhering strictly to prompt requirements
  return {
    weeks: [
      {
        week: 1,
        focus: `Week 1: Core Fundamentals & Paradigm Mastery for ${primarySkill}`,
        resource: `Official Documentation (free online) and "The Architecture of Open Source Applications"`,
        project: `Establish development environment, complete syntax/architectural katas, and document core patterns in personal engineering notebook.`
      },
      {
        week: 2,
        focus: `Week 2: Practical Mini-Project Implementation using ${primarySkill}`,
        resource: `Community GitHub templates, documentation guides, and architecture RFCs`,
        project: `Build a production-ready mini application using ${primarySkill} targeting ${targetRole} workflows; implement unit tests and CI workflow.`
      },
      {
        week: 3,
        focus: `Week 3: Open-Source Contribution Target with ${primarySkill}`,
        resource: `GitHub Explore tags: #good-first-issue, #help-wanted filtered by ${primarySkill}`,
        project: `Identify an active open-source project using ${primarySkill}, replicate an open issue, write reproduction tests, and submit a PR.`
      },
      {
        week: 4,
        focus: `Week 4: Project Documentation & Tailored ATS Resume Integration`,
        resource: `Technical writing best practices (Google Technical Writing Course) & STAR bullet frameworks`,
        project: `Publish comprehensive project README with architecture diagrams; add tailored bullet: "Engineered scalable ${primarySkill} solution for ${targetRole} workflows, boosting system reliability and test coverage."`
      }
    ]
  };
}

/**
 * Synthesizes a 4-week self-study learning path for missing ATS skills.
 *
 * @param {Object} params
 * @param {string[]|string} params.missingSkills
 * @param {string} params.targetRole
 * @param {string[]|string} [params.currentSkills]
 * @returns {Promise<{ weeks: Array<{ week: number, focus: string, resource: string, project: string }> }>}
 */
export async function generateSkillGapRoadmap({
  missingSkills = [],
  targetRole = '',
  currentSkills = []
} = {}) {
  let resolvedMissing = Array.isArray(missingSkills) ? missingSkills : [missingSkills];
  resolvedMissing = resolvedMissing.filter(Boolean);

  let resolvedRole = targetRole;
  let resolvedCurrent = Array.isArray(currentSkills) ? currentSkills : [currentSkills];
  resolvedCurrent = resolvedCurrent.filter(Boolean);

  // Auto-resolve candidate profile from storage vault if not provided
  if (resolvedCurrent.length === 0 || !resolvedRole) {
    try {
      const kb = await storageVault.getKnowledgeBase();
      if (kb) {
        if (resolvedCurrent.length === 0 && kb.skills) {
          resolvedCurrent = Array.isArray(kb.skills)
            ? kb.skills
            : Object.values(kb.skills).flat();
        }
        if (!resolvedRole && (kb.personal?.title || kb.title)) {
          resolvedRole = kb.personal?.title || kb.title;
        }
      }
    } catch {}
  }

  if (!resolvedRole) {
    resolvedRole = 'Senior Software Engineer';
  }

  if (resolvedMissing.length === 0) {
    // 1. Try to load candidate's actual missing skills from the latest ATS X-Ray diagnostic
    try {
      const lastXRay = await storageVault.getItem('analytics', 'last_xray_gaps');
      if (lastXRay?.missingSkills?.length) {
        resolvedMissing = lastXRay.missingSkills;
        if (!targetRole && lastXRay.targetRole) {
          resolvedRole = lastXRay.targetRole;
        }
      }
    } catch {}

    // 2. Fallback: Extract missing skills from candidate's scanned pipeline jobs (<80% match)
    if (resolvedMissing.length === 0) {
      try {
        const jobs = await storageVault.getJobs();
        if (Array.isArray(jobs) && jobs.length > 0) {
          const gapSet = new Set();
          for (const job of jobs) {
            const gaps = Array.isArray(job.missing_skills) ? job.missing_skills : [];
            for (const g of gaps) {
              if (g && typeof g === 'string') gapSet.add(g.trim());
              if (gapSet.size >= 6) break;
            }
            if (gapSet.size >= 6) break;
          }
          if (gapSet.size > 0) {
            resolvedMissing = Array.from(gapSet);
          }
        }
      } catch {}
    }

    if (resolvedMissing.length === 0) {
      resolvedMissing = ['Modern Full-Stack Architecture'];
    }
  }

  const prompt = buildLearningRoadmapPrompt(resolvedMissing, resolvedRole, resolvedCurrent);
  const systemPrompt = 'You are a senior engineering mentor. Create a realistic 4-week self-study plan. Output ONLY valid JSON strictly matching {"weeks": [{"week": 1, "focus": "...", "resource": "...", "project": "..."}]}. Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON. No conversational filler.';

  try {
    const raw = await hybridLLM.generateChat(
      [{ role: 'user', content: prompt }],
      systemPrompt
    );

    const parsed = parseAndSanitizeJSON(raw, null);
    if (parsed && Array.isArray(parsed.weeks) && parsed.weeks.length > 0) {
      // Validate structure of weeks
      const validWeeks = parsed.weeks.map((w, idx) => ({
        week: Number(w.week) || (idx + 1),
        focus: String(w.focus || `Week ${idx + 1} Study Focus`),
        resource: String(w.resource || 'Official Developer Documentation'),
        project: String(w.project || 'Hands-on practical deliverable')
      }));
      return { weeks: validWeeks };
    }
  } catch (err) {
    console.warn('[SkillGapRoadmap] AI generation notice, utilizing deterministic mentor roadmap:', err);
  }

  return getFallbackLearningRoadmap(resolvedMissing, resolvedRole);
}
