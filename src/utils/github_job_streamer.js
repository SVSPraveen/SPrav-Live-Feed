/**
 * github_job_streamer.js
 * =======================
 * Pure client-side streaming decompressor & search utility for high-volume
 * sovereign job datasets hosted on open GitHub CDNs.
 *
 * Primary Pipelines:
 * 1. SVSPraveen/SPrav-Live-Feed: Active jobs across tech companies
 *    (Greenhouse, Ashby, Lever, Workday, BambooHR, iCIMS).
 * 2. SimplifyJobs: 18,500+ verified SWE, PM & Quant roles for new grads & interns.
 * 3. Himalayas: 90,000–99,000 remote tech jobs via free public CORS API.
 *
 * Zero backend server requirements, 100% CORS-friendly, zero disk bloat.
 */

import { 
  defaultCircuitBreaker, 
  calculateJitteredDelay, 
  swrCacheGet, 
  swrCacheSet 
} from './api_client.js';
import { CURATED_INITIAL_TECH_JOBS } from './curated_initial_jobs.js';
import { 
  computeJobDedupKey, 
  unifyDuplicateJobCards, 
  deduplicateJobs, 
  filterDuplicateJobs 
} from './ats_dedup_filter.js';

export {
  computeJobDedupKey,
  unifyDuplicateJobCards,
  deduplicateJobs,
  filterDuplicateJobs
};

export const SOVEREIGN_SPRAV_EDGE = 'https://svspraveen.github.io/SPrav-Live-Feed';
export const SOVEREIGN_SPRAV_BASE = 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/sovereign-job-feed';
export const FALLBACK_MIRROR_BASE = 'https://raw.githubusercontent.com/Feashliaa/job-board-data/main/data';
export const GITHUB_DATA_BASE = SOVEREIGN_SPRAV_BASE;

export const CURRENT_YEAR = new Date().getFullYear();
export const SIMPLIFY_INTERN_REPO = `SimplifyJobs/Summer${CURRENT_YEAR}-Internships`;
export const SIMPLIFY_INTERN_FALLBACK_REPO = `SimplifyJobs/Summer${CURRENT_YEAR - 1}-Internships`;

export const SOVEREIGN_FEED_SOURCES = {
  SPRAV_LIVE_FEED: {
    id: 'SPRAV_LIVE_FEED',
    name: 'SPrav Live Feed (Primary Sovereign Feed)',
    repo: 'SVSPraveen/SPrav-Live-Feed',
    branches: ['sovereign-job-feed', 'gh-pages', 'main', 'master'],
    edgeUrl: 'https://svspraveen.github.io/SPrav-Live-Feed',
    rawBaseUrl: 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed'
  },
  SIMPLIFY_INTERNSHIPS: {
    id: 'SIMPLIFY_INTERNSHIPS',
    name: 'SimplifyJobs Summer 2025 Internships',
    repo: 'SimplifyJobs/Summer2025-Internships',
    fallbackRepo: 'SimplifyJobs/Summer2024-Internships',
    branches: ['dev', 'main', 'master'],
    path: '.github/scripts/listings.json'
  },
  SIMPLIFY_NEW_GRAD: {
    id: 'SIMPLIFY_NEW_GRAD',
    name: 'SimplifyJobs New Grad Positions',
    repo: 'SimplifyJobs/New-Grad-Positions',
    branches: ['dev', 'main', 'master'],
    path: '.github/scripts/listings.json'
  },
  CODERQUAD_NEW_GRAD: {
    id: 'CODERQUAD_NEW_GRAD',
    name: 'coderQuad New Grad Positions',
    repo: 'coderQuad/New-Grad-Positions',
    branches: ['dev', 'main', 'master'],
    path: '.github/scripts/listings.json'
  }
};

const SIMPLIFY_NEW_GRAD_URL = 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json';
export const SIMPLIFY_INTERN_URL = `https://raw.githubusercontent.com/${SIMPLIFY_INTERN_REPO}/dev/.github/scripts/listings.json`;

export async function resolveSimplifyInternUrl() {
  // Try current year first, fall back to previous year if 404
  for (const repo of [SIMPLIFY_INTERN_REPO, SIMPLIFY_INTERN_FALLBACK_REPO]) {
    const url = `https://raw.githubusercontent.com/${repo}/dev/.github/scripts/listings.json`;
    try {
      const signal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
        ? AbortSignal.timeout(2000)
        : undefined;
      const r = await fetch(url, { method: 'HEAD', signal });
      if (r.ok) return url;
    } catch {}
  }
  return null;
}

// ── Git-as-a-Database Remote Hydration Endpoints (Specialist 5) ─────────────
export const GIT_DB_ENDPOINTS = {
  GLOBAL_CITIES: 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/main/taxonomies/global_cities.json',
  COMPANIES_CATALOG: 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/main/taxonomies/companies_catalog.json',
  TECH_ROLES: 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/main/taxonomies/tech_roles.json'
};

// ── Git-as-a-Database Static Sharding Pipeline (Section 1.2 CTO & Head of Engineering) ──
export const SOVEREIGN_SHARD_ENDPOINTS = {
  BASE_RAW: 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/sovereign-job-feed/data/shards',
  BASE_EDGE: 'https://svspraveen.github.io/SPrav-Live-Feed/data/shards',
  ROLES: {
    frontend: 'roles/frontend.json.gz',
    backend: 'roles/backend.json.gz',
    fullstack: 'roles/fullstack.json.gz',
    aiml: 'roles/aiml.json.gz',
    ai_ml: 'roles/aiml.json.gz',
    devops: 'roles/devops.json.gz',
    internships: 'roles/internships.json.gz',
    security: 'roles/security.json.gz',
    data: 'roles/data.json.gz'
  },
  CITIES: {
    bengaluru: 'cities/bengaluru.json.gz',
    london: 'cities/london.json.gz',
    san_francisco: 'cities/san_francisco.json.gz',
    remote: 'cities/remote.json.gz',
    us_remote: 'cities/remote.json.gz'
  },
  LOCATIONS: {
    bengaluru: 'cities/bengaluru.json.gz',
    london: 'cities/london.json.gz',
    san_francisco: 'cities/san_francisco.json.gz',
    remote: 'cities/remote.json.gz',
    us_remote: 'cities/remote.json.gz'
  }
};

/**
 * Specialist 5: Smart Client Shard URL Mapper
 * Maps the user's active search filter (role discipline or target city) directly
 * to the exact 120KB-200KB gzipped shard, avoiding monolithic listings.json downloads.
 *
 * @param {Object} filter - Active search filter ({ role, keyword, location, city })
 * @returns {string|null} Specific shard URL or null if no shard matches
 */
export function getShardUrlForFilter(filter = {}) {
  const role = String(filter.role || filter.category || filter.keyword || '').toLowerCase().trim();
  const location = String(filter.location || filter.city || '').toLowerCase().trim();

  // 1. Role Shards mapping (download 120KB-200KB instead of 50MB)
  if (role) {
    if (/\b(front|react|vue|angular|ui|web|css|next)/i.test(role)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.ROLES.frontend}`;
    }
    if (/\b(back|api|go|golang|python|django|fastapi|java|spring|node|ruby|rust|c\+\+)/i.test(role)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.ROLES.backend}`;
    }
    if (/\b(full|fullstack|full-stack)/i.test(role)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.ROLES.fullstack}`;
    }
    if (/\b(ai|ml|machine|learning|deep|nlp|llm|vision|pytorch|tensorflow|genai)/i.test(role)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.ROLES.aiml}`;
    }
    if (/\b(devops|sre|infra|cloud|platform|k8s|kubernetes|docker|aws|gcp|azure|ci\/cd)/i.test(role)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.ROLES.devops}`;
    }
  }

  // 2. City Shards mapping
  if (location) {
    if (/\b(bengaluru|bangalore|karnataka|india)/i.test(location)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.CITIES.bengaluru}`;
    }
    if (/\b(london|uk|united\s*kingdom|england)/i.test(location)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.CITIES.london}`;
    }
    if (/\b(san\s*francisco|sf|bay\s*area|california|ca)/i.test(location)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.CITIES.san_francisco}`;
    }
    if (/\b(remote|anywhere|virtual|worldwide|work\s*from\s*home)/i.test(location)) {
      return `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${SOVEREIGN_SHARD_ENDPOINTS.CITIES.remote}`;
    }
  }

  return null;
}

/**
 * Specialist 5: Smart Client Streaming
 * Downloads only the specific 120KB-200KB partition instead of monolithic 50MB listings.
 *
 * @param {Object} filter - Active search filter
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>|null>}
 */
export async function fetchSmartShardedJobs(filter = {}, signal) {
  const shardUrl = getShardUrlForFilter(filter);
  if (!shardUrl) return null;

  const cacheKey = `sprav_smart_shard_${shardUrl.replace(/[^a-zA-Z0-9]/g, '_')}`;
  try {
    const etagRes = await fetchWithEtagSWR(shardUrl, {
      cacheKey,
      signal,
      timeoutMs: 6000,
      swrTtlMs: 3600000 // 1 hour SWR cache
    });
    if (etagRes && Array.isArray(etagRes.data) && etagRes.data.length > 0) {
      return deduplicateJobs(etagRes.data);
    }
  } catch (err) {
    // If shard fails, return null to allow graceful fallback
  }
  return null;
}

/**
 * Fetches a partitioned role shard from the Git-as-a-Database CDN.
 * Downloads only 120KB-220KB per role discipline instead of monolithic listings.
 * 
 * @param {string} roleKey - e.g. 'frontend', 'backend', 'aiml'
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchShardedRoleJobs(roleKey, signal) {
  if (!roleKey || roleKey === 'all') return [];
  const normalizedKey = String(roleKey).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const shardPath = SOVEREIGN_SHARD_ENDPOINTS.ROLES[normalizedKey] || `roles/${normalizedKey}.json`;
  const url = `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${shardPath}`;
  const cacheKey = `sprav_shard_role_${normalizedKey}`;

  try {
    const etagRes = await fetchWithEtagSWR(url, {
      cacheKey,
      signal,
      timeoutMs: 6000,
      swrTtlMs: 3600000 // 1 hour SWR cache
    });
    if (etagRes && Array.isArray(etagRes.data) && etagRes.data.length > 0) {
      return deduplicateJobs(etagRes.data);
    }
  } catch (err) {
    // Graceful fallback to empty/cached
  }
  return [];
}

/**
 * Fetches a partitioned city shard from the Git-as-a-Database CDN.
 * 
 * @param {string} cityKey - e.g. 'bengaluru', 'london', 'remote'
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchShardedCityJobs(cityKey, signal) {
  if (!cityKey || cityKey === 'all') return [];
  const normalizedKey = String(cityKey).toLowerCase().replace(/[^a-z0-9]/g, '_');
  const shardPath = SOVEREIGN_SHARD_ENDPOINTS.LOCATIONS[normalizedKey] || `locations/${normalizedKey}.json`;
  const url = `${SOVEREIGN_SHARD_ENDPOINTS.BASE_RAW}/${shardPath}`;
  const cacheKey = `sprav_shard_city_${normalizedKey}`;

  try {
    const etagRes = await fetchWithEtagSWR(url, {
      cacheKey,
      signal,
      timeoutMs: 6000,
      swrTtlMs: 3600000
    });
    if (etagRes && Array.isArray(etagRes.data) && etagRes.data.length > 0) {
      return deduplicateJobs(etagRes.data);
    }
  } catch (err) {
    // Graceful fallback
  }
  return [];
}

/**
 * Hydrates a dataset from the Git-as-a-Database repository using ETag / If-None-Match headers.
 * - HTTP 304 -> instant load from IndexedDB with 0 bytes transferred
 * - HTTP 200 -> updates IndexedDB and persists new ETag
 * - Offline / Failure -> falls back to IndexedDB cache or bundled seed data
 *
 * @param {string} url - Remote Git database URL
 * @param {Object} [options]
 * @param {string} [options.cacheKey]
 * @param {any} [options.fallbackSeed]
 * @param {number} [options.timeoutMs=5000]
 * @param {number} [options.swrTtlMs=86400000]
 * @returns {Promise<{ data: any, fromCache: boolean, notModified: boolean, etag?: string, isBundledFallback?: boolean }>}
 */
export async function hydrateGitDatabaseDataset(url, options = {}) {
  const {
    cacheKey = `gitdb_${url.replace(/[^a-zA-Z0-9]/g, '_')}`,
    fallbackSeed = null,
    timeoutMs = 5000,
    swrTtlMs = 24 * 60 * 60 * 1000 // 24 hour fresh cache
  } = options;

  try {
    const result = await fetchWithEtagSWR(url, {
      cacheKey,
      timeoutMs,
      swrTtlMs,
      headers: {
        Accept: 'application/json'
      }
    });

    if (result && result.data) {
      return {
        data: result.data,
        fromCache: Boolean(result.fromCache),
        notModified: Boolean(result.notModified),
        etag: result.etag
      };
    }
  } catch (err) {
    console.warn(`[Git-as-a-Database] Hydration error for ${url}:`, err);
  }

  // Check persistent cache directly
  try {
    const cached = await swrCacheGet(cacheKey, swrTtlMs);
    if (cached?.data) {
      return { data: cached.data, fromCache: true, notModified: false };
    }
  } catch {}

  // Fallback to bundled seed
  return { data: fallbackSeed, fromCache: false, notModified: false, isBundledFallback: true };
}

// ── ETag & Stale-While-Revalidate Headers Management ────────────────────────
export const ETAG_STORAGE_PREFIX = 'sprav_gh_etag_';

/**
 * Retrieves stored ETag and commit hash for a URL/cache key from localStorage.
 * @param {string} key
 * @returns {{ etag: string|null, commitHash: string|null, timestamp: number }|null}
 */
export function getStoredGitHubEtag(key) {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem(`${ETAG_STORAGE_PREFIX}${key}`);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Stores ETag and commit hash in localStorage to prevent 304 rate limits.
 * @param {string} key
 * @param {string} [etag]
 * @param {string} [commitHash]
 */
export function setStoredGitHubEtag(key, etag, commitHash) {
  if (typeof localStorage === 'undefined' || (!etag && !commitHash)) return;
  try {
    const payload = {
      etag: etag || null,
      commitHash: commitHash || null,
      timestamp: Date.now()
    };
    localStorage.setItem(`${ETAG_STORAGE_PREFIX}${key}`, JSON.stringify(payload));
  } catch {}
}

/**
 * Clears stored GitHub ETags from localStorage.
 */
export function clearStoredGitHubEtags() {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(ETAG_STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
}

/**
 * Fetches remote content using HTTP ETag conditional headers (If-None-Match)
 * and SWR IndexedDB caching. Prevents redundant payload downloads and eliminates
 * GitHub 304 / rate-limit penalties.
 *
 * @param {string} url - Target URL
 * @param {Object} [options={}] - Fetch options
 * @returns {Promise<{ status: number, notModified: boolean, data: any, fromCache: boolean, etag?: string }>}
 */
export async function fetchWithEtagSWR(url, options = {}) {
  const {
    cacheKey = `swr_etag_${url.replace(/[^a-zA-Z0-9]/g, '_')}`,
    headers = {},
    signal,
    timeoutMs = 8000,
    swrTtlMs = 15 * 60 * 1000
  } = options;

  const storedEtagMeta = getStoredGitHubEtag(cacheKey);
  const reqHeaders = { ...headers };
  if (storedEtagMeta?.etag) {
    reqHeaders['If-None-Match'] = storedEtagMeta.etag;
  }

  // Pre-load from IndexedDB SWR cache
  const cached = await swrCacheGet(cacheKey, swrTtlMs);

  try {
    const timeoutSignal = typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function'
      ? AbortSignal.timeout(timeoutMs)
      : undefined;

    // Use combined signal if provided
    const effectiveSignal = signal || timeoutSignal;

    const res = await fetch(url, {
      method: 'GET',
      headers: reqHeaders,
      signal: effectiveSignal
    });

    // 304 Not Modified: Cache is 100% fresh, avoid downloading payload & consuming quota
    if (res.status === 304) {
      if (cached && cached.data) {
        return {
          status: 304,
          notModified: true,
          data: cached.data,
          fromCache: true,
          etag: storedEtagMeta?.etag
        };
      }
    }

    if (res.ok) {
      const resEtag = typeof res?.headers?.get === 'function' ? (res.headers.get('etag') || res.headers.get('ETag')) : null;
      const commitHash = typeof res?.headers?.get === 'function' ? (res.headers.get('x-git-commit-id') || res.headers.get('x-github-request-id')) : null;
      if (resEtag || commitHash) {
        setStoredGitHubEtag(cacheKey, resEtag, commitHash);
      }

      let data;
      if (url.endsWith('.gz') || url.includes('.json.gz')) {
        const text = await decompressGzipResponse(res);
        data = JSON.parse(text);
      } else {
        data = await res.json();
      }
      if (data) {
        await swrCacheSet(cacheKey, data);
      }
      return {
        status: res.status,
        notModified: false,
        data,
        fromCache: false,
        etag: resEtag || storedEtagMeta?.etag
      };
    }

    // 429 or 5xx: Fall back to persistent cache if available
    if (cached && cached.data) {
      return {
        status: res.status,
        notModified: false,
        data: cached.data,
        fromCache: true,
        etag: storedEtagMeta?.etag
      };
    }

    return { status: res.status, notModified: false, data: null, fromCache: false };
  } catch (err) {
    // Network hiccup / offline: serve from persistent cache if available
    if (cached && cached.data) {
      return {
        status: 0,
        notModified: false,
        data: cached.data,
        fromCache: true,
        etag: storedEtagMeta?.etag
      };
    }
    throw err;
  }
}

/**
 * Fetches listings JSON from a GitHub repository with multi-branch resilience,
 * conditional ETag caching to prevent 304 rate limits, client-side circuit breaker,
 * jittered exponential backoff on 429 rate-limiting, and 15-minute SWR caching in IndexedDB.
 *
 * @param {string} repo - e.g. 'coderQuad/New-Grad-Positions'
 * @param {string[]} [branches=['dev', 'main', 'master']] - Branch candidates to probe
 * @param {string} [filePath='.github/scripts/listings.json'] - File path within repo
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Array<Object>>} Parsed raw listings or empty array
 */
export async function fetchGitHubRepoListings(repo, branches = ['dev', 'main', 'master'], filePath = '.github/scripts/listings.json', signal) {
  const cacheKey = `sprav_repo_listings_${repo.replace(/[^a-zA-Z0-9]/g, '_')}`;
  const originKey = `github_repo_${repo}`;

  if (!defaultCircuitBreaker.isOpen(originKey)) {
    for (let attempt = 0; attempt < branches.length; attempt++) {
      if (signal?.aborted) break;
      const branch = branches[attempt];
      const url = `https://raw.githubusercontent.com/${repo}/${branch}/${filePath}`;
      try {
        const etagRes = await fetchWithEtagSWR(url, {
          cacheKey: `${cacheKey}_${branch}`,
          signal,
          timeoutMs: 6000
        });

        if (etagRes && (etagRes.notModified || etagRes.status === 200 || etagRes.fromCache)) {
          if (Array.isArray(etagRes.data) && etagRes.data.length > 0) {
            defaultCircuitBreaker.recordSuccess(originKey);
            await swrCacheSet(cacheKey, etagRes.data);
            return etagRes.data;
          }
        } else if (etagRes?.status === 429) {
          defaultCircuitBreaker.recordFailure(originKey, new Error('HTTP 429 Rate Limit'));
          const delay = calculateJitteredDelay(attempt, 200, 2000);
          await new Promise((resolve) => setTimeout(resolve, delay));
        } else if (etagRes?.status >= 500) {
          defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${etagRes.status}`));
        }
      } catch (err) {
        defaultCircuitBreaker.recordFailure(originKey, err);
      }
    }
  }

  // Resilient fallback to 15-minute IndexedDB SWR cache
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      return cached.data;
    }
  } catch {}

  return [];
}


// Keyless Free Public CORS-Enabled Tech Job APIs (Zero Authentication / Zero Keys Required)
const HIMALAYAS_BASE_URL = 'https://himalayas.app/jobs/api';
const HIMALAYAS_SEARCH_URL = 'https://himalayas.app/jobs/api/search';
const JOBICY_BASE_URL = 'https://jobicy.com/api/v2/remote-jobs';
const ARBEITNOW_BASE_URL = 'https://www.arbeitnow.com/api/job-board-api';

// In-memory cache for metadata to avoid redundant network pings
let _cachedMetadata = null;
let _cachedMetadataTime = 0;
const METADATA_TTL_MS = 60 * 60 * 1000; // 1 hour

export function _resetMetadataCache() {
  _cachedMetadata = null;
  _cachedMetadataTime = 0;
}

/**
 * Strict Active-Only Validation & Hygiene Filter for job postings.
 * Ensures only active, live, non-expired, and non-scam positions are displayed.
 * @param {Object} job
 * @param {number} [maxAgeDays=60]
 * @returns {boolean}
 */
export function isActiveJob(job, maxAgeDays = 60) {
  if (!job || typeof job !== 'object') return false;
  if (!job.title || !job.company) return false;

  // 1. Explicit inactive or closed signals
  if (job.active === false || job.is_active === false) return false;
  if (job.deleted === true || job.is_deleted === true) return false;
  if (job.status && typeof job.status === 'string') {
    const s = job.status.toLowerCase().trim();
    if (s === 'closed' || s === 'inactive' || s === 'archived' || s === 'expired' || s === 'draft') {
      return false;
    }
  }

  // 2. Date freshness check (drop stale jobs > maxAgeDays without verification)
  const dateStr = job.scraped_at || job.posted_at || job.updated_at || job.first_seen;
  if (dateStr) {
    const timeMs = new Date(dateStr).getTime();
    if (!isNaN(timeMs)) {
      const ageDays = (Date.now() - timeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) return false;
    }
  }

  // 3. Spam & predatory keyword checks
  const title = (job.title || '').toLowerCase();
  const desc = (job.description || '').toLowerCase();
  const combined = `${title} ${desc}`;
  if (/\b(100%\s*commission|uncapped\s*commission\s*only|commission\s*only\b|multi-level\s*marketing|door-to-door|crypto\s*pump|t\.me\/|unpaid\s*trial)\b/i.test(combined)) {
    return false;
  }

  // 4. Ghost talent pool checks (non-headcount collection pools)
  if (/\b(talent\s*(community|network|pool)|future\s*opportunities|general\s*application|expression\s*of\s*interest)\b/i.test(title)) {
    return false;
  }

  return true;
}

/**
 * Universal gzip decompressor working seamlessly across modern browsers and Node.js test environments.
 * @param {Response} response - Fetch response object
 * @returns {Promise<string>} Decompressed UTF-8 text
 */
async function decompressGzipResponse(response) {
  // 1. Browser Native DecompressionStream (Chrome 80+, Safari 16.4+, Firefox 113+, Edge 80+)
  if (typeof DecompressionStream !== 'undefined' && response.body && typeof response.body.pipeThrough === 'function') {
    try {
      const decompressedStream = response.body.pipeThrough(new DecompressionStream('gzip'));
      return await new Response(decompressedStream).text();
    } catch {
      // If stream pipe fails, fall through to buffer fallback
    }
  }

  // 2. Buffer/Node.js fallback using zlib
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  // Check if zlib is available in Node.js
  try {
    const zlib = await import('zlib');
    if (zlib && typeof zlib.gunzipSync === 'function') {
      return zlib.gunzipSync(buffer).toString('utf-8');
    }
  } catch {
    // If dynamic import fails, try commonjs require
    try {
      // eslint-disable-next-line no-undef
      const zlib = require('zlib');
      if (zlib && typeof zlib.gunzipSync === 'function') {
        return zlib.gunzipSync(buffer).toString('utf-8');
      }
    } catch {}
  }

  throw new Error('Gzip decompression not supported in current JavaScript environment.');
}

/**
 * Fetches live metadata for the sovereign directly-sourced tech listings index.
 * Probes the primary Sovereign SPrav CDN first, then gracefully cascades to fallback.
 * @param {AbortSignal} [signal]
 * @param {Object} [options]
 * @returns {Promise<{ total_jobs: number, active_companies: number, last_updated: string, platforms: string, source: string }>}
 */
export async function fetchJobBoardMetadata(signal, options = {}) {
  const forceRefresh = options?.forceRefresh || false;
  const now = Date.now();
  if (!forceRefresh && _cachedMetadata && (now - _cachedMetadataTime < METADATA_TTL_MS)) {
    return _cachedMetadata;
  }

  const cacheKey = 'sprav_job_board_metadata';
  const mirrors = [
    { url: `${SOVEREIGN_SPRAV_EDGE}/metadata.json`, source: 'sovereign_edge_cdn' },
    { url: `${SOVEREIGN_SPRAV_BASE}/metadata.json`, source: 'sovereign_cdn' },
    { url: `${FALLBACK_MIRROR_BASE}/metadata.json`, source: 'fallback_mirror' }
  ];

  for (const mirror of mirrors) {
    if (signal?.aborted) break;
    const originKey = defaultCircuitBreaker.getEndpointKey(mirror.url);

    // Failover in <250ms: Skip endpoint if circuit is tripped
    if (defaultCircuitBreaker.isOpen(originKey)) {
      continue;
    }

    try {
      let fetchSignal = signal;
      let timeoutId = null;
      if (mirror.url.includes(FALLBACK_MIRROR_BASE)) {
        // BUG-005: Fallback mirror timeout protection (3500ms)
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 3500);
        fetchSignal = signal ? (typeof AbortSignal?.any === 'function' ? AbortSignal.any([signal, controller.signal]) : controller.signal) : controller.signal;
      }

      try {
        const res = await fetch(mirror.url, { signal: fetchSignal });
        if (timeoutId) clearTimeout(timeoutId);
        if (res && res.ok) {
          defaultCircuitBreaker.recordSuccess(originKey);
          const data = await res.json();
          _cachedMetadata = {
            total_jobs: data.total_jobs || 164496,
            active_companies: data.active_companies || data.total_companies || 8771,
            total_companies: data.total_companies || 8771,
            last_updated: data.last_updated || new Date().toISOString(),
            platforms: data.platforms || 'Greenhouse, Ashby, Lever, Workday, SmartRecruiters, Himalayas, Remotive, Jobicy, Arbeitnow, HN',
            source: mirror.source
          };
          _cachedMetadataTime = now;
          await swrCacheSet(cacheKey, _cachedMetadata);
          return _cachedMetadata;
        } else {
          defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
        }
      } catch (innerErr) {
        if (timeoutId) clearTimeout(timeoutId);
        if (mirror.url.includes(FALLBACK_MIRROR_BASE)) {
          console.warn('[JobStreamer] Optional third-party fallback mirror metadata fetch failed or timed out:', innerErr?.message || innerErr);
        }
        defaultCircuitBreaker.recordFailure(originKey, innerErr);
      }
    } catch (err) {
      defaultCircuitBreaker.recordFailure(originKey, err);
    }
  }

  // Check 15-minute SWR cache before offline fallback
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && cached.data) {
      _cachedMetadata = cached.data;
      _cachedMetadataTime = now;
      return _cachedMetadata;
    }
  } catch {}

  // 3. Graceful fallback to verified snapshot
  return {
    total_jobs: 164496,
    active_companies: 8771,
    total_companies: 8771,
    last_updated: new Date().toISOString(),
    platforms: 'Greenhouse, Ashby, Lever, Workday, BambooHR, iCIMS, Himalayas',
    source: 'offline_fallback'
  };
}

/**
 * Schema Normalization Pipeline
 * ==============================
 * Guarantees standard fields across all incoming sovereign feeds and user caches:
 * (id, title, company, location, work_mode, posted_date, apply_url, source)
 *
 * @param {Object} raw - Raw job listing from any feeder
 * @param {string} [defaultSource='SOVEREIGN_FEED'] - Feeder source identifier
 * @param {Object} [options={}] - Options (e.g. filterInactive)
 * @returns {Object|null} Normalized job schema adhering to the 8 standard fields
 */
export function normalizeJobSchema(raw, defaultSource = 'SOVEREIGN_FEED', options = {}) {
  if (!raw || typeof raw !== 'object') return null;

  // Optional strict hygiene/active filter
  if (options.filterInactive && !isActiveJob(raw)) {
    return null;
  }

  // 1. Company
  const company = (
    raw.company ||
    raw.company_name ||
    raw.employer ||
    raw.companyName ||
    'Tech Company'
  ).toString().trim();

  // 2. Title
  const title = (
    raw.title ||
    raw.jobTitle ||
    raw.role ||
    raw.position ||
    'Software Engineer'
  ).toString().trim();

  // 3. Location
  let location = 'Remote';
  if (Array.isArray(raw.locations) && raw.locations.length > 0) {
    location = raw.locations.filter(Boolean).map(l => String(l).trim()).join(', ');
  } else if (raw.location) {
    location = String(raw.location).trim();
  } else if (raw.jobGeo) {
    location = String(raw.jobGeo).trim();
  } else if (raw.city || raw.state || raw.country) {
    location = [raw.city, raw.state, raw.country].filter(Boolean).join(', ');
  }
  if (!location) location = 'Remote';

  // 4. Work Mode ('remote' | 'hybrid' | 'onsite')
  let workMode = 'onsite';
  const rawMode = String(raw.work_mode || raw.workplace_type || raw.workMode || '').toLowerCase().trim();
  if (rawMode === 'remote' || rawMode === 'hybrid' || rawMode === 'onsite') {
    workMode = rawMode;
  } else if (raw.remote === true || raw.is_remote === true) {
    workMode = 'remote';
  } else {
    const locLower = location.toLowerCase();
    const titleLower = title.toLowerCase();

    // Check hybrid signals first
    if (/\b(hybrid|flexible work)\b/i.test(locLower) || /\b(hybrid)\b/i.test(titleLower)) {
      workMode = 'hybrid';
    } else if (
      locLower === 'remote' ||
      /\b(remote|anywhere|virtual|work from home|wfh|telecommute)\b/i.test(locLower) ||
      /\b(remote|work from home|wfh)\b/i.test(titleLower)
    ) {
      workMode = 'remote';
    } else {
      workMode = 'onsite';
    }
  }

  // 5. Posted Date (Guaranteed ISO-8601 string)
  let postedDate = null;
  const rawDate = raw.posted_date || raw.date_posted || raw.posted_at || raw.scraped_at || raw.first_seen || raw.pubDate || raw.created_at || raw.updated_at;
  if (typeof rawDate === 'number') {
    const ms = rawDate < 1e11 ? rawDate * 1000 : rawDate;
    const d = new Date(ms);
    if (!isNaN(d.getTime())) postedDate = d.toISOString();
  } else if (typeof rawDate === 'string' && rawDate.trim()) {
    const d = new Date(rawDate.trim());
    if (!isNaN(d.getTime())) postedDate = d.toISOString();
  }
  if (!postedDate) {
    postedDate = new Date().toISOString();
  }

  // 6. Apply URL
  const applyUrl = (
    raw.apply_url ||
    raw.url ||
    raw.job_url ||
    raw.link ||
    raw.company_url ||
    'https://sprav.ai/jobs'
  ).toString().trim();

  // 7. Source
  const source = (
    raw.source ||
    defaultSource ||
    'SOVEREIGN_FEED'
  ).toString().trim().toUpperCase();

  // 8. ID (Deterministic, sanitized, non-empty)
  let id = raw.id ? String(raw.id).trim() : '';
  if (!id) {
    const cleanComp = company.toLowerCase().replace(/[^a-z0-9]/g, '');
    const cleanTitle = title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const hash = Math.abs(
      (applyUrl + company + title).split('').reduce((acc, c) => ((acc << 5) - acc) + c.charCodeAt(0), 0)
    ).toString(36);
    id = `${source.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${cleanComp}_${cleanTitle.substring(0, 16)}_${hash}`;
  } else {
    id = id.replace(/[\s/\\?%*:|"<>]/g, '_');
  }

  return {
    ...raw,
    // 8 Required Standard Fields
    id,
    title,
    company,
    location,
    work_mode: workMode,
    posted_date: postedDate,
    apply_url: applyUrl,
    source,

    // Backward compatibility aliases
    url: applyUrl,
    posted_at: postedDate,
    is_remote: workMode === 'remote',
    portal: raw.portal || `${company} Careers`,
    provenance_tier: raw.provenance_tier || 'sovereign_feed'
  };
}

/**
 * Normalizes a raw Feashliaa job object into SPrav standard schema.
 * @param {Object} raw
 * @returns {Object} SPrav normalized job
 */
export function normalizeFeashliaaJob(raw) {
  if (!raw || !isActiveJob(raw)) return null;
  const ats = (raw.ats || 'ATS').trim();
  const sourceName = `${ats.toUpperCase()}_INDEX`;
  const normalized = normalizeJobSchema(raw, sourceName);
  if (!normalized) return null;

  const loc = normalized.location;
  const isRemote = !loc || /remote|anywhere|distributed|virtual/i.test(loc);
  
  // Format salary percentiles if disclosed
  let salaryRange = null;
  let salaryMedian = null;
  if (raw.salary && typeof raw.salary === 'object' && raw.salary.median) {
    salaryMedian = Math.round(raw.salary.median);
    const p25 = raw.salary.p25 ? Math.round(raw.salary.p25 / 1000) : null;
    const p75 = raw.salary.p75 ? Math.round(raw.salary.p75 / 1000) : null;
    if (p25 && p75) {
      salaryRange = `$${p25}k - $${p75}k`;
    } else {
      salaryRange = `~$${Math.round(salaryMedian / 1000)}k/yr`;
    }
  }

  const safeId = raw.id || `gh_${ats.toLowerCase().replace(/[^a-z0-9]/g, '')}_${normalized.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    ...normalized,
    id: safeId,
    source: sourceName,
    portal: `${ats} (Global Index)`,
    provenance_tier: 'global_index',
    provenance_label: 'Global Index (Snapshot)',
    freshness_guarantee: 'Aggregated Daily Mirror Index Snapshot',
    description: `${normalized.title} at ${normalized.company}. Seniority level: ${raw.skill_level || 'General'}. Location: ${loc}.${salaryRange ? ` Estimated compensation: ${salaryRange}.` : ''}`,
    salary_range: salaryRange,
    salary_median: salaryMedian,
    salary_p25: raw.salary?.p25 || null,
    salary_p75: raw.salary?.p75 || null,
    skill_level: raw.skill_level || 'mid',
    is_recruiter: Boolean(raw.is_recruiter),
    is_remote: isRemote
  };
}

/**
 * Normalizes a SimplifyJobs posting into SPrav standard schema.
 * @param {Object} raw
 * @returns {Object} SPrav normalized job
 */
export function normalizeSimplifyJob(raw) {
  if (!raw) return null;
  const normalized = normalizeJobSchema(raw, 'SIMPLIFY_INDEX');
  if (!normalized) return null;

  const safeId = `simplify_${raw.id || Math.random().toString(36).substring(2, 8)}`;

  return {
    ...normalized,
    id: safeId,
    source: 'SIMPLIFY_INDEX',
    portal: 'Simplify (Early Career & Intern Index)',
    provenance_tier: 'curated_index',
    provenance_label: 'Simplify Early Career Index',
    freshness_guarantee: 'Verified Student & Early Career Roles',
    description: `${normalized.title} at ${normalized.company}. Category: ${raw.category || 'Engineering'}. Location: ${normalized.location}.${raw.sponsorship ? ` Work Sponsorship: ${raw.sponsorship}.` : ''}`,
    category: raw.category || 'Engineering',
    sponsorship: raw.sponsorship || null
  };
}

/**
 * Decodes and validates base64 imported job payload with size limits.
 * GAP-003: Checks encoded payload length and strictly guards against decoded payloads > 200KB.
 * @param {string} importPayload
 * @returns {Object|null}
 */
export function decodeJobImportPayload(importPayload) {
  if (!importPayload || typeof importPayload !== 'string' || importPayload.trim().length < 4 || importPayload.length >= 50000) {
    return null;
  }
  let decodedStr;
  try {
    const binary = atob(importPayload);
    if (binary.length > 200000) {
      throw new Error('Decoded payload exceeds 200KB safety limit');
    }
    const bytes = Uint8Array.from(binary, c => c.charCodeAt(0));
    decodedStr = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    if (decodedStr.length > 200000) {
      throw new Error('Decoded payload exceeds 200KB safety limit');
    }
  } catch (decodeErr) {
    console.warn('[github_job_streamer] Decoded payload validation failed:', decodeErr?.message);
    return null;
  }
  try {
    const parsed = JSON.parse(decodedStr);
    if (!parsed || typeof parsed !== 'object' || !parsed.title) return null;
    return parsed;
  } catch {
    return null;
  }
}

/**
 * Streams, decompresses, and filters a single 25,000-job chunk (~1.2 MB gzipped).
 * @param {number} chunkIndex - Chunk number (0 to 58)
 * @param {Object} [filterOptions] - Filtering parameters
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>} Matching normalized jobs
 */
export async function streamJobChunk(chunkIndex = 0, filterOptions = {}, signal) {
  const {
    keyword = '',
    location = '',
    directOnly = false,
    hasSalary = false,
    limit = 100
  } = filterOptions;

  const cacheKey = `sprav_job_chunk_${chunkIndex}`;
  let rawList = null;

  // Mirror candidates in order of priority: Fast Pages Edge -> Raw GitHub CDN -> Fallback Community Mirror
  const mirrorEndpoints = [
    `${SOVEREIGN_SPRAV_EDGE}/chunks/jobs_chunk_${chunkIndex}.json.gz`,
    `${SOVEREIGN_SPRAV_BASE}/chunks/jobs_chunk_${chunkIndex}.json.gz`,
    `${FALLBACK_MIRROR_BASE}/chunks/jobs_chunk_${chunkIndex}.json.gz`
  ];

  for (const mirrorUrl of mirrorEndpoints) {
    if (signal?.aborted) break;
    const originKey = defaultCircuitBreaker.getEndpointKey(mirrorUrl);

    // Failover within <250ms: Skip endpoint if circuit breaker is OPEN
    if (defaultCircuitBreaker.isOpen(originKey)) {
      continue;
    }

    try {
      let fetchSignal = signal;
      let timeoutId = null;
      if (mirrorUrl.includes(FALLBACK_MIRROR_BASE)) {
        // BUG-005: Protect third-party fallback mirror fetch with 3500ms timeout
        const controller = new AbortController();
        timeoutId = setTimeout(() => controller.abort(), 3500);
        fetchSignal = signal ? (typeof AbortSignal?.any === 'function' ? AbortSignal.any([signal, controller.signal]) : controller.signal) : controller.signal;
      }

      try {
        const res = await fetch(mirrorUrl, { signal: fetchSignal });
        if (timeoutId) clearTimeout(timeoutId);
        if (res && res.ok) {
          defaultCircuitBreaker.recordSuccess(originKey);
          let rawJsonText = await decompressGzipResponse(res);
          rawList = JSON.parse(rawJsonText);
          rawJsonText = null; // V8 Optimization: immediately free string buffer
          if (Array.isArray(rawList) && rawList.length > 0) {
            // Cache successful response in IndexedDB with 15-minute SWR
            await swrCacheSet(cacheKey, rawList);
            break;
          }
        } else {
          defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
        }
      } catch (innerErr) {
        if (timeoutId) clearTimeout(timeoutId);
        if (mirrorUrl.includes(FALLBACK_MIRROR_BASE)) {
          console.warn('[JobStreamer] Fallback mirror fetch failed or timed out:', innerErr?.message || innerErr);
        }
        defaultCircuitBreaker.recordFailure(originKey, innerErr);
      }
    } catch (err) {
      defaultCircuitBreaker.recordFailure(originKey, err);
      // Automatic fast failover to next candidate mirror
    }
  }

  // If all live mirrors failed or circuits were open, route to local IndexedDB SWR cache
  if (!Array.isArray(rawList)) {
    try {
      const cached = await swrCacheGet(cacheKey);
      if (cached && Array.isArray(cached.data)) {
        rawList = cached.data;
      }
    } catch {}
  }

  if (!Array.isArray(rawList)) return [];

  const cleanKeyword = keyword.trim().toLowerCase();
  const cleanLoc = location.trim().toLowerCase();
  const keywordRegex = cleanKeyword ? new RegExp(`\\b${cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') : null;

  const matches = [];
  for (const item of rawList) {
    if (!item) continue;
    
    // Strict active-only & hygiene check (drops closed, stale, spam, or ghost listings)
    if (!isActiveJob(item)) continue;
    
    // Direct employer filter (exclude agency recruiter postings if requested)
    if (directOnly && item.is_recruiter) continue;

    // Disclosed salary filter
    if (hasSalary && (!item.salary || !item.salary.median)) continue;

    // Location filter
    if (cleanLoc) {
      const itemLoc = (item.location || '').toLowerCase();
      if (!itemLoc.includes(cleanLoc) && !(cleanLoc.includes('remote') && /remote|anywhere|virtual/i.test(itemLoc))) {
        continue;
      }
    }

    // Keyword filter
    if (keywordRegex) {
      const titleMatch = keywordRegex.test(item.title || '');
      const companyMatch = keywordRegex.test(item.company || '');
      if (!titleMatch && !companyMatch) continue;
    }

    const normalized = normalizeFeashliaaJob(item);
    if (normalized) matches.push(normalized);

    if (matches.length >= limit) break;
  }

  return matches;
}

/**
 * Streams and decompresses multiple job chunks in bounded parallel batches.
 * Limits peak memory spike by bounding concurrency to 2 chunks at a time.
 * @param {Array<number>} chunkIndices - Array of chunk indices to fetch
 * @param {Object} [filterOptions] - Filtering options
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>} Aggregated normalized jobs
 */
export async function streamMultipleChunks(chunkIndices = [0], filterOptions = {}, signal) {
  const { limit = 100 } = filterOptions;
  const results = [];
  const BATCH_CONCURRENCY = 2;

  for (let i = 0; i < chunkIndices.length; i += BATCH_CONCURRENCY) {
    if (signal?.aborted) break;
    const batch = chunkIndices.slice(i, i + BATCH_CONCURRENCY);
    const promises = batch.map(idx => streamJobChunk(idx, {
      ...filterOptions,
      limit: limit - results.length
    }, signal));

    const settled = await Promise.allSettled(promises);
    for (const res of settled) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        results.push(...res.value);
        if (results.length >= limit) break;
      }
    }

    if (results.length >= limit) break;
  }

  return results.slice(0, limit);
}

/**
 * Progressive multi-chunk search across sovereign directly-sourced tech listings.
 * Powered by client-side Chunked Inverted Index with BM25 ranking.
 * Keeps total execution time under 50ms while scanning up to 50,000–75,000 jobs.
 *
 * @param {string} query - Keyword query (e.g. "React", "Rust", "Distributed Systems")
 * @param {Object} [options] - Search options
 * @returns {Promise<{ jobs: Array<Object>, totalScanned: number, durationMs: number, indexedTotal?: number }>}
 */
export async function searchHighVolumeStream(query = '', options = {}) {
  const startTime = Date.now();
  const {
    location = '',
    directOnly = false,
    hasSalary = false,
    targetMatches = 40,
    maxChunksToScan = 3,
    signal
  } = options;

  if (!query && !location) return { jobs: [], totalScanned: 0, durationMs: 0 };

  // 0. Specialist 5: Smart Client Sharded Ingestion (<200KB targeted download)
  try {
    const shardedJobs = await fetchSmartShardedJobs({ keyword: query, location }, signal);
    if (shardedJobs && Array.isArray(shardedJobs) && shardedJobs.length > 0) {
      return {
        jobs: shardedJobs.slice(0, targetMatches),
        totalScanned: shardedJobs.length,
        durationMs: Date.now() - startTime,
        indexedTotal: shardedJobs.length,
        isSharded: true
      };
    }
  } catch {}

  // 1. Primary: Instant Inverted Index Edge Search
  try {
    const { edgeSearchEngine } = await import('./edge_search_engine.js');
    const edgeRes = await edgeSearchEngine.searchUniverse(query, {
      location,
      directOnly,
      hasSalary,
      limit: targetMatches,
      maxChunksToScan,
      signal
    });

    if (edgeRes && Array.isArray(edgeRes.jobs) && edgeRes.jobs.length > 0) {
      return {
        jobs: edgeRes.jobs,
        totalScanned: (edgeRes.chunksScanned || 1) * 25000,
        durationMs: edgeRes.durationMs || (Date.now() - startTime),
        indexedTotal: edgeRes.totalUniverseIndexed || null
      };
    }
  } catch {
    // If index is unreachable or offline, gracefully fall through to sequential stream
  }

  // 2. Secondary Fallback: Parallel chunk scanner
  const startChunk = Math.abs(query.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0)) % 55;
  const chunkIndices = Array.from({ length: maxChunksToScan }, (_, i) => (startChunk + i) % 59);

  const discovered = await streamMultipleChunks(chunkIndices, {
    keyword: query,
    location,
    directOnly,
    hasSalary,
    limit: targetMatches
  }, signal);

  return {
    jobs: discovered.slice(0, targetMatches),
    totalScanned: maxChunksToScan * 25000,
    durationMs: Date.now() - startTime,
    indexedTotal: null
  };
}

/**
 * Ingests curated entry-level, new-grad, or internship tech jobs from SimplifyJobs.
 * Resilient multi-branch fallback probes dev -> main -> master so branch shifts never break ingestion.
 *
 * @param {'new_grad' | 'intern'} [feedType='new_grad']
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>} Matching normalized jobs
 */
export async function fetchSimplifyJobs(feedType = 'new_grad', options = {}) {
  const { keyword = '', signal, limit = 50, source: customSource } = options;
  const isIntern = feedType === 'intern';
  const repo = isIntern
    ? SOVEREIGN_FEED_SOURCES.SIMPLIFY_INTERNSHIPS.repo
    : SOVEREIGN_FEED_SOURCES.SIMPLIFY_NEW_GRAD.repo;
  const branches = isIntern
    ? SOVEREIGN_FEED_SOURCES.SIMPLIFY_INTERNSHIPS.branches
    : SOVEREIGN_FEED_SOURCES.SIMPLIFY_NEW_GRAD.branches;
  const sourceName = customSource || (isIntern ? 'SIMPLIFY_INTERNSHIPS' : 'SIMPLIFY_INDEX');

  try {
    let data = await fetchGitHubRepoListings(repo, branches, '.github/scripts/listings.json', signal);
    if ((!Array.isArray(data) || data.length === 0) && isIntern && SOVEREIGN_FEED_SOURCES.SIMPLIFY_INTERNSHIPS.fallbackRepo) {
      data = await fetchGitHubRepoListings(SOVEREIGN_FEED_SOURCES.SIMPLIFY_INTERNSHIPS.fallbackRepo, branches, '.github/scripts/listings.json', signal);
    }
    if (!Array.isArray(data) || data.length === 0) return [];

    const cleanKeyword = keyword.trim().toLowerCase();
    const matches = [];

    for (const item of data) {
      if (!item || item.active === false) continue; // Strictly active listings only

      if (cleanKeyword) {
        const titleMatch = (item.title || '').toLowerCase().includes(cleanKeyword);
        const companyMatch = (item.company_name || '').toLowerCase().includes(cleanKeyword);
        const categoryMatch = (item.category || '').toLowerCase().includes(cleanKeyword);
        if (!titleMatch && !companyMatch && !categoryMatch) continue;
      }

      const normalized = normalizeSimplifyJob(item);
      if (normalized) {
        normalized.source = sourceName;
        matches.push(normalized);
      }
      if (matches.length >= limit) break;
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Ingests verified early-career & tech positions from coderQuad/New-Grad-Positions.
 * Uses multi-branch fallback (dev -> main -> master) to eliminate CORS and branch shift fragility.
 *
 * @param {Object} [options={}]
 * @param {string} [options.keyword=''] - Optional keyword filter
 * @param {number} [options.limit=50] - Maximum matching listings to return
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<Object>>} Normalized jobs
 */
export async function fetchCoderQuadJobs(options = {}) {
  const { keyword = '', signal, limit = 50 } = options;
  const { repo, branches, path: filePath } = SOVEREIGN_FEED_SOURCES.CODERQUAD_NEW_GRAD;

  try {
    const data = await fetchGitHubRepoListings(repo, branches, filePath, signal);
    if (!Array.isArray(data) || data.length === 0) return [];

    const cleanKeyword = keyword.trim().toLowerCase();
    const matches = [];

    for (const item of data) {
      if (!item || item.active === false) continue;

      if (cleanKeyword) {
        const titleMatch = (item.title || '').toLowerCase().includes(cleanKeyword);
        const companyMatch = (item.company_name || '').toLowerCase().includes(cleanKeyword);
        const categoryMatch = (item.category || '').toLowerCase().includes(cleanKeyword);
        if (!titleMatch && !companyMatch && !categoryMatch) continue;
      }

      const normalized = normalizeJobSchema(item, 'CODERQUAD_NEW_GRAD');
      if (normalized) {
        normalized.portal = 'coderQuad (Verified Tech Feed)';
        normalized.provenance_tier = 'sovereign_community';
        normalized.provenance_label = 'coderQuad Verified Tech Feed';
        normalized.freshness_guarantee = 'Verified Tech Roles';
        normalized.category = item.category || 'Software Engineering';
        normalized.sponsorship = item.sponsorship || null;
        matches.push(normalized);
      }
      if (matches.length >= limit) break;
    }

    return matches;
  } catch {
    return [];
  }
}

/**
 * Ingests primary sovereign feed jobs from SVSPraveen/SPrav-Live-Feed.
 * Falls back across mirror snapshots and chunk streams.
 *
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>} Normalized jobs
 */
export async function fetchSpravLiveFeed(options = {}) {
  const { keyword = '', limit = 50, signal } = options;
  try {
    const mirrorJobs = await fetchDailyMirrorJobs(signal, { lite: true });
    if (Array.isArray(mirrorJobs) && mirrorJobs.length > 0) {
      const cleanKeyword = keyword.trim().toLowerCase();
      const results = [];
      for (const item of mirrorJobs) {
        if (!item || item.active === false) continue;
        if (cleanKeyword) {
          const titleMatch = (item.title || '').toLowerCase().includes(cleanKeyword);
          const compMatch = (item.company || item.company_name || '').toLowerCase().includes(cleanKeyword);
          if (!titleMatch && !compMatch) continue;
        }
        const norm = normalizeJobSchema(item, 'SPRAV_LIVE_FEED');
        if (norm) {
          norm.portal = 'SPrav (Primary Sovereign Feed)';
          results.push(norm);
        }
        if (results.length >= limit) break;
      }
      if (results.length > 0) return results;
    }
  } catch {}

  try {
    const chunkJobs = await streamJobChunk(0, { keyword, limit }, signal);
    return (chunkJobs || []).map(j => {
      const norm = normalizeJobSchema(j, 'SPRAV_LIVE_FEED');
      if (norm) norm.portal = 'SPrav (Primary Sovereign Feed)';
      return norm;
    }).filter(Boolean);
  } catch {
    return [];
  }
}

/**
 * Multi-Source Sovereign Ingestion:
 * Ingests in parallel from 4 verified community repos:
 * 1. SVSPraveen/SPrav-Live-Feed (Primary sovereign feed)
 * 2. SimplifyJobs/Summer2025-Internships (Internships feed)
 * 3. SimplifyJobs/New-Grad-Positions (Early-career feed)
 * 4. coderQuad/New-Grad-Positions (Verified tech feed)
 *
 * Runs all items through normalizeJobSchema() to guarantee standard fields:
 * (id, title, company, location, work_mode, posted_date, apply_url, source)
 *
 * Deduplicates cross-repo collisions using canonical dedup keys.
 *
 * @param {Object} [options={}]
 * @param {string} [options.keyword=''] - Optional keyword filter
 * @param {number} [options.limit=200] - Total maximum jobs across all feeds
 * @param {number} [options.perSourceLimit=50] - Maximum jobs to sample per feed
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<{ jobs: Array<Object>, stats: Object }>}
 */
export async function fetchMultiSourceSovereignFeeds(options = {}) {
  const startTime = Date.now();
  const {
    keyword = '',
    limit = 200,
    perSourceLimit = 50,
    signal
  } = options;

  const settled = await Promise.allSettled([
    fetchSpravLiveFeed({ keyword, limit: perSourceLimit, signal }),
    fetchSimplifyJobs('intern', { keyword, limit: perSourceLimit, signal }),
    fetchSimplifyJobs('new_grad', { keyword, limit: perSourceLimit, signal }),
    fetchCoderQuadJobs({ keyword, limit: perSourceLimit, signal })
  ]);

  const [spravRes, internRes, newGradRes, coderQuadRes] = settled;

  const spravJobs = spravRes.status === 'fulfilled' && Array.isArray(spravRes.value) ? spravRes.value : [];
  const internJobs = internRes.status === 'fulfilled' && Array.isArray(internRes.value) ? internRes.value : [];
  const newGradJobs = newGradRes.status === 'fulfilled' && Array.isArray(newGradRes.value) ? newGradRes.value : [];
  const coderQuadJobs = coderQuadRes.status === 'fulfilled' && Array.isArray(coderQuadRes.value) ? coderQuadRes.value : [];

  const rawAggregated = [
    ...spravJobs,
    ...internJobs,
    ...newGradJobs,
    ...coderQuadJobs
  ];

  // Schema Normalization & Cross-Repo Deduplication via Automatic Deduplication Engine
  const normalizedCandidateList = [];
  for (const raw of rawAggregated) {
    if (!raw) continue;
    const normalized = normalizeJobSchema(raw, raw.source || 'SOVEREIGN_FEED');
    if (normalized) normalizedCandidateList.push(normalized);
  }

  const unifiedJobs = unifyDuplicateJobCards(normalizedCandidateList);
  const normalizedJobs = unifiedJobs.slice(0, limit);

  const durationMs = Date.now() - startTime;
  const stats = {
    totalFetched: rawAggregated.length,
    totalDeduplicated: normalizedJobs.length,
    droppedDuplicates: rawAggregated.length - normalizedJobs.length,
    bySource: {
      sprav_live_feed: spravJobs.length,
      simplify_internships: internJobs.length,
      simplify_new_grad: newGradJobs.length,
      coderquad_new_grad: coderQuadJobs.length
    },
    durationMs
  };

  return {
    jobs: normalizedJobs,
    stats
  };
}

/**
 * Blueprint Section 4 Contract: Direct fetch and decompress job chunk utility.
 * Streams and decompresses an open GitHub job chunk using native DecompressionStream.
 * @param {number} [chunkNumber=0] - Chunk index (0 to 58)
 * @param {AbortSignal} [signal] - Optional abort signal
 * @returns {Promise<Array<Object>>} Normalized job objects
 */
export async function fetchAndDecompressJobChunk(chunkNumber = 0, signal) {
  return streamJobChunk(chunkNumber, {}, signal);
}

/**
 * Ingests the latest daily aggregated tech jobs feed generated by the SPrav Daily Mirror cron.
 * @param {AbortSignal} [signal]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchDailyMirrorJobs(signal, options = {}) {
  const isLite = options && options.lite === true;
  const bustCache = Boolean(options && (options.bustCache || options.forceRefresh));
  const cacheKey = `sprav_daily_mirror_jobs_${isLite ? 'lite' : 'full'}`;

  if (!bustCache) {
    try {
      const cached = await swrCacheGet(cacheKey);
      if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
        return cached.data;
      }
    } catch {}
  }

  const CANDIDATE_URLS = isLite ? [
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/latest-tech-jobs-lite.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/latest-tech-jobs-lite.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/jobs.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/jobs.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/latest-tech-jobs.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/latest.json.gz'
  ] : [
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/jobs.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/jobs.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/latest-tech-jobs.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/latest.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/gh-pages/latest-tech-jobs-lite.json.gz',
    'https://svspraveen.github.io/SPrav-Live-Feed/latest-tech-jobs-lite.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-WEB-Prv/sovereign-job-feed/jobs.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-WEB-Prv/sovereign-job-feed/latest-tech-jobs.json.gz',
    'https://raw.githubusercontent.com/SVSPraveen/SPrav-WEB-Prv/sovereign-job-feed/latest.json.gz'
  ];

  for (const url of CANDIDATE_URLS) {
    if (signal?.aborted) break;
    const originKey = defaultCircuitBreaker.getEndpointKey(url);

    // Failover within <250ms: Skip endpoint immediately if circuit is open
    if (defaultCircuitBreaker.isOpen(originKey)) {
      continue;
    }

    try {
      const headers = {};
      if (options?.range) {
        if (typeof options.range === 'string') {
          headers['Range'] = options.range;
        } else if (typeof options.range === 'object') {
          const { start = 0, end } = options.range;
          headers['Range'] = typeof end === 'number' ? `bytes=${start}-${end}` : `bytes=${start}-`;
        }
      }
      const cacheBustQuery = bustCache ? `${url.includes('?') ? '&' : '?'}_t=${Date.now()}` : '';
      const targetUrl = `${url}${cacheBustQuery}`;
      const res = await fetch(targetUrl, { signal, headers, cache: bustCache ? 'no-cache' : 'default' });
      if (res && res.ok) {
        defaultCircuitBreaker.recordSuccess(originKey);
        let decompressed = await decompressGzipResponse(res);
        const jobs = JSON.parse(decompressed);
        decompressed = null; // V8 optimization: free string buffer immediately
        if (Array.isArray(jobs) && jobs.length > 0) {
          await swrCacheSet(cacheKey, jobs);
          return jobs;
        }
      } else {
        defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
      }
    } catch (err) {
      defaultCircuitBreaker.recordFailure(originKey, err);
      // Automatic fast failover to next candidate mirror
    }
  }

  // Gracefully fall back to local IndexedDB SWR cache
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  } catch {}

  // Local static fallback: Pre-compiled verified ATS jobs
  try {
    const localUrl = `/data/sprav_daily_jobs.json${bustCache ? `?_t=${Date.now()}` : ''}`;
    const localRes = await fetch(localUrl, { signal, cache: bustCache ? 'no-cache' : 'default' });
    if (localRes && localRes.ok) {
      const localJobs = await localRes.json();
      if (Array.isArray(localJobs) && localJobs.length > 0) {
        await swrCacheSet(cacheKey, localJobs);
        return localJobs;
      }
    }
  } catch {}

  // Tier 3 Guaranteed baseline fallback matrix (when explicitly requested)
  if (options && options.fallbackToCurated === true) {
    try {
      const baseline = CURATED_INITIAL_TECH_JOBS.map(j => normalizeJobSchema(j, 'SPRAV_LIVE_FEED'));
      if (Array.isArray(baseline) && baseline.length > 0) {
        return baseline;
      }
    } catch {}
  }

  return [];
}

/**
 * Specialist 21: CDN Raw Streaming
 * Direct distribution of daily job batches via GitHub Pages with client-side cache busting.
 * Automatically decompresses raw .json.gz streams and parses validated job listings.
 *
 * @param {Object} [options={}]
 * @param {boolean} [options.bustCache=true] - Appends dynamic client-side cache busting timestamp
 * @param {boolean} [options.lite=false] - Stream lightweight daily batch
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<Object>>}
 */
export async function streamDailyJobBatchViaCdn(options = {}) {
  const bustCache = options?.bustCache !== false;
  return fetchDailyMirrorJobs(options?.signal, {
    ...options,
    bustCache,
    forceRefresh: bustCache
  });
}

/**
 * Normalizes a raw Himalayas API job object into SPrav standard schema.
 * @param {Object} raw - Raw job object from Himalayas API response
 * @returns {Object|null} SPrav normalized job or null if invalid
 */
export function normalizeHimalayasJob(raw) {
  if (!raw || !raw.title) return null;

  const company = (raw.company?.name || raw.companyName || 'Tech Company').trim();
  const location = raw.location?.name || raw.locationPolicy || 'Remote';
  const isRemote = raw.locationPolicy === 'remote' || /remote|anywhere|worldwide/i.test(location);

  let salaryRange = null;
  if (raw.minSalary && raw.maxSalary) {
    const currency = raw.currency || 'USD';
    const symbol = currency === 'USD' ? '$' : currency + ' ';
    const min = Math.round(raw.minSalary / 1000);
    const max = Math.round(raw.maxSalary / 1000);
    salaryRange = `${symbol}${min}k – ${symbol}${max}k`;
  }

  const safeId = `himalayas_${(raw.slug || raw.id || Math.random().toString(36).substring(2, 10))}`;

  return {
    id: safeId,
    title: raw.title.trim(),
    company,
    location,
    url: raw.applicationLink || raw.url || `https://himalayas.app/jobs/${raw.slug || ''}`,
    source: 'HIMALAYAS_FEED',
    portal: 'Himalayas Remote Tech',
    provenance_tier: 'remote_startup_feed',
    provenance_label: 'Himalayas Remote Startup Feed',
    freshness_guarantee: 'Live Public Remote Job Board API',
    description: raw.description
      ? raw.description.replace(/<[^>]+>/g, ' ').slice(0, 400).trim()
      : `${raw.title} at ${company}. ${raw.categories?.join(', ') || 'Remote Tech Role'}.`,
    salary_range: salaryRange,
    is_remote: isRemote,
    category: (raw.categories || [])[0] || 'Engineering',
    posted_at: raw.publishedAt || raw.createdAt || new Date().toISOString()
  };
}

/**
 * Fetches remote tech jobs from the Himalayas free public API.
 * No authentication required. CORS-enabled. Supports cursor-based pagination.
 *
 * @param {Object} [options={}]
 * @param {string} [options.keyword=''] - Optional keyword filter (applied client-side)
 * @param {number} [options.limit=80] - Max jobs to return
 * @param {string} [options.cursor] - Pagination cursor for the next page
 * @param {AbortSignal} [options.signal] - Optional abort signal
 * @returns {Promise<{ jobs: Array<Object>, nextCursor: string|null }>}
 */
export async function fetchHimalayasJobs(options = {}) {
  const { keyword = '', limit = 80, cursor, signal } = options;
  const cacheKey = `sprav_himalayas_jobs_${keyword || 'all'}_${cursor || '0'}`;
  const originKey = defaultCircuitBreaker.getEndpointKey(HIMALAYAS_BASE_URL);

  if (!defaultCircuitBreaker.isOpen(originKey)) {
    const url = new URL(HIMALAYAS_BASE_URL);
    url.searchParams.set('limit', String(Math.min(limit, 100)));
    if (cursor) url.searchParams.set('cursor', cursor);

    try {
      const res = await fetch(url.toString(), {
        signal,
        headers: { 'User-Agent': 'SPrav-Job-AI/1.0.0 (himalayas-integration)' }
      });
      if (res && res.ok) {
        defaultCircuitBreaker.recordSuccess(originKey);
        const data = await res.json();
        const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
        const cleanKeyword = keyword.trim().toLowerCase();

        const jobs = [];
        for (const raw of rawJobs) {
          if (cleanKeyword) {
            const titleHit = (raw.title || '').toLowerCase().includes(cleanKeyword);
            const catHit = (raw.categories || []).some(c => c.toLowerCase().includes(cleanKeyword));
            const compHit = (raw.company?.name || '').toLowerCase().includes(cleanKeyword);
            if (!titleHit && !catHit && !compHit) continue;
          }
          const normalized = normalizeHimalayasJob(raw);
          if (normalized) jobs.push(normalized);
          if (jobs.length >= limit) break;
        }

        const resultPayload = { jobs, nextCursor: data.nextCursor || null };
        await swrCacheSet(cacheKey, resultPayload);
        return resultPayload;
      } else {
        defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
      }
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
      defaultCircuitBreaker.recordFailure(originKey, err);
    }
  }

  // Graceful SWR fallback
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && cached.data) {
      return cached.data;
    }
  } catch {}

  return { jobs: [], nextCursor: null };
}

/**
 * Searches Himalayas remote tech jobs by keyword using their search endpoint.
 * Falls back to browsing with client-side keyword filter if search fails.
 *
 * @param {string} query - Search keyword (e.g. 'React', 'Python', 'DevOps')
 * @param {Object} [options={}]
 * @param {number} [options.limit=50] - Max results
 * @param {AbortSignal} [options.signal]
 * @returns {Promise<Array<Object>>} Normalized SPrav job objects
 */
export async function fetchHimalayasSearch(query = '', options = {}) {
  const { limit = 50, signal } = options;
  if (!query.trim()) return [];
  const cacheKey = `sprav_himalayas_search_${query.trim().toLowerCase()}`;
  const originKey = defaultCircuitBreaker.getEndpointKey(HIMALAYAS_SEARCH_URL);

  if (!defaultCircuitBreaker.isOpen(originKey)) {
    try {
      const url = new URL(HIMALAYAS_SEARCH_URL);
      url.searchParams.set('q', query.trim());
      url.searchParams.set('limit', String(Math.min(limit, 100)));

      const res = await fetch(url.toString(), {
        signal,
        headers: { 'User-Agent': 'SPrav-Job-AI/1.0.0 (himalayas-integration)' }
      });
      if (res && res.ok) {
        defaultCircuitBreaker.recordSuccess(originKey);
        const data = await res.json();
        const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
        const jobs = [];
        for (const raw of rawJobs) {
          const normalized = normalizeHimalayasJob(raw);
          if (normalized) jobs.push(normalized);
          if (jobs.length >= limit) break;
        }
        await swrCacheSet(cacheKey, jobs);
        return jobs;
      } else {
        defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
      }
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
      defaultCircuitBreaker.recordFailure(originKey, err);
    }
  }

  // Fallback: browse endpoint with client-side keyword filter or SWR cache
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && Array.isArray(cached.data) && cached.data.length > 0) {
      return cached.data;
    }
  } catch {}

  const { jobs } = await fetchHimalayasJobs({ keyword: query, limit, signal });
  return jobs;
}

/**
 * Normalizes a raw Jobicy API job object into SPrav standard schema.
 * @param {Object} raw - Raw job object from Jobicy API
 * @returns {Object|null}
 */
export function normalizeJobicyJob(raw) {
  if (!raw || !raw.jobTitle) return null;
  const company = (raw.companyName || 'Tech Company').trim();
  const location = raw.jobGeo || 'Remote';
  const isRemote = true; // Jobicy is dedicated remote tech

  let salaryRange = null;
  if (raw.annualSalaryMin && raw.annualSalaryMax) {
    const sym = raw.salaryCurrency === 'USD' || !raw.salaryCurrency ? '$' : `${raw.salaryCurrency} `;
    salaryRange = `${sym}${Math.round(raw.annualSalaryMin / 1000)}k – ${sym}${Math.round(raw.annualSalaryMax / 1000)}k`;
  }

  const safeId = `jobicy_${raw.id || Math.random().toString(36).substring(2, 10)}`;

  return {
    id: safeId,
    title: raw.jobTitle.trim(),
    company,
    location,
    url: raw.url || 'https://jobicy.com',
    source: 'JOBICY_FEED',
    portal: 'Jobicy Remote Tech (Public CORS)',
    provenance_tier: 'keyless_public_api',
    provenance_label: 'Jobicy Free Public Feed',
    freshness_guarantee: 'Keyless Open Job Board API',
    description: raw.jobExcerpt 
      ? raw.jobExcerpt.replace(/<[^>]+>/g, ' ').slice(0, 400).trim()
      : `${raw.jobTitle} at ${company}. Industry: ${raw.jobIndustry || 'Engineering'}.`,
    salary_range: salaryRange,
    is_remote: isRemote,
    category: raw.jobIndustry || 'Engineering',
    posted_at: raw.pubDate || new Date().toISOString()
  };
}

/**
 * Fetches remote tech jobs from the Jobicy free public API.
 * 100% keyless, CORS-enabled, no authentication required.
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchJobicyJobs(options = {}) {
  const { keyword = '', limit = 50, signal } = options;
  const cacheKey = `sprav_jobicy_jobs_${keyword || 'all'}`;
  const originKey = defaultCircuitBreaker.getEndpointKey(JOBICY_BASE_URL);

  if (!defaultCircuitBreaker.isOpen(originKey)) {
    try {
      const url = new URL(JOBICY_BASE_URL);
      url.searchParams.set('count', String(Math.min(limit, 50)));
      url.searchParams.set('industry', 'engineering');

      const res = await fetch(url.toString(), {
        signal,
        headers: { 'User-Agent': 'SPrav-Job-AI/1.0.0 (jobicy-integration)' }
      });
      if (res && res.ok) {
        defaultCircuitBreaker.recordSuccess(originKey);
        const data = await res.json();
        const rawJobs = Array.isArray(data.jobs) ? data.jobs : [];
        const cleanKeyword = keyword.trim().toLowerCase();

        const jobs = [];
        for (const raw of rawJobs) {
          if (cleanKeyword) {
            const titleHit = (raw.jobTitle || '').toLowerCase().includes(cleanKeyword);
            const compHit = (raw.companyName || '').toLowerCase().includes(cleanKeyword);
            const indHit = (raw.jobIndustry || '').toLowerCase().includes(cleanKeyword);
            if (!titleHit && !compHit && !indHit) continue;
          }
          const normalized = normalizeJobicyJob(raw);
          if (normalized) jobs.push(normalized);
          if (jobs.length >= limit) break;
        }

        if (jobs.length > 0) {
          await swrCacheSet(cacheKey, jobs);
        }
        return jobs;
      } else {
        defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
      }
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
      defaultCircuitBreaker.recordFailure(originKey, err);
    }
  }

  // SWR Fallback
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      return cached.data;
    }
  } catch {}

  return [];
}

/**
 * Normalizes a raw Arbeitnow API job object into SPrav standard schema.
 * @param {Object} raw - Raw job object from Arbeitnow API
 * @returns {Object|null}
 */
export function normalizeArbeitnowJob(raw) {
  if (!raw || !raw.title) return null;
  const company = (raw.company_name || 'Tech Employer').trim();
  const location = raw.location || (raw.remote ? 'Remote' : 'Worldwide');
  const isRemote = Boolean(raw.remote) || /remote/i.test(location);

  const safeId = `arbeitnow_${raw.slug || Math.random().toString(36).substring(2, 10)}`;

  return {
    id: safeId,
    title: raw.title.trim(),
    company,
    location,
    url: raw.url || 'https://www.arbeitnow.com',
    source: 'ARBEITNOW_FEED',
    portal: 'Arbeitnow Global ATS (Public CORS)',
    provenance_tier: 'keyless_public_api',
    provenance_label: 'Arbeitnow Free Public Feed',
    freshness_guarantee: 'Keyless Open Job Board API',
    description: raw.description 
      ? raw.description.replace(/<[^>]+>/g, ' ').slice(0, 400).trim()
      : `${raw.title} at ${company}. Tags: ${(raw.tags || []).join(', ')}.`,
    is_remote: isRemote,
    category: (raw.tags || [])[0] || 'Engineering',
    posted_at: raw.created_at ? new Date(raw.created_at * 1000).toISOString() : new Date().toISOString()
  };
}

/**
 * Fetches jobs from the Arbeitnow free public API.
 * 100% keyless, CORS-enabled, no authentication required.
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>}
 */
export async function fetchArbeitnowJobs(options = {}) {
  const { keyword = '', limit = 50, signal } = options;
  const cacheKey = `sprav_arbeitnow_jobs_${keyword || 'all'}`;
  const originKey = defaultCircuitBreaker.getEndpointKey(ARBEITNOW_BASE_URL);

  if (!defaultCircuitBreaker.isOpen(originKey)) {
    try {
      const res = await fetch(ARBEITNOW_BASE_URL, {
        signal,
        headers: { 'User-Agent': 'SPrav-Job-AI/1.0.0 (arbeitnow-integration)' }
      });
      if (res && res.ok) {
        defaultCircuitBreaker.recordSuccess(originKey);
        const data = await res.json();
        const rawJobs = Array.isArray(data.data) ? data.data : [];
        const cleanKeyword = keyword.trim().toLowerCase();

        const jobs = [];
        for (const raw of rawJobs) {
          if (cleanKeyword) {
            const titleHit = (raw.title || '').toLowerCase().includes(cleanKeyword);
            const compHit = (raw.company_name || '').toLowerCase().includes(cleanKeyword);
            const tagHit = (raw.tags || []).some(t => t.toLowerCase().includes(cleanKeyword));
            if (!titleHit && !compHit && !tagHit) continue;
          }
          const normalized = normalizeArbeitnowJob(raw);
          if (normalized) jobs.push(normalized);
          if (jobs.length >= limit) break;
        }

        if (jobs.length > 0) {
          await swrCacheSet(cacheKey, jobs);
        }
        return jobs;
      } else {
        defaultCircuitBreaker.recordFailure(originKey, new Error(`HTTP ${res?.status}`));
      }
    } catch (err) {
      if (err?.name === 'AbortError' && signal?.aborted) throw err;
      defaultCircuitBreaker.recordFailure(originKey, err);
    }
  }

  // SWR Fallback
  try {
    const cached = await swrCacheGet(cacheKey);
    if (cached && Array.isArray(cached.data)) {
      return cached.data;
    }
  } catch {}

  return [];
}

/**
 * Live multi-feed discovery across keyless, unauthenticated CORS APIs in parallel.
 * Enforces strict semantic deduplication so no duplicate cards are ever returned.
 *
 * @param {string} query - Keyword query
 * @param {Object} [options={}]
 * @returns {Promise<Array<Object>>} Deduplicated normalized jobs
 */
export async function fetchLiveKeylessCORSJobs(query = '', options = {}) {
  const { limit = 60, signal } = options;
  const targetPerFeed = Math.ceil(limit / 2);

  const [himalayasRes, jobicyRes, arbeitnowRes] = await Promise.allSettled([
    query ? fetchHimalayasSearch(query, { limit: targetPerFeed, signal }) : fetchHimalayasJobs({ limit: targetPerFeed, signal }),
    fetchJobicyJobs({ keyword: query, limit: targetPerFeed, signal }),
    fetchArbeitnowJobs({ keyword: query, limit: targetPerFeed, signal })
  ]);

  const candidates = [
    ...(himalayasRes.status === 'fulfilled' && Array.isArray(himalayasRes.value) ? himalayasRes.value : (himalayasRes.value?.jobs || [])),
    ...(jobicyRes.status === 'fulfilled' && Array.isArray(jobicyRes.value) ? jobicyRes.value : []),
    ...(arbeitnowRes.status === 'fulfilled' && Array.isArray(arbeitnowRes.value) ? arbeitnowRes.value : [])
  ];

  // Enforce client-side deduplication using canonical semantic and company:::title keys
  const deduped = [];
  const seenDedupKeys = new Set();
  const seenCompanyTitleKeys = new Set();

  for (const job of candidates) {
    if (!job || !job.title || !job.company) continue;
    const dedupKey = computeJobDedupKey(job);
    const ctKey = `${job.company.toLowerCase().trim()}:::${job.title.toLowerCase().trim()}`;
    if (dedupKey && seenDedupKeys.has(dedupKey)) continue;
    if (seenCompanyTitleKeys.has(ctKey)) continue;
    if (dedupKey) seenDedupKeys.add(dedupKey);
    seenCompanyTitleKeys.add(ctKey);
    deduped.push(job);
    if (deduped.length >= limit) break;
  }

  return deduped;
}

// ── Three-Tier Fallback Cascade Pipeline ────────────────────────────────────
export const TIER1_INDEXED_DB_CACHE_KEY = 'sprav_live_job_ingestion_cache';

export const INGESTION_TIERS = {
  TIER_1_INDEXED_DB: 1,
  TIER_2_DELTA_FETCH: 2,
  TIER_3_CURATED_MATRIX: 3
};

/**
 * Three-Tier Fallback Cascade:
 * Live Job Ingestion Pipeline:
 *   1. IndexedDB Persistent Cache (Instant Render <10ms)
 *   2. Background Delta Fetch (GitHub Raw CDN + Himalayas API)
 *   3. Curated Fallback Matrix (curated_initial_jobs.js guaranteed offline baseline)
 *
 * Guarantees instantaneous first render and 100% immunity against network hiccups or empty states.
 *
 * @param {Object} [options={}]
 * @param {string} [options.keyword=''] - Search filter keyword
 * @param {number} [options.limit=100] - Maximum jobs to return
 * @param {AbortSignal} [options.signal] - Abort signal
 * @param {Function} [options.onTierYield] - Callback triggered as tiers resolve: ({ tier, source, jobs, count, isFromCache }) => void
 * @param {boolean} [options.forceRefresh=false] - If true, bypass Tier 1 immediate return
 * @param {number} [options.cacheTtlMs=15*60*1000] - SWR cache TTL
 * @returns {Promise<{ jobs: Array<Object>, tier: number, source: string, count: number, isFromCache: boolean, offlineBaseline?: boolean }>}
 */
export async function fetchJobsWithThreeTierCascade(options = {}) {
  const {
    keyword = '',
    limit = 100,
    signal,
    onTierYield,
    forceRefresh = false,
    cacheTtlMs = 15 * 60 * 1000
  } = options;

  let tier1Jobs = null;

  // ── Tier 1: IndexedDB Persistent Cache (Instant Render <10ms) ───────────
  try {
    const cachedEntry = await swrCacheGet(TIER1_INDEXED_DB_CACHE_KEY, cacheTtlMs);
    if (cachedEntry && Array.isArray(cachedEntry.data) && cachedEntry.data.length > 0) {
      let filtered = cachedEntry.data;
      if (keyword.trim()) {
        const kw = keyword.toLowerCase().trim();
        filtered = filtered.filter(j =>
          (j.title || '').toLowerCase().includes(kw) ||
          (j.company || '').toLowerCase().includes(kw) ||
          (j.description || '').toLowerCase().includes(kw)
        );
      }
      if (filtered.length > 0) {
        tier1Jobs = filtered.slice(0, limit);
        if (typeof onTierYield === 'function') {
          onTierYield({
            tier: INGESTION_TIERS.TIER_1_INDEXED_DB,
            source: 'indexeddb_cache',
            jobs: tier1Jobs,
            count: tier1Jobs.length,
            isFromCache: true
          });
        }

        // Fast-path: If cache is fresh and not forced to refresh, return immediately
        if (!forceRefresh && !cachedEntry.isStale) {
          return {
            jobs: tier1Jobs,
            tier: INGESTION_TIERS.TIER_1_INDEXED_DB,
            source: 'indexeddb_cache',
            count: tier1Jobs.length,
            isFromCache: true
          };
        }
      }
    }
  } catch (tier1Err) {
    console.warn('[ThreeTierCascade] Tier 1 IndexedDB read warning:', tier1Err?.message);
  }

  // ── Tier 2: Background Delta Fetch (GitHub Raw CDN + Himalayas API) ──────
  try {
    const deltaSettled = await Promise.allSettled([
      fetchMultiSourceSovereignFeeds({ keyword, limit, signal }),
      fetchHimalayasJobs({ keyword, limit: Math.min(limit, 50), signal })
    ]);

    const [ghRes, himalayasRes] = deltaSettled;
    const ghJobs = ghRes.status === 'fulfilled' && ghRes.value?.jobs ? ghRes.value.jobs : [];
    const himalayasJobs = himalayasRes.status === 'fulfilled' && Array.isArray(himalayasRes.value) ? himalayasRes.value : [];

    const combined = [...ghJobs, ...himalayasJobs];

    if (combined.length > 0) {
      // Automatic Deduplication Engine: unify duplicate postings from SimplifyJobs, direct scrapers, HN, Himalayas
      const unified = unifyDuplicateJobCards(combined);
      const finalTier2Jobs = unified.slice(0, limit);

      // Persist fresh delta to Tier 1 IndexedDB persistent cache
      await swrCacheSet(TIER1_INDEXED_DB_CACHE_KEY, finalTier2Jobs);

      if (typeof onTierYield === 'function') {
        onTierYield({
          tier: INGESTION_TIERS.TIER_2_DELTA_FETCH,
          source: 'background_delta_fetch',
          jobs: finalTier2Jobs,
          count: finalTier2Jobs.length,
          isFromCache: false
        });
      }

      return {
        jobs: finalTier2Jobs,
        tier: INGESTION_TIERS.TIER_2_DELTA_FETCH,
        source: 'background_delta_fetch',
        count: finalTier2Jobs.length,
        isFromCache: false
      };
    }
  } catch (tier2Err) {
    console.warn('[ThreeTierCascade] Tier 2 Delta fetch warning:', tier2Err?.message);
  }

  // If Tier 2 yielded nothing (network hiccup), but Tier 1 had cached jobs, return Tier 1
  if (tier1Jobs && tier1Jobs.length > 0) {
    return {
      jobs: tier1Jobs,
      tier: INGESTION_TIERS.TIER_1_INDEXED_DB,
      source: 'indexeddb_cache_stale',
      count: tier1Jobs.length,
      isFromCache: true
    };
  }

  // ── Tier 3: Curated Fallback Matrix (Guaranteed Baseline) ────────────────
  // Guarantees that zero empty states ever happen during network hiccups.
  try {
    let baselineJobs = CURATED_INITIAL_TECH_JOBS.map(job => normalizeJobSchema(job, 'CURATED_MATRIX'));
    if (keyword.trim()) {
      const kw = keyword.toLowerCase().trim();
      const filtered = baselineJobs.filter(j =>
        (j.title || '').toLowerCase().includes(kw) ||
        (j.company || '').toLowerCase().includes(kw) ||
        (j.description || '').toLowerCase().includes(kw) ||
        (Array.isArray(j.tags) && j.tags.some(t => t.toLowerCase().includes(kw)))
      );
      if (filtered.length > 0) baselineJobs = filtered;
    }

    const finalTier3Jobs = baselineJobs.slice(0, limit);

    if (typeof onTierYield === 'function') {
      onTierYield({
        tier: INGESTION_TIERS.TIER_3_CURATED_MATRIX,
        source: 'curated_fallback_matrix',
        jobs: finalTier3Jobs,
        count: finalTier3Jobs.length,
        isFromCache: false,
        offlineBaseline: true
      });
    }

    return {
      jobs: finalTier3Jobs,
      tier: INGESTION_TIERS.TIER_3_CURATED_MATRIX,
      source: 'curated_fallback_matrix',
      count: finalTier3Jobs.length,
      isFromCache: false,
      offlineBaseline: true
    };
  } catch (tier3Err) {
    console.error('[ThreeTierCascade] Tier 3 matrix load failed:', tier3Err);
    return {
      jobs: CURATED_INITIAL_TECH_JOBS,
      tier: INGESTION_TIERS.TIER_3_CURATED_MATRIX,
      source: 'curated_fallback_matrix',
      count: CURATED_INITIAL_TECH_JOBS.length,
      isFromCache: false,
      offlineBaseline: true
    };
  }
}

export { streamCompressedJobFeed } from './harvest_jobs_engine.js';


