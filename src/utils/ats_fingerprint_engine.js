/**
 * ats_fingerprint_engine.js
 * =========================
 * Pure Client-Side ATS Platform Fingerprinting & Diagnostic Rules Engine
 *
 * Identifies target corporate Applicant Tracking Systems (Workday, Greenhouse,
 * Lever, Ashby, Oracle Taleo, iCIMS, SmartRecruiters, or Universal Standard ATS)
 * from job posting URLs, raw HTML DOM signatures, or job requisition text.
 *
 * Applies vendor-specific parsing rules, risk factors, and template compatibility
 * checks with 100% in-browser heuristics and $0 API cost.
 */

export const ATS_PLATFORMS = {
  workday: {
    name: 'Workday',
    parserEngine: 'Sovren / Textkernel',
    urlPatterns: [/myworkdayjobs\.com/i, /\.wd[1-5]\.myworkdayjobs\.com/i],
    domPatterns: [/workday-applicant/i, /wd-job-details/i],
    strictRules: [
      'Strict single-column layout mandatory (multi-column layouts fail completely).',
      'Requires standard section titles: "Work Experience", "Education", "Skills".',
      'No text inside tables, text boxes, or canvas graphics.',
      'Date format must be explicit: "MM/YYYY - MM/YYYY" or "YYYY - Present".'
    ],
    riskFactors: [
      'Rejects non-standard font glyphs and icons',
      'Strips contact info if placed in PDF header/footer blocks',
      'Converts tables into mangled horizontal text rows'
    ],
    compatibilityScore: 98,
    tolerance: 'Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false
  },
  greenhouse: {
    name: 'Greenhouse',
    parserEngine: 'Greenhouse Native Semantic Tokenizer',
    urlPatterns: [/boards\.greenhouse\.io/i, /gh_jid=/i, /grnhse_jid=/i],
    domPatterns: [/grnhse\.com/i, /id="app_body"/i, /class="greenhouse-job"/i],
    strictRules: [
      'Keyword match frequency in top 2 pages heavily weighted.',
      'Extracts skills directly from project and experience bullet points.',
      'Supports standard hyperlinks to GitHub and portfolio.'
    ],
    riskFactors: [
      'Truncates resumes over 3 pages',
      'Requires clear company and title demarcations to avoid merging roles'
    ],
    compatibilityScore: 100,
    tolerance: 'Moderate',
    maxColumns: 2,
    tableAllowed: false,
    headerFooterSafe: true
  },
  lever: {
    name: 'Lever',
    parserEngine: 'Lever Plain-Text Normalizer',
    urlPatterns: [/jobs\.lever\.co/i],
    domPatterns: [/lever-jobs-embed/i, /class="lever-job"/i],
    strictRules: [
      'Converts uploaded PDF directly to plain text markdown before recruiter review.',
      'Group skills into clean comma-separated lists for tag extraction.',
      'Keep job titles clean without extra marketing adjectives.'
    ],
    riskFactors: [
      'Strips background colors, borders, and badges into raw text strings',
      'Inline graphics cause character sequence dropouts'
    ],
    compatibilityScore: 100,
    tolerance: 'Modern / Lenient',
    maxColumns: 2,
    tableAllowed: true,
    headerFooterSafe: true
  },
  ashby: {
    name: 'Ashby',
    parserEngine: 'Ashby LLM-Augmented Structured Extractor',
    urlPatterns: [/jobs\.ashbyhq\.com/i],
    domPatterns: [/__ashby/i, /ashby-job-posting/i],
    strictRules: [
      'Rewards quantified metrics ($X revenue, Y% latency reduction, Z users).',
      'Analyzes semantic context; does not require robotic keyword stuffing.',
      'Recognizes modern tech stacks (Turborepo, Bun, PyTorch, vLLM, Kafka).'
    ],
    riskFactors: [
      'Flags buzzwords lacking supporting technical detail',
      'Deeply inspects timeline continuity between concurrent roles'
    ],
    compatibilityScore: 100,
    tolerance: 'Modern / High Tech',
    maxColumns: 2,
    tableAllowed: true,
    headerFooterSafe: true
  },
  icims: {
    name: 'iCIMS',
    parserEngine: 'iCIMS Chronological Parser',
    urlPatterns: [/icims\.com/i, /jobs-.*\.icims\.com/i],
    domPatterns: [/icims-embed/i, /iCIMS_Content/i],
    strictRules: [
      'Strict reverse-chronological order required.',
      'Avoid symbols or icons next to dates.',
      'Section headings must be capitalized and isolated on their own line.'
    ],
    riskFactors: [
      'Severe parser errors when reading creative multi-column templates',
      'Strips header/footer blocks entirely'
    ],
    compatibilityScore: 95,
    tolerance: 'Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false
  },
  taleo: {
    name: 'Oracle Taleo',
    parserEngine: 'Oracle Legacy Text Parser',
    urlPatterns: [/taleo\.net/i, /oraclecloud\.com.*\/candidate/i],
    domPatterns: [/taleo/i],
    strictRules: [
      'Use conservative, standard typography (Times New Roman, Arial, Georgia).',
      'No headers, footers, graphics, or complex lines.',
      'Plain ASCII bullets only (• or -).'
    ],
    riskFactors: [
      'Fails on modern PDF annotations and vector icons',
      'Discards un-normalized custom section titles'
    ],
    compatibilityScore: 90,
    tolerance: 'Very Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false
  },
  smartrecruiters: {
    name: 'SmartRecruiters',
    parserEngine: 'SmartRecruiters Structured JSON-LD Parser',
    urlPatterns: [/smartrecruiters\.com/i, /careers\.smartrecruiters\.com/i],
    domPatterns: [/smartrecruiters/i],
    strictRules: [
      'Parses education and experience into strict schema fields.',
      'Keep degree, major, and graduation year on dedicated lines.'
    ],
    riskFactors: [
      'Strips project URLs if formatted without protocol prefix',
      'Scrambles horizontal multi-column experience grids'
    ],
    compatibilityScore: 98,
    tolerance: 'Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false
  }
};

/**
 * Universal fallback definition for generic / unidentified ATS systems.
 */
export const GENERIC_ATS = {
  id: 'generic_ats',
  name: 'Universal Standard ATS',
  parserEngine: 'Standard Chronological Parser',
  strictRules: [
    'Maintain clean single-column hierarchy.',
    'Quantify results using STAR framework.',
    'Ensure standard section headers (Experience, Education, Skills).'
  ],
  riskFactors: [
    'Unknown proprietary parsing logic',
    'Multi-column formats carry unverified parsing risk'
  ],
  compatibilityScore: 95,
  tolerance: 'Standard',
  maxColumns: 1,
  tableAllowed: false,
  headerFooterSafe: false,
  detectedVia: 'default_fallback'
};

/**
 * Detect which ATS platform is hosting a job posting.
 *
 * @param {string} url - Job posting URL (e.g. 'https://stripe.com/jobs' or 'https://acme.myworkdayjobs.com/...')
 * @param {string} htmlSnippet - HTML or text content from posting DOM
 * @param {string} sourceHint - Optional explicit platform hint (e.g. 'Workday', 'Greenhouse')
 * @returns {object|null} - Detected ATS metadata or generic fallback, or null if no inputs provided
 */
export function detectAtsPlatform(url = '', htmlSnippet = '', sourceHint = '') {
  const targetUrl = String(url || '').trim();
  const targetHtml = String(htmlSnippet || '').trim();
  const targetSource = String(sourceHint || '').trim();

  if (!targetUrl && !targetHtml && !targetSource) {
    return null;
  }

  // 1. Primary: URL Pattern Matching
  if (targetUrl) {
    for (const [key, ats] of Object.entries(ATS_PLATFORMS)) {
      if (ats.urlPatterns.some(pattern => pattern.test(targetUrl))) {
        return { id: key, ...ats, detectedVia: 'url_pattern' };
      }
    }
  }

  // 2. Primary: DOM Pattern Matching
  if (targetHtml) {
    for (const [key, ats] of Object.entries(ATS_PLATFORMS)) {
      if (ats.domPatterns.some(pattern => pattern.test(targetHtml))) {
        return { id: key, ...ats, detectedVia: 'dom_signature' };
      }
    }
  }

  // 3. Secondary: Explicit source hint
  if (targetSource) {
    const srcLower = targetSource.toLowerCase();
    for (const [key, ats] of Object.entries(ATS_PLATFORMS)) {
      if (srcLower === key || srcLower.includes(key) || srcLower.includes(ats.name.toLowerCase())) {
        return { id: key, ...ats, detectedVia: 'source_hint' };
      }
    }
  }

  // 4. Tertiary: Text content keyword search
  const combined = `${targetUrl} ${targetHtml}`.toLowerCase();
  for (const [key, ats] of Object.entries(ATS_PLATFORMS)) {
    if (combined.includes(key) || combined.includes(ats.name.toLowerCase())) {
      return { id: key, ...ats, detectedVia: 'text_keyword' };
    }
  }

  // 5. Fallback: Universal Standard ATS
  return {
    ...GENERIC_ATS
  };
}

/**
 * Check whether a resume designer template is compatible with a target ATS platform.
 *
 * @param {object|string} atsPlatform - Platform object from detectAtsPlatform or platform ID string
 * @param {string} templateId - Resume template archetype ID (e.g. 'ivy_classic', 'creative_sidebar')
 * @returns {{ isCompatible: boolean, level: 'safe'|'warning'|'critical', reason: string, recommendation: string|null }}
 */
export function checkTemplateCompatibility(atsPlatform, templateId = 'ivy_classic') {
  const platform = typeof atsPlatform === 'string'
    ? getAtsPlatform(atsPlatform)
    : (atsPlatform || GENERIC_ATS);

  const isStrictSingleColumn = ['workday', 'taleo', 'icims', 'smartrecruiters', 'generic_ats'].includes(platform.id);
  const isMultiColumnTemplate = templateId === 'creative_sidebar';

  if (isStrictSingleColumn && isMultiColumnTemplate) {
    return {
      isCompatible: false,
      level: 'critical',
      reason: `${platform.name} (${platform.parserEngine}) mandates strict single-column layouts. The Creative Two-Column multi-column layout causes severe text scramble and parsing errors in ${platform.name}.`,
      recommendation: "Switch to Jake's Resume, Ivy Classic Serif, Silicon Valley Modern, or High-Density 1-Page."
    };
  }

  if (isMultiColumnTemplate) {
    return {
      isCompatible: true,
      level: 'warning',
      reason: `${platform.name} supports modern semantic parsing, but single-column layouts achieve higher keyword extraction fidelity.`,
      recommendation: 'Consider Silicon Valley Modern or Ivy Classic for maximum keyword capture.'
    };
  }

  return {
    isCompatible: true,
    level: 'safe',
    reason: `100% compatible with ${platform.name} (${platform.parserEngine}).`,
    recommendation: null
  };
}

/**
 * Get ATS platform configuration by key or normalized name.
 *
 * @param {string} id - Platform identifier or name
 * @returns {object} Platform details or generic fallback
 */
export function getAtsPlatform(id = '') {
  const norm = String(id || '').toLowerCase().trim();
  if (norm === 'auto' || !norm) {
    return { id: 'workday', ...ATS_PLATFORMS.workday };
  }
  if (ATS_PLATFORMS[norm]) {
    return { id: norm, ...ATS_PLATFORMS[norm] };
  }
  for (const [key, ats] of Object.entries(ATS_PLATFORMS)) {
    if (norm.includes(key) || norm.includes(ats.name.toLowerCase())) {
      return { id: key, ...ats };
    }
  }
  return {
    ...GENERIC_ATS
  };
}

/**
 * Evaluates template compatibility across key enterprise and high-growth ATS platforms.
 * Surfaces canonical status, numerical score, and summary (e.g. "Passes Greenhouse / Fails Workday").
 *
 * @param {string} templateId - Resume template identifier
 * @returns {object} Compatibility score, level, summary text, and platform breakdown
 */
export function getTemplateCompatibilityScore(templateId = 'ivy_classic') {
  const greenhouseCheck = checkTemplateCompatibility('greenhouse', templateId);
  const workdayCheck = checkTemplateCompatibility('workday', templateId);
  const leverCheck = checkTemplateCompatibility('lever', templateId);
  const ashbyCheck = checkTemplateCompatibility('ashby', templateId);
  const taleoCheck = checkTemplateCompatibility('taleo', templateId);

  const passesGreenhouse = greenhouseCheck.isCompatible;
  const passesWorkday = workdayCheck.isCompatible;

  let score = 100;
  let status = 'safe'; // 'safe' | 'warning' | 'critical'
  let summaryText = 'Passes Greenhouse & Workday (100% Single-Column)';
  let badgeLabel = 'Passes Greenhouse & Workday';

  if (!passesWorkday && passesGreenhouse) {
    score = 65;
    status = 'warning';
    summaryText = 'Passes Greenhouse / Fails Workday';
    badgeLabel = 'Passes Greenhouse / Fails Workday';
  } else if (!passesWorkday && !passesGreenhouse) {
    score = 40;
    status = 'critical';
    summaryText = 'Fails Greenhouse & Workday';
    badgeLabel = 'Fails Greenhouse & Workday';
  }

  return {
    score,
    status,
    summaryText,
    badgeLabel,
    passesGreenhouse,
    passesWorkday,
    passesLever: leverCheck.isCompatible,
    passesAshby: ashbyCheck.isCompatible,
    passesTaleo: taleoCheck.isCompatible,
    workdayReason: workdayCheck.reason,
    greenhouseReason: greenhouseCheck.reason,
    recommendation: workdayCheck.recommendation || greenhouseCheck.recommendation || null
  };
}

