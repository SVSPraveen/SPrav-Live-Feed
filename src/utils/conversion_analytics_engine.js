/**
 * conversion_analytics_engine.js
 * ===============================
 * Pure client-side mathematical analytics engine for job application conversion,
 * multi-stage funnel attrition, recruiter timing patterns, company tiering,
 * and industry benchmark calibration. Runs 100% locally with zero server overhead.
 */

export const INDUSTRY_BENCHMARKS = {
  coldResponseRate: 2.8, // % industry average for untargeted / cold job applications
  atsOptimizedResponseRate: 14.5, // % target for keyword-tailored ATS applications
  screenToTechRate: 32.0, // % industry transition from recruiter screen to technical loop
  techToOfferRate: 22.0, // % industry transition from technical round to official offer
  coldOfferRate: 0.9, // % overall applied-to-offer rate for cold applications
  atsOptimizedOfferRate: 3.8 // % overall applied-to-offer rate for high-fit applications
};

export const RECRUITER_PEAK_DAYS = [2, 3, 4]; // Tuesday (2), Wednesday (3), Thursday (4)
export const RECRUITER_PEAK_HOURS = { start: 8, end: 12 }; // 8:00 AM – 12:00 PM local

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export const ENTERPRISE_COMPANIES = new Set([
  'google', 'alphabet', 'meta', 'facebook', 'amazon', 'apple', 'microsoft',
  'netflix', 'salesforce', 'adobe', 'uber', 'airbnb', 'stripe', 'snowflake',
  'datadog', 'twilio', 'atlassian', 'cisco', 'oracle', 'ibm', 'spotify',
  'intuit', 'linkedin', 'vmware', 'paypal', 'twitter', 'ebay', 'shopify',
  'zoom', 'square', 'block', 'palantir', 'pinterest', 'snap', 'doordash',
  'lyft', 'robinhood', 'instacart', 'servicenow', 'workday', 'sap', 'intel',
  'nvidia', 'qualcomm', 'broadcom', 'amd', 'dell', 'hp', 'accenture', 'capgemini',
  'infosys', 'tcs', 'wipro', 'hcl', 'cognizant', 'jpmorgan', 'goldman sachs',
  'morgan stanley', 'capital one', 'walmart', 'target'
]);

export const MID_MARKET_COMPANIES = new Set([
  'figma', 'canva', 'vercel', 'supabase', 'retool', 'ramp', 'brex', 'miro',
  'dbt labs', 'notion', 'linear', 'postman', 'airtable', 'snyk', 'gitlab',
  'webflow', 'docker', 'hashicorp', 'launchdarkly', 'grafana', 'clickup',
  'monday.com', 'zapier', 'loom', 'gusto', 'rippling', 'lattice', 'contentful',
  'algolia', 'elastic', 'auth0', 'okta', 'confluent', 'scale ai', 'cohere',
  'anthropic', 'hugging face', 'render', 'fly.io', 'neon', 'pinecone', 'qdrant',
  'weaviate', 'chroma', 'langchain', 'perplexity', 'mistral'
]);

/**
 * Normalizes an application/job status into one of five canonical funnel stages:
 * 'wishlist', 'applied', 'screening', 'technical', 'offer', 'archived'.
 *
 * @param {Object} item
 * @returns {'wishlist'|'applied'|'screening'|'technical'|'offer'|'archived'}
 */
export function normalizeJobStage(item = {}) {
  if (!item) return 'wishlist';
  if (item.kanban_stage) {
    const ks = String(item.kanban_stage).toLowerCase().trim();
    if (['offer', 'technical', 'screening', 'applied', 'archived', 'wishlist'].includes(ks)) {
      return ks;
    }
  }

  const status = String(item.status || item.stage || '').toLowerCase().trim();
  if (['offer', 'offered', 'completed', 'accepted', 'passed'].includes(status)) {
    return 'offer';
  }
  if (['technical', 'in_progress', 'assessment', 'coding_test', 'onsite', 'tech_interview'].includes(status)) {
    return 'technical';
  }
  if (['screening', 'phone_screen', 'recruiter_screen', 'scheduled', 'interview', 'interviewing'].includes(status)) {
    return 'screening';
  }
  if (['applied', 'submitted', 'awaiting_results', 'opened_for_manual_submit'].includes(status) || item.applied_at) {
    return 'applied';
  }
  if (['archived', 'rejected', 'failed', 'withdrawn', 'declined', 'closed'].includes(status)) {
    return 'archived';
  }

  return 'wishlist';
}

/**
 * Calculates multi-stage conversion rates and step-by-step attrition across
 * the four active stages: Applied -> Screening -> Technical -> Offer.
 *
 * @param {Array} jobs - List of jobs from STORES.JOBS
 * @param {Array} applications - Submitted applications from STORES.APPLICATIONS / HISTORY
 * @returns {Object} Full stage funnel analytics
 */
export function calculateStageFunnel(jobs = [], applications = []) {
  const seenIds = new Set();
  const allItems = [];

  const addItems = (list) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item) continue;
      const key = item.id || `${item.company || ''}::${item.title || ''}`;
      if (key && !seenIds.has(key)) {
        seenIds.add(key);
        allItems.push(item);
      }
    }
  };

  addItems(applications);
  addItems(jobs);

  // Filter for items that have reached at least the "applied" stage
  const dispatchedItems = allItems.filter(item => {
    const stage = normalizeJobStage(item);
    return stage !== 'wishlist' || Boolean(item.applied_at);
  });

  let countApplied = dispatchedItems.length;
  let countScreening = 0;
  let countTechnical = 0;
  let countOffer = 0;
  let countArchived = 0;

  for (const item of dispatchedItems) {
    const stage = normalizeJobStage(item);
    if (stage === 'offer') {
      countOffer++;
      countTechnical++;
      countScreening++;
    } else if (stage === 'technical') {
      countTechnical++;
      countScreening++;
    } else if (stage === 'screening') {
      countScreening++;
    } else if (stage === 'archived') {
      countArchived++;
    }
  }

  const safeDiv = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

  const appliedToScreenRate = safeDiv(countScreening, countApplied);
  const screenToTechRate = safeDiv(countTechnical, countScreening);
  const techToOfferRate = safeDiv(countOffer, countTechnical);
  const overallYieldRate = safeDiv(countOffer, countApplied);

  const appliedToScreenDrop = countApplied > 0 ? Math.max(0, Number((100 - appliedToScreenRate).toFixed(1))) : 0;
  const screenToTechDrop = countScreening > 0 ? Math.max(0, Number((100 - screenToTechRate).toFixed(1))) : 0;
  const techToOfferDrop = countTechnical > 0 ? Math.max(0, Number((100 - techToOfferRate).toFixed(1))) : 0;

  let bottleneck = null;
  if (countApplied >= 3) {
    if (appliedToScreenRate < 8.0) {
      bottleneck = {
        stage: 'Applied → Recruiter Screen',
        issue: 'Low initial callback velocity',
        recommendation: 'Increase ATS keyword alignment to ≥80% and optimize top skills in resume header.'
      };
    } else if (countScreening >= 2 && screenToTechRate < 25.0) {
      bottleneck = {
        stage: 'Recruiter Screen → Technical Assessment',
        issue: 'Recruiter pitch attrition',
        recommendation: 'Refine 60-second elevator pitch in Prep Center and emphasize measurable project impacts.'
      };
    } else if (countTechnical >= 2 && techToOfferRate < 20.0) {
      bottleneck = {
        stage: 'Technical Assessment → Final Offer',
        issue: 'System design / coding loop conversion drop',
        recommendation: 'Practice STAR story architectural trade-offs and live problem decomposition.'
      };
    }
  }

  return {
    total_dispatched: countApplied,
    stages: {
      applied: { count: countApplied, pctOfTotal: 100 },
      screening: { count: countScreening, pctOfTotal: appliedToScreenRate, dropoffPct: appliedToScreenDrop },
      technical: { count: countTechnical, pctOfTotal: safeDiv(countTechnical, countApplied), stepRate: screenToTechRate, dropoffPct: screenToTechDrop },
      offer: { count: countOffer, pctOfTotal: overallYieldRate, stepRate: techToOfferRate, dropoffPct: techToOfferDrop },
      archived: { count: countArchived, pctOfTotal: safeDiv(countArchived, countApplied) }
    },
    conversionRates: {
      appliedToScreen: appliedToScreenRate,
      screenToTech: screenToTechRate,
      techToOffer: techToOfferRate,
      overallYield: overallYieldRate
    },
    bottleneck
  };
}

/**
 * Analyzes application timestamps to determine candidate's day-of-week and
 * time-of-day submission distribution vs. optimal recruiter attention windows.
 *
 * @param {Array} applications - Applications array
 * @param {Array} jobs - Jobs array with applied_at
 * @returns {Object} Timing telemetry breakdown
 */
export function analyzeApplicationTiming(applications = [], jobs = []) {
  const dayCounts = [0, 0, 0, 0, 0, 0, 0]; // 0=Sun, 6=Sat
  const slotCounts = {
    early_morning: 0, // 5 AM - 8 AM
    prime_morning: 0, // 8 AM - 12 PM (Peak Recruiter Review Window)
    midday: 0,        // 12 PM - 2 PM
    afternoon: 0,     // 2 PM - 5 PM
    evening_night: 0  // 5 PM - 5 AM
  };

  let validTimestampCount = 0;
  let primeWindowDispatches = 0;

  const processDate = (dateVal) => {
    if (!dateVal) return;
    const d = new Date(dateVal);
    if (isNaN(d.getTime())) return;

    validTimestampCount++;
    const day = d.getDay();
    const hour = d.getHours();

    dayCounts[day]++;

    let slot = 'evening_night';
    if (hour >= 5 && hour < 8) slot = 'early_morning';
    else if (hour >= 8 && hour < 12) slot = 'prime_morning';
    else if (hour >= 12 && hour < 14) slot = 'midday';
    else if (hour >= 14 && hour < 17) slot = 'afternoon';

    slotCounts[slot]++;

    if (RECRUITER_PEAK_DAYS.includes(day) && hour >= RECRUITER_PEAK_HOURS.start && hour < RECRUITER_PEAK_HOURS.end) {
      primeWindowDispatches++;
    }
  };

  const seenKeys = new Set();
  const combine = [...(Array.isArray(applications) ? applications : []), ...(Array.isArray(jobs) ? jobs : [])];
  for (const item of combine) {
    if (!item) continue;
    const id = item.id || `${item.company}-${item.title}`;
    if (seenKeys.has(id)) continue;
    seenKeys.add(id);

    const ts = item.applied_at || (item.status === 'applied' ? item.created_at : null);
    if (ts) processDate(ts);
  }

  let peakDayIndex = 2; // Default Tuesday
  let maxDayCount = -1;
  dayCounts.forEach((count, idx) => {
    if (count > maxDayCount) {
      maxDayCount = count;
      peakDayIndex = idx;
    }
  });

  const primeAlignmentPct = validTimestampCount > 0
    ? Math.round((primeWindowDispatches / validTimestampCount) * 100)
    : 0;

  let timingAdvice = 'Recommendation: Shift job applications to Tuesday–Thursday between 8:00 AM and 11:30 AM local time to bypass weekend backlogs.';
  if (primeAlignmentPct >= 65) {
    timingAdvice = 'Optimal timing: The majority of your applications are dispatched during peak recruiter inbox review windows (Tue–Thu mornings).';
  } else if (primeAlignmentPct >= 35) {
    timingAdvice = 'Good timing alignment. Shifting afternoon and weekend submissions to Tuesday–Thursday mornings will boost open rates.';
  }

  return {
    validTimestampCount,
    primeWindowDispatches,
    primeAlignmentPct,
    peakDay: DAY_NAMES[peakDayIndex],
    peakDayCount: maxDayCount,
    dayDistribution: DAY_NAMES.map((name, index) => ({
      day: name,
      dayShort: name.slice(0, 3),
      count: dayCounts[index],
      isPeakDay: RECRUITER_PEAK_DAYS.includes(index),
      pct: validTimestampCount > 0 ? Number(((dayCounts[index] / validTimestampCount) * 100).toFixed(1)) : 0
    })),
    slotDistribution: [
      { id: 'prime_morning', label: 'Prime Morning (8 AM – 12 PM)', count: slotCounts.prime_morning, isOptimal: true },
      { id: 'afternoon', label: 'Afternoon (2 PM – 5 PM)', count: slotCounts.afternoon, isOptimal: false },
      { id: 'midday', label: 'Midday / Lunch (12 PM – 2 PM)', count: slotCounts.midday, isOptimal: false },
      { id: 'early_morning', label: 'Early Morning (5 AM – 8 AM)', count: slotCounts.early_morning, isOptimal: false },
      { id: 'evening_night', label: 'Evening & Night (5 PM – 5 AM)', count: slotCounts.evening_night, isOptimal: false }
    ],
    timingAdvice
  };
}

/**
 * Classifies an employer into one of three distinct industry tiers:
 * 'enterprise' (FAANG/Fortune 500), 'mid_market' (Scale-ups, Series C-E),
 * or 'startup' (Early stage, Seed, Series A-B).
 *
 * @param {string} companyName
 * @returns {'enterprise'|'mid_market'|'startup'}
 */
export function classifyCompanyTier(companyName = '') {
  if (!companyName || typeof companyName !== 'string') return 'startup';
  const clean = companyName.toLowerCase().trim();

  for (const ent of ENTERPRISE_COMPANIES) {
    if (clean === ent || clean.includes(ent)) return 'enterprise';
  }

  for (const mid of MID_MARKET_COMPANIES) {
    if (clean === mid || clean.includes(mid)) return 'mid_market';
  }

  if (/\b(inc|corp|corporation|technologies|global|systems|enterprises|holdings|services)\b/i.test(clean)) {
    return 'enterprise';
  }

  return 'startup';
}

/**
 * Computes application volume, response rates, and fit scores segmented by company tier.
 *
 * @param {Array} jobs - Jobs array
 * @param {Array} applications - Applications array
 * @returns {Object} Tier metrics breakdown
 */
export function classifyCompanyTierMetrics(jobs = [], applications = []) {
  const tiers = {
    enterprise: { id: 'enterprise', name: 'Enterprise & FAANG', count: 0, responses: 0, totalScore: 0, scoredCount: 0 },
    mid_market: { id: 'mid_market', name: 'Growth & Mid-Market', count: 0, responses: 0, totalScore: 0, scoredCount: 0 },
    startup: { id: 'startup', name: 'Seed & Early Startups', count: 0, responses: 0, totalScore: 0, scoredCount: 0 }
  };

  const seen = new Set();
  const all = [...(Array.isArray(applications) ? applications : []), ...(Array.isArray(jobs) ? jobs : [])];

  for (const item of all) {
    if (!item) continue;
    const id = item.id || `${item.company}-${item.title}`;
    if (seen.has(id)) continue;
    seen.add(id);

    const stage = normalizeJobStage(item);
    if (stage === 'wishlist' && !item.applied_at) continue;

    const tier = classifyCompanyTier(item.company);
    tiers[tier].count++;

    if (['screening', 'technical', 'offer'].includes(stage)) {
      tiers[tier].responses++;
    }

    const score = parseFloat(item.ats_match_score || item.score || item.fit_score);
    if (!isNaN(score) && score > 0) {
      tiers[tier].totalScore += score <= 5 ? score * 20 : score;
      tiers[tier].scoredCount++;
    }
  }

  const result = Object.values(tiers).map(t => {
    const responseRate = t.count > 0 ? Number(((t.responses / t.count) * 100).toFixed(1)) : 0;
    const avgScore = t.scoredCount > 0 ? Number((t.totalScore / t.scoredCount).toFixed(1)) : 82.0;
    return {
      ...t,
      responseRate,
      avgScore
    };
  });

  let bestTier = result[0];
  for (const t of result) {
    if (t.responseRate > bestTier.responseRate) {
      bestTier = t;
    }
  }

  return {
    tiers: result,
    highestConvertingTier: bestTier.count > 0 ? bestTier.name : 'N/A'
  };
}

/**
 * Compares candidate's pipeline conversion rates against calibrated tech industry benchmarks.
 *
 * @param {Object} funnelResult - Output from calculateStageFunnel
 * @returns {Object} Comparative analysis results with badge and tips
 */
export function compareAgainstBenchmarks(funnelResult = {}) {
  const rates = funnelResult.conversionRates || {
    appliedToScreen: 0,
    screenToTech: 0,
    techToOffer: 0,
    overallYield: 0
  };

  const candResponse = rates.appliedToScreen || 0;
  const coldBenchmark = INDUSTRY_BENCHMARKS.coldResponseRate;
  const targetBenchmark = INDUSTRY_BENCHMARKS.atsOptimizedResponseRate;

  let rating = 'Needs Calibration';
  let badgeColor = 'var(--warning)';
  let performanceSummary = 'Application response rate is calibrating against cold baseline.';

  if (candResponse >= 18.0) {
    rating = 'Top Decile Performer';
    badgeColor = 'var(--success)';
    performanceSummary = `Your ${candResponse}% callback rate significantly surpasses the ${targetBenchmark}% industry target. ATS tailoring is highly effective.`;
  } else if (candResponse >= targetBenchmark) {
    rating = 'Competitive (Above Target)';
    badgeColor = 'var(--success)';
    performanceSummary = `Your ${candResponse}% response rate matches high-signal ATS-optimized applications.`;
  } else if (candResponse >= coldBenchmark) {
    rating = 'Average Baseline';
    badgeColor = 'var(--accent)';
    performanceSummary = `Your ${candResponse}% rate beats the untargeted cold average (${coldBenchmark}%), but has room to reach the 14.5% target.`;
  } else if (funnelResult.total_dispatched >= 5) {
    rating = 'Needs Keyword Calibration';
    badgeColor = 'var(--danger)';
    performanceSummary = `Current callback velocity (${candResponse}%) is below the industry average (${coldBenchmark}%). Use ATS Resume Studio to tune hard skill keywords.`;
  }

  return {
    rating,
    badgeColor,
    performanceSummary,
    metrics: [
      {
        name: 'Initial Response Rate',
        candidate: candResponse,
        coldBenchmark,
        targetBenchmark,
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'Screen → Technical Conversion',
        candidate: rates.screenToTech,
        coldBenchmark: 25.0,
        targetBenchmark: INDUSTRY_BENCHMARKS.screenToTechRate,
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'Technical → Final Offer',
        candidate: rates.techToOffer,
        coldBenchmark: 15.0,
        targetBenchmark: INDUSTRY_BENCHMARKS.techToOfferRate,
        unit: '%',
        higherIsBetter: true
      },
      {
        name: 'Overall Application Yield',
        candidate: rates.overallYield,
        coldBenchmark: INDUSTRY_BENCHMARKS.coldOfferRate,
        targetBenchmark: INDUSTRY_BENCHMARKS.atsOptimizedOfferRate,
        unit: '%',
        higherIsBetter: true
      }
    ]
  };
}

/**
 * Generates personalized, actionable conversion coaching feedback.
 * Direct diagnosis format:
 * "Your callback rate is X% vs Y% benchmark. Your weakest stage is Z. Here are 3 fixes."
 *
 * @param {Object} funnelResult - Output from calculateStageFunnel
 * @param {Object} benchmarkResult - Output from compareAgainstBenchmarks
 * @returns {Object} Structured coaching payload
 */
export function generateConversionCoaching(funnelResult = {}, benchmarkResult = {}) {
  const rates = funnelResult?.conversionRates || {
    appliedToScreen: 0,
    screenToTech: 0,
    techToOffer: 0,
    overallYield: 0
  };

  const candCallback = rates.appliedToScreen || 0;
  const targetCallback = INDUSTRY_BENCHMARKS.atsOptimizedResponseRate; // 14.5%
  const coldCallback = INDUSTRY_BENCHMARKS.coldResponseRate; // 2.8%

  // Identify the weakest stage
  const stageGaps = [
    {
      key: 'appliedToScreen',
      name: 'Initial Recruiter Screen',
      rate: candCallback,
      benchmark: targetCallback,
      deficit: targetCallback - candCallback,
      fixes: [
        {
          title: 'Target 85%+ ATS Hard-Skill Density',
          detail: 'Screeners filter resumes lacking explicit noun matches for required libraries, frameworks, and tools before human review. Audit each bullet point in ATS Resume Studio.',
          action: 'Audit in ATS Resume Studio'
        },
        {
          title: 'Dispatch Between 8:00 AM – 11:00 AM on Tue / Wed',
          detail: 'Applications submitted Tuesday through Thursday morning experience 3.2x higher first-day recruiter triage rates compared to weekend submissions.',
          action: 'Schedule in Timing Heatmap'
        },
        {
          title: 'Weave Measurable Impact Into Work Bullets',
          detail: 'Replace passive responsibility statements with XYZ formula: "Accomplished [X] as measured by [Y] by doing [Z]". Include latency, RPS, revenue, or team velocity metrics.',
          action: 'Optimize Bullets'
        }
      ]
    },
    {
      key: 'screenToTech',
      name: 'Screen → Technical Round',
      rate: rates.screenToTech || 0,
      benchmark: INDUSTRY_BENCHMARKS.screenToTechRate, // 32.0%
      deficit: INDUSTRY_BENCHMARKS.screenToTechRate - (rates.screenToTech || 0),
      fixes: [
        {
          title: 'Standardize Your 90-Second Elevator Pitch',
          detail: 'Recruiters evaluate clarity and relevance in the first 2 minutes. Structure as: Current role & primary technical scope → 1 standout production win → Why this team specifically.',
          action: 'Rehearse in Prep Center'
        },
        {
          title: 'Prepare 3 Core STAR Behavioral Stories',
          detail: 'Draft concrete anecdotes for architectural disagreement, production incident triage, and cross-functional feature delivery with quantifiable outcomes.',
          action: 'Use Behavioral STAR Prep'
        },
        {
          title: 'Ask 2 High-Signal Architectural Questions',
          detail: 'Conclude screening calls by inquiring about their current technical debt bottlenecks or quarterly roadmap challenges to demonstrate senior practitioner mindset.',
          action: 'Review Company Intel'
        }
      ]
    },
    {
      key: 'techToOffer',
      name: 'Technical Round → Official Offer',
      rate: rates.techToOffer || 0,
      benchmark: INDUSTRY_BENCHMARKS.techToOfferRate, // 22.0%
      deficit: INDUSTRY_BENCHMARKS.techToOfferRate - (rates.techToOffer || 0),
      fixes: [
        {
          title: 'Lead With Systems Design Trade-Offs',
          detail: 'Senior interviewers look for balanced decision-making. Explicitly weigh latency vs consistency, horizontal vs vertical scaling, and operational maintenance overhead.',
          action: 'Practice Technical Screenings'
        },
        {
          title: 'Verify Edge Cases & Time/Space Complexity First',
          detail: 'In live coding and architecture challenges, state inputs/outputs and write test cases before writing code. Talk out loud through invariants and potential pitfalls.',
          action: 'Run Mock Technical Session'
        },
        {
          title: 'Review Company-Specific Interview Blueprints',
          detail: 'Study verified interview loops and timeline patterns in the Prep Center to anticipate screening formats and question archetypes.',
          action: 'Open Company Round Engine'
        }
      ]
    }
  ];

  // Sort descending by deficit (largest gap between candidate and benchmark)
  stageGaps.sort((a, b) => b.deficit - a.deficit);
  const weakest = stageGaps[0];

  const statusTone = candCallback >= targetCallback
    ? 'top_tier'
    : candCallback >= coldCallback
    ? 'average'
    : 'needs_calibration';

  return {
    headline: `Your callback rate is ${candCallback}% vs ${targetCallback}% target benchmark.`,
    callbackRate: candCallback,
    targetBenchmark: targetCallback,
    coldBenchmark: coldCallback,
    weakestStage: weakest.key,
    weakestStageName: weakest.name,
    weakestStageRate: weakest.rate,
    weakestStageBenchmark: weakest.benchmark,
    statusTone,
    coachingMessage: `Your callback rate is ${candCallback}% vs ${targetCallback}% benchmark. Your weakest stage is ${weakest.name} (${weakest.rate}% vs ${weakest.benchmark}% target). Here are 3 prioritized fixes to unlock higher yield:`,
    actionableFixes: weakest.fixes
  };
}
