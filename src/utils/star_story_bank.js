/**
 * star_story_bank.js
 * ==================
 * Structured narrative story vault for high-stakes behavioral and leadership interviews.
 * Implements the STAR (Situation, Task, Action, Result) methodology with automated
 * completeness scoring, competency categorization, and intelligent prompt retrieval.
 *
 * 100% Client-side execution • $0 Cost • Zero Cloud Transmission
 */

export const CORE_COMPETENCIES = {
  leadership: {
    id: 'leadership',
    label: 'Leadership & Initiative',
    color: '#6366f1',
    bg: 'rgba(99, 102, 241, 0.1)',
    border: 'rgba(99, 102, 241, 0.3)',
    description: 'Taking ownership, driving technical consensus, unblocking peers, and leading through ambiguity.',
    keywords: ['lead', 'leadership', 'initiative', 'ownership', 'mentor', 'driven', 'decision', 'direction', 'spearheaded', 'organized']
  },
  conflict: {
    id: 'conflict',
    label: 'Conflict & Disagreement',
    color: '#f59e0b',
    bg: 'rgba(245, 158, 11, 0.1)',
    border: 'rgba(245, 158, 11, 0.3)',
    description: 'Resolving architectural disagreements, pushing back constructively on requirements, and achieving alignment.',
    keywords: ['conflict', 'disagree', 'disagreement', 'argument', 'pushback', 'compromise', 'consensus', 'alignment', 'differing']
  },
  scalability: {
    id: 'scalability',
    label: 'System Scalability & Performance',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.1)',
    border: 'rgba(16, 185, 129, 0.3)',
    description: 'Diagnosing bottlenecks, scaling distributed pipelines, lowering latency, and engineering high-throughput architectures.',
    keywords: ['scale', 'scalability', 'performance', 'latency', 'throughput', 'bottleneck', 'load', 'capacity', 'concurrency', 'optimization']
  },
  failure: {
    id: 'failure',
    label: 'Incident Response & Failure Recovery',
    color: '#ef4444',
    bg: 'rgba(239, 68, 68, 0.1)',
    border: 'rgba(239, 68, 68, 0.3)',
    description: 'Mitigating production outages, conducting blameless post-mortems, and learning from architectural mistakes.',
    keywords: ['fail', 'failure', 'outage', 'incident', 'bug', 'mistake', 'post-mortem', 'downtime', 'crash', 'recovery', 'mitigation', 'root cause']
  },
  tradeoffs: {
    id: 'tradeoffs',
    label: 'Engineering Tradeoffs & Deadlines',
    color: '#8b5cf6',
    bg: 'rgba(139, 92, 246, 0.1)',
    border: 'rgba(139, 92, 246, 0.3)',
    description: 'Pragmatically balancing technical debt against delivery deadlines, cutting scope safely, and managing phased rollouts.',
    keywords: ['tradeoff', 'trade-off', 'deadline', 'tech debt', 'technical debt', 'compromise', 'pragmatic', 'scope', 'phased', 'timeline']
  },
  collaboration: {
    id: 'collaboration',
    label: 'Cross-Functional Collaboration',
    color: '#06b6d4',
    bg: 'rgba(6, 182, 212, 0.1)',
    border: 'rgba(6, 182, 212, 0.3)',
    description: 'Partnering across Product, Design, QA, Security, and Executive stakeholders to ship customer value.',
    keywords: ['collaborate', 'collaboration', 'partner', 'cross-functional', 'product manager', 'stakeholder', 'design', 'alignment', 'coordination']
  },
  culture: {
    id: 'culture',
    label: 'Mentorship & Engineering Culture',
    color: '#ec4899',
    bg: 'rgba(236, 72, 153, 0.1)',
    border: 'rgba(236, 72, 153, 0.3)',
    description: 'Upskilling junior engineers, instituting code review standards, and fostering high-trust engineering excellence.',
    keywords: ['mentor', 'mentorship', 'culture', 'coach', 'onboarding', 'training', 'upskill', 'junior', 'review standards', 'pair programming']
  }
};

/**
 * Creates a clean, normalized STAR story record with unique identifier and timestamps.
 */
export function createStarStory(params = {}) {
  const now = new Date().toISOString();
  return {
    id: params.id || `star_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
    title: String(params.title || '').trim() || 'Untitled STAR Story',
    competency: params.competency && CORE_COMPETENCIES[params.competency] ? params.competency : 'leadership',
    situation: String(params.situation || '').trim(),
    task: String(params.task || '').trim(),
    action: String(params.action || '').trim(),
    result: String(params.result || '').trim(),
    tags: Array.isArray(params.tags) 
      ? params.tags.map(t => String(t).trim()).filter(Boolean) 
      : typeof params.tags === 'string' 
        ? params.tags.split(',').map(t => t.trim()).filter(Boolean) 
        : [],
    created_at: params.created_at || now,
    updated_at: now
  };
}

/**
 * Validates whether an object is a well-formed STAR story.
 */
export function validateStarStory(story) {
  if (!story || typeof story !== 'object') return false;
  return Boolean(
    story.title &&
    story.situation &&
    story.task &&
    story.action &&
    story.result
  );
}

/**
 * Audits a STAR story against tier-1 behavioral interview rubrics.
 * Evaluates context depth, ownership phrasing, active past-tense verbs, and quantified metrics.
 *
 * @param {Object} story
 * @returns {{ score: number, isComplete: boolean, breakdown: Object, feedback: string[] }}
 */
export function auditStarCompleteness(story = {}) {
  const feedback = [];
  let situationScore = 0;
  let taskScore = 0;
  let actionScore = 0;
  let resultScore = 0;

  const sit = String(story.situation || '').trim();
  const tsk = String(story.task || '').trim();
  const act = String(story.action || '').trim();
  const res = String(story.result || '').trim();

  // 1. Situation Analysis (25 pts max)
  if (!sit) {
    feedback.push('Missing Situation: describe the operational setting, stakes, or business challenge.');
  } else if (sit.length < 30) {
    situationScore = 12;
    feedback.push('Situation is brief: elaborate on the team size, system scale, or company impact.');
  } else {
    situationScore = 20;
    if (/\b(when|during|faced with|at my previous|legacy|production|high-traffic|deadline|critical)\b/i.test(sit)) {
      situationScore += 5;
    }
  }

  // 2. Task Analysis (25 pts max)
  if (!tsk) {
    feedback.push('Missing Task: define your specific objective and personal responsibility.');
  } else if (tsk.length < 25) {
    taskScore = 12;
    feedback.push('Task is brief: clarify what YOU were personally held accountable for.');
  } else {
    taskScore = 20;
    if (/\b(my role|my task|responsible for|objective|mandate|goal|deliverable|mandated)\b/i.test(tsk)) {
      taskScore += 5;
    }
  }

  // 3. Action Analysis (25 pts max)
  if (!act) {
    feedback.push('Missing Action: outline the concrete technical and leadership steps you executed.');
  } else if (act.length < 40) {
    actionScore = 10;
    feedback.push('Action is too short: detail the architectural tools, protocols, and technical decisions made.');
  } else {
    actionScore = 18;
    // Check strong active engineering verbs
    const hasStrongVerbs = /\b(architected|built|designed|implemented|spearheaded|refactored|migrated|optimized|diagnosed|deployed|decoupled)\b/i.test(act);
    if (hasStrongVerbs) actionScore += 7;

    // Penalize weak passive verbs
    const hasPassive = /\b(helped with|assisted with|worked on|participated in)\b/i.test(act);
    if (hasPassive) {
      actionScore = Math.max(8, actionScore - 6);
      feedback.push('Replace passive phrases ("helped with", "worked on") with active ownership verbs ("architected", "spearheaded").');
    }
  }

  // 4. Result Analysis (25 pts max)
  if (!res) {
    feedback.push('Missing Result: provide the final outcome and quantified performance impact.');
  } else if (res.length < 25) {
    resultScore = 10;
    feedback.push('Result is unquantified: include numbers, latency percentages, or dollar savings.');
  } else {
    resultScore = 15;
    // Check for quantified numbers, percentages, or metric markers
    const hasQuantified = /([0-9]+%|\$[0-9]+|[0-9]+\s*(ms|sec|x|k|m|gb|tb)|reduced|increased|saved|zero downtime)/i.test(res);
    if (hasQuantified) {
      resultScore += 10;
    } else {
      feedback.push('Strengthen Result by adding quantified metrics (e.g. "reduced p99 latency by 45ms", "saved $40k/yr", "achieved 99.99% uptime").');
    }
  }

  const score = Math.min(100, Math.max(0, situationScore + taskScore + actionScore + resultScore));
  const isComplete = score >= 75 && Boolean(sit && tsk && act && res);

  return {
    score,
    isComplete,
    breakdown: {
      situation: situationScore,
      task: taskScore,
      action: actionScore,
      result: resultScore
    },
    feedback
  };
}

/**
 * Searches and ranks candidate STAR stories against an interview prompt or query.
 * Evaluates competency keyword intersections, title token matches, and story body relevance.
 *
 * @param {string} queryOrPrompt
 * @param {Array<Object>} starStories
 * @param {Object} [options]
 * @returns {Array<{ story: Object, score: number, matchedCompetency: string }>}
 */
export function findRelevantStarStories(queryOrPrompt = '', starStories = [], options = {}) {
  const { topK = 3, minScore = 1 } = options;
  if (!Array.isArray(starStories) || starStories.length === 0) return [];

  const rawQuery = String(queryOrPrompt || '').toLowerCase();
  const queryTokens = rawQuery.split(/\W+/).filter(t => t.length > 2);
  if (queryTokens.length === 0) {
    return starStories.slice(0, topK).map(s => ({ story: s, score: 0, matchedCompetency: s.competency }));
  }

  // Check which core competency matches best with query tokens
  let bestCompetency = null;
  let maxCompetencyHits = 0;
  for (const [compKey, meta] of Object.entries(CORE_COMPETENCIES)) {
    const hits = meta.keywords.filter(kw => rawQuery.includes(kw)).length;
    if (hits > maxCompetencyHits) {
      maxCompetencyHits = hits;
      bestCompetency = compKey;
    }
  }

  const scored = starStories.map(story => {
    let score = 0;
    const titleText = (story.title || '').toLowerCase();
    const tagText = (story.tags || []).join(' ').toLowerCase();
    const bodyText = `${story.situation || ''} ${story.task || ''} ${story.action || ''} ${story.result || ''}`.toLowerCase();

    // 1. Competency boost
    if (bestCompetency && story.competency === bestCompetency) {
      score += 15;
    }

    // 2. Title & tag hits
    for (const token of queryTokens) {
      if (titleText.includes(token)) score += 6;
      if (tagText.includes(token)) score += 4;
      if (bodyText.includes(token)) score += 1.5;
    }

    return {
      story,
      score,
      matchedCompetency: story.competency || 'leadership'
    };
  });

  return scored
    .filter(item => item.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, topK);
}

/**
 * Formats a STAR story into clean Markdown outline ready for Copilot context or PrepCenter insertion.
 */
export function formatStarStoryForPrompt(story = {}) {
  if (!story || !story.title) return '';
  const compMeta = CORE_COMPETENCIES[story.competency] || { label: 'Behavioral' };
  
  return `### STAR Story: ${story.title} (${compMeta.label})
- **Situation:** ${story.situation || 'N/A'}
- **Task:** ${story.task || 'N/A'}
- **Action:** ${story.action || 'N/A'}
- **Result:** ${story.result || 'N/A'}`;
}

/**
 * Curated starter STAR stories to help candidates bootstrap their bank in 1 click.
 */
export const SEED_STAR_STORIES = [
  {
    title: 'Resolving Black Friday Payment Gateway Outage',
    competency: 'failure',
    situation: 'During peak traffic, our third-party payment gateway degraded, triggering cascading thread exhaustion across 18 backend microservices.',
    task: 'As the on-call Lead Engineer, my goal was to halt transaction loss, isolate the faulty vendor endpoint, and restore checkout throughput within a 15-minute SLA.',
    action: 'I immediately engaged circuit breakers in Redis, routed payment payloads to an asynchronous fallback queue, deployed an expedited patch with exponential backoff, and led the blameless post-mortem.',
    result: 'Restored 100% checkout availability in 9 minutes, recovered $180,000 in deferred transactions, and established synthetic canary monitors preventing future regressions.',
    tags: ['Incident Response', 'Microservices', 'Redis', 'Circuit Breaker', 'Post-Mortem']
  },
  {
    title: 'Distributed Ingestion Scaling from 10k to 500k req/s',
    competency: 'scalability',
    situation: 'Our monolithic analytics database was dropping 18% of inbound events during international market opening surges.',
    task: 'I was tasked with architecting a zero-loss streaming pipeline capable of handling 500k requests/second under sub-50ms p99 latency constraints.',
    action: 'I decoupled the ingestion tier using partitioned Apache Kafka topics, implemented an in-memory batch accumulator in Go, and migrated long-term persistence to ClickHouse.',
    result: 'Reduced tail p99 latency from 450ms to 38ms, achieved zero dropped events over 6 months of operation, and cut monthly cloud infrastructure spend by 32%.',
    tags: ['Kafka', 'Go', 'ClickHouse', 'High Throughput', 'Distributed Systems']
  },
  {
    title: 'Refactoring Core Data Schema Under Hard Product Deadlines',
    competency: 'conflict',
    situation: 'Product leadership demanded shipping an enterprise permissions feature in 2 weeks, but our relational schema had tight circular foreign keys that would degrade queries.',
    task: 'My objective was to convince product stakeholders of the long-term risk and negotiate an architecture that satisfied the launch timeline without accumulating crippling tech debt.',
    action: 'I benchmarked projected query degradation, presented a phased dual-write migration strategy with clear trade-offs, and paired with frontend leads to decouple schema dependencies.',
    result: 'Shipped phase 1 on time for launch, completed zero-downtime schema migration, and preserved 15ms query latencies across 1.2M enterprise rows.',
    tags: ['Architecture Tradeoffs', 'PostgreSQL', 'Zero Downtime', 'Consensus Building']
  },
  {
    title: 'Mentoring Junior Engineers & Instituting Architecture RFCs',
    competency: 'culture',
    situation: 'Our engineering team experienced high velocity variance and missed sprint deliverables due to inconsistent code review standards and junior onboarding bottlenecks.',
    task: 'As Tech Lead, my goal was to establish structured mentorship, accelerate junior engineer time-to-first-commit, and institute blameless engineering RFCs within 60 days.',
    action: 'I spearheaded weekly pair-programming rotations, authored a modular onboarding architecture guide, and introduced automated linting and PR template guidelines.',
    result: 'Accelerated junior onboarding from 6 weeks to 11 days, increased sprint delivery from 64% to 94%, and guided two engineers to Mid and Senior promotions.',
    tags: ['Mentorship', 'Engineering Culture', 'RFCs', 'Onboarding', 'Code Review']
  },
  {
    title: 'Campus Capstone: Real-Time Collaborative Whiteboard',
    competency: 'leadership',
    situation: 'During our senior university capstone project, our 4-person team faced critical WebSocket synchronization lags and frequent room disconnects 3 weeks before final demonstration.',
    task: 'My role was to take personal ownership of the real-time networking layer, design state reconciliation protocols, and eliminate room desynchronization across concurrent student sessions.',
    action: 'I implemented operational transformation algorithms using Socket.io and Redis pub/sub, redesigned room state reconciliation, and deployed containerized backend instances on Docker.',
    result: 'Reduced synchronization latency from 650ms to 42ms, supported 60 concurrent campus users without packet drops, and earned the department Highest Distinction Capstone Award.',
    tags: ['Campus Project', 'WebSocket', 'Node.js', 'Redis', 'Docker', 'Fresher / Junior']
  },
  {
    title: 'SWE Internship: Automated PR Test Suite & Flaky Test Elimination',
    competency: 'tradeoffs',
    situation: 'During my first software engineering internship, the engineering team suffered from 45-minute deployment pipelines caused by 120+ unisolated legacy integration tests failing intermittently.',
    task: 'My task was to diagnose the root cause of flaky test failures, parallelize test execution, and reduce CI feedback time for 14 active developers.',
    action: 'I refactored asynchronous database setup hooks using Jest and Testcontainers, designed isolated in-memory SQLite mocks for unit tests, and implemented GitHub Actions matrix parallelism.',
    result: 'Reduced test execution time by 68% (from 45m down to 14m), eliminated 100% of false-positive build alerts, and unblocked an estimated 15 developer hours every sprint.',
    tags: ['Internship', 'CI/CD', 'GitHub Actions', 'Jest', 'Testing', 'Fresher / Junior']
  },
  {
    title: 'Junior Developer: Optimizing First Contentful Paint & Mobile Responsiveness',
    competency: 'scalability',
    situation: 'When I joined as an Associate Frontend Engineer, mobile bounce rates on our customer onboarding flow spiked to 38% due to bloated 4.2MB JavaScript bundles on slow 4G connections.',
    task: 'Responsible for diagnosing bundle bottlenecks and accelerating mobile Core Web Vitals to meet Google Lighthouse performance thresholds.',
    action: 'I refactored monolithic vendor imports with dynamic React lazy loading, optimized raster assets into WebP format, and implemented client-side route-level prefetching.',
    result: 'Reduced mobile bundle size by 58% (from 4.2MB to 1.7MB), improved First Contentful Paint by 1.4s, and increased mobile onboarding conversion by 19% across 25,000 monthly visits.',
    tags: ['Junior SWE', 'React', 'Web Vitals', 'Performance', 'Bundle Optimization', 'Fresher / Junior']
  }
];

/**
 * Transforms an informal 1-3 sentence project win or career journal note into a
 * structured, high-impact STAR story (Situation, Task, Action, Result).
 *
 * @param {string} rawWinText - Informal note (e.g. "Sped up Postgres queries from 8s to 200ms using Redis and indexing")
 * @param {Object} [options={}] - Optional metadata (competency, tags, role)
 * @returns {Object} Structured STAR story object compatible with createStarStory
 */
export function formatProjectWinToStarStory(rawWinText = '', options = {}) {
  const clean = String(rawWinText || '').trim();
  if (!clean) {
    return createStarStory({
      title: 'Engineering Milestone',
      competency: options.competency || 'scalability',
      situation: 'Identified a critical operational bottleneck in production infrastructure affecting throughput and reliability.',
      task: 'Tasked with diagnosing root causes and architecting a scalable remediation to meet engineering performance SLAs.',
      action: 'Implemented targeted architectural refactoring, decoupled data flows, and established automated telemetry monitors.',
      result: 'Delivered measurable performance improvements with zero production regressions and improved developer velocity.',
      tags: options.tags || ['Architecture', 'Reliability']
    });
  }

  // 1. Detect Competency from raw text if not provided
  let competency = options.competency;
  if (!competency || !CORE_COMPETENCIES[competency]) {
    const lower = clean.toLowerCase();
    for (const [key, meta] of Object.entries(CORE_COMPETENCIES)) {
      if (meta.keywords.some(kw => lower.includes(kw))) {
        competency = key;
        break;
      }
    }
    if (!competency) competency = 'scalability';
  }

  // 2. Extract technologies / tags
  const knownTech = [
    'react', 'typescript', 'javascript', 'node.js', 'python', 'go', 'golang', 'rust',
    'java', 'c++', 'c#', 'postgresql', 'postgres', 'mysql', 'redis', 'kafka', 'docker',
    'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'graphql', 'rest api', 'ci/cd',
    'elasticsearch', 'clickhouse', 'mongodb', 'fastapi', 'next.js', 'microservices'
  ];
  const detectedTags = [];
  const lowerClean = clean.toLowerCase();
  for (const tech of knownTech) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const rx = new RegExp(`\\b${escaped}\\b`, 'i');
    if (rx.test(lowerClean)) {
      detectedTags.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }

  // 3. Extract metrics or numbers
  const metricMatch = clean.match(/(\d+(?:\.\d+)?%|\b\d+x\b|\b\d+\s*(?:ms|s|sec|seconds|min|minutes|hours|days|k|m|qps|users|req\/s)\b|\$\d+[\d,]*)/i);
  const metricFound = metricMatch ? metricMatch[0] : '';

  // 4. Derive Title
  let title = options.title || '';
  if (!title) {
    const words = clean.split(/\s+/).slice(0, 6).join(' ');
    title = words.length > 5 ? `${words.charAt(0).toUpperCase() + words.slice(1)}...` : `${CORE_COMPETENCIES[competency]?.label || 'Engineering'} Initiative`;
    if (detectedTags.length > 0 && metricFound) {
      title = `${detectedTags.slice(0, 2).join(' / ')} Optimization (${metricFound})`;
    }
  }

  // 5. Structure into STAR
  let situation = `Our production environment encountered constraints during high-demand workflows: "${clean.slice(0, 180)}".`;
  let task = `As the responsible engineer, my objective was to take ownership of this bottleneck, design a resilient fix, and deliver measurable reliability without accumulating technical debt.`;
  let action = `I analyzed system telemetry, implemented targeted optimizations incorporating ${detectedTags.length > 0 ? detectedTags.join(', ') : 'modern architectural patterns'}, and verified end-to-end performance under simulated load.`;
  let result = metricFound 
    ? `Successfully resolved the challenge, achieving ${metricFound} improvement, zero downstream regressions, and enhanced operational stability.`
    : `Successfully resolved the bottleneck, eliminating system latency spikes and establishing robust automated monitoring for the team.`;

  // If user text contains detailed clauses, adapt directly
  if (clean.length > 100) {
    situation = `While working on mission-critical architecture, our team faced an operational challenge: ${clean.split(/[.!?;]/)[0] || clean}.`;
    action = `I spearheaded the remediation by engineering targeted technical solutions: ${clean}.`;
  }

  return createStarStory({
    title,
    competency,
    situation,
    task,
    action,
    result,
    tags: Array.from(new Set([...(options.tags || []), ...detectedTags])).slice(0, 5)
  });
}
