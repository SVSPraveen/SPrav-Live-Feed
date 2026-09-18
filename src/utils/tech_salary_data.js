/**
 * tech_salary_data.js
 * ====================
 * Compensation intelligence, percentile distribution models,
 * location adjustment multipliers, and negotiation risk analysis.
 */

import { 
  COMP_BENCHMARKS, 
  detectRoleCategory, 
  detectSeniority, 
  detectGeoTier, 
  benchmarkJobSalary,
  CURRENCY_CONFIG,
  GEO_DEFAULT_CURRENCY,
  formatSalaryCurrency,
  parseSalaryInput,
  convertSalaryToUsd,
  convertSalaryFromUsd,
  SALARY_CALIBRATION_METADATA,
  getSalaryCalibrationDisclaimer
} from './salary_benchmark_engine.js';

export {
  CURRENCY_CONFIG,
  GEO_DEFAULT_CURRENCY,
  formatSalaryCurrency,
  parseSalaryInput,
  convertSalaryToUsd,
  convertSalaryFromUsd,
  SALARY_CALIBRATION_METADATA,
  getSalaryCalibrationDisclaimer
};


export const LEVEL_LABELS = {
  entry: 'L3 / Junior (0-2 YOE)',
  mid: 'L4 / Mid-Level (2-5 YOE)',
  senior: 'L5 / Senior (5-9 YOE)',
  staff: 'L6 / Staff (10-12 YOE)',
  principal: 'L7 / Principal & Fellow (12+ YOE)'
};

export const GEO_LABELS = {
  us_tier1: 'US Tier 1 (SF Bay Area, NYC, Seattle)',
  us_remote: 'US Remote / National Baseline',
  europe: 'Europe (Berlin, Amsterdam, Paris, Dublin)',
  uk: 'United Kingdom (London, Cambridge)',
  canada: 'Canada (Toronto, Vancouver, Montreal)',
  india: 'India Tech Hubs (Bangalore, Hyderabad, Pune, NCR)',
  apac: 'APAC (Singapore, Sydney, Tokyo, Seoul)',
  latam: 'Latin America (São Paulo, Mexico City, Bogotá)'
};

export const ROLE_LABELS = {
  software_engineer: 'Full Stack / Backend Engineer',
  frontend_engineer: 'Frontend / UI Engineer',
  ai_ml_engineer: 'AI / Machine Learning Engineer',
  devops_sre: 'DevOps / SRE / Cloud Platform',
  data_engineer: 'Data / Analytics Engineer',
  cybersecurity_engineer: 'Cybersecurity / AppSec',
  mobile_engineer: 'Mobile Engineer (iOS / Android)',
  qa_sdet: 'QA Automation / SDET',
  embedded_firmware: 'Embedded Systems / Firmware',
  product_manager: 'Product Manager (Technical)',
  engineering_manager: 'Engineering Manager / Director'
};

export const LOCATION_MULTIPLIERS = [
  { key: 'bay_area', label: 'San Francisco Bay Area', multiplier: 1.00, geoTier: 'us_tier1', metro: 'SF Bay Area / Silicon Valley' },
  { key: 'nyc', label: 'New York City Metro', multiplier: 0.98, geoTier: 'us_tier1', metro: 'New York City' },
  { key: 'seattle', label: 'Seattle / Bellevue', multiplier: 0.95, geoTier: 'us_tier1', metro: 'Greater Seattle' },
  { key: 'austin', label: 'Austin / Dallas (TX)', multiplier: 0.88, geoTier: 'us_remote', metro: 'Texas Tech Hubs' },
  { key: 'us_remote', label: 'US Remote / National Avg', multiplier: 0.85, geoTier: 'us_remote', metro: 'US Nationwide' },
  { key: 'uk_london', label: 'United Kingdom (London)', multiplier: 0.75, geoTier: 'uk', metro: 'UK & London' },
  { key: 'canada_tech', label: 'Canada (Toronto / Vancouver)', multiplier: 0.72, geoTier: 'canada', metro: 'Canada Hubs' },
  { key: 'europe_tier1', label: 'Europe (Berlin / Amsterdam)', multiplier: 0.65, geoTier: 'europe', metro: 'Western Europe' },
  { key: 'apac_hubs', label: 'APAC (Singapore / Sydney)', multiplier: 0.62, geoTier: 'apac', metro: 'APAC Tier 1' },
  { key: 'latam_hubs', label: 'Latin America (São Paulo / CDMX)', multiplier: 0.35, geoTier: 'latam', metro: 'LatAm Tech Hubs' },
  { key: 'india_tech', label: 'India Tech Hubs (Bengaluru / Hyd)', multiplier: 0.28, geoTier: 'india', metro: 'India Tech Hubs' }
];

export const COL_INDEX = {
  bay_area: 1.45,
  nyc: 1.40,
  seattle: 1.25,
  austin: 1.00,
  us_remote: 1.00,
  uk_london: 1.20,
  canada_tech: 1.05,
  europe_tier1: 0.95,
  apac_hubs: 1.30,
  latam_hubs: 0.65,
  india_tech: 0.40
};

/**
 * Splits total compensation into typical tech package slices (Base, Equity, Bonus).
 */
export function estimateCompBreakdown(totalComp = 150000, seniority = 'mid') {
  const comp = Math.max(20000, Number(totalComp) || 150000);
  let basePct = 0.70;
  let equityPct = 0.20;
  let bonusPct = 0.10;

  if (seniority === 'entry') {
    basePct = 0.80;
    equityPct = 0.12;
    bonusPct = 0.08;
  } else if (seniority === 'senior') {
    basePct = 0.60;
    equityPct = 0.25;
    bonusPct = 0.15;
  } else if (seniority === 'staff') {
    basePct = 0.50;
    equityPct = 0.35;
    bonusPct = 0.15;
  } else if (seniority === 'principal') {
    basePct = 0.40;
    equityPct = 0.45;
    bonusPct = 0.15;
  }

  const base = Math.round((comp * basePct) / 1000) * 1000;
  const equity = Math.round((comp * equityPct) / 1000) * 1000;
  const bonus = comp - base - equity;

  return {
    totalComp: comp,
    base,
    equity,
    bonus,
    basePct: Math.round(basePct * 100),
    equityPct: Math.round(equityPct * 100),
    bonusPct: Math.round(bonusPct * 100)
  };
}

/**
 * Returns full P25, P50, P75, P90 percentile distribution with package splits and currency localization.
 */
export function getCompensationCurve(roleCategory = 'software_engineer', seniority = 'mid', geoTier = 'us_tier1', currency = null) {
  const activeCurrency = currency || GEO_DEFAULT_CURRENCY[geoTier] || 'USD';
  const roleTable = COMP_BENCHMARKS[roleCategory] || COMP_BENCHMARKS.software_engineer;
  
  let levelTable = roleTable[seniority];
  let isPrincipal = false;
  if (!levelTable && seniority === 'principal') {
    levelTable = roleTable.staff || roleTable.senior;
    isPrincipal = true;
  } else if (!levelTable) {
    levelTable = roleTable.mid;
  }

  let [p25, p50, p75] = levelTable[geoTier] || levelTable.us_remote;
  if (isPrincipal) {
    p25 = Math.round((p25 * 1.25) / 1000) * 1000;
    p50 = Math.round((p50 * 1.30) / 1000) * 1000;
    p75 = Math.round((p75 * 1.35) / 1000) * 1000;
  }

  const p90 = Math.round((p75 * 1.25) / 1000) * 1000;

  const buildPercentileObj = (valUsd) => {
    const localVal = convertSalaryFromUsd(valUsd, activeCurrency);
    const breakdown = estimateCompBreakdown(localVal, seniority);
    return {
      total: localVal,
      totalUsd: valUsd,
      formatted: formatSalaryCurrency(valUsd, activeCurrency),
      formattedFull: formatSalaryCurrency(valUsd, activeCurrency, { compact: false }),
      currency: activeCurrency,
      currencySymbol: CURRENCY_CONFIG[activeCurrency]?.symbol || '$',
      ...breakdown
    };
  };

  return {
    roleCategory,
    seniority,
    geoTier,
    currency: activeCurrency,
    currencySymbol: CURRENCY_CONFIG[activeCurrency]?.symbol || '$',
    percentiles: {
      p25: buildPercentileObj(p25),
      p50: buildPercentileObj(p50),
      p75: buildPercentileObj(p75),
      p90: buildPercentileObj(p90)
    },
    raw: [p25, p50, p75, p90],
    rawLocal: [
      convertSalaryFromUsd(p25, activeCurrency),
      convertSalaryFromUsd(p50, activeCurrency),
      convertSalaryFromUsd(p75, activeCurrency),
      convertSalaryFromUsd(p90, activeCurrency)
    ],
    rangeLabel: `${formatSalaryCurrency(p25, activeCurrency)} – ${formatSalaryCurrency(p90, activeCurrency)}`
  };
}

/**
 * Evaluates where a specific total offer sits relative to the compensation curve.
 */
export function getOfferPositionInBand(offerAmount, roleCategory = 'software_engineer', seniority = 'mid', geoTier = 'us_tier1', currency = null) {
  const activeCurrency = currency || GEO_DEFAULT_CURRENCY[geoTier] || 'USD';
  const curve = getCompensationCurve(roleCategory, seniority, geoTier, activeCurrency);
  const [p25Usd, p50Usd, p75Usd, p90Usd] = curve.raw;
  const [p25Local, p50Local, p75Local, p90Local] = curve.rawLocal;

  let rawNum = typeof offerAmount === 'string' ? parseSalaryInput(offerAmount, activeCurrency) : Number(offerAmount);
  if (!rawNum) rawNum = p50Local;

  // Convert to USD for curve percentile evaluation
  const offerUsd = activeCurrency === 'USD' ? rawNum : convertSalaryToUsd(rawNum, activeCurrency);
  const offerLocal = rawNum;

  let percentile = 50;
  let positionLabel = 'At Market Median';
  let tierBadge = 'at_market';
  let color = '#10b981'; // green

  if (offerUsd < p25Usd) {
    percentile = Math.max(5, Math.round((offerUsd / p25Usd) * 25));
    positionLabel = `Below 25th Percentile (${formatSalaryCurrency(p25Usd, activeCurrency)})`;
    tierBadge = 'below_market';
    color = '#f59e0b'; // amber
  } else if (offerUsd < p50Usd) {
    percentile = Math.round(25 + ((offerUsd - p25Usd) / (p50Usd - p25Usd)) * 25);
    positionLabel = 'Lower Market Half (P25–P50)';
    tierBadge = 'lower_market';
    color = '#06b6d4'; // cyan
  } else if (offerUsd < p75Usd) {
    percentile = Math.round(50 + ((offerUsd - p50Usd) / (p75Usd - p50Usd)) * 25);
    positionLabel = 'Competitive Upper Half (P50–P75)';
    tierBadge = 'upper_market';
    color = '#3b82f6'; // blue
  } else if (offerUsd < p90Usd) {
    percentile = Math.round(75 + ((offerUsd - p75Usd) / (p90Usd - p75Usd)) * 15);
    positionLabel = 'Top Quartile (P75–P90)';
    tierBadge = 'top_quartile';
    color = '#8b5cf6'; // purple
  } else {
    percentile = Math.min(99, Math.round(90 + ((offerUsd - p90Usd) / p90Usd) * 9));
    positionLabel = 'Top Tier Elite (P90+)';
    tierBadge = 'elite';
    color = '#ec4899'; // pink
  }

  // Realistic upside target (P75 for below/median, P90 for high performers)
  const targetUpsideUsd = offerUsd < p75Usd ? p75Usd : p90Usd;
  const upsideDollarsUsd = Math.max(0, targetUpsideUsd - offerUsd);
  const upsideLocal = convertSalaryFromUsd(upsideDollarsUsd, activeCurrency);
  const upsidePercent = offerUsd > 0 ? Math.round((upsideDollarsUsd / offerUsd) * 100) : 0;

  return {
    offer: offerLocal,
    offerUsd,
    percentile,
    positionLabel,
    tierBadge,
    color,
    p25: p25Local,
    p50: p50Local,
    p75: p75Local,
    p90: p90Local,
    curve,
    upsideDollars: upsideLocal,
    upsidePercent,
    targetUpsideComp: convertSalaryFromUsd(targetUpsideUsd, activeCurrency),
    currency: activeCurrency,
    currencySymbol: CURRENCY_CONFIG[activeCurrency]?.symbol || '$',
    formattedUpside: formatSalaryCurrency(upsideDollarsUsd, activeCurrency),
    upsideSummary: upsideDollarsUsd > 0
      ? `+${formatSalaryCurrency(upsideDollarsUsd, activeCurrency)} (${upsidePercent}%) realistic upside potential to reach ${offerUsd < p75Usd ? 'P75 market top quartile' : 'P90 top band'}.`
      : 'Your offer is currently at or above the 90th percentile top band.'
  };
}

/**
 * Assesses the risk of offer withdrawal based on counter-offer aggressiveness and leverage.
 */
export function calculateRiskAssessment(offerAmount = 140000, counterTarget = 160000, leverageFlags = {}) {
  const offer = Number(offerAmount) || 140000;
  const counter = Number(counterTarget) || offer;
  const delta = Math.max(0, counter - offer);
  const deltaPercent = offer > 0 ? Math.round((delta / offer) * 100) : 0;

  const { hasCompetingOffer, isEmployed, uniqueDomain, relocationRequired } = leverageFlags;

  // Base risk starts proportional to counter aggressiveness
  let riskScore = 5; // standard polite negotiation has ~5% inherent baseline risk
  if (deltaPercent <= 7) {
    riskScore = 5;
  } else if (deltaPercent <= 15) {
    riskScore = 10;
  } else if (deltaPercent <= 25) {
    riskScore = 22;
  } else if (deltaPercent <= 40) {
    riskScore = 42;
  } else {
    riskScore = 65;
  }

  // Deduct risk if candidate has leverage
  if (hasCompetingOffer) riskScore = Math.max(4, riskScore - 12);
  if (uniqueDomain) riskScore = Math.max(4, riskScore - 6);
  if (isEmployed) riskScore = Math.max(4, riskScore - 4);
  if (relocationRequired) riskScore = Math.max(4, riskScore - 3);

  let riskLevel = 'low';
  let badgeColor = '#10b981'; // green
  let advice = 'Low risk. Asking within 10-15% with professional framing is standard industry practice and almost never results in offer rescission.';

  if (riskScore > 35) {
    riskLevel = 'elevated';
    badgeColor = '#ef4444'; // red
    advice = 'Elevated risk. Countering >25% above initial offer can strain goodwill unless anchored by a verified competing offer. Consider splitting the counter between base and signing bonus.';
  } else if (riskScore > 18) {
    riskLevel = 'moderate';
    badgeColor = '#f59e0b'; // amber
    advice = 'Moderate risk. Anchor firmly on specific technical impact and market benchmarks. Provide an exact figure where you will sign immediately to build confidence.';
  }

  // Count leverage points
  const activeLeverageCount = [hasCompetingOffer, isEmployed, uniqueDomain, relocationRequired].filter(Boolean).length;
  const leverageRating = activeLeverageCount >= 3 ? 'Strong' : activeLeverageCount >= 1 ? 'Moderate' : 'Baseline';

  return {
    riskScore,
    riskLevel,
    badgeColor,
    deltaPercent,
    deltaDollars: delta,
    leverageRating,
    activeLeverageCount,
    advice,
    withdrawalProbability: `${riskScore}% probability of adverse pushback / rescission risk`
  };
}

/**
 * Calculates current salary lift and qualitative gain rating.
 */
export function calculateSalaryLift(currentSalary = 0, newOffer = 0) {
  const current = Number(currentSalary) || 0;
  const offer = Number(newOffer) || 0;
  if (!current || current <= 0 || !offer || offer <= 0) {
    return null;
  }
  const delta = offer - current;
  const deltaPercent = Math.round((delta / current) * 100);

  let rating = 'Solid Gain';
  let badgeColor = '#10b981'; // emerald
  let warning = null;

  if (delta < 0) {
    rating = 'Pay Cut Risk';
    badgeColor = '#ef4444'; // red
    warning = 'This offer is below your current compensation baseline. Strong counter required.';
  } else if (deltaPercent < 10) {
    rating = 'Lateral Move (<10%)';
    badgeColor = '#f59e0b'; // amber
    warning = 'Modest increase under 10%. Factor in lost unvested equity and new onboarding risks.';
  } else if (deltaPercent < 20) {
    rating = 'Moderate Gain (10–20%)';
    badgeColor = '#06b6d4'; // cyan
  } else if (deltaPercent < 35) {
    rating = 'Strong Upgrade (20–35%)';
    badgeColor = '#3b82f6'; // blue
  } else {
    rating = 'Transformative Jump (>35%)';
    badgeColor = '#8b5cf6'; // purple
  }

  return {
    current,
    offer,
    delta,
    deltaPercent,
    rating,
    badgeColor,
    warning,
    summary: `${delta >= 0 ? '+' : '-'}$${Math.abs(Math.round(delta / 1000))}k (${deltaPercent >= 0 ? '+' : ''}${deltaPercent}%) vs current salary`
  };
}

/**
 * Builds side-by-side competing offer comparison with Cost of Living adjustments.
 */
export function buildCompetingOfferMatrix(primaryOffer = {}, competingOffer = {}) {
  const pBase = Number(primaryOffer.base) || 0;
  const pEquity = Number(primaryOffer.equity) || 0;
  const pBonus = Number(primaryOffer.bonus) || 0;
  const pSigning = Number(primaryOffer.signing) || 0;
  const pAnnualTotal = pBase + pEquity + pBonus;
  const pFirstYear = pAnnualTotal + pSigning;
  const pCol = COL_INDEX[primaryOffer.locationKey] || 1.0;
  const pColAdjusted = Math.round(pAnnualTotal / pCol);

  const cBase = Number(competingOffer.base) || 0;
  const cEquity = Number(competingOffer.equity) || 0;
  const cBonus = Number(competingOffer.bonus) || 0;
  const cSigning = Number(competingOffer.signing) || 0;
  const cAnnualTotal = cBase + cEquity + cBonus;
  const cFirstYear = cAnnualTotal + cSigning;
  const cCol = COL_INDEX[competingOffer.locationKey] || 1.0;
  const cColAdjusted = Math.round(cAnnualTotal / cCol);

  const deltaAnnual = cAnnualTotal - pAnnualTotal;
  const deltaFirstYear = cFirstYear - pFirstYear;
  const deltaCol = cColAdjusted - pColAdjusted;

  const winner = deltaAnnual > 0 ? (competingOffer.company || 'Competing') : (primaryOffer.company || 'Primary');

  return {
    primary: {
      company: primaryOffer.company || 'Primary Offer',
      base: pBase,
      equity: pEquity,
      bonus: pBonus,
      signing: pSigning,
      annualTotal: pAnnualTotal,
      firstYear: pFirstYear,
      colFactor: pCol,
      colAdjusted: pColAdjusted
    },
    competing: {
      company: competingOffer.company || 'Competing Offer',
      base: cBase,
      equity: cEquity,
      bonus: cBonus,
      signing: cSigning,
      annualTotal: cAnnualTotal,
      firstYear: cFirstYear,
      colFactor: cCol,
      colAdjusted: cColAdjusted
    },
    deltaAnnual,
    deltaFirstYear,
    deltaCol,
    winner,
    summary: deltaAnnual !== 0
      ? `${winner} leads by $${Math.abs(Math.round(deltaAnnual / 1000))}k in annual total compensation ($${Math.abs(Math.round(deltaCol / 1000))}k COL-adjusted).`
      : 'Both offers are identical in nominal annual total compensation.'
  };
}

/**
 * Builds live phone negotiation objection handlers for recruiters.
 */
export function buildNegotiationTalkingPoints({
  roleTitle = 'Software Engineer',
  companyName = 'Company',
  offerAmount = 140000,
  counterTarget = 160000,
  competingCompany = '',
  competingAmount = 0,
  leveragePoints = {}
} = {}) {
  const deltaK = Math.round(Math.max(0, counterTarget - offerAmount) / 1000);
  const counterK = Math.round(counterTarget / 1000);
  const offerK = Math.round(offerAmount / 1000);

  return [
    {
      objection: "This offer is already at the very top of our approved salary band.",
      context: "Recruiters use this standard anchor to test your resolve and protect company budget.",
      counterResponse: `\"I completely understand internal salary band structures. Given my specific background in this domain, could we explore flexibility in one-time signing bonus or initial equity grant to bridge the $${deltaK}k difference? Alternatively, can we formalize a performance milestone review at 6 months to adjust base?\"`,
      keyPrinciple: "Acknowledge the band constraint, then pivot immediately to alternate currency (signing bonus, equity, early review)."
    },
    {
      objection: "We don't negotiate equity grants / our equity formula is standardized across all incoming engineers.",
      context: "Recruiters claim equity tiers are non-negotiable to prevent grant escalation.",
      counterResponse: `\"I respect standard equity guidelines for internal fairness. If the initial RSU grant formula cannot be modified, can we bridge to my total compensation target of $${counterK}k by adjusting base salary or adding a $${deltaK}k signing bonus to achieve the intended annual target?\"`,
      keyPrinciple: "Don't fight the equity formula; redirect the dollar shortfall to base cash or a signing bonus."
    },
    {
      objection: "Our equity package and growth upside will easily make up for the base salary difference.",
      context: "Used to redirect focus from guaranteed cash to speculative future valuation.",
      counterResponse: `\"I'm very bullish on ${companyName}'s growth and that's a primary reason I'm eager to join. However, base salary represents predictable day-to-day compensation. If we can get base to $${counterK}k, I will sign and return the offer letter within 24 hours.\"`,
      keyPrinciple: "Separate guaranteed cash from speculative equity while offering an immediate commitment clause."
    },
    {
      objection: "What other numbers or competing offers are you considering?",
      context: "Recruiters seeking information leverage to calibrate their absolute minimum bump.",
      counterResponse: competingCompany && competingAmount > 0
        ? `\"I am currently evaluating a competing offer from ${competingCompany} offering $${Math.round(competingAmount / 1000)}k total compensation. However, ${companyName} is my top choice because of the engineering team and product mission. If you can meet $${counterK}k, I will decline the other process and commit here.\" `
        : `\"I am in late stages with a couple of other teams where discussions are around the $${counterK}k mark. However, ${companyName} is genuinely my number one choice. If we can reach $${counterK}k here, I'm ready to close out all other processes today.\"`,
      keyPrinciple: "Reaffirm company preference, state the target firmly, and offer to end other processes immediately upon acceptance."
    },
    {
      objection: "We have other strong candidates in final rounds who are ready to accept this offer.",
      context: "Scarcity pressure tactic to induce FOMO and accelerate acceptance.",
      counterResponse: `\"I respect that you have great candidates, and I appreciate your transparency. I want to make this an easy decision for both of us—I'm not looking to engage in endless back-and-forth. If you can secure approval for $${counterK}k base, consider the position filled today.\"`,
      keyPrinciple: "Don't panic or concede. Re-anchor on mutual value and reiterate readiness to sign today."
    }
  ];
}
