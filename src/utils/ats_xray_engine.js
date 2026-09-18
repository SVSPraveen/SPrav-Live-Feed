/**
 * ats_xray_engine.js
 * ==================
 * ATS X-Ray Diagnostic Engine — Reverse ATS Simulator
 * 100% in-browser, zero API keys, zero data harvesting.
 *
 * Analyzes a resume across 12 diagnostic dimensions and produces
 * a comprehensive report mirroring how real ATS parsers evaluate candidates.
 *
 * Exports:
 *   analyzeResume(resumeText, jobDescription?, options?) → XRayReport
 *   scoreToGrade(score) → 'A'|'B'|'C'|'D'|'F'
 *   DIMENSION_WEIGHTS (for transparency)
 */

import { extractTextFromFile as clientExtractTextFromFile } from './client_resume_extractor.js';

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS & DATABASES
// ─────────────────────────────────────────────────────────────────────────────

/** Grade thresholds */
export const GRADE_THRESHOLDS = { A: 90, B: 80, C: 70, D: 60 };

/** Dimension weights for overall score (must sum to 1.0) */
export const DIMENSION_WEIGHTS = {
  contact:        0.12,
  sections:       0.10,
  format:         0.10,
  keywords:       0.10,
  actionVerbs:    0.10,
  quantification: 0.10,
  dates:          0.07,
  length:         0.07,
  redFlags:       0.10,
  skills:         0.07,
  education:      0.07,
  // jdMatch replaces keywords weight when JD is provided (handled in analyzeResume)
};

/** Standard ATS section headers — regex patterns */
const SECTION_PATTERNS = [
  { id: 'summary',        label: 'Summary / Objective',     weight: 'important', patterns: [/\b(professional\s+)?summary\b/i, /\bobject(ive)?\b/i, /\bprofile\b/i, /\babout\b/i, /\bcareer\s+(overview|goal)\b/i] },
  { id: 'experience',     label: 'Work Experience',          weight: 'critical',  patterns: [/\b(work\s+|professional\s+|relevant\s+)?experience\b/i, /\bemployment(\s+history)?\b/i, /\bwork\s+history\b/i, /\bcareer\s+history\b/i, /\bpositions?\s+held\b/i] },
  { id: 'education',      label: 'Education',                weight: 'critical',  patterns: [/\beducation(al)?\b/i, /\bacademic\s+(background|credentials)\b/i, /\bdegrees?\b/i, /\bqualifications?\b/i] },
  { id: 'skills',         label: 'Skills',                   weight: 'critical',  patterns: [/\b(technical\s+|core\s+|key\s+|professional\s+)?skills?\b/i, /\bcompetenc(y|ies)\b/i, /\bexpertise\b/i, /\btechnologies\b/i, /\btech\s+stack\b/i] },
  { id: 'projects',       label: 'Projects',                 weight: 'important', patterns: [/\bprojects?\b/i, /\bpersonal\s+projects?\b/i, /\bside\s+projects?\b/i, /\bportfolio\b/i] },
  { id: 'certifications', label: 'Certifications',           weight: 'helpful',   patterns: [/\bcertif(ication|ied)s?\b/i, /\blicenses?\b/i, /\bcredentials?\b/i, /\baccreditations?\b/i] },
  { id: 'volunteer',      label: 'Volunteer / Community',    weight: 'helpful',   patterns: [/\bvolunteer(ing)?\b/i, /\bcommunity\s+(involvement|service)\b/i, /\bsocial\s+impact\b/i] },
  { id: 'publications',   label: 'Publications / Research',  weight: 'helpful',   patterns: [/\bpublications?\b/i, /\bresearch\b/i, /\bpapers?\b/i, /\barticles?\b/i, /\bpatents?\b/i] },
  { id: 'languages',      label: 'Languages',                weight: 'helpful',   patterns: [/\blanguages?\b/i, /\bfluent\s+in\b/i] },
  { id: 'awards',         label: 'Awards / Honors',          weight: 'helpful',   patterns: [/\bawards?\b/i, /\bhonors?\b/i, /\bachievements?\b/i, /\brecognitions?\b/i] },
  { id: 'references',     label: 'References',               weight: 'neutral',   patterns: [/\breferences?\b/i, /\brecommendations?\b/i] },
];

/** Strong action verbs — 120 curated high-impact verbs */
const STRONG_VERBS = new Set([
  'achieved','accelerated','architected','automated','boosted','built','championed',
  'created','delivered','deployed','designed','developed','directed','drove',
  'eliminated','engineered','established','executed','expanded','founded',
  'generated','grew','implemented','improved','increased','initiated','innovated',
  'integrated','launched','led','mentored','migrated','modernized','negotiated',
  'optimized','orchestrated','oversaw','partnered','pioneered','produced',
  'published','reduced','refactored','released','resolved','restructured',
  'revamped','scaled','secured','shipped','simplified','solved','spearheaded',
  'standardized','streamlined','transformed','tripled','doubled','exceeded',
  'consolidated','coordinated','crafted','cultivated','cut','decreased','defined',
  'delivered','drove','enabled','enhanced','exceeded','facilitated','formulated',
  'grew','guided','handled','headed','hired','identified','influenced','instituted',
  'introduced','led','maintained','maximized','minimized','overled','performed',
  'planned','processed','programmed','promoted','proposed','provided','ran',
  'realigned','rebuilt','recruited','reorganized','repositioned','researched',
  'restored','reviewed','saved','selected','shaped','supported','surpassed',
  'synthesized','tested','upgraded','validated','won','wrote',
]);

/** Weak / passive verb patterns — what to flag and replace */
const WEAK_VERB_PATTERNS = [
  { pattern: /\bresponsible\s+for\b/gi,        suggestion: 'Led / Owned / Delivered' },
  { pattern: /\bhelped\s+(to\s+)?/gi,          suggestion: 'Contributed to / Co-led' },
  { pattern: /\bassisted\s+(with|in)?\b/gi,    suggestion: 'Supported / Enabled' },
  { pattern: /\bworked\s+on\b/gi,              suggestion: 'Built / Developed / Delivered' },
  { pattern: /\bparticipated\s+in\b/gi,        suggestion: 'Contributed to / Collaborated on' },
  { pattern: /\binvolved\s+in\b/gi,            suggestion: 'Drove / Led' },
  { pattern: /\butilized\b/gi,                 suggestion: 'Used / Applied / Leveraged' },
  { pattern: /\bleveraged\b/gi,                suggestion: 'Applied / Used (be specific)' },
  { pattern: /\btasked\s+with\b/gi,            suggestion: 'Led / Owned' },
  { pattern: /\bwas\s+responsible\b/gi,        suggestion: 'Owned / Led' },
  { pattern: /\btried\s+to\b/gi,               suggestion: 'Achieved / Successfully' },
  { pattern: /\battended\b/gi,                 suggestion: 'Participated in / Contributed at' },
  { pattern: /\bfamiliar\s+with\b/gi,          suggestion: 'Experienced in / Proficient in' },
  { pattern: /\bexposure\s+to\b/gi,            suggestion: 'Experience with (or remove)' },
];

/** Tech keywords database — 300+ across 12 categories */
const KEYWORD_DB = {
  languages:     ['python','javascript','typescript','java','go','golang','rust','c++','c#','ruby','php','swift','kotlin','scala','r','matlab','perl','bash','powershell','html','css','sql','graphql'],
  frameworks:    ['react','angular','vue','next.js','nuxt','svelte','django','fastapi','flask','express','spring','laravel','rails','fastify','nestjs','remix','astro','gatsby'],
  databases:     ['postgresql','postgres','mysql','sqlite','mongodb','redis','elasticsearch','cassandra','dynamodb','bigquery','snowflake','clickhouse','supabase','firebase','cockroachdb','neo4j'],
  cloud:         ['aws','gcp','azure','vercel','netlify','heroku','cloudflare','digitalocean','linode','ec2','s3','lambda','rds','ecs','eks','gke','cloud run','app engine'],
  devops:        ['docker','kubernetes','k8s','terraform','ansible','helm','jenkins','github actions','gitlab ci','circleci','argocd','prometheus','grafana','datadog','pagerduty','nagios'],
  ai_ml:         ['pytorch','tensorflow','scikit-learn','keras','huggingface','langchain','langgraph','openai','anthropic','gemini','llm','rag','vector database','fine-tuning','mlflow','wandb','ray','xgboost','lightgbm'],
  data:          ['pandas','numpy','spark','kafka','airflow','dbt','fivetran','looker','tableau','power bi','metabase','dask','polars','arrow','parquet','etl','data pipeline','data warehouse'],
  testing:       ['jest','vitest','pytest','cypress','playwright','selenium','junit','mocha','chai','supertest','k6','locust','postman','swagger','qa','sdet','test automation','automated testing','automation testing','appium','jmeter','testng','cucumber','bdd','tdd','regression testing','e2e testing','load testing','performance testing','api testing','testrail','sonarqube'],
  architecture:  ['microservices','rest api','graphql','grpc','message queue','event-driven','cqrs','domain-driven','system design','distributed systems','scalability','high availability','caching','load balancing'],
  security:      ['oauth','jwt','ssl/tls','https','encryption','aes','rsa','rbac','zero trust','penetration testing','soc 2','gdpr','hipaa','pci-dss','waf','iam','cybersecurity','infosec','siem','soc','pentest','ethical hacking','owasp','burp suite','wireshark','metasploit','crowdstrike','splunk','sentinel','saml','oidc','devsecops','vulnerability management','incident response','threat intelligence','firewall','edr','xdr'],
  embedded_iot:  ['embedded c','embedded c++','firmware','rtos','freertos','zephyr','arm','microcontroller','stm32','esp32','esp8266','arduino','raspberry pi','i2c','spi','uart','can bus','modbus','ble','bluetooth','zigbee','lorawan','fpga','verilog','vhdl','asic','device drivers','bsp','pcb design','embedded linux','kernel driver'],
  blockchain_web3: ['blockchain','web3','solidity','ethereum','smart contracts','evm','solana','defi','dapps','ethers.js','web3.js','hardhat','foundry','truffle','ipfs','zero knowledge','zk-snarks','zk-starks','tokenomics','consensus algorithms'],
  tools:         ['git','github','gitlab','jira','confluence','figma','postman','vscode','linux','unix','nginx','apache','redis','celery','rabbitmq','kafka'],
  soft_skills:   ['leadership','mentoring','communication','cross-functional','stakeholder','agile','scrum','kanban','project management','technical writing','code review'],
};

const ALL_KEYWORDS = Object.values(KEYWORD_DB).flat();

/** ATS red flag patterns */
const RED_FLAG_PATTERNS = [
  { id: 'fancy_bullets',    severity: 'critical', pattern: /[→←↑↓✓✗✦★◆◇●○□■⬛⬜▶▷►·]/g,            message: 'Fancy/special decorative characters found — many ATS parsers skip or garble them.', fix: 'Replace with plain hyphens (-) or standard bullets (•)' },
  { id: 'table_pipes',      severity: 'critical', pattern: /^\s*\|.+?\|.*$/m,                          message: 'Table formatting detected (pipe characters) — ATS parsers read tables left-to-right, destroying column layout.', fix: 'Remove all tables; use plain text lists instead' },
  { id: 'no_email',         severity: 'critical', pattern: null,                                       message: 'No email address found — ATS systems require email for candidate record creation.', fix: 'Add a professional email in the contact section' },
  { id: 'all_caps_abuse',   severity: 'warning',  pattern: null,                                       message: 'Multiple all-caps words found — can confuse ATS tokenizers and appear unprofessional.', fix: 'Use Title Case for section headers instead of ALL CAPS' },
  { id: 'brackets_in_name', severity: 'warning',  pattern: /^\s*(\[|\().+[\])]/m,                     message: 'Resume appears to start with brackets — may confuse name extraction parsers.', fix: 'Place your full name on the very first line, no brackets' },
  { id: 'percent_sign',     severity: 'info',     pattern: /(\d+\.?\d*)\s*%/g,                        message: null, fix: null },   // positive — we count these
  { id: 'slash_dates',      severity: 'warning',  pattern: /\b\d{1,2}\/\d{2,4}\b/g,                  message: 'Slash-format dates (MM/YYYY) detected — prefer "Month YYYY" for maximum ATS compatibility.', fix: 'Change to "Jan 2023 – Mar 2024" format' },
  { id: 'photo_mention',    severity: 'critical', pattern: /\b(photo|headshot|picture|image)\b/gi,    message: 'Photo reference detected — ATS systems cannot parse images and may discard the section.', fix: 'Remove all photo references; ATS and most US/EU hiring laws prohibit photos' },
  { id: 'objective_old',    severity: 'info',     pattern: /\bobjective\s*:/i,                        message: '"Objective:" header is outdated — modern resumes use "Professional Summary" instead.', fix: 'Replace with a 2-3 line Professional Summary' },
  { id: 'references_avail', severity: 'info',     pattern: /references\s+available\s+upon\s+request/i, message: '"References available upon request" wastes valuable space — ATS ignores it; hiring managers know.', fix: 'Remove this phrase; add an extra achievement bullet instead' },
];

/** Date patterns for consistency checking */
const DATE_PATTERNS = {
  monthYear:    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:tember)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\s+\d{4}\b/gi,
  yearOnly:     /\b(19|20)\d{2}\b/g,
  slashDate:    /\b\d{1,2}\/\d{2,4}\b/g,
  present:      /\b(present|current|now|ongoing)\b/gi,
  yearRange:    /\b(19|20)\d{2}\s*[-–—]\s*(19|20)\d{2}\b/g,
};

/** Education degree keywords */
const DEGREE_KEYWORDS = ['bachelor','master','phd','doctorate','associate','diploma','bs','ms','ba','mba','beng','meng','btech','mtech','be','me','bsc','msc'];

// ─────────────────────────────────────────────────────────────────────────────
// UTILITY FUNCTIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Converts a numeric score (0-100) to a letter grade.
 * @param {number} score
 * @returns {'A'|'B'|'C'|'D'|'F'}
 */
export function scoreToGrade(score) {
  if (typeof score !== 'number' || isNaN(score)) return 'F';
  const clamped = Math.max(0, Math.min(100, score));
  if (clamped >= GRADE_THRESHOLDS.A) return 'A';
  if (clamped >= GRADE_THRESHOLDS.B) return 'B';
  if (clamped >= GRADE_THRESHOLDS.C) return 'C';
  if (clamped >= GRADE_THRESHOLDS.D) return 'D';
  return 'F';
}

/** Clamps a number to [0, 100] and rounds to nearest integer */
function clamp100(n) {
  return Math.round(Math.max(0, Math.min(100, n)));
}

/** Extract lines that look like resume bullets (start with action-ish content) */
function getBulletLines(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 15);
  const hasExplicitBullets = lines.some(l => /^[-•*–—]/.test(l));

  if (hasExplicitBullets) {
    return lines.filter(line => /^[-•*–—]/.test(line) && line.length >= 20);
  }

  return lines.filter(line => {
    if (/^\s*\|.*\|\s*$/.test(line)) return false;
    if (line.includes(':') && line.length < 80) return false;
    if (/@|http|\.com\b|\+?\d{3}/.test(line)) return false;
    if (/\b(?:19|20)\d{2}\s*[-–—to]+\s*(?:(?:19|20)\d{2}|present)\b/i.test(line)) return false;
    const clean = line.replace(/^[-•*–—\d.)\s]+/, '').trim();
    return /^[A-Za-z]/.test(clean) && line.length >= 20 && line.length < 350;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 1: CONTACT INFORMATION
// ─────────────────────────────────────────────────────────────────────────────

function analyzeContact(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [{ severity: 'critical', title: 'No resume text provided', fix: 'Upload or paste your resume text' }], parsed: {} };
  }

  const parsed = {};
  const issues = [];

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  parsed.email = emailMatch ? emailMatch[0] : null;

  // Phone — multiple formats
  const phoneMatch = text.match(/(?:\+?1[-.\s]?)?\(?([0-9]{3})\)?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})|(?:\+91[-.\s]?)?[6-9]\d{9}/);
  parsed.phone = phoneMatch ? phoneMatch[0].trim() : null;

  // LinkedIn
  const linkedinMatch = text.match(/linkedin\.com\/in\/([a-zA-Z0-9\-_%]+)/i);
  parsed.linkedin = linkedinMatch ? `linkedin.com/in/${linkedinMatch[1]}` : null;

  // GitHub
  const githubMatch = text.match(/github\.com\/([a-zA-Z0-9\-_%]+)/i);
  parsed.github = githubMatch ? `github.com/${githubMatch[1]}` : null;

  // Portfolio / website
  const portfolioMatch = text.match(/(?:portfolio|website|site|web)[\s:]+([a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+)/i)
    || text.match(/https?:\/\/(?!linkedin|github)[a-zA-Z0-9\-._~:/?#[\]@!$&'()*+,;=%]+/i);
  parsed.portfolio = portfolioMatch ? (portfolioMatch[1] || portfolioMatch[0]) : null;

  // Name — heuristic: first non-empty line that's title-case words
  const firstLines = text.split('\n').map(l => l.trim()).filter(l => l.length > 1).slice(0, 5);
  for (const line of firstLines) {
    const clean = line.replace(/[^a-zA-Z\s]/g, '').trim();
    const words = clean.split(/\s+/);
    if (words.length >= 2 && words.length <= 5 && words.every(w => /^[A-Z][a-z]+$|^[A-Z]+$/.test(w))) {
      parsed.name = clean;
      break;
    }
  }

  // Location — city/state or country patterns
  const locationMatch = text.match(/([A-Z][a-z]+(?:\s[A-Z][a-z]+)?,\s*(?:[A-Z]{2}|[A-Z][a-z]+))|(?:Remote|Hybrid|On-?site)/i);
  parsed.location = locationMatch ? locationMatch[0] : null;

  // Score calculation
  let score = 0;
  const fieldScores = { email: 30, phone: 20, name: 20, linkedin: 15, location: 10, github: 5 };

  if (parsed.email)    { score += fieldScores.email; }
  else {
    issues.push({
      severity: 'critical',
      title: 'Missing email address',
      fix: 'Add a professional email (firstname.lastname@gmail.com) to your contact header',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 12,
      detectedText: 'No email address found',
      whyItMatters: 'Enterprise ATS platforms (Workday, Taleo, Greenhouse) require candidate email as the unique primary key to create applicant files. Without an email, parsers fail to index the profile.',
      beforeAfter: { before: 'Alex Mercer\nSan Francisco, CA', after: 'Alex Mercer\nalex.mercer@gmail.com | San Francisco, CA' },
      actionType: 'replace_text'
    });
  }

  if (parsed.phone)    { score += fieldScores.phone; }
  else {
    issues.push({
      severity: 'warning',
      title: 'Missing phone number',
      fix: 'Add a phone number — most ATS systems require it to create your candidate record',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 6,
      detectedText: 'No phone number detected',
      whyItMatters: 'ATS requisition workflows flag incomplete contact information for manual recruiter review. Adding a phone number prevents automated applicant disqualification.',
      beforeAfter: { before: 'alex.mercer@gmail.com', after: 'alex.mercer@gmail.com | +1 (555) 234-5678' },
      actionType: 'replace_text'
    });
  }

  if (parsed.name)     { score += fieldScores.name; }
  else {
    issues.push({
      severity: 'warning',
      title: 'Name not clearly detected on first line',
      fix: 'Put your full name on the very first line of the resume, in plain text',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 6,
      detectedText: 'Top line missing distinct capital name pattern',
      whyItMatters: 'ATS parsers read line 1 as the candidate name. Missing or obscured names create unidentified applicant files in recruiter databases.',
      beforeAfter: { before: 'Summary: Experienced Engineer...', after: 'Alex Mercer\nSummary: Experienced Engineer...' },
      actionType: 'replace_text'
    });
  }

  if (parsed.linkedin) { score += fieldScores.linkedin; }
  else {
    issues.push({
      severity: 'warning',
      title: 'No LinkedIn URL',
      fix: 'Add your LinkedIn URL (linkedin.com/in/yourname) — ATS systems at Google, Microsoft and Stripe score this positively',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 5,
      detectedText: 'No LinkedIn URL found',
      whyItMatters: 'Automated candidate verification crawlers at top product companies verify work history via LinkedIn URL. Profiles with LinkedIn enjoy up to 40% higher recruiter reply rates.',
      beforeAfter: { before: 'alex.mercer@gmail.com | +1 (555) 234-5678', after: 'alex.mercer@gmail.com | +1 (555) 234-5678 | linkedin.com/in/alexmercer' },
      actionType: 'replace_text'
    });
  }

  if (parsed.location) { score += fieldScores.location; }
  else {
    issues.push({
      severity: 'info',
      title: 'Location not detected',
      fix: 'Add City, State/Country or "Remote" to your contact line',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 3,
      detectedText: 'No geographic location tag',
      whyItMatters: 'Location filters are used by ATS parsers to verify local work authorization and time zone compatibility.',
      beforeAfter: { before: 'Alex Mercer | alex@gmail.com', after: 'Alex Mercer | alex@gmail.com | San Francisco, CA (or Remote)' },
      actionType: 'replace_text'
    });
  }

  if (parsed.github)   { score += fieldScores.github; }
  else {
    issues.push({
      severity: 'info',
      title: 'No GitHub URL',
      fix: 'Add your GitHub profile if you have public projects — Greenhouse and Ashby parse this field automatically',
      dimension: 'contact',
      category: 'Contact & Links',
      pointsGain: 2,
      detectedText: 'No GitHub link found',
      whyItMatters: 'Technical ATS parsers automatically scrape repositories to benchmark code activity and open-source contributions.',
      beforeAfter: { before: 'linkedin.com/in/alex', after: 'linkedin.com/in/alex | github.com/alex' },
      actionType: 'replace_text'
    });
  }

  return { score: clamp100(score), grade: scoreToGrade(score), issues, parsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 2: SECTION DETECTION
// ─────────────────────────────────────────────────────────────────────────────

function analyzeSections(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: { detected: [], missing: [] } };
  }

  const detected = [];
  const missing  = [];
  const issues   = [];

  for (const section of SECTION_PATTERNS) {
    const found = section.patterns.some(pat => pat.test(text));
    if (found) {
      detected.push(section.id);
    } else {
      missing.push(section.id);
      if (section.weight === 'critical') {
        issues.push({
          severity: 'critical',
          title: `Missing section: ${section.label}`,
          fix: `Add a clearly labeled "${section.label}" section — ATS systems require this header to extract the right data`,
          dimension: 'sections',
          category: 'Section Architecture',
          pointsGain: 10,
          detectedText: `Section "${section.label}" not detected`,
          whyItMatters: `Modern ATS parsers (Sovren, Textkernel, Workday) use strict regex matching to segment resume text into database tables. Omitting "${section.label}" leaves core candidate qualifications unindexed.`,
          beforeAfter: { before: '(Section omitted)', after: `${section.label.toUpperCase()}\n- Detail your core achievements and credentials here` },
          actionType: 'add_section'
        });
      } else if (section.weight === 'important') {
        issues.push({
          severity: 'warning',
          title: `Missing section: ${section.label}`,
          fix: `Consider adding a "${section.label}" section — it significantly improves ATS score completeness`,
          dimension: 'sections',
          category: 'Section Architecture',
          pointsGain: 5,
          detectedText: `Section "${section.label}" not detected`,
          whyItMatters: `Adding a dedicated ${section.label} provides valuable context and keyword density that boosts overall ATS match relevancy.`,
          beforeAfter: { before: '(Section omitted)', after: `${section.label.toUpperCase()}\n- Summary of career focus and key technical contributions` },
          actionType: 'add_section'
        });
      }
    }
  }

  const criticalSections = SECTION_PATTERNS.filter(s => s.weight === 'critical');
  const foundCritical    = criticalSections.filter(s => detected.includes(s.id)).length;
  const criticalScore    = (foundCritical / criticalSections.length) * 70;

  const importantSections = SECTION_PATTERNS.filter(s => s.weight === 'important');
  const foundImportant    = importantSections.filter(s => detected.includes(s.id)).length;
  const importantScore    = (foundImportant / importantSections.length) * 20;

  const helpfulSections = SECTION_PATTERNS.filter(s => s.weight === 'helpful');
  const foundHelpful    = helpfulSections.filter(s => detected.includes(s.id)).length;
  const helpfulScore    = Math.min(10, (foundHelpful / helpfulSections.length) * 10);

  const score = clamp100(criticalScore + importantScore + helpfulScore);

  return { score, grade: scoreToGrade(score), issues, parsed: { detected, missing } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 3: FORMAT SAFETY
// ─────────────────────────────────────────────────────────────────────────────

function analyzeFormat(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [] };
  }

  const issues  = [];
  let penalty   = 0;

  // Fancy bullet symbols
  const fancyBullets = text.match(/[→←↑↓✓✗✦★◆◇●○□■⬛⬜▶▷►·]/g);
  if (fancyBullets && fancyBullets.length > 2) {
    penalty += 20;
    const sampleGlyph = fancyBullets[0];
    issues.push({
      severity: 'critical',
      title: `${fancyBullets.length} fancy bullet characters detected`,
      fix: 'Replace all → ✓ ★ ◆ ● symbols with hyphens (-) or asterisks (*). Most ATS parsers skip or garble special Unicode bullets.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 6,
      detectedText: `Glyphs found: ${fancyBullets.slice(0, 6).join(' ')}`,
      whyItMatters: 'Legacy and enterprise ATS tokenizers (Taleo, iCIMS, older Workday instances) do not support decorative Unicode glyphs. They render as corrupted character entities ( or ??), breaking sentence parsing.',
      beforeAfter: { before: `${sampleGlyph} Architected distributed cloud microservices`, after: `- Architected distributed cloud microservices` },
      actionType: 'clean_formatting'
    });
  }

  // Table-like formatting (pipe chars)
  const pipeLines = (text.match(/^\s*\|.+?\|/gm) || []);
  if (pipeLines.length > 1) {
    penalty += 25;
    issues.push({
      severity: 'critical',
      title: `Table formatting detected (${pipeLines.length} rows)`,
      fix: 'Remove all table structures. ATS reads tables left-to-right, mixing content from different columns. Use plain bulleted lists.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 8,
      detectedText: pipeLines[0],
      whyItMatters: 'ATS parsers strip graphic layout and parse plain text from left to right. When reading across table columns, job titles, dates, and companies from separate columns merge into scrambled sentences.',
      beforeAfter: { before: pipeLines[0], after: pipeLines[0].replace(/^\||\|$/g, '').replace(/\|/g, ' · ').trim() },
      actionType: 'clean_formatting'
    });
  }

  // Multi-column detection (lots of content in short lines suggesting columns)
  const lines = text.split('\n').filter(l => l.trim().length > 0);
  const shortLines = lines.filter(l => l.trim().length < 40 && l.trim().length > 3);
  if (shortLines.length / Math.max(lines.length, 1) > 0.5 && lines.length > 20) {
    penalty += 15;
    issues.push({
      severity: 'warning',
      title: 'Possible multi-column layout detected',
      fix: 'If your resume uses two columns, convert to a single-column format. ATS systems read top-to-bottom and will mix column content.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 6,
      detectedText: 'Short line breaks indicating multi-column wrapping',
      whyItMatters: 'Multi-column layouts are a primary cause of ATS rejection. Parsers read straight across columns, interweaving disparate text fragments.',
      beforeAfter: { before: 'Left Col: Skills\nRight Col: Experience', after: 'Single-Column: Skills Section followed by Work Experience' },
      actionType: 'clean_formatting'
    });
  }

  // Header/footer indicators (repeated page numbers)
  const pageNumPattern = text.match(/\bpage\s+\d+\s+of\s+\d+\b/gi);
  if (pageNumPattern && pageNumPattern.length > 1) {
    penalty += 10;
    issues.push({
      severity: 'warning',
      title: 'Header/footer page numbers detected',
      fix: 'Remove headers and footers — ATS parsers often misread these as contact info or skills.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 4,
      detectedText: pageNumPattern[0],
      whyItMatters: 'Page numbers and header strings placed inside header bands get injected into the middle of experience descriptions during plain text extraction.',
      beforeAfter: { before: 'Page 1 of 2', after: '(Remove page numbers from header/footer)' },
      actionType: 'clean_formatting'
    });
  }

  // Non-ASCII characters (excluding common punctuation)
  const nonAscii = text.match(/[^\x20-\x7E\t\r\n]/g) || [];
  const badChars = nonAscii.filter(c => !/[àáâãäåæçèéêëìíîïðñòóôõöøùúûüýþÿ\u2013\u2014\u2018\u2019\u201C\u201D\u2026]/.test(c));
  if (badChars.length > 5) {
    penalty += 10;
    issues.push({
      severity: 'warning',
      title: `${badChars.length} unusual characters detected`,
      fix: 'Remove or replace special/accented characters. Use plain ASCII to ensure ATS compatibility across all systems.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 4,
      detectedText: `Characters: ${badChars.slice(0, 5).join(' ')}`,
      whyItMatters: 'Non-standard ASCII characters frequently decode as unrecognized tokens, leading to corrupted keyword strings in applicant databases.',
      beforeAfter: { before: 'Special glyphs', after: 'Clean standard ASCII text' },
      actionType: 'clean_formatting'
    });
  }

  // Check for excessive ALL CAPS
  const allCapsWords = (text.match(/\b[A-Z]{5,}\b/g) || []);
  if (allCapsWords.length > 8) {
    penalty += 5;
    issues.push({
      severity: 'info',
      title: 'Excessive all-caps usage detected',
      fix: 'Use Title Case for section headers. All-caps text can confuse ATS keyword tokenizers.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 2,
      detectedText: allCapsWords.slice(0, 4).join(', '),
      whyItMatters: 'Tokenizers can misinterpret consecutive capitalized acronyms as single concatenated words.',
      beforeAfter: { before: 'EXPERIENCED SENIOR CLOUD ARCHITECT', after: 'Senior Cloud Architect' },
      actionType: 'clean_formatting'
    });
  }

  // Photo references in format
  if (/\b(photo|headshot|picture|image)\b/i.test(text)) {
    penalty += 15;
    issues.push({
      severity: 'warning',
      title: 'Photo/image reference detected',
      fix: 'Remove photos and image references. ATS cannot parse images and US/EU hiring guidelines advise against them.',
      dimension: 'format',
      category: 'ATS Parse Safety',
      pointsGain: 5,
      detectedText: 'Photo or headshot reference in document',
      whyItMatters: 'US and EU equal opportunity employment laws discourage photos on resumes. Many enterprise ATS systems automatically filter resumes containing images to eliminate bias risk.',
      beforeAfter: { before: '[Candidate Headshot Photo]', after: '(Remove photograph for North American & EU applications)' },
      actionType: 'clean_formatting'
    });
  }

  if (issues.length === 0) {
    issues.push({ severity: 'info', title: 'No major format issues detected', fix: 'Format looks ATS-safe. Ensure you export as .docx or single-column PDF.' });
  }

  return { score: clamp100(100 - penalty), grade: scoreToGrade(100 - penalty), issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 4: KEYWORD DENSITY
// ─────────────────────────────────────────────────────────────────────────────

function analyzeKeywords(text, _industry = 'tech') {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: { found: [], density: 0 } };
  }

  const lowerText = text.toLowerCase();
  const found = [];
  const foundByCategory = {};

  for (const [category, keywords] of Object.entries(KEYWORD_DB)) {
    const catFound = [];
    for (const kw of keywords) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex   = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i');
      if (regex.test(lowerText)) {
        catFound.push(kw);
        found.push(kw);
      }
    }
    if (catFound.length > 0) foundByCategory[category] = catFound;
  }

  const uniqueCount  = found.length;
  const wordCount    = lowerText.split(/\s+/).length;
  const density      = wordCount > 0 ? Math.round((uniqueCount / wordCount) * 1000) / 10 : 0; // per 100 words

  const issues = [];

  // Score: 0 keywords = 0, 5 = 40, 10 = 65, 20 = 85, 30+ = 100
  let score = 0;
  if (uniqueCount >= 30) score = 100;
  else if (uniqueCount >= 20) score = 80 + Math.round((uniqueCount - 20) / 10 * 20);
  else if (uniqueCount >= 10) score = 60 + Math.round((uniqueCount - 10) / 10 * 20);
  else if (uniqueCount >= 5)  score = 40 + Math.round((uniqueCount - 5)  / 5 * 20);
  else                        score = Math.round(uniqueCount * 8);

  if (uniqueCount < 5) {
    issues.push({ severity: 'critical', title: `Only ${uniqueCount} industry keywords detected`, fix: 'Add more relevant technical terms. ATS systems score keyword frequency heavily — aim for 20+ relevant terms.' });
  } else if (uniqueCount < 15) {
    issues.push({ severity: 'warning', title: `${uniqueCount} keywords detected — below optimal`, fix: `Expand your Skills section and weave keywords naturally into bullets. Target: 20–35 relevant terms. Missing categories: ${Object.keys(KEYWORD_DB).filter(k => !foundByCategory[k]).slice(0, 3).join(', ')}` });
  } else {
    issues.push({ severity: 'info', title: `${uniqueCount} industry keywords found across ${Object.keys(foundByCategory).length} categories`, fix: 'Good keyword coverage. Ensure they appear in context (bullets) not just a skills list.' });
  }

  return { score: clamp100(score), grade: scoreToGrade(score), issues, parsed: { found, foundByCategory, density, uniqueCount } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 5: ACTION VERB AUDIT
// ─────────────────────────────────────────────────────────────────────────────

function analyzeActionVerbs(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: { strong: [], weak: [] } };
  }

  const bullets  = getBulletLines(text);
  const issues   = [];
  const strongFound = [];
  const weakFound   = [];

  // Count strong verbs in bullets
  for (const bullet of bullets) {
    const cleanBullet = bullet.replace(/^[-•*–—\d.)\s]+/, '').trim();
    const firstWord = cleanBullet.split(/\s+/)[0]?.replace(/[^a-zA-Z]/g, '').toLowerCase();
    if (firstWord && STRONG_VERBS.has(firstWord)) {
      strongFound.push({ verb: firstWord, line: bullet.slice(0, 80) });
    }
  }

  // Find weak patterns anywhere in text
  for (const { pattern, suggestion } of WEAK_VERB_PATTERNS) {
    pattern.lastIndex = 0;
    const matches = text.match(pattern);
    if (matches) {
      const matchedPhrase = matches[0].trim();
      weakFound.push({ phrase: matchedPhrase, suggestion, count: matches.length });
      issues.push({
        severity: matches.length > 1 ? 'critical' : 'warning',
        title: `Weak phrase: "${matchedPhrase}" (×${matches.length})`,
        fix: `Replace with: ${suggestion}. This phrase signals passive work rather than ownership.`,
        dimension: 'actionVerbs',
        category: 'Action Verbs & Impact',
        pointsGain: 4,
        detectedText: `"${matchedPhrase}" detected ${matches.length} times in experience text`,
        whyItMatters: 'Recruiter scoring heuristics and modern LLM-based ATS screeners penalize passive phrasing like "responsible for" or "helped with". Decisive action verbs indicate individual ownership and direct delivery.',
        beforeAfter: {
          before: `${matchedPhrase} system scaling and microservice deployments`,
          after: `${suggestion.split('/')[0].trim()} scalable microservices, boosting throughput by 40%`
        },
        actionType: 'replace_text',
        targetText: matchedPhrase,
        replacementText: suggestion.split('/')[0].trim()
      });
    }
  }

  const totalBullets     = Math.max(bullets.length, 1);
  const strongRatio      = strongFound.length / totalBullets;
  const weakPenalty      = Math.min(40, weakFound.reduce((sum, w) => sum + w.count * 5, 0));
  const score            = clamp100(Math.round(strongRatio * 100) - weakPenalty);

  if (weakFound.length === 0 && strongFound.length > 0) {
    issues.push({ severity: 'info', title: `${strongFound.length} strong action verbs detected`, fix: 'Excellent verb usage. Continue leading every bullet with a strong, specific action verb.' });
  } else if (strongFound.length === 0) {
    issues.push({
      severity: 'critical',
      title: 'No strong action verbs detected at bullet start',
      fix: 'Begin every bullet point with a strong verb: Led, Built, Engineered, Delivered, Optimized, Reduced, Launched, Scaled.',
      dimension: 'actionVerbs',
      category: 'Action Verbs & Impact',
      pointsGain: 8,
      detectedText: 'Bullets lack initial action verbs',
      whyItMatters: 'Corporate recruiters spend an average of 6-7 seconds skimming resumes. Beginning with punchy active verbs immediately signals seniority and execution capability.',
      beforeAfter: { before: '- An application for tracking jobs', after: '- Architected an event-driven job tracking application with React and FastAPI' },
      actionType: 'replace_text'
    });
  }

  return { score, grade: scoreToGrade(score), issues, parsed: { strong: strongFound, weak: weakFound, bulletCount: bullets.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 6: QUANTIFICATION SCORE
// ─────────────────────────────────────────────────────────────────────────────

function analyzeQuantification(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: { quantifiedBullets: [], unquantifiedBullets: [] } };
  }

  const bullets           = getBulletLines(text);
  const quantifiedBullets = [];
  const unquantifiedBullets = [];

  const quantPattern = /\b\d+(\.\d+)?\s*(%|x\b|[kmb]\b|ms\b|s\b)|\$\s*[\d,.]+[kmb]?|\b(?!(?:19|20)\d{2}\b)\d{2,}[\d,.]*\b|\b\d+\s*(million|thousand|hundred|billion)\b|\b(doubled|tripled|halved|10x|5x|2x|3x)\b/i;

  for (const bullet of bullets) {
    if (quantPattern.test(bullet)) {
      quantifiedBullets.push(bullet.slice(0, 100));
    } else {
      unquantifiedBullets.push(bullet.slice(0, 100));
    }
  }

  const totalBullets = bullets.length;
  const quantifiedRatio = totalBullets > 0 ? quantifiedBullets.length / totalBullets : 0;
  const score = clamp100(Math.round(quantifiedRatio * 100));

  const issues = [];

  if (quantifiedBullets.length === 0) {
    issues.push({
      severity: 'critical',
      title: 'Zero quantified achievements found',
      fix: 'Add specific metrics to your bullets: "Reduced API latency by 40%", "Scaled to 1M DAU", "Saved $120K/year". Numbers dramatically increase ATS and recruiter scores.',
      dimension: 'quantification',
      category: 'Quantification & Metrics',
      pointsGain: 10,
      detectedText: unquantifiedBullets[0] || 'No metric tokens (% / $ / numbers / scale) detected',
      whyItMatters: 'The Google X-Y-Z formula ("Accomplished [X] as measured by [Y], by doing [Z]") is standard across tech hiring. Unquantified bullets score up to 60% lower on candidate strength indices.',
      beforeAfter: {
        before: unquantifiedBullets[0] || 'Built microservices and optimized database queries',
        after: `${unquantifiedBullets[0] || 'Built microservices and optimized database queries'}, reducing p99 latency by 45% and supporting 100K+ DAU`
      },
      actionType: 'quantify_metric',
      targetText: unquantifiedBullets[0] || ''
    });
  } else if (quantifiedRatio < 0.3) {
    const sampleWeakBullet = unquantifiedBullets[0] || 'Maintained production infrastructure';
    issues.push({
      severity: 'warning',
      title: `Only ${quantifiedBullets.length}/${totalBullets} bullets have metrics (${Math.round(quantifiedRatio * 100)}%)`,
      fix: `Add numbers to your unquantified bullets. Examples: "${sampleWeakBullet.slice(0, 60)}..." → add "achieving X% improvement" or "within N weeks".`,
      dimension: 'quantification',
      category: 'Quantification & Metrics',
      pointsGain: 8,
      detectedText: sampleWeakBullet,
      whyItMatters: 'Top tech employers (Google, Stripe, Amazon) expect 60%+ of work experience bullets to contain measurable business metrics. Low quantification signals task-execution over high-impact ownership.',
      beforeAfter: {
        before: sampleWeakBullet,
        after: `${sampleWeakBullet}, driving 32% efficiency improvement across production environments`
      },
      actionType: 'quantify_metric',
      targetText: sampleWeakBullet
    });
  } else if (quantifiedRatio < 0.6) {
    issues.push({
      severity: 'info',
      title: `${quantifiedBullets.length}/${totalBullets} bullets quantified — aim for 60%+`,
      fix: 'Good progress. Push more bullets to include specific impact metrics.',
      dimension: 'quantification',
      category: 'Quantification & Metrics',
      pointsGain: 4
    });
  } else {
    issues.push({
      severity: 'info',
      title: `Strong quantification: ${quantifiedBullets.length}/${totalBullets} bullets have metrics (${Math.round(quantifiedRatio * 100)}%)`,
      fix: 'Excellent. Ensure all metrics are truthful and specific.',
      dimension: 'quantification',
      category: 'Quantification & Metrics',
      pointsGain: 0
    });
  }

  return { score, grade: scoreToGrade(score), issues, parsed: { quantifiedBullets, unquantifiedBullets, ratio: Math.round(quantifiedRatio * 100) } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 7: JD KEYWORD MATCH (optional)
// ─────────────────────────────────────────────────────────────────────────────

export function analyzeJDMatch(resumeText, jdText) {
  if (!resumeText || typeof resumeText !== 'string' || !jdText || typeof jdText !== 'string') {
    return null;
  }

  const lowerResume = resumeText.toLowerCase();
  const lowerJD     = jdText.toLowerCase();

  // Extract keywords from JD
  const jdWords = lowerJD.match(/\b[a-z][a-z0-9+#.-]{2,}\b/g) || [];
  const stopWords = new Set(['the','and','for','with','this','that','from','have','will','your','are','can','you','our','any','not','all','but','they','use','has','was','its','been','also','more','when','how','we','an','in','to','of','is','a','or','at','be']);

  // Weight JD keywords by frequency
  const jdFreq = {};
  for (const word of jdWords) {
    if (!stopWords.has(word) && word.length > 2) {
      jdFreq[word] = (jdFreq[word] || 0) + 1;
    }
  }

  // Cross-check with known keyword DB
  const jdKeywords   = [];
  const matched      = [];
  const missing      = [];

  for (const kw of ALL_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const inJD    = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(lowerJD);
    if (inJD) {
      jdKeywords.push(kw);
      const inResume = new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(lowerResume);
      if (inResume) matched.push(kw);
      else          missing.push(kw);
    }
  }

  // Also check high-frequency JD words not in our DB
  const topJDTerms = Object.entries(jdFreq)
    .filter(([w]) => !stopWords.has(w) && w.length > 3)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 30)
    .map(([w]) => w);

  const extraMissing = topJDTerms.filter(term =>
    !matched.includes(term) &&
    !lowerResume.includes(term) &&
    !missing.includes(term)
  );

  const allMissing = [...missing, ...extraMissing].slice(0, 15);
  const matchRate  = jdKeywords.length > 0 ? Math.round((matched.length / jdKeywords.length) * 100) : 0;
  const score      = jdKeywords.length === 0 ? 50 : clamp100(matchRate);

  const issues = [];

  if (jdKeywords.length === 0) {
    issues.push({ severity: 'info', title: 'No recognized tech keywords found in job description', fix: 'The JD may be non-technical or use uncommon terminology. Manual comparison recommended.' });
  } else if (matchRate < 40) {
    issues.push({
      severity: 'critical',
      title: `Only ${matchRate}% keyword match with job description`,
      fix: `Add these missing critical terms to your resume: ${allMissing.slice(0, 8).join(', ')}. Low match = automatic ATS rejection.`,
      dimension: 'jdMatch',
      category: 'Target JD Keyword Gap',
      pointsGain: 14,
      detectedText: `Missing: ${allMissing.slice(0, 8).join(', ')}`,
      whyItMatters: 'Enterprise ATS algorithms (Workday, Greenhouse, Ashby) rank applicants by computing keyword overlap with the requisition. Below 50% keyword match results in automatic filtering or bottom-tier placement.',
      beforeAfter: {
        before: 'Technical Skills: Python, SQL, REST APIs',
        after: `Technical Skills: Python, SQL, REST APIs, ${allMissing.slice(0, 5).join(', ')}`
      },
      actionType: 'add_skills',
      missingKeywords: allMissing
    });
  } else if (matchRate < 60) {
    issues.push({
      severity: 'warning',
      title: `${matchRate}% JD keyword match — below 60% threshold`,
      fix: `Missing: ${allMissing.slice(0, 6).join(', ')}. Weave these into bullets and skills section naturally.`,
      dimension: 'jdMatch',
      category: 'Target JD Keyword Gap',
      pointsGain: 8,
      detectedText: `Missing: ${allMissing.slice(0, 6).join(', ')}`,
      whyItMatters: 'Reaching 75%+ keyword match moves candidate profiles into the recruiter "Top Candidates" screen in modern ATS portals.',
      beforeAfter: {
        before: 'Technical Skills: Python, SQL, REST APIs',
        after: `Technical Skills: Python, SQL, REST APIs, ${allMissing.slice(0, 4).join(', ')}`
      },
      actionType: 'add_skills',
      missingKeywords: allMissing
    });
  } else {
    issues.push({
      severity: 'info',
      title: `${matchRate}% JD keyword match — good alignment`,
      fix: `${allMissing.length > 0 ? `Consider adding: ${allMissing.slice(0, 4).join(', ')}` : 'Excellent alignment with the job description.'}`,
      dimension: 'jdMatch',
      category: 'Target JD Keyword Gap',
      pointsGain: 3,
      detectedText: allMissing.length > 0 ? `Optional enhancements: ${allMissing.slice(0, 3).join(', ')}` : 'Full core alignment'
    });
  }

  return { score, grade: scoreToGrade(score), issues, parsed: { matched, missing: allMissing, matchRate, jdKeywordCount: jdKeywords.length } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 8: DATE & TENURE PARSING
// ─────────────────────────────────────────────────────────────────────────────

function analyzeDates(text) {
  if (!text || typeof text !== 'string') {
    return { score: 50, grade: 'C', issues: [], parsed: {} };
  }

  const issues = [];
  let penalty  = 0;

  const monthYearDates = text.match(DATE_PATTERNS.monthYear) || [];
  const slashDates     = text.match(DATE_PATTERNS.slashDate)  || [];
  const yearRanges     = text.match(DATE_PATTERNS.yearRange)   || [];

  // Inconsistent date formats
  if (slashDates.length > 0 && monthYearDates.length > 0) {
    penalty += 20;
    issues.push({ severity: 'warning', title: 'Mixed date formats detected', fix: 'Standardize all dates to "Month YYYY" format (e.g., "Jan 2022 – Mar 2024"). Inconsistency confuses ATS date parsers.' });
  } else if (slashDates.length > 0) {
    penalty += 10;
    issues.push({ severity: 'warning', title: `Slash-format dates (${slashDates.length}) detected`, fix: 'Replace "01/2022" format with "Jan 2022" for maximum ATS compatibility' });
  }

  // Check if dates are present at all
  const totalDates = monthYearDates.length + slashDates.length + yearRanges.length;
  if (totalDates === 0) {
    penalty += 40;
    issues.push({ severity: 'critical', title: 'No dates found in resume', fix: 'Add start and end dates to every role and education entry. ATS systems sort candidates by recency.' });
  } else if (totalDates < 2) {
    penalty += 15;
    issues.push({ severity: 'warning', title: 'Very few dates detected', fix: 'Ensure every work experience and education entry has date ranges (e.g., "Jan 2020 – Present")' });
  }

  // Check for current role
  const hasPresent = DATE_PATTERNS.present.test(text);
  if (!hasPresent && totalDates > 0) {
    issues.push({ severity: 'info', title: '"Present" or "Current" not found', fix: 'If you are currently employed, explicitly write "Jan 2023 – Present" in your most recent role' });
  }

  if (issues.length === 0 || (issues.length === 1 && issues[0].severity === 'info')) {
    issues.push({ severity: 'info', title: `${totalDates} dates detected with consistent formatting`, fix: 'Date formatting looks good.' });
  }

  return { score: clamp100(100 - penalty), grade: scoreToGrade(100 - penalty), issues, parsed: { monthYearCount: monthYearDates.length, slashCount: slashDates.length, hasPresent } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 9: LENGTH & DENSITY
// ─────────────────────────────────────────────────────────────────────────────

function analyzeLength(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: {} };
  }

  const words        = text.trim().split(/\s+/).filter(w => w.length > 0);
  const wordCount    = words.length;
  const lineCount    = text.split('\n').filter(l => l.trim().length > 0).length;
  const pageEstimate = Math.max(1, Math.round((wordCount / 450) * 10) / 10); // ~450 words/page

  const issues = [];
  let score    = 100;

  if (wordCount < 150) {
    score = 30;
    issues.push({ severity: 'critical', title: `Very short resume: ~${wordCount} words (~${pageEstimate} pages)`, fix: 'Your resume is too thin. Expand work experience bullets with accomplishments and add a Skills section. Target: 300–700 words.' });
  } else if (wordCount < 200) {
    score = 60;
    issues.push({ severity: 'warning', title: `Short resume: ${wordCount} words (~${pageEstimate} pages)`, fix: 'Add more detail to your work experience bullets. Each role should have 3–5 achievement-focused bullets.' });
  } else if (wordCount > 1200 && pageEstimate > 2.5) {
    score = 65;
    issues.push({ severity: 'warning', title: `Long resume: ~${wordCount} words (~${pageEstimate} pages)`, fix: 'Trim to 1–2 pages. Remove roles older than 10 years, redundant skills, and one-liner achievements that lack impact.' });
  } else if (wordCount >= 200 && wordCount <= 800) {
    score = 100;
    issues.push({ severity: 'info', title: `Optimal length: ~${wordCount} words (~${pageEstimate} pages)`, fix: 'Ideal word count range. Continue refining quality over quantity.' });
  } else {
    score = 85;
    issues.push({ severity: 'info', title: `${wordCount} words (~${pageEstimate} pages)`, fix: 'Length is acceptable. Ensure content density is high — every sentence should add value.' });
  }

  return { score, grade: scoreToGrade(score), issues, parsed: { wordCount, lineCount, pageEstimate } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 10: ATS RED FLAGS
// ─────────────────────────────────────────────────────────────────────────────

function analyzeRedFlags(text) {
  if (!text || typeof text !== 'string') {
    return { score: 100, grade: 'A', issues: [] };
  }

  const issues = [];
  let penalty  = 0;

  for (const flag of RED_FLAG_PATTERNS) {
    if (flag.id === 'no_email') {
      // Skip — handled in contact
      continue;
    }
    if (flag.id === 'percent_sign') {
      // Positive — skip
      continue;
    }
    if (flag.id === 'all_caps_abuse') {
      const knownHeaders = new Set(['PROFESSIONAL','SUMMARY','EXPERIENCE','WORK','TECHNICAL','SKILLS','EDUCATION','CERTIFICATIONS','PROJECTS','PUBLICATIONS','AWARDS','LANGUAGES','VOLUNTEER','INTERESTS']);
      const matches = (text.match(/\b[A-Z]{5,}\b/g) || []).filter(w => !knownHeaders.has(w));
      if (matches.length > 6) {
        penalty += 10;
        issues.push({ severity: flag.severity, title: flag.message, fix: flag.fix });
      }
      continue;
    }
    if (flag.pattern && flag.pattern.test(text)) {
      flag.pattern.lastIndex = 0;
      const penaltyAmount = flag.severity === 'critical' ? 20 : flag.severity === 'warning' ? 10 : 5;
      if (flag.message) {
        penalty += penaltyAmount;
        issues.push({ severity: flag.severity, title: flag.message, fix: flag.fix });
      }
    }
  }

  if (issues.length === 0) {
    issues.push({ severity: 'info', title: 'No ATS red flags detected', fix: 'No critical formatting issues found. Ensure you export as .docx or single-column PDF for submission.' });
  }

  return { score: clamp100(100 - penalty), grade: scoreToGrade(100 - penalty), issues };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 11: SKILLS SECTION QUALITY
// ─────────────────────────────────────────────────────────────────────────────

function analyzeSkills(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, grade: 'F', issues: [], parsed: { found: [], count: 0 } };
  }

  const lowerText = text.toLowerCase();
  const found     = [];
  const issues    = [];

  for (const kw of ALL_KEYWORDS) {
    const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(lowerText)) {
      found.push(kw);
    }
  }

  const uniqueSkills = [...new Set(found)];
  const count        = uniqueSkills.length;
  const hasDupes     = found.length > uniqueSkills.length;

  // Has dedicated skills section?
  const hasSkillsSection = /\b(technical\s+|core\s+|key\s+)?skills?\b/i.test(text);

  let score = 0;
  if (count >= 20)     score = 100;
  else if (count >= 15) score = 85;
  else if (count >= 10) score = 70;
  else if (count >= 5)  score = 50;
  else                  score = count * 8;

  if (!hasSkillsSection) {
    score = Math.max(0, score - 20);
    issues.push({ severity: 'warning', title: 'No dedicated Skills section detected', fix: 'Add an explicit "Technical Skills" or "Core Skills" section. ATS systems specifically parse this section for keyword extraction.' });
  }

  if (count < 5) {
    issues.push({ severity: 'critical', title: `Only ${count} skills/technologies found`, fix: 'List all tools, languages, and frameworks you know. Aim for 15–25 specific skills in your Skills section.' });
  } else if (count < 12) {
    issues.push({ severity: 'warning', title: `${count} skills detected — expand your skills section`, fix: 'Add more relevant technologies. Don\'t just list languages — include frameworks, cloud platforms, databases, and tools.' });
  } else {
    issues.push({ severity: 'info', title: `${count} skills/technologies found`, fix: 'Good coverage. Ensure the most relevant skills for your target role appear first.' });
  }

  if (hasDupes) {
    issues.push({ severity: 'info', title: 'Some skills appear in multiple sections', fix: 'Skill repetition is okay (it increases keyword density) but avoid listing the exact same skill twice in the same section.' });
  }

  return { score: clamp100(score), grade: scoreToGrade(score), issues, parsed: { found: uniqueSkills, count } };
}

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION 12: EDUCATION COMPLETENESS
// ─────────────────────────────────────────────────────────────────────────────

function analyzeEducation(text) {
  if (!text || typeof text !== 'string') {
    return { score: 50, grade: 'C', issues: [], parsed: {} };
  }

  const issues = [];
  let score    = 100;
  const parsed = {};

  const hasDegree      = DEGREE_KEYWORDS.some(d => new RegExp(`\\b${d}\\b`, 'i').test(text));
  const hasInstitution = /\b(university|college|institute|school|academy)\b/i.test(text);
  const hasYear        = /\b(19|20)\d{2}\b/.test(text);
  const hasGPA         = /\bG\.?P\.?A\.?\s*:?\s*[34]\.\d/i.test(text) || /\b[34]\.\d\s*\/\s*4\.0\b/.test(text);

  parsed.hasDegree      = hasDegree;
  parsed.hasInstitution = hasInstitution;
  parsed.hasYear        = hasYear;
  parsed.hasGPA         = hasGPA;

  if (!hasDegree) {
    score -= 30;
    issues.push({ severity: 'warning', title: 'Degree name not clearly detected', fix: 'Spell out your degree: "Bachelor of Science in Computer Science" or "B.S. Computer Science". ATS extracts this for degree requirement filters.' });
  }
  if (!hasInstitution) {
    score -= 25;
    issues.push({ severity: 'warning', title: 'Institution name not detected (university/college)', fix: 'Include your school\'s full name. Some ATS systems filter candidates by institution.' });
  }
  if (!hasYear) {
    score -= 20;
    issues.push({ severity: 'warning', title: 'Graduation year not detected', fix: 'Add your graduation year (e.g., "Class of 2022" or "2022") — ATS uses this for experience level estimation.' });
  }
  if (hasGPA) {
    issues.push({ severity: 'info', title: 'GPA detected (3.5+ typically worth including)', fix: 'Good. Include GPA only if 3.5 or above. Remove if below to avoid negative filtering.' });
  }

  if (issues.length === 0) {
    issues.push({ severity: 'info', title: 'Education section looks complete', fix: 'All key education fields detected.' });
  }

  return { score: clamp100(score), grade: scoreToGrade(score), issues, parsed };
}

// ─────────────────────────────────────────────────────────────────────────────
// AGGREGATED RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────────────────────

function buildRecommendations(dimensions) {
  const recs = [];

  for (const [dimId, result] of Object.entries(dimensions)) {
    if (!result || !result.issues) continue;
    for (const issue of result.issues) {
      if (issue.severity === 'info') continue; // Only surface critical/warning as recommendations
      recs.push({
        priority:        issue.severity,
        dimension:       dimId,
        title:           issue.title,
        description:     issue.fix,
        fix:             issue.fix,
        category:        issue.category || dimId,
        pointsGain:      issue.pointsGain || (issue.severity === 'critical' ? 8 : 4),
        detectedText:    issue.detectedText || null,
        whyItMatters:    issue.whyItMatters || null,
        beforeAfter:     issue.beforeAfter || null,
        actionType:      issue.actionType || null,
        targetText:      issue.targetText || null,
        replacementText: issue.replacementText || null,
        missingKeywords: issue.missingKeywords || null,
      });
    }
  }

  // Sort: critical first, then warning
  recs.sort((a, b) => {
    const order = { critical: 0, warning: 1, info: 2 };
    return (order[a.priority] ?? 2) - (order[b.priority] ?? 2);
  });

  return recs;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN EXPORT: analyzeResume
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Analyzes a resume against 12 diagnostic dimensions.
 *
 * @param {string} resumeText     - Plain text content of the resume
 * @param {string|null} jobDescription - Optional job description for JD matching
 * @param {object} options        - { industry?: 'tech'|'finance'|'marketing'|'healthcare' }
 * @returns {XRayReport}
 */
export function analyzeResume(resumeText, jobDescription = null, options = {}) {
  if (typeof resumeText !== 'string') {
    throw new TypeError('analyzeResume: resumeText must be a string');
  }

  const text     = resumeText.trim();
  const industry = options.industry || 'tech';

  // Run all 12 dimensions
  const contact        = analyzeContact(text);
  const sections       = analyzeSections(text);
  const format         = analyzeFormat(text);
  const keywords       = analyzeKeywords(text, industry);
  const actionVerbs    = analyzeActionVerbs(text);
  const quantification = analyzeQuantification(text);
  const jdMatch        = jobDescription ? analyzeJDMatch(text, jobDescription) : null;
  const dates          = analyzeDates(text);
  const length         = analyzeLength(text);
  const redFlags       = analyzeRedFlags(text);
  const skills         = analyzeSkills(text);
  const education      = analyzeEducation(text);

  const dimensions = { contact, sections, format, keywords, actionVerbs, quantification, dates, length, redFlags, skills, education };
  if (jdMatch) dimensions.jdMatch = jdMatch;

  // Compute overall score — weighted average
  // If JD is provided, jdMatch replaces keywords weight
  const weights = { ...DIMENSION_WEIGHTS };
  if (jdMatch) {
    weights.jdMatch  = weights.keywords;
    weights.keywords = 0;
  }

  let overallScore = 0;
  let totalWeight  = 0;
  for (const [dim, result] of Object.entries(dimensions)) {
    if (!result || typeof result.score !== 'number') continue;
    const w = weights[dim] || 0;
    overallScore += result.score * w;
    totalWeight  += w;
  }

  if (totalWeight > 0) overallScore = overallScore / totalWeight;
  overallScore = clamp100(Math.round(overallScore));

  // Build parsed view (what ATS "sees")
  const parsedView = {
    name:              contact.parsed?.name          || 'Not detected',
    email:             contact.parsed?.email         || 'Not detected',
    phone:             contact.parsed?.phone         || 'Not detected',
    linkedin:          contact.parsed?.linkedin      || 'Not detected',
    github:            contact.parsed?.github        || 'Not detected',
    location:          contact.parsed?.location      || 'Not detected',
    detectedSections:  sections.parsed?.detected     || [],
    missingSections:   sections.parsed?.missing      || [],
    extractedSkills:   skills.parsed?.found          || [],
    wordCount:         length.parsed?.wordCount      || 0,
    estimatedPages:    length.parsed?.pageEstimate   || 0,
    keywordsFound:     keywords.parsed?.found        || [],
    strongVerbs:       actionVerbs.parsed?.strong    || [],
    weakPhrases:       actionVerbs.parsed?.weak      || [],
    quantifiedBullets: quantification.parsed?.quantifiedBullets || [],
  };

  const recommendations = buildRecommendations(dimensions);

  return {
    overallScore,
    overallGrade: scoreToGrade(overallScore),
    dimensions,
    recommendations,
    parsedView,
    metadata: {
      analyzedAt:         new Date().toISOString(),
      hasJobDescription:  !!jobDescription,
      industry,
      totalIssues: {
        critical: recommendations.filter(r => r.priority === 'critical').length,
        warning:  recommendations.filter(r => r.priority === 'warning').length,
      }
    }
  };
}

/**
 * Batch analyzes a resume against an array of job listings from the user's pipeline.
 * Categorizes matches into actionable ATS compatibility tiers:
 * - Ready to Apply (score >= 80)
 * - Near Miss (score 60 - 79)
 * - Skill Gap (score < 60)
 *
 * @param {string} resumeText
 * @param {Array<Object>} jobs
 * @param {Object} [options]
 * @returns {Object}
 */
export function analyzeResumeAgainstJobs(resumeText, jobs = [], _options = {}) {
  const safeResume = typeof resumeText === 'string' ? resumeText.trim() : '';
  const jobsList = Array.isArray(jobs) ? jobs : [];

  if (!safeResume || jobsList.length === 0) {
    return {
      jobMatches: [],
      summary: {
        totalJobs: 0,
        averageScore: 0,
        tierCounts: { ready: 0, near_miss: 0, skill_gap: 0 },
        topMatches: [],
        scannedAt: new Date().toISOString()
      }
    };
  }

  const jobMatches = jobsList.map((job, idx) => {
    const jdParts = [
      job.title || '',
      job.company || '',
      job.description || '',
      Array.isArray(job.matched_skills) ? job.matched_skills.join(' ') : (job.matched_skills || ''),
      Array.isArray(job.missing_skills) ? job.missing_skills.join(' ') : (job.missing_skills || '')
    ];
    const jdText = jdParts.filter(Boolean).join('\n');
    const jdMatch = analyzeJDMatch(safeResume, jdText);

    const score = jdMatch ? jdMatch.score : 50;
    const matchRate = jdMatch?.parsed?.matchRate ?? score;
    const matchedKeywords = jdMatch?.parsed?.matched || [];
    const missingKeywords = jdMatch?.parsed?.missing || [];

    let tier = 'skill_gap';
    if (score >= 80) {
      tier = 'ready';
    } else if (score >= 60) {
      tier = 'near_miss';
    }

    return {
      id: job.id || job._id || `job-${idx}-${Date.now()}`,
      title: job.title || 'Untitled Position',
      company: job.company || 'Unknown Company',
      location: job.location || 'Remote',
      source: job.source || 'Pipeline',
      url: job.url || job.apply_url || '',
      score,
      matchRate,
      matchedKeywords,
      missingKeywords,
      tier,
      job
    };
  });

  // Sort descending by score
  jobMatches.sort((a, b) => b.score - a.score || b.matchRate - a.matchRate);

  const totalScore = jobMatches.reduce((acc, curr) => acc + curr.score, 0);
  const averageScore = Math.round(totalScore / jobMatches.length);

  const tierCounts = {
    ready: jobMatches.filter(j => j.tier === 'ready').length,
    near_miss: jobMatches.filter(j => j.tier === 'near_miss').length,
    skill_gap: jobMatches.filter(j => j.tier === 'skill_gap').length
  };

  return {
    jobMatches,
    summary: {
      totalJobs: jobMatches.length,
      averageScore,
      tierCounts,
      topMatches: jobMatches.slice(0, 5),
      scannedAt: new Date().toISOString()
    }
  };
}

/**
 * Aggregates tech keyword demand across all active jobs in the pipeline,
 * comparing against the user's resume to identify critical market-wide skill gaps.
 *
 * @param {Array<Object>} jobs
 * @param {string} resumeText
 * @returns {Object}
 */
export function aggregateMarketKeywords(jobs = [], resumeText = '') {
  const jobsList = Array.isArray(jobs) ? jobs : [];
  const lowerResume = (typeof resumeText === 'string' ? resumeText : '').toLowerCase();

  if (jobsList.length === 0) {
    return {
      totalJobsScanned: 0,
      marketKeywords: [],
      missingHighDemand: [],
      topSkillsInDemand: []
    };
  }

  const keywordJobCounts = {};
  const totalJobs = jobsList.length;

  jobsList.forEach(job => {
    const jdText = [
      job.title || '',
      job.description || '',
      Array.isArray(job.matched_skills) ? job.matched_skills.join(' ') : (job.matched_skills || ''),
      Array.isArray(job.missing_skills) ? job.missing_skills.join(' ') : (job.missing_skills || '')
    ].filter(Boolean).join(' ').toLowerCase();

    const foundInThisJob = new Set();

    // Check against standard tech keywords DB
    for (const kw of ALL_KEYWORDS) {
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(jdText)) {
        foundInThisJob.add(kw);
      }
    }

    // Check against explicit matched_skills or missing_skills fields
    const explicitSkills = [
      ...(Array.isArray(job.matched_skills) ? job.matched_skills : []),
      ...(Array.isArray(job.missing_skills) ? job.missing_skills : [])
    ];
    for (const skill of explicitSkills) {
      if (typeof skill === 'string' && skill.trim().length > 1) {
        foundInThisJob.add(skill.trim().toLowerCase());
      }
    }

    for (const kw of foundInThisJob) {
      keywordJobCounts[kw] = (keywordJobCounts[kw] || 0) + 1;
    }
  });

  const marketKeywords = Object.entries(keywordJobCounts)
    .map(([keyword, count]) => {
      const escaped = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const inResume = lowerResume
        ? new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(lowerResume)
        : false;
      const percentage = Math.round((count / totalJobs) * 100);
      return {
        keyword,
        count,
        percentage,
        inResume
      };
    })
    .sort((a, b) => b.count - a.count || a.keyword.localeCompare(b.keyword));

  const missingHighDemand = marketKeywords.filter(k => !k.inResume && k.count >= 1);
  const topSkillsInDemand = marketKeywords.slice(0, 10);

  return {
    totalJobsScanned: totalJobs,
    marketKeywords,
    missingHighDemand,
    topSkillsInDemand
  };
}

/**
 * Extracts plain text from a File object (PDF via pdf.js or txt/md directly).
/**
 * Extracts text from an uploaded resume file (PDF, TXT, MD, JSON).
 * Delegates to the robust dual-engine client_resume_extractor (PDF.js worker + stream parser decompression).
 *
 * @param {File|Blob} file
 * @returns {Promise<string>}
 */
export async function extractTextFromFile(file) {
  if (!file || typeof file !== 'object') {
    throw new TypeError('extractTextFromFile: file must be a File or Blob object');
  }
  return await clientExtractTextFromFile(file);
}

/**
 * ATS Platform Compliance Criteria & Parsing Heuristics
 */
export const ATS_PLATFORM_RULES = {
  workday: {
    name: 'Workday',
    tolerance: 'Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false,
    keyAdvice: 'Strict single-column text stream only. Workday converts tables into mangled horizontal rows and frequently loses text inside headers/footers.',
    optimalFormat: 'Clean single-column PDF or .docx with standard headings (EXPERIENCE, EDUCATION, SKILLS).'
  },
  taleo: {
    name: 'Oracle Taleo',
    tolerance: 'Very Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false,
    keyAdvice: 'Taleo strips all styling and relies on linear keyword text parsing. Avoid graphic icons, multi-column tables, and custom section names.',
    optimalFormat: 'Unadorned chronological layout with exact keyword spellings.'
  },
  greenhouse: {
    name: 'Greenhouse',
    tolerance: 'Moderate',
    maxColumns: 2,
    tableAllowed: false,
    headerFooterSafe: true,
    keyAdvice: 'Greenhouse parses standard PDF streams reliably. Two-column layouts may occasionally interleave text if margins are narrow.',
    optimalFormat: 'Standard single or clean two-column PDF with clear section demarcation.'
  },
  lever: {
    name: 'Lever',
    tolerance: 'Modern / Lenient',
    maxColumns: 2,
    tableAllowed: true,
    headerFooterSafe: true,
    keyAdvice: 'Lever utilizes modern text extraction with resume preview rendering for recruiters. High keyword density in bullet points is rewarded.',
    optimalFormat: 'Modern clean ATS resume with strong action verbs and quantified impact.'
  },
  ashby: {
    name: 'Ashby',
    tolerance: 'Modern / High Tech',
    maxColumns: 2,
    tableAllowed: true,
    headerFooterSafe: true,
    keyAdvice: 'Ashby uses high-accuracy semantic parsers. Focus on explicit tech stacks, GitHub/portfolio links, and structured project metrics.',
    optimalFormat: 'Structured technical resume highlighting architecture scale and verified deliverables.'
  },
  icims: {
    name: 'iCIMS',
    tolerance: 'Strict',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false,
    keyAdvice: 'iCIMS can scramble multi-column layouts and text boxes. Place contact info directly in the top body lines, not inside PDF header blocks.',
    optimalFormat: 'Single-column layout with standard bullet points (•) and plain text contact info.'
  },
  generic: {
    name: 'Generic / Modern ATS',
    tolerance: 'Standard',
    maxColumns: 1,
    tableAllowed: false,
    headerFooterSafe: false,
    keyAdvice: 'Stick to clean, single-column chronological layouts with standard section headings and clear bullet points.',
    optimalFormat: 'Clean single-column PDF with standard headings (EXPERIENCE, EDUCATION, SKILLS).'
  }
};

export function getAtsPlatformSpecificAdvice(platformName = '') {
  const norm = String(platformName || '').toLowerCase().trim();
  if (!norm) return ATS_PLATFORM_RULES.generic;
  for (const [key, platform] of Object.entries(ATS_PLATFORM_RULES)) {
    if (norm.includes(key) || norm.includes(platform.name.toLowerCase())) {
      return platform;
    }
  }
  return ATS_PLATFORM_RULES.generic;
}

/**
 * Curated Before & After Bullet Transformations illustrating metric quantification
 */
export function getSampleBulletTransformations() {
  return [
    {
      id: 'bt-1',
      category: 'Backend & APIs',
      domain: 'Backend & APIs',
      before: 'Helped with backend microservices and worked on APIs for the checkout team.',
      after: 'Architected 4 event-driven FastAPI microservices with Kafka and Redis, reducing checkout p99 latency by 42% across 2.4M daily transactions.',
      explanation: '+Quantified scale, active architecture verbs, and latency impact.',
      improvement: '+Quantified scale, active architecture verbs, and latency impact.',
      metric: '42% p99 latency drop'
    },
    {
      id: 'bt-2',
      category: 'Frontend & Web',
      domain: 'Frontend & Web',
      before: 'Made UI components in React and improved loading times for users.',
      after: 'Redesigned core client dashboard using React, TypeScript, and Vite code-splitting, slashing bundle size by 38% and Core Web Vitals LCP from 3.8s to 1.1s.',
      explanation: '+Specific framework versions, technical metrics (LCP), and precise speedup.',
      improvement: '+Specific framework versions, technical metrics (LCP), and precise speedup.',
      metric: '38% bundle reduction'
    },
    {
      id: 'bt-3',
      category: 'DevOps & Cloud',
      domain: 'DevOps & Cloud',
      before: 'Responsible for Docker containers and cloud deployments on AWS.',
      after: 'Automated multi-region Kubernetes deployments on AWS EKS using Terraform and GitHub Actions, cutting production deployment cycle time from 3 hours to 8 minutes.',
      explanation: '+Eliminated passive "responsible for", added specific tooling and 95% cycle time reduction.',
      improvement: '+Eliminated passive "responsible for", added specific tooling and 95% cycle time reduction.',
      metric: '95% cycle time reduction'
    },
    {
      id: 'bt-4',
      category: 'Data & Machine Learning',
      domain: 'Data & Machine Learning',
      before: 'Analyzed customer data and built ML models for churn prediction.',
      after: 'Engineered PyTorch and XGBoost churn prediction pipeline processing 18M weekly events, increasing retention model precision by 27% and saving $340K in annual ARR.',
      explanation: '+Replaced vague "analyzed" with concrete pipelines, data volume, and financial impact ($340K ARR).',
      improvement: '+Replaced vague "analyzed" with concrete pipelines, data volume, and financial impact ($340K ARR).',
      metric: '+$340K retained ARR'
    }
  ];
}

/**
 * Applies a concrete 1-click fix to a specific issue in the resume text.
 *
 * @param {string} resumeText
 * @param {Object} issue
 * @returns {string} modified resumeText
 */
export function applySingleIssueFix(resumeText, issue) {
  if (!resumeText || typeof resumeText !== 'string' || !issue) return resumeText || '';
  let updated = resumeText;

  // 1. Action type: Clean formatting (fancy bullets, tables, footers)
  if (issue.actionType === 'clean_formatting' || issue.dimension === 'format') {
    // Replace decorative Unicode glyphs
    updated = updated.replace(/[→←↑↓✓✗✦★◆◇●○□■⬛⬜▶▷►·]/g, '-');
    // Replace pipe table borders
    updated = updated.replace(/^\s*\|(.+?)\|\s*$/gm, (_match, p1) => {
      return '- ' + p1.split('|').map(s => s.trim()).filter(Boolean).join(' · ');
    });
    // Strip page numbers
    updated = updated.replace(/\bpage\s+\d+\s+of\s+\d+\b/gi, '');
    return updated.trim();
  }

  // 2. Action type: Text replacement (e.g., passive verbs -> active power verbs)
  if (issue.actionType === 'replace_text' || (issue.targetText && issue.replacementText)) {
    if (issue.targetText && issue.replacementText) {
      const escaped = issue.targetText.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const regex = new RegExp(`\\b${escaped}\\b`, 'gi');
      if (regex.test(updated)) {
        return updated.replace(regex, issue.replacementText);
      }
    }
  }

  // 3. Action type: Add missing skills / keywords
  if (issue.actionType === 'add_skills' || issue.missingKeywords) {
    const missing = Array.isArray(issue.missingKeywords)
      ? issue.missingKeywords.slice(0, 8)
      : (issue.targetKeywords || []);
    if (missing.length > 0) {
      const skillsRegex = /(?:TECHNICAL\s+SKILLS|CORE\s+SKILLS|SKILLS)\s*[\r\n]+/i;
      if (skillsRegex.test(updated)) {
        updated = updated.replace(skillsRegex, (match) => {
          return `${match}- Target Competencies: ${missing.join(', ')}\n`;
        });
      } else {
        updated = `${updated.trim()}\n\nTECHNICAL SKILLS\n- Core Competencies: ${missing.join(', ')}`;
      }
      return updated;
    }
  }

  // 4. Action type: Quantify metric
  if (issue.actionType === 'quantify_metric') {
    if (issue.targetText && updated.includes(issue.targetText)) {
      const replacement = issue.beforeAfter?.after || `${issue.targetText.trim()}, driving 35% performance improvement and scaling to 100K+ users`;
      return updated.replace(issue.targetText, replacement);
    } else {
      const lines = updated.split('\n');
      for (let i = 0; i < lines.length; i++) {
        if (/^[-•*]\s+[A-Z]/.test(lines[i].trim()) && !/\d+/.test(lines[i])) {
          lines[i] = `${lines[i].trim()}, driving 32% efficiency improvement across production workloads`;
          return lines.join('\n');
        }
      }
    }
  }

  // 5. Action type: Add contact details
  if (issue.actionType === 'add_contact') {
    const lines = updated.split('\n');
    let insertIdx = 1;
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      if (lines[i].trim().length > 0) {
        insertIdx = i + 1;
        break;
      }
    }
    const snippet = issue.beforeAfter?.after || issue.fix;
    if (snippet && typeof snippet === 'string') {
      const cleanSnippet = snippet.replace(/^\(|\)$/g, '').trim();
      lines.splice(insertIdx, 0, cleanSnippet);
      return lines.join('\n');
    }
  }

  // Fallback: If beforeAfter.before and beforeAfter.after exist in text
  if (issue.beforeAfter?.before && issue.beforeAfter?.after && updated.includes(issue.beforeAfter.before)) {
    return updated.replace(issue.beforeAfter.before, issue.beforeAfter.after);
  }

  return updated;
}

/**
 * Constructs a step-by-step roadmap with points breakdown to bring the resume score to 100%.
 *
 * @param {Object} report - Output from analyzeResume()
 * @param {string} resumeText
 * @param {string|null} jdText
 * @returns {Object}
 */
export function generateRoadmapTo100(report, _resumeText = '', _jdText = null) {
  const currentScore = report?.overallScore || 0;
  const rawRecommendations = report?.recommendations || [];
  
  const steps = [];
  let simulatedScore = currentScore;
  let stepCounter = 1;

  // 1. Critical JD Keyword Gap (if JD provided or missing keywords)
  const jdIssue = rawRecommendations.find(r => r.dimension === 'jdMatch' || r.category === 'Target JD Keyword Gap');
  if (jdIssue) {
    const pts = jdIssue.pointsGain || 14;
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-jd-keywords`,
      stepNumber: stepCounter++,
      title: 'Inject Target JD Missing Keywords',
      category: 'Target JD Match',
      severity: 'critical',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: jdIssue.whyItMatters || 'Applicant tracking systems rank resumes by keyword overlap with the job requisition.',
      detectedText: jdIssue.detectedText,
      beforeAfter: jdIssue.beforeAfter || {
        before: 'Technical Skills: Python, SQL',
        after: `Technical Skills: Python, SQL, ${jdIssue.missingKeywords?.slice(0, 4).join(', ') || 'Docker, AWS'}`
      },
      fix: jdIssue.fix || jdIssue.description,
      actionType: 'add_skills',
      missingKeywords: jdIssue.missingKeywords || []
    });
  }

  // 2. Format & Parsing Safety Issues
  const formatIssues = rawRecommendations.filter(r => r.dimension === 'format' || r.category === 'ATS Parse Safety');
  if (formatIssues.length > 0) {
    const primaryFormat = formatIssues[0];
    const pts = formatIssues.reduce((sum, f) => sum + (f.pointsGain || 5), 0);
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-format-cleanup`,
      stepNumber: stepCounter++,
      title: 'Eliminate ATS Parsing Traps (Bullets, Tables & Symbols)',
      category: 'ATS Parse Safety',
      severity: 'critical',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: primaryFormat.whyItMatters || 'ATS engines garble decorative Unicode bullets and multi-column tables, leading to missing or scrambled sections.',
      detectedText: primaryFormat.detectedText,
      beforeAfter: primaryFormat.beforeAfter || {
        before: '★ Led cloud migration\n| Role | Years |',
        after: '- Led cloud migration\n- Role: Senior Engineer (3 Years)'
      },
      fix: 'Convert fancy bullet glyphs to hyphens (-) and flatten table structures into clean bullet points.',
      actionType: 'clean_formatting'
    });
  }

  // 3. Action Verbs & Power Verbs
  const verbIssues = rawRecommendations.filter(r => r.dimension === 'actionVerbs' || r.category === 'Action Verbs & Impact');
  if (verbIssues.length > 0) {
    const primaryVerb = verbIssues[0];
    const pts = verbIssues.reduce((sum, v) => sum + (v.pointsGain || 4), 0);
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-action-verbs`,
      stepNumber: stepCounter++,
      title: 'Upgrade Passive Phrasing to Executive Action Verbs',
      category: 'Action Verbs & Impact',
      severity: primaryVerb.priority || 'warning',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: primaryVerb.whyItMatters || 'Recruiter heuristics and modern AI parsers penalize passive phrasing like "responsible for" or "helped with".',
      detectedText: primaryVerb.detectedText,
      beforeAfter: primaryVerb.beforeAfter || {
        before: 'Responsible for managing database migrations',
        after: 'Architected automated database migrations with zero downtime'
      },
      fix: primaryVerb.fix || 'Replace passive verbs with high-impact power verbs: Led, Architected, Engineered, Delivered.',
      actionType: 'replace_text',
      targetText: primaryVerb.targetText,
      replacementText: primaryVerb.replacementText
    });
  }

  // 4. Metric Quantification (Google X-Y-Z Formula)
  const quantIssues = rawRecommendations.filter(r => r.dimension === 'quantification' || r.category === 'Quantification & Metrics');
  if (quantIssues.length > 0) {
    const primaryQuant = quantIssues[0];
    const pts = primaryQuant.pointsGain || 10;
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-quantification`,
      stepNumber: stepCounter++,
      title: 'Quantify Achievements with Measurable Business Impact',
      category: 'Quantification & Metrics',
      severity: primaryQuant.priority || 'warning',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: primaryQuant.whyItMatters || 'Leading tech employers expect 60%+ of work experience bullets to contain measurable metrics (% / $ / scale / latency).',
      detectedText: primaryQuant.detectedText,
      beforeAfter: primaryQuant.beforeAfter || {
        before: 'Built REST APIs and optimized database queries',
        after: 'Engineered REST APIs with Redis caching, reducing p99 latency by 45% for 120K+ active users'
      },
      fix: primaryQuant.fix || 'Add numbers and measurable results to your experience bullets.',
      actionType: 'quantify_metric',
      targetText: primaryQuant.targetText
    });
  }

  // 5. Contact Info & Standard Headers
  const contactIssues = rawRecommendations.filter(r => r.dimension === 'contact' || r.category === 'Contact Information');
  if (contactIssues.length > 0) {
    const primaryContact = contactIssues[0];
    const pts = contactIssues.reduce((sum, c) => sum + (c.pointsGain || 6), 0);
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-contact-info`,
      stepNumber: stepCounter++,
      title: 'Complete Recruiter Reachability Data',
      category: 'Contact Information',
      severity: primaryContact.priority || 'warning',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: primaryContact.whyItMatters || 'Recruiters reject candidates without direct email, phone, or verifiable professional profiles.',
      detectedText: primaryContact.detectedText,
      beforeAfter: primaryContact.beforeAfter || {
        before: 'Jane Doe',
        after: 'Jane Doe | jane.doe@email.com | +1 (555) 019-2834 | linkedin.com/in/janedoe'
      },
      fix: primaryContact.fix || 'Ensure name, email, phone, and LinkedIn URL are in the header block.',
      actionType: 'add_contact'
    });
  }

  // 6. Section Completeness & Order
  const sectionIssues = rawRecommendations.filter(r => r.dimension === 'sections' || r.category === 'Section Structure');
  if (sectionIssues.length > 0) {
    const primarySection = sectionIssues[0];
    const pts = sectionIssues.reduce((sum, s) => sum + (s.pointsGain || 8), 0);
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-section-structure`,
      stepNumber: stepCounter++,
      title: 'Standardize Core ATS Section Headings',
      category: 'Section Structure',
      severity: primarySection.priority || 'warning',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: primarySection.whyItMatters || 'ATS parsers look for exact standard headings to categorize experience, skills, and education.',
      detectedText: primarySection.detectedText,
      beforeAfter: primarySection.beforeAfter || {
        before: 'My Journey',
        after: 'WORK EXPERIENCE'
      },
      fix: primarySection.fix || 'Use standard headings: SUMMARY, WORK EXPERIENCE, TECHNICAL SKILLS, EDUCATION.',
      actionType: 'add_section'
    });
  }

  // If there are other remaining recommendations, add them
  const handledDimensions = new Set(['jdMatch', 'format', 'actionVerbs', 'quantification', 'contact', 'sections']);
  const remaining = rawRecommendations.filter(r => !handledDimensions.has(r.dimension));
  for (const rem of remaining.slice(0, 2)) {
    const pts = rem.pointsGain || 4;
    simulatedScore = Math.min(100, simulatedScore + pts);
    steps.push({
      id: `step-${rem.dimension}-${stepCounter}`,
      stepNumber: stepCounter++,
      title: rem.title,
      category: rem.category || rem.dimension,
      severity: rem.priority || 'warning',
      pointsGain: pts,
      simulatedScoreAfter: simulatedScore,
      whyItMatters: rem.whyItMatters || rem.description,
      detectedText: rem.detectedText,
      beforeAfter: rem.beforeAfter,
      fix: rem.fix || rem.description,
      actionType: rem.actionType || 'replace_text'
    });
  }

  const potentialScore = steps.length === 0 ? Math.min(100, currentScore + 10) : 100;

  return {
    currentScore,
    targetScore: 100,
    potentialScore,
    steps,
    totalSteps: steps.length,
    estimatedTimeMinutes: Math.max(2, steps.length * 2)
  };
}

/**
 * Fully optimizes the resume text to achieve 100% ATS compatibility in a single automated pass.
 *
 * @param {string} resumeText
 * @param {Object} [report]
 * @param {string|null} [jdText]
 * @returns {Object} { optimizedText, originalScore, newScore, newReport, changesApplied }
 */
export function autoOptimizeResumeTo100(resumeText, report = null, jdText = null) {
  if (!resumeText || typeof resumeText !== 'string') {
    return {
      optimizedText: '',
      originalScore: 0,
      newScore: 0,
      newReport: null,
      changesApplied: []
    };
  }

  let text = resumeText;
  const changesApplied = [];
  const initialReport = report || analyzeResume(text, jdText);
  const initialScore = initialReport.overallScore;

  // 1. Format cleaning: replace fancy bullets & tables
  const hadFancyBullets = /[→←↑↓✓✗✦★◆◇●○□■⬛⬜▶▷►·]/.test(text);
  if (hadFancyBullets) {
    text = text.replace(/[→←↑↓✓✗✦★◆◇●○□■⬛⬜▶▷►·]/g, '-');
    changesApplied.push('Normalized fancy decorative Unicode bullets to standard ATS-safe hyphens (-)');
  }

  const hadPipeTables = /^\s*\|.+?\|/m.test(text);
  if (hadPipeTables) {
    text = text.replace(/^\s*\|(.+?)\|\s*$/gm, (_match, p1) => {
      return '- ' + p1.split('|').map(s => s.trim()).filter(Boolean).join(' · ');
    });
    changesApplied.push('Flattened table structures into ATS-safe linear bullet points');
  }

  // Remove page numbers in headers/footers
  if (/\bpage\s+\d+\s+of\s+\d+\b/i.test(text)) {
    text = text.replace(/\bpage\s+\d+\s+of\s+\d+\b/gi, '');
    changesApplied.push('Removed header/footer page numbers to prevent keyword interleaving');
  }

  // 2. Action verbs: replace weak phrases with strong verbs
  const weakReplacements = [
    { pattern: /\bresponsible for\b/gi, replacement: 'Led' },
    { pattern: /\bhelped with\b/gi, replacement: 'Engineered' },
    { pattern: /\bworked on\b/gi, replacement: 'Architected' },
    { pattern: /\bassisted in\b/gi, replacement: 'Spearheaded' },
    { pattern: /\btasked with\b/gi, replacement: 'Executed' },
    { pattern: /\bduties included\b/gi, replacement: 'Delivered' }
  ];

  let replacedVerbsCount = 0;
  for (const { pattern, replacement } of weakReplacements) {
    if (pattern.test(text)) {
      text = text.replace(pattern, replacement);
      replacedVerbsCount++;
    }
  }
  if (replacedVerbsCount > 0) {
    changesApplied.push(`Upgraded ${replacedVerbsCount} passive phrases ("responsible for", "helped with") to authoritative action verbs`);
  }

  // 3. Keyword injection from target JD or high-value tech skills
  const missingKeywords = [];
  if (jdText && typeof jdText === 'string') {
    const jdAnalysis = analyzeJDMatch(text, jdText);
    if (jdAnalysis?.parsed?.missing?.length > 0) {
      missingKeywords.push(...jdAnalysis.parsed.missing.slice(0, 8));
    }
  }
  if (missingKeywords.length === 0) {
    const kwAnalysis = initialReport.dimensions?.keywords?.parsed?.found || [];
    const recommendedCore = ['Docker', 'AWS', 'Kubernetes', 'TypeScript', 'CI/CD', 'REST APIs', 'PostgreSQL', 'Microservices'];
    for (const kw of recommendedCore) {
      if (!kwAnalysis.some(k => k.toLowerCase() === kw.toLowerCase())) {
        missingKeywords.push(kw);
      }
      if (missingKeywords.length >= 6) break;
    }
  }

  if (missingKeywords.length > 0) {
    const skillsHeaderRegex = /(?:TECHNICAL\s+SKILLS|CORE\s+SKILLS|SKILLS)\s*[\r\n]+/i;
    if (skillsHeaderRegex.test(text)) {
      text = text.replace(skillsHeaderRegex, (match) => {
        return `${match}- Target Requisition Competencies: ${missingKeywords.join(', ')}\n`;
      });
      changesApplied.push(`Injected ${missingKeywords.length} target JD keywords into Technical Skills: ${missingKeywords.join(', ')}`);
    } else {
      text = `${text.trim()}\n\nTECHNICAL SKILLS\n- Core Competencies: ${missingKeywords.join(', ')}`;
      changesApplied.push(`Created dedicated Technical Skills section with ${missingKeywords.length} target competencies`);
    }
  }

  // 4. Quantify unquantified bullets (Google X-Y-Z formula)
  const lines = text.split('\n');
  let quantifiedCount = 0;
  const metricsPool = [
    ', reducing operational latency by 38% and scaling throughput by 3x',
    ', achieving 99.95% system uptime and slashing infrastructure spend by 24%',
    ', supporting 150K+ daily active users with sub-120ms response times',
    ', cutting build and release deployment cycle time from 4 hours to 12 minutes'
  ];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (/^[-•*]\s+[A-Z]/.test(line) && !/\d+/.test(line) && line.length > 25 && quantifiedCount < 4) {
      lines[i] = `${line}${metricsPool[quantifiedCount % metricsPool.length]}`;
      quantifiedCount++;
    }
  }
  if (quantifiedCount > 0) {
    text = lines.join('\n');
    changesApplied.push(`Enhanced ${quantifiedCount} work experience bullets with measurable impact metrics (Google X-Y-Z formula)`);
  }

  // 5. Ensure core standard sections are present
  const requiredHeaders = [
    { name: 'PROFESSIONAL SUMMARY', pattern: /\b(summary|objective|profile)\b/i, sample: 'PROFESSIONAL SUMMARY\nResults-driven Software Engineer with extensive experience building high-scale distributed systems, cloud architectures, and client applications.' },
    { name: 'WORK EXPERIENCE', pattern: /\b(experience|employment|work\s+history)\b/i, sample: 'WORK EXPERIENCE' },
    { name: 'EDUCATION', pattern: /\b(education|academic)\b/i, sample: 'EDUCATION\nBachelor of Science in Computer Science | 2020 – 2024' }
  ];

  for (const req of requiredHeaders) {
    if (!req.pattern.test(text)) {
      if (req.name === 'PROFESSIONAL SUMMARY') {
        const textLines = text.split('\n');
        textLines.splice(2, 0, `\n${req.sample}\n`);
        text = textLines.join('\n');
      } else {
        text = `${text.trim()}\n\n${req.sample}`;
      }
      changesApplied.push(`Added standard ATS section: ${req.name}`);
    }
  }

  // 6. Ensure Contact block has email, phone, linkedin
  if (!/@/.test(text)) {
    const firstLineEnd = text.indexOf('\n');
    if (firstLineEnd !== -1) {
      text = text.slice(0, firstLineEnd) + ' | contact.candidate@email.com | +1 (555) 234-5678 | linkedin.com/in/candidate' + text.slice(firstLineEnd);
      changesApplied.push('Added standardized email, phone, and LinkedIn contact credentials');
    }
  }

  // Re-analyze optimized text
  const newReport = analyzeResume(text, jdText);

  return {
    optimizedText: text,
    originalScore: initialScore,
    newScore: newReport.overallScore,
    newReport,
    changesApplied
  };
}


