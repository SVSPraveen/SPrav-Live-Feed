/**
 * copilot_knowledge_engine.js
 * ===========================
 * Orchestrator and Query Matching Engine for SPrav Copilot.
 * Aggregates 110+ queries across 22 senior research domain clusters.
 */

export * from './copilot_knowledge/index.js';

import {
  DOMAIN_1_ARCHITECTURE,
  DOMAIN_2_SECURITY,
  DOMAIN_3_ATS_DISCOVERY,
  DOMAIN_4_GHOST_JOBS,
  DOMAIN_5_ATS_SCORING,
  DOMAIN_6_RESUME_TAILORING,
  DOMAIN_7_ANTI_AI_TELLS,
  DOMAIN_8_STAR_STORIES,
  DOMAIN_9_ATS_COMPILERS,
  DOMAIN_10_WEBGPU_AI,
  DOMAIN_11_OLLAMA,
  DOMAIN_12_BYOK,
  DOMAIN_13_DISPATCH,
  DOMAIN_14_EXTENSION,
  DOMAIN_15_LOCATION,
  DOMAIN_16_ASSESSMENTS,
  DOMAIN_17_BLUEPRINTS,
  DOMAIN_18_NEGOTIATION,
  DOMAIN_19_OUTREACH,
  DOMAIN_20_EMERGING_ROLES,
  DOMAIN_21_STRATEGY,
  DOMAIN_22_VAULT,
  SENIOR_RESEARCH_DOMAINS
} from './copilot_knowledge/index.js';

// ─── Master Catalog: 110 Comprehensive Queries Across 22 Domains ─────────────
export const COPILOT_FAQ_CATALOG = [
  ...DOMAIN_1_ARCHITECTURE,
  ...DOMAIN_2_SECURITY,
  ...DOMAIN_3_ATS_DISCOVERY,
  ...DOMAIN_4_GHOST_JOBS,
  ...DOMAIN_5_ATS_SCORING,
  ...DOMAIN_6_RESUME_TAILORING,
  ...DOMAIN_7_ANTI_AI_TELLS,
  ...DOMAIN_8_STAR_STORIES,
  ...DOMAIN_9_ATS_COMPILERS,
  ...DOMAIN_10_WEBGPU_AI,
  ...DOMAIN_11_OLLAMA,
  ...DOMAIN_12_BYOK,
  ...DOMAIN_13_DISPATCH,
  ...DOMAIN_14_EXTENSION,
  ...DOMAIN_15_LOCATION,
  ...DOMAIN_16_ASSESSMENTS,
  ...DOMAIN_17_BLUEPRINTS,
  ...DOMAIN_18_NEGOTIATION,
  ...DOMAIN_19_OUTREACH,
  ...DOMAIN_20_EMERGING_ROLES,
  ...DOMAIN_21_STRATEGY,
  ...DOMAIN_22_VAULT
];

// ─── Context Interpolation Helper ───────────────────────────────────────────
function interpolateContext(text, context = {}) {
  if (!text || typeof text !== 'string') return text;
  const name = context.candidateName || context.name || 'Candidate';
  const title = context.candidateTitle || context.targetTitle || 'Software Engineer';
  const skills = Array.isArray(context.topSkills) && context.topSkills.length > 0
    ? context.topSkills.slice(0, 5).join(', ')
    : 'React, Node.js, Distributed Systems, Python';
  const roles = Array.isArray(context.targetRoles) && context.targetRoles.length > 0
    ? context.targetRoles.slice(0, 3).join(', ')
    : 'Full Stack Engineer, Senior Frontend Engineer';
  const totalJobs = context.totalJobs || context.jobCount || 0;
  const pendingCount = context.pendingCount || 0;

  return text
    .replace(/\{candidateName\}/g, name)
    .replace(/\{candidateTitle\}/g, title)
    .replace(/\{topSkills\}/g, skills)
    .replace(/\{targetRoles\}/g, roles)
    .replace(/\{totalJobs\}/g, String(totalJobs))
    .replace(/\{pendingCount\}/g, String(pendingCount));
}

// ─── Query Matching Engine ──────────────────────────────────────────────────
/**
 * Find the most authoritative answer for a candidate query.
 * Matches against regex patterns, exact/partial titles, and keyword relevance.
 *
 * @param {string} rawQuery User prompt
 * @param {Object} [candidateContext={}] Dynamic candidate context for interpolation
 * @returns {Object|null} Match result with title, answer, category, relatedQueries, or null
 */
export function findCopilotAnswer(rawQuery, candidateContext = {}) {
  if (!rawQuery || typeof rawQuery !== 'string') return null;
  const query = rawQuery.trim();
  if (query.length < 2) return null;

  // 1. High-priority regex pattern matching
  for (const item of COPILOT_FAQ_CATALOG) {
    if (Array.isArray(item.patterns)) {
      for (const pattern of item.patterns) {
        if (pattern.test(query)) {
          return {
            id: item.id,
            category: item.category,
            title: item.title,
            answer: interpolateContext(item.answer, candidateContext),
            relatedQueries: item.relatedQueries || [],
            contextTab: item.contextTab,
            matchType: 'regex_pattern'
          };
        }
      }
    }
  }

  // 2. Exact or substring title matching
  const normalized = query.toLowerCase();
  for (const item of COPILOT_FAQ_CATALOG) {
    const itemTitle = item.title.toLowerCase();
    if (itemTitle === normalized || itemTitle.includes(normalized) || normalized.includes(itemTitle)) {
      return {
        id: item.id,
        category: item.category,
        title: item.title,
        answer: interpolateContext(item.answer, candidateContext),
        relatedQueries: item.relatedQueries || [],
        contextTab: item.contextTab,
        matchType: 'title_match'
      };
    }
  }

  // 3. Multi-keyword scoring fallback on titles
  const queryWords = normalized
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['what', 'when', 'where', 'which', 'who', 'whom', 'whose', 'why', 'how', 'does', 'with', 'from', 'this', 'that', 'have', 'should', 'could', 'would', 'describe', 'tell', 'give'].includes(w));

  if (queryWords.length > 0) {
    let bestScore = 0;
    let bestItem = null;

    for (const item of COPILOT_FAQ_CATALOG) {
      let score = 0;
      const titleLower = item.title.toLowerCase();

      for (const word of queryWords) {
        if (titleLower.includes(word)) score += 3;
      }

      if (score > bestScore) {
        bestScore = score;
        bestItem = item;
      }
    }

    // Require at least 2 distinct keyword matches on the title
    if (bestScore >= 6 && bestItem) {
      return {
        id: bestItem.id,
        category: bestItem.category,
        title: bestItem.title,
        answer: interpolateContext(bestItem.answer, candidateContext),
        relatedQueries: bestItem.relatedQueries || [],
        contextTab: bestItem.contextTab,
        matchType: 'keyword_score',
        score: bestScore
      };
    }
  }

  return null;
}

// ─── Tab-Contextual Suggested Queries ───────────────────────────────────────
const TAB_SUGGESTION_MAP = {
  jobs: [
    'How does SPrav detect ghost jobs?',
    'How is the ATS rubric score calculated?',
    'How does 1-Click Guided Dispatch work in SPrav?',
    'How do I search direct ATS career boards without third-party aggregator spam?'
  ],
  tailor: [
    'How does the AI Resume Tailoring engine work?',
    'What is the Zero-Fabrication Contract and how does it protect me?',
    'How does SPrav scan for anti-AI tell phrases and buzzwords?',
    'How do I compile and download my tailored resume as an ATS-compliant DOCX file?'
  ],
  resume: [
    'How does SPrav scan for anti-AI tell phrases and buzzwords?',
    'How does the ATS-friendly DOCX compiler work?',
    'Why do complex multi-column resume templates fail in modern ATS systems?',
    'What signals demonstrate senior-level scope and engineering ownership on a resume?'
  ],
  stories: [
    'How do I structure a STAR story for behavioral interviews?',
    'How do I tailor STAR stories to Amazon Leadership Principles?',
    'How do I quantify business impact in my STAR stories without guessing metrics?',
    'What is the interview pattern for Google and Meta engineering rounds?'
  ],
  tracker: [
    'How does the Online Assessment (OA) Gateway tracker work?',
    'How do deadline countdown timers prevent missed OA opportunities?',
    'How should I prepare for HackerRank, CodeSignal, and LeetCode OAs?',
    'How do I triage and prioritize jobs in my application queue?'
  ],
  negotiation: [
    'What are the rules of Chris Voss style salary negotiation?',
    'How do I frame a counter-offer email without sounding aggressive?',
    'How do I calculate Total Compensation (TC) including bonus and equity?',
    'How does SPrav estimate market compensation bands?'
  ],
  outreach: [
    'What is the ideal 300-character LinkedIn connection note template?',
    'How do I write a high-impact cold email directly to the Engineering Manager?',
    'How do I find the verified corporate email of a hiring manager?',
    'What is the optimal follow-up cadence after an interview or initial outreach?'
  ],
  scope: [
    'How do I set up geographic location scoping in SPrav?',
    'How do I filter for true remote vs hybrid or return-to-office jobs?',
    'Which global tech hubs and cities are supported in location scoping?',
    'What is role alias normalization and how does it prevent missing jobs?'
  ],
  settings: [
    'How do I get a 100% free Groq API key for ultra-fast inference?',
    'How do I use Google Gemini 2.0 Flash in SPrav?',
    'How does WebGPU run AI models 100% locally in the browser?',
    'How do I connect SPrav to Ollama running locally?'
  ],
  analytics: [
    'How does SPrav calculate interview callback probability?',
    'How does SPrav detect ghost jobs and stale listings?',
    'How is the 5-dimension rubric score calculated?',
    'How do I export a complete encrypted backup of my SPrav vault?'
  ],
  profile: [
    'What is the Zero-Fabrication Contract and how does it protect me?',
    'How should I explain a career gap or sabbatical on my resume?',
    'How does the Master Passphrase encryption protect my profile and keys?',
    'Can SPrav pre-populate answers for common recruiter screening questions?'
  ],
  default: [
    'Who created SPrav Job AI and what is the mission?',
    'What is the Anti-SaaS philosophy of SPrav?',
    'How does SPrav work with zero backend servers?',
    'How does SPrav detect ghost jobs?'
  ]
};

/**
 * Return curated suggested prompt pills for the active tab.
 *
 * @param {string} [tab='jobs'] Active tab identifier
 * @param {number} [limit=4] Maximum suggestions to return
 * @returns {Array<string>} List of suggested query strings
 */
export function getSuggestedQueriesForTab(tab = 'jobs', limit = 4) {
  const normalized = (tab || '').toLowerCase().trim();
  const queries = TAB_SUGGESTION_MAP[normalized] || TAB_SUGGESTION_MAP.default;
  return queries.slice(0, limit);
}

/**
 * Free-text search across the full 110+ FAQ catalog.
 *
 * @param {string} keyword Search term
 * @param {number} [limit=10] Maximum results
 * @returns {Array<Object>} Matching catalog items
 */
export function searchFaq(keyword, limit = 10) {
  if (!keyword || typeof keyword !== 'string') return [];
  const term = keyword.toLowerCase().trim();
  if (!term) return [];

  const matches = [];
  for (const item of COPILOT_FAQ_CATALOG) {
    let score = 0;
    if (item.title.toLowerCase().includes(term)) score += 10;
    if (item.answer.toLowerCase().includes(term)) score += 3;
    if (item.category.toLowerCase().includes(term)) score += 5;
    if (Array.isArray(item.relatedQueries)) {
      for (const q of item.relatedQueries) {
        if (q.toLowerCase().includes(term)) score += 2;
      }
    }

    if (score > 0) {
      matches.push({ ...item, searchScore: score });
    }
  }

  return matches
    .sort((a, b) => b.searchScore - a.searchScore)
    .slice(0, limit);
}
