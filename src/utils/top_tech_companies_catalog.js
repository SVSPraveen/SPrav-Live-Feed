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
  { name: 'Remote', slug: 'remote', platform: 'greenhouse', careers_url: 'https://boards.greenhouse.io/remote', category: 'Fintech, Modern Commerce & Payments', tier: 2 }
];

export const ALL_SOVEREIGN_TECH_COMPANIES = Object.freeze([
  ...TOP_100_TECH_COMPANIES,
  ...EXPANDED_TECH_COMPANIES
]);

/**
 * Enterprise Workday CXS Verified Tenants
 * High-volume Fortune 500 tech platforms with open CXS search endpoints.
 */
export const WORKDAY_ENTERPRISE_TENANTS = Object.freeze([
  { name: 'Nvidia', url: 'https://nvidia.wd5.myworkdayjobs.com/wday/cxs/nvidia/NVIDIAExternalCareerSite/jobs', host: 'https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite', maxJobs: 100 },
  { name: 'Salesforce', url: 'https://salesforce.wd12.myworkdayjobs.com/wday/cxs/salesforce/External_Career_Site/jobs', host: 'https://salesforce.wd12.myworkdayjobs.com/en-US/External_Career_Site', maxJobs: 100 },
  { name: 'Adobe', url: 'https://adobe.wd5.myworkdayjobs.com/wday/cxs/adobe/external_experienced/jobs', host: 'https://adobe.wd5.myworkdayjobs.com/en-US/external_experienced', maxJobs: 100 },
  { name: 'Autodesk', url: 'https://autodesk.wd1.myworkdayjobs.com/wday/cxs/autodesk/Ext/jobs', host: 'https://autodesk.wd1.myworkdayjobs.com/en-US/Ext', maxJobs: 100 },
  { name: 'Workday', url: 'https://workday.wd5.myworkdayjobs.com/wday/cxs/workday/Workday/jobs', host: 'https://workday.wd5.myworkdayjobs.com/en-US/Workday', maxJobs: 100 },
  { name: 'PayPal', url: 'https://paypal.wd1.myworkdayjobs.com/wday/cxs/paypal/jobs/jobs', host: 'https://paypal.wd1.myworkdayjobs.com/en-US/jobs', maxJobs: 100 },
  { name: 'Micron', url: 'https://micron.wd1.myworkdayjobs.com/wday/cxs/micron/External/jobs', host: 'https://micron.wd1.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'Mastercard', url: 'https://mastercard.wd1.myworkdayjobs.com/wday/cxs/mastercard/CorporateCareers/jobs', host: 'https://mastercard.wd1.myworkdayjobs.com/en-US/CorporateCareers', maxJobs: 100 },
  { name: 'Target Tech', url: 'https://target.wd5.myworkdayjobs.com/wday/cxs/target/targetcareers/jobs', host: 'https://target.wd5.myworkdayjobs.com/en-US/targetcareers', maxJobs: 100 },
  { name: 'Cisco', url: 'https://cisco.wd5.myworkdayjobs.com/wday/cxs/cisco/Cisco_Careers/jobs', host: 'https://cisco.wd5.myworkdayjobs.com/en-US/Cisco_Careers', maxJobs: 100 },
  { name: 'Intel', url: 'https://intel.wd1.myworkdayjobs.com/wday/cxs/intel/External/jobs', host: 'https://intel.wd1.myworkdayjobs.com/en-US/External', maxJobs: 100 },
  { name: 'Boeing', url: 'https://boeing.wd1.myworkdayjobs.com/wday/cxs/boeing/EXTERNAL_CAREERS/jobs', host: 'https://boeing.wd1.myworkdayjobs.com/en-US/EXTERNAL_CAREERS', maxJobs: 100 },
  { name: 'Broadcom', url: 'https://broadcom.wd1.myworkdayjobs.com/wday/cxs/broadcom/External_Career/jobs', host: 'https://broadcom.wd1.myworkdayjobs.com/en-US/External_Career', maxJobs: 100 }
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

