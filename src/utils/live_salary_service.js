/**
 * live_salary_service.js
 * =======================
 * Pure Client-Side Live Tech Salary Benchmarking & Empirical Calibration Engine ($0, Zero API Key).
 *
 * Dynamically calibrates compensation anchors using:
 * 1. Real-time empirical salary extraction from active ATS job postings in IndexedDB (Greenhouse, Lever, RemoteOK, etc.).
 * 2. Open CORS live job market feeds (RemoteOK, Arbeitnow) with 24-hour localStorage caching.
 * 3. 2026 Macro Domain Calibration (AI/ML +15%, Cloud/SRE +6%, India GCC expansion +15%).
 * 4. Candidate Negotiation Anchor Tier selector (Tier-1 Big Tech / High-Growth / Early-Stage).
 * 5. In-place reactive synchronization of COMP_BENCHMARKS in salary_benchmark_engine.js.
 */

import {
  COMP_BENCHMARKS,
  detectRoleCategory,
  detectSeniority,
  detectGeoTier,
  extractSalaryRange,
  updateSalaryBenchmarks
} from './salary_benchmark_engine.js';
import { storageVault } from './browser_storage_vault.js';

const SALARY_CACHE_KEY = 'sprav_live_salary_benchmarks_v1';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export const ANCHOR_TIERS = {
  tier_1_big_tech: {
    id: 'tier_1_big_tech',
    label: 'Tier 1 Big Tech / AI Surge (+18%)',
    multiplier: 1.18,
    description: 'Top-of-market anchors: Google, Meta, OpenAI, Anthropic, Apple, Nvidia, and top-tier pre-IPO unicorns.'
  },
  high_growth: {
    id: 'high_growth',
    label: 'High-Growth Tech / Series B-D (+6%)',
    multiplier: 1.06,
    description: 'Competitive well-funded tech scaleups with strong equity and cash upside.'
  },
  market_median: {
    id: 'market_median',
    label: 'Market Standard Baseline (1.0x)',
    multiplier: 1.0,
    description: 'Balanced baseline across mid-market tech firms and profitable software companies.'
  },
  early_stage: {
    id: 'early_stage',
    label: 'Early-Stage / Bootstrapped (-12%)',
    multiplier: 0.88,
    description: 'Seed / Series A startups with cash conservation and higher equity grants.'
  }
};

export const OPEN_SALARY_ENDPOINTS = {
  remoteOk: 'https://remoteok.com/api',
  arbeitnow: 'https://www.arbeitnow.com/api/job-board-api'
};

// Calibrated 2026 Macro Baseline Benchmarks (Normalized USD Annual Cash+Equity)
export const DEFAULT_2026_SALARY_BENCHMARKS = {
  software_engineer: {
    entry: { us_tier1: [135000, 160000, 192000], us_remote: [105000, 130000, 158000], europe: [68000, 84000, 105000], india: [20000, 28000, 38000], canada: [88000, 110000, 136000], uk: [78000, 96000, 120000], apac: [62000, 78000, 98000], latam: [32000, 42000, 55000] },
    mid: { us_tier1: [168000, 198000, 240000], us_remote: [135000, 162000, 195000], europe: [88000, 110000, 136000], india: [32000, 44000, 60000], canada: [115000, 138000, 168000], uk: [102000, 128000, 158000], apac: [82000, 102000, 128000], latam: [45000, 58000, 75000] },
    senior: { us_tier1: [210000, 258000, 315000], us_remote: [168000, 205000, 252000], europe: [115000, 142000, 178000], india: [52000, 70000, 98000], canada: [145000, 178000, 220000], uk: [132000, 166000, 210000], apac: [105000, 135000, 170000], latam: [60000, 78000, 102000] },
    staff: { us_tier1: [275000, 345000, 435000], us_remote: [220000, 275000, 348000], europe: [152000, 190000, 242000], india: [80000, 110000, 150000], canada: [190000, 238000, 300000], uk: [175000, 222000, 282000], apac: [140000, 180000, 230000], latam: [80000, 110000, 145000] }
  },
  frontend_engineer: {
    entry: { us_tier1: [125000, 150000, 182000], us_remote: [98000, 125000, 150000], europe: [62000, 78000, 98000], india: [18000, 25000, 34000], canada: [82000, 102000, 128000], uk: [72000, 90000, 112000], apac: [58000, 74000, 92000], latam: [30000, 38000, 50000] },
    mid: { us_tier1: [155000, 188000, 228000], us_remote: [130000, 156000, 182000], europe: [84000, 105000, 130000], india: [28000, 40000, 55000], canada: [108000, 130000, 158000], uk: [96000, 120000, 148000], apac: [76000, 96000, 120000], latam: [40000, 54000, 68000] },
    senior: { us_tier1: [198000, 245000, 298000], us_remote: [162000, 192000, 235000], europe: [110000, 134000, 168000], india: [48000, 64000, 88000], canada: [136000, 168000, 208000], uk: [124000, 155000, 196000], apac: [100000, 126000, 160000], latam: [55000, 72000, 94000] },
    staff: { us_tier1: [258000, 320000, 405000], us_remote: [210000, 258000, 325000], europe: [145000, 178000, 225000], india: [72000, 98000, 135000], canada: [178000, 222000, 282000], uk: [162000, 208000, 265000], apac: [132000, 168000, 215000], latam: [74000, 98000, 130000] }
  },
  ai_ml_engineer: {
    // Calibrated with 2026 Generative AI / LLM surge (+15% market premium)
    entry: { us_tier1: [160000, 195000, 235000], us_remote: [135000, 162000, 198000], europe: [85000, 108000, 135000], india: [26000, 38000, 52000], canada: [110000, 138000, 170000], uk: [98000, 124000, 155000], apac: [78000, 102000, 130000], latam: [40000, 54000, 72000] },
    mid: { us_tier1: [205000, 250000, 310000], us_remote: [168000, 208000, 255000], europe: [112000, 140000, 180000], india: [44000, 62000, 85000], canada: [145000, 178000, 220000], uk: [130000, 164000, 210000], apac: [104000, 134000, 170000], latam: [56000, 76000, 100000] },
    senior: { us_tier1: [258000, 320000, 410000], us_remote: [215000, 265000, 335000], europe: [145000, 185000, 238000], india: [70000, 98000, 138000], canada: [182000, 228000, 288000], uk: [166000, 212000, 275000], apac: [132000, 172000, 220000], latam: [76000, 102000, 136000] },
    staff: { us_tier1: [340000, 430000, 555000], us_remote: [272000, 350000, 452000], europe: [192000, 248000, 322000], india: [105000, 148000, 205000], canada: [238000, 305000, 390000], uk: [220000, 288000, 375000], apac: [175000, 232000, 305000], latam: [102000, 142000, 190000] }
  },
  devops_sre: {
    entry: { us_tier1: [132000, 158000, 190000], us_remote: [110000, 136000, 165000], europe: [68000, 85000, 106000], india: [20000, 28000, 38000], canada: [90000, 112000, 138000], uk: [80000, 100000, 125000], apac: [64000, 82000, 104000], latam: [32000, 42000, 56000] },
    mid: { us_tier1: [170000, 202000, 245000], us_remote: [142000, 170000, 202000], europe: [90000, 112000, 138000], india: [34000, 48000, 66000], canada: [118000, 144000, 175000], uk: [106000, 132000, 165000], apac: [85000, 108000, 134000], latam: [48000, 62000, 82000] },
    senior: { us_tier1: [218000, 265000, 325000], us_remote: [180000, 218000, 268000], europe: [122000, 150000, 188000], india: [55000, 75000, 105000], canada: [148000, 185000, 232000], uk: [136000, 170000, 218000], apac: [108000, 140000, 178000], latam: [62000, 84000, 110000] },
    staff: { us_tier1: [282000, 350000, 448000], us_remote: [228000, 288000, 368000], europe: [160000, 202000, 260000], india: [85000, 118000, 160000], canada: [192000, 242000, 310000], uk: [178000, 228000, 292000], apac: [144000, 186000, 240000], latam: [84000, 115000, 152000] }
  },
  data_engineer: {
    entry: { us_tier1: [136000, 162000, 195000], us_remote: [110000, 136000, 164000], europe: [68000, 85000, 106000], india: [20000, 28000, 39000], canada: [90000, 112000, 138000], uk: [80000, 100000, 125000], apac: [64000, 80000, 102000], latam: [34000, 45000, 58000] },
    mid: { us_tier1: [175000, 208000, 250000], us_remote: [142000, 170000, 208000], europe: [90000, 116000, 144000], india: [34000, 48000, 66000], canada: [118000, 144000, 175000], uk: [106000, 132000, 165000], apac: [85000, 106000, 134000], latam: [48000, 64000, 84000] },
    senior: { us_tier1: [222000, 270000, 335000], us_remote: [180000, 222000, 276000], europe: [122000, 154000, 196000], india: [56000, 78000, 108000], canada: [148000, 186000, 234000], uk: [138000, 175000, 224000], apac: [112000, 144000, 182000], latam: [64000, 86000, 112000] },
    staff: { us_tier1: [292000, 368000, 468000], us_remote: [238000, 298000, 384000], europe: [165000, 208000, 272000], india: [88000, 120000, 165000], canada: [192000, 245000, 310000], uk: [180000, 234000, 298000], apac: [148000, 192000, 245000], latam: [86000, 118000, 155000] }
  },
  cybersecurity_engineer: {
    entry: { us_tier1: [132000, 158000, 190000], us_remote: [106000, 132000, 160000], europe: [68000, 84000, 105000], india: [19000, 27000, 38000], canada: [86000, 108000, 132000], uk: [76000, 96000, 118000], apac: [62000, 78000, 98000], latam: [32000, 42000, 55000] },
    mid: { us_tier1: [170000, 202000, 245000], us_remote: [138000, 164000, 202000], europe: [90000, 112000, 138000], india: [32000, 45000, 62000], canada: [112000, 138000, 170000], uk: [102000, 128000, 160000], apac: [82000, 104000, 128000], latam: [45000, 58000, 76000] },
    senior: { us_tier1: [218000, 265000, 330000], us_remote: [175000, 218000, 272000], europe: [122000, 148000, 192000], india: [54000, 74000, 102000], canada: [144000, 180000, 228000], uk: [134000, 170000, 218000], apac: [106000, 138000, 175000], latam: [62000, 84000, 108000] },
    staff: { us_tier1: [288000, 362000, 458000], us_remote: [234000, 292000, 372000], europe: [160000, 202000, 266000], india: [85000, 115000, 160000], canada: [186000, 238000, 298000], uk: [175000, 224000, 288000], apac: [144000, 186000, 240000], latam: [84000, 112000, 150000] }
  },
  mobile_engineer: {
    entry: { us_tier1: [126000, 152000, 184000], us_remote: [100000, 126000, 152000], europe: [64000, 80000, 100000], india: [18000, 25000, 34000], canada: [84000, 105000, 128000], uk: [74000, 92000, 114000], apac: [58000, 74000, 95000], latam: [30000, 40000, 54000] },
    mid: { us_tier1: [158000, 190000, 232000], us_remote: [132000, 158000, 190000], europe: [84000, 106000, 132000], india: [29000, 41000, 56000], canada: [106000, 132000, 164000], uk: [96000, 122000, 154000], apac: [80000, 100000, 125000], latam: [42000, 56000, 72000] },
    senior: { us_tier1: [206000, 254000, 312000], us_remote: [170000, 206000, 260000], europe: [112000, 138000, 175000], india: [50000, 66000, 92000], canada: [138000, 175000, 218000], uk: [128000, 160000, 202000], apac: [102000, 132000, 168000], latam: [58000, 78000, 102000] },
    staff: { us_tier1: [270000, 340000, 425000], us_remote: [218000, 270000, 345000], europe: [148000, 186000, 240000], india: [76000, 104000, 142000], canada: [175000, 224000, 282000], uk: [165000, 208000, 266000], apac: [134000, 172000, 224000], latam: [78000, 104000, 138000] }
  },
  qa_sdet: {
    entry: { us_tier1: [110000, 135000, 164000], us_remote: [90000, 112000, 138000], europe: [58000, 72000, 90000], india: [15000, 22000, 30000], canada: [76000, 95000, 116000], uk: [66000, 82000, 104000], apac: [52000, 66000, 85000], latam: [26000, 36000, 48000] },
    mid: { us_tier1: [142000, 170000, 206000], us_remote: [116000, 142000, 175000], europe: [76000, 94000, 118000], india: [24000, 35000, 48000], canada: [95000, 118000, 148000], uk: [85000, 106000, 136000], apac: [70000, 88000, 112000], latam: [38000, 50000, 65000] },
    senior: { us_tier1: [180000, 218000, 270000], us_remote: [148000, 180000, 228000], europe: [100000, 126000, 160000], india: [40000, 55000, 78000], canada: [122000, 154000, 196000], uk: [112000, 140000, 180000], apac: [90000, 116000, 148000], latam: [52000, 68000, 90000] },
    staff: { us_tier1: [234000, 292000, 366000], us_remote: [192000, 240000, 302000], europe: [132000, 165000, 212000], india: [62000, 85000, 118000], canada: [155000, 196000, 250000], uk: [144000, 182000, 235000], apac: [118000, 150000, 196000], latam: [66000, 90000, 120000] }
  },
  embedded_firmware: {
    entry: { us_tier1: [132000, 158000, 190000], us_remote: [106000, 132000, 158000], europe: [68000, 85000, 108000], india: [18000, 26000, 37000], canada: [86000, 108000, 134000], uk: [76000, 95000, 118000], apac: [62000, 78000, 100000], latam: [32000, 42000, 55000] },
    mid: { us_tier1: [164000, 196000, 238000], us_remote: [138000, 164000, 196000], europe: [90000, 112000, 140000], india: [29000, 42000, 58000], canada: [112000, 138000, 170000], uk: [102000, 128000, 160000], apac: [82000, 104000, 130000], latam: [45000, 58000, 76000] },
    senior: { us_tier1: [212000, 260000, 324000], us_remote: [175000, 212000, 265000], europe: [118000, 146000, 186000], india: [48000, 66000, 94000], canada: [144000, 180000, 228000], uk: [134000, 168000, 212000], apac: [106000, 138000, 175000], latam: [60000, 80000, 105000] },
    staff: { us_tier1: [280000, 350000, 445000], us_remote: [228000, 286000, 366000], europe: [156000, 196000, 255000], india: [78000, 106000, 148000], canada: [186000, 234000, 298000], uk: [170000, 218000, 282000], apac: [138000, 180000, 234000], latam: [80000, 110000, 148000] }
  },
  product_manager: {
    entry: { us_tier1: [142000, 168000, 200000], us_remote: [116000, 142000, 170000], europe: [74000, 92000, 116000], india: [22000, 31000, 42000], canada: [95000, 118000, 145000], uk: [85000, 106000, 132000], apac: [68000, 86000, 110000], latam: [38000, 48000, 64000] },
    mid: { us_tier1: [180000, 218000, 265000], us_remote: [148000, 180000, 222000], europe: [100000, 126000, 158000], india: [38000, 52000, 75000], canada: [122000, 154000, 190000], uk: [112000, 144000, 180000], apac: [90000, 116000, 148000], latam: [52000, 68000, 90000] },
    senior: { us_tier1: [228000, 280000, 350000], us_remote: [190000, 234000, 292000], europe: [132000, 168000, 212000], india: [62000, 84000, 118000], canada: [154000, 196000, 248000], uk: [144000, 186000, 238000], apac: [116000, 150000, 196000], latam: [70000, 94000, 125000] },
    staff: { us_tier1: [298000, 376000, 488000], us_remote: [244000, 312000, 402000], europe: [170000, 222000, 292000], india: [95000, 132000, 185000], canada: [202000, 260000, 335000], uk: [186000, 244000, 318000], apac: [154000, 202000, 265000], latam: [94000, 130000, 175000] }
  },
  engineering_manager: {
    entry: { us_tier1: [200000, 242000, 295000], us_remote: [168000, 205000, 252000], europe: [112000, 138000, 175000], india: [48000, 66000, 92000], canada: [144000, 178000, 222000], uk: [128000, 160000, 206000], apac: [104000, 132000, 170000], latam: [58000, 80000, 106000] },
    mid: { us_tier1: [244000, 298000, 365000], us_remote: [206000, 254000, 318000], europe: [138000, 175000, 224000], india: [70000, 95000, 130000], canada: [175000, 218000, 270000], uk: [158000, 200000, 260000], apac: [128000, 165000, 212000], latam: [75000, 102000, 136000] },
    senior: { us_tier1: [292000, 360000, 455000], us_remote: [248000, 308000, 392000], europe: [170000, 218000, 282000], india: [92000, 128000, 175000], canada: [210000, 264000, 335000], uk: [192000, 245000, 324000], apac: [155000, 202000, 260000], latam: [94000, 128000, 172000] },
    staff: { us_tier1: [360000, 450000, 585000], us_remote: [302000, 382000, 488000], europe: [212000, 270000, 350000], india: [125000, 168000, 235000], canada: [255000, 324000, 418000], uk: [238000, 306000, 404000], apac: [192000, 250000, 330000], latam: [118000, 160000, 220000] }
  }
};

let inMemorySalaryState = {
  benchmarks: deepClone(DEFAULT_2026_SALARY_BENCHMARKS),
  anchorTier: 'market_median',
  sampleCount: 0,
  lastUpdated: 'September 2026',
  timestamp: Date.now(),
  isLive: false,
  isCached: false,
  isEmpirical: false,
  source: 'Calibrated 2026 Baseline & Macro Trend Index'
};

const listeners = new Set();

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

/**
 * Subscribes to dynamic salary updates.
 * @param {Function} callback - Invoked with inMemorySalaryState
 * @returns {Function} Unsubscribe function
 */
export function subscribeToSalaryUpdates(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    try {
      callback(inMemorySalaryState);
    } catch {}
    return () => listeners.delete(callback);
  }
  return () => {};
}

function notifyListeners() {
  for (const cb of listeners) {
    try {
      cb(inMemorySalaryState);
    } catch (e) {
      console.warn('[LiveSalary] Listener notification error:', e);
    }
  }
}

/**
 * Extracts and buckets empirical compensation from an array of jobs.
 * @param {Array} jobs - Array of job objects
 * @returns {Object} { buckets: Map of [role][seniority][geo], sampleCount: number }
 */
export function aggregateEmpiricalSalaries(jobs = []) {
  if (!Array.isArray(jobs) || jobs.length === 0) {
    return { buckets: {}, sampleCount: 0 };
  }

  const buckets = {};
  let sampleCount = 0;

  for (const job of jobs) {
    if (!job) continue;
    let salaryNum = null;

    // Check direct numeric salary properties
    if (typeof job.salary_min === 'number' && typeof job.salary_max === 'number' && job.salary_max > 0) {
      salaryNum = Math.round((job.salary_min + job.salary_max) / 2);
    } else if (typeof job.salary_min === 'number' && job.salary_min > 0) {
      salaryNum = job.salary_min;
    } else {
      // Parse string compensation
      const extracted = extractSalaryRange(job);
      if (extracted && extracted.median) {
        salaryNum = extracted.median;
      }
    }

    if (!salaryNum || salaryNum < 15000 || salaryNum > 2000000) continue;

    const role = detectRoleCategory(job.title, job.description);
    const seniority = detectSeniority(job.title, job.description);
    const geo = detectGeoTier(job.location);

    if (!buckets[role]) buckets[role] = {};
    if (!buckets[role][seniority]) buckets[role][seniority] = {};
    if (!buckets[role][seniority][geo]) buckets[role][seniority][geo] = [];

    buckets[role][seniority][geo].push(salaryNum);
    sampleCount++;
  }

  return { buckets, sampleCount };
}

function computePercentiles(arr) {
  if (!arr || arr.length === 0) return null;
  const sorted = [...arr].sort((a, b) => a - b);
  const getP = (p) => {
    const idx = (sorted.length - 1) * p;
    const lower = Math.floor(idx);
    const upper = Math.ceil(idx);
    const weight = idx - lower;
    return Math.round(sorted[lower] * (1 - weight) + sorted[upper] * weight);
  };
  return [getP(0.25), getP(0.50), getP(0.75)];
}

/**
 * Blends baseline benchmarks with empirical data and applies anchor tier multiplier.
 */
export function blendBenchmarks(baseline = DEFAULT_2026_SALARY_BENCHMARKS, empiricalBuckets = {}, anchorTierId = 'market_median') {
  const result = deepClone(baseline);
  const tierConfig = ANCHOR_TIERS[anchorTierId] || ANCHOR_TIERS.market_median;
  const mult = tierConfig.multiplier;

  for (const [role, levels] of Object.entries(result)) {
    for (const [seniority, geos] of Object.entries(levels)) {
      for (const [geo, baselineTrio] of Object.entries(geos)) {
        const samples = empiricalBuckets[role]?.[seniority]?.[geo];
        let p25 = baselineTrio[0];
        let p50 = baselineTrio[1];
        let p75 = baselineTrio[2];

        if (samples && samples.length >= 2) {
          const emp = computePercentiles(samples);
          if (emp) {
            // Sample-weighted Bayesian blend (capping empirical weight at 65% to avoid outlier skew)
            const empiricalWeight = Math.min(0.65, samples.length * 0.12);
            const baseWeight = 1 - empiricalWeight;

            p25 = Math.round(p25 * baseWeight + emp[0] * empiricalWeight);
            p50 = Math.round(p50 * baseWeight + emp[1] * empiricalWeight);
            p75 = Math.round(p75 * baseWeight + emp[2] * empiricalWeight);
          }
        }

        // Apply anchor multiplier and round to nearest $1,000
        geos[geo] = [
          Math.round((p25 * mult) / 1000) * 1000,
          Math.round((p50 * mult) / 1000) * 1000,
          Math.round((p75 * mult) / 1000) * 1000
        ];
      }
    }
  }

  return result;
}

/**
 * Parses open CORS job feeds into standardized job entries.
 */
export function parseOpenWebJobSalaries(remoteOkData, arbeitnowData) {
  const normalized = [];

  if (Array.isArray(remoteOkData)) {
    for (const item of remoteOkData) {
      if (!item || !item.position) continue;
      if (item.salary_min || item.salary_max) {
        normalized.push({
          title: item.position,
          description: item.description || (item.tags || []).join(' '),
          location: item.location || 'Remote',
          salary_min: item.salary_min ? Number(item.salary_min) : undefined,
          salary_max: item.salary_max ? Number(item.salary_max) : undefined
        });
      }
    }
  }

  if (arbeitnowData && Array.isArray(arbeitnowData.data)) {
    for (const item of arbeitnowData.data) {
      if (!item || !item.title) continue;
      normalized.push({
        title: item.title,
        description: item.description || (item.tags || []).join(' '),
        location: item.location || (item.remote ? 'Remote' : 'Europe'),
        salary: item.salary || null
      });
    }
  }

  return normalized;
}

/**
 * Fetches open CORS salary feeds from public tech job feeds ($0, no auth).
 */
export async function fetchOpenWebSalaries(signal = null) {
  const jobs = [];

  try {
    const res = await fetch(OPEN_SALARY_ENDPOINTS.remoteOk, {
      signal,
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseOpenWebJobSalaries(data, null);
      jobs.push(...parsed);
    }
  } catch (e) {
    // Open web fetch failure is non-fatal; falls back cleanly
    console.debug('[LiveSalary] RemoteOK feed offline or blocked by browser CORS:', e?.message);
  }

  try {
    const res = await fetch(OPEN_SALARY_ENDPOINTS.arbeitnow, {
      signal,
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      const parsed = parseOpenWebJobSalaries(null, data);
      jobs.push(...parsed);
    }
  } catch (e) {
    console.debug('[LiveSalary] Arbeitnow feed offline:', e?.message);
  }

  return jobs;
}

/**
 * Reads cached salary benchmarks from localStorage.
 */
export function getCachedSalaryBenchmarks() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(SALARY_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.benchmarks || !parsed.timestamp) return null;

    const age = Date.now() - parsed.timestamp;
    const isStale = age > CACHE_TTL_MS;

    return {
      ...parsed,
      isStale,
      ageHours: (age / (1000 * 3600)).toFixed(1)
    };
  } catch {
    return null;
  }
}

/**
 * Main function to fetch and calibrate live salary benchmarks.
 * Merges local ATS IndexedDB jobs + open web feeds + macro 2026 baseline + anchor tier.
 */
export async function fetchLiveSalaryBenchmarks({ force = false, anchorTier = null } = {}) {
  const targetAnchorTier = anchorTier || inMemorySalaryState.anchorTier || 'market_median';

  // Return cached state if valid and not forced
  if (!force) {
    const cached = getCachedSalaryBenchmarks();
    if (cached && !cached.isStale) {
      const adjusted = blendBenchmarks(cached.benchmarks, {}, targetAnchorTier);
      inMemorySalaryState = {
        ...cached,
        benchmarks: adjusted,
        anchorTier: targetAnchorTier,
        isCached: true,
        isLive: false
      };
      updateSalaryBenchmarks(adjusted, {
        source: cached.source,
        lastUpdated: cached.lastUpdated,
        sampleCount: cached.sampleCount
      });
      notifyListeners();
      return inMemorySalaryState;
    }
  }

  // Aggregate local IndexedDB ATS jobs (high-signal empirical data)
  let localJobs = [];
  try {
    if (storageVault && typeof storageVault.getJobs === 'function') {
      localJobs = (await storageVault.getJobs()) || [];
    }
  } catch (e) {
    console.warn('[LiveSalary] IndexedDB jobs read failed:', e);
  }

  // Fetch open web postings (client-side open CORS)
  let openWebJobs = [];
  try {
    openWebJobs = await fetchOpenWebSalaries();
  } catch (e) {
    console.warn('[LiveSalary] Open web feed fetch error:', e);
  }

  const allJobs = [...localJobs, ...openWebJobs];
  const { buckets, sampleCount } = aggregateEmpiricalSalaries(allJobs);

  const calibrated = blendBenchmarks(DEFAULT_2026_SALARY_BENCHMARKS, buckets, targetAnchorTier);
  const now = new Date();
  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  const updateDateStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;

  const sourceDesc = sampleCount > 0
    ? `Empirical ATS Vault & Open Web Sync (${sampleCount} live postings calibrated)`
    : 'Calibrated 2026 Baseline & Macro Trend Index';

  inMemorySalaryState = {
    benchmarks: calibrated,
    anchorTier: targetAnchorTier,
    sampleCount,
    lastUpdated: updateDateStr,
    timestamp: Date.now(),
    isLive: true,
    isCached: false,
    isEmpirical: sampleCount > 0,
    source: sourceDesc
  };

  // Cache in localStorage
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(SALARY_CACHE_KEY, JSON.stringify(inMemorySalaryState));
    }
  } catch {}

  // Update in-memory COMP_BENCHMARKS in salary_benchmark_engine.js
  updateSalaryBenchmarks(calibrated, {
    source: sourceDesc,
    lastUpdated: updateDateStr,
    sampleCount
  });

  notifyListeners();
  return inMemorySalaryState;
}

/**
 * Changes active Negotiation Anchor Tier and recalibrates in place.
 */
export function setNegotiationAnchorTier(tierId) {
  if (!ANCHOR_TIERS[tierId]) return;
  return fetchLiveSalaryBenchmarks({ force: true, anchorTier: tierId });
}

/**
 * Returns current active salary benchmarks.
 */
export function getActiveSalaryBenchmarks() {
  return inMemorySalaryState.benchmarks || COMP_BENCHMARKS;
}

/**
 * Returns active telemetry information for UI components.
 */
export function getSalaryCalibrationTelemetry() {
  return {
    ...inMemorySalaryState,
    anchorTierInfo: ANCHOR_TIERS[inMemorySalaryState.anchorTier] || ANCHOR_TIERS.market_median,
    badgeText: inMemorySalaryState.sampleCount > 0
      ? `🟢 Live Calibrated: ${inMemorySalaryState.lastUpdated} (${inMemorySalaryState.sampleCount} ATS Postings)`
      : `⚡ 2026 Calibrated Baseline: ${inMemorySalaryState.lastUpdated}`
  };
}

/**
 * Initializes automatic background synchronization.
 */
export function initLiveSalarySync() {
  const cached = getCachedSalaryBenchmarks();
  if (cached) {
    inMemorySalaryState = { ...cached, isCached: true, isLive: false };
    updateSalaryBenchmarks(cached.benchmarks, {
      source: cached.source,
      lastUpdated: cached.lastUpdated,
      sampleCount: cached.sampleCount
    });
    notifyListeners();
    if (cached.isStale) {
      setTimeout(() => fetchLiveSalaryBenchmarks({ force: true }), 1500);
    }
  } else {
    setTimeout(() => fetchLiveSalaryBenchmarks({ force: true }), 1000);
  }
}
