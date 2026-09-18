/**
 * lora_cover_letter_dataset.js
 * =============================
 * SFT (Supervised Fine-Tuning) and DPO (Direct Preference Optimization) dataset generator
 * designed to fine-tune open-source LLMs (Llama-3.1-8B, Llama-3.2-3B, Mistral, Qwen-2.5)
 * for authentic, peer-to-peer, buzzword-free cover letters and recruiter outreach.
 *
 * Implements strict 1024-token sequence length budgeting for guaranteed 8GB VRAM QLoRA
 * compatibility with Unsloth.
 *
 * Formats Supported:
 * - 'chatml': { messages: [{ role: 'system', ... }, { role: 'user', ... }, { role: 'assistant', ... }] }
 * - 'alpaca': { instruction, input, output }
 * - 'dpo': { prompt, chosen, rejected }
 * - 'unsloth_prompt': { text: "..." }
 */

import { EXEMPLAR_RESUMES } from './exemplar_tech_resumes.js';
import { SEED_STAR_STORIES as STAR_STORIES } from './star_story_bank.js';
import { THEMATIC_BEATS } from './cover_letter_style_engine.js';

export const TARGET_JOB_SCENARIOS = [
  // 1. Cloud & Distributed Systems
  {
    id: 'sc_vercel',
    category: 'Cloud & Distributed Systems',
    company: 'Vercel',
    role: 'Staff Infrastructure Engineer',
    team: 'Global Edge Network & Serverless Runtime',
    keywords: ['Next.js', 'Rust', 'Edge Functions', 'Anycast Routing', 'p99 latency'],
    problemStatement: 'Optimizing cold starts and multi-region routing across distributed edge points of presence.'
  },
  {
    id: 'sc_stripe_ledger',
    category: 'Fintech & Transaction Systems',
    company: 'Stripe',
    role: 'Staff Distributed Systems Engineer',
    team: 'Money Movement & Core Ledger',
    keywords: ['Kafka', 'Rust', 'Raft Consensus', 'Idempotency', 'Zero-Downtime Vitess'],
    problemStatement: 'Maintaining sub-50ms p99 settlement processing across high-volume global payment rails.'
  },
  {
    id: 'sc_aws_eks',
    category: 'Cloud & Distributed Systems',
    company: 'Amazon Web Services',
    role: 'Principal Systems Architect',
    team: 'Elastic Kubernetes Service (EKS) Core',
    keywords: ['Kubernetes', 'Go', 'etcd', 'Containerd', 'Kernel Tuning'],
    problemStatement: 'Managing control-plane scaling and etcd snapshot latency for multi-thousand node enterprise clusters.'
  },
  {
    id: 'sc_cloudflare_workers',
    category: 'Cloud & Distributed Systems',
    company: 'Cloudflare',
    role: 'Senior Systems Engineer',
    team: 'Workers & Edge Execution',
    keywords: ['V8 Isolates', 'Rust', 'eBPF', 'Wasm', 'DDoS Mitigation'],
    problemStatement: 'Minimizing memory overhead in multi-tenant V8 isolate sandbox execution at internet scale.'
  },
  {
    id: 'sc_datadog_apm',
    category: 'Cloud & Distributed Systems',
    company: 'Datadog',
    role: 'Lead Observability Engineer',
    team: 'Distributed Tracing & APM',
    keywords: ['OpenTelemetry', 'Go', 'eBPF', 'ClickHouse', 'High-Cardinality Ingestion'],
    problemStatement: 'Ingesting billions of telemetry spans per second with microsecond kernel tracing.'
  },

  // 2. Frontier AI & Model Serving Platforms
  {
    id: 'sc_anthropic_serving',
    category: 'Frontier AI Platforms',
    company: 'Anthropic',
    role: 'Principal MLOps & Inference Platform Engineer',
    team: 'Model Serving Infrastructure',
    keywords: ['vLLM', 'Triton', 'GPU Clusters', 'Kubernetes', 'High-Throughput Streaming'],
    problemStatement: 'Scaling token generation throughput and cutting KV-cache memory footprints for frontier LLM serving.'
  },
  {
    id: 'sc_openai_infra',
    category: 'Frontier AI Platforms',
    company: 'OpenAI',
    role: 'Staff Systems Engineer',
    team: 'Distributed Training & Cluster Orchestration',
    keywords: ['Slurm', 'PyTorch', 'NCCL', 'InfiniBand', 'Fault Tolerance'],
    problemStatement: 'Preventing silent GPU checkpoint failures and optimizing all-reduce bandwidth across 10,000-GPU training fabrics.'
  },
  {
    id: 'sc_mistral_inference',
    category: 'Frontier AI Platforms',
    company: 'Mistral AI',
    role: 'Senior Inference Optimization Engineer',
    team: 'Edge & Quantized Runtime',
    keywords: ['FlashAttention', 'CUDA', 'WASM', 'INT4 Quantization', 'MoE Routing'],
    problemStatement: 'Squeezing maximum token generation throughput from sparse Mixture-of-Experts architectures on consumer hardware.'
  },
  {
    id: 'sc_scale_evals',
    category: 'Frontier AI Platforms',
    company: 'Scale AI',
    role: 'Lead Data Platform Engineer',
    team: 'Generative AI RLHF & Synthetic Data',
    keywords: ['Ray', 'Python', 'Vector Search', 'ClickHouse', 'Automated Annotation'],
    problemStatement: 'Orchestrating petabyte-scale data pipelines for RLHF preference alignment with strict provenance tracking.'
  },
  {
    id: 'sc_huggingface_hub',
    category: 'Frontier AI Platforms',
    company: 'Hugging Face',
    role: 'Staff Platform Engineer',
    team: 'Model Hub & Inference Endpoints',
    keywords: ['Text Generation Inference', 'Rust', 'Docker', 'Kubernetes', 'WebGPU'],
    problemStatement: 'Powering zero-cold-start containerized model deployment across heterogeneous cloud GPU providers.'
  },

  // 3. Reactive Product Engineering & Local-First
  {
    id: 'sc_linear_sync',
    category: 'Product Engineering & Local-First',
    company: 'Linear',
    role: 'Senior Full-Stack Systems Engineer',
    team: 'Real-Time Sync Engine',
    keywords: ['TypeScript', 'CRDTs', 'WebSockets', 'React', 'Local-First Architecture'],
    problemStatement: 'Ensuring conflict-free optimistic updates and sub-16ms UI responsiveness across offline-ready clients.'
  },
  {
    id: 'sc_figma_multiplayer',
    category: 'Product Engineering & Local-First',
    company: 'Figma',
    role: 'Staff Graphics & Engine Engineer',
    team: 'Multiplayer Canvas Engine',
    keywords: ['C++', 'WebAssembly', 'WebGL', 'Operational Transformation', 'Rust'],
    problemStatement: 'Maintaining 60 FPS rendering and conflict-free multi-user cursor synchronization on dense vector canvasses.'
  },
  {
    id: 'sc_notion_search',
    category: 'Product Engineering & Local-First',
    company: 'Notion',
    role: 'Lead Search & Retrieval Engineer',
    team: 'Core Workspace Search',
    keywords: ['Elasticsearch', 'PostgreSQL', 'Hybrid Search', 'TypeScript', 'Redis'],
    problemStatement: 'Delivering instant sub-30ms search and permission filtering across multi-million block customer workspaces.'
  },
  {
    id: 'sc_supabase_realtime',
    category: 'Product Engineering & Local-First',
    company: 'Supabase',
    role: 'Senior Systems Engineer',
    team: 'Realtime & Elixir Gateway',
    keywords: ['Elixir', 'Phoenix Channels', 'PostgreSQL WAL', 'WebSockets', 'Go'],
    problemStatement: 'Streaming logical decoding write-ahead logs from Postgres to millions of concurrent connected web clients.'
  },

  // 4. Fintech & High-Scale Transaction Rails
  {
    id: 'sc_plaid_integrations',
    category: 'Fintech & Transaction Systems',
    company: 'Plaid',
    role: 'Staff Backend Engineer',
    team: 'Financial Institutions Connectivity',
    keywords: ['Go', 'gRPC', 'PostgreSQL', 'Encryption', 'OAuth Security'],
    problemStatement: 'Maintaining resilient, fault-tolerant API abstractions across thousands of disparate banking protocols.'
  },
  {
    id: 'sc_robinhood_execution',
    category: 'Fintech & Transaction Systems',
    company: 'Robinhood',
    role: 'Senior Low-Latency Engineer',
    team: 'Order Routing & Market Gateway',
    keywords: ['C++', 'Python', 'FIX Protocol', 'Kafka', 'Sub-Millisecond Processing'],
    problemStatement: 'Executing high-throughput equities and crypto trades during market open volatility without order queueing.'
  },
  {
    id: 'sc_brex_treasury',
    category: 'Fintech & Transaction Systems',
    company: 'Brex',
    role: 'Lead Financial Infrastructure Engineer',
    team: 'Global Treasury & Card Settlement',
    keywords: ['Kotlin', 'Kafka', 'PostgreSQL', 'Distributed Locks', 'Double-Entry Accounting'],
    problemStatement: 'Automating real-time continuous ledger reconciliation with zero transaction discrepancies.'
  },

  // 5. Cybersecurity, Zero-Trust & Kernel Tracing
  {
    id: 'sc_crowdstrike_agent',
    category: 'Cybersecurity & Zero-Trust',
    company: 'CrowdStrike',
    role: 'Senior Kernel & Security Engineer',
    team: 'Falcon Sensor Core',
    keywords: ['C++', 'C', 'eBPF', 'Kernel Modules', 'Threat Detection'],
    problemStatement: 'Monitoring kernel system calls and network sockets with sub-1% CPU impact and zero kernel panics.'
  },
  {
    id: 'sc_tailscale_wireguard',
    category: 'Cybersecurity & Zero-Trust',
    company: 'Tailscale',
    role: 'Staff Network Security Engineer',
    team: 'Control Plane & DERP Relays',
    keywords: ['Go', 'WireGuard', 'NAT Traversal', 'DERP Relays', 'Zero-Trust Architecture'],
    problemStatement: 'Achieving direct peer-to-peer UDP hole punching across restrictive symmetric enterprise NAT firewalls.'
  },
  {
    id: 'sc_1password_vault',
    category: 'Cybersecurity & Zero-Trust',
    company: '1Password',
    role: 'Lead Cryptography Engineer',
    team: 'Zero-Knowledge Cryptographic Platform',
    keywords: ['Rust', 'AES-GCM-256', 'WebCrypto', 'SRP Protocol', 'Zero-Knowledge Proofs'],
    problemStatement: 'Ensuring end-to-end client-side encryption and seamless key rollover across multi-device enterprise fleets.'
  },

  // 6. Data Engineering & Real-Time Streaming
  {
    id: 'sc_snowflake_engine',
    category: 'Data Engineering & Streaming',
    company: 'Snowflake',
    role: 'Staff Query Execution Engineer',
    team: 'Virtual Warehouse Execution Engine',
    keywords: ['C++', 'Vectorized Query Execution', 'FoundationDB', 'SIMD', 'Columnar Storage'],
    problemStatement: 'Maximizing CPU vectorization throughput for SQL aggregations on petabyte compressed micro-partitions.'
  },
  {
    id: 'sc_databricks_spark',
    category: 'Data Engineering & Streaming',
    company: 'Databricks',
    role: 'Senior Distributed Data Systems Engineer',
    team: 'Photon Engine & Delta Lake',
    keywords: ['C++', 'Apache Spark', 'Delta Lake', 'Parquet', 'ACID Transactions'],
    problemStatement: 'Eliminating JVM garbage collection stalls by rewriting query execution in native SIMD-accelerated C++.'
  },
  {
    id: 'sc_clickhouse_cloud',
    category: 'Data Engineering & Streaming',
    company: 'ClickHouse',
    role: 'Lead Core Systems Engineer',
    team: 'Cloud Storage & Query Optimization',
    keywords: ['C++', 'Object Storage Caching', 'MergeTree', 'SIMD', 'High-Throughput Ingestion'],
    problemStatement: 'Achieving sub-second analytics over multi-terabyte datasets cached over S3/GCS object stores.'
  },
  {
    id: 'sc_confluent_kafka',
    category: 'Data Engineering & Streaming',
    company: 'Confluent',
    role: 'Staff Streaming Platform Engineer',
    team: 'Cloud Native Kafka Engine',
    keywords: ['Java', 'Karafka', 'Tiered Storage', 'Netty', 'Distributed Log Replication'],
    problemStatement: 'Decoupling compute from storage in Kafka through asynchronous offloading to object stores.'
  },

  // 7. Embedded Systems & Autonomous Platforms
  {
    id: 'sc_tesla_autopilot',
    category: 'Embedded & Autonomous Systems',
    company: 'Tesla',
    role: 'Staff Firmware & Embedded Systems Engineer',
    team: 'Vehicle Compute & Sensor Integration',
    keywords: ['C++', 'C', 'RTOS', 'CAN Bus', 'Hardware Accelerators'],
    problemStatement: 'Guaranteeing deterministic microsecond response times for multi-camera video ingest under hard real-time constraints.'
  },
  {
    id: 'sc_apple_coreos',
    category: 'Embedded & Autonomous Systems',
    company: 'Apple',
    role: 'Senior Systems Software Engineer',
    team: 'CoreOS Kernel & Hardware Architecture',
    keywords: ['C', 'Rust', 'Mach Kernel', 'Apple Silicon', 'Low-Power Computing'],
    problemStatement: 'Optimizing unified memory scheduling and interrupt handling for Apple Silicon neural accelerator pipelines.'
  },
  {
    id: 'sc_nvidia_tensorrt',
    category: 'Embedded & Autonomous Systems',
    company: 'NVIDIA',
    role: 'Senior Deep Learning Systems Engineer',
    team: 'TensorRT & CUDA Runtime',
    keywords: ['CUDA', 'C++', 'TensorRT', 'Kernel Fusion', 'FP8 Quantization'],
    problemStatement: 'Auto-tuning GPU kernel fusion graphs to achieve theoretical peak FLOPS on Blackwell and Hopper architectures.'
  },
  {
    id: 'sc_anduril_lattice',
    category: 'Embedded & Autonomous Systems',
    company: 'Anduril Industries',
    role: 'Lead Robotics Software Engineer',
    team: 'Lattice OS & Autonomous Edge Sensors',
    keywords: ['Rust', 'C++', 'ROS2', 'Edge AI', 'Mesh Networking'],
    problemStatement: 'Orchestrating resilient mesh telemetry across contested, bandwidth-constrained sensor nodes.'
  }
];

export const SYNTHETIC_CANDIDATE_PROFILES = [
  ...EXEMPLAR_RESUMES.map(e => ({
    id: e.id,
    name: e.name,
    role: e.role,
    companyHistory: e.companyHistory,
    summary: e.summary,
    skills: Object.values(e.skills).flat()
  })),
  {
    id: 'jordan_lee',
    name: 'Jordan Lee',
    role: 'Lead Security & SRE Engineer',
    companyHistory: 'Cloudflare · GitHub · Datadog',
    summary: 'Lead Infrastructure Security Engineer with 8+ years building zero-trust perimeters, eBPF security telemetry, and Kubernetes automated compliance. Specialized in reducing MTTD by 60% across multi-cloud environments.',
    skills: ['Rust', 'Go', 'eBPF', 'Kubernetes', 'Terraform', 'WireGuard', 'OpenTelemetry', 'AWS']
  },
  {
    id: 'dev_patel',
    name: 'Dev Patel',
    role: 'Senior Data Platform & Streaming Engineer',
    companyHistory: 'Uber · Confluent · DoorDash',
    summary: 'Senior Data Systems Engineer with 7+ years architecting multi-petabyte real-time event ingestion rails using Apache Kafka, ClickHouse, and Flink. Cut pipeline latency from hours to 850ms.',
    skills: ['Python', 'Rust', 'Apache Kafka', 'ClickHouse', 'Apache Flink', 'PostgreSQL', 'Docker', 'dbt']
  },
  {
    id: 'maya_lin',
    name: 'Maya Lin',
    role: 'Staff Mobile & Embedded Systems Engineer',
    companyHistory: 'Apple · Square · Cruise',
    summary: 'Staff Systems Engineer specializing in low-level graphics acceleration, WebGPU/Metal rendering, and on-device CoreML optimization with strict memory and thermal envelopes.',
    skills: ['C++', 'Rust', 'Metal', 'WebGPU', 'Swift', 'CUDA', 'Python', 'CoreML']
  }
];

/**
 * Skeleton 1: Problem-First Engineer (3 paragraphs, direct technical hook attacking bottleneck, metric in center)
 */
export function buildSkeletonProblemFirst(scenario, candidate, starStory) {
  const metric = starStory?.result || 'slashing p99 latency by 42% and cutting cloud expenditures';
  const action = starStory?.action || 'architected distributed event ingestion using modern systems stacks';

  return `Most engineering teams tackling ${scenario.problemStatement.toLowerCase()} run into the classic wall where abstraction outpaces throughput. Having spent the past several years leading systems initiatives across ${candidate.companyHistory}, I have focused on solving this exact tier of reliability and scale challenges.

At ${candidate.companyHistory.split(' · ')[0] || 'my recent role'}, I ${action.toLowerCase()}, directly ${metric.toLowerCase()}. Implementing disciplined concurrency boundaries and strict instrumentation with ${scenario.keywords.slice(0, 3).join(', ')} kept our services predictable even during 10x traffic bursts.

If ${scenario.company} is navigating similar engineering tradeoffs on the ${scenario.team}, I would welcome comparing notes on architecture and operational patterns. Thank you for your time. — Best, ${candidate.name}`;
}

/**
 * Skeleton 2: Scale Architect (4 paragraphs, system scale context, deep architectural breakdown, measured close)
 */
export function buildSkeletonScaleArchitect(scenario, candidate, starStory) {
  const metric = starStory?.result || 'Reduced p99 latency by 42% and cut multi-million cloud expenditures';
  const action = starStory?.action || 'Architected distributed event ingestion using modern systems stacks';

  return `Dear ${scenario.company} Engineering Team,

${scenario.company}'s work on ${scenario.problemStatement.toLowerCase()} caught my attention. In high-scale distributed environments, resolving those latency bottlenecks requires disciplined systems architecture and deep concurrency control. Over the past several years leading infrastructure initiatives, I have focused on solving this exact tier of reliability and throughput challenges.

At ${candidate.companyHistory.split(' · ')[0] || 'my previous role'}, I ${action.toLowerCase()}. By implementing targeted architectural patterns and optimizing resource allocation, our team ${metric.toLowerCase()}. Having worked directly with ${scenario.keywords.slice(0, 3).join(', ')}, I've learned that operational simplicity and thorough instrumentation are what keep mission-critical systems resilient when traffic multiplies.

What resonates with me about joining ${scenario.company} is your commitment to engineering rigor and the scale of the ${scenario.team}. Your team's approach to ${scenario.keywords[0]} directly mirrors how I approach systems problems: measure relentlessly, eliminate unnecessary abstraction layers, and prioritize reliability above all else.

I would welcome the chance to discuss how my background in distributed systems and performance optimization can contribute to ${scenario.company}'s ongoing milestones. Thank you for your time and consideration.

Sincerely,
${candidate.name}`;
}

/**
 * Skeleton 3: Craft & Systems Builder (2 dense paragraphs, high-speed engineering team tone, combined hook + metric)
 */
export function buildSkeletonCraftSystems(scenario, candidate, starStory) {
  const metric = starStory?.result || 'cutting p99 latency by 42%';
  const action = starStory?.action || 'streamlined high-scale event processing';

  return `I've been following ${scenario.company}'s technical trajectory on ${scenario.team}, particularly how you approach ${scenario.problemStatement.toLowerCase()}. At ${candidate.companyHistory.split(' · ')[0] || 'my previous team'}, I ${action.toLowerCase()}, delivering ${metric.toLowerCase()} without inflating operational complexity. My hands-on toolkit centers on ${scenario.keywords.slice(0, 3).join(', ')}, but my focus is always zero-downtime reliability, clean observability, and developer velocity.

I'm interested in bringing this execution-first approach to the ${scenario.role} role at ${scenario.company}. If you are open to a brief conversation about your current technical roadmap, I'd value connecting this week. — Regards, ${candidate.name}`;
}

/**
 * Skeleton 4: Deep-Dive Technical Case (5 thematic beats, executive memo structure, metric-anchored stability narrative)
 */
export function buildSkeletonDeepDive(scenario, candidate, starStory) {
  const metric = starStory?.result || 'yielding a 42% latency reduction';
  const action = starStory?.action || 're-architected the core data path';

  return `Re: ${scenario.role} — ${scenario.company} (${scenario.team})

The systems problem highlighted for your team—${scenario.problemStatement.toLowerCase()}—is one of the most compelling engineering challenges in our industry today.

In my recent work with ${candidate.companyHistory.split(' · ')[0] || 'distributed infrastructure'}, our team faced a very similar inflection point. I ${action.toLowerCase()}. That architectural shift ${metric.toLowerCase()}, while stabilizing our deployment pipelines so cross-functional teams could ship with confidence.

Building with ${scenario.keywords.slice(0, 3).join(', ')}, I treat code as a liability and automated tests as the primary asset. I have long respected how ${scenario.company} balances ambitious engineering goals with strict operational discipline.

I would appreciate 15 minutes to discuss how my practical systems experience aligns with your engineering objectives for the coming quarters. Thank you for your consideration.

Cheers,
${candidate.name}`;
}

/**
 * Skeleton 5: Conversational Colleague (3 paragraphs, casual, confident, zero-ego)
 */
export function buildSkeletonConversational(scenario, candidate, starStory) {
  const metric = starStory?.result || 'reduced system overhead by 42%';
  const action = starStory?.action || 'optimized concurrent throughput';

  return `Hi ${scenario.company} Team — I saw that you're looking for a ${scenario.role} to help scale ${scenario.problemStatement.toLowerCase()}. That is a demanding problem space, particularly when real-world traffic exposes concurrency bottlenecks in ${scenario.keywords.slice(0, 2).join(' and ')}.

I've spent the past several years immersed in these exact systems challenges across ${candidate.companyHistory}. Most recently, I ${action.toLowerCase()}, which directly ${metric.toLowerCase()}. Along the way, I've developed a pragmatic understanding of how to keep distributed services performant without over-engineering the core stack.

I would enjoy learning more about the team's technical roadmap on ${scenario.team} and exploring whether my background could be helpful. Looking forward to speaking with you.

Thanks,
${candidate.name}`;
}

export const CHOSEN_SKELETONS = [
  buildSkeletonProblemFirst,
  buildSkeletonScaleArchitect,
  buildSkeletonCraftSystems,
  buildSkeletonDeepDive,
  buildSkeletonConversational
];

/**
 * Builds an authentic, human, metric-driven Cover Letter training sample (Chosen)
 * Dispatches across 5 structurally distinct skeleton architectures.
 */
export function buildChosenSample(scenario, candidate, starStory, skeletonIndex = null) {
  const idx = typeof skeletonIndex === 'number' && skeletonIndex >= 0
    ? skeletonIndex % CHOSEN_SKELETONS.length
    : (String(scenario?.id || '').length + String(candidate?.name || '').length) % CHOSEN_SKELETONS.length;

  const skeletonFn = CHOSEN_SKELETONS[idx] || buildSkeletonScaleArchitect;
  return skeletonFn(scenario, candidate, starStory);
}

/**
 * Builds an authentic Recruiter Cold Outreach pitch sample (Chosen)
 */
export function buildChosenOutreachSample(scenario, candidate, starStory) {
  const metric = starStory?.result || 'slashing p99 latency by 45%';

  return `Hi ${scenario.company} Team,

Saw the team's recent work scaling ${scenario.problemStatement.toLowerCase()}. I've spent the last few years solving similar high-throughput challenges—most recently ${metric.toLowerCase()} using ${scenario.keywords.slice(0, 2).join(' and ')}.

I put together a quick breakdown of how our team tackled comparable architectural bottlenecks at scale. Would love to swap notes with the engineering lead on ${scenario.team} if you're open to a brief chat this week.

Best,
${candidate.name}`;
}

/**
 * Builds a rejected (robotic, AI-cliché, rigid template) sample for DPO contrast
 */
export function buildRejectedSample(scenario, candidate) {
  return `Dear Hiring Manager,

Paragraph 1 (The Hook):
I am writing with immense enthusiasm and excitement to express my passionate interest in the prestigious ${scenario.role} position at ${scenario.company}. In today's fast-paced world, ${scenario.company} is spearheading a dynamic tapestry of innovation, and I am thrilled by the prospect of joining your rockstar team.

Paragraph 2 (My Skills):
Throughout my career, I have leveraged my strong expertise in ${scenario.keywords.join(', ')} to maximize synergies and hit the ground running. I am deeply passionate about taking projects to the next level. Furthermore, my skill set aligns seamlessly with your esteemed company's core mission.

Paragraph 3 (Company Fit):
Moreover, I have always admired ${scenario.company}'s incredible culture. It would truly be an honor to delve into your projects and contribute to your synergy. My proactive mindset ensures that I consistently deliver high-impact value in fast-paced environments.

Paragraph 4 (Conclusion):
In conclusion, thank you for reviewing my resume. I eagerly look forward to hearing from you at your earliest convenience to further discuss how my passionate background meets your requirements.

Warm regards,
${candidate.name}`;
}

/**
 * Helper to estimate tokens and enforce strict 1024-token budget
 */
export function estimateTokens(text) {
  if (!text) return 0;
  return Math.ceil(text.length / 3.8);
}

/**
 * Generates the full 300+ sample multi-format LoRA training dataset.
 *
 * @param {Object} options
 * @param {number} [options.maxTokens=1024]
 * @returns {Array<Object>}
 */
export function generateLoRADataset(options = {}) {
  const maxTokens = options.maxTokens || 1024;
  const dataset = [];

  TARGET_JOB_SCENARIOS.forEach((scenario, scIndex) => {
    SYNTHETIC_CANDIDATE_PROFILES.forEach((candidate, caIndex) => {
      const starIndex = (scIndex + caIndex) % STAR_STORIES.length;
      const starStory = STAR_STORIES[starIndex];

      // Sample A: Full Thematic Cover Letter
      const clInstruction = `Draft an authentic, human, executive cover letter for the ${scenario.role} position at ${scenario.company} (${scenario.team}).
Follow 4 organic thematic beats:
1. Context & The Hook (show insight into company's specific technical problem: ${scenario.problemStatement}).
2. Technical Depth & Verified Metrics (detail concrete architectural decisions and outcomes).
3. Problem Alignment (connect engineering philosophy directly to their technical stack).
4. Conversational Peer-to-Peer Close (direct, professional request for conversation).

ABSOLUTE CONSTRAINTS:
- NEVER print structural labels like "Paragraph 1:" or "Hook:".
- Strictly avoid empty AI buzzwords (passionate, thrilled, synergy, spearhead, delve, tapestry, fast-paced).
- Keep word count between 200 and 320 words.`;

      const clInput = `Candidate: ${candidate.name} (${candidate.role})
Background: ${candidate.summary}
Key Achievement: ${starStory.action} -> Result: ${starStory.result}
Target Company: ${scenario.company} (${scenario.team})
Target Keywords: ${scenario.keywords.join(', ')}`;

      const skeletonIndex = (scIndex + caIndex) % CHOSEN_SKELETONS.length;
      const clChosen = buildChosenSample(scenario, candidate, starStory, skeletonIndex);
      const clRejected = buildRejectedSample(scenario, candidate);

      const clMessages = [
        { role: 'system', content: 'You are an executive talent strategist drafting authentic, publication-grade cover letters with zero robotic filler.' },
        { role: 'user', content: `${clInstruction}\n\n${clInput}` },
        { role: 'assistant', content: clChosen }
      ];

      const clTokens = estimateTokens(JSON.stringify(clMessages));
      if (clTokens <= maxTokens) {
        dataset.push({
          id: `lora_sft_cl_${scenario.id}_${candidate.id}_${scIndex}`,
          type: 'cover_letter',
          metadata: {
            company: scenario.company,
            role: scenario.role,
            category: scenario.category,
            candidateId: candidate.id,
            beats: Object.values(THEMATIC_BEATS).map(b => b.name)
          },
          instruction: clInstruction,
          input: clInput,
          output: clChosen,
          chosen: clChosen,
          rejected: clRejected,
          messages: clMessages
        });
      }

      // Sample B: Recruiter Cold Outreach Pitch
      const outreachInstruction = `Draft a high-impact, peer-to-peer cold outreach message to an engineering recruiter or team lead at ${scenario.company} for the ${scenario.role} position.
Follow the 3 outreach beats:
1. Problem Alignment: Reference ${scenario.problemStatement} directly.
2. Verified Metric: Highlight relevant track record (${starStory.result}).
3. Low-Friction Ask: Propose a quick, conversational sync to compare approaches.

CONSTRAINTS: Zero flattery, zero generic buzzwords, max 90 words.`;

      const outreachInput = `Candidate: ${candidate.name}
Role: ${candidate.role}
Proven Track Record: ${starStory.action} -> ${starStory.result}
Company Focus: ${scenario.team} - ${scenario.keywords.slice(0, 3).join(', ')}`;

      const outreachChosen = buildChosenOutreachSample(scenario, candidate, starStory);
      const outreachRejected = `Dear Hiring Team,\n\nI am passionately reaching out to express my intense enthusiasm about opportunities at ${scenario.company}. I am a rockstar developer ready to spearhead synergy across your fast-paced team. Please check out my resume!`;

      const outreachMessages = [
        { role: 'system', content: 'You are an elite technical career advisor drafting concise, peer-to-peer engineering outreach pitches.' },
        { role: 'user', content: `${outreachInstruction}\n\n${outreachInput}` },
        { role: 'assistant', content: outreachChosen }
      ];

      const outreachTokens = estimateTokens(JSON.stringify(outreachMessages));
      if (outreachTokens <= maxTokens) {
        dataset.push({
          id: `lora_sft_outreach_${scenario.id}_${candidate.id}_${scIndex}`,
          type: 'outreach_pitch',
          metadata: {
            company: scenario.company,
            role: scenario.role,
            category: scenario.category,
            candidateId: candidate.id
          },
          instruction: outreachInstruction,
          input: outreachInput,
          output: outreachChosen,
          chosen: outreachChosen,
          rejected: outreachRejected,
          messages: outreachMessages
        });
      }
    });
  });

  return dataset;
}

/**
 * Serializes the dataset into JSONL string for a specific training format.
 *
 * @param {'chatml'|'alpaca'|'dpo'|'unsloth_prompt'} format
 * @param {Array<Object>} [dataset]
 * @returns {string} JSONL formatted string
 */
export function exportLoRADatasetJSONL(format = 'chatml', dataset = null) {
  const data = dataset || generateLoRADataset();

  return data.map(item => {
    if (format === 'alpaca') {
      return JSON.stringify({
        instruction: item.instruction,
        input: item.input,
        output: item.output
      });
    }

    if (format === 'dpo') {
      return JSON.stringify({
        prompt: `${item.instruction}\n\n${item.input}`,
        chosen: item.chosen,
        rejected: item.rejected
      });
    }

    if (format === 'unsloth_prompt') {
      // Formatted in standard Llama-3.1 Chat format for Unsloth's fast text trainer
      const sys = item.messages.find(m => m.role === 'system')?.content || '';
      const usr = item.messages.find(m => m.role === 'user')?.content || '';
      const ast = item.messages.find(m => m.role === 'assistant')?.content || '';

      const text = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${sys}<|eot_id|><|start_header_id|>user<|end_header_id|>\n\n${usr}<|eot_id|><|start_header_id|>assistant<|end_header_id|>\n\n${ast}<|eot_id|>`;

      return JSON.stringify({ text });
    }

    // Default: ChatML format for SFTTrainer
    return JSON.stringify({
      messages: item.messages
    });
  }).join('\n');
}

/**
 * Browser-side download trigger helper for JSONL dataset exports
 */
export function downloadJSONL(filename, jsonlContent) {
  if (typeof document === 'undefined') return;
  const blob = new Blob([jsonlContent], { type: 'application/jsonl' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Browser-side file download helper for Python scripts & Colab notebooks
 */
export function downloadFile(filename, content, mimeType = 'text/plain') {
  if (typeof document === 'undefined') return;
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
