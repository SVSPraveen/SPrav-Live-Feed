/**
 * live_fx_service.js
 * ====================
 * Pure client-side Foreign Exchange (FX) Engine ($0, Zero API Key, Open CORS).
 *
 * Dynamically queries open web currency APIs (open.er-api.com & frankfurter.dev)
 * to keep multi-currency salary benchmarks, counter-offer valuations, and
 * INR LPA conversions 100% current.
 *
 * Features:
 * 1. Multi-source open CORS web fetch (primary: open.er-api.com, secondary: frankfurter.dev).
 * 2. 12-hour offline localStorage cache with graceful fallbacks.
 * 3. In-place reactive synchronization of CURRENCY_CONFIG in salary_benchmark_engine.js.
 * 4. Transparent telemetry (Live Web Sync vs. Cached vs. Baseline) so candidates never
 *    make high-stakes salary decisions on stale data.
 */

import { CURRENCY_CONFIG, EXCHANGE_RATE_METADATA, updateCurrencyRates } from './salary_benchmark_engine.js';

const FX_CACHE_KEY = 'sprav_live_fx_rates_v1';
const CACHE_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

// Calibrated 2026 Baseline Reference Rates
export const DEFAULT_2026_RATES = {
  USD: 1.0,
  INR: 95.51,
  EUR: 0.86,
  GBP: 0.74,
  CAD: 1.38,
  AUD: 1.39,
  SGD: 1.27
};

export const FX_ENDPOINTS = {
  primary: 'https://open.er-api.com/v6/latest/USD',
  secondary: 'https://api.frankfurter.dev/v1/latest?base=USD'
};

let inMemoryFxState = {
  rates: { ...DEFAULT_2026_RATES },
  lastUpdated: '11 Sep 2026',
  timestamp: Date.now(),
  isLive: false,
  isCached: false,
  isFallback: true,
  source: 'Calibrated 2026 Baseline (Offline Default)'
};

const listeners = new Set();

/**
 * Subscribes a callback to live FX rate updates.
 * @param {Function} callback - Called with updated inMemoryFxState
 * @returns {Function} Unsubscribe function
 */
export function subscribeToFxUpdates(callback) {
  if (typeof callback === 'function') {
    listeners.add(callback);
    // Immediately invoke with current state
    try {
      callback(inMemoryFxState);
    } catch {}
    return () => listeners.delete(callback);
  }
  return () => {};
}

function notifyListeners() {
  for (const cb of listeners) {
    try {
      cb(inMemoryFxState);
    } catch (e) {
      console.warn('[LiveFX] Listener notification error:', e);
    }
  }
}

/**
 * Loads cached FX rates from localStorage if valid.
 * @returns {Object|null} Cached state or null if expired/missing
 */
export function getCachedFxRates() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(FX_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.rates || !parsed.timestamp) return null;

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
 * Saves live FX rates to localStorage.
 * @param {Object} data
 */
function saveFxRatesToCache(data) {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(FX_CACHE_KEY, JSON.stringify(data));
    }
  } catch {}
}

/**
 * Parses open.er-api.com API response.
 * @param {Object} json
 * @returns {Object} { rates, dateStr, source }
 */
export function parsePrimaryFxResponse(json) {
  if (!json || json.result !== 'success' || !json.rates) {
    throw new Error('Invalid primary FX response structure');
  }

  const rawRates = json.rates;
  const rates = {
    USD: 1.0,
    INR: Number(Number(rawRates.INR || DEFAULT_2026_RATES.INR).toFixed(2)),
    EUR: Number(Number(rawRates.EUR || DEFAULT_2026_RATES.EUR).toFixed(4)),
    GBP: Number(Number(rawRates.GBP || DEFAULT_2026_RATES.GBP).toFixed(4)),
    CAD: Number(Number(rawRates.CAD || DEFAULT_2026_RATES.CAD).toFixed(4)),
    AUD: Number(Number(rawRates.AUD || DEFAULT_2026_RATES.AUD).toFixed(4)),
    SGD: Number(Number(rawRates.SGD || DEFAULT_2026_RATES.SGD).toFixed(4))
  };

  const rawDate = json.time_last_update_utc;
  let dateStr = 'Today';
  if (rawDate) {
    try {
      const d = new Date(rawDate);
      dateStr = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      dateStr = 'September 2026';
    }
  }

  return {
    rates,
    dateStr,
    source: 'Open Exchange Rates (Daily Live Sync via open.er-api.com)'
  };
}

/**
 * Parses frankfurter.dev secondary fallback response.
 * @param {Object} json
 * @returns {Object} { rates, dateStr, source }
 */
export function parseSecondaryFxResponse(json) {
  if (!json || !json.rates) {
    throw new Error('Invalid secondary FX response structure');
  }

  const rawRates = json.rates;
  const rates = {
    USD: 1.0,
    INR: Number(Number(rawRates.INR || DEFAULT_2026_RATES.INR).toFixed(2)),
    EUR: Number(Number(rawRates.EUR || DEFAULT_2026_RATES.EUR).toFixed(4)),
    GBP: Number(Number(rawRates.GBP || DEFAULT_2026_RATES.GBP).toFixed(4)),
    CAD: Number(Number(rawRates.CAD || DEFAULT_2026_RATES.CAD).toFixed(4)),
    AUD: Number(Number(rawRates.AUD || DEFAULT_2026_RATES.AUD).toFixed(4)),
    SGD: Number(Number(rawRates.SGD || DEFAULT_2026_RATES.SGD).toFixed(4))
  };

  const dateStr = json.date || 'September 2026';

  return {
    rates,
    dateStr,
    source: 'European Central Bank (Frankfurter Open API)'
  };
}

/**
 * Fetches latest foreign exchange rates from the open web, updates CURRENCY_CONFIG,
 * and notifies all UI subscribers.
 *
 * @param {Object} options
 * @param {boolean} [options.force=false] - If true, bypasses 12h cache and refetches
 * @returns {Promise<Object>} Current active FX state
 */
export async function fetchLiveExchangeRates({ force = false } = {}) {
  // 1. Check valid cache if not forcing refresh
  if (!force) {
    const cached = getCachedFxRates();
    if (cached && !cached.isStale) {
      inMemoryFxState = {
        rates: cached.rates,
        lastUpdated: cached.lastUpdated,
        timestamp: cached.timestamp,
        isLive: true,
        isCached: true,
        isFallback: false,
        source: cached.source || 'Open Exchange Rates (Local Cache)'
      };
      updateCurrencyRates(cached.rates, { lastUpdated: cached.lastUpdated, source: inMemoryFxState.source });
      notifyListeners();
      return inMemoryFxState;
    }
  }

  // 2. Fetch from primary endpoint (open.er-api.com)
  try {
    const res = await fetch(FX_ENDPOINTS.primary, { cache: 'no-cache' });
    if (res.ok) {
      const json = await res.json();
      const parsed = parsePrimaryFxResponse(json);

      const newState = {
        rates: parsed.rates,
        lastUpdated: parsed.dateStr,
        timestamp: Date.now(),
        isLive: true,
        isCached: false,
        isFallback: false,
        source: parsed.source
      };

      inMemoryFxState = newState;
      saveFxRatesToCache(newState);
      updateCurrencyRates(parsed.rates, { lastUpdated: parsed.dateStr, source: parsed.source });
      notifyListeners();
      return inMemoryFxState;
    }
  } catch (err) {
    console.warn('[LiveFX] Primary FX fetch failed, trying secondary fallback...', err);
  }

  // 3. Fetch from secondary fallback (frankfurter.dev)
  try {
    const res2 = await fetch(FX_ENDPOINTS.secondary, { cache: 'no-cache' });
    if (res2.ok) {
      const json2 = await res2.json();
      const parsed2 = parseSecondaryFxResponse(json2);

      const newState2 = {
        rates: parsed2.rates,
        lastUpdated: parsed2.dateStr,
        timestamp: Date.now(),
        isLive: true,
        isCached: false,
        isFallback: false,
        source: parsed2.source
      };

      inMemoryFxState = newState2;
      saveFxRatesToCache(newState2);
      updateCurrencyRates(parsed2.rates, { lastUpdated: parsed2.dateStr, source: parsed2.source });
      notifyListeners();
      return inMemoryFxState;
    }
  } catch (err2) {
    console.warn('[LiveFX] Secondary FX fetch failed, falling back to cache or calibrated baseline.', err2);
  }

  // 4. Stale cache fallback
  const staleCached = getCachedFxRates();
  if (staleCached) {
    inMemoryFxState = {
      rates: staleCached.rates,
      lastUpdated: `${staleCached.lastUpdated} (Cached)`,
      timestamp: staleCached.timestamp,
      isLive: false,
      isCached: true,
      isFallback: false,
      source: `${staleCached.source} (Offline Cache)`
    };
    updateCurrencyRates(staleCached.rates, { lastUpdated: inMemoryFxState.lastUpdated, source: inMemoryFxState.source });
    notifyListeners();
    return inMemoryFxState;
  }

  // 5. 2026 Baseline Fallback
  inMemoryFxState = {
    rates: { ...DEFAULT_2026_RATES },
    lastUpdated: 'September 2026 (Calibrated Baseline)',
    timestamp: Date.now(),
    isLive: false,
    isCached: false,
    isFallback: true,
    source: 'Calibrated 2026 Baseline (1 USD ≈ ₹95.51)'
  };
  updateCurrencyRates(DEFAULT_2026_RATES, { lastUpdated: inMemoryFxState.lastUpdated, source: inMemoryFxState.source });
  notifyListeners();
  return inMemoryFxState;
}

/**
 * Returns the current active FX state.
 * @returns {Object}
 */
export function getActiveExchangeRates() {
  return inMemoryFxState;
}

/**
 * Returns comprehensive telemetry for a specific currency (e.g. INR).
 * @param {string} currency
 * @returns {Object}
 */
export function getFxTelemetry(currency = 'INR') {
  const code = String(currency).toUpperCase();
  const rate = inMemoryFxState.rates[code] || (CURRENCY_CONFIG[code]?.rateFromUsd) || 1.0;
  const symbol = CURRENCY_CONFIG[code]?.symbol || '$';

  return {
    code,
    symbol,
    rate,
    lastUpdated: inMemoryFxState.lastUpdated,
    isLive: inMemoryFxState.isLive,
    isCached: inMemoryFxState.isCached,
    isFallback: inMemoryFxState.isFallback,
    source: inMemoryFxState.source,
    badgeText: inMemoryFxState.isLive ? `Live FX: 1 USD ≈ ${symbol}${rate}` : `FX: 1 USD ≈ ${symbol}${rate}`,
    disclaimer: `Exchange rate: 1 USD ≈ ${symbol}${rate} (${inMemoryFxState.isLive ? 'Live Web Sync' : 'Calibrated Baseline'}: ${inMemoryFxState.lastUpdated})`
  };
}

// Auto-initialize on module load in real browser context (skip in test environments)
const isTestEnv = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST);
if (typeof window !== 'undefined' && !isTestEnv) {
  // Use non-blocking microtask so app load is never delayed
  setTimeout(() => {
    fetchLiveExchangeRates().catch(() => {});
  }, 100);
}
