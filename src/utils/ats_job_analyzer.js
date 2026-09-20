/**
 * ats_job_analyzer.js
 * ====================
 * Client-side Job Description and Listing Quality & Deduplication Analyzer.
 *
 * Responsibilities:
 * 1. detectJdRedFlags — Scan JD text and posting metadata for burnout risks, informal tone,
 *    missing salary, visa constraints, commission/MLM schemes, unpaid trials, phishing scams, and ghost listings.
 * 2. computeJobHealthScore — Synthesize detected red flags into a 0-100 composite listing health score.
 * 3. computeJobDedupKey — Generate a normalized canonical signature for duplicate suppression.
 *
 * Fully modular and decoupled from browser_ats_scanner.js (201KB) for minimal bundle footprint.
 */

/**
 * Generates a normalized semantic deduplication key for a job listing.
 * Strips common punctuation, casing, and peripheral tokens like (Remote), [Full-Time], etc.
 *
 * @param {object} job
 * @returns {string}
 */
export function computeJobDedupKey(job) {
  if (!job) return '';
  const cleanCompany = String(job.company || '')
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const cleanTitle = String(job.title || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(remote|hybrid|onsite|full-time|part-time|contract)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const loc = String(job.location || '').toLowerCase();
  const isRemote = loc.includes('remote') || !!job.is_remote;
  const locToken = isRemote ? 'remote' : loc.replace(/[^a-z0-9]/g, '');

  return `${cleanCompany}:::${cleanTitle}:::${locToken}`;
}

/**
 * Analyzes Job Description text and metadata for candidate red flags:
 * burnout risks, informal tone, missing salary, visa constraints,
 * commission-only/multi-level schemes, and ghost-job probability.
 *
 * @param {string} jdText - The raw or cleaned job description text
 * @param {Object} [jobMeta={}] - Optional metadata such as freshness, posted_at, or daysOld
 * @returns {Array<{label: string, color: string}>} Array of detected red flag badges
 */
export function detectJdRedFlags(jdText = '', jobMeta = {}) {
  const text = (typeof jdText === 'string' ? jdText : String(jdText || '')).toLowerCase();
  const hasMeta = Boolean(jobMeta && (jobMeta.freshness || jobMeta.posted_at || jobMeta.daysOld));
  if (!text.trim() && !hasMeta) return [];
  const flags = [];
  if (/fast.?paced environment/i.test(text)) flags.push({ label: 'Burnout Risk', color: '#f59e0b' });
  if (/wear.{0,10}many hats|multiple hat/i.test(text)) flags.push({ label: 'Under-Resourced', color: '#f59e0b' });
  if (/10\+?\s*years.{0,30}(react|next|kubernetes|docker)/i.test(text)) flags.push({ label: 'Unrealistic Requirements', color: '#ef4444' });
  const hasMetaSalary = !!(
    jobMeta?.salary ||
    jobMeta?.salary_min ||
    jobMeta?.salary_max ||
    jobMeta?.compensation ||
    jobMeta?.comp?.hasSalary ||
    (typeof jobMeta?.extractedSalaryText === 'string' && jobMeta.extractedSalaryText.trim())
  );
  const cleanTextForSalary = text.replace(/401\s*\(?k\)?/gi, '');
  const hasTextSalary = /salary|compensation|\$\d|[€£₹]\d|\b\d+\s*lpa\b|\b\d{2,4}\s*k\b/i.test(cleanTextForSalary);
  if (text.trim() && !hasMetaSalary && !hasTextSalary) flags.push({ label: 'No Salary Listed', color: '#a78bfa' });
  if (/culture fit/i.test(text) && !/diversity|inclusion/i.test(text)) flags.push({ label: 'Vague Culture Filter', color: '#a78bfa' });
  if (/rock\s?star|ninja|wizard|guru/i.test(text)) flags.push({ label: 'Informal Tone', color: '#6b7280' });

  // 7. Visa Restriction / Citizen-Only / Clearance
  if (/(?:no\s+(?:visa\s+)?sponsorship|unable\s+to\s+sponsor|cannot\s+sponsor|no\s+sponsorship\s+available|not\s+offering\s+sponsorship|must\s+be\s+a\s+(?:u\.?s\.?|us)\s+citizen|u\.?s\.?\s+citizenship\s+required|us\s+citizens\s+only|active\s+security\s+clearance\s+required|must\s+possess\s+active\s+(?:secret|top\s+secret)\s+clearance|visa.?only|green\s+card\s+or\s+us\s+citizen\s+only)/i.test(text)) {
    flags.push({ label: 'Visa Restriction', color: '#f97316' });
  }

  // 8. Multi-Level / Commission-Only / Unpaid Risk
  if (/(?:commission\s+only|100%\s+commission|multi-?level|unpaid\s+(?:internship|trial|training)|pay\s+to\s+join|referral\s+fee\s+required|revenue\s+share\s+only|no\s+base\s+salary)/i.test(text)) {
    flags.push({ label: 'Multi-Level / Commission Risk', color: '#ef4444' });
  }

  // 9. Ghost-Job Probability / Evergreen / Talent Pool
  const hasGhostKeywords = /(?:evergreen\s+requisition|talent\s+pool\s+only|future\s+opportunities\s+only|pooling\s+requisition|not\s+actively\s+hiring|pipeline\s+building\s+only|general\s+application\s+pool|expression\s+of\s+interest\s+only)/i.test(text);
  const isGhostByMeta = jobMeta?.freshness?.code === 'GHOST' || 
    (jobMeta?.posted_at && (Date.now() - new Date(jobMeta.posted_at).getTime()) > 90 * 24 * 3600 * 1000) ||
    (typeof jobMeta?.daysOld === 'number' && jobMeta.daysOld > 90);
  if (hasGhostKeywords || isGhostByMeta) {
    flags.push({ label: 'Ghost-Job Probability', color: '#eab308' });
  }

  // 10. Interview Phishing / Recruitment Scam Risk
  if (/(?:contact\s*(?:us\s*)?(?:on|via)\s*telegram|interview\s*(?:on|via)\s*telegram|telegram\s*(?:username|handle|app)\s*[:-]|wire\s+transfer\s+for\s+(?:home\s+)?equipment|check\s+(?:will\s+be\s+sent|deposit)\s+for\s+equipment|purchase\s+(?:your\s+own\s+)?(?:laptop|equipment)\s+and\s+(?:we\s+will\s+)?reimburse|cashier(?:'s)?\s+check|application\s+fee\s+required|pay\s+(?:to\s+)?(?:apply|start|join|train))/i.test(text)) {
    flags.push({ label: 'Interview Phishing / Scam Risk', color: '#ef4444' });
  }

  // 11. Resume Harvesting / Staffing Farm Risk
  if (/(?:confidential\s+client|undisclosed\s+client|resume\s+collection\s+only|general\s+pipeline\s+building|talent\s+community\s+submission|candidate\s+pool\s+building)/i.test(text)) {
    flags.push({ label: 'Resume Harvesting / Staffing Farm', color: '#f59e0b' });
  }

  // 12. Unpaid Trial / Labor Exploitation
  if (/(?:unpaid\s+(?:trial|assessment|project|task|take-?home)|free\s+trial\s+work|production\s+ready\s+(?:app|system)\s+as\s+interview|20\+\s*hours?\s+take-?home)/i.test(text)) {
    flags.push({ label: 'Unpaid Trial / Work Exploitation', color: '#ef4444' });
  }

  // 13. Stale Requisition (>45d) via metadata
  const daysOld = jobMeta?.freshness?.ageDays ?? (jobMeta?.posted_at ? Math.max(0, Math.floor((Date.now() - new Date(jobMeta.posted_at).getTime()) / (1000 * 60 * 60 * 24))) : (typeof jobMeta?.daysOld === 'number' ? jobMeta.daysOld : null));
  if (daysOld !== null && daysOld > 45 && daysOld <= 90) {
    flags.push({ label: 'Stale Requisition (>45d)', color: '#f97316' });
  }

  return flags;
}

/**
 * Converts a red flag array into a 0–100 health score with tier label.
 * 100 = clean, 0 = avoid.
 *
 * @param {Array} flags - Output of detectJdRedFlags()
 * @returns {{ score: number, tier: 'clean'|'caution'|'risky'|'avoid', color: string, bg: string, label: string }}
 */
export function computeJobHealthScore(flags = []) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return { score: 100, tier: 'clean', color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '✓ Clean' };
  }
  const SEVERITY = {
    'Interview Phishing / Scam Risk': 50,
    'Multi-Level / Commission Risk': 40,
    'Unpaid Trial / Work Exploitation': 40,
    'Unrealistic Requirements': 30,
    'Resume Harvesting / Staffing Farm': 30,
    'Ghost-Job Probability': 25,
    'Stale Requisition (>45d)': 20,
    'Visa Restriction': 20,
    'Burnout Risk': 15,
    'Under-Resourced': 15,
    'No Salary Listed': 10,
    'Vague Culture Filter': 10,
    'Informal Tone': 5
  };
  let penalty = 0;
  for (const flag of flags) {
    const flagLabel = typeof flag === 'string' ? flag : flag?.label;
    penalty += SEVERITY[flagLabel] || 10;
  }
  const score = Math.max(0, 100 - penalty);
  let tier = 'clean';
  let color = '#10b981';
  let bg = 'rgba(16,185,129,0.12)';
  let label = '✓ Clean';

  if (score < 50) {
    tier = 'avoid';
    color = '#ef4444';
    bg = 'rgba(239,68,68,0.15)';
    label = '⛔ Avoid';
  } else if (score < 70) {
    tier = 'risky';
    color = '#f59e0b';
    bg = 'rgba(245,158,11,0.15)';
    label = '⚡ Risky';
  } else if (score < 90) {
    tier = 'caution';
    color = '#38bdf8';
    bg = 'rgba(56,189,248,0.15)';
    label = '⚠️ Caution';
  }
  return { score, tier, color, bg, label };
}
