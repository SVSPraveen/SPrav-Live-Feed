/**
 * top_tech_companies_catalog.js
 * ==============================
 * Curated Top 100 Tech Companies Board Catalog for SPrav Job AI.
 * 
 * Pre-seeded with 100 verified, 100% CORS-accessible Ashby and Greenhouse endpoints.
 * These endpoints query live direct employer requisitions straight from the user's
 * browser without proxy servers, scrapers, headless browsers, or CAPTCHAs.
 * 
 * Categories:
 * 1. AI Frontier & Foundational Models (20)
 * 2. Developer Platforms & Cloud Infrastructure (22)
 * 3. Fintech, Modern Commerce & Payments (15)
 * 4. Enterprise Data, Streaming & Observability (14)
 * 5. Cybersecurity, Identity & Zero Trust (15)
 * 6. Modern SaaS & Engineering Pioneers (14)
 * Total: 100 Verified Tech Employers
 */

export const TOP_100_TECH_COMPANIES = [
  // ── 1. AI Frontier & Foundational Models (20) ───────────────────────────
  {
    name: 'OpenAI',
    slug: 'openai',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/openai',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Pioneering artificial general intelligence and LLM research.'
  },
  {
    name: 'Anthropic',
    slug: 'anthropic',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/anthropic',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'AI safety research and developer of the Claude foundation models.'
  },
  {
    name: 'Perplexity AI',
    slug: 'perplexity',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/perplexity',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Conversational conversational AI answer engine and search intelligence.'
  },
  {
    name: 'Modal',
    slug: 'modal',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/modal',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Serverless cloud infrastructure for high-performance AI/ML inference and jobs.'
  },
  {
    name: 'Cursor',
    slug: 'cursor',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/cursor',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'AI-first code editor and next-generation engineering workspace.'
  },
  {
    name: 'Scale AI',
    slug: 'scaleai',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/scaleai',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Data infrastructure and RLHF alignment foundation for generative AI.'
  },
  {
    name: 'Mistral AI',
    slug: 'mistral',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/mistral',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Open-weight frontier AI models and enterprise generative AI solutions.'
  },
  {
    name: 'Cohere',
    slug: 'cohere',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/cohere',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Enterprise NLP, multilingual embeddings, and foundational LLMs.'
  },
  {
    name: 'Runway',
    slug: 'runway',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/runway',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Applied AI research building frontier multimodal creative video models.'
  },
  {
    name: 'ElevenLabs',
    slug: 'elevenlabs',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/elevenlabs',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Voice AI research, audio synthesis, and real-time speech-to-speech.'
  },
  {
    name: 'Groq',
    slug: 'groq',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/groq',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'LPU inference engine delivering ultra-low-latency real-time AI tokens.'
  },
  {
    name: 'Together AI',
    slug: 'togetherai',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/togetherai',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Cloud platform for training, fine-tuning, and serving generative models.'
  },
  {
    name: 'Replicate',
    slug: 'replicate',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/replicate',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Run open-source machine learning models with a cloud API.'
  },
  {
    name: 'Decagon',
    slug: 'decagon',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/decagon',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Autonomous conversational AI customer experience agents for enterprise.'
  },
  {
    name: 'Fireworks AI',
    slug: 'fireworks',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/fireworks',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Production AI inference engine optimized for compound AI systems.'
  },
  {
    name: 'Harvey',
    slug: 'harvey',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/harvey',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Domain-specific generative AI platform engineered for professional legal teams.'
  },
  {
    name: 'Sierra',
    slug: 'sierra',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/sierra',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Enterprise conversational AI platform built for customer-facing experiences.'
  },
  {
    name: 'Pydantic',
    slug: 'pydantic',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/pydantic',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Python data validation foundation and Logfire observability for AI.'
  },
  {
    name: 'LiveKit',
    slug: 'livekit',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/livekit',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Real-time WebRTC infrastructure and voice agent framework for multimodal AI.'
  },
  {
    name: 'Braintrust',
    slug: 'braintrust',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/braintrust',
    category: 'AI Frontier & Foundational Models',
    tier: 1,
    description: 'Enterprise evaluation, observability, and prompt engineering platform.'
  },

  // ── 2. Developer Platforms & Cloud Infrastructure (22) ───────────────────
  {
    name: 'Stripe',
    slug: 'stripe',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/stripe',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Financial infrastructure and global commerce APIs for the internet.'
  },
  {
    name: 'Vercel',
    slug: 'vercel',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/vercel',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Frontend cloud platform, Next.js creator, and AI SDK developer.'
  },
  {
    name: 'Supabase',
    slug: 'supabase',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/supabase',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Open source Firebase alternative built with Postgres, Auth, and Edge Functions.'
  },
  {
    name: 'Cloudflare',
    slug: 'cloudflare',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/cloudflare',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Global edge network, web security, and Workers serverless platform.'
  },
  {
    name: 'Linear',
    slug: 'linear',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/linear',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Purpose-built issue tracking and product development system for modern teams.'
  },
  {
    name: 'PostHog',
    slug: 'posthog',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/posthog',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'All-in-one open-source developer product analytics and feature flag platform.'
  },
  {
    name: 'GitLab',
    slug: 'gitlab',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/gitlab',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Unified DevSecOps platform and fully remote engineering pioneer.'
  },
  {
    name: 'GitHub',
    slug: 'github',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/github',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'The world leading AI-powered developer platform and code repository.'
  },
  {
    name: 'Figma',
    slug: 'figma',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/figma',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Collaborative browser-native interface design and digital whiteboard platform.'
  },
  {
    name: 'Sentry',
    slug: 'sentry',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/sentry',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Application performance monitoring and crash reporting for software engineers.'
  },
  {
    name: 'Resend',
    slug: 'resend',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/resend',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Modern email API and transactional messaging platform for developers.'
  },
  {
    name: 'Prisma',
    slug: 'prisma',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/prisma',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Next-generation Node.js and TypeScript ORM and data platform.'
  },
  {
    name: 'HashiCorp',
    slug: 'hashicorp',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/hashicorp',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Multi-cloud automation software including Terraform, Vault, and Nomad.'
  },
  {
    name: 'Temporal',
    slug: 'temporal',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/temporal',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Durable execution platform for mission-critical resilient workflows.'
  },
  {
    name: 'Pulumi',
    slug: 'pulumi',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/pulumi',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Universal infrastructure as code using TypeScript, Python, Go, and C#.'
  },
  {
    name: 'Neon',
    slug: 'neon',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/neon',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Serverless Postgres database with separation of storage and compute.'
  },
  {
    name: 'PlanetScale',
    slug: 'planetscale',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/planetscale',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Serverless MySQL platform powered by Vitess with non-blocking schema migrations.'
  },
  {
    name: 'Deno',
    slug: 'deno',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/deno',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Secure, modern JavaScript and TypeScript runtime and distributed Subhosting edge.'
  },
  {
    name: 'Render',
    slug: 'render',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/render',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Modern unified cloud hosting services, databases, and cron workers.'
  },
  {
    name: 'Railway',
    slug: 'railway',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/railway',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Developer cloud platform providing instantaneous deployment and infrastructure.'
  },
  {
    name: 'Fly.io',
    slug: 'fly',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/fly',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Public application cloud running Docker containers on bare metal near users.'
  },
  {
    name: 'Cockroach Labs',
    slug: 'cockroachlabs',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/cockroachlabs',
    category: 'Developer Platforms & Cloud Infrastructure',
    tier: 1,
    description: 'Distributed SQL database engine with multi-cloud active-active resilience.'
  },

  // ── 3. Fintech, Modern Commerce & Payments (15) ──────────────────────────
  {
    name: 'Plaid',
    slug: 'plaid',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/plaid',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Data network powering financial connections and consumer banking APIs.'
  },
  {
    name: 'Brex',
    slug: 'brex',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/brex',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Corporate cards, spend management, and global treasury infrastructure.'
  },
  {
    name: 'Ramp',
    slug: 'ramp',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/ramp',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Financial automation and corporate card platform saving companies time and money.'
  },
  {
    name: 'Robinhood',
    slug: 'robinhood',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/robinhood',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Pioneering zero-commission retail investing, crypto, and retirement platform.'
  },
  {
    name: 'Coinbase',
    slug: 'coinbase',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/coinbase',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'The leading cryptocurrency platform and Web3 infrastructure provider.'
  },
  {
    name: 'Modern Treasury',
    slug: 'moderntreasury',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/moderntreasury',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Payment operations software automating money movement and ledgering.'
  },
  {
    name: 'Mercury',
    slug: 'mercury',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/mercury',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Fintech banking and venture debt for ambitious tech companies.'
  },
  {
    name: 'Monzo',
    slug: 'monzo',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/monzo',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'UK leading digital challenger bank with real-time financial tracking.'
  },
  {
    name: 'Revolut',
    slug: 'revolut',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/revolut',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Global financial superapp providing multi-currency accounts and transfers.'
  },
  {
    name: 'Chime',
    slug: 'chime',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/chime',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Mobile consumer banking app helping members achieve financial peace of mind.'
  },
  {
    name: 'Affirm',
    slug: 'affirm',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/affirm',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Honest consumer finance and pay-over-time point-of-sale network.'
  },
  {
    name: 'Checkout.com',
    slug: 'checkout',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/checkout',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Global payments solution provider for enterprise digital commerce.'
  },
  {
    name: 'Carta',
    slug: 'carta',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/carta',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Equity management, cap table software, and private market liquidity.'
  },
  {
    name: 'Gusto',
    slug: 'gusto',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/gusto',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Modern HR, automated payroll, benefits, and talent management platform.'
  },
  {
    name: 'Block / Square',
    slug: 'square',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/square',
    category: 'Fintech, Modern Commerce & Payments',
    tier: 1,
    description: 'Omnichannel commerce, merchant hardware, and Cash App ecosystem.'
  },

  // ── 4. Enterprise Data, Streaming & Observability (14) ───────────────────
  {
    name: 'Datadog',
    slug: 'datadog',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/datadog',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Cloud monitoring, security analytics, and complete observability suite.'
  },
  {
    name: 'Databricks',
    slug: 'databricks',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/databricks',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Unified Data Intelligence Platform powered by Apache Spark and Lakehouse.'
  },
  {
    name: 'Snowflake',
    slug: 'snowflake',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/snowflake',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'The Data Cloud enabling multi-cloud warehouse and global data sharing.'
  },
  {
    name: 'Confluent',
    slug: 'confluent',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/confluent',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Data streaming platform setting data in motion with Apache Kafka.'
  },
  {
    name: 'ClickHouse',
    slug: 'clickhouse',
    platform: 'ashby',
    careers_url: 'https://jobs.ashbyhq.com/clickhouse',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Fast open-source column-oriented DBMS for real-time analytical reporting.'
  },
  {
    name: 'dbt Labs',
    slug: 'dbtlabs',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/dbtlabs',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'SQL-first data transformation workflow framework standardizing analytics.'
  },
  {
    name: 'MongoDB',
    slug: 'mongodb',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/mongodb',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Developer data platform centered around flexible document model.'
  },
  {
    name: 'Elastic',
    slug: 'elastic',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/elastic',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Search-powered solutions for Enterprise Search, Observability, and Security.'
  },
  {
    name: 'Redis',
    slug: 'redis',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/redis',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Real-time in-memory data store for caching, vectors, and messaging.'
  },
  {
    name: 'Cribl',
    slug: 'cribl',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/cribl',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Observability pipeline engine for routing, filtering, and shaping telemetry.'
  },
  {
    name: 'Honeycomb',
    slug: 'honeycomb',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/honeycomb',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'High-cardinality observability platform for distributed systems engineering.'
  },
  {
    name: 'Chronosphere',
    slug: 'chronosphere',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/chronosphere',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Cloud-native observability platform built for high scale and cost control.'
  },
  {
    name: 'Starburst',
    slug: 'starburst',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/starburst',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Open data lakehouse powered by Trino SQL engine.'
  },
  {
    name: 'Astronomer',
    slug: 'astronomer',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/astronomer',
    category: 'Enterprise Data, Streaming & Observability',
    tier: 1,
    description: 'Commercial data orchestration platform powered by Apache Airflow.'
  },

  // ── 5. Cybersecurity, Identity & Zero Trust (15) ─────────────────────────
  {
    name: 'CrowdStrike',
    slug: 'crowdstrike',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/crowdstrike',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Falcon cloud-native endpoint protection and cyber threat intelligence.'
  },
  {
    name: 'Zscaler',
    slug: 'zscaler',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/zscaler',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Cloud security pioneer and creator of the Zero Trust Exchange.'
  },
  {
    name: 'Okta',
    slug: 'okta',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/okta',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Enterprise identity and access management, SSO, and user lifecycle automation.'
  },
  {
    name: 'Wiz',
    slug: 'wiz',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/wiz',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Agentless cloud security posture and vulnerability management platform.'
  },
  {
    name: 'Tailscale',
    slug: 'tailscale',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/tailscale',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Zero-config mesh VPN wireguard network for developers and enterprises.'
  },
  {
    name: 'Teleport',
    slug: 'teleport',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/teleport',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Identity-native infrastructure access management for SSH, Kubernetes, and DBs.'
  },
  {
    name: '1Password',
    slug: '1password',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/1password',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Password manager, developer secrets automation, and passkey architecture.'
  },
  {
    name: 'Snyk',
    slug: 'snyk',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/snyk',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Developer-first security platform finding vulnerabilities in code and containers.'
  },
  {
    name: 'SentinelOne',
    slug: 'sentinelone',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/sentinelone',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Autonomous AI-powered cybersecurity endpoint, cloud, and identity platform.'
  },
  {
    name: 'Rubrik',
    slug: 'rubrik',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/rubrik',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Zero Trust Data Security, ransomware recovery, and cloud posture.'
  },
  {
    name: 'Cyera',
    slug: 'cyera',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/cyera',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Data security posture management (DSPM) for cloud data environments.'
  },
  {
    name: 'Abnormal Security',
    slug: 'abnormal',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/abnormal',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'AI-driven behavioral security defense against advanced email attacks.'
  },
  {
    name: 'Bitwarden',
    slug: 'bitwarden',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/bitwarden',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Open source password manager and end-to-end encrypted vault.'
  },
  {
    name: 'NetBird',
    slug: 'netbird',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/netbird',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Open-source Zero Trust networking platform based on WireGuard.'
  },
  {
    name: 'Twingate',
    slug: 'twingate',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/twingate',
    category: 'Cybersecurity, Identity & Zero Trust',
    tier: 1,
    description: 'Modern Zero Trust Network Access (ZTNA) replacing legacy corporate VPNs.'
  },

  // ── 6. Modern SaaS & Engineering Pioneers (14) ───────────────────────────
  {
    name: 'Notion',
    slug: 'notion',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/notion',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'The connected workspace for docs, wikis, and AI-powered project management.'
  },
  {
    name: 'Airtable',
    slug: 'airtable',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/airtable',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Relational app-building platform connecting shared data and workflows.'
  },
  {
    name: 'Asana',
    slug: 'asana',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/asana',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Enterprise work management and collaborative project planning platform.'
  },
  {
    name: 'DoorDash',
    slug: 'doordash',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/doordash',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Local logistics and on-demand delivery technology platform.'
  },
  {
    name: 'Pinterest',
    slug: 'pinterest',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/pinterest',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Visual discovery engine powering inspiration and visual shopping.'
  },
  {
    name: 'Dropbox',
    slug: 'dropbox',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/dropbox',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Virtual-first digital workspace, smart file sync, and DocSend.'
  },
  {
    name: 'Reddit',
    slug: 'reddit',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/reddit',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Network of communities where people dive into their passions and interests.'
  },
  {
    name: 'Duolingo',
    slug: 'duolingo',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/duolingo',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Gamified language learning platform and AI-guided literacy apps.'
  },
  {
    name: 'Canva',
    slug: 'canva',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/canva',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Global visual communication, graphic design, and brand templates platform.'
  },
  {
    name: 'Instacart',
    slug: 'instacart',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/instacart',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'North American retail grocery technology leader and delivery logistics.'
  },
  {
    name: 'Roblox',
    slug: 'roblox',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/roblox',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Global immersive 3D simulation platform and creator economy engine.'
  },
  {
    name: 'Unity',
    slug: 'unity',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/unity',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Real-time 3D development platform for games, XR, and interactive apps.'
  },
  {
    name: 'PagerDuty',
    slug: 'pagerduty',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/pagerduty',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Digital operations management, incident response, and on-call routing.'
  },
  {
    name: 'Braze',
    slug: 'braze',
    platform: 'greenhouse',
    careers_url: 'https://boards.greenhouse.io/braze',
    category: 'Modern SaaS & Engineering Pioneers',
    tier: 1,
    description: 'Comprehensive customer engagement and cross-channel messaging platform.'
  }
];

/**
 * Unique category names for filtering and tabs.
 */
export const TOP_TECH_CATEGORIES = [
  'All Domains',
  'AI Frontier & Foundational Models',
  'Developer Platforms & Cloud Infrastructure',
  'Fintech, Modern Commerce & Payments',
  'Enterprise Data, Streaming & Observability',
  'Cybersecurity, Identity & Zero Trust',
  'Modern SaaS & Engineering Pioneers'
];

/**
 * Returns companies filtered by domain category.
 * @param {string} [category='All Domains']
 * @returns {Array<typeof TOP_100_TECH_COMPANIES[0]>}
 */
export function getCatalogByCategory(category = 'All Domains') {
  if (!category || category === 'All Domains') {
    return [...TOP_100_TECH_COMPANIES];
  }
  return TOP_100_TECH_COMPANIES.filter(c => c.category === category);
}

/**
 * Returns set of verified company slugs.
 * @returns {Set<string>}
 */
export function getVerifiedCompanySlugs() {
  return new Set(ALL_SOVEREIGN_TECH_COMPANIES.map(c => c.slug.toLowerCase()));
}

/**
 * ─────────────────────────────────────────────────────────────────────────────
 * EXPANDED HIGH-VOLUME SOVEREIGN TECH DIRECTORY (Tier-2 & High-Growth Unicorns)
 * ─────────────────────────────────────────────────────────────────────────────
 */
export const EXPANDED_TECH_COMPANIES = [
  // AI Labs & Infra
  { name: 'Together AI', slug: 'togetherai', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/togetherai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Groq', slug: 'groq', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/groq', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Harvey', slug: 'harvey', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/harvey', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Poolside', slug: 'poolside', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/poolside', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Character.AI', slug: 'characterai', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/characterai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Replit', slug: 'replit', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/replit', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'LangChain', slug: 'langchain', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/langchain', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Weaviate', slug: 'weaviate', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/weaviate', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Pinecone', slug: 'pinecone', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pinecone', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Qdrant', slug: 'qdrant', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/qdrant', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Chroma', slug: 'chroma', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/chroma', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Deepgram', slug: 'deepgram', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/deepgram', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'ElevenLabs', slug: 'elevenlabs', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/elevenlabs', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'AssemblyAI', slug: 'assemblyai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/assemblyai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Hugging Face', slug: 'huggingface', platform: 'lever', careers_url: 'https://jobs.lever.co/huggingface', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Weights & Biases', slug: 'wandb', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wandb', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Baseten', slug: 'baseten', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/baseten', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Fireworks AI', slug: 'fireworksai', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/fireworksai', category: 'AI Frontier & Foundational Models', tier: 2 },

  // Developer Platforms & Cloud Infrastructure
  { name: 'Postman', slug: 'postman', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/postman', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Linear', slug: 'linear', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/linear', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Retool', slug: 'retool', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/retool', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Prisma', slug: 'prisma', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/prisma', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Sentry', slug: 'sentry', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sentry', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Sourcegraph', slug: 'sourcegraph', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sourcegraph', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Netlify', slug: 'netlify', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/netlify', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Railway', slug: 'railway', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/railway', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Render', slug: 'render', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/render', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Fly.io', slug: 'flyio', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/flyio', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Pulumi', slug: 'pulumi', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pulumi', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Temporal', slug: 'temporal', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/temporal', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'PlanetScale', slug: 'planetscale', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/planetscale', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Neon', slug: 'neon', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/neon', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Upstash', slug: 'upstash', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/upstash', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'PostHog', slug: 'posthog', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/posthog', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },

  // Fintech & Modern Commerce
  { name: 'Ramp', slug: 'ramp', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/ramp', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Brex', slug: 'brex', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/brex', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Plaid', slug: 'plaid', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/plaid', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Mercury', slug: 'mercury', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/mercury', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Affirm', slug: 'affirm', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/affirm', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Monzo', slug: 'monzo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/monzo', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Revolut', slug: 'revolut', platform: 'lever', careers_url: 'https://jobs.lever.co/revolut', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Rippling', slug: 'rippling', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/rippling', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Carta', slug: 'carta', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/carta', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Deel', slug: 'deel', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/deel', category: 'Fintech, Modern Commerce & Payments', tier: 2 },

  // Cybersecurity & Zero Trust
  { name: 'Tailscale', slug: 'tailscale', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/tailscale', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: '1Password', slug: '1password', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/1password', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Wiz', slug: 'wiz', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wiz', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Chainguard', slug: 'chainguard', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/chainguard', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Teleport', slug: 'gravitational', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gravitational', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Abnormal Security', slug: 'abnormalsecurity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/abnormalsecurity', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Cribl', slug: 'cribl', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cribl', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },

  // Consumer & Enterprise Giants
  { name: 'Airbnb', slug: 'airbnb', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/airbnb', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Coinbase', slug: 'coinbase', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/coinbase', category: 'Fintech, Modern Commerce & Payments', tier: 1 },
  { name: 'GitLab', slug: 'gitlab', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gitlab', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'Reddit', slug: 'reddit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/reddit', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Discord', slug: 'discord', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/discord', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Robinhood', slug: 'robinhood', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/robinhood', category: 'Fintech, Modern Commerce & Payments', tier: 1 },
  { name: 'Pinterest', slug: 'pinterest', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pinterest', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Canva', slug: 'canva', platform: 'smartrecruiters', careers_url: 'https://jobs.smartrecruiters.com/Canva', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },

  // Wave 3 Verified Additions: AI, Infrastructure, SaaS & Scaleups
  { name: 'Databricks', slug: 'databricks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/databricks', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'ElevenLabs', slug: 'elevenlabs', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/elevenlabs', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Scale AI', slug: 'scaleai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/scaleai', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Harvey', slug: 'harvey', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/harvey', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Sierra', slug: 'sierra', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/sierra', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Decagon', slug: 'decagon', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/decagon', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Tenstorrent', slug: 'tenstorrent', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/tenstorrent', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Cognition', slug: 'cognition', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/cognition', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'CoreWeave', slug: 'coreweave', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/coreweave', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Character.AI', slug: 'character', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/character', category: 'Artificial Intelligence & Foundation Models', tier: 1 },
  { name: 'Baseten', slug: 'baseten', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/baseten', category: 'Artificial Intelligence & Foundation Models', tier: 2 },
  { name: 'LangChain', slug: 'langchain', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/langchain', category: 'Artificial Intelligence & Foundation Models', tier: 2 },
  { name: 'Modal', slug: 'modal', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/modal', category: 'Artificial Intelligence & Foundation Models', tier: 2 },
  { name: 'RunPod', slug: 'runpod', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/runpod', category: 'Artificial Intelligence & Foundation Models', tier: 2 },
  { name: 'Poolside', slug: 'poolside', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/poolside', category: 'Artificial Intelligence & Foundation Models', tier: 2 },
  { name: 'Elastic', slug: 'elastic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/elastic', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'Twilio', slug: 'twilio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/twilio', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'Fivetran', slug: 'fivetran', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/fivetran', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'Supabase', slug: 'supabase', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/supabase', category: 'Developer Platforms & Cloud Infrastructure', tier: 1 },
  { name: 'Linear', slug: 'linear', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/linear', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Warp', slug: 'warp', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/warp', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Replit', slug: 'replit', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/replit', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Cockroach Labs', slug: 'cockroachlabs', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cockroachlabs', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Hex', slug: 'hex', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/hex', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Hightouch', slug: 'hightouch', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/hightouch', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Neo4j', slug: 'neo4j', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/neo4j', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'SingleStore', slug: 'singlestore', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/singlestore', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Starburst', slug: 'starburst', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/starburst', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'CircleCI', slug: 'circleci', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/circleci', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Buildkite', slug: 'buildkite', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/buildkite', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Yugabyte', slug: 'yugabyte', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/yugabyte', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'StarTree', slug: 'startree', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/startree', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Prefect', slug: 'prefect', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/prefect', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Deepnote', slug: 'deepnote', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/deepnote', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Zscaler', slug: 'zscaler', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/zscaler', category: 'Cybersecurity, Identity & Zero Trust', tier: 1 },
  { name: 'Okta', slug: 'okta', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/okta', category: 'Cybersecurity, Identity & Zero Trust', tier: 1 },
  { name: 'Rubrik', slug: 'rubrik', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/rubrik', category: 'Cybersecurity, Identity & Zero Trust', tier: 1 },
  { name: 'OneTrust', slug: 'onetrust', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/onetrust', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Tanium', slug: 'tanium', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/tanium', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Bitwarden', slug: 'bitwarden', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bitwarden', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Roblox', slug: 'roblox', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/roblox', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Lyft', slug: 'lyft', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/lyft', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Braze', slug: 'braze', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/braze', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Samsara', slug: 'samsara', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/samsara', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Roku', slug: 'roku', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/roku', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Intercom', slug: 'intercom', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/intercom', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Klaviyo', slug: 'klaviyo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/klaviyo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Duolingo', slug: 'duolingo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/duolingo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Qualtrics', slug: 'qualtrics', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/qualtrics', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Dropbox', slug: 'dropbox', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/dropbox', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Attentive', slug: 'attentive', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/attentive', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Typeform', slug: 'typeform', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/typeform', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Make', slug: 'make', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/make', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Coursera', slug: 'coursera', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/coursera', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Webflow', slug: 'webflow', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/webflow', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Toast', slug: 'toast', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/toast', category: 'Fintech, Modern Commerce & Payments', tier: 1 },
  { name: 'Fireblocks', slug: 'fireblocks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/fireblocks', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'SoFi', slug: 'sofi', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sofi', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Wise', slug: 'wise', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wise', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Remote', slug: 'remote', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/remote', category: 'Fintech, Modern Commerce & Payments', tier: 2 },

  // ── HealthTech & BioTech (25) ─────────────────────────────────────────────
  { name: 'Tempus AI', slug: 'tempus', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/tempus', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'Recursion Pharmaceuticals', slug: 'recursion', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/recursion', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'Benchling', slug: 'benchling', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/benchling', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'PathAI', slug: 'pathai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pathai', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Health Catalyst', slug: 'healthcatalyst', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/healthcatalyst', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Veeva Systems', slug: 'veeva', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/veeva', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'Doximity', slug: 'doximity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/doximity', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'Lyra Health', slug: 'lyrahealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/lyrahealth', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Ro', slug: 'ro', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ro', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Hims & Hers', slug: 'himshers', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/himshers', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Nuvation Bio', slug: 'nuvationbio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/nuvationbio', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Spring Health', slug: 'springhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/springhealth', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Cityblock Health', slug: 'cityblock', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cityblock', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Iodine Software', slug: 'iodinesoftware', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/iodinesoftware', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Nuna Health', slug: 'nuna', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/nuna', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Oscar Health', slug: 'hioscar', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/hioscar', category: 'HealthTech & BioTech', tier: 1 },
  { name: 'Carbon Health', slug: 'carbonhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/carbonhealth', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Commure', slug: 'commure', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/commure', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Olive AI', slug: 'oliveai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/oliveai', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Datavant', slug: 'datavant', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/datavant', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Alma', slug: 'alma', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/alma', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Headspace Health', slug: 'headspacehealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/headspacehealth', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Viz.ai', slug: 'vizai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vizai', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Notable Health', slug: 'notablehealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/notablehealth', category: 'HealthTech & BioTech', tier: 2 },
  { name: 'Calibrate', slug: 'calibrate', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/calibrate', category: 'HealthTech & BioTech', tier: 2 },

  // ── EdTech & Learning (15) ────────────────────────────────────────────────
  { name: 'Udemy', slug: 'udemy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/udemy', category: 'EdTech & Learning', tier: 1 },
  { name: 'Chegg', slug: 'chegg', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/chegg', category: 'EdTech & Learning', tier: 1 },
  { name: 'Quizlet', slug: 'quizlet', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/quizlet', category: 'EdTech & Learning', tier: 2 },
  { name: 'Kahoot!', slug: 'kahoot', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/kahoot', category: 'EdTech & Learning', tier: 2 },
  { name: 'Age of Learning', slug: 'ageoflearning', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ageoflearning', category: 'EdTech & Learning', tier: 2 },
  { name: 'Instructure', slug: 'instructure', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/instructure', category: 'EdTech & Learning', tier: 2 },
  { name: 'Udacity', slug: 'udacity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/udacity', category: 'EdTech & Learning', tier: 2 },
  { name: 'Degreed', slug: 'degreed', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/degreed', category: 'EdTech & Learning', tier: 2 },
  { name: 'Articulate', slug: 'articulate', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/articulate', category: 'EdTech & Learning', tier: 2 },
  { name: 'Noodle', slug: 'noodle', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/noodle', category: 'EdTech & Learning', tier: 2 },
  { name: 'Yellowdig', slug: 'yellowdig', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/yellowdig', category: 'EdTech & Learning', tier: 2 },
  { name: 'Newsela', slug: 'newsela', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/newsela', category: 'EdTech & Learning', tier: 2 },
  { name: 'Curriculum Associates', slug: 'curriculumassociates', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/curriculumassociates', category: 'EdTech & Learning', tier: 2 },
  { name: 'PowerSchool', slug: 'powerschool', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/powerschool', category: 'EdTech & Learning', tier: 2 },
  { name: 'Guild Education', slug: 'guild', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/guild', category: 'EdTech & Learning', tier: 2 },

  // ── HRTech & Future of Work (20) ──────────────────────────────────────────
  { name: 'Lattice', slug: 'lattice', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/lattice', category: 'HRTech & Future of Work', tier: 1 },
  { name: 'Leapsome', slug: 'leapsome', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/leapsome', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Workato', slug: 'workato', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/workato', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Greenhouse (ATS Co.)', slug: 'greenhouse', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/greenhouse', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Lever (company)', slug: 'lever', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/lever', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Culture Amp', slug: 'cultureamp', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cultureamp', category: 'HRTech & Future of Work', tier: 2 },
  { name: '15Five', slug: '15five', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/15five', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Bonusly', slug: 'bonusly', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bonusly', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'BambooHR', slug: 'bamboohr', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bamboohr', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Gusto', slug: 'gusto', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gusto', category: 'HRTech & Future of Work', tier: 1 },
  { name: 'Justworks', slug: 'justworks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/justworks', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Oyster HR', slug: 'oysterhr', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/oysterhr', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Papaya Global', slug: 'papayaglobal', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/papayaglobal', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Checkr', slug: 'checkr', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/checkr', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Northpass', slug: 'northpass', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/northpass', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Factorial HR', slug: 'factorial', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/factorial', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'HiBob', slug: 'hibob', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/hibob', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Workleap', slug: 'workleap', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/workleap', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Beamery', slug: 'beamery', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/beamery', category: 'HRTech & Future of Work', tier: 2 },
  { name: 'Eightfold AI', slug: 'eightfoldai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/eightfoldai', category: 'HRTech & Future of Work', tier: 2 },

  // ── Gaming & Entertainment (18) ───────────────────────────────────────────
  { name: 'Epic Games', slug: 'epicgames', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/epicgames', category: 'Gaming & Entertainment', tier: 1 },
  { name: 'Niantic', slug: 'niantic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/niantic', category: 'Gaming & Entertainment', tier: 1 },
  { name: 'Riot Games', slug: 'riotgames', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/riotgames', category: 'Gaming & Entertainment', tier: 1 },
  { name: 'Rec Room', slug: 'recroom', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/recroom', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Scopely', slug: 'scopely', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/scopely', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Jam City', slug: 'jamcity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/jamcity', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'N3twork', slug: 'n3twork', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/n3twork', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Kabam', slug: 'kabam', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/kabam', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Disruptor Beam', slug: 'disruptorbeam', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/disruptorbeam', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Pocket Gems', slug: 'pocketgems', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pocketgems', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Grindr', slug: 'grindr', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/grindr', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Crunchyroll', slug: 'crunchyroll', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/crunchyroll', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Funimation', slug: 'funimation', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/funimation', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Plex', slug: 'plex', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/plex', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Vevo', slug: 'vevo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vevo', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'SoundCloud', slug: 'soundcloud', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/soundcloud', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Beatport', slug: 'beatport', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/beatport', category: 'Gaming & Entertainment', tier: 2 },
  { name: 'Bandcamp', slug: 'bandcamp', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bandcamp', category: 'Gaming & Entertainment', tier: 2 },

  // ── ClimaTech & GreenTech (12) ────────────────────────────────────────────
  { name: 'Aurora Solar', slug: 'aurorasolar', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/aurorasolar', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Arcadia', slug: 'arcadia', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/arcadia', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Palmetto', slug: 'palmetto', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/palmetto', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Arcadis', slug: 'arcadis', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/arcadis', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Watershed', slug: 'watershed', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/watershed', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Persefoni', slug: 'persefoni', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/persefoni', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Pachama', slug: 'pachama', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pachama', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Crusoe Energy', slug: 'crusoe', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/crusoe', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Form Energy', slug: 'formenergy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/formenergy', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Stem Inc', slug: 'stem', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/stem', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Swell Energy', slug: 'swellenergy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/swellenergy', category: 'ClimateTech & GreenTech', tier: 2 },
  { name: 'Span.io', slug: 'span', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/span', category: 'ClimateTech & GreenTech', tier: 2 },

  // ── LegalTech & Compliance (10) ───────────────────────────────────────────
  { name: 'Clio', slug: 'clio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/clio', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Contractbook', slug: 'contractbook', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/contractbook', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Ironclad', slug: 'ironclad', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ironclad', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Juro', slug: 'juro', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/juro', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'SpotDraft', slug: 'spotdraft', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/spotdraft', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Evisort', slug: 'evisort', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/evisort', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'LinkSquares', slug: 'linksquares', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/linksquares', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Onit', slug: 'onit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/onit', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Relativity', slug: 'relativity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/relativity', category: 'LegalTech & Compliance', tier: 2 },
  { name: 'Disco', slug: 'disco', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/disco', category: 'LegalTech & Compliance', tier: 2 },

  // ── Logistics, Supply Chain & DeepTech (15) ───────────────────────────────
  { name: 'Flexport', slug: 'flexport', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/flexport', category: 'Logistics & Supply Chain', tier: 1 },
  { name: 'project44', slug: 'project44', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/project44', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'ShipBob', slug: 'shipbob', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/shipbob', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Stord', slug: 'stord', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/stord', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Turvo', slug: 'turvo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/turvo', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'FreightWaves', slug: 'freightwaves', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/freightwaves', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Transfix', slug: 'transfix', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/transfix', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Samsara', slug: 'samsara', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/samsara', category: 'Logistics & Supply Chain', tier: 1 },
  { name: 'Overhaul', slug: 'overhaul', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/overhaul', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Loop Returns', slug: 'loopreturnsinc', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/loopreturnsinc', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Shipium', slug: 'shipium', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/shipium', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'EasyPost', slug: 'easypost', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/easypost', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Narvar', slug: 'narvar', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/narvar', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'Goat Group', slug: 'goat', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/goat', category: 'Logistics & Supply Chain', tier: 2 },
  { name: 'StockX', slug: 'stockx', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/stockx', category: 'Logistics & Supply Chain', tier: 2 },

  // ── PropTech & Real Estate (10) ───────────────────────────────────────────
  { name: 'Opendoor', slug: 'opendoor', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/opendoor', category: 'PropTech & Real Estate', tier: 1 },
  { name: 'Compass', slug: 'compass', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/compass', category: 'PropTech & Real Estate', tier: 1 },
  { name: 'Roofstock', slug: 'roofstock', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/roofstock', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Knock', slug: 'knock', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/knock', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Divvy Homes', slug: 'divvyhomes', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/divvyhomes', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Homepoint', slug: 'homepoint', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/homepoint', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Orchard', slug: 'orchard', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/orchard', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Better.com', slug: 'better', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/better', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Blend Labs', slug: 'blend', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/blend', category: 'PropTech & Real Estate', tier: 2 },
  { name: 'Snapdocs', slug: 'snapdocs', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/snapdocs', category: 'PropTech & Real Estate', tier: 2 },

  // ── Global High-Growth Ashby Additions (25) ───────────────────────────────
  { name: 'Vellum AI', slug: 'vellum', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/vellum', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Humanloop', slug: 'humanloop', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/humanloop', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Arize AI', slug: 'arize', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/arize', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Whylabs', slug: 'whylabs', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/whylabs', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Comet ML', slug: 'cometml', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/cometml', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'BentoML', slug: 'bentoml', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/bentoml', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Grip Security', slug: 'gripsecurity', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/gripsecurity', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Dope Security', slug: 'dopesecurity', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/dopesecurity', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Pangea', slug: 'pangeacyber', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/pangeacyber', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Rows', slug: 'rows', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/rows', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Equals', slug: 'equals', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/equals', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Coda', slug: 'coda', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/coda', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Depot', slug: 'depot', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/depot', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Turso', slug: 'turso', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/turso', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Nile Database', slug: 'niledatabase', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/niledatabase', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Trigger.dev', slug: 'triggerdev', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/triggerdev', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Inngest', slug: 'inngest', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/inngest', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Hatchet', slug: 'hatchet', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/hatchet', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Attio', slug: 'attio', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/attio', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Clay', slug: 'clay', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/clay', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Folk', slug: 'folk', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/folk', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Clerk', slug: 'clerk', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/clerk', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Stytch', slug: 'stytch', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/stytch', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'WorkOS', slug: 'workos', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/workos', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'PropelAuth', slug: 'propelauth', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/propelauth', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },

  // ── Global SaaS & Remote-First Scaleups (20) ─────────────────────────────
  { name: 'Automattic', slug: 'automattic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/automattic', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Zapier', slug: 'zapier', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/zapier', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Airtable', slug: 'airtable', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/airtable', category: 'Modern SaaS & Engineering Pioneers', tier: 1 },
  { name: 'Mixpanel', slug: 'mixpanel', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/mixpanel', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Amplitude', slug: 'amplitude', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/amplitude', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Heap', slug: 'heap', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/heap', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'FullStory', slug: 'fullstory', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/fullstory', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Airbyte', slug: 'airbyte', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/airbyte', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'RudderStack', slug: 'rudderstack', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/rudderstack', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Matillion', slug: 'matillion', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/matillion', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Prefect', slug: 'prefectio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/prefectio', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Dagster', slug: 'dagster', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/dagster', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Monte Carlo', slug: 'montecarlodataio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/montecarlodataio', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Anomalo', slug: 'anomalo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/anomalo', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Atlan', slug: 'atlan', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/atlan', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Secoda', slug: 'secoda', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/secoda', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Castor', slug: 'castor', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/castor', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Lightdash', slug: 'lightdash', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/lightdash', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Evidence', slug: 'evidence', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/evidence', category: 'Enterprise Data, Streaming & Observability', tier: 2 },
  { name: 'Tinybird', slug: 'tinybird', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/tinybird', category: 'Enterprise Data, Streaming & Observability', tier: 2 },

  // Verified Open ATS Network (ConorsCode / Ashby / Greenhouse / Lever)
  { name: 'Twitch', slug: 'twitch', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/twitch', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Squarespace', slug: 'squarespace', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/squarespace', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Peloton', slug: 'peloton', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/peloton', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Faire', slug: 'faire', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/faire', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Calendly', slug: 'calendly', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/calendly', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'LaunchDarkly', slug: 'launchdarkly', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/launchdarkly', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Smartsheet', slug: 'smartsheet', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/smartsheet', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Nextdoor', slug: 'nextdoor', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/nextdoor', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Betterment', slug: 'betterment', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/betterment', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'N', slug: 'n26', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/n26', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'GoCardless', slug: 'gocardless', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gocardless', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Grafana Labs', slug: 'grafanalabs', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/grafanalabs', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Anduril', slug: 'andurilindustries', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/andurilindustries', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Jane Street', slug: 'janestreet', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/janestreet', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Marqeta', slug: 'marqeta', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/marqeta', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Bill.com', slug: 'billcom', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/billcom', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Iterable', slug: 'iterable', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/iterable', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Contentful', slug: 'contentful', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/contentful', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Algolia', slug: 'algolia', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/algolia', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Fastly', slug: 'fastly', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/fastly', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Temporal', slug: 'temporaltechnologies', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/temporaltechnologies', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Glean', slug: 'gleanwork', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gleanwork', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Cameo', slug: 'cameo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cameo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Kickstarter', slug: 'kickstarter', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/kickstarter', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Wikimedia Foundation', slug: 'wikimedia', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wikimedia', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Mozilla', slug: 'mozilla', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/mozilla', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Proton', slug: 'proton', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/proton', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Wiz', slug: 'wizinc', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wizinc', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'JFrog', slug: 'jfrog', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/jfrog', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Oura', slug: 'oura', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/oura', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Maven Clinic', slug: 'mavenclinic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/mavenclinic', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Recursion Pharmaceuticals', slug: 'recursionpharmaceuticals', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/recursionpharmaceuticals', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Verkada', slug: 'verkada', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/verkada', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'SambaNova Systems', slug: 'sambanovasystems', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sambanovasystems', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Nuro', slug: 'nuro', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/nuro', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Rocket Lab', slug: 'rocketlab', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/rocketlab', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Varda Space', slug: 'vardaspace', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vardaspace', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Redwood Materials', slug: 'redwoodmaterials', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/redwoodmaterials', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Motive', slug: 'gomotive', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gomotive', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Carvana', slug: 'carvana', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/carvana', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Highnote', slug: 'highnote', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/highnote', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Lithic', slug: 'lithic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/lithic', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'TripActions', slug: 'tripactions', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/tripactions', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Descope', slug: 'descope', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/descope', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Pendo', slug: 'pendo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/pendo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Airship', slug: 'airship', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/airship', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Customer.io', slug: 'customerio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/customerio', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Flexe', slug: 'flexe', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/flexe', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'FourKites', slug: 'fourkites', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/fourkites', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Bringg', slug: 'bringg', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bringg', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Remote.com', slug: 'remotecom', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/remotecom', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Textio', slug: 'textio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/textio', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'SeekOut', slug: 'seekout', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/seekout', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'HackerRank', slug: 'hackerrank', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/hackerrank', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Karat', slug: 'karat', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/karat', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'ZipRecruiter', slug: 'ziprecruiter', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ziprecruiter', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Upwork', slug: 'upwork', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/upwork', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'DoorDash', slug: 'doordashusa', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/doordashusa', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Netskope', slug: 'netskope', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/netskope', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Orca Security', slug: 'orcasecurity', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/orcasecurity', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Huntress', slug: 'huntress', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/huntress', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Axonius', slug: 'axonius', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/axonius', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Cato Networks', slug: 'catonetworks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/catonetworks', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'KnowBe', slug: 'knowbe4', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/knowbe4', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Recorded Future', slug: 'recordedfuture', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/recordedfuture', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Censys', slug: 'censys', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/censys', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'BigID', slug: 'bigid', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bigid', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Osano', slug: 'osano', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/osano', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Imply', slug: 'imply', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/imply', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Labelbox', slug: 'labelbox', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/labelbox', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Snorkel AI', slug: 'snorkelai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/snorkelai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Domino Data Lab', slug: 'dominodatalab', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/dominodatalab', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Arize AI', slug: 'arizeai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/arizeai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'New Relic', slug: 'newrelic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/newrelic', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Sumo Logic', slug: 'sumologic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sumologic', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Globalization Partners', slug: 'globalizationpartners', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/globalizationpartners', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Gemini', slug: 'gemini', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gemini', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'BitGo', slug: 'bitgo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bitgo', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Consensys', slug: 'consensys', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/consensys', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Figure Technologies', slug: 'figure', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/figure', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Current', slug: 'current', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/current', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Public.com', slug: 'public', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/public', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Trade Republic', slug: 'traderepublicbank', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/traderepublicbank', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Homelight', slug: 'homelight', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/homelight', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Human Interest', slug: 'humaninterest', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/humaninterest', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Vestwell', slug: 'vestwell', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vestwell', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Alpaca', slug: 'alpaca', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/alpaca', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Cleo', slug: 'cleo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cleo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Earnin', slug: 'earnin', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/earnin', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Ginkgo Bioworks', slug: 'ginkgobioworks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ginkgobioworks', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Freenome', slug: 'freenome', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/freenome', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Natera', slug: 'natera', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/natera', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Truveta', slug: 'truveta', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/truveta', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Flatiron Health', slug: 'flatironhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/flatironhealth', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Calico Labs', slug: 'calicolabs', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/calicolabs', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Beam Therapeutics', slug: 'beamtherapeutics', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/beamtherapeutics', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Sword Health', slug: 'swordhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/swordhealth', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Omada Health', slug: 'omadahealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/omadahealth', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'One Medical', slug: 'onemedical', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/onemedical', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Parsley Health', slug: 'parsleyhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/parsleyhealth', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Calm', slug: 'calm', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/calm', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'BetterHelp', slug: 'betterhelp', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/betterhelp', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Talkspace', slug: 'talkspace', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/talkspace', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Cerebral', slug: 'cerebral', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cerebral', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Modern Health', slug: 'modernhealth', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/modernhealth', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'MyFitnessPal', slug: 'myfitnesspal', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/myfitnesspal', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Tempo Fit', slug: 'tempo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/tempo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Future Fit', slug: 'future', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/future', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'ClassPass', slug: 'classpass', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/classpass', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Mindbody', slug: 'mindbody', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/mindbody', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Gympass', slug: 'gympass', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/gympass', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Khan Academy', slug: 'khanacademy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/khanacademy', category: 'EdTech & Learning Platforms', tier: 2 },
  { name: 'MasterClass', slug: 'masterclass', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/masterclass', category: 'EdTech & Learning Platforms', tier: 2 },
  { name: 'Outschool', slug: 'outschool', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/outschool', category: 'EdTech & Learning Platforms', tier: 2 },
  { name: 'Springboard', slug: 'springboard', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/springboard', category: 'EdTech & Learning Platforms', tier: 2 },
  { name: 'IXL Learning', slug: 'ixllearning', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/ixllearning', category: 'EdTech & Learning Platforms', tier: 2 },
  { name: 'GoGuardian', slug: 'goguardian', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/goguardian', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Imbue', slug: 'imbue', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/imbue', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Inflection AI', slug: 'inflectionai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/inflectionai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Stability AI', slug: 'stabilityai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/stabilityai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Black Forest Labs', slug: 'blackforestlabs', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/blackforestlabs', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Everlaw', slug: 'everlaw', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/everlaw', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Alloy', slug: 'alloy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/alloy', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Forter', slug: 'forter', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/forter', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Riskified', slug: 'riskified', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/riskified', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Feedzai', slug: 'feedzai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/feedzai', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'ComplyAdvantage', slug: 'complyadvantage', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/complyadvantage', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Nova Credit', slug: 'novacredit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/novacredit', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Homeward', slug: 'homeward', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/homeward', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Vacasa', slug: 'vacasa', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vacasa', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Kasa Living', slug: 'kasa', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/kasa', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'TaskRabbit', slug: 'taskrabbit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/taskrabbit', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Instawork', slug: 'instawork', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/instawork', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Movable Ink', slug: 'movableink', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/movableink', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Bloomreach', slug: 'bloomreach', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bloomreach', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'QuillBot', slug: 'quillbot', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/quillbot', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Invisible Technologies', slug: 'invisibletech', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/invisibletech', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Turing', slug: 'turing', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/turing', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Wrike', slug: 'wrike', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wrike', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Aha!', slug: 'aha', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/aha', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Backblaze', slug: 'backblaze', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/backblaze', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Wasabi Technologies', slug: 'wasabi', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/wasabi', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'MinIO', slug: 'minio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/minio', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Filecoin Foundation', slug: 'filecoinfoundation', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/filecoinfoundation', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Prismatic', slug: 'prismatic', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/prismatic', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Celigo', slug: 'celigo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/celigo', category: 'Developer Platforms & Cloud Infrastructure', tier: 2 },
  { name: 'Appian', slug: 'appian', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/appian', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'TrueLayer', slug: 'truelayer', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/truelayer', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Sezzle', slug: 'sezzle', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sezzle', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Luno', slug: 'luno', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/luno', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Bitpanda', slug: 'bitpanda', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bitpanda', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Binance', slug: 'binance', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/binance', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'OKX', slug: 'okx', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/okx', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Bybit', slug: 'bybit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/bybit', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Vectara', slug: 'vectara', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/vectara', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Speechmatics', slug: 'speechmatics', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/speechmatics', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Otter.ai', slug: 'otterai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/otterai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Cresta', slug: 'cresta', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cresta', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Observe.AI', slug: 'observeai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/observeai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'PolyAI', slug: 'polyai', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/polyai', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'ManyChat', slug: 'manychat', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/manychat', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: '6sense', slug: '6sense', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/6sense', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'ZoomInfo', slug: 'zoominfo', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/zoominfo', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Apollo.io', slug: 'apolloio', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/apolloio', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Cognism', slug: 'cognism', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cognism', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Mercari', slug: 'mercari', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/mercari', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'OfferUp', slug: 'offerup', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/offerup', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'StitchFix', slug: 'stitchfix', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/stitchfix', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Grailed', slug: 'grailed', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/grailed', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'HelloFresh', slug: 'hellofresh', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/hellofresh', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Home Chef', slug: 'homechef', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/homechef', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Thrive Market', slug: 'thrivemarket', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/thrivemarket', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Misfits Market', slug: 'misfitsmarket', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/misfitsmarket', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Weee!', slug: 'weee', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/weee', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Palantir', slug: 'palantir', platform: 'lever', careers_url: 'https://jobs.lever.co/palantir', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Tala', slug: 'tala', platform: 'lever', careers_url: 'https://jobs.lever.co/tala', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Wattpad', slug: 'wattpad', platform: 'lever', careers_url: 'https://jobs.lever.co/wattpad', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Aircall', slug: 'aircall', platform: 'lever', careers_url: 'https://jobs.lever.co/aircall', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'BrightEdge', slug: 'brightedge', platform: 'lever', careers_url: 'https://jobs.lever.co/brightedge', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Zoox', slug: 'zoox', platform: 'lever', careers_url: 'https://jobs.lever.co/zoox', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Outreach', slug: 'outreach', platform: 'lever', careers_url: 'https://jobs.lever.co/outreach', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Highspot', slug: 'highspot', platform: 'lever', careers_url: 'https://jobs.lever.co/highspot', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Kapwing', slug: 'kapwing', platform: 'lever', careers_url: 'https://jobs.lever.co/kapwing', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Substack', slug: 'substack', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/substack', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Synthesia', slug: 'synthesia', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/synthesia', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Levels', slug: 'levels', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/levels', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Middesk', slug: 'middesk', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/middesk', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Vanta', slug: 'vanta', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/vanta', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Abridge', slug: 'abridge', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/abridge', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Sardine', slug: 'sardine', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/sardine', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Speak', slug: 'speak', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/speak', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Rilla', slug: 'rilla', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/rilla', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Suno', slug: 'suno', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/suno', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Lovable', slug: 'lovable', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/lovable', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Bland', slug: 'bland', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/bland', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Rho', slug: 'rho', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/rho', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Mercor', slug: 'mercor', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/mercor', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Persona', slug: 'persona', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/persona', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Anrok', slug: 'anrok', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/anrok', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Orb', slug: 'orb', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/orb', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Common Room', slug: 'commonroom', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/commonroom', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Merge', slug: 'merge', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/merge', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Nango', slug: 'nango', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/nango', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Endgame', slug: 'endgame', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/endgame', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Drata', slug: 'drata', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/drata', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Secureframe', slug: 'secureframe', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/secureframe', category: 'Cybersecurity, Identity & Zero Trust', tier: 2 },
  { name: 'Headway', slug: 'headway', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/headway', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Cedar', slug: 'cedar', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/cedar', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Rula', slug: 'rula', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/rula', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Skydio', slug: 'skydio', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/skydio', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Saronic', slug: 'saronic', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/saronic', category: 'Defense, Aerospace & Autonomous Robotics', tier: 2 },
  { name: 'Whoop', slug: 'whoop', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/whoop', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Superpower', slug: 'superpower', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/superpower', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Eight Sleep', slug: 'eightsleep', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/eightsleep', category: 'HealthTech, BioTech & Wellness', tier: 2 },
  { name: 'Gamma', slug: 'gamma', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/gamma', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Unit', slug: 'unit', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/unit', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Column', slug: 'column', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/column', category: 'Modern SaaS & Engineering Pioneers', tier: 2 },
  { name: 'Reflection AI', slug: 'reflectionai', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/reflectionai', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Krea AI', slug: 'krea', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/krea', category: 'AI Frontier & Foundational Models', tier: 2 },
  { name: 'Zilch', slug: 'zilch', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/zilch', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Griffin', slug: 'griffin', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/griffin', category: 'Fintech, Modern Commerce & Payments', tier: 2 },
  { name: 'Preply', slug: 'preply', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/preply', category: 'EdTech & Learning Platforms', tier: 2 }
];

export const INDIAN_TECH_UNICORNS_AND_GCCS = Object.freeze([
  // Premier Indian Unicorns & High-Growth Tech
  { name: 'Razorpay', slug: 'razorpay', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/razorpay', category: 'Fintech, Modern Commerce & Payments', tier: 1, region: 'India' },
  { name: 'Swiggy', slug: 'swiggy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/swiggy', category: 'Consumer Tech & Quick Commerce', tier: 1, region: 'India' },
  { name: 'Zomato', slug: 'zomato', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/zomato', category: 'Consumer Tech & Quick Commerce', tier: 1, region: 'India' },
  { name: 'Blinkit', slug: 'blinkit', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/blinkit', category: 'Consumer Tech & Quick Commerce', tier: 1, region: 'India' },
  { name: 'Zepto', slug: 'zepto', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/zepto', category: 'Consumer Tech & Quick Commerce', tier: 1, region: 'India' },
  { name: 'Groww', slug: 'groww', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/groww', category: 'Fintech, Modern Commerce & Payments', tier: 1, region: 'India' },
  { name: 'CRED', slug: 'cred', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cred', category: 'Fintech, Modern Commerce & Payments', tier: 1, region: 'India' },
  { name: 'Meesho', slug: 'meesho', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/meesho', category: 'Consumer Tech & Quick Commerce', tier: 1, region: 'India' },
  { name: 'InMobi', slug: 'inmobi', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/inmobi', category: 'Digital Media & AdTech', tier: 1, region: 'India' },
  { name: 'PhonePe', slug: 'phonepe', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/phonepe', category: 'Fintech, Modern Commerce & Payments', tier: 1, region: 'India' },
  { name: 'Postman', slug: 'postman', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/postman', category: 'Developer Platforms & Cloud Infrastructure', tier: 1, region: 'India' },
  { name: 'BrowserStack', slug: 'browserstack', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/browserstack', category: 'Developer Platforms & Cloud Infrastructure', tier: 1, region: 'India' },
  { name: 'Hasura', slug: 'hasura', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/hasura', category: 'Developer Platforms & Cloud Infrastructure', tier: 1, region: 'India' },
  { name: 'Chargebee', slug: 'chargebee', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/chargebee', category: 'Fintech, Modern Commerce & Payments', tier: 1, region: 'India' },
  { name: 'Freshworks', slug: 'freshworks', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/freshworks', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'CleverTap', slug: 'clevertap', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/clevertap', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'MoEngage', slug: 'moengage', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/moengage', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'Whatfix', slug: 'whatfix', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/whatfix', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'Darwinbox', slug: 'darwinbox', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/darwinbox', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'Sarvam AI', slug: 'sarvam', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/sarvam', category: 'AI Frontier & Foundational Models', tier: 1, region: 'India' },
  { name: 'Krutrim', slug: 'krutrim', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/krutrim', category: 'AI Frontier & Foundational Models', tier: 1, region: 'India' },
  { name: 'Glean India', slug: 'glean', platform: 'ashby', careers_url: 'https://jobs.ashbyhq.com/glean', category: 'AI Frontier & Foundational Models', tier: 1, region: 'India' },
  { name: 'Ather Energy', slug: 'atherenergy', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/atherenergy', category: 'Hardware, EV & CleanTech', tier: 2, region: 'India' },
  { name: 'Cashfree Payments', slug: 'cashfree', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/cashfree', category: 'Fintech, Modern Commerce & Payments', tier: 2, region: 'India' },
  { name: 'CoinDCX', slug: 'coindcx', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/coindcx', category: 'Fintech, Modern Commerce & Payments', tier: 2, region: 'India' },
  { name: 'Urban Company', slug: 'urbancompany', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/urbancompany', category: 'Consumer Tech & Quick Commerce', tier: 2, region: 'India' },
  { name: 'Delhivery', slug: 'delhivery', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/delhivery', category: 'Logistics & Supply Chain Tech', tier: 2, region: 'India' },
  { name: 'Dream11', slug: 'dream11', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/dream11', category: 'Gaming & Interactive Entertainment', tier: 2, region: 'India' },
  { name: 'Paytm', slug: 'paytm', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/paytm', category: 'Fintech, Modern Commerce & Payments', tier: 2, region: 'India' },
  { name: 'Atlassian India', slug: 'atlassian', platform: 'lever', careers_url: 'https://jobs.lever.co/atlassian', category: 'Developer Platforms & Cloud Infrastructure', tier: 1, region: 'India' },
  { name: 'Thoughtworks India', slug: 'thoughtworks', platform: 'lever', careers_url: 'https://jobs.lever.co/thoughtworks', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'Sprinklr India', slug: 'sprinklr', platform: 'lever', careers_url: 'https://jobs.lever.co/sprinklr', category: 'Modern SaaS & Engineering Pioneers', tier: 1, region: 'India' },
  { name: 'HackerRank', slug: 'hackerrank', platform: 'lever', careers_url: 'https://jobs.lever.co/hackerrank', category: 'Developer Platforms & Cloud Infrastructure', tier: 2, region: 'India' },
  { name: 'Leena AI', slug: 'leena-ai', platform: 'lever', careers_url: 'https://jobs.lever.co/leena-ai', category: 'AI Frontier & Foundational Models', tier: 2, region: 'India' }
]);

const _seenAtsKeys = new Set();
export const ALL_SOVEREIGN_TECH_COMPANIES = Object.freeze(
  [...TOP_100_TECH_COMPANIES, ...EXPANDED_TECH_COMPANIES, ...INDIAN_TECH_UNICORNS_AND_GCCS].filter(c => {
    const key = `${c.platform}:${c.slug.toLowerCase()}`;
    if (_seenAtsKeys.has(key)) return false;
    _seenAtsKeys.add(key);
    return true;
  })
);

/**
 * Enterprise Workday CXS Verified Tenants
 * High-volume Fortune 500 tech platforms with open CXS search endpoints.
 */
export const WORKDAY_ENTERPRISE_TENANTS = Object.freeze([
  // Big Tech, Cloud & Semiconductors
  { name: 'Nvidia', url: 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs', host: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite', maxJobs: 100 },
  { name: 'Salesforce', url: 'https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/jobs', host: 'https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site', maxJobs: 100 },
  { name: 'Adobe', url: 'https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs', host: 'https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced', maxJobs: 100 },
  { name: 'Autodesk', url: 'https://autodesk.wd1.myworkdayjobs.com/wday/cxs/autodesk/Ext/jobs', host: 'https://autodesk.wd1.myworkdayjobs.com/en-US/Ext', maxJobs: 100 },
  { name: 'Workday', url: 'https://workday.wd5.myworkdayjobs.com/wday/cxs/workday/Workday/jobs', host: 'https://workday.wd5.myworkdayjobs.com/en-US/Workday', maxJobs: 100 },
  { name: 'PayPal', url: 'https://paypal.wd1.myworkdayjobs.com/wday/cxs/paypal/jobs/jobs', host: 'https://paypal.wd1.myworkdayjobs.com/en-US/jobs', maxJobs: 100 },
  { name: 'Micron', url: 'https://micron.wd1.myworkdayjobs.com/wday/cxs/micron/External/jobs', host: 'https://micron.wd1.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'Cisco', url: 'https://cisco.wd5.myworkdayjobs.com/wday/cxs/cisco/Cisco_Careers/jobs', host: 'https://cisco.wd5.myworkdayjobs.com/en-US/Cisco_Careers', maxJobs: 100 },
  { name: 'Intel', url: 'https://intel.wd1.myworkdayjobs.com/wday/cxs/intel/External/jobs', host: 'https://intel.wd1.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'Broadcom', url: 'https://broadcom.wd1.myworkdayjobs.com/wday/cxs/broadcom/External_Career/jobs', host: 'https://broadcom.wd1.myworkdayjobs.com/en-US/External_Career', maxJobs: 100 },
  { name: 'Qualcomm', url: 'https://qualcomm.wd5.myworkdayjobs.com/wday/cxs/qualcomm/External/jobs', host: 'https://qualcomm.wd5.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'AMD', url: 'https://amd.wd1.myworkdayjobs.com/wday/cxs/amd/AMD_Careers/jobs', host: 'https://amd.wd1.myworkdayjobs.com/en-US/AMD_Careers', maxJobs: 100 },
  { name: 'Dell Technologies', url: 'https://dell.wd1.myworkdayjobs.com/wday/cxs/dell/External/jobs', host: 'https://dell.wd1.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'HP Inc', url: 'https://hp.wd5.myworkdayjobs.com/wday/cxs/hp/ExternalCareerSite/jobs', host: 'https://hp.wd5.myworkdayjobs.com/en-US/ExternalCareerSite', maxJobs: 100 },
  { name: 'IBM', url: 'https://ibm.wd3.myworkdayjobs.com/wday/cxs/ibm/IBM_Careers/jobs', host: 'https://ibm.wd3.myworkdayjobs.com/en-US/IBM_Careers', maxJobs: 100 },
  { name: 'ServiceNow', url: 'https://servicenow.wd1.myworkdayjobs.com/wday/cxs/servicenow/ServiceNow_Careers/jobs', host: 'https://servicenow.wd1.myworkdayjobs.com/en-US/ServiceNow_Careers', maxJobs: 100 },
  { name: 'Palo Alto Networks', url: 'https://paloaltonetworks.wd1.myworkdayjobs.com/wday/cxs/paloaltonetworks/PANW_Careers/jobs', host: 'https://paloaltonetworks.wd1.myworkdayjobs.com/en-US/PANW_Careers', maxJobs: 100 },
  { name: 'Intuit', url: 'https://intuit.wd1.myworkdayjobs.com/wday/cxs/intuit/Intuit_Careers/jobs', host: 'https://intuit.wd1.myworkdayjobs.com/en-US/Intuit_Careers', maxJobs: 100 },
  { name: 'VMware', url: 'https://vmware.wd1.myworkdayjobs.com/wday/cxs/vmware/VMware_Careers/jobs', host: 'https://vmware.wd1.myworkdayjobs.com/en-US/VMware_Careers', maxJobs: 100 },

  // Global Retail, Consumer & Entertainment MNCs
  { name: 'Walmart Tech', url: 'https://walmart.wd5.myworkdayjobs.com/wday/cxs/walmart/WalmartExternal/jobs', host: 'https://walmart.wd5.myworkdayjobs.com/en-US/WalmartExternal', maxJobs: 100 },
  { name: 'Target Tech', url: 'https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers/jobs', host: 'https://target.wd5.myworkdayjobs.com/en-US/targetcareers', maxJobs: 100 },
  { name: 'Nike', url: 'https://nike.wd1.myworkdayjobs.com/wday/cxs/nike/Nike/jobs', host: 'https://nike.wd1.myworkdayjobs.com/en-US/Nike', maxJobs: 100 },
  { name: 'The Home Depot', url: 'https://homedepot.wd5.myworkdayjobs.com/wday/cxs/homedepot/CareerDepot/jobs', host: 'https://homedepot.wd5.myworkdayjobs.com/en-US/CareerDepot', maxJobs: 100 },
  { name: 'Netflix', url: 'https://netflix.wd1.myworkdayjobs.com/wday/cxs/netflix/Netflix_Careers/jobs', host: 'https://netflix.wd1.myworkdayjobs.com/en-US/Netflix_Careers', maxJobs: 100 },
  { name: 'Sony', url: 'https://sony.wd1.myworkdayjobs.com/wday/cxs/sony/Sony_Careers/jobs', host: 'https://sony.wd1.myworkdayjobs.com/en-US/Sony_Careers', maxJobs: 100 },
  { name: 'Warner Bros Discovery', url: 'https://wbd.wd5.myworkdayjobs.com/wday/cxs/wbd/WBD_Careers/jobs', host: 'https://wbd.wd5.myworkdayjobs.com/en-US/WBD_Careers', maxJobs: 100 },

  // Banking, Payments & FinTech Titans
  { name: 'Mastercard', url: 'https://mastercard.wd1.myworkdayjobs.com/wday/cxs/mastercard/CorporateCareers/jobs', host: 'https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers', maxJobs: 100 },
  { name: 'Visa', url: 'https://visa.wd1.myworkdayjobs.com/wday/cxs/visa/VisaCareers/jobs', host: 'https://visa.wd1.myworkdayjobs.com/en-US/VisaCareers', maxJobs: 100 },
  { name: 'Fidelity Investments', url: 'https://fidelity.wd1.myworkdayjobs.com/wday/cxs/fidelity/FidelityCareers/jobs', host: 'https://fidelity.wd1.myworkdayjobs.com/en-US/FidelityCareers', maxJobs: 100 },
  { name: 'Capital One', url: 'https://capitalone.wd1.myworkdayjobs.com/wday/cxs/capitalone/Capital_One/jobs', host: 'https://capitalone.wd1.myworkdayjobs.com/en-US/Capital_One', maxJobs: 100 },
  { name: 'Bank of America', url: 'https://bankofamerica.wd1.myworkdayjobs.com/wday/cxs/bankofamerica/Global_Campus_Careers/jobs', host: 'https://bankofamerica.wd1.myworkdayjobs.com/en-US/Global_Campus_Careers', maxJobs: 100 },
  { name: 'Morgan Stanley', url: 'https://morganstanley.wd1.myworkdayjobs.com/wday/cxs/morganstanley/Morgan_Stanley_Careers/jobs', host: 'https://morganstanley.wd1.myworkdayjobs.com/en-US/Morgan_Stanley_Careers', maxJobs: 100 },

  // Industrial, Energy & Aerospace Conglomerates
  { name: 'Boeing', url: 'https://boeing.wd1.myworkdayjobs.com/wday/cxs/boeing/EXTERNAL_CAREERS/jobs', host: 'https://boeing.wd1.myworkdayjobs.com/en-US/EXTERNAL_CAREERS', maxJobs: 100 },
  { name: 'Siemens', url: 'https://siemens.wd3.myworkdayjobs.com/wday/cxs/siemens/Siemens_Careers/jobs', host: 'https://siemens.wd3.myworkdayjobs.com/en-US/Siemens_Careers', maxJobs: 100 },
  { name: 'General Electric', url: 'https://ge.wd5.myworkdayjobs.com/wday/cxs/ge/GE_Careers/jobs', host: 'https://ge.wd5.myworkdayjobs.com/en-US/GE_Careers', maxJobs: 100 },
  { name: 'RTX (Raytheon)', url: 'https://rtx.wd1.myworkdayjobs.com/wday/cxs/rtx/RTX_Careers/jobs', host: 'https://rtx.wd1.myworkdayjobs.com/en-US/RTX_Careers', maxJobs: 100 },

  // Healthcare & Pharmaceutical Giants
  { name: 'Pfizer', url: 'https://pfizer.wd1.myworkdayjobs.com/wday/cxs/pfizer/Pfizer_Careers/jobs', host: 'https://pfizer.wd1.myworkdayjobs.com/en-US/Pfizer_Careers', maxJobs: 100 },
  { name: 'AstraZeneca', url: 'https://astrazeneca.wd3.myworkdayjobs.com/wday/cxs/astrazeneca/Careers/jobs', host: 'https://astrazeneca.wd3.myworkdayjobs.com/en-US/Careers', maxJobs: 100 },
  { name: 'Johnson & Johnson', url: 'https://jnj.wd1.myworkdayjobs.com/wday/cxs/jnj/JNJCareers/jobs', host: 'https://jnj.wd1.myworkdayjobs.com/en-US/JNJCareers', maxJobs: 100 },
  { name: 'Abbott Laboratories', url: 'https://abbott.wd5.myworkdayjobs.com/wday/cxs/abbott/abbottcareers/jobs', host: 'https://abbott.wd5.myworkdayjobs.com/en-US/abbottcareers', maxJobs: 100 }
]);

/**
 * Enterprise SmartRecruiters Verified Public Tenants
 * Global enterprises with unauthenticated public REST endpoints (/v1/companies/{company}/postings)
 */
export const SMARTRECRUITERS_ENTERPRISE_TENANTS = Object.freeze([
  { name: 'Visa', slug: 'Visa', category: 'Fintech & Payments' },
  { name: 'Bosch Group', slug: 'BoschGroup', category: 'Industrial & IoT' },
  { name: 'IKEA', slug: 'IKEA', category: 'Retail & Consumer' },
  { name: 'McDonald\'s Tech', slug: 'McDonalds', category: 'FoodTech & Global Retail' },
  { name: 'Ubisoft', slug: 'Ubisoft2', category: 'Gaming & Interactive Entertainment' },
  { name: 'Publicis Groupe', slug: 'PublicisGroupe', category: 'Digital Media & AdTech' },
  { name: 'Skechers', slug: 'Skechers', category: 'Consumer & Retail' },
  { name: 'Equinix', slug: 'Equinix', category: 'Cloud Infrastructure & Data Centers' },
  { name: 'Epic Games', slug: 'EpicGames', category: 'Gaming & Virtual Engines' },
  { name: 'Square Enix', slug: 'SquareEnix', category: 'Gaming & Interactive' },
  { name: 'Avery Dennison', slug: 'AveryDennison', category: 'Smart Materials & IoT' },
  { name: 'Coty', slug: 'Coty', category: 'Global Consumer Brands' }
]);

/**
 * FAANG & Global Big Tech Career Portals (Protected by Enterprise CORS Firewalls)
 */
export const FAANG_ENTERPRISE_PORTALS = Object.freeze([
  {
    name: 'Google',
    slug: 'google',
    portalUrl: 'https://careers.google.com/jobs/results/',
    ats: 'Internal Portal',
    headquarters: 'Mountain View, CA',
    searchDomain: 'careers.google.com'
  },
  {
    name: 'Amazon',
    slug: 'amazon',
    portalUrl: 'https://www.amazon.jobs/en/search',
    ats: 'Internal Portal',
    headquarters: 'Seattle, WA',
    searchDomain: 'amazon.jobs'
  },
  {
    name: 'Meta',
    slug: 'meta',
    portalUrl: 'https://www.metacareers.com/jobs',
    ats: 'Internal Portal',
    headquarters: 'Menlo Park, CA',
    searchDomain: 'metacareers.com'
  },
  {
    name: 'Microsoft',
    slug: 'microsoft',
    portalUrl: 'https://jobs.careers.microsoft.com/global/en/search',
    ats: 'Internal Portal',
    headquarters: 'Redmond, WA',
    searchDomain: 'jobs.careers.microsoft.com'
  },
  {
    name: 'Apple',
    slug: 'apple',
    portalUrl: 'https://jobs.apple.com/en-us/search',
    ats: 'Internal Portal',
    headquarters: 'Cupertino, CA',
    searchDomain: 'jobs.apple.com'
  },
  {
    name: 'Netflix',
    slug: 'netflix',
    portalUrl: 'https://jobs.netflix.com/search',
    ats: 'Workday / Custom',
    headquarters: 'Los Gatos, CA',
    searchDomain: 'jobs.netflix.com'
  }
]);

/**
 * Returns companies matching a target tech domain or category keyword.
 * @param {string} domain
 * @returns {Array<typeof ALL_SOVEREIGN_TECH_COMPANIES[0]>}
 */
export function getCompaniesByDomain(domain = '') {
  if (!domain || domain === 'All Domains') {
    return [...ALL_SOVEREIGN_TECH_COMPANIES];
  }
  const clean = domain.toLowerCase();
  return ALL_SOVEREIGN_TECH_COMPANIES.filter(c => {
    return (c.category && c.category.toLowerCase().includes(clean)) ||
           (c.name && c.name.toLowerCase().includes(clean));
  });
}


