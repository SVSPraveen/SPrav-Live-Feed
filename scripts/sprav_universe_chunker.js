/**
 * scripts/sprav_universe_chunker.js
 * ===================================
 * SPrav Sovereign Universe Chunking, Active-Only Validation & Hygiene Engine.
 * 
 * Takes raw high-volume job streams, runs strict multi-stage hygiene:
 * 1. Active-Only Verification (drops closed, inactive, or stale jobs >45 days)
 * 2. Ghost Job Radar (drops repost loops, dormant evergreen talent pools, generic solicitations)
 * 3. Spam & Scam Filter (drops MLM, commission-only scams, telegram/crypto lures, unpaid exploitation)
 * 4. High-Efficiency Canonical Deduplication
 * 5. Partitioning into standard 25,000-job gzip chunks with manifest & metadata
 *
 * Replaces external single-point-of-failure dependencies (like Feashliaa) with
 * a 100% self-owned, client-ready sovereign data pipeline served via GitHub Pages CDN ($0).
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';

export const CHUNK_SIZE = 25000;
export const MAX_ACTIVE_AGE_DAYS = 45;

/**
 * Normalizes and extracts a canonical deduplication signature for a job.
 * Incorporates URL requisition IDs and semantic company/title/location fingerprinting.
 */
export function getJobDedupKey(job) {
  if (!job) return '';
  const rawUrl = (job.url || '').trim().toLowerCase().split('?')[0].replace(/\/$/, '');

  // 1. Workday job requisition ID pattern
  if (rawUrl.includes('workday') || rawUrl.includes('myworkdayjobs.com')) {
    const workdayMatch = rawUrl.match(/\/jobs\/(\d+)/i) || rawUrl.match(/\/job\/[^/]+\/([a-zA-Z0-9_-]+)/i);
    if (workdayMatch) {
      const comp = String(job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      return `workday:${comp}:${workdayMatch[1]}`;
    }
  }

  // 2. Greenhouse job board ID pattern
  const ghMatch = rawUrl.match(/greenhouse\.io\/([^/]+)\/jobs\/(\d+)/i);
  if (ghMatch) {
    return `greenhouse:${ghMatch[1]}:${ghMatch[2]}`;
  }

  // 3. Ashby job posting ID pattern
  const ashbyMatch = rawUrl.match(/ashbyhq\.com\/([^/]+)\/([^/?#]+)/i);
  if (ashbyMatch) {
    return `ashby:${ashbyMatch[1]}:${ashbyMatch[2]}`;
  }

  // 4. Lever posting ID pattern
  const leverMatch = rawUrl.match(/lever\.co\/([^/]+)\/([^/?#]+)/i);
  if (leverMatch) {
    return `lever:${leverMatch[1]}:${leverMatch[2]}`;
  }

  // 5. SmartRecruiters requisition pattern
  const srMatch = rawUrl.match(/smartrecruiters\.com\/([^/]+)\/([a-zA-Z0-9_-]+)/i);
  if (srMatch) {
    return `smartrecruiters:${srMatch[1]}:${srMatch[2]}`;
  }

  // 6. Robust semantic fingerprinting (matching computeJobDedupKey in client)
  const cleanCompany = String(job.company || '')
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech|group|co|holdings|services)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const cleanTitle = String(job.title || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(remote|hybrid|onsite|full-time|part-time|contract|permanent|temp)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const loc = String(job.location || '').toLowerCase();
  const isRemote = loc.includes('remote') || !!job.is_remote;
  const locToken = isRemote ? 'remote' : loc.replace(/[^a-z0-9]/g, '');

  return locToken ? `${cleanCompany}:::${cleanTitle}:::${locToken}` : `${cleanCompany}:::${cleanTitle}`;
}

/**
 * Validates that a job is currently active and not expired, closed, or stale.
 * @param {Object} job
 * @param {number} [maxAgeDays=MAX_ACTIVE_AGE_DAYS]
 * @returns {boolean}
 */
export function isActiveJob(job, maxAgeDays = MAX_ACTIVE_AGE_DAYS) {
  if (!job || typeof job !== 'object') return false;
  if (!job.title || !job.company) return false;

  // Explicit inactive or closed signals
  if (job.active === false || job.is_active === false) return false;
  if (job.deleted === true || job.is_deleted === true) return false;
  if (job.status && typeof job.status === 'string') {
    const s = job.status.toLowerCase().trim();
    if (s === 'closed' || s === 'inactive' || s === 'archived' || s === 'expired' || s === 'draft') {
      return false;
    }
  }

  // Check timestamp age
  const rawDate = job.scraped_at || job.posted_at || job.updated_at || job.first_seen;
  if (rawDate) {
    const timeMs = new Date(rawDate).getTime();
    if (!isNaN(timeMs)) {
      const ageMs = Date.now() - timeMs;
      const ageDays = ageMs / (1000 * 60 * 60 * 24);
      // If the listing has not been verified/updated in > maxAgeDays, drop it as stale
      if (ageDays > maxAgeDays) return false;
    }
  }

  return true;
}

/**
 * Detects ghost postings, dormant requisitions, and non-hiring talent pools.
 * @param {Object} job
 * @returns {{ isGhost: boolean, reason: string|null }}
 */
export function evaluateGhostRisk(job) {
  if (!job) return { isGhost: true, reason: 'Empty job object' };

  const title = (job.title || '').trim();
  const desc = (job.description || '').trim();

  // 1. Generic non-requisition talent pools & placeholder notices
  const talentPoolPattern = /\b(talent\s*(community|network|pool)|future\s*opportunities|general\s*application|expression\s*of\s*interest|speculative\s*application|keep\s*in\s*touch|resume\s*submission)\b/i;
  if (talentPoolPattern.test(title)) {
    return { isGhost: true, reason: 'Generic talent pool / no specific headcount' };
  }

  // 2. Content-free or skeleton listings
  if (desc.length > 0 && desc.length < 35 && !/engineer|developer|analyst|manager/i.test(desc)) {
    return { isGhost: true, reason: 'Skeleton description without requirements' };
  }

  // 3. Dormant evergreen requisitions (>90 days old with artificial repost loops)
  if (job.first_seen && job.scraped_at) {
    const firstSeenMs = new Date(job.first_seen).getTime();
    const scrapedMs = new Date(job.scraped_at).getTime();
    if (!isNaN(firstSeenMs) && !isNaN(scrapedMs)) {
      const ageFromFirstSeenDays = (Date.now() - firstSeenMs) / (1000 * 60 * 60 * 24);
      if (ageFromFirstSeenDays > 90) {
        return { isGhost: true, reason: 'Dormant evergreen listing (>90 days open)' };
      }
    }
  }

  return { isGhost: false, reason: null };
}

/**
 * Detects scam, predatory, spam, and non-tech marketing exploits.
 * @param {Object} job
 * @returns {{ isSpam: boolean, reason: string|null }}
 */
export function evaluateSpamRisk(job) {
  if (!job) return { isSpam: true, reason: 'Empty job object' };

  const combined = `${job.title || ''} ${job.company || ''} ${job.description || ''}`.toLowerCase();

  // 1. Commission-only / MLM / Pyramid marketing schemes
  const mlmPatterns = [
    /100%\s*commission/i,
    /uncapped\s*commission\s*only/i,
    /commission\s*only\b/i,
    /multi-level\s*marketing/i,
    /be\s*your\s*own\s*boss/i,
    /door-to-door/i,
    /unlimited\s*earning\s*potential/i,
    /investment\s*required/i,
    /pay\s*for\s*training/i,
    /make\s*\$?\d{4,}\s*(a|per)\s*week\s*from\s*home/i
  ];
  for (const pat of mlmPatterns) {
    if (pat.test(combined)) {
      return { isSpam: true, reason: `Commission/MLM exploit detected: ${pat}` };
    }
  }

  // 2. Off-platform contact redirection scams (Telegram, WhatsApp recruitment lures)
  const contactScamPatterns = [
    /(reach\s*out|contact\s*me|message\s*us)\s*(on|via)\s*telegram/i,
    /t\.me\/[a-z0-9_]+/i,
    /(message|chat)\s*(on|via)\s*whatsapp/i,
    /send\s*dm\s*to\s*whatsapp/i,
    /crypto\s*(pump|airdrop|arbitrage)\s*trader/i
  ];
  for (const pat of contactScamPatterns) {
    if (pat.test(combined)) {
      return { isSpam: true, reason: 'Off-platform redirect / scam lure detected' };
    }
  }

  // 3. Unpaid exploitative "spec work" or illegal labor
  if (/\bunpaid\s*(trial|internship|project|spec\s*task)\b/i.test(combined) && !/volunteer/i.test(job.title || '')) {
    return { isSpam: true, reason: 'Unpaid speculative labor exploit' };
  }

  return { isSpam: false, reason: null };
}

/**
 * Filter, sanitize, and deduplicate a high-volume batch of raw job objects.
 * @param {Array<Object>} rawJobs - List of incoming jobs
 * @param {Object} [options]
 * @param {number} [options.maxAgeDays=45] - Maximum age in days for active status
 * @param {boolean} [options.allowGhostWarnings=false] - Whether to allow minor ghost risk through
 * @returns {{ cleanJobs: Array<Object>, stats: Object }}
 */
export function filterCleanActiveJobs(rawJobs = [], options = {}) {
  const maxAgeDays = options.maxAgeDays || MAX_ACTIVE_AGE_DAYS;
  const allowGhostWarnings = !!options.allowGhostWarnings;

  const cleanJobs = [];
  const seenKeys = new Set();
  const seenSignatures = new Set();

  let droppedInactive = 0;
  let droppedGhost = 0;
  let droppedSpam = 0;
  let droppedDuplicates = 0;

  // Helper to score source fidelity so direct corporate portals take precedence over aggregator copies
  const getSourceFidelity = (j) => {
    const src = String(j?.source || '').toUpperCase();
    const portal = String(j?.portal || '').toUpperCase();
    if (src.includes('WORKDAY') || portal.includes('WORKDAY') || src.includes('SMARTRECRUITERS') || portal.includes('SMARTRECRUITERS')) return 100;
    if (src.includes('ASHBY') || src.includes('GREENHOUSE') || src.includes('LEVER') || src.includes('WORKABLE') || src.includes('PERSONIO') || src.includes('BAMBOOHR') || src.includes('RIPPLING')) return 90;
    if (src.includes('SIMPLIFY') || src.includes('DIRECT_ATS') || src.includes('OPEN_JOBS')) return 70;
    if (src.includes('HIMALAYAS') || src.includes('ARBEITNOW') || src.includes('JOBICY') || src.includes('REMOTIVE') || src.includes('HN')) return 50;
    return 30;
  };

  // Process higher-fidelity direct employer postings first to lock the deduplication slots
  const candidates = [...rawJobs].sort((a, b) => getSourceFidelity(b) - getSourceFidelity(a));

  for (const job of candidates) {
    if (!job || typeof job !== 'object') continue;

    // 1. Active Check
    if (!isActiveJob(job, maxAgeDays)) {
      droppedInactive++;
      continue;
    }

    // 2. Spam & Scam Check
    const spamEval = evaluateSpamRisk(job);
    if (spamEval.isSpam) {
      droppedSpam++;
      continue;
    }

    // 3. Ghost Job Check
    const ghostEval = evaluateGhostRisk(job);
    if (ghostEval.isGhost && !allowGhostWarnings) {
      droppedGhost++;
      continue;
    }

    // 4. Canonical Deduplication Check (Key + Semantic Signature)
    const dedupKey = getJobDedupKey(job);
    const cleanComp = String(job.company || '')
      .toLowerCase()
      .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech|group|co|holdings|services)\b\.?/gi, '')
      .replace(/[^a-z0-9]/g, '')
      .trim();
    const cleanTitle = String(job.title || '')
      .toLowerCase()
      .replace(/\(.*?\)|\[.*?\]/g, '')
      .replace(/\b(remote|hybrid|onsite|full-time|part-time|contract|permanent|temp)\b/gi, '')
      .replace(/[^a-z0-9]/g, ' ')
      .trim()
      .replace(/\s+/g, ' ');
    const signature = `${cleanComp}:::${cleanTitle}`;

    if (seenKeys.has(dedupKey) || (cleanComp && cleanTitle && seenSignatures.has(signature))) {
      droppedDuplicates++;
      continue;
    }

    seenKeys.add(dedupKey);
    if (cleanComp && cleanTitle) seenSignatures.add(signature);
    cleanJobs.push(job);
  }

  return {
    cleanJobs,
    stats: {
      totalRaw: rawJobs.length,
      cleanCount: cleanJobs.length,
      droppedInactive,
      droppedGhost,
      droppedSpam,
      droppedDuplicates
    }
  };
}

/**
 * Partitions clean jobs into 25,000-item chunks, compresses them with zlib,
 * and writes jobs_manifest.json + metadata.json into output directory.
 *
 * @param {Array<Object>} jobs - Cleaned and deduplicated active jobs
 * @param {string} outputDir - Directory where chunks and metadata should be written
 * @param {Object} [metadataConfig] - Custom metadata tags
 * @returns {{ chunksWritten: number, manifestPath: string, metadataPath: string }}
 */
export function chunkAndCompressJobs(jobs, outputDir, metadataConfig = {}) {
  const chunksDir = path.join(outputDir, 'chunks');
  if (!fs.existsSync(chunksDir)) {
    fs.mkdirSync(chunksDir, { recursive: true });
  }

  // Clean old chunks
  try {
    const existingFiles = fs.readdirSync(chunksDir);
    for (const f of existingFiles) {
      if (f.startsWith('jobs_chunk_') && f.endsWith('.json.gz')) {
        fs.unlinkSync(path.join(chunksDir, f));
      }
    }
  } catch {}

  // Sort predictably: primary by newest timestamp, secondary by company/title
  const sortedJobs = [...jobs].sort((a, b) => {
    const tA = new Date(a.scraped_at || a.posted_at || 0).getTime();
    const tB = new Date(b.scraped_at || b.posted_at || 0).getTime();
    if (tB !== tA) return tB - tA;
    const cCompare = (a.company || '').localeCompare(b.company || '');
    if (cCompare !== 0) return cCompare;
    return (a.title || '').localeCompare(b.title || '');
  });

  const distinctCompanies = new Set();
  for (const j of sortedJobs) {
    if (j.company) distinctCompanies.add(j.company.toLowerCase().trim());
  }

  // Partition into CHUNK_SIZE slices
  const chunkFilenames = [];
  let chunkIndex = 0;

  for (let i = 0; i < sortedJobs.length; i += CHUNK_SIZE) {
    const chunk = sortedJobs.slice(i, i + CHUNK_SIZE);
    const filename = `jobs_chunk_${chunkIndex}.json.gz`;
    const chunkPath = path.join(chunksDir, filename);

    const jsonText = JSON.stringify(chunk);
    const gzipped = zlib.gzipSync(Buffer.from(jsonText, 'utf-8'));
    fs.writeFileSync(chunkPath, gzipped);

    chunkFilenames.push(filename);
    chunkIndex++;
  }

  const timestamp = new Date().toISOString();

  // 1. Write jobs_manifest.json inside chunks/
  const manifest = {
    chunks: chunkFilenames,
    totalJobs: sortedJobs.length,
    chunkSize: CHUNK_SIZE,
    totalChunks: chunkFilenames.length,
    distinctCompanies: distinctCompanies.size,
    last_updated: timestamp,
    version: '1.0.0-sovereign'
  };
  const manifestPath = path.join(chunksDir, 'jobs_manifest.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  // 2. Generate and write Chunked Inverted Index
  let indexStats = null;
  try {
    indexStats = buildInvertedIndex(sortedJobs, chunkFilenames, outputDir, {
      chunkSize: CHUNK_SIZE
    });
  } catch (err) {
    console.warn('[Chunker] Warning: Inverted Index build encountered an error:', err.message);
  }

  // 3. Write standard metadata.json in outputDir (compatible with Feashliaa standard and SPrav)
  const metadata = {
    last_updated: timestamp,
    total_companies: distinctCompanies.size,
    active_companies: distinctCompanies.size,
    total_jobs: sortedJobs.length,
    recruiter_jobs: 0,
    source_type: 'sprav_sovereign_universe',
    platforms: metadataConfig.platforms || 'Greenhouse, Ashby, Lever, Workday, SmartRecruiters, Himalayas, Remotive, Jobicy, Arbeitnow, HN',
    quality_metrics: {
      active_only: true,
      ghost_filtered: true,
      spam_filtered: true,
      max_age_days: metadataConfig.maxAgeDays || MAX_ACTIVE_AGE_DAYS
    },
    index_metrics: indexStats ? {
      total_terms: indexStats.totalTerms,
      compressed_bytes: indexStats.compressedBytes
    } : null
  };

  const metadataPath = path.join(outputDir, 'metadata.json');
  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

  // Also write a copy into chunks/ for reverse-proxy CDN routing flexibility
  fs.writeFileSync(path.join(chunksDir, 'metadata.json'), JSON.stringify(metadata, null, 2));

  return {
    chunksWritten: chunkFilenames.length,
    manifestPath,
    metadataPath,
    totalJobs: sortedJobs.length,
    distinctCompanies: distinctCompanies.size,
    indexStats
  };
}

export const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can',
  'could', 'did', 'do', 'does', 'doing', 'down', 'during', 'each',
  'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'itself', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on',
  'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'she', 'should',
  'so', 'some', 'such', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then',
  'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was',
  'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
  'would', 'you', 'your', 'yours', 'yourself', 'yourselves'
]);

/**
 * Tokenizes text for high-performance inverted index lookup.
 * Preserves technical compounds (cpp, csharp, dotnet, nodejs, cicd, aiml, k8s).
 * @param {string} text
 * @returns {Array<string>}
 */
export function tokenizeForSearch(text) {
  if (!text || typeof text !== 'string') return [];

  // 1. Lowercase and replace special tech compounds with normalized tokens
  let s = text.toLowerCase()
    .replace(/c\+\+/g, ' cpp ')
    .replace(/c#/g, ' csharp ')
    .replace(/\.net/g, ' dotnet ')
    .replace(/node\.js/g, ' nodejs ')
    .replace(/next\.js/g, ' nextjs ')
    .replace(/vue\.js/g, ' vuejs ')
    .replace(/react\.js/g, ' react ')
    .replace(/ci\/cd/g, ' cicd ')
    .replace(/ai\/ml/g, ' aiml ')
    .replace(/ml\/ai/g, ' aiml ');

  // 2. Remove punctuation, keep alphanumerics
  s = s.replace(/[^a-z0-9\s_-]/g, ' ');

  // 3. Extract tokens
  const words = s.split(/[\s_\/-]+/);
  const tokens = new Set();

  for (const w of words) {
    const clean = w.trim();
    if (clean.length < 2) continue;
    if (STOPWORDS.has(clean)) continue;
    if (/^\d{5,}$/.test(clean)) continue; // Drop long ID numbers
    tokens.add(clean);
  }

  return Array.from(tokens);
}

/**
 * Classifies role seniority tier for pre-faceted indexing.
 * @param {string} [title='']
 * @param {string} [skillLevel='']
 * @returns {'entry' | 'mid' | 'senior' | 'staff'}
 */
export function detectSeniority(title = '', skillLevel = '') {
  const t = `${title} ${skillLevel}`.toLowerCase();
  if (/\b(staff|principal|lead|director|head|vp|distinguished|architect)\b/i.test(t)) return 'staff';
  if (/\b(senior|sr\.?|sr|iii|iv|level\s*[3-5]|l[5-7]|ic[5-7])\b/i.test(t)) return 'senior';
  if (/\b(junior|jr\.?|jr|entry|intern|internship|associate|apprentice|new\s*grad|fresh|l[1-2]|ic[1-2])\b/i.test(t)) return 'entry';
  return 'mid';
}

/**
 * Builds a compressed inverted index and facet dictionary from cleaned jobs.
 * @param {Array<Object>} jobs - Cleaned and deduplicated active jobs
 * @param {Array<string>} chunkFilenames - List of chunk filenames written
 * @param {string} outputDir - Base output directory (e.g. dist_mirror)
 * @param {Object} [options]
 * @returns {{ totalTerms: number, compressedBytes: number, indexPath: string }}
 */
export function buildInvertedIndex(jobs, chunkFilenames, outputDir, options = {}) {
  const indexDir = path.join(outputDir, 'index');
  if (!fs.existsSync(indexDir)) {
    fs.mkdirSync(indexDir, { recursive: true });
  }

  const terms = Object.create(null);
  const facets = {
    seniority: { entry: new Set(), mid: new Set(), senior: new Set(), staff: new Set() },
    location: { remote: new Set(), us: new Set(), india: new Set(), europe: new Set(), uk: new Set(), canada: new Set(), apac: new Set() }
  };

  const chunkSize = options.chunkSize || CHUNK_SIZE;

  for (let i = 0; i < jobs.length; i++) {
    const job = jobs[i];
    if (!job) continue;
    const chunkIdx = Math.floor(i / chunkSize);

    // Extract search tokens
    const titleTokens = tokenizeForSearch(job.title || '');
    const companyTokens = tokenizeForSearch(job.company || '');
    const locTokens = tokenizeForSearch(job.location || '');
    const tagTokens = Array.isArray(job.tags) ? job.tags.flatMap(t => tokenizeForSearch(t)) : [];

    const combinedTokens = new Set([...titleTokens, ...companyTokens, ...locTokens, ...tagTokens]);

    for (const token of combinedTokens) {
      if (!terms[token]) {
        terms[token] = new Set();
      }
      terms[token].add(chunkIdx);
    }

    // Seniority facet
    const sen = detectSeniority(job.title, job.skill_level);
    if (facets.seniority[sen]) {
      facets.seniority[sen].add(chunkIdx);
    }

    // Location facet
    const locLower = (job.location || '').toLowerCase();
    if (/remote|anywhere|virtual|worldwide/i.test(locLower)) {
      facets.location.remote.add(chunkIdx);
    }
    if (/\b(us|united states|usa|ca|ny|tx|wa)\b/i.test(locLower)) {
      facets.location.us.add(chunkIdx);
    }
    if (/\b(india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|gurugram)\b/i.test(locLower)) {
      facets.location.india.add(chunkIdx);
    }
    if (/\b(europe|germany|berlin|france|paris|netherlands|amsterdam|spain|poland)\b/i.test(locLower)) {
      facets.location.europe.add(chunkIdx);
    }
    if (/\b(uk|united kingdom|london|england)\b/i.test(locLower)) {
      facets.location.uk.add(chunkIdx);
    }
    if (/\b(canada|toronto|vancouver|montreal|waterloo)\b/i.test(locLower)) {
      facets.location.canada.add(chunkIdx);
    }
    if (/\b(apac|singapore|australia|sydney|japan|tokyo)\b/i.test(locLower)) {
      facets.location.apac.add(chunkIdx);
    }
  }

  // Convert Sets to sorted Arrays
  const serializableTerms = Object.create(null);
  for (const [term, chunkSet] of Object.entries(terms)) {
    serializableTerms[term] = Array.from(chunkSet).sort((a, b) => a - b);
  }

  const serializableFacets = {
    seniority: {},
    location: {}
  };
  for (const [sen, chunkSet] of Object.entries(facets.seniority)) {
    serializableFacets.seniority[sen] = Array.from(chunkSet).sort((a, b) => a - b);
  }
  for (const [loc, chunkSet] of Object.entries(facets.location)) {
    serializableFacets.location[loc] = Array.from(chunkSet).sort((a, b) => a - b);
  }

  const timestamp = new Date().toISOString();
  const searchIndex = {
    version: '1.0.0-edge-index',
    generated_at: timestamp,
    total_jobs: jobs.length,
    total_chunks: chunkFilenames.length,
    chunk_size: chunkSize,
    total_terms: Object.keys(serializableTerms).length,
    terms: serializableTerms,
    facets: serializableFacets
  };

  const jsonStr = JSON.stringify(searchIndex);
  const gzipped = zlib.gzipSync(Buffer.from(jsonStr, 'utf-8'));

  // Write to index/
  fs.writeFileSync(path.join(indexDir, 'search_index.json'), jsonStr);
  fs.writeFileSync(path.join(indexDir, 'search_index.json.gz'), gzipped);

  // Write index_manifest.json
  const indexManifest = {
    version: '1.0.0-edge-index',
    last_updated: timestamp,
    total_jobs: jobs.length,
    total_chunks: chunkFilenames.length,
    total_terms: Object.keys(serializableTerms).length,
    uncompressed_bytes: jsonStr.length,
    compressed_bytes: gzipped.length
  };
  fs.writeFileSync(path.join(indexDir, 'index_manifest.json'), JSON.stringify(indexManifest, null, 2));

  // Also write into chunks/index/ for reverse-proxy CDN path compatibility
  const chunksIndexDir = path.join(outputDir, 'chunks', 'index');
  if (!fs.existsSync(chunksIndexDir)) {
    fs.mkdirSync(chunksIndexDir, { recursive: true });
  }
  fs.writeFileSync(path.join(chunksIndexDir, 'search_index.json.gz'), gzipped);
  fs.writeFileSync(path.join(chunksIndexDir, 'index_manifest.json'), JSON.stringify(indexManifest, null, 2));

  return {
    totalTerms: Object.keys(serializableTerms).length,
    compressedBytes: gzipped.length,
    indexPath: path.join(indexDir, 'search_index.json.gz')
  };
}

