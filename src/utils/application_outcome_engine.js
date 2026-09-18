/**
 * application_outcome_engine.js
 * ==============================
 * Pure client-side mathematical engine for tracking and analyzing authentic
 * real-world job application outcomes: recruiter reply rates, callback rates,
 * stage progression attrition, turnaround velocity, and outcome attribution.
 *
 * Runs 100% locally with zero server overhead and sovereign client privacy.
 */

export const INDUSTRY_OUTCOME_BENCHMARKS = {
  coldResponseRate: 2.8, // % industry average for cold / generic applications
  atsOptimizedResponseRate: 14.5, // % target response rate for role-tailored ATS applications
  coldCallbackRate: 2.0, // % initial phone screen / recruiter callbacks for cold apps
  atsOptimizedCallbackRate: 12.0, // % recruiter callbacks for keyword-tailored applications
  screenToTechRate: 32.0, // % transition from recruiter screen to technical loop
  techToOfferRate: 22.0, // % transition from technical round to official offer
  coldOfferRate: 0.9, // % overall applied-to-offer rate for cold applications
  atsOptimizedOfferRate: 3.8, // % overall applied-to-offer rate for high-fit applications
  averageTurnaroundDays: 7.5 // average days from application to first recruiter contact
};

export const RECRUITER_PEAK_DAYS = [2, 3, 4]; // Tuesday (2), Wednesday (3), Thursday (4)
export const RECRUITER_PEAK_HOURS = { start: 8, end: 12 }; // 8:00 AM – 12:00 PM local

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
  'weaviate', 'chroma', 'langchain', 'perplexity', 'mistral', 'swiggy', 'razorpay',
  'cred', 'groww', 'meesho', 'browserstack', 'hasura', 'freshworks', 'zerodha'
]);

/**
 * Normalizes an application record into a canonical stage.
 * @param {Object} item
 * @returns {'applied'|'screening'|'technical'|'offer'|'rejected'|'archived'}
 */
export function normalizeApplicationStage(item = {}) {
  if (!item) return 'applied';
  const status = String(item.status || item.stage || item.kanban_stage || '').toLowerCase().trim();

  if (['offer', 'offered', 'completed', 'accepted', 'passed'].includes(status)) {
    return 'offer';
  }
  if (['technical', 'in_progress', 'assessment', 'coding_test', 'onsite', 'tech_interview'].includes(status)) {
    return 'technical';
  }
  if (['screening', 'phone_screen', 'recruiter_screen', 'scheduled', 'interview', 'interviewing'].includes(status)) {
    return 'screening';
  }
  if (['rejected', 'declined', 'failed', 'not_selected'].includes(status)) {
    return 'rejected';
  }
  if (['archived', 'withdrawn', 'closed', 'ghosted'].includes(status)) {
    return 'archived';
  }
  return 'applied';
}

/**
 * Classifies an application's employer into an organizational tier.
 * @param {string} companyName
 * @returns {'enterprise'|'mid_market'|'startup'}
 */
export function classifyEmployerTier(companyName = '') {
  const norm = String(companyName || '').toLowerCase().trim();
  if (!norm) return 'startup';
  if (ENTERPRISE_COMPANIES.has(norm)) return 'enterprise';
  for (const ent of ENTERPRISE_COMPANIES) {
    if (norm.includes(ent)) return 'enterprise';
  }
  if (MID_MARKET_COMPANIES.has(norm)) return 'mid_market';
  for (const mid of MID_MARKET_COMPANIES) {
    if (norm.includes(mid)) return 'mid_market';
  }
  return 'startup';
}

/**
 * Computes comprehensive outcome metrics, real-world response rates,
 * callback conversions, velocity telemetry, and attribution correlations.
 *
 * @param {Array} applications - Submitted applications from storageVault.getApplications()
 * @param {Array} jobs - Scanned jobs from storageVault.getJobs()
 * @returns {Object} Complete outcome analytics payload
 */
export function computeApplicationOutcomes(applications = [], jobs = []) {
  const seenKeys = new Set();
  const allDispatched = [];

  const addDispatched = (list) => {
    if (!Array.isArray(list)) return;
    for (const item of list) {
      if (!item) continue;
      const key = item.id || `${item.company || ''}::${item.title || ''}`;
      if (key && !seenKeys.has(key)) {
        const hasAppliedAt = Boolean(item.applied_at);
        const isDispatchedStatus = ['applied', 'followed_up', 'screening', 'technical', 'offer', 'rejected', 'archived'].includes(String(item.status || item.stage || '').toLowerCase());

        if (hasAppliedAt || isDispatchedStatus) {
          seenKeys.add(key);
          allDispatched.push(item);
        }
      }
    }
  };

  addDispatched(applications);
  addDispatched(jobs);

  const totalDispatched = allDispatched.length;
  const now = Date.now();
  const MS_PER_DAY = 1000 * 3600 * 24;

  let countApplied = 0;
  let countFollowedUp = 0;
  let countScreening = 0;
  let countTechnical = 0;
  let countOffer = 0;
  let countRejected = 0;
  let countArchived = 0;

  let activeAwaitingCount = 0;
  let stalledGhostedCount = 0;

  const turnaroundDaysList = [];
  const awaitingCheckInList = [];

  // Attribution buckets
  const fitScoreAttribution = {
    highFit: { dispatched: 0, responses: 0, callbacks: 0 },
    moderateFit: { dispatched: 0, responses: 0, callbacks: 0 }
  };

  const timingAttribution = {
    peak: { dispatched: 0, responses: 0, callbacks: 0 },
    offPeak: { dispatched: 0, responses: 0, callbacks: 0 }
  };

  const tierAttribution = {
    enterprise: { dispatched: 0, responses: 0, callbacks: 0 },
    mid_market: { dispatched: 0, responses: 0, callbacks: 0 },
    startup: { dispatched: 0, responses: 0, callbacks: 0 }
  };

  for (const item of allDispatched) {
    const stage = normalizeApplicationStage(item);
    const rawAppliedAt = item.applied_at || item.created_at || item.updated_at;
    const appliedTime = rawAppliedAt ? new Date(rawAppliedAt).getTime() : now;
    const daysSinceApplied = Math.max(0, Math.round((now - appliedTime) / MS_PER_DAY));

    const isFollowedUp = item.follow_up_status === 'followed_up' || Boolean(item.followed_up_at) || String(item.status).toLowerCase() === 'followed_up';

    // Outcome classification
    const hasReceivedResponse = ['screening', 'technical', 'offer', 'rejected'].includes(stage) || Boolean(item.response_date);
    const hasPositiveCallback = ['screening', 'technical', 'offer'].includes(stage);

    if (stage === 'offer') {
      countOffer++;
      countTechnical++;
      countScreening++;
    } else if (stage === 'technical') {
      countTechnical++;
      countScreening++;
    } else if (stage === 'screening') {
      countScreening++;
    } else if (stage === 'rejected') {
      countRejected++;
    } else if (stage === 'archived') {
      countArchived++;
    } else {
      if (isFollowedUp) countFollowedUp++;
      else countApplied++;
    }

    // Active vs Stalled
    if (!hasReceivedResponse && stage !== 'rejected' && stage !== 'archived') {
      if (daysSinceApplied <= 14) {
        activeAwaitingCount++;
        awaitingCheckInList.push({
          id: item.id || `${item.company}::${item.title}`,
          title: item.title || 'Role',
          company: item.company || 'Company',
          applied_at: rawAppliedAt || new Date().toISOString(),
          days_ago: daysSinceApplied,
          fit_score: item.ats_match_score || (item.fit_score ? item.fit_score * 20 : 70),
          url: item.url || '',
          stage: stage
        });
      } else {
        stalledGhostedCount++;
      }
    }

    // Turnaround Velocity
    if (hasReceivedResponse) {
      const responseTime = item.response_date
        ? new Date(item.response_date).getTime()
        : (item.updated_at ? new Date(item.updated_at).getTime() : appliedTime);
      const diffDays = Math.max(1, Math.round((responseTime - appliedTime) / MS_PER_DAY));
      turnaroundDaysList.push(diffDays);
    }

    // 1. Fit Score Attribution
    const atsScore = parseFloat(item.ats_match_score) || (item.fit_score ? item.fit_score * 20 : 0);
    const fitBucket = atsScore >= 75 ? fitScoreAttribution.highFit : fitScoreAttribution.moderateFit;
    fitBucket.dispatched++;
    if (hasReceivedResponse) fitBucket.responses++;
    if (hasPositiveCallback) fitBucket.callbacks++;

    // 2. Application Timing Attribution
    const appliedDate = new Date(appliedTime);
    const appliedDay = appliedDate.getDay();
    const appliedHour = appliedDate.getHours();
    const isPeakDay = RECRUITER_PEAK_DAYS.includes(appliedDay);
    const isPeakHour = appliedHour >= RECRUITER_PEAK_HOURS.start && appliedHour <= RECRUITER_PEAK_HOURS.end;
    const timingBucket = (isPeakDay && isPeakHour) ? timingAttribution.peak : timingAttribution.offPeak;
    timingBucket.dispatched++;
    if (hasReceivedResponse) timingBucket.responses++;
    if (hasPositiveCallback) timingBucket.callbacks++;

    // 3. Company Tier Attribution
    const tier = classifyEmployerTier(item.company);
    const tierBucket = tierAttribution[tier] || tierAttribution.startup;
    tierBucket.dispatched++;
    if (hasReceivedResponse) tierBucket.responses++;
    if (hasPositiveCallback) tierBucket.callbacks++;
  }

  // Turnaround calculations
  let avgTurnaroundDays = 0;
  let medianTurnaroundDays = 0;
  if (turnaroundDaysList.length > 0) {
    const sum = turnaroundDaysList.reduce((acc, v) => acc + v, 0);
    avgTurnaroundDays = Number((sum / turnaroundDaysList.length).toFixed(1));
    const sorted = [...turnaroundDaysList].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    medianTurnaroundDays = sorted.length % 2 === 0
      ? Number(((sorted[mid - 1] + sorted[mid]) / 2).toFixed(1))
      : sorted[mid];
  } else {
    avgTurnaroundDays = INDUSTRY_OUTCOME_BENCHMARKS.averageTurnaroundDays;
    medianTurnaroundDays = INDUSTRY_OUTCOME_BENCHMARKS.averageTurnaroundDays;
  }

  // Conversion rates (safe division)
  const safePct = (num, den) => (den > 0 ? Number(((num / den) * 100).toFixed(1)) : 0);

  const responsesReceived = countScreening + countRejected;
  const callbacksReceived = countScreening; // advanced to recruiter screen or technical loop
  const responseRatePct = safePct(responsesReceived, totalDispatched);
  const callbackRatePct = safePct(callbacksReceived, totalDispatched);
  const screenToTechRatePct = safePct(countTechnical, countScreening);
  const techToOfferRatePct = safePct(countOffer, countTechnical);

  // Benchmarking deltas
  const callbackVsColdDelta = Number((callbackRatePct - INDUSTRY_OUTCOME_BENCHMARKS.coldCallbackRate).toFixed(1));
  const callbackVsAtsDelta = Number((callbackRatePct - INDUSTRY_OUTCOME_BENCHMARKS.atsOptimizedCallbackRate).toFixed(1));

  // Attribution rates
  const highFitCallbackRate = safePct(fitScoreAttribution.highFit.callbacks, fitScoreAttribution.highFit.dispatched);
  const modFitCallbackRate = safePct(fitScoreAttribution.moderateFit.callbacks, fitScoreAttribution.moderateFit.dispatched);

  const peakTimingResponseRate = safePct(timingAttribution.peak.responses, timingAttribution.peak.dispatched);
  const offPeakResponseRate = safePct(timingAttribution.offPeak.responses, timingAttribution.offPeak.dispatched);

  // Statistical Significance Flags
  const isProvisional = totalDispatched < 5;
  const isStatisticallySignificant = totalDispatched >= 10;
  const confidenceLabel = isProvisional
    ? 'Early Cohort (provisional significance)'
    : isStatisticallySignificant
      ? 'Statistically Validated'
      : 'Directional Significance';

  // Sort awaiting check-in list by most urgent / recent
  awaitingCheckInList.sort((a, b) => a.days_ago - b.days_ago);

  return {
    totalDispatched,
    activeAwaitingCount,
    stalledGhostedCount,
    responsesReceived,
    callbacksReceived,
    stageCounts: {
      applied: countApplied + countFollowedUp,
      followed_up: countFollowedUp,
      screening: countScreening,
      technical: countTechnical,
      offer: countOffer,
      rejected: countRejected,
      archived: countArchived
    },
    rates: {
      responseRatePct,
      callbackRatePct,
      screenToTechRatePct,
      techToOfferRatePct,
      callbackVsColdDelta,
      callbackVsAtsDelta
    },
    velocity: {
      avgTurnaroundDays,
      medianTurnaroundDays,
      hasRealVelocityData: turnaroundDaysList.length > 0,
      turnaroundDataCount: turnaroundDaysList.length
    },
    attribution: {
      fitScore: {
        highFit: { ...fitScoreAttribution.highFit, callbackRate: highFitCallbackRate },
        moderateFit: { ...fitScoreAttribution.moderateFit, callbackRate: modFitCallbackRate }
      },
      timing: {
        peak: { ...timingAttribution.peak, responseRate: peakTimingResponseRate },
        offPeak: { ...timingAttribution.offPeak, responseRate: offPeakResponseRate }
      },
      tiers: {
        enterprise: { ...tierAttribution.enterprise, callbackRate: safePct(tierAttribution.enterprise.callbacks, tierAttribution.enterprise.dispatched) },
        mid_market: { ...tierAttribution.mid_market, callbackRate: safePct(tierAttribution.mid_market.callbacks, tierAttribution.mid_market.dispatched) },
        startup: { ...tierAttribution.startup, callbackRate: safePct(tierAttribution.startup.callbacks, tierAttribution.startup.dispatched) }
      }
    },
    statisticalConfidence: {
      sampleSize: totalDispatched,
      isProvisional,
      isStatisticallySignificant,
      label: confidenceLabel
    },
    awaitingCheckInList: awaitingCheckInList.slice(0, 8)
  };
}

/**
 * Evaluates the funnel progression and returns a strategic diagnostic insight
 * regarding where the candidate's pipeline is succeeding or bottlenecking.
 *
 * @param {Object} outcomeMetrics - Returned by computeApplicationOutcomes()
 * @returns {Object} { status: 'healthy'|'top_funnel_bottleneck'|'screen_bottleneck'|'tech_bottleneck'|'early_cohort', diagnosis: string, actionItem: string }
 */
export function diagnoseFunnelBottleneck(outcomeMetrics) {
  if (!outcomeMetrics || outcomeMetrics.totalDispatched === 0) {
    return {
      status: 'no_data',
      headline: 'No Active Dispatches in Pipeline',
      diagnosis: 'Your application funnel is currently empty. Dispatch roles from Guided Dispatch to begin measuring real recruiter response rates.',
      actionItem: 'Review high-match roles in Action Required and dispatch your first cohort.'
    };
  }

  const { totalDispatched, rates, statisticalConfidence, stageCounts, velocity } = outcomeMetrics;

  if (statisticalConfidence.isProvisional) {
    return {
      status: 'early_cohort',
      headline: `Early Cohort (${totalDispatched} Dispatched)`,
      diagnosis: `You have submitted ${totalDispatched} ${totalDispatched === 1 ? 'application' : 'applications'}. Industry recruiters typically take 5–9 business days to review. Statistical metrics will solidify once your cohort reaches 10 submissions.`,
      actionItem: 'Batch-dispatch 5 more tailored roles in your target discipline this week to establish statistical significance.'
    };
  }

  // 1. Top of Funnel Bottleneck (Low response rate)
  if (rates.callbackRatePct < INDUSTRY_OUTCOME_BENCHMARKS.coldCallbackRate) {
    return {
      status: 'top_funnel_bottleneck',
      headline: 'Top-of-Funnel Conversion Bottleneck',
      diagnosis: `Your recruiter callback rate (${rates.callbackRatePct}%) is trailing the cold benchmark (${INDUSTRY_OUTCOME_BENCHMARKS.coldCallbackRate}%). Resumes are likely getting filtered by ATS scanners before human eyes review them.`,
      actionItem: 'Audit your single-column resume templates in ATS Resume Studio and ensure high-frequency skill keywords match JD specifications.'
    };
  }

  // 2. Screening to Technical Bottleneck (Getting screens but dropping before technical round)
  if (stageCounts.screening >= 2 && rates.screenToTechRatePct < 25.0) {
    return {
      status: 'screen_bottleneck',
      headline: 'Screen-to-Interview Conversion Bottleneck',
      diagnosis: `You are successfully securing initial recruiter phone screens (${stageCounts.screening} callbacks), but converting only ${rates.screenToTechRatePct}% into technical rounds (industry benchmark: 32%).`,
      actionItem: 'Practice your 90-second behavioral elevator pitch and align your compensation and work authorization responses.'
    };
  }

  // 3. Technical to Offer Bottleneck (Passing screens, failing technical loop)
  if (stageCounts.technical >= 2 && rates.techToOfferRatePct < 15.0) {
    return {
      status: 'tech_bottleneck',
      headline: 'Technical Loop Attrition Bottleneck',
      diagnosis: `You have advanced to ${stageCounts.technical} technical loops, but are encountering drop-off before formal offer extension.`,
      actionItem: 'Spend 20 minutes in Interview Prep Studio drilling system design trade-offs and live algorithmic problem solving.'
    };
  }

  // 4. Healthy / Outperforming Funnel
  return {
    status: 'healthy',
    headline: 'High-Velocity Outperforming Funnel',
    diagnosis: `Your recruiter callback rate (${rates.callbackRatePct}%) outperforms the cold baseline (${INDUSTRY_OUTCOME_BENCHMARKS.coldCallbackRate}%) by +${rates.callbackVsColdDelta}%. Applications average ${velocity.avgTurnaroundDays} days to first response.`,
    actionItem: 'Maintain your current dispatch cadence and prioritize companies matching your highest-converting employer tiers.'
  };
}
