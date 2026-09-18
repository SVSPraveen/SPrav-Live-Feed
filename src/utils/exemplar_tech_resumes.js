/**
 * exemplar_tech_resumes.js
 * ========================
 * Production-grade, 100% completed exemplar profiles featuring quantified
 * STAR achievements, verified tech stacks, and 98%+ ATS alignment scores.
 *
 * Used by the ATS Resume Studio "View 100% Completed Exemplar" showcase to give
 * candidates a concrete blueprint of publication-grade resumes before tailoring.
 */

export const DEFAULT_EXEMPLAR_ID = 'alex_morgan';

export const EXEMPLAR_RESUMES = [
  {
    id: 'alex_morgan',
    name: 'SVS Praveen (Sample Blueprint)',
    role: 'Senior Full Stack & AI Solutions Architect',
    targetArchetype: 'Staff / Principal Solutions Architect',
    companyHistory: 'Sovereign AI Systems · Google Cloud · Stripe',
    atsScore: 98,
    candidate: {
      name: 'SVS Praveen',
      title: 'Senior Full Stack & AI Solutions Architect',
      email: 'svspraveens@demo.com',
      phone: '+1 (555) 012-34',
      location: 'San Francisco, CA / Remote',
      linkedin: 'linkedin.com/in/svspraveen-demo',
      github: 'github.com/svspraveen-demo',
      website: 'https://sprav-jobai.vercel.app'
    },
    summary:
      'Staff Distributed Systems Engineer with 9+ years architecting globally resilient financial transaction rails, high-throughput stream ingestion, and consensus protocols. Deep mastery in Rust, Apache Kafka, Go, and Kubernetes. Track record of cutting multi-million cloud expenditures while maintaining 99.999% uptime across multi-region edge clusters.',
    metricsBreakdown: [
      { label: 'Ingestion Throughput', value: '1.2M events/sec', note: 'Sub-45ms p99 latency' },
      { label: 'Cloud Infrastructure Savings', value: '$480,000/yr', note: 'Spot & EKS auto-scaling' },
      { label: 'System Availability', value: '99.999%', note: '14 multi-region clusters' },
      { label: 'Traffic Spike Tolerance', value: '3.8x peak', note: 'Zero-downtime Vitess sharding' }
    ],
    skills: {
      languages: ['Rust', 'Go (Golang)', 'Python', 'TypeScript', 'C++', 'SQL'],
      distributed_systems: ['Apache Kafka', 'gRPC', 'Raft Consensus', 'Redis Enterprise', 'PostgreSQL', 'Vitess'],
      cloud_orchestration: ['Kubernetes (EKS)', 'AWS (EC2, S3, RDS, IAM)', 'Terraform', 'Docker', 'Envoy Proxy'],
      observability_testing: ['Prometheus', 'Datadog', 'OpenTelemetry', 'Chaos Engineering', 'TDD', 'CI/CD']
    },
    work_history: [
      {
        company: 'Stripe',
        role: 'Staff Distributed Systems Engineer',
        location: 'San Francisco, CA',
        start_date: '2021',
        end_date: 'Present',
        bullets: [
          'Architected event-driven ingestion pipeline handling 1.2M events/sec with sub-45ms p99 latency using Rust and Apache Kafka, replacing legacy Ruby batch processors.',
          'Reduced multi-region AWS cloud spend by $480,000 annually through custom Kubernetes pod horizontal auto-scaling algorithms and Graviton spot instance bin-packing.',
          'Engineered distributed consensus protocol using Raft algorithm to coordinate transaction state machines across 14 global edge clusters with zero split-brain incidents.',
          'Spearheaded database sharding migration from monolith PostgreSQL to Vitess, effortlessly withstanding a 3.8x Black Friday traffic spike with 0 seconds of unplanned downtime.',
          'Formed engineering excellence guild; mentored 12 senior engineers in high-concurrency systems design, distributed tracing with OpenTelemetry, and chaos engineering drills.'
        ]
      },
      {
        company: 'Google',
        role: 'Senior Software Engineer (Cloud Spanner & Infra)',
        location: 'Mountain View, CA',
        start_date: '2018',
        end_date: '2021',
        bullets: [
          'Engineered geo-distributed replication primitives in C++ and Go, improving data consistency sync latency by 34% across trans-Atlantic fiber backbones.',
          'Optimized memory allocator and buffer pool reuse in storage engine, boosting read IOPS by 42% on persistent NVMe SSD volumes.',
          'Led zero-downtime rolling maintenance automation across 4,500 bare-metal cluster nodes, eliminating manual failovers during OS security kernel patching.',
          'Collaborated with product teams to design external customer APIs conforming to OpenTelemetry specifications, adopted by 800+ enterprise customers.'
        ]
      },
      {
        company: 'Datadog',
        role: 'Software Engineer (Metrics Ingestion)',
        location: 'New York, NY',
        start_date: '2015',
        end_date: '2018',
        bullets: [
          'Built high-velocity timeseries indexing engine using Go and Cassandra, ingesting 450,000 datapoints/second with sub-10ms query execution.',
          'Implemented snappy compression on wire protocol, saving 28TB of network bandwidth per month between collector agents and ingestion gateways.'
        ]
      }
    ],
    education: [
      {
        institution: 'University of California, Berkeley',
        degree: 'B.S. in Electrical Engineering & Computer Science (EECS)',
        graduation_year: '2015',
        honors: 'Summa Cum Laude · Regents Scholar · GPA 3.94 / 4.0'
      }
    ],
    projects: [
      {
        name: 'VectorStream / Open-Source Real-Time Engine',
        tech_stack: 'Rust, Tokio, Apache Arrow, WebAssembly',
        bullets: [
          'Authored high-throughput zero-copy stream processing library with 4,800+ GitHub stars, utilized by Fortune 500 fintech and telemetry platforms.',
          'Demonstrated 8.4M records/sec single-node throughput benchmark, outperforming Apache Flink baseline by 2.6x on commodity ARM64 hardware.'
        ]
      }
    ],
    certifications: [
      { name: 'AWS Certified Solutions Architect – Professional (SAP-C02)', year: '2023' },
      { name: 'CNCF Certified Kubernetes Administrator (CKA)', year: '2022' }
    ]
  },
  {
    id: 'elena_rostova',
    name: 'Elena Rostova (Sample Blueprint)',
    role: 'Principal Machine Learning & AI Platform Engineer',
    targetArchetype: 'Principal AI / LLM Infrastructure Engineer',
    companyHistory: 'Anthropic · DeepMind · Carnegie Mellon',
    atsScore: 99,
    candidate: {
      name: 'Elena Rostova (Sample Blueprint)',
      title: 'Principal Machine Learning & AI Platform Engineer',
      email: 'elena.rostova@example.com',
      phone: '+1 (555) 019-4912',
      location: 'San Francisco, CA',
      linkedin: 'linkedin.com/in/sample-elena-rostova',
      github: 'github.com/sample-elena-rostova',
      website: 'https://example.com'
    },
    summary:
      'Principal AI Platform Engineer with 8+ years leading large-scale distributed model training clusters, high-throughput GPU inference pipelines, and model serving infrastructure. Expert in PyTorch, vLLM, Triton, Slurm, and CUDA kernel optimization. Architected clusters supporting 70B+ parameter model inference with 3.4x throughput acceleration.',
    metricsBreakdown: [
      { label: 'Inference Throughput', value: '3.4x speedup', note: 'vLLM PagedAttention & Triton' },
      { label: 'GPU Cluster Compute Savings', value: '$620,000/yr', note: 'Quantization & dynamic batching' },
      { label: 'Model Serving p99', value: '18ms latency', note: 'Speculative decoding & CUDA' },
      { label: 'Cluster Scale', value: '1,024 H100 GPUs', note: 'Zero-fault distributed training' }
    ],
    skills: {
      ml_frameworks: ['PyTorch', 'vLLM', 'Triton Inference Server', 'HuggingFace', 'DeepSpeed', 'Megatron-LM'],
      infra_hardware: ['NVIDIA H100 / A100 Clusters', 'CUDA Kernels', 'Slurm', 'Ray Train / Serve', 'Kubernetes (K8s)'],
      languages_systems: ['Python', 'C++20', 'Rust', 'CUDA C', 'Triton DSL', 'Bash'],
      optimization_scaling: ['FlashAttention-2', 'FP8 / INT4 Quantization', 'Speculative Decoding', 'Model Parallelism (TP/PP)']
    },
    work_history: [
      {
        company: 'Anthropic',
        role: 'Principal AI Platform Engineer',
        location: 'San Francisco, CA',
        start_date: '2022',
        end_date: 'Present',
        bullets: [
          'Architected distributed inference serving architecture supporting 70B+ parameter LLM production endpoints, increasing token generation throughput by 3.4x.',
          'Engineered custom Triton and FlashAttention-2 GPU kernels in CUDA, reducing memory footprint by 46% and slashing monthly GPU compute costs by $620,000.',
          'Orchestrated 1,024-node NVIDIA H100 SuperPOD training clusters via Slurm and Ray, achieving 99.6% uninterrupted training job completion rate over 6-month runs.',
          'Pioneered speculative decoding and continuous batching engine, bringing p99 time-to-first-token (TTFT) from 185ms down to 18ms across enterprise workloads.'
        ]
      },
      {
        company: 'Google DeepMind',
        role: 'Senior Research Infrastructure Engineer',
        location: 'London, UK & Mountain View, CA',
        start_date: '2019',
        end_date: '2022',
        bullets: [
          'Engineered distributed checkpointing system using Jax and TPU v4 pods, reducing checkpoint save time from 14 minutes to 38 seconds.',
          'Optimized data ingestion pipeline for multi-modal training sets across distributed Google Cloud Storage buckets, saturated TPU compute cores at 94% utilization.'
        ]
      }
    ],
    education: [
      {
        institution: 'Carnegie Mellon University (CMU)',
        degree: 'M.S. in Machine Learning & Computer Science',
        graduation_year: '2019',
        honors: 'Published in NeurIPS & ICML · GPA 4.0 / 4.0'
      },
      {
        institution: 'University of Washington',
        degree: 'B.S. in Computer Engineering & Mathematics',
        graduation_year: '2017',
        honors: 'Summa Cum Laude'
      }
    ],
    projects: [
      {
        name: 'FlashInfer-Lite / Open-Source Kernel Library',
        tech_stack: 'CUDA, C++, Python, PyTorch',
        bullets: [
          'Developed high-performance fused attention kernels for generative models with 3,100+ GitHub stars.',
          'Adopted by mainstream open-source LLM runtimes, cutting VRAM overhead on consumer and enterprise GPUs by 35%.'
        ]
      }
    ],
    certifications: [
      { name: 'NVIDIA Certified Deep Learning Specialist', year: '2022' }
    ]
  },
  {
    id: 'marcus_chen',
    name: 'Marcus Chen (Sample Blueprint)',
    role: 'Senior Full Stack & Design Systems Architect',
    targetArchetype: 'Senior Full Stack / Frontend Architect',
    companyHistory: 'Figma · Airbnb · Dropbox',
    atsScore: 97,
    candidate: {
      name: 'Marcus Chen (Sample Blueprint)',
      title: 'Senior Full Stack & Design Systems Architect',
      email: 'marcus.chen@example.com',
      phone: '+1 (555) 019-5832',
      location: 'Seattle, WA',
      linkedin: 'linkedin.com/in/sample-marcus-chen',
      github: 'github.com/sample-marcus-chen',
      website: 'https://example.com'
    },
    summary:
      'Senior Full Stack Architect with 7+ years pioneering enterprise design systems, accessible UI primitives, and sub-second web applications. Spearheaded design system tokenization across 85+ product engineers at Figma, boosting Core Web Vitals to 98+ and slashing frontend bundle sizes by 38% using Next.js, TypeScript, and WebGL.',
    metricsBreakdown: [
      { label: 'Core Web Vitals LCP', value: '0.82s', note: 'From 3.2s legacy baseline' },
      { label: 'Bundle Size Reduction', value: '38% drop', note: 'Tree-shaking & code-splitting' },
      { label: 'Design System Adoption', value: '100% org-wide', note: '85+ product engineers' },
      { label: 'Accessibility Audit', value: '100% WCAG AAA', note: 'Zero compliance regressions' }
    ],
    skills: {
      frontend_core: ['TypeScript', 'React 19', 'Next.js 15', 'Tailwind CSS', 'WebGL', 'WebAssembly (Wasm)'],
      backend_apis: ['Node.js', 'FastAPI', 'GraphQL', 'PostgreSQL', 'Redis', 'WebSockets'],
      design_systems: ['Token Studio', 'Figma Plugin API', 'Radix UI', 'Storybook', 'WCAG AAA Accessibility'],
      tooling_performance: ['Vite', 'Turborepo', 'Vitest', 'Playwright', 'Core Web Vitals Optimization']
    },
    work_history: [
      {
        company: 'Figma',
        role: 'Staff Design Systems Engineer',
        location: 'San Francisco, CA (Remote)',
        start_date: '2022',
        end_date: 'Present',
        bullets: [
          'Architected unified multi-platform design token engine powering web, desktop, and mobile editors across 85+ feature engineers.',
          'Engineered canvas rendering optimization using WebAssembly and WebGL code-paths, slashing frame-drop rate by 74% on complex multi-page files.',
          'Reduced core application bundle size by 38% through granular code-splitting and dynamic asset hydration, driving Core Web Vitals LCP from 3.2s down to 0.82s.',
          'Created automated accessibility testing suite with Playwright and Axe-Core in CI, certifying 100% WCAG AAA compliance across all component primitives.'
        ]
      },
      {
        company: 'Airbnb',
        role: 'Senior Full Stack Engineer',
        location: 'Seattle, WA',
        start_date: '2018',
        end_date: '2022',
        bullets: [
          'Led redesign of host reservation calendar servicing 4.2M active listings, cutting checkout abandonment rate by 14% and generating an estimated $8.2M ARR.',
          'Built high-performance GraphQL federated gateways in Node.js and TypeScript handling 120,000 queries/minute with 99.98% reliability.'
        ]
      }
    ],
    education: [
      {
        institution: 'University of Washington',
        degree: 'B.S. in Human-Centered Design & Engineering (HCDE)',
        graduation_year: '2018',
        honors: 'Magna Cum Laude · Dean’s List'
      }
    ],
    projects: [
      {
        name: 'Aura UI / Headless Accessible Component Engine',
        tech_stack: 'TypeScript, React, CSS Variables, Wasm',
        bullets: [
          'Published open-source accessible UI library with 3,600+ GitHub stars and 85,000 weekly npm downloads.',
          'Engineered keyboard navigation state machines with 100% screen-reader compliance across NVDA, JAWS, and VoiceOver.'
        ]
      }
    ],
    certifications: [
      { name: 'Certified Professional in Web Accessibility (CPWA)', year: '2021' }
    ]
  }
];

export function getExemplarById(id = DEFAULT_EXEMPLAR_ID) {
  const norm = String(id || '').toLowerCase().trim();
  return (
    EXEMPLAR_RESUMES.find((ex) => ex.id === norm || ex.name.toLowerCase().includes(norm)) ||
    EXEMPLAR_RESUMES[0]
  );
}

export function getAllExemplars() {
  return EXEMPLAR_RESUMES;
}

/**
 * Retrieves the top 2 verified publication-grade exemplar bullets matching a target domain or bullet text.
 * Used as few-shot style anchors for bullet rewriting so the model imitates quantified metric density.
 *
 * @param {string} [bulletText=''] - Candidate original bullet
 * @param {string} [targetDomain=''] - Target engineering role or domain (e.g. backend, cloud, frontend)
 * @returns {string[]} Array of 2 verified exemplar bullets
 */
export function retrieveExemplarBulletAnchors(bulletText = '', targetDomain = '') {
  const query = `${targetDomain} ${bulletText}`.toLowerCase();
  const queryTokens = query.split(/\s+/).filter(t => t.length > 2);

  const allExemplarBullets = EXEMPLAR_RESUMES.flatMap(ex => 
    ex.work_history.flatMap(job => job.bullets || [])
  );

  const scored = allExemplarBullets.map(bullet => {
    const lower = bullet.toLowerCase();
    let score = 0;
    // Metric presence boost
    if (/\d+%|\$\d+|\d+x|\d+\s*(ms|events|req|users|clusters)/i.test(bullet)) {
      score += 5;
    }
    // Action verb start boost
    if (/^[A-Z][a-z]+ed\b/.test(bullet)) {
      score += 2;
    }
    // Token matches
    for (const token of queryTokens) {
      if (lower.includes(token)) score += 3;
    }
    return { bullet, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, 2).map(s => s.bullet);
}
