/**
 * ats_credentials.js
 * ==================
 * Lightweight credential testing and quota telemetry probes for BYOK providers:
 * - Adzuna Job Search API
 * - USAJOBS Federal Civil Service API
 *
 * Fully decoupled from browser_ats_scanner.js (201KB) to prevent heavy
 * bundle bloat when validating credentials in Settings or Onboarding.
 */

import { storageVault } from './browser_storage_vault.js';

/**
 * Tracks and reports Adzuna monthly API usage in the local storage vault.
 * Free tier limit is 250 calls per calendar month.
 *
 * @returns {Promise<{ used: number, limit: number, monthYear: string, remaining: number }>}
 */
export async function getAdzunaQuotaTelemetry() {
  const currentMonthYear = new Date().toISOString().substring(0, 7); // 'YYYY-MM'
  try {
    const raw = (await storageVault.getItem('sprav_adzuna_monthly_usage')) || {};
    if (raw && raw.monthYear === currentMonthYear) {
      const used = Number(raw.count) || 0;
      return { used, limit: 250, monthYear: currentMonthYear, remaining: Math.max(0, 250 - used) };
    }
    return { used: 0, limit: 250, monthYear: currentMonthYear, remaining: 250 };
  } catch {
    return { used: 0, limit: 250, monthYear: currentMonthYear, remaining: 250 };
  }
}

/**
 * Increments Adzuna monthly quota counter after a successful API fetch.
 *
 * @returns {Promise<number>} Updated usage count
 */
export async function incrementAdzunaQuotaTelemetry() {
  const currentMonthYear = new Date().toISOString().substring(0, 7);
  try {
    const telemetry = await getAdzunaQuotaTelemetry();
    const newCount = telemetry.used + 1;
    await storageVault.setItem('sprav_adzuna_monthly_usage', {
      monthYear: currentMonthYear,
      count: newCount,
      lastCallAt: new Date().toISOString()
    });
    return newCount;
  } catch {
    return 1;
  }
}

/**
 * Tests Adzuna API credentials with an ultra-lightweight 1-result validation probe.
 *
 * @param {string} appId - Adzuna Application ID
 * @param {string} appKey - Adzuna Application Key
 * @returns {Promise<{ ok: boolean, error?: string, message?: string, totalCount?: number }>}
 */
export async function testAdzunaCredentials(appId, appKey) {
  if (!appId || !appKey) {
    return { ok: false, error: 'Both Adzuna App ID and App Key are required.' };
  }
  try {
    const cleanId = String(appId).trim();
    const cleanKey = String(appKey).trim();
    const res = await fetch(`https://api.adzuna.com/v1/api/jobs/us/search/1?app_id=${cleanId}&app_key=${cleanKey}&results_per_page=1&what=developer&content-type=application/json`);
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid Adzuna App ID or App Key (401/403 Unauthorized).' };
    }
    if (res.status === 429) {
      return { ok: false, error: 'Adzuna monthly free quota (250 calls) has been exhausted (429 Too Many Requests).' };
    }
    if (!res.ok) {
      return { ok: false, error: `Adzuna API responded with HTTP status ${res.status}.` };
    }
    const data = await res.json();
    return {
      ok: true,
      totalCount: data.count || 0,
      message: `Verified! Adzuna connected (~${(data.count || 0).toLocaleString()} developer jobs accessible).`
    };
  } catch (err) {
    return { ok: false, error: `Network error connecting to Adzuna: ${err.message}` };
  }
}

/**
 * Tests USAJOBS API credentials with an ultra-lightweight 1-result validation probe.
 *
 * @param {string} apiKey - USAJOBS Authorization-Key
 * @param {string} email - Developer contact email for User-Agent
 * @returns {Promise<{ ok: boolean, error?: string, message?: string, totalCount?: number }>}
 */
export async function testUsajobsCredentials(apiKey, email) {
  if (!apiKey) {
    return { ok: false, error: 'USAJOBS Authorization-Key is required.' };
  }
  try {
    const cleanKey = String(apiKey).trim();
    const cleanEmail = String(email || '').trim() || 'candidate@sprav-job-ai.local';
    const res = await fetch('https://data.usajobs.gov/api/search?Keyword=engineer&ResultsPerPage=1', {
      headers: {
        'User-Agent': cleanEmail,
        'Authorization-Key': cleanKey
      }
    });
    if (res.status === 401 || res.status === 403) {
      return { ok: false, error: 'Invalid USAJOBS Authorization Key or missing User-Agent.' };
    }
    if (!res.ok) {
      return { ok: false, error: `USAJOBS API responded with HTTP status ${res.status}.` };
    }
    const data = await res.json();
    const count = data.SearchResult?.SearchResultCountAll || data.SearchResult?.SearchResultCount || 0;
    return {
      ok: true,
      totalCount: count,
      message: `Verified! USAJOBS connected (${count.toLocaleString()} federal roles accessible).`
    };
  } catch (err) {
    return { ok: false, error: `Network error connecting to USAJOBS: ${err.message}` };
  }
}
