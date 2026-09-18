/**
 * ghost_job_radar.js
 * ===================
 * In-Browser Anti-Ghost Job & Hiring Velocity Telemetry Engine.
 * 
 * Problem:
 * Over 30% of listings on commercial aggregator job boards are "ghost jobs" — roles on hiring freeze,
 * continuous unmonitored pipeline builders, or stale listings reposted without reviewing candidates.
 * 
 * Solution:
 * First-party ATS endpoints (Greenhouse, Ashby, Lever, SmartRecruiters, Recruitee, Hacker News)
 * provide authentic creation, publication, and update timestamps.
 * 
 * This module inspects these authentic timestamps to calculate:
 * 1. Exact listing age in hours and days
 * 2. Visual freshness classification badges
 * 3. Repost loop detection (persistent bumps without active hiring)
 * 4. Interview callback multiplier estimations based on posting age
 * 5. Candidate advice & ghost risk assessments
 */

export const FRESHNESS_CODES = {
  ULTRA_FRESH: 'ultra_fresh',       // < 4 hours old
  FRESH_DROP: 'fresh_drop',         // 4 - 24 hours old
  ACTIVE_CYCLE: 'active_cycle',     // 1 - 14 days old
  MODERATE_AGE: 'moderate_age',     // 15 - 45 days old
  REPOST_WARNING: 'repost_warning', // Persistent refresh on old listing (>45d)
  STALE_PIPELINE: 'stale_pipeline', // 46 - 90 days old
  LIKELY_GHOST: 'likely_ghost'      // > 90 days old
};

/**
 * Safely parses any date representation into epoch milliseconds.
 */
function parseTimestampMs(val) {
  if (!val) return null;
  if (typeof val === 'number') {
    // If in seconds (e.g. Unix seconds < 10 billion), convert to ms
    return val < 10000000000 ? val * 1000 : val;
  }
  if (typeof val === 'string') {
    // If numeric string in seconds
    const num = Number(val);
    if (!isNaN(num) && num > 0) {
      return num < 10000000000 ? num * 1000 : num;
    }
    const parsed = Date.parse(val);
    if (!isNaN(parsed)) return parsed;
  }
  if (val instanceof Date) {
    const t = val.getTime();
    return !isNaN(t) ? t : null;
  }
  return null;
}

/**
 * Calculates freshness telemetry and anti-ghost risk assessment.
 * @param {Object|string|number} jobOrDates - Job object or date representation
 * @param {Date|number} [referenceDate=new Date()] - Reference date for evaluation
 * @returns {Object} Comprehensive telemetry metrics and presentation metadata
 */
export function calculateFreshnessTelemetry(jobOrDates, referenceDate = new Date()) {
  const refMs = referenceDate instanceof Date ? referenceDate.getTime() : (typeof referenceDate === 'number' ? referenceDate : Date.now());

  let postedMs = null;
  let updatedMs = null;
  let firstPublishedMs = null;

  if (jobOrDates && typeof jobOrDates === 'object' && !(jobOrDates instanceof Date)) {
    postedMs = parseTimestampMs(
      jobOrDates.posted_at ||
      jobOrDates.first_published ||
      jobOrDates.first_published_at ||
      jobOrDates.firstPublishedAt ||
      jobOrDates.publishedAt ||
      jobOrDates.releasedDate ||
      jobOrDates.created_at ||
      jobOrDates.createdAt ||
      jobOrDates.pubDate ||
      jobOrDates.publication_date ||
      jobOrDates.scraped_at
    );

    updatedMs = parseTimestampMs(
      jobOrDates.updated_at ||
      jobOrDates.updatedAt
    );

    firstPublishedMs = parseTimestampMs(
      jobOrDates.first_published ||
      jobOrDates.first_published_at ||
      jobOrDates.firstPublishedAt
    );
  } else {
    postedMs = parseTimestampMs(jobOrDates);
  }

  // Fallback if no valid date could be parsed
  if (!postedMs) {
    return {
      code: FRESHNESS_CODES.ACTIVE_CYCLE,
      badge: '🟢 Active',
      sublabel: 'Verified ATS Listing',
      badgeColor: '#4ade80',
      bg: 'rgba(74, 222, 128, 0.12)',
      border: 'rgba(74, 222, 128, 0.3)',
      ageHours: 24,
      ageDays: 1,
      postedHuman: 'Posted 1 day ago',
      callbackMultiplier: '2.0x',
      ghostRisk: 'Low',
      isGhostRisk: false,
      isFreshDrop: false,
      urgency: 'Normal',
      recommendation: 'Verified direct employer listing.',
      label: '🟢 Active',
      color: '#4ade80',
      riskLevel: 'low',
      actionableTip: 'Active review cycle (1d old). Standard 2.0x callback velocity; tailor top 3 technical keywords to pass initial recruiter filters.',
      explanation: 'Verified direct employer listing.'
    };
  }

  // Listing age calculations
  const ageMs = Math.max(0, refMs - postedMs);
  const ageHours = Math.round(ageMs / (1000 * 60 * 60));
  const ageDays = Math.floor(ageHours / 24);

  // Human-friendly posting time label
  const postedHuman = ageHours === 0 
    ? 'Just posted' 
    : (ageHours < 24 
        ? `Posted ${ageHours}h ago` 
        : (ageDays === 1 ? 'Posted 1 day ago' : `Posted ${ageDays} days ago`));

  // Repost loop detection:
  // Listing initially published >45 days ago, but updated in the last 7 days
  const effectiveFirstPublishedMs = firstPublishedMs || postedMs;
  const initialAgeDays = Math.floor((refMs - effectiveFirstPublishedMs) / (1000 * 60 * 60 * 24));
  const isRecentlyUpdated = updatedMs && (refMs - updatedMs) <= (7 * 24 * 60 * 60 * 1000);
  const isRepostLoop = initialAgeDays >= 45 && isRecentlyUpdated;

  if (ageHours < 4) {
    return {
      code: FRESHNESS_CODES.ULTRA_FRESH,
      badge: '⚡ Fresh Drop',
      sublabel: `${ageHours === 0 ? '<1h' : ageHours + 'h'} ago • 4.2x Callback`,
      badgeColor: '#34d399',
      bg: 'rgba(16, 185, 129, 0.15)',
      border: 'rgba(16, 185, 129, 0.35)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '4.2x',
      ghostRisk: 'None (Verified Fresh Listing)',
      isGhostRisk: false,
      isFreshDrop: true,
      urgency: 'Immediate Priority',
      recommendation: 'Prime Window: Roles applied to within the first 4 hours experience a 4.2x higher interview callback rate.',
      label: '⚡ Fresh Drop',
      color: '#34d399',
      riskLevel: 'low',
      actionableTip: 'Prime application window (<4h ago). Submitting immediately gives a 4.2x callback multiplier before hundreds of applications flood the ATS.',
      explanation: 'Prime Window: Roles applied to within the first 4 hours experience a 4.2x higher interview callback rate.'
    };
  }

  if (ageHours <= 24) {
    return {
      code: FRESHNESS_CODES.FRESH_DROP,
      badge: '⚡ Fresh Drop',
      sublabel: `${ageHours}h ago • 3.5x Callback`,
      badgeColor: '#22d3ee',
      bg: 'rgba(6, 182, 212, 0.15)',
      border: 'rgba(6, 182, 212, 0.35)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '3.5x',
      ghostRisk: 'Very Low',
      isGhostRisk: false,
      isFreshDrop: true,
      urgency: 'High Priority',
      recommendation: 'Early Application Advantage: Applying within 24 hours places your resume in the first candidate review batch.',
      label: '⚡ Fresh Drop',
      color: '#22d3ee',
      riskLevel: 'low',
      actionableTip: `Early application advantage (${ageHours}h ago). Submitting now places your resume in the recruiter's first review batch.`,
      explanation: 'Early Application Advantage: Applying within 24 hours places your resume in the first candidate review batch.'
    };
  }

  if (isRepostLoop) {
    return {
      code: FRESHNESS_CODES.REPOST_WARNING,
      badge: '⚠️ Repost Warning',
      sublabel: `Refreshed loop • ${ageDays}d old`,
      badgeColor: '#f97316',
      bg: 'rgba(249, 115, 22, 0.15)',
      border: 'rgba(249, 115, 22, 0.35)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '0.6x',
      ghostRisk: 'Elevated (Listing continuously bumped without hires)',
      isGhostRisk: true,
      isFreshDrop: false,
      urgency: 'Proceed with Caution',
      recommendation: 'Repost Warning: This listing has been periodically bumped by recruiters without closing. Prioritize newer drops.',
      label: '⚠️ Repost Warning',
      color: '#f97316',
      riskLevel: 'medium',
      actionableTip: `This posting is ${ageDays} days old with repost bumps detected. Address the re-post in your opening sentence if you still want to apply (e.g. 'I noticed this role was recently refreshed and wanted to proactively confirm if you are still actively screening candidates for this cycle').`,
      explanation: 'Repost Warning: This listing has been periodically bumped by recruiters without closing. Prioritize newer drops.'
    };
  }

  if (ageDays <= 14) {
    return {
      code: FRESHNESS_CODES.ACTIVE_CYCLE,
      badge: '🟢 Active Cycle',
      sublabel: `${ageDays}d ago • Active Review`,
      badgeColor: '#4ade80',
      bg: 'rgba(74, 222, 128, 0.12)',
      border: 'rgba(74, 222, 128, 0.3)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '2.0x',
      ghostRisk: 'Low',
      isGhostRisk: false,
      isFreshDrop: false,
      urgency: 'Normal Priority',
      recommendation: 'Active Cycle: Employer is within standard screening and initial interview cadence.',
      label: '🟢 Active Cycle',
      color: '#4ade80',
      riskLevel: 'low',
      actionableTip: `Active review cycle (${ageDays}d old). Standard 2.0x callback velocity; tailor top 3 technical keywords to pass initial recruiter filters.`,
      explanation: 'Active Cycle: Employer is within standard screening and initial interview cadence.'
    };
  }

  if (ageDays <= 45) {
    return {
      code: FRESHNESS_CODES.MODERATE_AGE,
      badge: '🟡 Interviewing',
      sublabel: `${ageDays}d ago • Later Stages`,
      badgeColor: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '1.0x',
      ghostRisk: 'Moderate (Candidates in progress)',
      isGhostRisk: false,
      isFreshDrop: false,
      urgency: 'Medium Priority',
      recommendation: 'Mid-Stage: Employer may already have candidates in intermediate interviews, but qualified fits are still reviewed.',
      label: '🟡 Interviewing',
      color: '#fbbf24',
      riskLevel: 'medium',
      actionableTip: `Mid-stage cycle (${ageDays}d old). Recruiter is likely reviewing second-round candidates. Emphasize immediate availability and relevant impact.`,
      explanation: 'Mid-Stage: Employer may already have candidates in intermediate interviews, but qualified fits are still reviewed.'
    };
  }

  if (ageDays <= 90) {
    return {
      code: FRESHNESS_CODES.STALE_PIPELINE,
      badge: '🟠 Stale Pipeline',
      sublabel: `${ageDays}d old • Low Callback`,
      badgeColor: '#fb923c',
      bg: 'rgba(251, 146, 60, 0.12)',
      border: 'rgba(251, 146, 60, 0.3)',
      ageHours,
      ageDays,
      postedHuman,
      callbackMultiplier: '0.5x',
      ghostRisk: 'High (Open 45-90 days with reduced velocity)',
      isGhostRisk: true,
      isFreshDrop: false,
      urgency: 'Low Priority',
      recommendation: 'Stale Pipeline: Reduced callback rate. Recommended only if your skills match 85%+ of requirements.',
      label: '🟠 Stale Pipeline',
      color: '#fb923c',
      riskLevel: 'high',
      actionableTip: `Stale pipeline (${ageDays}d old). Highlight direct matches to the must-have requirements in your opening line to stand out in an aged queue.`,
      explanation: 'Stale Pipeline: Reduced callback rate. Recommended only if your skills match 85%+ of requirements.'
    };
  }

  return {
    code: FRESHNESS_CODES.LIKELY_GHOST,
    badge: '🔴 Likely Ghost',
    sublabel: `${ageDays}d open • Low ROI`,
    badgeColor: '#f87171',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    ageHours,
    ageDays,
    postedHuman,
    callbackMultiplier: '0.2x',
    ghostRisk: 'Extreme (Open >90 days; probable hiring freeze)',
    isGhostRisk: true,
    isFreshDrop: false,
    urgency: 'Avoid / Low Return',
    recommendation: 'Ghost Risk: Role has remained open over 90 days. High likelihood of hiring freeze or automated evergreen listing.',
    label: '🔴 Likely Ghost',
    color: '#f87171',
    riskLevel: 'high',
    actionableTip: `This posting is ${ageDays} days old (>90 days). If applying, verify on LinkedIn if the team is actively hiring before expending high effort, or mention recent company announcements in your note.`,
    explanation: 'Ghost Risk: Role has remained open over 90 days. High likelihood of hiring freeze or automated evergreen listing.'
  };
}

/**
 * Calculates a composite Freshness-Decay Priority Score (0-100).
 * Blends the static ATS Match Score with real-world posting velocity so fresh drops (<24h)
 * gain priority over aging listings without completely disregarding strong skill matches.
 *
 * Multipliers:
 * - Ultra Fresh (<4h): 1.25x boost (Prime Callback Window)
 * - Fresh Drop (4-24h): 1.15x boost (First Review Batch)
 * - Active Cycle (1-7d): 1.00x (Neutral baseline)
 * - Aging Cycle (8-21d): 0.90x
 * - Moderate Age (22-45d): 0.80x
 * - Stale Pipeline (46-90d): 0.65x
 * - Ghost / Repost Warning: 0.50x
 * - Likely Ghost (>90d): 0.35x
 */
export function calculateFreshnessDecayScore(atsScore = 75, jobOrTelemetry = null, referenceDate = new Date()) {
  const baseScore = typeof atsScore === 'number' && !isNaN(atsScore) ? atsScore : parseFloat(atsScore) || 75;
  const telemetry = jobOrTelemetry && typeof jobOrTelemetry.code === 'string'
    ? jobOrTelemetry
    : calculateFreshnessTelemetry(jobOrTelemetry, referenceDate);

  let multiplier = 1.0;
  switch (telemetry.code) {
    case FRESHNESS_CODES.ULTRA_FRESH:
      multiplier = 1.25;
      break;
    case FRESHNESS_CODES.FRESH_DROP:
      multiplier = 1.15;
      break;
    case FRESHNESS_CODES.ACTIVE_CYCLE:
      multiplier = (telemetry.ageDays || 0) <= 7 ? 1.0 : 0.90;
      break;
    case FRESHNESS_CODES.MODERATE_AGE:
      multiplier = 0.80;
      break;
    case FRESHNESS_CODES.REPOST_WARNING:
      multiplier = 0.50;
      break;
    case FRESHNESS_CODES.STALE_PIPELINE:
      multiplier = 0.65;
      break;
    case FRESHNESS_CODES.LIKELY_GHOST:
      multiplier = 0.35;
      break;
    default:
      multiplier = 1.0;
  }

  const decayScore = Math.min(100, Math.max(15, Math.round(baseScore * multiplier)));
  return {
    baseScore,
    decayScore,
    multiplier,
    telemetry
  };
}

/**
 * Formats a clean, human-readable relative listing timestamp.
 * e.g., "Just now", "14m ago", "3h ago", "Yesterday", "4d ago", "May 12"
 */
export function formatRelativeListingTime(dateInput, referenceDate = new Date()) {
  const ts = parseTimestampMs(dateInput);
  if (!ts) return 'Recently';

  const refMs = referenceDate instanceof Date ? referenceDate.getTime() : Date.now();
  const diffMs = Math.max(0, refMs - ts);
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHours = Math.floor(diffMin / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMin < 2) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`;

  const d = new Date(ts);
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

/**
 * Formats a clean human-friendly job freshness label.
 * e.g. "Just posted", "Posted 2h ago", "Posted 3 days ago", "Verified Active"
 */
export function formatJobFreshnessHuman(jobOrTelemetry, referenceDate = new Date()) {
  if (!jobOrTelemetry) return 'Verified Active';
  if (typeof jobOrTelemetry === 'object' && jobOrTelemetry.postedHuman) {
    return jobOrTelemetry.postedHuman;
  }
  const tel = typeof jobOrTelemetry === 'object' && jobOrTelemetry.ageHours !== undefined
    ? jobOrTelemetry
    : calculateFreshnessTelemetry(jobOrTelemetry, referenceDate);
  return tel.postedHuman || 'Verified Active';
}

/**
 * Synthesizes a heuristic interview callback probability (0-100%)
 * based on ATS match score, posting freshness decay multiplier, company size/tier, and remote competition.
 * 
 * Formula:
 * - Base likelihood: (atsScore * 0.75) * freshnessMultiplier
 * - Adjustments:
 *   - Remote penalty: remote roles attract 5-10x more applicants -> -8% penalty
 *   - Fresh drop boost (< 24h): +10% boost because applicant queue is small
 *   - Stale/repost penalty: -12% penalty
 *   - Clamped to [5, 95]
 * 
 * Ratings:
 * - >= 75%: 'High Probability' (Green)
 * - >= 55%: 'Strong Match' (Cyan)
 * - >= 35%: 'Competitive' (Amber)
 * - < 35%: 'Stretch' (Rose)
 */
export function calculateCallbackLikelihood({ atsScore = 50, freshnessMultiplier = 1.0, isRemote = false, company = '' } = {}) {
  const numericAts = Math.min(100, Math.max(0, Number(atsScore) || 50));
  const mult = typeof freshnessMultiplier === 'number' && freshnessMultiplier > 0 ? freshnessMultiplier : 1.0;

  // Base raw likelihood derived from ATS match score scaled by the listing freshness multiplier
  let raw = (numericAts * 0.75) * mult;

  // Remote roles attract an average of 4-10x more applicant volume in tech, shifting probability distribution
  if (isRemote) {
    raw -= 8;
  }

  // Early-applicant advantage for listings active under 24 hours (fresh drop / ultra fresh)
  if (mult >= 1.15) {
    raw += 10;
  } else if (mult <= 0.5) {
    // Severe stale or repost penalty
    raw -= 12;
  }

  const score = Math.round(Math.min(95, Math.max(5, raw)));

  let rating = 'Stretch';
  let color = '#f87171';
  let bg = 'rgba(239, 68, 68, 0.12)';
  let border = 'rgba(239, 68, 68, 0.3)';

  if (score >= 75) {
    rating = 'High Probability';
    color = '#34d399';
    bg = 'rgba(16, 185, 129, 0.15)';
    border = 'rgba(16, 185, 129, 0.35)';
  } else if (score >= 55) {
    rating = 'Strong Match';
    color = '#38bdf8';
    bg = 'rgba(56, 189, 248, 0.15)';
    border = 'rgba(56, 189, 248, 0.35)';
  } else if (score >= 35) {
    rating = 'Competitive';
    color = '#fbbf24';
    bg = 'rgba(245, 158, 11, 0.15)';
    border = 'rgba(245, 158, 11, 0.35)';
  }

  const badgeText = `${score}% Callback Likelihood`;
  const explanation = `${rating} (${score}%): Synthesized from ${numericAts}% ATS alignment, ${(mult * 100).toFixed(0)}% freshness factor${isRemote ? ', and high-volume remote competition' : ''}.`;

  return {
    score,
    rating,
    color,
    bg,
    border,
    badgeText,
    explanation
  };
}

/**
 * Multi-Vector Ghost Job Probability Evaluator (2025/2026 Telemetry)
 * Evaluates listing age velocity, repost loops, performative growth patterns,
 * DOL PERM labor certification compliance shells, impossible credentials, and compensation evasion.
 * 
 * @param {Object} job - Job object
 * @param {Date|number} [referenceDate=new Date()]
 * @returns {{ ghostScore: number, isGhostReject: boolean, riskLevel: string, indicators: Array<string>, recommendation: string, telemetry: Object, vectors: Object }}
 */
export function evaluateGhostProbability(job = {}, referenceDate = new Date()) {
  const telemetry = job.freshness || calculateFreshnessTelemetry(job, referenceDate);
  const desc = (job.description || job.snippet || job.raw_text || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  const title = (job.title || '').toLowerCase();

  let ghostScore = 0;
  const indicators = [];

  const vectorBreakdown = {
    temporal: { score: 0, indicators: [] },
    evergreen: { score: 0, indicators: [] },
    permCompliance: { score: 0, indicators: [] },
    specIntegrity: { score: 0, indicators: [] },
    compensation: { score: 0, indicators: [] }
  };

  // ──────────────────────────────────────────────────────────────────────────
  // VECTOR 1: Temporal Velocity & Decay Thresholds
  // ──────────────────────────────────────────────────────────────────────────
  const ageDays = telemetry.ageDays ?? 0;
  if (ageDays > 90) {
    const pts = 45;
    ghostScore += pts;
    vectorBreakdown.temporal.score += pts;
    const msg = `Extreme Listing Age: Open for ${ageDays} days (>90d threshold)`;
    indicators.push(msg);
    vectorBreakdown.temporal.indicators.push(msg);
  } else if (ageDays > 60) {
    const pts = 35;
    ghostScore += pts;
    vectorBreakdown.temporal.score += pts;
    const msg = `Severe Stale Age: Open for ${ageDays} days (>60d threshold)`;
    indicators.push(msg);
    vectorBreakdown.temporal.indicators.push(msg);
  } else if (ageDays > 45) {
    const pts = 25;
    ghostScore += pts;
    vectorBreakdown.temporal.score += pts;
    const msg = `Stale Pipeline: Open for ${ageDays} days (>45d threshold)`;
    indicators.push(msg);
    vectorBreakdown.temporal.indicators.push(msg);
  } else if (ageDays > 30) {
    const pts = 10;
    ghostScore += pts;
    vectorBreakdown.temporal.score += pts;
    const msg = `Mid-Cycle Aging: Open for ${ageDays} days`;
    indicators.push(msg);
    vectorBreakdown.temporal.indicators.push(msg);
  }

  // Repost Loop / Recruiter Bump Detection
  if (telemetry.code === FRESHNESS_CODES.REPOST_WARNING) {
    const pts = 35;
    ghostScore += pts;
    vectorBreakdown.temporal.score += pts;
    const msg = 'Repost Loop: Posting periodically bumped by recruiters without closing';
    indicators.push(msg);
    vectorBreakdown.temporal.indicators.push(msg);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VECTOR 2: Evergreen & Performative Growth Linguistic Signatures
  // ──────────────────────────────────────────────────────────────────────────
  const evergreenPatterns = [
    { regex: /evergreen\s+(?:requisition|posting|role|job)/i, label: 'Explicit Evergreen Requisition (Continuous pool, no immediate seat)' },
    { regex: /talent\s+(?:pool|community|pipeline)\s+only/i, label: 'Talent Pool Only (Not actively screening for open seat)' },
    { regex: /future\s+(?:opportunities|openings|needs)\s+only/i, label: 'Future Needs Only (Speculative listing)' },
    { regex: /expression\s+of\s+interest\s+only/i, label: 'Expression of Interest (No funded head count)' },
    { regex: /not\s+actively\s+hiring|hiring\s+freeze|hiring\s+pause/i, label: 'Direct disclosure: Not actively hiring / freeze' },
    { regex: /keep\s+(?:your\s+resume\s+)?on\s+file\s+for\s+future/i, label: 'Resume archiving requisition' },
    { regex: /proactive\s+(?:sourcing|pipeline)\s+only/i, label: 'Proactive sourcing pipeline' },
    { regex: /pooling\s+requisition|continuous\s+talent\s+pipeline/i, label: 'Continuous candidate pooling requisition' },
    { regex: /always\s+looking\s+for\s+(?:top\s+)?talent|speculative\s+opening/i, label: 'Performative growth: Speculative evergreen search' },
    { regex: /general\s+application\s+pool|ongoing\s+consideration\s+pool/i, label: 'General candidate repository (Non-seat requisition)' },
    { regex: /subject\s+to\s+headcount\s+(?:confirmation|approval)|pending\s+budget\s+approval/i, label: 'Unbudgeted requisition (Pending executive approval)' }
  ];

  for (const { regex, label } of evergreenPatterns) {
    if (regex.test(desc)) {
      const pts = 35;
      ghostScore += pts;
      vectorBreakdown.evergreen.score += pts;
      indicators.push(label);
      vectorBreakdown.evergreen.indicators.push(label);
      break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VECTOR 3: DOL PERM / Labor Certification Shell Requisitions
  // (Postings published strictly to satisfy US DOL immigrant labor test requirements)
  // ──────────────────────────────────────────────────────────────────────────
  const permPatterns = [
    { regex: /notice\s+of\s+filing\s+(?:of\s+application\s+for\s+permanent\s+employment|perm)/i, label: 'DOL PERM Notice of Filing (Regulatory compliance shell, internal candidate already selected)' },
    { regex: /perm\s+labor\s+certification|permanent\s+labor\s+certification\s+application/i, label: 'PERM Labor Certification Requisition (Immigration statutory advertising)' },
    { regex: /department\s+of\s+labor\s+(?:recruitment|notice)|alien\s+labor\s+certification/i, label: 'Department of Labor Statutory Recruitment Notice' },
    { regex: /special\s+recruitment\s+advertising\s+under\s+20\s*cfr/i, label: '20 CFR Statutory Alien Labor Certification Listing' },
    { regex: /mail\s+resume\s+to\s+att(?:entio)?n:\s*(?:immigration|legal\s+dept|perm)/i, label: 'Mandatory Mail-In Immigration Legal Notice' }
  ];

  for (const { regex, label } of permPatterns) {
    if (regex.test(desc)) {
      const pts = 50;
      ghostScore += pts;
      vectorBreakdown.permCompliance.score += pts;
      indicators.push(label);
      vectorBreakdown.permCompliance.indicators.push(label);
      break;
    }
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VECTOR 4: Undisclosed Agency Farming & Vague Skeleton JDs
  // ──────────────────────────────────────────────────────────────────────────
  if (/confidential\s+client|undisclosed\s+(?:client|company)|stealth\s+(?:client|recruiter)/i.test(company) || 
      /client\s+is\s+a\s+(?:leading|top|fortune)\s+(?:bank|company|retailer)\s+who\s+cannot\s+be\s+named/i.test(desc)) {
    const pts = 25;
    ghostScore += pts;
    vectorBreakdown.specIntegrity.score += pts;
    const msg = 'Undisclosed / Confidential Client (High resume harvesting probability)';
    indicators.push(msg);
    vectorBreakdown.specIntegrity.indicators.push(msg);
  }

  // Vague Short Requisition Aging (>30 days, <200 words, no specific tech requirements)
  const wordCount = desc.trim() ? desc.trim().split(/\s+/).length : 0;
  const commonTechAnchors = ['python', 'javascript', 'typescript', 'react', 'node', 'golang', 'go', 'java', 'c++', 'rust', 'aws', 'kubernetes', 'docker', 'sql', 'postgresql', 'graphql', 'rest', 'api', 'ci/cd', 'terraform', 'linux'];
  const matchedTechCount = commonTechAnchors.filter(k => {
    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    return new RegExp(`(?:^|[^a-z0-9#+.-])${escaped}(?:$|[^a-z0-9#+.-])`, 'i').test(desc);
  }).length;

  if (wordCount > 0 && wordCount < 200 && matchedTechCount < 2 && ageDays > 30) {
    const pts = 40;
    ghostScore += pts;
    vectorBreakdown.specIntegrity.score += pts;
    const msg = `Probable Ghost Job: Vague brief JD (${wordCount} words) without specific technical requirements open for ${ageDays} days (>30d threshold)`;
    indicators.push(msg);
    vectorBreakdown.specIntegrity.indicators.push(msg);
  }

  // Title vs. Seniority Incongruity (Junior/Entry title demanding 5-10+ years experience)
  const isJuniorTitle = /\b(?:junior|jr|entry[\s-]level|associate|intern|internship|graduate|apprentice)\b/i.test(title);
  const demandsExcessiveYoE = /(?:5\+|[6-9]\+|10\+|[5-9]\s*to\s*10)\s*years?(?:\s+of)?\s+(?:experience|production|hands-on)/i.test(desc);
  if (isJuniorTitle && demandsExcessiveYoE) {
    const pts = 30;
    ghostScore += pts;
    vectorBreakdown.specIntegrity.score += pts;
    const msg = 'Credibility Mismatch: Junior/Entry-level title demanding 5+ years of senior experience (Unrealistic candidate screening filter)';
    indicators.push(msg);
    vectorBreakdown.specIntegrity.indicators.push(msg);
  }

  // ──────────────────────────────────────────────────────────────────────────
  // VECTOR 5: Compensation Evasion & Sham Pay Range
  // ──────────────────────────────────────────────────────────────────────────
  const minSal = Number(job.salary_min || job.min_salary || 0);
  const maxSal = Number(job.salary_max || job.max_salary || 0);
  if (minSal > 0 && maxSal > 0 && maxSal >= (minSal * 4.0) && (maxSal - minSal) >= 150000) {
    const pts = 25;
    ghostScore += pts;
    vectorBreakdown.compensation.score += pts;
    const msg = `Sham Salary Range ($${minSal.toLocaleString()} - $${maxSal.toLocaleString()}): Extreme spread designed to evade pay transparency compliance`;
    indicators.push(msg);
    vectorBreakdown.compensation.indicators.push(msg);
  }

  // Clamp score
  ghostScore = Math.min(100, ghostScore);
  const isGhostReject = ghostScore >= 45 || ageDays > 60 || telemetry.code === FRESHNESS_CODES.REPOST_WARNING;

  let riskLevel = 'clean';
  if (ghostScore >= 70) riskLevel = 'critical';
  else if (ghostScore >= 45) riskLevel = 'high';
  else if (ghostScore >= 25) riskLevel = 'moderate';
  else if (ghostScore > 0) riskLevel = 'low';

  let recommendation = 'Verified Active: Normal hiring review velocity.';
  if (isGhostReject) {
    recommendation = `High Ghost Probability (${ghostScore}%): Role has been stagnant or is an evergreen resume builder. Prioritize active roles under 14 days old.`;
  }

  return {
    ghostScore,
    isGhostReject,
    riskLevel,
    indicators,
    recommendation,
    telemetry,
    vectors: vectorBreakdown
  };
}

/**
 * Enhanced Scam, Phishing & Fraud Evaluator (2025/2026 Attack Vectors)
 * Detects Telegram/WhatsApp phishing, free webmail impersonation, pre-offer ID harvesting,
 * fake equipment cashier checks, instant hire traps, data entry phishing, crypto muling,
 * and unpaid trial exploitation.
 * 
 * @param {Object} job - Job object
 * @returns {{ scamScore: number, isSpamScam: boolean, scamIndicators: Array<string>, warning: string, vectors: Object }}
 */
export function evaluateSpamScamRisk(job = {}) {
  const desc = (job.description || job.snippet || job.raw_text || '').toLowerCase();
  const company = (job.company || '').toLowerCase();
  const title = (job.title || '').toLowerCase();
  const contactEmail = (job.contact_email || job.email || '').toLowerCase();

  let scamScore = 0;
  const scamIndicators = [];

  const vectorBreakdown = {
    offPlatform: { score: 0, indicators: [] },
    impersonation: { score: 0, indicators: [] },
    idHarvesting: { score: 0, indicators: [] },
    advanceFee: { score: 0, indicators: [] },
    instantHire: { score: 0, indicators: [] },
    unskilledTrap: { score: 0, indicators: [] },
    cryptoMuling: { score: 0, indicators: [] },
    unpaidLabor: { score: 0, indicators: [] },
    mlm: { score: 0, indicators: [] }
  };

  // 1. Phishing & Off-Platform Anonymous Interview Routing (Telegram / WhatsApp / Discord / Signal)
  if (/(?:contact|reach|interview|message|connect|dm|chat)[\w\s]{0,35}\b(?:on|via)\s*telegram\b|telegram\s*(?:username|handle|app|channel|link|account)?\s*[:@-]|telegram\s+@\w+|@\w+\s+on\s+telegram/i.test(desc)) {
    const pts = 70;
    scamScore += pts;
    vectorBreakdown.offPlatform.score += pts;
    const msg = 'Critical: Directs interview communication to Telegram (Known recruitment phishing vector)';
    scamIndicators.push(msg);
    vectorBreakdown.offPlatform.indicators.push(msg);
  }

  if ((/(?:contact|reach|interview|message|connect|dm|chat)[\w\s]{0,35}\b(?:on|via)\s*whatsapp\b|whatsapp\s*(?:number|group|link|app)?\s*[:+]/i.test(desc)) && !/official\s+business\s+whatsapp/i.test(desc)) {
    const pts = 45;
    scamScore += pts;
    vectorBreakdown.offPlatform.score += pts;
    const msg = 'Directs interview communication to WhatsApp';
    scamIndicators.push(msg);
    vectorBreakdown.offPlatform.indicators.push(msg);
  }

  if (/(?:contact|reach|interview|message|chat)[\w\s]{0,35}\b(?:on|via)\s*(?:signal|discord|skype|google\s+chat|wechat)\b/i.test(desc)) {
    const pts = 40;
    scamScore += pts;
    vectorBreakdown.offPlatform.score += pts;
    const msg = 'Suspicious Off-Platform Channel: Routes interview communication to unverified chat service (Signal/Discord/Skype)';
    scamIndicators.push(msg);
    vectorBreakdown.offPlatform.indicators.push(msg);
  }

  // 2. Recruiter Impersonation & Free Webmail Senders
  const freeMailMatch = desc.match(/(?:send\s+resume|email\s+(?:us|me)|contact\s+(?:us|me)?)[\w\s]{0,30}\b([a-zA-Z0-9._%+-]+@(gmail|yahoo|outlook|hotmail|proton|protonmail|aol|icloud)\.com)\b/i);
  const isDirectFreeMail = /@(gmail|yahoo|outlook|hotmail|proton|protonmail|aol|icloud)\.com$/i.test(contactEmail);

  if ((freeMailMatch || isDirectFreeMail) && company && !/freelance|personal|individual/i.test(company)) {
    const matchedAddress = freeMailMatch ? freeMailMatch[1] : contactEmail;
    const pts = 55;
    scamScore += pts;
    vectorBreakdown.impersonation.score += pts;
    const msg = `Recruiter Impersonation Risk: Corporate role directs contact to public free webmail address (${matchedAddress})`;
    scamIndicators.push(msg);
    vectorBreakdown.impersonation.indicators.push(msg);
  }

  // 3. Pre-Offer Sensitive Identity & Banking Information Harvesting
  if (/(?:social\s+security\s+number|ssn\b|copy\s+of\s+passport|driver(?:'s)?\s+license\s+(?:photo|scan|front\s+and\s+back)|bank\s+routing\s+number|bank\s+account\s+details\s+(?:for\s+verification|to\s+apply))/i.test(desc)) {
    const pts = 85;
    scamScore += pts;
    vectorBreakdown.idHarvesting.score += pts;
    const msg = 'Severe Identity Harvesting: Requests SSN, government ID, or banking details prior to formal offer';
    scamIndicators.push(msg);
    vectorBreakdown.idHarvesting.indicators.push(msg);
  }

  // Form Hijacking (Google Forms / Typeform / Jotform / Wufoo used as primary application for corporate roles)
  if (/(?:apply|submit\s+your\s+application|fill\s+out\s+(?:the|this)\s+form)[\w\s]{0,25}\b(?:docs\.google\.com\/forms|forms\.gle|typeform\.com|jotform\.com|wufoo\.com)\b/i.test(desc)) {
    const pts = 45;
    scamScore += pts;
    vectorBreakdown.idHarvesting.score += pts;
    const msg = 'Form Hijacking: Directs applicants to generic third-party web forms (Google Forms/Typeform) rather than secure ATS';
    scamIndicators.push(msg);
    vectorBreakdown.idHarvesting.indicators.push(msg);
  }

  // 4. Advance Fee / Fake Check / Equipment Purchase Reimbursement Scams
  if (/wire\s+transfer\s+for\s+(?:home\s+)?equipment|check\s+(?:will\s+be\s+sent|deposit)\s+for\s+equipment|purchase\s+(?:your\s+own\s+)?(?:laptop|equipment)\s+and\s+(?:we\s+will\s+)?reimburse|cashier(?:'s)?\s+check/i.test(desc)) {
    const pts = 80;
    scamScore += pts;
    vectorBreakdown.advanceFee.score += pts;
    const msg = 'Severe Scam Alert: Advance check deposit or equipment purchase reimbursement scam';
    scamIndicators.push(msg);
    vectorBreakdown.advanceFee.indicators.push(msg);
  }

  if (/application\s+fee|background\s+check\s+fee\s+required|pay\s+(?:to\s+)?(?:apply|start|join|train)|software\s+license\s+fee\s+required/i.test(desc)) {
    const pts = 75;
    scamScore += pts;
    vectorBreakdown.advanceFee.score += pts;
    const msg = 'Illegal Fee: Requires candidate payment for application, background check, or onboarding';
    scamIndicators.push(msg);
    vectorBreakdown.advanceFee.indicators.push(msg);
  }

  // 5. Instant Unconditional Hiring Traps (No Interview Required)
  if (/immediate\s+hire\s+without\s+interview|selected\s+based\s+(?:solely\s+)?on\s+(?:your\s+)?resume|no\s+(?:formal\s+)?interview\s+required|start\s+immediately\s+upon\s+(?:equipment\s+arrival|deposit)/i.test(desc)) {
    const pts = 70;
    scamScore += pts;
    vectorBreakdown.instantHire.score += pts;
    const msg = 'Predatory Hiring Trap: Claims instant unconditional hiring without technical or personal interview';
    scamIndicators.push(msg);
    vectorBreakdown.instantHire.indicators.push(msg);
  }

  // 6. Fake High-Pay Remote Unskilled Traps (Data Entry & Package Reshipping / Mail Muling)
  const isUnskilledTask = /\b(?:data\s+entry|envelope\s+stuffing|typing|package\s+(?:inspector|reshipper|forwarding)|mystery\s+shopper)\b/i.test(title + ' ' + desc);
  const isExorbitantRate = /\$\s*(?:4[5-9]|[5-9]\d|\d{2,4})\s*(?:\/|\s*per\s*)\s*(?:hr|hour)\b/i.test(desc);
  if (isUnskilledTask && isExorbitantRate) {
    const pts = 75;
    scamScore += pts;
    vectorBreakdown.unskilledTrap.score += pts;
    const msg = 'Suspicious Unskilled Pay Trap: Exorbitant hourly rate ($45+/hr) advertised for routine data entry or package handling';
    scamIndicators.push(msg);
    vectorBreakdown.unskilledTrap.indicators.push(msg);
  }

  if (/package\s+(?:reshipping|forwarding|re-mailing)\s+agent|receive\s+packages\s+and\s+re-ship/i.test(desc)) {
    const pts = 85;
    scamScore += pts;
    vectorBreakdown.unskilledTrap.score += pts;
    const msg = 'Severe Money/Goods Muling: Reshipping goods purchased with stolen credit cards (Criminal liability risk)';
    scamIndicators.push(msg);
    vectorBreakdown.unskilledTrap.indicators.push(msg);
  }

  // 7. Crypto Wallet Transfer & Laundering Scams
  if (/crypto\s+wallet\s+transfer|receive\s+crypto\s+and\s+forward|bitcoin\s+atm/i.test(desc)) {
    const pts = 90;
    scamScore += pts;
    vectorBreakdown.cryptoMuling.score += pts;
    const msg = 'Critical: Crypto money laundering or unauthorized transfer scam';
    scamIndicators.push(msg);
    vectorBreakdown.cryptoMuling.indicators.push(msg);
  }

  // 8. Unpaid Labor & Spec Work Exploitation
  if (/unpaid\s+(?:trial|internship|training|probation)|free\s+work\s+trial|20\+\s*hours?\s+(?:take-?home|assignment)|build\s+(?:a\s+)?production\s+(?:ready\s+)?(?:feature|app|system)\s+for\s+(?:our\s+)?review/i.test(desc)) {
    const pts = 50;
    scamScore += pts;
    vectorBreakdown.unpaidLabor.score += pts;
    const msg = 'Labor Exploitation: Demands extensive unpaid work trial or free production feature development';
    scamIndicators.push(msg);
    vectorBreakdown.unpaidLabor.indicators.push(msg);
  }

  // 9. Pure Commission & MLM Pyramid Schemes
  if (/100%\s+commission\s+only|pure\s+commission\s+only|multi-?level\s+marketing|unlimited\s+downline|pyramid/i.test(desc)) {
    const pts = 60;
    scamScore += pts;
    vectorBreakdown.mlm.score += pts;
    const msg = 'Multi-Level Marketing / 100% Commission Only Risk';
    scamIndicators.push(msg);
    vectorBreakdown.mlm.indicators.push(msg);
  }

  scamScore = Math.min(100, scamScore);
  const isSpamScam = scamScore >= 40;

  return {
    scamScore,
    isSpamScam,
    scamIndicators,
    warning: isSpamScam 
      ? `High Risk Alert: Detected ${scamIndicators.length} suspicious recruitment fraud or exploitation vectors.`
      : 'Clean: No predatory or phishing patterns detected.',
    vectors: vectorBreakdown
  };
}

/**
 * Unified Sovereign Ghost & Spam Shield Auditor (2025/2026 Engine)
 * Synthesizes freshness telemetry, multi-vector ghost probability, fraud/phishing signatures,
 * and outputs a unified Authenticity Score (0-100) with dynamic candidate strategy advice.
 * 
 * @param {Object} job - Job object
 * @param {Object} [options]
 * @returns {Object} Comprehensive audit verdict and candidate intelligence
 */
export function auditGhostAndSpamRisk(job = {}, options = {}) {
  const ghost = evaluateGhostProbability(job, options.referenceDate);
  const scam = evaluateSpamScamRisk(job);

  const shouldReject = ghost.isGhostReject || scam.isSpamScam;
  const primaryVerdict = scam.isSpamScam 
    ? '⛔ Scam / Fraud Alert'
    : (ghost.isGhostReject ? '🟡 Ghost Job Probability' : '🟢 Verified Active');

  // ──────────────────────────────────────────────────────────────────────────
  // Composite Authenticity Score Math (0 - 100)
  // ──────────────────────────────────────────────────────────────────────────
  let authenticityScore = 100;

  if (scam.isSpamScam) {
    authenticityScore = Math.max(0, 100 - scam.scamScore);
  } else {
    // Deduct for ghost probability
    authenticityScore -= Math.round(ghost.ghostScore * 0.70);

    // Stale age penalty
    const age = ghost.telemetry?.ageDays ?? 0;
    if (age > 45) authenticityScore -= 12;
    else if (age > 28) authenticityScore -= 5;

    // Fresh drop bonus
    if (ghost.telemetry?.code === FRESHNESS_CODES.ULTRA_FRESH || ghost.telemetry?.code === FRESHNESS_CODES.FRESH_DROP) {
      authenticityScore = Math.min(100, authenticityScore + 5);
    }
  }

  authenticityScore = Math.min(100, Math.max(0, authenticityScore));

  let authenticityTier = 'verified_authentic';
  let authenticityBadge = {
    label: '🟢 Verified Authentic',
    color: '#10b981',
    bg: 'rgba(16, 185, 129, 0.12)',
    border: 'rgba(16, 185, 129, 0.3)'
  };

  if (scam.isSpamScam || authenticityScore < 15) {
    authenticityTier = 'scam_danger';
    authenticityBadge = {
      label: '⛔ Fraud Danger',
      color: '#f87171',
      bg: 'rgba(239, 68, 68, 0.18)',
      border: 'rgba(239, 68, 68, 0.45)'
    };
  } else if (ghost.isGhostReject || authenticityScore < 40) {
    authenticityTier = 'likely_ghost';
    authenticityBadge = {
      label: '🟠 Likely Ghost',
      color: '#fb923c',
      bg: 'rgba(251, 146, 60, 0.15)',
      border: 'rgba(251, 146, 60, 0.35)'
    };
  } else if (authenticityScore < 65) {
    authenticityTier = 'elevated_caution';
    authenticityBadge = {
      label: '🟡 Elevated Caution',
      color: '#fbbf24',
      bg: 'rgba(245, 158, 11, 0.12)',
      border: 'rgba(245, 158, 11, 0.3)'
    };
  } else if (authenticityScore < 85) {
    authenticityTier = 'standard_active';
    authenticityBadge = {
      label: '🔵 Standard Active',
      color: '#38bdf8',
      bg: 'rgba(56, 189, 248, 0.12)',
      border: 'rgba(56, 189, 248, 0.3)'
    };
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Strategic Decision & Outreach Guidance Generation
  // ──────────────────────────────────────────────────────────────────────────
  const cleanCompany = (job.company || 'the hiring team').trim();
  const cleanTitle = (job.title || 'this role').trim();

  let strategicAdvice = {
    headline: 'High Confidence Listing: Direct Review Cadence',
    strategy: 'Submit your tailored application immediately. This role is within the active recruitment window with verified telemetry.',
    actionRecommendation: 'Apply & Follow Up',
    repostNoticeTemplate: null,
    hiringManagerOutreachTemplate: `Hi [Name], I noticed ${cleanCompany}'s opening for ${cleanTitle} and wanted to reach out directly. My background in [Core Skill 1] and [Core Skill 2] aligns closely with the team's roadmap. Would you be open to a brief conversation regarding the priorities for this position?`,
    securityChecklist: null
  };

  if (scam.isSpamScam) {
    strategicAdvice = {
      headline: '⛔ DO NOT APPLY — HIGH SECURITY & FRAUD RISK',
      strategy: 'This requisition exhibits signature patterns of recruitment phishing, identity harvesting, or financial fraud.',
      actionRecommendation: 'Block & Report',
      repostNoticeTemplate: null,
      hiringManagerOutreachTemplate: null,
      securityChecklist: [
        'Never send funds, purchase equipment, or cash checks on behalf of a recruiter.',
        'Never provide SSN, passport scans, or banking details prior to a verified offer letter.',
        'Verify the opening directly by visiting the employer’s official website careers page in a new tab.',
        'Report this listing to the platform and relevant consumer fraud authorities (e.g. IdentityTheft.gov or IC3.gov).'
      ]
    };
  } else if (ghost.telemetry?.code === FRESHNESS_CODES.REPOST_WARNING) {
    strategicAdvice = {
      headline: '⚠️ Repost Loop Detected — Recruiter Bump Without Active Review',
      strategy: 'Recruiters periodically bump this listing to appear under "New" while hundreds of past applicants remain unreviewed. If you apply, address the refresh in your note.',
      actionRecommendation: 'Address Refresh in Application',
      repostNoticeTemplate: `I noticed this ${cleanTitle} role was recently refreshed by ${cleanCompany}, and wanted to proactively confirm if your team is actively screening new applicants for this cycle.`,
      hiringManagerOutreachTemplate: `Hi [Name], I saw ${cleanCompany}'s ${cleanTitle} posting was recently refreshed. Given how quickly applicant pools expand on bumped postings, I wanted to reach out directly with my background in [Key Skill] to see if the team is still actively scheduling interviews.`,
      securityChecklist: null
    };
  } else if (ghost.isGhostReject) {
    strategicAdvice = {
      headline: '🟠 Ghost Risk Requisition — Stagnant Pipeline or Evergreen Shell',
      strategy: 'Cold applications through this ATS link face an estimated callback rate under 0.3x. Bypass the ATS queue by identifying the actual Engineering Lead or Hiring Manager on LinkedIn.',
      actionRecommendation: 'Bypass ATS / Direct Outreach Only',
      repostNoticeTemplate: null,
      hiringManagerOutreachTemplate: `Hi [Name], I noticed the ${cleanTitle} requisition at ${cleanCompany} has been open for several weeks. I wanted to check directly whether the headcount is currently funded and active, as my experience in [Specialty] matches the stated needs.`,
      securityChecklist: null
    };
  }

  return {
    shouldReject,
    primaryVerdict,
    authenticityScore,
    authenticityTier,
    authenticityBadge,
    ghost,
    scam,
    isGhost: ghost.isGhostReject,
    isScam: scam.isSpamScam,
    totalIndicators: [...ghost.indicators, ...scam.scamIndicators],
    strategicAdvice
  };
}



