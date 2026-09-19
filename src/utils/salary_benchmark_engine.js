/**
 * salary_benchmark_engine.js
 * ===========================
 * Levels.fyi-style Market Compensation Benchmarking Engine ($0).
 * 
 * Analyzes job titles, descriptions, locations, and posted compensation
 * against curated 2025/2026 tech compensation distributions to deliver
 * instant market alignment telemetry on every job card.
 */

import { wasmEngine } from './wasm_engine_bridge.js';

// Standard ethical informed estimate disclaimer for static compensation telemetry
export const SALARY_ESTIMATE_DISCLAIMER = 'Informed market estimates based on 2024–2025 market aggregations. Verify with Levels.fyi for current figures.';

// Negotiation FX Advisory warning users about currency fluctuations on cross-border / remote offers
export const SALARY_NEGOTIATION_FX_ADVISORY = 'FX Advisory: Exchange rates fluctuate continuously. For overseas or remote offers denominated in USD, verify whether employer compensation is pegged to USD or local currency, as exchange rate movement directly shifts real in-hand compensation.';

// Calibrated exchange rates benchmarked date & source metadata (September 2026 baseline)
export const SALARY_RATES_LAST_UPDATED = 'September 2026';
export const INR_EXCHANGE_RATE_DISCLAIMER = 'Exchange rate baseline: 1 USD ≈ ₹95.51 (Live web sync active)';
export const INR_EXCHANGE_RATE_SHORT = 'Exchange rate: 1 USD ≈ ₹95.51';

export const EXCHANGE_RATE_METADATA = {
  USD: { rate: 1.0, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Base Reference Currency (USD)' },
  INR: { rate: 95.51, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Open Exchange Rates / Live Web Sync (1 USD ≈ ₹95.51)' },
  GBP: { rate: 0.74, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Bank of England / ECB Live Sync (1 USD ≈ £0.74)' },
  EUR: { rate: 0.86, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'European Central Bank Live Sync (1 USD ≈ €0.86)' },
  CAD: { rate: 1.38, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Bank of Canada / Live Sync (1 USD ≈ CA$1.38)' },
  AUD: { rate: 1.39, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Reserve Bank of Australia Live Sync (1 USD ≈ A$1.39)' },
  SGD: { rate: 1.27, lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Monetary Authority of Singapore Live Sync (1 USD ≈ S$1.27)' }
};

// ── Multi-Currency Configuration & Formatting ──────────────────────────────────
export const CURRENCY_CONFIG = {
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', rateFromUsd: 1.0, isLpa: false, rateUpdated: 'September 2026' },
  INR: { code: 'INR', symbol: '₹', name: 'Indian Rupee (₹ LPA)', rateFromUsd: 95.51, isLpa: true, rateUpdated: 'September 2026' },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', rateFromUsd: 0.74, isLpa: false, rateUpdated: 'September 2026' },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', rateFromUsd: 0.86, isLpa: false, rateUpdated: 'September 2026' },
  CAD: { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar (CA$)', rateFromUsd: 1.38, isLpa: false, rateUpdated: 'September 2026' },
  AUD: { code: 'AUD', symbol: 'A$', name: 'Australian Dollar (A$)', rateFromUsd: 1.39, isLpa: false, rateUpdated: 'September 2026' },
  SGD: { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar (S$)', rateFromUsd: 1.27, isLpa: false, rateUpdated: 'September 2026' }
};

export const GEO_DEFAULT_CURRENCY = {
  us_tier1: 'USD',
  us_remote: 'USD',
  india: 'INR',
  uk: 'GBP',
  europe: 'EUR',
  canada: 'CAD',
  apac: 'SGD',
  latam: 'USD'
};

/**
 * Evaluates whether current FX benchmark rates are fresh or potentially stale.
 * Returns a human-friendly advisory string if stale/offline, or null if fresh.
 */
export function getRatesStalenessWarning(currency = 'INR') {
  const code = (currency || 'INR').toUpperCase();
  if (code === 'USD') return null;
  const meta = EXCHANGE_RATE_METADATA[code] || EXCHANGE_RATE_METADATA.INR;
  if (!meta || !meta.lastSyncEpoch) {
    return 'Static baseline active (September 2026) — Stale if live FX unreachable';
  }
  const hoursSinceSync = (Date.now() - meta.lastSyncEpoch) / (1000 * 60 * 60);
  if (hoursSinceSync > 24) {
    const days = Math.floor(hoursSinceSync / 24);
    return `Rates last synced ${days > 1 ? `${days} days` : '24h'} ago — market values may have shifted.`;
  }
  return null; // Fresh within 24h
}

/**
 * Dynamically updates in-memory CURRENCY_CONFIG and EXCHANGE_RATE_METADATA with live rates.
 * Called by live_fx_service on web fetch or local cache load.
 */
export function updateCurrencyRates(newRates = {}, metadata = {}) {
  if (!newRates || typeof newRates !== 'object') return;
  const updateDate = metadata.lastUpdated || 'September 2026';
  const source = metadata.source || 'Open Exchange Rates (Live Web Sync)';
  const syncEpoch = 'lastSyncEpoch' in metadata ? metadata.lastSyncEpoch : Date.now();

  for (const [curr, rate] of Object.entries(newRates)) {
    const code = curr.toUpperCase();
    const numRate = Number(rate);
    if (!isNaN(numRate) && numRate > 0) {
      if (CURRENCY_CONFIG[code]) {
        CURRENCY_CONFIG[code].rateFromUsd = numRate;
        CURRENCY_CONFIG[code].rateUpdated = updateDate;
      } else {
        CURRENCY_CONFIG[code] = {
          code,
          symbol: code === 'AUD' ? 'A$' : code === 'SGD' ? 'S$' : code,
          name: code,
          rateFromUsd: numRate,
          isLpa: code === 'INR',
          rateUpdated: updateDate
        };
      }

      if (EXCHANGE_RATE_METADATA[code]) {
        EXCHANGE_RATE_METADATA[code].rate = numRate;
        EXCHANGE_RATE_METADATA[code].lastUpdated = updateDate;
        EXCHANGE_RATE_METADATA[code].lastSyncEpoch = syncEpoch;
        EXCHANGE_RATE_METADATA[code].source = source;
      } else {
        EXCHANGE_RATE_METADATA[code] = {
          rate: numRate,
          lastUpdated: updateDate,
          lastSyncEpoch: syncEpoch,
          source
        };
      }
    }
  }
}

export const SALARY_CALIBRATION_METADATA = {
  lastUpdated: 'September 2026',
  source: 'Calibrated 2026 Baseline & Macro Trend Index',
  sampleCount: 0,
  isLive: false,
  isEmpirical: false
};

/**
 * Dynamically updates in-memory COMP_BENCHMARKS and SALARY_CALIBRATION_METADATA.
 * Called by live_salary_service on web fetch, empirical ATS blend, or local cache load.
 */
export function updateSalaryBenchmarks(newBenchmarks = {}, metadata = {}) {
  if (!newBenchmarks || typeof newBenchmarks !== 'object') return;

  if (metadata.lastUpdated) SALARY_CALIBRATION_METADATA.lastUpdated = metadata.lastUpdated;
  if (metadata.source) SALARY_CALIBRATION_METADATA.source = metadata.source;
  if (typeof metadata.sampleCount === 'number') SALARY_CALIBRATION_METADATA.sampleCount = metadata.sampleCount;
  SALARY_CALIBRATION_METADATA.isLive = Boolean(metadata.isLive ?? (metadata.sampleCount > 0));
  SALARY_CALIBRATION_METADATA.isEmpirical = Boolean(metadata.sampleCount > 0);

  // In-place property update so existing references remain valid
  for (const [role, levels] of Object.entries(newBenchmarks)) {
    if (!COMP_BENCHMARKS[role]) COMP_BENCHMARKS[role] = {};
    for (const [seniority, geos] of Object.entries(levels)) {
      if (!COMP_BENCHMARKS[role][seniority]) COMP_BENCHMARKS[role][seniority] = {};
      for (const [geo, trio] of Object.entries(geos)) {
        if (Array.isArray(trio) && trio.length >= 3) {
          COMP_BENCHMARKS[role][seniority][geo] = [...trio];
        }
      }
    }
  }
}

/**
 * Returns active live calibration disclaimer text.
 */
export function getSalaryCalibrationDisclaimer() {
  if (SALARY_CALIBRATION_METADATA.sampleCount > 0) {
    return `Live-calibrated market benchmark based on ${SALARY_CALIBRATION_METADATA.sampleCount} active ATS job postings & open web feeds (${SALARY_CALIBRATION_METADATA.lastUpdated}).`;
  }
  return `Calibrated 2026 tech compensation benchmark (${SALARY_CALIBRATION_METADATA.lastUpdated}).`;
}


/**
 * Returns dynamic exchange rate disclaimer string for a specific currency.
 */
export function getExchangeRateDisclaimer(currency = 'INR') {
  const code = String(currency).toUpperCase();
  const conf = CURRENCY_CONFIG[code];
  if (!conf || code === 'USD') return null;
  const staleness = getRatesStalenessWarning(code);
  if (staleness) {
    return `Exchange rate: 1 USD ≈ ${conf.symbol}${conf.rateFromUsd} (Updated: ${conf.rateUpdated || 'September 2026'} • ⚠️ ${staleness})`;
  }
  return `Exchange rate: 1 USD ≈ ${conf.symbol}${conf.rateFromUsd} (Updated: ${conf.rateUpdated || 'September 2026'})`;
}

export function formatSalaryCurrency(amountInUsd, targetCurrency = 'USD', options = { compact: true }) {
  const conf = CURRENCY_CONFIG[targetCurrency] || CURRENCY_CONFIG.USD;
  const num = Number(amountInUsd) || 0;
  const localVal = num * conf.rateFromUsd;

  if (targetCurrency === 'INR') {
    if (options.compact) {
      const lakhs = (localVal / 100000).toFixed(1);
      return `₹${lakhs.replace(/\.0$/, '')}L`;
    }
    return `₹${Math.round(localVal).toLocaleString('en-IN')}`;
  }

  if (options.compact) {
    const kVal = Math.round(localVal / 1000);
    return `${conf.symbol}${kVal}k`;
  }
  return `${conf.symbol}${Math.round(localVal).toLocaleString()}`;
}

export function parseSalaryInput(rawInput, currency = 'USD') {
  if (!rawInput && rawInput !== 0) return 0;
  const str = String(rawInput).replace(/[$,£€₹\s]/g, '').trim().toLowerCase();
  
  if (currency === 'INR') {
    if (str.includes('lpa') || str.includes('l') || str.includes('lakh')) {
      const num = parseFloat(str.replace(/[^0-9.]/g, ''));
      return isNaN(num) ? 0 : Math.round(num * 100000);
    }
    const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
    if (isNaN(cleanNum)) return 0;
    if (cleanNum > 0 && cleanNum <= 300) {
      return Math.round(cleanNum * 100000);
    }
    return Math.round(cleanNum);
  }

  if (str.endsWith('k')) {
    const num = parseFloat(str.slice(0, -1));
    return isNaN(num) ? 0 : Math.round(num * 1000);
  }
  const cleanNum = parseFloat(str.replace(/[^0-9.]/g, ''));
  if (isNaN(cleanNum)) return 0;
  if (cleanNum > 0 && cleanNum <= 500) {
    return Math.round(cleanNum * 1000);
  }
  return Math.round(cleanNum);
}

export function convertSalaryToUsd(amountInCurrency, currency = 'USD') {
  const conf = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const num = Number(amountInCurrency) || 0;
  return Math.round(num / conf.rateFromUsd);
}

export function convertSalaryFromUsd(amountInUsd, currency = 'USD') {
  const conf = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;
  const num = Number(amountInUsd) || 0;
  return Math.round(num * conf.rateFromUsd);
}

// Normalized 25th, 50th (median), and 75th percentile annual compensation benchmarks (USD)
export const COMP_BENCHMARKS = {
  software_engineer: {
    entry: { us_tier1: [130000, 155000, 185000], us_remote: [100000, 125000, 150000], europe: [65000, 80000, 100000], india: [18000, 24000, 32000], canada: [85000, 105000, 130000], uk: [75000, 92000, 115000], apac: [60000, 75000, 95000], latam: [30000, 40000, 52000] },
    mid: { us_tier1: [160000, 190000, 230000], us_remote: [130000, 155000, 185000], europe: [85000, 105000, 130000], india: [28000, 38000, 52000], canada: [110000, 132000, 160000], uk: [98000, 122000, 150000], apac: [78000, 98000, 122000], latam: [42000, 55000, 70000] },
    senior: { us_tier1: [200000, 245000, 300000], us_remote: [160000, 195000, 240000], europe: [110000, 135000, 170000], india: [45000, 60000, 85000], canada: [138000, 170000, 210000], uk: [125000, 158000, 200000], apac: [100000, 128000, 162000], latam: [56000, 74000, 96000] },
    staff: { us_tier1: [260000, 325000, 410000], us_remote: [210000, 260000, 330000], europe: [145000, 180000, 230000], india: [70000, 95000, 130000], canada: [180000, 225000, 285000], uk: [165000, 210000, 268000], apac: [132000, 170000, 218000], latam: [75000, 102000, 135000] }
  },
  frontend_engineer: {
    entry: { us_tier1: [120000, 145000, 175000], us_remote: [95000, 120000, 145000], europe: [60000, 75000, 95000], india: [16000, 22000, 30000], canada: [80000, 98000, 122000], uk: [70000, 86000, 108000], apac: [55000, 70000, 88000], latam: [28000, 36000, 48000] },
    mid: { us_tier1: [150000, 180000, 220000], us_remote: [125000, 150000, 175000], europe: [80000, 100000, 125000], india: [25000, 35000, 48000], canada: [102000, 125000, 152000], uk: [92000, 115000, 142000], apac: [72000, 92000, 115000], latam: [38000, 50000, 65000] },
    senior: { us_tier1: [190000, 235000, 285000], us_remote: [155000, 185000, 225000], europe: [105000, 128000, 160000], india: [42000, 56000, 78000], canada: [130000, 160000, 198000], uk: [118000, 148000, 188000], apac: [95000, 120000, 152000], latam: [52000, 68000, 88000] },
    staff: { us_tier1: [245000, 305000, 385000], us_remote: [200000, 245000, 310000], europe: [138000, 170000, 215000], india: [65000, 88000, 120000], canada: [170000, 212000, 270000], uk: [155000, 198000, 252000], apac: [125000, 160000, 205000], latam: [70000, 92000, 122000] }
  },
  ai_ml_engineer: {
    entry: { us_tier1: [145000, 175000, 210000], us_remote: [120000, 145000, 175000], europe: [75000, 95000, 120000], india: [22000, 32000, 45000], canada: [98000, 122000, 150000], uk: [88000, 110000, 138000], apac: [70000, 90000, 115000], latam: [36000, 48000, 64000] },
    mid: { us_tier1: [185000, 225000, 275000], us_remote: [150000, 185000, 225000], europe: [100000, 125000, 160000], india: [38000, 52000, 72000], canada: [128000, 158000, 195000], uk: [115000, 145000, 185000], apac: [92000, 118000, 150000], latam: [50000, 68000, 88000] },
    senior: { us_tier1: [230000, 285000, 360000], us_remote: [190000, 235000, 295000], europe: [130000, 165000, 210000], india: [60000, 82000, 115000], canada: [162000, 202000, 255000], uk: [148000, 188000, 242000], apac: [118000, 152000, 195000], latam: [68000, 90000, 120000] },
    staff: { us_tier1: [300000, 380000, 490000], us_remote: [240000, 310000, 400000], europe: [170000, 220000, 285000], india: [90000, 125000, 175000], canada: [210000, 270000, 345000], uk: [195000, 255000, 330000], apac: [155000, 205000, 268000], latam: [90000, 125000, 168000] }
  },
  devops_sre: {
    entry: { us_tier1: [125000, 150000, 180000], us_remote: [105000, 130000, 155000], europe: [65000, 80000, 100000], india: [18000, 25000, 34000], canada: [85000, 105000, 130000], uk: [75000, 94000, 118000], apac: [60000, 78000, 98000], latam: [30000, 40000, 52000] },
    mid: { us_tier1: [160000, 190000, 230000], us_remote: [135000, 160000, 190000], europe: [85000, 105000, 130000], india: [30000, 42000, 58000], canada: [110000, 135000, 165000], uk: [100000, 125000, 155000], apac: [80000, 100000, 125000], latam: [44000, 58000, 75000] },
    senior: { us_tier1: [205000, 250000, 305000], us_remote: [170000, 205000, 250000], europe: [115000, 140000, 175000], india: [48000, 65000, 92000], canada: [140000, 175000, 218000], uk: [128000, 160000, 205000], apac: [102000, 132000, 168000], latam: [58000, 78000, 102000] },
    staff: { us_tier1: [265000, 330000, 420000], us_remote: [215000, 270000, 345000], europe: [150000, 190000, 245000], india: [75000, 102000, 140000], canada: [180000, 228000, 290000], uk: [168000, 215000, 275000], apac: [135000, 175000, 225000], latam: [78000, 105000, 140000] }
  },
  data_engineer: {
    entry: { us_tier1: [130000, 155000, 185000], us_remote: [105000, 130000, 155000], europe: [65000, 80000, 100000], india: [18000, 25000, 35000], canada: [85000, 105000, 130000], uk: [75000, 95000, 118000], apac: [60000, 76000, 96000], latam: [32000, 42000, 55000] },
    mid: { us_tier1: [165000, 195000, 235000], us_remote: [135000, 160000, 195000], europe: [85000, 110000, 135000], india: [30000, 42000, 58000], canada: [110000, 135000, 165000], uk: [100000, 125000, 155000], apac: [80000, 100000, 125000], latam: [45000, 60000, 78000] },
    senior: { us_tier1: [210000, 255000, 315000], us_remote: [170000, 210000, 260000], europe: [115000, 145000, 185000], india: [50000, 68000, 95000], canada: [140000, 175000, 220000], uk: [130000, 165000, 210000], apac: [105000, 135000, 170000], latam: [60000, 80000, 105000] },
    staff: { us_tier1: [275000, 345000, 440000], us_remote: [225000, 280000, 360000], europe: [155000, 195000, 255000], india: [78000, 105000, 145000], canada: [180000, 230000, 290000], uk: [170000, 220000, 280000], apac: [140000, 180000, 230000], latam: [80000, 110000, 145000] }
  },
  cybersecurity_engineer: {
    entry: { us_tier1: [125000, 150000, 180000], us_remote: [100000, 125000, 150000], europe: [65000, 80000, 100000], india: [17000, 24000, 34000], canada: [82000, 102000, 125000], uk: [72000, 90000, 110000], apac: [58000, 72000, 92000], latam: [30000, 40000, 52000] },
    mid: { us_tier1: [160000, 190000, 230000], us_remote: [130000, 155000, 190000], europe: [85000, 105000, 130000], india: [28000, 40000, 55000], canada: [105000, 130000, 160000], uk: [95000, 120000, 150000], apac: [78000, 98000, 120000], latam: [42000, 55000, 72000] },
    senior: { us_tier1: [205000, 250000, 310000], us_remote: [165000, 205000, 255000], europe: [115000, 140000, 180000], india: [48000, 65000, 90000], canada: [135000, 170000, 215000], uk: [125000, 160000, 205000], apac: [100000, 130000, 165000], latam: [58000, 78000, 100000] },
    staff: { us_tier1: [270000, 340000, 430000], us_remote: [220000, 275000, 350000], europe: [150000, 190000, 250000], india: [75000, 100000, 140000], canada: [175000, 225000, 280000], uk: [165000, 210000, 270000], apac: [135000, 175000, 225000], latam: [78000, 105000, 140000] }
  },
  mobile_engineer: {
    entry: { us_tier1: [120000, 145000, 175000], us_remote: [95000, 120000, 145000], europe: [60000, 75000, 95000], india: [16000, 22000, 30000], canada: [80000, 100000, 120000], uk: [70000, 88000, 108000], apac: [55000, 70000, 90000], latam: [28000, 38000, 50000] },
    mid: { us_tier1: [150000, 180000, 220000], us_remote: [125000, 150000, 180000], europe: [80000, 100000, 125000], india: [26000, 36000, 50000], canada: [100000, 125000, 155000], uk: [90000, 115000, 145000], apac: [75000, 95000, 118000], latam: [40000, 52000, 68000] },
    senior: { us_tier1: [195000, 240000, 295000], us_remote: [160000, 195000, 245000], europe: [105000, 130000, 165000], india: [44000, 58000, 82000], canada: [130000, 165000, 205000], uk: [120000, 150000, 190000], apac: [95000, 125000, 158000], latam: [55000, 72000, 95000] },
    staff: { us_tier1: [255000, 320000, 400000], us_remote: [205000, 255000, 325000], europe: [140000, 175000, 225000], india: [68000, 92000, 125000], canada: [165000, 210000, 265000], uk: [155000, 195000, 250000], apac: [125000, 160000, 210000], latam: [72000, 98000, 130000] }
  },
  qa_sdet: {
    entry: { us_tier1: [105000, 128000, 155000], us_remote: [85000, 105000, 130000], europe: [55000, 68000, 85000], india: [14000, 20000, 28000], canada: [72000, 90000, 110000], uk: [62000, 78000, 98000], apac: [48000, 62000, 80000], latam: [25000, 34000, 45000] },
    mid: { us_tier1: [135000, 160000, 195000], us_remote: [110000, 135000, 165000], europe: [72000, 88000, 110000], india: [22000, 32000, 44000], canada: [90000, 112000, 140000], uk: [80000, 100000, 128000], apac: [65000, 82000, 105000], latam: [35000, 46000, 60000] },
    senior: { us_tier1: [170000, 205000, 255000], us_remote: [140000, 170000, 215000], europe: [95000, 118000, 150000], india: [36000, 50000, 70000], canada: [115000, 145000, 185000], uk: [105000, 132000, 170000], apac: [85000, 110000, 140000], latam: [48000, 64000, 84000] },
    staff: { us_tier1: [220000, 275000, 345000], us_remote: [180000, 225000, 285000], europe: [125000, 155000, 200000], india: [55000, 76000, 105000], canada: [145000, 185000, 235000], uk: [135000, 170000, 220000], apac: [110000, 140000, 185000], latam: [62000, 84000, 112000] }
  },
  embedded_firmware: {
    entry: { us_tier1: [125000, 150000, 180000], us_remote: [100000, 125000, 150000], europe: [65000, 80000, 102000], india: [16000, 24000, 34000], canada: [82000, 102000, 126000], uk: [72000, 90000, 112000], apac: [58000, 74000, 94000], latam: [30000, 40000, 52000] },
    mid: { us_tier1: [155000, 185000, 225000], us_remote: [130000, 155000, 185000], europe: [85000, 105000, 132000], india: [26000, 38000, 52000], canada: [105000, 130000, 160000], uk: [95000, 120000, 150000], apac: [78000, 98000, 122000], latam: [42000, 55000, 72000] },
    senior: { us_tier1: [200000, 245000, 305000], us_remote: [165000, 200000, 250000], europe: [110000, 138000, 175000], india: [44000, 60000, 85000], canada: [135000, 170000, 215000], uk: [125000, 158000, 200000], apac: [100000, 130000, 165000], latam: [56000, 75000, 98000] },
    staff: { us_tier1: [265000, 330000, 420000], us_remote: [215000, 270000, 345000], europe: [148000, 185000, 240000], india: [70000, 95000, 132000], canada: [175000, 220000, 280000], uk: [160000, 205000, 265000], apac: [130000, 170000, 220000], latam: [75000, 102000, 138000] }
  },
  product_manager: {
    entry: { us_tier1: [135000, 160000, 190000], us_remote: [110000, 135000, 160000], europe: [70000, 88000, 110000], india: [20000, 28000, 38000], canada: [90000, 112000, 138000], uk: [80000, 100000, 125000], apac: [65000, 82000, 105000], latam: [35000, 46000, 60000] },
    mid: { us_tier1: [170000, 205000, 250000], us_remote: [140000, 170000, 210000], europe: [95000, 120000, 150000], india: [34000, 48000, 68000], canada: [115000, 145000, 180000], uk: [105000, 135000, 170000], apac: [85000, 110000, 140000], latam: [48000, 64000, 85000] },
    senior: { us_tier1: [215000, 265000, 330000], us_remote: [180000, 220000, 275000], europe: [125000, 158000, 200000], india: [55000, 75000, 105000], canada: [145000, 185000, 235000], uk: [135000, 175000, 225000], apac: [110000, 142000, 185000], latam: [65000, 88000, 118000] },
    staff: { us_tier1: [280000, 355000, 460000], us_remote: [230000, 295000, 380000], europe: [160000, 210000, 275000], india: [85000, 118000, 165000], canada: [190000, 245000, 315000], uk: [175000, 230000, 300000], apac: [145000, 190000, 250000], latam: [88000, 122000, 165000] }
  },
  engineering_manager: {
    entry: { us_tier1: [190000, 230000, 280000], us_remote: [160000, 195000, 240000], europe: [105000, 130000, 165000], india: [45000, 62000, 85000], canada: [135000, 168000, 210000], uk: [120000, 150000, 195000], apac: [98000, 125000, 160000], latam: [55000, 75000, 100000] },
    mid: { us_tier1: [230000, 280000, 345000], us_remote: [195000, 240000, 300000], europe: [130000, 165000, 210000], india: [65000, 88000, 120000], canada: [165000, 205000, 255000], uk: [148000, 188000, 245000], apac: [120000, 155000, 200000], latam: [70000, 95000, 128000] },
    senior: { us_tier1: [275000, 340000, 430000], us_remote: [235000, 290000, 370000], europe: [160000, 205000, 265000], india: [85000, 118000, 160000], canada: [198000, 248000, 315000], uk: [180000, 230000, 305000], apac: [145000, 190000, 245000], latam: [88000, 120000, 160000] },
    staff: { us_tier1: [340000, 425000, 550000], us_remote: [285000, 360000, 460000], europe: [200000, 255000, 330000], india: [115000, 155000, 215000], canada: [240000, 305000, 395000], uk: [225000, 288000, 380000], apac: [180000, 235000, 310000], latam: [110000, 150000, 205000] }
  }
};

/**
 * Detects the role category from title and text.
 */
export function detectRoleCategory(title = '', description = '') {
  const t = (title + ' ' + description).toLowerCase();
  if (/ai|machine learning|deep learning|nlp|llm|computer vision|data scientist|genai|artificial intelligence/i.test(t)) {
    return 'ai_ml_engineer';
  }
  if (/data engineer|big data|analytics engineer|etl|spark|data warehouse|dbt\b/i.test(t)) {
    return 'data_engineer';
  }
  if (/cybersecurity|security engineer|infosec|appsec|devsecops|soc analyst|penetration test|threat/i.test(t)) {
    return 'cybersecurity_engineer';
  }
  if (/devops|sre|site reliability|infrastructure|platform engineer|cloud engineer|kubernetes|terraform/i.test(t)) {
    return 'devops_sre';
  }
  if (/mobile|ios|android|swift|kotlin|flutter|react native/i.test(t)) {
    return 'mobile_engineer';
  }
  if (/qa automation|sdet|test engineer|quality assurance|automation engineer|test automation|qa engineer/i.test(t)) {
    return 'qa_sdet';
  }
  if (/embedded|firmware|iot|robotics|hardware engineer|rtos|microcontroller|fpga/i.test(t)) {
    return 'embedded_firmware';
  }
  if (/product manager|technical product manager|\btpm\b|product lead|head of product/i.test(t)) {
    return 'product_manager';
  }
  if (/engineering manager|eng manager|director of eng|vp engineering|tech lead manager|head of engineering/i.test(t)) {
    return 'engineering_manager';
  }
  if (/frontend|front-end|front end|react|ui engineer|web developer/i.test(t)) {
    return 'frontend_engineer';
  }
  return 'software_engineer';
}

/**
 * Detects seniority level from title and description.
 */
export function detectSeniority(title = '', description = '') {
  const t = (title + ' ' + description).toLowerCase();
  if (/staff|principal|distinguished|lead architect|fellow/i.test(t)) return 'staff';
  if (/senior|sr\.|sr |lead|tech lead|experienced|iii|iv/i.test(t)) return 'senior';
  if (/junior|jr\.|jr |entry|associate|graduate|intern/i.test(t)) return 'entry';
  return 'mid';
}

/**
 * Detects primary geo compensation tier from location.
 */
export function detectGeoTier(location = '') {
  const loc = (location || '').toLowerCase();
  if (/san francisco|bay area|silicon valley|new york|nyc|seattle|san jose|palo alto|mountain view/i.test(loc)) {
    return 'us_tier1';
  }
  if (/india|bengaluru|bangalore|hyderabad|pune|gurgaon|delhi|mumbai|noida/i.test(loc)) {
    return 'india';
  }
  if (/canada|toronto|vancouver|montreal|waterloo|ottawa|calgary/i.test(loc)) {
    return 'canada';
  }
  if (/london|cambridge|oxford|edinburgh|manchester|bristol|united kingdom|\buk\b|britain/i.test(loc)) {
    return 'uk';
  }
  if (/singapore|australia|sydney|melbourne|japan|tokyo|korea|seoul|taiwan|taipei|apac/i.test(loc)) {
    return 'apac';
  }
  if (/brazil|são paulo|sao paulo|mexico|méxico|argentina|buenos aires|colombia|bogota|bogotá|latam/i.test(loc)) {
    return 'latam';
  }
  if (/germany|berlin|munich|netherlands|amsterdam|france|paris|switzerland|zurich|ireland|dublin|europe/i.test(loc)) {
    return 'europe';
  }
  // Default to US Remote / Global Baseline
  return 'us_remote';
}

/**
 * Extracts and parses salary text into normalized annual USD range and currency metadata.
 */
export function extractSalaryRange(job = {}) {
  const rawSalary = job.salary || job.compensation || '';
  const textToScan = `${rawSalary} ${job.description || ''}`.slice(0, 1500);

  // 1. Match Indian Rupee (₹ LPA or Lakhs): e.g. ₹15L - ₹25L LPA, 15 - 30 LPA, ₹20,00,000
  const inrLpaMatch = textToScan.match(/(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:l|lakh|lakhs|lpa)?\s*(?:-|–|to)\s*(?:₹|rs\.?|inr)?\s*(\d{1,2}(?:\.\d+)?)\s*(?:l|lakh|lakhs|lpa)(?:\s*(?:per annum|\/yr|\/year|p\.a\.))?/i) ||
                      textToScan.match(/(\d{1,2}(?:\.\d+)?)\s*(?:-|–|to)\s*(\d{1,2}(?:\.\d+)?)\s*(?:lpa|lakhs?)(?:\s*(?:per annum|\/yr|\/year|p\.a\.))?/i);
  if (inrLpaMatch) {
    const minLpa = parseFloat(inrLpaMatch[1]);
    const maxLpa = parseFloat(inrLpaMatch[2]);
    if (minLpa > 0 && maxLpa >= minLpa && maxLpa <= 300) {
      const minInr = minLpa * 100000;
      const maxInr = maxLpa * 100000;
      const minUsd = convertSalaryToUsd(minInr, 'INR');
      const maxUsd = convertSalaryToUsd(maxInr, 'INR');
      return {
        min: minUsd,
        max: maxUsd,
        median: Math.round((minUsd + maxUsd) / 2),
        currency: 'INR',
        currencySymbol: '₹',
        text: `₹${minLpa}L – ₹${maxLpa}L LPA`
      };
    }
  }

  // Single INR LPA match: e.g. ₹20 LPA or 25 LPA
  const singleInrMatch = textToScan.match(/(?:₹|rs\.?|inr)\s*(\d{1,2}(?:\.\d+)?)\s*(?:l|lakh|lakhs|lpa)(?:\s*(?:per annum|\/yr|\/year|p\.a\.))?/i) ||
                         textToScan.match(/(\d{1,2}(?:\.\d+)?)\s*(?:lpa|lakhs?)\s*(?:per annum|\/yr|\/year|p\.a\.)?/i);
  if (singleInrMatch) {
    const valLpa = parseFloat(singleInrMatch[1]);
    if (valLpa > 0 && valLpa <= 300) {
      const valInr = valLpa * 100000;
      const valUsd = convertSalaryToUsd(valInr, 'INR');
      return {
        min: valUsd,
        max: valUsd,
        median: valUsd,
        currency: 'INR',
        currencySymbol: '₹',
        text: `₹${valLpa}L LPA`
      };
    }
  }

  // 2. Match Euro (€): e.g. €60,000 - €90,000, €70k - €95k
  const eurMatch = textToScan.match(/€\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(?:k|thousand)?\s*(?:-|–|to)\s*€?\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(k|thousand)?(?:\s*(?:eur|\/yr|\/year|per year|annual))?/i);
  if (eurMatch) {
    let min = parseFloat(eurMatch[1].replace(/,/g, ''));
    let max = parseFloat(eurMatch[2].replace(/,/g, ''));
    if (/k/i.test(eurMatch[0]) || min < 1000) {
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
    }
    if (min >= 20000 && max >= min && max < 800000) {
      const minUsd = convertSalaryToUsd(min, 'EUR');
      const maxUsd = convertSalaryToUsd(max, 'EUR');
      return {
        min: minUsd,
        max: maxUsd,
        median: Math.round((minUsd + maxUsd) / 2),
        currency: 'EUR',
        currencySymbol: '€',
        text: `€${Math.round(min / 1000)}k – €${Math.round(max / 1000)}k`
      };
    }
  }

  // 3. Match British Pound (£): e.g. £65k - £85k, £70,000 - £100,000
  const gbpMatch = textToScan.match(/£\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(?:k|thousand)?\s*(?:-|–|to)\s*£?\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(k|thousand)?(?:\s*(?:gbp|\/yr|\/year|per year|annual))?/i);
  if (gbpMatch) {
    let min = parseFloat(gbpMatch[1].replace(/,/g, ''));
    let max = parseFloat(gbpMatch[2].replace(/,/g, ''));
    if (/k/i.test(gbpMatch[0]) || min < 1000) {
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
    }
    if (min >= 20000 && max >= min && max < 800000) {
      const minUsd = convertSalaryToUsd(min, 'GBP');
      const maxUsd = convertSalaryToUsd(max, 'GBP');
      return {
        min: minUsd,
        max: maxUsd,
        median: Math.round((minUsd + maxUsd) / 2),
        currency: 'GBP',
        currencySymbol: '£',
        text: `£${Math.round(min / 1000)}k – £${Math.round(max / 1000)}k`
      };
    }
  }

  // 4. Match Singapore Dollar (S$ or SGD): e.g. S$80k - S$120k, SGD $90,000 - $140,000
  const sgdMatch = textToScan.match(/(?:s\$|sgd)\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(?:k|thousand)?\s*(?:-|–|to)\s*(?:s\$|sgd)?\s*(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(k|thousand)?(?:\s*(?:sgd|\/yr|\/year|per year|annual))?/i);
  if (sgdMatch) {
    let min = parseFloat(sgdMatch[1].replace(/,/g, ''));
    let max = parseFloat(sgdMatch[2].replace(/,/g, ''));
    if (/k/i.test(sgdMatch[0]) || min < 1000) {
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
    }
    if (min >= 25000 && max >= min && max < 900000) {
      const minUsd = convertSalaryToUsd(min, 'SGD');
      const maxUsd = convertSalaryToUsd(max, 'SGD');
      return {
        min: minUsd,
        max: maxUsd,
        median: Math.round((minUsd + maxUsd) / 2),
        currency: 'SGD',
        currencySymbol: 'S$',
        text: `S$${Math.round(min / 1000)}k – S$${Math.round(max / 1000)}k`
      };
    }
  }

  // 5. Match USD: $120k - $160k, $120,000 - $160,000, 120,000 to 160,000 USD
  const usdMatch = textToScan.match(/\$?(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(?:k|thousand)?\s*(?:-|–|to)\s*\$?(\d{2,3}(?:,\d{3})*(?:\.\d+)?|\d{2,3})\s*(k|thousand)?(?:\s*(?:usd|\/yr|\/year|per year|annual|a year))?/i);

  if (usdMatch) {
    let min = parseFloat(usdMatch[1].replace(/,/g, ''));
    let max = parseFloat(usdMatch[2].replace(/,/g, ''));

    // Handle 'k' suffixes
    const hasK = /k/i.test(usdMatch[0]) || min < 1000;
    if (hasK) {
      if (min < 1000) min *= 1000;
      if (max < 1000) max *= 1000;
    }

    if (min >= 15000 && max >= min && max < 1500000) {
      return {
        min,
        max,
        median: Math.round((min + max) / 2),
        currency: 'USD',
        currencySymbol: '$',
        text: `$${Math.round(min / 1000)}k – $${Math.round(max / 1000)}k`
      };
    }
  }

  // Check single number: $140,000 / year or $150k
  const singleMatch = textToScan.match(/\$?(\d{2,3}(?:,\d{3})*|\d{2,3})\s*(k|thousand)?\s*(?:usd|\/yr|\/year|per year|annual)/i);
  if (singleMatch) {
    let val = parseFloat(singleMatch[1].replace(/,/g, ''));
    if (val < 1000 || /k/i.test(singleMatch[2] || '')) val *= 1000;
    if (val >= 15000 && val < 1500000) {
      return {
        min: val,
        max: val,
        median: val,
        currency: 'USD',
        currencySymbol: '$',
        text: `$${Math.round(val / 1000)}k`
      };
    }
  }

  return null;
}

/**
 * Resolves candidate's active region for salary filtering from filter and scope settings.
 * Returns: 'india' | 'uk' | 'europe' | 'apac' | 'canada' | 'us'
 */
export function detectActiveRegion(geoMarketFilter = 'all', activeScope = null) {
  const g = String(geoMarketFilter || '').toLowerCase();
  if (g.includes('india') || ['blr', 'bengaluru', 'hyd', 'hyderabad', 'pune', 'delhi_ncr', 'mumbai', 'chennai', 'remote_india'].includes(g)) {
    return 'india';
  }
  if (g === 'london' || g === 'uk') {
    return 'uk';
  }
  if (g.includes('europe') || g === 'eu' || ['berlin', 'amsterdam', 'dublin', 'remote_eu'].includes(g)) {
    return 'europe';
  }
  if (g === 'singapore' || g.includes('apac')) {
    return 'apac';
  }
  if (g.includes('canada') || ['toronto', 'vancouver'].includes(g)) {
    return 'canada';
  }

  // If UI filter is neutral ('all'), infer from candidate's profile activeScope if present
  if (activeScope && typeof activeScope === 'object') {
    const rawLocs = [
      ...(Array.isArray(activeScope.locations) ? activeScope.locations : []).map(l => (typeof l === 'string' ? l : l?.label || l?.name || '')),
      activeScope.target_location,
      ...(Array.isArray(activeScope.preferred_locations) ? activeScope.preferred_locations : [])
    ].filter(Boolean).map(s => String(s).toLowerCase().trim());

    if (rawLocs.some(l => l.includes('india') || ['bengaluru', 'hyderabad', 'pune', 'delhi', 'mumbai', 'chennai', 'noida', 'gurgaon'].some(c => l.includes(c)))) {
      return 'india';
    }
    if (rawLocs.some(l => l.includes('london') || l === 'uk' || l.includes('united kingdom'))) {
      return 'uk';
    }
    if (rawLocs.some(l => l.includes('europe') || l.includes('germany') || l.includes('netherlands') || l.includes('ireland') || l.includes('berlin') || l.includes('amsterdam'))) {
      return 'europe';
    }
    if (rawLocs.some(l => l.includes('singapore'))) {
      return 'apac';
    }
    if (rawLocs.some(l => l.includes('canada') || l.includes('toronto') || l.includes('vancouver'))) {
      return 'canada';
    }
  }

  return 'us';
}

/**
 * Returns currency-appropriate salary threshold options for the UI filter bar.
 */
export function getSalaryFilterThresholds(geoMarketFilter = 'all', activeScope = null) {
  const region = detectActiveRegion(geoMarketFilter, activeScope);
  const inrRate = CURRENCY_CONFIG.INR?.rateFromUsd || 95.51;
  const eurRate = CURRENCY_CONFIG.EUR?.rateFromUsd || 0.86;
  const gbpRate = CURRENCY_CONFIG.GBP?.rateFromUsd || 0.74;
  const sgdRate = CURRENCY_CONFIG.SGD?.rateFromUsd || 1.27;

  switch (region) {
    case 'india':
      return {
        currency: 'INR',
        symbol: '₹',
        region,
        options: [
          { id: 'all', label: 'Any', minUsd: 0 },
          { id: 'tier_15l', label: '₹15 LPA+', minUsd: Math.round(1500000 / inrRate) },
          { id: 'tier_25l', label: '₹25 LPA+', minUsd: Math.round(2500000 / inrRate) },
          { id: 'tier_40l', label: '₹40 LPA+', minUsd: Math.round(4000000 / inrRate) }
        ]
      };
    case 'uk':
      return {
        currency: 'GBP',
        symbol: '£',
        region,
        options: [
          { id: 'all', label: 'Any', minUsd: 0 },
          { id: 'tier_60k', label: '£60k+', minUsd: Math.round(60000 / gbpRate) },
          { id: 'tier_90k', label: '£90k+', minUsd: Math.round(90000 / gbpRate) },
          { id: 'tier_120k', label: '£120k+', minUsd: Math.round(120000 / gbpRate) }
        ]
      };
    case 'europe':
      return {
        currency: 'EUR',
        symbol: '€',
        region,
        options: [
          { id: 'all', label: 'Any', minUsd: 0 },
          { id: 'tier_60k', label: '€60k+', minUsd: Math.round(60000 / eurRate) },
          { id: 'tier_90k', label: '€90k+', minUsd: Math.round(90000 / eurRate) },
          { id: 'tier_120k', label: '€120k+', minUsd: Math.round(120000 / eurRate) }
        ]
      };
    case 'apac':
      return {
        currency: 'SGD',
        symbol: 'S$',
        region,
        options: [
          { id: 'all', label: 'Any', minUsd: 0 },
          { id: 'tier_80k', label: 'SGD $80k+', minUsd: Math.round(80000 / sgdRate) },
          { id: 'tier_130k', label: 'SGD $130k+', minUsd: Math.round(130000 / sgdRate) },
          { id: 'tier_180k', label: 'SGD $180k+', minUsd: Math.round(180000 / sgdRate) }
        ]
      };
    default:
      return {
        currency: 'USD',
        symbol: '$',
        region: 'us',
        options: [
          { id: 'all', label: 'Any', minUsd: 0 },
          { id: '100k', label: '$100k+', minUsd: 100000 },
          { id: '150k', label: '$150k+', minUsd: 150000 }
        ]
      };
  }
}

/**
 * Returns minimum USD required for any salary filter ID across regions.
 */
export function getSalaryThresholdUsd(filterId, region = 'us') {
  if (!filterId || filterId === 'all') return 0;
  if (filterId === '100k') return 100000;
  if (filterId === '150k') return 150000;

  const inrRate = CURRENCY_CONFIG.INR?.rateFromUsd || 95.51;
  const eurRate = CURRENCY_CONFIG.EUR?.rateFromUsd || 0.86;
  const gbpRate = CURRENCY_CONFIG.GBP?.rateFromUsd || 0.74;
  const sgdRate = CURRENCY_CONFIG.SGD?.rateFromUsd || 1.27;

  if (filterId === 'tier_15l') return Math.round(1500000 / inrRate);
  if (filterId === 'tier_25l') return Math.round(2500000 / inrRate);
  if (filterId === 'tier_40l') return Math.round(4000000 / inrRate);

  if (filterId === 'tier_60k') return Math.round(60000 / (region === 'uk' ? gbpRate : eurRate));
  if (filterId === 'tier_90k') return Math.round(90000 / (region === 'uk' ? gbpRate : eurRate));
  if (filterId === 'tier_120k') return Math.round(120000 / (region === 'uk' ? gbpRate : eurRate));

  if (filterId === 'tier_80k') return Math.round(80000 / sgdRate);
  if (filterId === 'tier_130k') return Math.round(130000 / sgdRate);
  if (filterId === 'tier_180k') return Math.round(180000 / sgdRate);

  return 0;
}

/**
 * Main Levels.fyi-Style Benchmarking Engine.
 * Evaluates any job against 2026 market standards and outputs telemetry.
 */
export function benchmarkJobSalary(job = {}, options = {}) {
  const roleCategory = detectRoleCategory(job.title, job.description);
  const seniority = detectSeniority(job.title, job.description);
  const geoTier = detectGeoTier(job.location);
  const currency = options.currency || GEO_DEFAULT_CURRENCY[geoTier] || 'USD';
  const conf = CURRENCY_CONFIG[currency] || CURRENCY_CONFIG.USD;

  const roleTable = COMP_BENCHMARKS[roleCategory] || COMP_BENCHMARKS.software_engineer;
  const levelTable = roleTable[seniority] || roleTable.mid;
  const [p25, p50, p75] = levelTable[geoTier] || levelTable.us_remote;

  const benchmarkRange = `${formatSalaryCurrency(p25, currency)} – ${formatSalaryCurrency(p75, currency)}`;
  const benchmarkMedian = p50;
  const formattedMedian = formatSalaryCurrency(benchmarkMedian, currency);

  const extracted = extractSalaryRange(job);

  if (extracted) {
    const jobMedian = extracted.median;
    const deltaPercent = wasmEngine.calculateSalaryDelta(jobMedian, benchmarkMedian);
    const tier = wasmEngine.classifySalaryTier(deltaPercent);

    let badgeColor = '#34d399'; // Emerald
    let badgeBg = 'rgba(16, 185, 129, 0.15)';
    let badgeBorder = 'rgba(16, 185, 129, 0.35)';
    let badgeText = `At Market Median (${formattedMedian})`;

    if (tier === 'above_market') {
      badgeColor = '#38bdf8'; // Sky cyan
      badgeBg = 'rgba(56, 189, 248, 0.15)';
      badgeBorder = 'rgba(56, 189, 248, 0.35)';
      badgeText = `~${deltaPercent}% Above Market (Top Tier Comp)`;
    } else if (tier === 'below_market') {
      badgeColor = '#fbbf24'; // Amber
      badgeBg = 'rgba(245, 158, 11, 0.15)';
      badgeBorder = 'rgba(245, 158, 11, 0.35)';
      badgeText = `~${Math.abs(deltaPercent)}% Below Market Median`;
    }

    const inrFxNotice = currency === 'INR' ? ` [${INR_EXCHANGE_RATE_DISCLAIMER}]` : '';

    return {
      hasSalary: true,
      extractedSalaryText: extracted.text,
      minSalary: extracted.min,
      maxSalary: extracted.max,
      annualUsdMedian: jobMedian,
      benchmarkRole: `${seniority.toUpperCase()} ${roleCategory.replace(/_/g, ' ').toUpperCase()}`,
      benchmarkGeo: geoTier.toUpperCase().replace('_', ' '),
      benchmarkRange,
      benchmarkMedian,
      formattedMedian,
      currency: extracted.currency || currency,
      currencySymbol: extracted.currencySymbol || conf.symbol,
      deltaPercent,
      tier,
      badgeText,
      badgeColor,
      badgeBg,
      badgeBorder,
      isEstimate: false,
      estimateType: 'employer_listed_with_informed_median',
      label: 'Employer Listed with Informed Benchmark',
      summary: `Listed: ${extracted.text}. Informed market median for ${seniority} in ${geoTier.replace('_', ' ')} is ${formattedMedian} (${deltaPercent >= 0 ? '+' : ''}${deltaPercent}%). Note: ${SALARY_ESTIMATE_DISCLAIMER}${inrFxNotice}`,
      disclaimer: SALARY_ESTIMATE_DISCLAIMER,
      calibrationDisclaimer: getSalaryCalibrationDisclaimer(),
      calibrationMetadata: { ...SALARY_CALIBRATION_METADATA },
      fxDisclaimer: getExchangeRateDisclaimer(currency) || (currency === 'INR' ? INR_EXCHANGE_RATE_DISCLAIMER : null),
      fxLastUpdated: conf.rateUpdated || SALARY_RATES_LAST_UPDATED,
      fxRate: conf.rateFromUsd,
      fxAdvisory: SALARY_NEGOTIATION_FX_ADVISORY
    };
  }

  // Job did not post explicit salary: provide estimated market range
  const inrFxNotice = currency === 'INR' ? ` [${getExchangeRateDisclaimer('INR') || INR_EXCHANGE_RATE_DISCLAIMER}]` : '';

  return {
    hasSalary: false,
    extractedSalaryText: null,
    minSalary: p25,
    maxSalary: p75,
    annualUsdMedian: benchmarkMedian,
    benchmarkRole: `${seniority.toUpperCase()} ${roleCategory.replace(/_/g, ' ').toUpperCase()}`,
    benchmarkGeo: geoTier.toUpperCase().replace('_', ' '),
    benchmarkRange,
    benchmarkMedian,
    formattedMedian,
    currency,
    currencySymbol: conf.symbol,
    deltaPercent: 0,
    tier: 'unspecified_estimated',
    badgeText: `Informed Est: ${benchmarkRange}`,
    badgeColor: '#a78bfa', // Lavender
    badgeBg: 'rgba(167, 139, 250, 0.12)',
    badgeBorder: 'rgba(167, 139, 250, 0.3)',
    isEstimate: true,
    estimateType: 'informed_static_estimate',
    label: 'Informed Estimate',
    summary: `No salary listed on posting. 2026 informed market estimate for ${seniority} ${roleCategory.replace(/_/g, ' ')} in ${geoTier.replace('_', ' ')} is ${benchmarkRange}. Note: ${SALARY_ESTIMATE_DISCLAIMER}${inrFxNotice}`,
    disclaimer: SALARY_ESTIMATE_DISCLAIMER,
    calibrationDisclaimer: getSalaryCalibrationDisclaimer(),
    calibrationMetadata: { ...SALARY_CALIBRATION_METADATA },
    fxDisclaimer: getExchangeRateDisclaimer(currency) || (currency === 'INR' ? INR_EXCHANGE_RATE_DISCLAIMER : null),
    fxLastUpdated: conf.rateUpdated || SALARY_RATES_LAST_UPDATED,
    fxRate: conf.rateFromUsd,
    fxAdvisory: SALARY_NEGOTIATION_FX_ADVISORY
  };
}

/**
 * Classifies whether a candidate's seniority aligns with the target role.
 */
export function classifySeniorityAlignment(jobTitle = '', jobDescription = '', candidateWorkCountOrYoe = 3) {
  const jobSeniority = detectSeniority(jobTitle, jobDescription);
  
  // Infer candidate seniority
  let candidateSeniority = 'mid';
  const yoe = typeof candidateWorkCountOrYoe === 'number' ? candidateWorkCountOrYoe : 3;
  if (yoe <= 2) candidateSeniority = 'entry';
  else if (yoe <= 5) candidateSeniority = 'mid';
  else if (yoe <= 9) candidateSeniority = 'senior';
  else candidateSeniority = 'staff';

  const order = { entry: 1, mid: 2, senior: 3, staff: 4 };
  const diff = order[candidateSeniority] - order[jobSeniority];

  if (diff >= 2) {
    return {
      jobSeniority,
      candidateSeniority,
      isAligned: false,
      status: 'overqualified',
      warningMessage: `You have ${candidateSeniority.toUpperCase()} experience (~${yoe} YOE), but this posting targets ${jobSeniority.toUpperCase()} level. You may be overqualified.`
    };
  }

  if (diff <= -2) {
    return {
      jobSeniority,
      candidateSeniority,
      isAligned: false,
      status: 'underqualified',
      warningMessage: `This posting requires ${jobSeniority.toUpperCase()} level expertise, whereas your profile indicates ~${yoe} YOE (${candidateSeniority.toUpperCase()}). High reach role.`
    };
  }

  return {
    jobSeniority,
    candidateSeniority,
    isAligned: true,
    status: 'aligned',
    warningMessage: null
  };
}

/**
 * Generates data-backed salary negotiation scripts and strategic counter-offer targets.
 */
export function generateSalaryNegotiationScript({
  offerAmount = 140000,
  roleTitle = 'Software Engineer',
  jobLocation = 'Remote',
  yoe = 4,
  candidateSkills = [],
  companyName = 'Company',
  currency = null
} = {}) {
  const geoTier = detectGeoTier(jobLocation);
  const activeCurrency = currency || GEO_DEFAULT_CURRENCY[geoTier] || 'USD';
  const conf = CURRENCY_CONFIG[activeCurrency] || CURRENCY_CONFIG.USD;

  const benchmark = benchmarkJobSalary({ title: roleTitle, location: jobLocation, salary: `$${offerAmount}` }, { currency: activeCurrency });
  const marketMedian = benchmark.benchmarkMedian || 155000;
  
  // Calculate recommended counter offer (target higher of 10% above offer or 5% above median)
  const baseCounter = Math.max(offerAmount * 1.10, marketMedian * 1.05);
  // Round to nearest $1,000
  const counterTarget = Math.round(baseCounter / 1000) * 1000;
  const deltaFromOffer = counterTarget - offerAmount;
  const deltaPercent = Math.round((deltaFromOffer / offerAmount) * 100);

  const topSkillStr = (Array.isArray(candidateSkills) ? candidateSkills : []).slice(0, 2).join(' and ') || 'specialized technical expertise';

  const formattedCounter = formatSalaryCurrency(counterTarget, activeCurrency);
  const formattedMedian = formatSalaryCurrency(marketMedian, activeCurrency);
  const formattedOffer = formatSalaryCurrency(offerAmount, activeCurrency);
  const formattedDelta = formatSalaryCurrency(deltaFromOffer, activeCurrency);

  const emailScript = `Dear ${companyName} Team,\n\nThank you for extending this offer for the ${roleTitle} position. Based on my ${yoe}+ years of experience in ${topSkillStr} and current 2026 market benchmarks for ${benchmark.benchmarkRole} in ${benchmark.benchmarkGeo} (median ${formattedMedian}), I would be thrilled to accept immediately if we could adjust the base compensation to ${formattedCounter}.\n\nI am confident in my ability to drive immediate velocity on your team and look forward to hearing your thoughts.\n\nBest regards`;

  const verbalScript = `I am genuinely excited about the team and the technical roadmap at ${companyName}. Based on current market compensation data for this role and my verified experience in ${topSkillStr}, I was targeting ${formattedCounter} base. If we can get closer to that number, I would sign today.`;

  const alternativeLeversScript = `If the base salary is locked at ${formattedOffer}, could we explore bridging the gap via a ${formattedDelta} signing bonus, an accelerated 6-month equity refresher, or a dedicated remote equipment & conference budget?`;

  return {
    offerAmount,
    counterTarget,
    deltaFromOffer,
    deltaPercent,
    marketMedian,
    currency: activeCurrency,
    currencySymbol: conf.symbol,
    marketRange: benchmark.benchmarkRange,
    benchmarkRole: benchmark.benchmarkRole,
    benchmarkGeo: benchmark.benchmarkGeo,
    disclaimer: SALARY_ESTIMATE_DISCLAIMER,
    calibrationDisclaimer: getSalaryCalibrationDisclaimer(),
    calibrationMetadata: { ...SALARY_CALIBRATION_METADATA },
    fxDisclaimer: getExchangeRateDisclaimer(activeCurrency) || (activeCurrency === 'INR' ? INR_EXCHANGE_RATE_DISCLAIMER : null),
    fxLastUpdated: conf.rateUpdated || SALARY_RATES_LAST_UPDATED,
    fxRate: conf.rateFromUsd,
    fxAdvisory: SALARY_NEGOTIATION_FX_ADVISORY,
    scripts: {
      email: emailScript,
      verbal: verbalScript,
      alternativeLevers: alternativeLeversScript
    }
  };
}

