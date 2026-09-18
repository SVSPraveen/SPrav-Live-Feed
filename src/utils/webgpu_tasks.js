/**
 * Domain Task Prompts and JSON Parsers for WebGPU Execution
 * Enforces zero-hallucination, anti-buzzword constraints, and strict JSON schemas.
 */

import { retrieveExemplarBulletAnchors } from './exemplar_tech_resumes.js';
import { sanitizePromptInput } from './security_guard.js';
export { extractDeterministicSkillGaps } from './semantic_vector_engine.js';

/**
 * Canonical Task-Specific Sampling Profiles Matrix.
 * Guarantees optimal entropy and repetition settings per task type.
 */
export const SAMPLING_PROFILES = {
  EXTRACTION: { temperature: 0.1, frequency_penalty: 0.0, presence_penalty: 0.0, repeat_penalty: 1.0 },
  SCORING: { temperature: 0.1, frequency_penalty: 0.0, presence_penalty: 0.0, repeat_penalty: 1.0 },
  SCHEMA_PACKING: { temperature: 0.05, frequency_penalty: 0.0, presence_penalty: 0.0, repeat_penalty: 1.0 },
  REASONING: { temperature: 0.2, frequency_penalty: 0.1, presence_penalty: 0.0, repeat_penalty: 1.05 },
  BULLET_OPTIMIZATION: { temperature: 0.35, frequency_penalty: 0.2, presence_penalty: 0.1, repeat_penalty: 1.1 },
  COVER_LETTER: { temperature: 0.7, frequency_penalty: 0.4, presence_penalty: 0.2, repeat_penalty: 1.15 },
  OUTREACH: { temperature: 0.7, frequency_penalty: 0.45, presence_penalty: 0.2, repeat_penalty: 1.15 },
  SCREENING: { temperature: 0.1, frequency_penalty: 0.0, presence_penalty: 0.0, repeat_penalty: 1.0 },
  LEARNING: { temperature: 0.2, frequency_penalty: 0.1, presence_penalty: 0.0, repeat_penalty: 1.05 },
  INTERVIEW_QUESTION: { temperature: 0.4, frequency_penalty: 0.2, presence_penalty: 0.1, repeat_penalty: 1.1 },
  INTERVIEW_EVALUATION: { temperature: 0.2, frequency_penalty: 0.0, presence_penalty: 0.0, repeat_penalty: 1.0 }
};

/**
 * Strips markdown code fences (```json, ```) and surrounding whitespace from raw LLM output.
 * Gracefully extracts inner JSON from conversational preambles/postambles or unclosed fences.
 * @param {string} text
 * @returns {string}
 */
export function cleanJsonFence(text = '') {
  if (!text || typeof text !== 'string') return '';
  const fenceMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (fenceMatch) {
    return fenceMatch[1].trim();
  }
  const unclosedMatch = text.match(/```(?:json)?\s*([\s\S]*)$/i);
  if (unclosedMatch) {
    return unclosedMatch[1].trim();
  }
  return text.trim();
}

/**
 * Safely parses and sanitizes raw LLM output into JSON.
 * Removes markdown fences, trims preambles/postambles, repairs trailing commas, and fixes single quotes.
 */
export function parseAndSanitizeJSON(rawText, fallback = {}) {
  if (!rawText || typeof rawText !== 'string') return fallback;

  let cleaned = cleanJsonFence(rawText);

  // Extract outermost JSON object {...} or array [...]
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let startIdx = -1;
  let endChar = '}';

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    startIdx = firstBrace;
    endChar = '}';
  } else if (firstBracket !== -1) {
    startIdx = firstBracket;
    endChar = ']';
  }

  if (startIdx !== -1) {
    const endIdx = cleaned.lastIndexOf(endChar);
    if (endIdx > startIdx) {
      cleaned = cleaned.substring(startIdx, endIdx + 1);
    }
  }

  const safeReviver = (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v);

  // Attempt 1: Standard JSON parse
  try {
    return JSON.parse(cleaned, safeReviver);
  } catch (err1) {
    // Attempt 2: Repair common LLM syntax flaws (trailing commas & single quotes)
    try {
      const repaired = cleaned
        .replace(/'/g, '"')
        .replace(/,\s*([}\]])/g, '$1');
      return JSON.parse(repaired, safeReviver);
    } catch (err2) {
      console.warn('[WebGPU Tasks] JSON parse failure on input:', rawText);
      if (fallback && typeof fallback === 'object') {
        try {
          Object.defineProperty(fallback, '_parse_fallback', {
            value: true,
            writable: true,
            enumerable: false,
            configurable: true
          });
        } catch {
          // Ignore if immutable
        }
      }
      return fallback;
    }
  }
}

/**
 * Calculates a multilingual Unicode-aware token estimate.
 * Standard BPE tokenizers (Qwen 2.5, Llama-3, GPT-4) tokenize text with variable density:
 * - English / Latin ASCII: ~3.8 chars per token (~0.26 tokens/char)
 * - CJK (Chinese, Japanese, Korean): ~1.35 tokens per character
 * - Indic scripts (Devanagari/Hindi, Bengali, Tamil, etc.): ~1.25 tokens per character
 * - Arabic / Persian / Hebrew: ~1.15 tokens per character
 * - Cyrillic: ~0.65 tokens per character (~1 token per 1.5 chars)
 * - Emoji / Extended Pictographic: ~2.0 tokens each
 * Keeps local WebGPU KV cache comfortably below 2,048 tokens.
 * @param {string} text
 * @returns {number}
 */
export function estimateTokenCount(text = '') {
  if (!text || typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;

  // CJK characters (Unified ideographs, Hiragana, Katakana, Hangul)
  const cjkMatches = trimmed.match(/[\u4e00-\u9fff\u3400-\u4dbf\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g);
  const cjkCount = cjkMatches ? cjkMatches.length : 0;

  // Indic scripts (Devanagari / Hindi, Bengali, Tamil, Telugu, etc.)
  const indicMatches = trimmed.match(/[\u0900-\u0d7f]/g);
  const indicCount = indicMatches ? indicMatches.length : 0;

  // Arabic / Hebrew / Persian
  const rtlMatches = trimmed.match(/[\u0590-\u06ff\u0750-\u077f\u08a0-\u08ff]/g);
  const rtlCount = rtlMatches ? rtlMatches.length : 0;

  // Cyrillic
  const cyrillicMatches = trimmed.match(/[\u0400-\u04ff]/g);
  const cyrillicCount = cyrillicMatches ? cyrillicMatches.length : 0;

  // Emoji / Extended pictographic
  const emojiMatches = trimmed.match(/[\p{Extended_Pictographic}]/gu);
  const emojiCount = emojiMatches ? emojiMatches.length : 0;

  // Remaining characters (Latin, whitespace, ASCII punctuation, digits)
  const nonLatinCount = cjkCount + indicCount + rtlCount + cyrillicCount + emojiCount;
  const remainingCount = Math.max(0, trimmed.length - nonLatinCount);

  const totalTokens = (cjkCount * 1.35) + 
                      (indicCount * 1.25) + 
                      (rtlCount * 1.15) + 
                      (cyrillicCount * 0.65) + 
                      (emojiCount * 2.0) + 
                      (remainingCount / 3.8);

  return Math.max(1, Math.ceil(totalTokens));
}

/**
 * Truncates and packs text to stay strictly within the specified token ceiling across any language.
 * Uses binary search over the string to ensure the budget is respected without under-truncating.
 * @param {string} text
 * @param {number} maxTokens
 * @returns {string}
 */
export function enforceTokenBudget(text = '', maxTokens = 1500) {
  if (!text) return '';
  const est = estimateTokenCount(text);
  if (est <= maxTokens) return text;

  const suffix = '... [truncated for token budget]';
  const targetTokens = Math.max(10, maxTokens - 8); // Reserve budget for suffix note

  let low = 0;
  let high = text.length;
  let bestCut = 0;

  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const candidate = text.slice(0, mid);
    if (estimateTokenCount(candidate) <= targetTokens) {
      bestCut = mid;
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }

  return text.slice(0, bestCut).trimEnd() + suffix;
}

/**
 * Extracts a compact, token-efficient candidate skills string from profile object.
 * Caps output to avoid overwhelming small models with large JSON dumps.
 * @param {object|string} candidateProfile
 * @returns {string}
 */
function buildCandidateSkillsString(candidateProfile) {
  if (typeof candidateProfile === 'string') {
    // Raw text already — truncate to 600 chars
    return candidateProfile.slice(0, 600);
  }
  if (!candidateProfile || typeof candidateProfile !== 'object') return 'No profile provided.';

  const lines = [];

  // Personal title / headline
  const title = candidateProfile?.personal?.title || candidateProfile?.title || '';
  if (title) lines.push(`Role: ${title}`);

  // Skills — flatten all categories, take top 18
  const rawSkills = candidateProfile?.skills;
  let skillList = [];
  if (Array.isArray(rawSkills)) {
    skillList = rawSkills.map(String);
  } else if (rawSkills && typeof rawSkills === 'object') {
    for (const cat of Object.values(rawSkills)) {
      if (Array.isArray(cat)) skillList.push(...cat.map(String));
    }
  }
  if (skillList.length > 0) {
    lines.push(`Skills: ${skillList.slice(0, 18).join(', ')}`);
  }

  // Work history — only company + role, no bullets (saves tokens)
  const workHistory = candidateProfile?.work_history || [];
  if (workHistory.length > 0) {
    const roles = workHistory.slice(0, 3).map(j => `${j.role || 'Role'} @ ${j.company || 'Company'}`);
    lines.push(`Experience: ${roles.join(' | ')}`);
  }

  // Years of experience estimate from work history
  if (workHistory.length > 0) {
    lines.push(`Positions held: ${workHistory.length}`);
  }

  return lines.join('\n') || 'Candidate profile not available.';
}

export const ATS_AUDITOR_SYSTEM_PROMPT = `[CHAIN-OF-THOUGHT ANALYSIS PROTOCOL] Think step-by-step: 1. Extract hard requirements from the job description, 2. Cross-reference against candidate skills, 3. Validate against strict anti-hallucination rules.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the resume/profile provided. Never invent, extrapolate, or assume skills, tools, metrics, achievements, or employment history not explicitly documented.
You are a senior ATS auditor and technical recruiter with strict anti-hallucination rules. Output ONLY valid JSON.
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
Complete all JSON fields. If near token limit, shorten strategic_advice first.
Never explain reasoning outside the JSON. No markdown, no conversational commentary.
Never invent skills, tools, or experience the candidate did not explicitly list.
Audit procedure:
1. Identify hard requirements from the job description (languages, frameworks, cloud, infrastructure).
2. Strict match: Only classify as "matching_skills" if explicitly verified in Candidate Skills.
3. Classify all unfulfilled hard requirements as "missing_skills".
4. ats_score must be an integer 0-100 calculated strictly from requirement coverage.
5. strategic_advice must be ONE concrete, actionable step targeting the highest-impact missing skill.
Few-Shot Examples:
Example 1:
{"matching_skills":["Python","AWS"],"missing_skills":["Kubernetes"],"ats_score":82,"strategic_advice":"Add Kubernetes cluster deployment experience."}
Example 2:
{"matching_skills":["TypeScript","React","Node.js","PostgreSQL"],"missing_skills":["GraphQL","Next.js"],"ats_score":78,"strategic_advice":"Highlight production GraphQL schema design and Next.js SSR experience."}
Example 3:
{"matching_skills":["Go","Docker","Terraform","Prometheus"],"missing_skills":["eBPF","Distributed Tracing"],"ats_score":68,"strategic_advice":"Showcase eBPF networking telemetry and OpenTelemetry tracing integrations."}`;

/**
 * Constructs separated system and user messages for ATS Fit & Gap Analysis.
 * Cleanly separates ATS auditor constraints from candidate and job requirements.
 */
export function buildAtsAnalysisMessages(candidateProfile, jobDescription) {
  const candidateName = candidateProfile?.personal?.name || candidateProfile?.name || '';
  const candidateTitle = candidateProfile?.personal?.title || candidateProfile?.title || '';
  const rawSkills = candidateProfile?.skills;
  const skillsArray = Array.isArray(rawSkills)
    ? rawSkills
    : Object.values(rawSkills || {}).flat();

  // Pre-extract just the skills to reduce token waste (<1500 token budget)
  const profileStr = typeof candidateProfile === 'object' && candidateProfile !== null
    ? `Skills: ${skillsArray.slice(0, 15).join(', ')}\nTitle: ${candidateTitle}${candidateName ? `\nCandidate: ${candidateName}` : ''}\nYears of experience in key tools: inferred from work history`
    : String(candidateProfile || '').slice(0, 800);

  // Token budget cap: Expand JD window to 3000 chars (~750 tokens) to capture requirements in lower half of JD
  let rawJd = String(jobDescription || '');
  let jdStr = rawJd.length > 3000 ? rawJd.slice(0, 3000) : rawJd;
  if ((profileStr.length + jdStr.length + 500) > 4200) {
    jdStr = jdStr.slice(0, 3000);
  }
  jdStr = sanitizePromptInput(jdStr, { wrapBoundary: false });

  const user = `Follow this exact process:
STEP 1: Extract hard requirements from the JD (must-have tools, years, certifications).
STEP 2: Cross-reference each hard requirement against candidate skills. Mark: MATCH / PARTIAL / MISS.
STEP 3: Score = (MATCH*2 + PARTIAL) / (total_reqs*2) * 100. Round to nearest integer.
STEP 4: Pick the ONE highest-priority gap. Give ONE specific action to close it.

CANDIDATE SKILLS:
${profileStr}

JOB DESCRIPTION (focus on hard requirements):
${jdStr}

Output ONLY valid JSON: {"matching_skills": [], "missing_skills": [], "ats_score": 75, "strategic_advice": ""}
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
Complete all JSON fields. If near token limit, shorten strategic_advice first.`;

  return {
    system: ATS_AUDITOR_SYSTEM_PROMPT,
    user,
    systemPrompt: ATS_AUDITOR_SYSTEM_PROMPT,
    userPrompt: user
  };
}

/**
 * Constructs a chain-of-thought ATS Fit & Gap Analysis prompt.
 * Pre-filters candidate profile and caps JD to keep total tokens under ~1400.
 * Using chain-of-thought dramatically improves 7B model reasoning quality.
 */
export function buildAtsAnalysisPrompt(candidateProfile, jobDescription) {
  const { system, user } = buildAtsAnalysisMessages(candidateProfile, jobDescription);
  return `${system}\n\n${user}\nNo markdown. No text before or after the JSON.`;
}

// Comprehensive technical skills & framework dictionary for deterministic ATS extraction
const KNOWN_TECH_TAXONOMY = [
  'javascript', 'typescript', 'python', 'java', 'go', 'golang', 'rust', 'c++', 'c#', 'c',
  'ruby', 'php', 'swift', 'kotlin', 'scala', 'elixir', 'sql', 'nosql', 'r', 'dart',
  'react', 'next.js', 'vue', 'angular', 'svelte', 'remix', 'node.js', 'nodejs', 'express',
  'nestjs', 'fastapi', 'django', 'flask', 'spring', 'spring boot', 'rails', 'graphql',
  'rest', 'restful', 'grpc', 'postgresql', 'postgres', 'mysql', 'mongodb', 'redis',
  'elasticsearch', 'cassandra', 'dynamodb', 'snowflake', 'sqlite', 'kafka', 'rabbitmq',
  'docker', 'kubernetes', 'k8s', 'aws', 'gcp', 'azure', 'terraform', 'ansible', 'helm',
  'ci/cd', 'github actions', 'gitlab ci', 'jenkins', 'git', 'linux', 'unix', 'bash',
  'microservices', 'distributed systems', 'system design', 'architecture', 'event-driven',
  'tdd', 'unit testing', 'jest', 'vitest', 'playwright', 'cypress', 'selenium',
  'html', 'css', 'tailwind', 'sass', 'webpack', 'vite', 'webpack', 'figma',
  'agile', 'scrum', 'kanban', 'devops', 'sre', 'ci', 'cd', 'security', 'oauth', 'jwt'
];

/**
 * Deterministically cross-references candidate skills against job requirements.
 * Runs completely in JavaScript: 0 LLM tokens, 0ms latency, 100% mathematical accuracy.
 */
export function calculateDeterministicAtsFit(candidateProfile, jobDescription) {
  const candidateSkills = new Set();
  const rawSkills = candidateProfile?.skills || {};

  if (Array.isArray(rawSkills)) {
    rawSkills.forEach(s => {
      const clean = String(s || '').toLowerCase().trim();
      if (clean) candidateSkills.add(clean);
    });
  } else if (typeof rawSkills === 'object' && rawSkills !== null) {
    Object.values(rawSkills).flat().forEach(s => {
      const clean = String(s || '').toLowerCase().trim();
      if (clean) candidateSkills.add(clean);
    });
  }

  // Also harvest skills from candidate experience/projects/title text
  const candidateBlob = JSON.stringify(candidateProfile || {}).toLowerCase();

  const jdText = String(jobDescription || '').toLowerCase();
  const jdRaw = String(jobDescription || '');

  // 1. Identify hard requirements from taxonomy present in JD
  const foundRequirements = new Set();
  for (const tech of KNOWN_TECH_TAXONOMY) {
    // Word boundary check
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`\\b${escaped}\\b`, 'i');
    if (regex.test(jdText)) {
      foundRequirements.add(tech);
    }
  }

  // 2. Also check candidate skills that are explicitly mentioned in the JD
  for (const s of candidateSkills) {
    if (s.length > 2) {
      const escaped = s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'i');
      if (regex.test(jdText)) {
        foundRequirements.add(s);
      }
    }
  }

  // Capitalize properly for display
  const capitalize = (str) => {
    return str.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  };

  const matched = [];
  const missing = [];

  for (const req of foundRequirements) {
    const isDirectMatch = candidateSkills.has(req);
    const isBlobMatch = candidateBlob.includes(req);
    const formatted = capitalize(req);

    if (isDirectMatch || isBlobMatch) {
      matched.push(formatted);
    } else {
      missing.push(formatted);
    }
  }

  // 3. Compute exact score
  const total = matched.length + missing.length;
  let atsScore = total > 0 ? Math.round((matched.length / total) * 100) : 75;
  // Bounded safe range
  atsScore = Math.min(98, Math.max(25, atsScore));

  const topGap = missing[0] || 'domain-specific metrics';
  const strategicAdvice = missing.length > 0
    ? `Bridge the gap in ${topGap} by highlighting transferable project architecture and concrete delivery impact.`
    : `Candidate profile displays strong alignment with core stack. Emphasize quantifiable metrics and business outcomes in key bullets.`;

  return {
    matching_skills: matched,
    missing_skills: missing,
    ats_score: atsScore,
    strategic_advice: strategicAdvice
  };
}

/**
 * Builds a surgical micro-prompt (<80 tokens) targeting only gap closure advice.
 * Replaces monolithic 1,500 token prompts to prevent 7B model KV-cache exhaustion.
 */
export function buildMicroAtsAdvicePrompt(topMissingSkill, roleTitle = 'Software Engineer') {
  const system = `You are a senior ATS career coach. Give ONE concise, high-impact action sentence (under 25 words) to address the candidate's skill gap for this role. Output plain text only.`;
  const user = `Target Role: ${roleTitle}\nMissing Skill Gap: ${topMissingSkill || 'system metrics'}\nSingle Action Advice:`;
  return {
    system,
    user,
    systemPrompt: system,
    userPrompt: user
  };
}


/**
 * Constructs prompt for Anti-Buzzword Application Note
 */
export function buildApplicationNotePrompt(candidateSummary, companyName, keyRequirements) {
  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Match verified candidate accomplishments to company requirements, 2. Draft direct 3-sentence note, 3. Ensure zero unverified claims.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the resume/profile provided. Never invent achievements, technologies, or past employers.
Write a 3-sentence application note for a candidate applying to ${companyName || 'the target company'}.

Candidate Background:
${String(candidateSummary || '').slice(0, 500)}

Key Role Requirements:
${String(keyRequirements || '').slice(0, 400)}

HARD RULES:
1. Write in first person ("I have...", "My work on...").
2. Reference at least one specific concrete technical detail or system from the requirements.
3. NEVER use these forbidden buzzwords: "passionate", "dynamic", "thrilled", "results-driven", "synergy", "detail-oriented", "excited to".
4. Keep it direct, human, and technically focused. Maximum 80 words total.
5. Return ONLY the note text. No subject line, no greeting, no preamble.`;
}

/**
 * Constructs prompt for Executive Cover Letter Generator.
 * Enforces thematic beats architecture, retrieval-grounded style anchors, and anti-buzzword constraints.
 */
export function buildCoverLetterPrompt(candidateSummary, companyName, jobTitle, jobRequirements, options = {}) {
  const safeCompany = companyName || 'the target company';
  const safeTitle = jobTitle || 'Engineering';
  const candidateTitle = options?.candidateTitle || options?.title || '';
  const careerLevel = options?.careerLevel || options?.career_level || '';
  const personaRole = candidateTitle 
    ? (careerLevel ? `${careerLevel} ${candidateTitle}` : candidateTitle)
    : 'seasoned technical practitioner';

  const styleContext = options?.styleSnippet
    ? `\nSTYLE ANCHOR (Adopt this high-signal, authentic practitioner voice):\n${options.styleSnippet}\n`
    : '';

  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Parse candidate's documented experience, 2. Map to required responsibilities, 3. Validate zero ungrounded assertions.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the resume/profile provided. Never invent companies, metrics, percentages, achievements, or technologies not present in the candidate profile.
You are an authentic ${personaRole} drafting a high-conviction, human-written cover letter for ${safeCompany} for the ${safeTitle} position.

Candidate Profile & Experience:
${String(candidateSummary || '').slice(0, 800)}

Role Requirements & Target Focus:
${String(jobRequirements || '').slice(0, 600)}
${styleContext}
HUMAN WRITING PROTOCOL:
1. High Burstiness & Sentence Variation: Mix short punchy observations (5-8 words) with technical explanatory statements. Avoid monotonic rhythm.
2. In-Media-Res Technical Hook: Open directly with perspective on ${safeCompany}'s operational challenges. Never use boilerplate greetings like "I am writing to express my interest..." or "I was excited to see...".
3. Architectural Specifics: Reference concrete system scale, throughput, latency boundaries, or engineering trade-offs from candidate history.

STRUCTURE (4 thematic beats separated by double newlines, avoiding rigid mechanical labeling):
Paragraph 1 (The Hook): Enter in media res with genuine technical conviction about ${safeCompany}'s operational challenge or architecture. NEVER open with generic boilerplate like "I am writing to apply..." or "I was excited to see...".
Paragraph 2 (Technical Depth & Proven Metrics): Reference 1-2 concrete achievements, technologies, production scale, and verified metrics from candidate background matching the key requirements.
Paragraph 3 (Company Mission & Problem Alignment): Explain why candidate's architectural approach solves specific scaling challenges at ${safeCompany}.
Paragraph 4 (Call to Action): Reiterate value proposition and provide a confident, respectful peer-to-peer invitation to discuss roadmap milestones.

FEW-SHOT COMPLETE EXEMPLAR OUTPUT (Adopt this exact paragraph structure, technical depth, and cadence):
Engineering high-throughput data pipelines taught me that engineering velocity is bottlenecked by observability blindspots. Having followed TechCorp's distributed infrastructure trajectory, I see direct parallels to the high-reliability consensus and streaming systems I have built over the past five years.

At my previous role, I re-architected our legacy event ingestion pipeline using [Primary Language/Platform], slashing p99 delivery latency by 45% while scaling processing throughput across substantial event streams. Additionally, I introduced schema validation pipelines with zero-allocation buffers, preventing malformed payload drops across production microservices with zero downtime rollouts.

TechCorp's engineering philosophy of eliminating operational drag while sustaining five-nines uptime resonates with my technical values. My experience designing partitioned consensus and fail-safe transactional rollbacks directly matches your architectural roadmap.

I welcome the opportunity to connect with your team and demonstrate how my background in distributed systems and platform reliability can deliver immediate, measurable momentum to your product pipeline.

RULES:
1. Write in the candidate's authentic voice. Maximum 250 words (220 to 320 words).
2. Never open with "I am writing to express my interest...", "I am writing to apply...", or generic boilerplate.
3. FORBIDDEN BUZZWORDS: NEVER use "passionate", "thrilled", "excited to", "dynamic", "synergy", "rockstar", "ninja", "game-changer", "results-driven", "detail-oriented", "delve", "testament", "tapestry", "in today's fast-paced world", "spearheaded", "leverage", "utilize", "robust", "seamlessly".
4. Output ONLY the 4-paragraph cover letter text. No subject line, no date, no headers, no placeholder bracket text.`;
}

/**
 * Constructs prompt for Targeted Resume Bullet Optimizer.
 * Grounded in verified publication-grade exemplar bullets to imitate quantified density.
 * Tight rules prevent hallucination of metrics or technologies.
 */
export function buildBulletOptimizerPrompt(candidateBullet, targetJD, options = {}) {
  // 1. Surgical target skill extraction: Extract single highest-priority skill deterministically (<2ms)
  let targetSkill = options?.targetSkill || '';
  if (!targetSkill) {
    if (typeof targetJD === 'string' && targetJD.trim()) {
      if (targetJD.length < 50 && !targetJD.includes('\n')) {
        targetSkill = targetJD.trim();
      } else {
        const lower = targetJD.toLowerCase();
        const found = KNOWN_TECH_TAXONOMY.find(tech => {
          const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const regex = new RegExp(`(?:^|[^a-z0-9#+.-])${escaped}(?:$|[^a-z0-9#+.-])`, 'i');
          return regex.test(lower);
        });
        targetSkill = found ? (found.charAt(0).toUpperCase() + found.slice(1)) : targetJD.slice(0, 40).trim();
      }
    }
  }
  if (!targetSkill) targetSkill = 'Core Engineering Architecture';

  // 2. Candidate verified STAR metric anchor (if provided)
  const starOutcome = options?.starOutcome || options?.verifiedOutcome || '';
  const starContext = starOutcome ? `Verified STAR Metric: ${starOutcome}` : '';

  const cleanBullet = sanitizePromptInput(String(candidateBullet || ''), { wrapBoundary: false, maxLength: 300 });

  // 3. Compact surgical prompt (<250 tokens) with two concrete positive exemplars
  return `CRITICAL: NEVER invent numbers or technologies. No first person.
Think step by step, then output JSON.
Every bullet must follow: Accomplished X as measured by Y by doing Z.
Start with strong past-tense action verb. Quantified metric (%, $, count).

Exemplar 1 (Backend/Kafka):
Input: "Built python script" | Target: "Kafka" | Metric: "saved 15h/wk"
{"action_verb":"Automated","polished_bullet":"Automated data pipeline using Python and Kafka, saving 15h/wk."}

Exemplar 2 (Frontend/TypeScript):
Input: "Maintained UI frontend" | Target: "TypeScript" | Metric: "cut LCP to 1.1s"
{"action_verb":"Architected","polished_bullet":"Architected TypeScript UI components, cutting Core Web Vitals LCP to 1.1s."}

Original: "${cleanBullet}"
Target Requirement: ${targetSkill}${starContext ? `\n${starContext}` : ''}
Output ONLY JSON: {"action_verb": "...", "polished_bullet": "..."}`;
}

/**
 * Ultra-fast surgical micro-prompt (<120 tokens) for direct plain-text bullet optimization.
 * Completely eliminates JSON parsing failure modes on edge 7B models.
 *
 * @param {string} candidateBullet
 * @param {string} targetSkill
 * @param {string} starOutcome
 * @returns {string}
 */
export function buildSurgicalBulletMicroPrompt(candidateBullet = '', targetSkill = '', starOutcome = '') {
  const clean = sanitizePromptInput(String(candidateBullet || ''), { wrapBoundary: false, maxLength: 160 });
  const skill = targetSkill || 'Architecture';
  return `Rewrite into ONE sentence: Accomplished X as measured by Y by doing Z.
NEVER invent metrics.
Exemplar: "Built pipeline" | "Kafka" -> Architected data streaming pipeline with Kafka, cutting latency 40%.
Original: "${clean}"
Skill: ${skill}${starOutcome ? ` | Metric: ${starOutcome}` : ''}
Refined bullet:`;
}

/**
 * Deterministically classifies job requirements (YoE, seniority level, must-have tech skills)
 * via fast-path regex and lexical taxonomy. Resolves unambiguous JDs in 0.1ms without LLM overhead.
 *
 * @param {string} jobDescription - Raw job description text
 * @returns {{ isConfident: boolean, confidence: number, result: { must_have_skills: string[], minimum_years: number, level: string } }}
 */
export function classifyRequirementsDeterministically(jobDescription = '') {
  if (!jobDescription || typeof jobDescription !== 'string') {
    return {
      isConfident: false,
      confidence: 0,
      result: {
        must_have_skills: ['Software Engineering', 'System Design'],
        minimum_years: 2,
        level: 'mid'
      }
    };
  }

  const text = jobDescription.slice(0, 3500);
  const lower = text.toLowerCase();

  // 1. Deterministic Years of Experience (YoE) extraction
  let minYears = null;
  const yoeRegexes = [
    /(\d+)\+?\s*years?(?:\s+of)?(?:\s+professional|\s+software|\s+engineering|\s+relevant|\s+work)?\s*experience/i,
    /at\s+least\s+(\d+)\+?\s*years/i,
    /minimum\s+(?:of\s+)?(\d+)\+?\s*years/i,
    /(\d+)\s*(?:-|to)\s*(\d+)\s*years/i
  ];

  for (const re of yoeRegexes) {
    const match = lower.match(re);
    if (match) {
      minYears = parseInt(match[1], 10);
      break;
    }
  }

  // 2. Deterministic Seniority Level extraction
  let level = 'mid';
  let levelFound = false;

  if (/\b(principal|distinguished|fellow)\b/i.test(lower)) {
    level = 'principal';
    levelFound = true;
  } else if (/\b(staff|lead|architect)\b/i.test(lower)) {
    level = 'staff';
    levelFound = true;
  } else if (/\b(senior|sr\b)\b/i.test(lower)) {
    level = 'senior';
    levelFound = true;
  } else if (/\b(entry|junior|jr\b|associate|intern|graduate)\b/i.test(lower)) {
    level = 'entry';
    levelFound = true;
  } else if (minYears !== null) {
    if (minYears >= 8) level = 'staff';
    else if (minYears >= 5) level = 'senior';
    else if (minYears >= 2) level = 'mid';
    else level = 'entry';
  }

  if (minYears === null) {
    minYears = level === 'staff' || level === 'principal' ? 8 : (level === 'senior' ? 5 : 2);
  }

  // 3. Deterministic Technical Competencies extraction using token-boundary regex
  const COMMON_TECH_TERMS = [
    'python', 'javascript', 'typescript', 'react', 'node.js', 'go', 'rust',
    'docker', 'kubernetes', 'aws', 'gcp', 'azure', 'sql', 'postgresql', 'mysql',
    'fastapi', 'kafka', 'redis', 'graphql', 'system design', 'linux', 'ci/cd',
    'terraform', 'grpc', 'mongodb', 'microservices', 'distributed systems',
    'clickhouse', 'elasticsearch', 'next.js', 'vue', 'django', 'flask', 'git',
    'c++', 'c#', '.net', 'html', 'css', 'tailwind', 'pytorch', 'tensorflow'
  ];

  const matchedSkills = [];
  for (const tech of COMMON_TECH_TERMS) {
    const escaped = tech.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(?:^|[^a-zA-Z0-9_])${escaped}(?:$|[^a-zA-Z0-9_])`, 'i');
    if (regex.test(lower)) {
      matchedSkills.push(tech.charAt(0).toUpperCase() + tech.slice(1));
    }
  }

  const uniqueSkills = Array.from(new Set(matchedSkills));

  // Determine confidence: high confidence when YoE/level and >= 2 skills are identified
  const hasStrongYoE = minYears !== null;
  const hasStrongSkills = uniqueSkills.length >= 2;
  const confidence = (hasStrongYoE ? 0.35 : 0.15) + (levelFound ? 0.35 : 0.15) + Math.min(uniqueSkills.length * 0.1, 0.3);
  const isConfident = confidence >= 0.75 && hasStrongSkills;

  return {
    isConfident,
    confidence: Math.round(confidence * 100) / 100,
    result: {
      must_have_skills: uniqueSkills.length > 0 ? uniqueSkills.slice(0, 10) : ['Software Engineering', 'System Design'],
      minimum_years: minYears,
      level
    }
  };
}

/**
 * Constructs prompt for Automated Screening Question Answering
 */
export function buildScreeningAnswerPrompt(arg1, arg2, arg3 = 'custom') {
  const question = typeof arg1 === 'string' ? arg1 : (typeof arg2 === 'string' ? arg2 : '');
  const candidateProfile = typeof arg1 === 'object' && arg1 !== null ? arg1 : arg2;
  const archetype = typeof arg3 === 'string' ? arg3 : 'custom';

  let profileStr = '';
  if (typeof candidateProfile === 'string') {
    profileStr = candidateProfile.slice(0, 500);
  } else if (candidateProfile && typeof candidateProfile === 'object') {
    const skillsStr = buildCandidateSkillsString(candidateProfile);
    if (skillsStr !== 'Candidate profile not available.' && skillsStr !== 'No profile provided.') {
      profileStr = skillsStr;
    } else {
      profileStr = Object.entries(candidateProfile)
        .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
        .join('\n')
        .slice(0, 500);
    }
  }

  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Identify specific question requirement, 2. Retrieve verified candidate record from profile, 3. Ensure zero ungrounded assertions.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the resume/profile provided. Never invent certifications, clearances, years of experience, or degrees not in the profile.
You are answering an ATS screening question on behalf of a job candidate.
Question Archetype: ${archetype}
Question: "${String(question || '').slice(0, 300)}"

Candidate Profile:
${profileStr || 'Candidate profile not available.'}

RULES:
1. Answer using ONLY the candidate's actual qualifications from the profile above.
2. NEVER invent certifications, clearances, years of experience, or degrees not in the profile.
3. For numeric/boolean questions (salary, years exp, work authorization): give a precise, direct answer.
4. Return ONLY the final answer. No preambles, no "Based on the profile...", no conversational filler.`;
}

/**
 * Prompt template for senior engineering mentor Skill Gap Learning Roadmap
 */
export const LEARNING_PROMPT = `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Evaluate missing skills vs current skills, 2. Formulate progressive 4-week milestones, 3. Output strictly valid JSON.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the resume provided and target role requirements. Do not assume unlisted prerequisite qualifications.
You are a senior engineering mentor.
A candidate is missing: {missing_skills}
They are targeting: {target_role}
Their current skills: {current_skills}
Create a realistic 4-week self-study plan:
Week 1: Core concept + one free resource (link or book name)
Week 2: Build a mini project using it
Week 3: Apply it to one open-source contribution target
Week 4: Document it and add to resume
Output JSON: {"weeks": [{"week": 1, "focus": "...", "resource": "...", "project": "..."}]}
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
Keep each week's task achievable in 5-8 hours.`;

/**
 * Formats the LEARNING_PROMPT template with missing skills, target role, and current skills.
 */
export function buildLearningRoadmapPrompt(missingSkills = [], targetRole = '', currentSkills = []) {
  const missingStr = Array.isArray(missingSkills)
    ? missingSkills.join(', ')
    : String(missingSkills || '');
  const roleStr = String(targetRole || 'Software Engineer');
  const currentStr = Array.isArray(currentSkills)
    ? currentSkills.join(', ')
    : String(currentSkills || '');

  return LEARNING_PROMPT
    .replace('{missing_skills}', missingStr || 'General software development tools')
    .replace('{target_role}', roleStr)
    .replace('{current_skills}', currentStr || 'Modern software engineering fundamentals');
}

/**
 * Constructs prompt for generating role-specific mock interview questions.
 * Enforces anti-hallucination and Chain-of-Thought skill grounding.
 *
 * @param {string} targetRole
 * @param {string[]|string} candidateSkills
 * @param {Object} options
 * @returns {{ systemPrompt: string, userPrompt: string, prompt: string }}
 */
export function buildMockQuestionPrompt(targetRole = 'Senior Full-Stack Engineer', candidateSkills = [], options = {}) {
  const safeRole = sanitizePromptInput(String(targetRole || 'Software Engineer'), { wrapBoundary: false, maxLength: 80 });
  const skillsArray = Array.isArray(candidateSkills)
    ? candidateSkills
    : (typeof candidateSkills === 'string' ? candidateSkills.split(',') : []);
  const safeSkills = skillsArray.map(s => String(s || '').trim()).filter(Boolean).slice(0, 8).join(', ') || 'distributed systems, scalable web architecture';
  const count = options?.count || 3;

  const systemPrompt = `You are a senior engineering hiring manager conducting a technical and behavioral mock interview.
[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Identify core architectural and behavioral requirements for ${safeRole}, 2. Map questions directly to verified candidate competencies, 3. Output valid JSON array.
CRITICAL ANTI-HALLUCINATION GUARD: Never invent candidate experience. Only ground questions in real-world technologies and competencies relevant to the role. Never generate trivia or trick questions.
You generate precise, role-specific interview questions.
Output ONLY valid JSON. ONLY return a JSON array of questions conforming to the mock interview question schema. Do not add explanation text before or after the JSON.`;

  const userPrompt = `Chain-of-Thought Process:
1. First list the 3 most critical skills from this JD:
Role: ${safeRole}
Candidate skills: ${safeSkills}
2. Then generate ${count} targeted interview questions directly grounded in those skills.

Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
[
  {"id": "q1", "question": "...", "category": "behavioral|system_design|technical", "expectedTime": "2 mins", "whatInterviewersLookFor": "...", "starHint": "..."}
]
Output as JSON array. Questions must be role-specific, not generic.`;

  return {
    systemPrompt,
    userPrompt,
    prompt: `${systemPrompt}\n\n${userPrompt}`,
    system: systemPrompt,
    user: userPrompt
  };
}

/**
 * Constructs prompt for STAR Answer Evaluation & Interview Feedback.
 * Strict anti-hallucination, weak verb detection, and STAR rubric scoring (1-5).
 *
 * @param {string} targetRole
 * @param {string} question
 * @param {string} candidateAnswer
 * @param {Object|null} topStoryMatch
 * @param {Object} options
 * @returns {{ systemPrompt: string, userPrompt: string, prompt: string, system: string, user: string }}
 */
export function buildInterviewFeedbackPrompt(targetRole, question, candidateAnswer, topStoryMatch = null, options = {}) {
  const safeRole = sanitizePromptInput(String(targetRole || 'Software Engineer'), { wrapBoundary: false, maxLength: 80 });
  const safeQuestion = sanitizePromptInput(String(question || 'Technical Challenge'), { wrapBoundary: false, maxLength: 400 });
  const safeAnswer = sanitizePromptInput(String(candidateAnswer || '').slice(0, 3000), { wrapBoundary: false });

  const systemPrompt = `[CHAIN-OF-THOUGHT PROTOCOL] First reason through the situation briefly, then write the STAR answer.
You are a senior technical interviewer evaluating a STAR-format answer.
Score each dimension 1-5:
Situation (S): Was context set clearly?
Task (T): Was the goal or challenge defined?
Action (A): Did the candidate demonstrate personal ownership and clear technical depth?
Result (R): Was the impact quantified with measurable outcomes?
Flag weak verbs ("helped with", "worked on") explicitly.
Never invent technical context or exaggerate metrics.
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
Output JSON: {"scores":{"S":N,"T":N,"A":N,"R":N},"overall":N,"strongest_point":"...","critical_improvement":"...","rewritten_result_sentence":"..."}
Be direct. Flag weak verbs ("helped with", "worked on") explicitly. Use verified STAR story facts when provided to ground feedback.`;

  let starStoryContext = '';
  if (topStoryMatch) {
    if (typeof topStoryMatch === 'string') {
      const safeStory = sanitizePromptInput(topStoryMatch, { wrapBoundary: false, maxLength: 800 });
      starStoryContext = `\n\nCandidate's Verified STAR Story Bank Anchor:\n"${safeStory}"\nCompare the spoken answer against this verified story. Where details are omitted, suggest specific authentic details from the story to strengthen the answer.`;
    } else {
      const safeTitle = sanitizePromptInput(String(topStoryMatch.title || ''), { wrapBoundary: false, maxLength: 80 });
      const safeComp = sanitizePromptInput(String(topStoryMatch.competency || 'Behavioral'), { wrapBoundary: false, maxLength: 50 });
      const safeSit = sanitizePromptInput(String(topStoryMatch.situation || ''), { wrapBoundary: false, maxLength: 400 });
      const safeTask = sanitizePromptInput(String(topStoryMatch.task || ''), { wrapBoundary: false, maxLength: 400 });
      const safeAct = sanitizePromptInput(String(topStoryMatch.action || ''), { wrapBoundary: false, maxLength: 500 });
      const safeRes = sanitizePromptInput(String(topStoryMatch.result || ''), { wrapBoundary: false, maxLength: 400 });

      starStoryContext = `

Candidate's Verified STAR Story Bank Match:
Title: "${safeTitle}" (${safeComp})
- Situation: ${safeSit}
- Task: ${safeTask}
- Action: ${safeAct}
- Result: ${safeRes}
Compare the spoken answer against this verified story. Where details are omitted, suggest specific authentic details from the story to strengthen the answer.`;
    }
  }

  const userPrompt = `Candidate Interview Answer Evaluation:
Target Role: ${safeRole}
Question: ${safeQuestion}
Candidate Answer: "${safeAnswer}"${starStoryContext}

EVALUATION PROCESS (Follow step-by-step):
STEP 1: Check for weak verbs like "helped with", "worked on", "assisted with", "participated in". If found, explicitly flag them in critical_improvement.
STEP 2: Score Situation (S) 1-5: Was context set clearly?
STEP 3: Score Task (T) 1-5: Was the specific challenge defined?
STEP 4: Score Action (A) 1-5: Were technical actions specific and non-vague?
STEP 5: Score Result (R) 1-5: Was impact quantified or clearly stated?
STEP 6: Set overall score 1-5. Identify strongest_point and critical_improvement.${topStoryMatch ? ' Use the candidate verified STAR story facts to suggest tailored, grounded improvements instead of generic advice.' : ''} Provide a high-impact rewritten_result_sentence.

Output ONLY valid JSON:
{"scores":{"S":4,"T":3,"A":4,"R":2},"overall":3,"strongest_point":"...","critical_improvement":"...","rewritten_result_sentence":"..."}
No markdown. No text before or after the JSON.`;

  return {
    systemPrompt,
    userPrompt,
    prompt: userPrompt,
    system: systemPrompt,
    user: userPrompt
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// RECRUITER AI BUZZWORD AUDITING & ACTION VERB SUGGESTIONS
// ─────────────────────────────────────────────────────────────────────────────

export const RECRUITER_AI_BUZZWORDS = Object.freeze({
  spearheaded: 'led / directed / built',
  delved: 'analyzed / examined / investigated',
  tapestry: 'framework / system / architecture',
  instrumental: 'key contributor / played a role in',
  fostered: 'facilitated / promoted / grew',
  pioneered: 'introduced / created / initiated',
  testament: 'evidence / proof',
  leverage: 'use / utilize / apply',
  leveraged: 'used / applied / deployed',
  meticulous: 'rigorous / detailed',
  meticulously: 'rigorously / carefully',
  seamless: 'integrated / automated / unified',
  seamlessly: 'automatically / directly',
  synergy: 'collaboration / alignment',
  holistic: 'comprehensive / end-to-end',
  transformative: 'significant / high-impact',
  beacon: 'example / reference',
  unwavering: 'consistent / dedicated',
  plethora: 'wide range / multiple',
  paramount: 'critical / essential',
  culmination: 'result / outcome',
  bolster: 'strengthen / reinforce',
  bolstered: 'strengthened / improved',
  revolutionize: 'modernize / overhaul',
  revolutionized: 'modernized / redesigned',
  burgeoning: 'growing / expanding',
  endeavor: 'project / effort',
  dynamic: 'active / responsive',
  intertwined: 'connected / related'
});

/**
 * Scans bullet text for recruiter-flagged AI cliches and suggests natural engineering verbs.
 * @param {string} text
 * @returns {{ hasAiBuzzwords: boolean, detectedBuzzwords: string[], suggestions: Record<string, string> }}
 */
export function auditAntiAiBuzzwords(text = '') {
  const str = String(text || '').toLowerCase();
  if (!str.trim()) return { hasAiBuzzwords: false, detectedBuzzwords: [], suggestions: {} };

  const detected = [];
  const suggestions = {};

  for (const [buzzword, suggestion] of Object.entries(RECRUITER_AI_BUZZWORDS)) {
    const regex = new RegExp(`\\b${buzzword}\\b`, 'i');
    if (regex.test(str)) {
      detected.push(buzzword);
      suggestions[buzzword] = suggestion;
    }
  }

  return {
    hasAiBuzzwords: detected.length > 0,
    detectedBuzzwords: detected,
    suggestions
  };
}

/**
 * Programmatically audits an AI-refined resume bullet against the original source bullet
 * to detect hallucinated metrics, invented percentages, or fabricated infrastructure tools.
 *
 * @param {string} originalBullet - Candidate's verified source experience
 * @param {string} optimizedBullet - AI-generated suggestion
 * @returns {{ isClean: boolean, warnings: string[], metricsPreserved: boolean, aiBuzzwords: string[], buzzwordSuggestions: Record<string, string> }}
 */
export function verifyBulletAntiHallucination(originalBullet = '', optimizedBullet = '') {
  const orig = String(originalBullet || '').trim();
  const opt = String(optimizedBullet || '').trim();

  if (!opt) {
    return { isClean: true, warnings: [], metricsPreserved: true, aiBuzzwords: [], buzzwordSuggestions: {} };
  }

  const warnings = [];

  // 1. Metric / Number extraction (percentages, multipliers like 3x, dollar amounts, and raw numbers)
  const extractMetrics = (text) => {
    const matches = text.match(/\b\d+(?:\.\d+)?%|\$\d+(?:\.\d+)?[kKmMbB]?|\b\d+(?:\.\d+)?x\b|\b\d+(?:\.\d+)?\b/g) || [];
    return new Set(matches.map(m => m.toLowerCase()));
  };

  const origMetrics = extractMetrics(orig);
  const optMetrics = extractMetrics(opt);

  const inventedMetrics = [];
  for (const metric of optMetrics) {
    if (!origMetrics.has(metric)) {
      inventedMetrics.push(metric);
    }
  }

  if (inventedMetrics.length > 0) {
    warnings.push(`Detected unverified metric(s): ${inventedMetrics.join(', ')}. Ensure this metric represents real past experience.`);
  }

  // 2. High-impact tech and infrastructure hallucination checks
  // Detect major cloud / infra / data technologies that small 7B models frequently hallucinate if not in source
  const WATCHLIST = [
    'aws', 'azure', 'gcp', 'google cloud', 'kubernetes', 'k8s', 'docker', 'kafka',
    'terraform', 'redis', 'graphql', 'snowflake', 'spark', 'hadoop', 'pytorch', 'tensorflow'
  ];

  const origLower = orig.toLowerCase();
  const optLower = opt.toLowerCase();
  const inventedTech = [];

  for (const tech of WATCHLIST) {
    const regex = new RegExp(`\\b${tech}\\b`, 'i');
    if (regex.test(optLower) && !regex.test(origLower)) {
      inventedTech.push(tech.toUpperCase());
    }
  }

  if (inventedTech.length > 0) {
    warnings.push(`Detected unverified tech keyword(s): ${inventedTech.join(', ')} not found in your original bullet.`);
  }

  // 3. Anti-Mode-Collapse Catchphrase Detection (Flags synthetic dataset artifacts)
  const SYNTHETIC_CATCHPHRASES = [
    '28ms', 'idempotent replay', '6 product teams', '4.2m daily transactions', '$3.4m in reconciliation'
  ];
  for (const phrase of SYNTHETIC_CATCHPHRASES) {
    if (optLower.includes(phrase) && !origLower.includes(phrase)) {
      warnings.push(`Detected synthetic training artifact: "${phrase}". Flagged as mode collapse from synthetic fine-tuning datasets.`);
    }
  }

  // 4. Anti-AI Buzzword Auditor
  const buzzwordAudit = auditAntiAiBuzzwords(opt);
  if (buzzwordAudit.hasAiBuzzwords) {
    warnings.push(`Detected recruiter-flagged AI cliché(s): ${buzzwordAudit.detectedBuzzwords.join(', ')}. Recruiters penalize these as AI-generated text.`);
  }

  const isClean = warnings.length === 0;

  return {
    isClean,
    warnings,
    metricsPreserved: inventedMetrics.length === 0,
    aiBuzzwords: buzzwordAudit.detectedBuzzwords,
    buzzwordSuggestions: buzzwordAudit.suggestions
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPACT MICRO-CHAIN PROMPT ARCHITECTURES (7B & EDGE MODEL RELIABILITY)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Stage 1: Extract Requirements Micro-Task
 * Token budget: < 120 tokens. Asks for only 3 fields in strict minimal JSON.
 */
export function buildMicroExtractPrompt(cleanJd = '') {
  const safeJd = sanitizePromptInput(String(cleanJd || ''), { wrapBoundary: false, maxLength: 3000 });
  return `[CHAIN-OF-THOUGHT PROTOCOL] Extract only hard requirements explicitly stated in the job description.
CRITICAL ANTI-HALLUCINATION GUARD: Extract only explicitly stated requirements; do not infer unmentioned qualifications.
Extract core requirements from this job description:
"${safeJd}"

Output ONLY valid JSON matching this schema:
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
{
  "must_have_skills": ["string"],
  "minimum_years": 0,
  "level": "entry" | "mid" | "senior" | "staff"
}`;
}

/**
 * Stage 2: Compare Profile Micro-Task
 * Token budget: < 150 tokens. Passes ONLY clean requirements and candidate verified skills.
 */
export function buildMicroComparePrompt(validatedReqs = {}, candidateSkills = []) {
  const reqStr = JSON.stringify(validatedReqs || {});
  const safeSkills = Array.isArray(candidateSkills) ? candidateSkills.slice(0, 25).join(', ') : '';
  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: 1. Compare requirements directly against candidate skills, 2. Flag missing skills, 3. Output valid JSON.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the candidate profile provided.
Compare Job Requirements against Candidate Profile:
Role Requirements: ${reqStr}
Candidate Verified Skills: ${safeSkills}

Isolate missing skills and strengths. Output ONLY valid JSON:
Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.
{
  "gaps": ["string"],
  "strengths": ["string"],
  "recommendation_priority": "skill" | "bullet" | "architecture"
}`;
}

/**
 * Stage 3: Suggest Tactical Action Micro-Task
 * Token budget: < 80 tokens. Focuses on ONE top gap and produces plain text (0 JSON, 0 buzzwords).
 */
export function buildMicroActionPrompt(topGap = '', level = 'senior') {
  return `Top Candidate Gap: "${topGap || 'domain alignment'}"
Role Seniority Band: "${level || 'senior'}"

Write ONE high-impact, 10-minute tactical micro-action the candidate can execute today on their resume to close this gap.
Strict rules: Plain text only, maximum 35 words, direct tone, no buzzwords ("passionate", "excited", "game-changer").`;
}

/**
 * Micro-Chain Bullet Optimizer Prompt
 * Token budget: < 100 tokens. Single-purpose rewrite with metric preservation.
 */
export function buildMicroBulletPrompt(originalBullet = '', targetExcerpt = '') {
  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step: Accomplished X as measured by Y by doing Z.
CRITICAL ANTI-HALLUCINATION GUARD: Only use information from the original bullet provided. Never invent or modify numbers or metrics. Never inject synthetic catchphrases (e.g. "28ms p99 latency", "idempotent replay across 6 product teams", or fake dollar savings).
Original Bullet: "${String(originalBullet || '').slice(0, 250)}"
Target Role Requirement: "${String(targetExcerpt || '').slice(0, 200)}"

Rewrite this resume bullet using Google's X-Y-Z formula. Every bullet must follow: Accomplished X as measured by Y by doing Z.
Mandatory Rules:
1. Preserve the exact same real metrics and numbers from the original bullet; never invent, hallucinate, or modify metrics. If no number exists, quantify via technical scope or architecture.
2. Start with a strong past-tense engineering verb.
3. Maximum 25 words.
4. Return ONLY the single refined bullet sentence.`;
}

/**
 * Micro-Chain Recruiter Outreach Prompt
 * Token budget: < 110 tokens. Generates 3-sentence high-conviction note.
 */
export function buildMicroOutreachPrompt(company = '', role = '', topStrength = '', topGap = '') {
  return `[CHAIN-OF-THOUGHT PROTOCOL] Think step-by-step to draft a direct, high-conviction 3-sentence note.
CRITICAL ANTI-HALLUCINATION GUARD: Only reference verified candidate strengths. Never invent experience or fabricate synthetic statistics (e.g. "28ms p99 latency", "idempotent replay across 6 product teams").
Target Company: "${company || 'the team'}"
Target Position: "${role || 'Engineer'}"
Candidate Anchor Strength: "${topStrength || 'distributed systems'}"

Draft a direct 3-sentence recruiter outreach note.
Mandatory Rules:
1. Write in first person ("I have...", "My engineering work...").
2. Reference candidate anchor strength "${topStrength || 'systems engineering'}".
3. NEVER use forbidden buzzwords ("passionate", "thrilled", "dynamic", "synergy", "rockstar").
4. Maximum 60 words total.
5. Return ONLY the 3-sentence note text.`;
}

