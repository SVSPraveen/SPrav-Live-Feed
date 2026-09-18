/**
 * src/utils/job_streamer_worker.js
 * =================================
 * Dedicated Web Worker for background streaming and decompressing of
 * high-volume sovereign job chunks (Feashliaa/job-board-data, 1.5M+ directly-sourced tech listings).
 *
 * Runs off the main React UI thread to ensure 0 dropped frames and 0 jank.
 * Offloads gzip stream decompression and in-memory filtering.
 */

const SOVEREIGN_SPRAV_BASE = 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Job-AI/sovereign-job-feed';
const FALLBACK_MIRROR_BASE = 'https://raw.githubusercontent.com/Feashliaa/job-board-data/main/data';

/**
 * Strict active-only validation and hygiene filter in worker thread.
 */
function isActiveJob(job, maxAgeDays = 60) {
  if (!job || typeof job !== 'object') return false;
  if (!job.title || !job.company) return false;

  if (job.active === false || job.is_active === false) return false;
  if (job.deleted === true || job.is_deleted === true) return false;
  if (job.status && typeof job.status === 'string') {
    const s = job.status.toLowerCase().trim();
    if (s === 'closed' || s === 'inactive' || s === 'archived' || s === 'expired' || s === 'draft') return false;
  }

  const dateStr = job.scraped_at || job.posted_at || job.updated_at || job.first_seen;
  if (dateStr) {
    const timeMs = new Date(dateStr).getTime();
    if (!isNaN(timeMs)) {
      const ageDays = (Date.now() - timeMs) / (1000 * 60 * 60 * 24);
      if (ageDays > maxAgeDays) return false;
    }
  }

  const combined = `${job.title || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase();
  if (/\b(100%\s*commission|uncapped\s*commission\s*only|commission\s*only\b|multi-level\s*marketing|door-to-door|crypto\s*pump|t\.me\/|unpaid\s*trial)\b/i.test(combined)) {
    return false;
  }

  if (/\b(talent\s*(community|network|pool)|future\s*opportunities|general\s*application|expression\s*of\s*interest)\b/i.test(job.title || '')) {
    return false;
  }

  return true;
}

/**
 * Normalizes raw job object into SPrav standard schema.
 */
function normalizeJob(raw) {
  if (!raw || !isActiveJob(raw)) return null;
  const ats = (raw.ats || 'ATS').trim();
  const title = (raw.title || 'Software Engineer').trim();
  const company = (raw.company || 'Tech Company').trim();
  const loc = (raw.location || 'Remote').trim();
  const isRemote = !loc || /remote|anywhere|distributed|virtual/i.test(loc);

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

  const safeId = `gh_${ats.toLowerCase().replace(/[^a-z0-9]/g, '')}_${company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).substring(2, 8)}`;

  return {
    id: safeId,
    title,
    company,
    location: loc,
    url: raw.url || `https://jobs.${ats.toLowerCase()}.com`,
    source: `${ats.toUpperCase()}_INDEX`,
    portal: `${ats} (Global Index)`,
    provenance_tier: 'global_index',
    provenance_label: 'Global Index (Snapshot)',
    freshness_guarantee: 'Aggregated Daily Mirror Index Snapshot',
    description: `${title} at ${company}. Level: ${raw.skill_level || 'General'}. Location: ${loc}.${salaryRange ? ` Estimated compensation: ${salaryRange}.` : ''}`,
    salary_range: salaryRange,
    salary_median: salaryMedian,
    salary_p25: raw.salary?.p25 || null,
    salary_p75: raw.salary?.p75 || null,
    skill_level: raw.skill_level || 'mid',
    is_recruiter: Boolean(raw.is_recruiter),
    is_remote: isRemote,
    posted_at: raw.first_seen || raw.scraped_at || new Date().toISOString()
  };
}

/**
 * Streams, decompresses, and filters a job chunk in background worker context.
 */
async function processChunk(chunkIndex = 0, filterOptions = {}) {
  const { keyword = '', location = '', directOnly = false, hasSalary = false, limit = 100 } = filterOptions;
  
  let response = null;
  // 1. Try Sovereign SPrav CDN Primary
  try {
    const primaryUrl = `${SOVEREIGN_SPRAV_BASE}/chunks/jobs_chunk_${chunkIndex}.json.gz`;
    const pRes = await fetch(primaryUrl);
    if (pRes && pRes.ok) response = pRes;
  } catch {}

  // 2. Fallback to Secondary Mirror
  if (!response) {
    const fallbackUrl = `${FALLBACK_MIRROR_BASE}/chunks/jobs_chunk_${chunkIndex}.json.gz`;
    const fRes = await fetch(fallbackUrl);
    if (fRes && fRes.ok) {
      response = fRes;
    } else {
      throw new Error(`Failed to load chunk ${chunkIndex} from sovereign and fallback mirrors: HTTP ${fRes?.status || 'network error'}`);
    }
  }

  let text = '';
  if (typeof DecompressionStream !== 'undefined' && response.body) {
    const ds = new DecompressionStream('gzip');
    const decompressed = response.body.pipeThrough(ds);
    text = await new Response(decompressed).text();
  } else {
    // Fallback if DecompressionStream not supported in worker context
    text = await response.text();
  }

  const rawList = JSON.parse(text);
  if (!Array.isArray(rawList)) return [];

  const cleanKeyword = keyword.trim().toLowerCase();
  const cleanLoc = location.trim().toLowerCase();
  const keywordRegex = cleanKeyword ? new RegExp(`\\b${cleanKeyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`, 'i') : null;

  const matches = [];
  for (const item of rawList) {
    if (!item) continue;
    if (directOnly && item.is_recruiter) continue;
    if (hasSalary && (!item.salary || !item.salary.median)) continue;

    if (cleanLoc) {
      const itemLoc = (item.location || '').toLowerCase();
      if (!itemLoc.includes(cleanLoc) && !(cleanLoc.includes('remote') && /remote|anywhere|virtual/i.test(itemLoc))) {
        continue;
      }
    }

    if (keywordRegex) {
      const titleMatch = keywordRegex.test(item.title || '');
      const companyMatch = keywordRegex.test(item.company || '');
      if (!titleMatch && !companyMatch) continue;
    }

    const norm = normalizeJob(item);
    if (norm) matches.push(norm);
    if (matches.length >= limit) break;
  }

  return matches;
}

// Worker message handling
if (typeof self !== 'undefined') {
  self.onmessage = async (e) => {
    const { type, chunkIndex = 0, filterOptions = {}, id } = e.data || {};
    if (type === 'SYNC_CHUNK') {
      try {
        const jobs = await processChunk(chunkIndex, filterOptions);
        self.postMessage({
          type: 'CHUNK_INGESTED',
          chunkIndex,
          jobs,
          count: jobs.length,
          id
        });
      } catch (err) {
        self.postMessage({
          type: 'CHUNK_ERROR',
          chunkIndex,
          error: err.message,
          id
        });
      }
    }
  };
}

export { processChunk, normalizeJob };
