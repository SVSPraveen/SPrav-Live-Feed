/**
 * browser_ats_scanner.js
 * =======================
 * Client-Side In-Browser ATS Discovery Engine.
 * Scans public, CORS-enabled direct ATS API feeds directly from the user's browser:
 * - Greenhouse (boards-api.greenhouse.io)
 * - Lever (api.lever.co)
 * - Ashby (api.ashbyhq.com)
 * - Remotive (remotive.com/api/remote-jobs)
 * - Jobicy (jobicy.com/api/v2/remote-jobs)
 * 
 * Capabilities:
 * - Zero headless browser overhead, zero CAPTCHAs, zero bot detection.
 * - Filters by user's Application Scope (target roles, locations, work_mode).
 * - Honest ATS match scoring based strictly on candidate's verified skills.
 * - Saves discovered listings into In-Browser Storage Vault (IndexedDB).
 */

import { storageVault } from './browser_storage_vault.js';
import { cleanJobDescription } from './cleanDescription.js';
import { calculateFreshnessTelemetry, calculateFreshnessDecayScore, formatRelativeListingTime, FRESHNESS_CODES } from './ghost_job_radar.js';
import { 
  COUNTRY_CITY_MAP, 
  TECH_LOCATIONS, 
  getGlobalLocationAliases, 
  isLocationInRegion, 
  matchLocationString as matchLocationStringTaxonomy 
} from './country_city_taxonomy.js';
import { 
  ROLE_DOMAINS, 
  ALL_TECH_ROLES, 
  classifySeniority, 
  matchesTargetRoleWithSeniority,
  normalizeRoleSearchTerm,
  expandRoleSearchVariants,
  detectCandidateDomain
} from './tech_roles_taxonomy.js';
import {
  embedText,
  cosineSimilarity,
  calibrateCosineToPercentage,
  buildCandidateEmbeddingProfile,
  buildJobEmbeddingRepresentation
} from './semantic_vector_engine.js';
import { 
  getRegionalCompanies, 
  VERIFIED_WORKDAY_TENANTS,
  REGIONAL_ATS_COMPANIES,
  detectCandidateRegionFromScope
} from './regional_ats_registries.js';
import { fetchHwowCompanies } from './hiring_without_whiteboards_service.js';
import { sanitizeObject, formatSafeWebUrl } from './security_guard.js';
import { TOP_100_TECH_COMPANIES, WORKDAY_ENTERPRISE_TENANTS, FAANG_ENTERPRISE_PORTALS } from './top_tech_companies_catalog.js';
import { 
  searchHighVolumeStream, 
  fetchSimplifyJobs, 
  fetchJobBoardMetadata,
  fetchDailyMirrorJobs,
  fetchHimalayasJobs,
  fetchHimalayasSearch,
  isActiveJob
} from './github_job_streamer.js';

import { fetchAtsViaExtension, isExtensionInstalled } from './extension_companion.js';

export { 
  VERIFIED_WORKDAY_TENANTS, 
  detectCandidateRegionFromScope, 
  TOP_100_TECH_COMPANIES, 
  WORKDAY_ENTERPRISE_TENANTS, 
  FAANG_ENTERPRISE_PORTALS 
};

/**
 * Executes a network fetch with an individual deadline timeout, preventing slow
 * or hung third-party ATS endpoints from stalling discovery.
 *
 * @param {string} url - Target URL
 * @param {RequestInit} [options={}] - Standard fetch options
 * @param {number} [timeoutMs=4500] - Hard timeout limit in milliseconds
 * @returns {Promise<Response>}
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 4500) {
  const { signal: externalSignal, ...fetchOpts } = options;
  if (externalSignal?.aborted) {
    throw new DOMException('Aborted', 'AbortError');
  }

  if (!timeoutMs || typeof setTimeout === 'undefined') {
    return await fetch(url, options);
  }

  const timeoutController = new AbortController();
  const timer = setTimeout(() => {
    try {
      timeoutController.abort(new Error(`Fetch timed out after ${timeoutMs}ms`));
    } catch {}
  }, timeoutMs);

  let onExternalAbort = null;
  if (externalSignal) {
    onExternalAbort = () => {
      try {
        timeoutController.abort(externalSignal.reason);
      } catch {}
    };
    externalSignal.addEventListener('abort', onExternalAbort, { once: true });
  }

  try {
    return await fetch(url, { ...fetchOpts, signal: timeoutController.signal });
  } finally {
    clearTimeout(timer);
    if (externalSignal && onExternalAbort) {
      externalSignal.removeEventListener('abort', onExternalAbort);
    }
  }
}

// Regional company lookup sets for strict scope barrier filtering
const INDIA_GCCS_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.india_gccs || {}).flat().map(c => String(c).toLowerCase().trim())
);
const EUROPE_UK_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.europe_uk || {}).flat().map(c => String(c).toLowerCase().trim())
);
const NORTH_AMERICA_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.north_america || {}).flat().map(c => String(c).toLowerCase().trim())
);

export function isKnownForeignCompany(compSlug) {
  if (!compSlug) return false;
  const lower = compSlug.toLowerCase().trim();
  if (INDIA_GCCS_COMPANIES.has(lower)) return false;
  if (EUROPE_UK_COMPANIES.has(lower) || NORTH_AMERICA_COMPANIES.has(lower)) return true;
  for (const list of Object.values(CURATED_ATS_COMPANIES || {})) {
    if (Array.isArray(list) && list.some(c => c.toLowerCase() === lower)) {
      return true;
    }
  }
  return false;
}

export { 
  calculateFreshnessTelemetry, 
  calculateFreshnessDecayScore, 
  formatRelativeListingTime, 
  FRESHNESS_CODES 
};
export { 
  COUNTRY_CITY_MAP, 
  TECH_LOCATIONS, 
  ROLE_DOMAINS, 
  ALL_TECH_ROLES, 
  classifySeniority, 
  matchesTargetRoleWithSeniority,
  normalizeRoleSearchTerm,
  expandRoleSearchVariants,
  detectCandidateDomain
};

// ── Technical Skill Synonyms (Zero-Collision Mapping) ────────────────────────
export const TECH_SKILL_SYNONYMS = {
  'k8s': ['kubernetes'],
  'kubernetes': ['k8s'],
  'postgres': ['postgresql'],
  'postgresql': ['postgres'],
  'react': ['reactjs', 'react.js'],
  'reactjs': ['react'],
  'react.js': ['react'],
  'node': ['nodejs', 'node.js'],
  'nodejs': ['node'],
  'node.js': ['node'],
  'golang': ['go'],
  'go': ['golang'],
  'aws': ['amazon web services'],
  'amazon web services': ['aws'],
  'gcp': ['google cloud', 'google cloud platform'],
  'google cloud': ['gcp'],
  'ts': ['typescript'],
  'typescript': ['ts'],
  'js': ['javascript'],
  'javascript': ['js'],
  'py': ['python'],
  'python': ['py'],
  'ci/cd': ['continuous integration', 'cicd'],
  'cicd': ['ci/cd'],
  'mongo': ['mongodb'],
  'mongodb': ['mongo'],
  'appsec': ['application security'],
  'application security': ['appsec'],
  'infosec': ['information security'],
  'information security': ['infosec'],
  'iam': ['identity and access management'],
  'identity and access management': ['iam'],
  'sre': ['site reliability engineering', 'site reliability engineer'],
  'argocd': ['argo cd'],
  'argo cd': ['argocd'],
  'ml': ['machine learning'],
  'machine learning': ['ml'],
  'ai': ['artificial intelligence'],
  'artificial intelligence': ['ai'],
  'rag': ['retrieval augmented generation', 'agentic rag'],
  'agentic rag': ['rag', 'retrieval augmented generation'],
  'retrieval augmented generation': ['rag', 'agentic rag'],
  'llm': ['large language models', 'large language model', 'llms', 'generative ai', 'genai', 'transformers'],
  'llms': ['large language models', 'llm', 'generative ai', 'genai'],
  'large language models': ['llm', 'llms', 'generative ai'],
  'generative ai': ['genai', 'gen ai', 'llm', 'llms'],
  'genai': ['generative ai', 'llm'],
  'gen ai': ['generative ai', 'llm'],
  'owasp': ['owasp top 10', 'owasp top ten'],
  'owasp top 10': ['owasp', 'owasp top ten'],
  'owasp top ten': ['owasp', 'owasp top 10']
};

function escapeRegExp(string) {
  return String(string).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Checks if a skill token appears in the job text using exact word boundaries
 * and canonical synonym expansions, eliminating collisions like "Java" in "JavaScript".
 *
 * @param {string} skill
 * @param {string} lowerJobText
 * @returns {boolean}
 */
export function checkSkillInText(skill = '', lowerJobText = '') {
  const s = String(skill || '').toLowerCase().trim();
  if (!s || !lowerJobText) return false;

  // 1. Direct word-boundary match
  const esc = escapeRegExp(s);
  const boundaryRegex = new RegExp(`(?:^|[^a-z0-9_#+])${esc}(?:$|[^a-z0-9_#+])`, 'i');
  if (boundaryRegex.test(lowerJobText)) {
    return true;
  }

  // 2. Canonical synonym match (e.g. k8s <-> kubernetes)
  const synonyms = TECH_SKILL_SYNONYMS[s] || [];
  for (const syn of synonyms) {
    const escSyn = escapeRegExp(syn);
    const synRegex = new RegExp(`(?:^|[^a-z0-9_#+])${escSyn}(?:$|[^a-z0-9_#+])`, 'i');
    if (synRegex.test(lowerJobText)) {
      return true;
    }
  }

  return false;
}

// ── Community-Sourced ATS Registry ───────────────────────────────────────────
export const COMMUNITY_REGISTRY_URL = 'https://raw.githubusercontent.com/SVSPraveen/SPrav-Live-Feed/main/public/data/companies.json';
export const LOCAL_REGISTRY_FALLBACK_URL = '/data/companies.json';
export const REGISTRY_CACHE_KEY = 'sprav_community_registry_cache_v1';
export const REGISTRY_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

export function mergeCompanyRegistries(base = {}, community = {}) {
  if (!community || typeof community !== 'object') return base;
  const merged = {};
  const allPlatforms = new Set([...Object.keys(base || {}), ...Object.keys(community || {})]);
  for (const plat of allPlatforms) {
    const listA = Array.isArray(base?.[plat]) ? base[plat] : [];
    const listB = Array.isArray(community?.[plat]) ? community[plat] : [];
    const seen = new Set();
    const combined = [];
    for (const item of [...listA, ...listB]) {
      const clean = String(item || '').trim().toLowerCase();
      if (clean && !seen.has(clean)) {
        seen.add(clean);
        combined.push(clean);
      }
    }
    merged[plat] = combined;
  }
  return merged;
}

/**
 * Loads and merges the community-sourced ATS companies registry.
 * Checks persistent cache first, attempts fetch from raw.githubusercontent.com,
 * falls back to /data/companies.json, and finally to embedded CURATED_ATS_COMPANIES.
 */
export async function loadCommunityRegistry(options = {}) {
  const forceRefresh = options.forceRefresh === true;

  // 1. Check in-memory or storageVault/localStorage cache
  if (!forceRefresh) {
    try {
      const cachedStr = (typeof storageVault?.getItem === 'function')
        ? await storageVault.getItem(REGISTRY_CACHE_KEY)
        : (typeof localStorage !== 'undefined' ? localStorage.getItem(REGISTRY_CACHE_KEY) : null);
      if (cachedStr) {
        const cached = typeof cachedStr === 'object' ? cachedStr : JSON.parse(cachedStr);
        if (cached && cached.timestamp && (Date.now() - cached.timestamp < REGISTRY_CACHE_TTL_MS) && cached.platforms) {
          return mergeCompanyRegistries(CURATED_ATS_COMPANIES, cached.platforms);
        }
      }
    } catch {}
  }

  // 2. Fetch from GitHub or local fallback if in browser
  if (typeof fetch === 'function') {
    const urls = [COMMUNITY_REGISTRY_URL, LOCAL_REGISTRY_FALLBACK_URL];
    for (const url of urls) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (res.ok) {
          const data = await res.json();
          if (data && data.platforms && typeof data.platforms === 'object') {
            const toCache = { timestamp: Date.now(), platforms: data.platforms };
            try {
              if (typeof storageVault?.setItem === 'function') {
                await storageVault.setItem(REGISTRY_CACHE_KEY, toCache);
              } else if (typeof localStorage !== 'undefined') {
                localStorage.setItem(REGISTRY_CACHE_KEY, JSON.stringify(toCache));
              }
            } catch {}
            return mergeCompanyRegistries(CURATED_ATS_COMPANIES, data.platforms);
          }
        }
      } catch {
        // Continue to fallback
      }
    }
  }

  return CURATED_ATS_COMPANIES;
}

export const BATCH_SIZES = { 
  greenhouse: 20, 
  ashby: 20, 
  lever: 12, 
  smartrecruiters: 8, 
  recruitee: 6, 
  workable: 10,
  personio: 8,
  bamboohr: 8,
  workday: 4,
  rippling: 4
};
export const SCAN_CURSOR_KEY = 'ats_scan_cursor_v1';

export function getRotatedBatch(list = [], platform = 'greenhouse', cursorMap = {}, batchSize = null) {
  const size = batchSize || BATCH_SIZES[platform] || 20;
  const len = Array.isArray(list) ? list.length : 0;
  if (!len) return { batch: [], nextCursor: 0 };
  const start = (cursorMap[platform] || 0) % len;
  const batch = [];
  for (let i = 0; i < Math.min(size, len); i++) {
    batch.push(list[(start + i) % len]);
  }
  const nextCursor = (start + size) % len;
  cursorMap[platform] = nextCursor;
  return { batch, nextCursor };
}

// Pre-curated top tech companies with verified public ATS endpoints (500+ employers across 6 platforms)
export const CURATED_ATS_COMPANIES = {
  greenhouse: [
    'gitlab', 'figma', 'reddit', 'databricks', 'doordash', 'pinterest', 
    'affirm', 'dropbox', 'cloudflare', 'instacart', 'robinhood', 'datadog',
    'elastic', 'coinbase', 'mongodb', 'twitch', 'discord', 'gusto', 'brex',
    'scaleai', 'stripe', 'shopify', 'waymo', 'lyft', 'snap', 'unity',
    'hubspot', 'pagerduty', 'splunk', 'box', 'palantir', 'notion', 'airtable',
    'plaid', 'crowdstrike', 'zscaler', 'andurilindustries', 'tesla', 'skydio',
    'snowflake', 'confluent', 'dbtlabs', 'duckduckgo', 'hashicorp', 'temporal',
    'couchbase', 'carta', 'checkr', 'benchling', 'samsara', 'toast',
    'asana', 'okta', 'rubrik', 'sumologic', 'sentinelone', 'dataminr',
    'braze', 'amplitude', 'klaviyo', 'quora', 'roblox', 'duolingo',
    'sofi', 'opendoor', 'lyrahealth', 'grammarly', 'canonical', 'instana',
    'navan', 'vimeo', 'zynga', 'crunchbase', 'chime', 'squarespace',
    'surveymonkey', 'yext', 'lucidsoftware', 'applovin', 'unity3d', 'blend',
    'branch', 'ironclad', 'fivetran', 'segment', 'launchdarkly', 'harness',
    'starburst', 'sourcegraph', 'circleci', 'snyk', 'lacework', 'cribl',
    'astronomer', 'cockroachlabs', 'apollographql', 'planetscale', 'neon', 'redpanda',
    'chronosphere', 'honeycomb', 'lightstep', 'scylladb', 'stream', 'algolia',
    'talkdesk', 'front', 'intercom', 'dialpad', 'gorgias', 'kustomer',
    'drift', 'iterable', 'postman', 'insomnia', 'stoplight', 'kong',
    'soloio', 'buoyant', 'linkerd', 'envoy', 'cilium', 'isovalent',
    'tigera', 'sysdig', 'aquasec', 'deepfence', 'wiz', 'orca',
    'cyera', 'abnormal', 'island', 'teleport', 'tailscale', 'border0',
    'twingate', 'zerotier', 'netbird', 'swiggy', 'zomato', 'blinkit',
    'razorpay', 'zerodha', 'cred', 'groww', 'meesho', 'urbancompany',
    'curefit', 'zepto', 'inmobi', 'ola', 'olaelectric', 'phonepe',
    'paytm', 'delhivery', 'mpl', 'dream11', 'games24x7', 'unacademy',
    'upgrad', 'physicswallah', 'eruditus', 'lead', 'classplus', 'cuemath',
    'scaler', 'interviewbit', 'browserstack', 'hasura', 'chargebee', 'freshworks',
    'clevertap', 'moengage', 'whatfix', 'darwinbox', 'yellowai', 'gupshup',
    'haptik', 'sarvam', 'krutrim', 'gnani', 'karya', 'bhashini', 'subspace', 'jio'
  ],
  ashby: [
    'linear', 'retool', 'ramp', 'vercel', 'supabase', 'posthog', 'sentry',
    'openai', 'anthropic', 'perplexity', 'resend', 'prisma', 'modal', 'cursor',
    'midjourney', 'descript', 'warp', 'replit', 'codeium', 'lumaai',
    'togetherai', 'replicate', 'weightsandbiases', 'clickhouse', 'langchain',
    'pinecone', 'runway', 'elevenlabs', 'mistral', 'cohere', 'sourcegraph',
    'infisical', 'livekit', 'axiom', 'tavily', 'groq', 'fireworks',
    'decagon', 'character', 'phind', 'pydantic', 'braintrust', 'unstructured',
    'deepgram', 'suno', 'harvey', 'sierra', 'poolside', 'lovable',
    'cognition', 'anysphere', 'factory', 'magic', 'augmentcode', 'tabnine',
    'cursorai', 'dust', 'glean', 'hebbia', 'writer', 'jasper',
    'copyai', 'typeface', 'synthesia', 'heygen', 'pika', 'kling',
    'ideogram', 'recraft', 'bfl', 'blackforestlabs', 'fal', 'clay',
    'attio', 'folk', 'daylight', 'monzo', 'revolut', 'mercury',
    'brex', 'plaid', 'moderntreasury', 'moov', 'lithic', 'unit',
    'increase', 'column', 'bridge', 'stripe', 'checkout', 'primer',
    'paddle', 'lemonsqueezy', 'autumn', 'octane', 'orb', 'metronome',
    'schematic', 'stigg', 'lago', 'openmeter', 'polar', 'railway',
    'render', 'fly', 'koyeb', 'deno', 'bun', 'valtown',
    'wasmer', 'fermyon', 'tinybird', 'upstash', 'turso', 'chiselstrike',
    'convex', 'inngest', 'triggerdev', 'defer', 'hatchet', 'temporal',
    'prefect', 'dagster', 'cubejs', 'rill', 'evidence', 'lightdash',
    'hex', 'deepnote', 'databutton', 'marimo', 'reflex', 'taipy',
    'gradio', 'streamlit', 'chainlit', 'mesop', 'fasthtml', 'flet',
    'nicegui', 'clerk', 'stytch', 'kinde', 'workos', 'propelauth',
    'supertokens', 'ory', 'zitadel', 'logto', 'descope', 'transcend'
  ],
  lever: [
    'palantir', 'shieldai', 'waabi', 'spotify', 'qonto', 'acceldata',
    'wealthfront', 'rise', 'sysdig', 'neon', 'relay', 'kapwing',
    '15five', 'automattic', 'docker', 'coursera', 'medium',
    'fullstory', 'webflow', 'atlassian', 'zapier', 'eventbrite', 'hootsuite',
    'launchdarkly', 'trustpilot', 'nerdwallet', 'kraken', 'canonical',
    'postman', 'algolia', 'brave', 'snyk', 'auth0', 'apollographql', 'fastly',
    'datadog', 'mongodb', 'elastic', 'gitlab', 'pagerduty', 'twilio',
    'sendgrid', 'segment', 'mixpanel', 'heap', 'amplitude', 'looker',
    'tableau', 'snowflake', 'fivetran', 'stitch', 'airbyte', 'meltano',
    'prefect', 'dbt', 'montecarlo', 'bigeye', 'anomalo',
    'collibra', 'alation', 'atlan', 'datafold', 'castor', 'metaphor',
    'secoda', 'select', 'synq', 'soda', 'rudderstack', 'snowplow',
    'freshpaint', 'mparticle', 'tealium', 'lytics', 'blueshift', 'braze',
    'customerio', 'ortto', 'klaviyo', 'hubspot', 'drift', 'intercom',
    'kustomer', 'gladly', 'front', 'missive', 'zendesk', 'freshworks',
    'helpscout', 'kayako', 'groove', 'gorgias', 'tidio', 'crisp',
    'livechat', 'chatwoot', 'papercups'
  ],
  smartrecruiters: [
    'canva', 'deliveryhero', 'skechers', 'collibra', 'glovo', 'criteo',
    'ikea', 'visa', 'bosch', 'square', 'spotify', 'publicissapient',
    'ubisoft', 'blizzard', 'epicgames', 'square-enix', 'cdprojektred',
    'take-two', 'electronic-arts', 'bandainamco', 'sega', 'capcom',
    'konami', 'riotgames', 'valve', 'bungie', 'supercell', 'king',
    'rovio', 'playtika', 'scopely', 'zynga', 'niantic', 'roblox',
    'accenture', 'capgemini', 'cognizant', 'infosys', 'wipro', 'tcs',
    'hcltech', 'techmahindra', 'lntinfotech', 'mphasis', 'mindtree',
    'hexaware', 'persistent', 'birlasoft', 'coforge', 'zensar'
  ],
  recruitee: [
    'bunq', 'ticketswap', 'transloadit', 'blendle', 'wetransfer', 'tideways',
    'hotjar', 'brevo', 'swapfiets', 'picnic', 'messagebird', 'mollie',
    'adyen', 'orderbird', 'taxdoo', 'personio', 'flinks', 'freetrade',
    'trade-republic', 'scalable-capital', 'n26', 'qonto', 'revolut', 'monzo', 'starling',
    'urban-sports-club', 'taxfix', 'cargo-one', 'zenjob', 'contentful', 'pitch', 'adjust'
  ],
  workable: [
    'invision', 'taxfix', 'omio', 'personio', 'wolt', 'bolt', 'tier',
    'getir', 'rover', 'revolut', 'typeform', 'wework', 'transfergo',
    'starlingbank', 'monzo', 'curve', 'oaknorth', 'checkout-com',
    'sumup', 'zettle', 'izettle', 'pleo', 'spendesk', 'moss',
    'payhawk', 'agicap', 'pennylane', 'yoco', 'chipper-cash', 'wave',
    'flutterwave', 'paystack', 'opay', 'palmpay', 'kuda', 'fairmoney',
    'piggyvest', 'cowrywise', 'moniepoint', 'nomba', 'teamapt',
    'remitly', 'worldremit', 'sendwave', 'lemfi', 'nala', 'chipper',
    'tala', 'branch-international', 'kredivo', 'strapi', 'camunda', 'vibe'
  ],
  personio: [
    'personio', 'taxfix', 'statista', 'grover', 'spryker', 'getyourguide',
    'tier', 'flixbus', 'scalable-capital', 'flinks', 'trade-republic', 'cargo-one',
    'contentful', 'pitch'
  ],
  bamboohr: [
    'modal', 'posthog', 'wpengine', 'articulate', 'pair', 'seatgeek', 'chime',
    'zapier', 'sourcegraph', 'docker', 'clickhouse', 'astronomer', 'timescale',
    'planetscale', 'soundhound', 'bitly', 'udacity'
  ],
  workday: [
    'nvidia', 'adobe', 'salesforce', 'autodesk', 'workday', 'target', 'mastercard', 'netflix', 'walmart'
  ],
  rippling: [
    'aalyria-careers', 'superhuman', 'watershed', 'scale-ai', 'anthropic'
  ]
};

/**
 * Generates a normalized semantic deduplication key for a job listing.
 * Strips common punctuation, casing, and peripheral tokens like (Remote), [Full-Time], etc.
 * @param {object} job
 * @returns {string}
 */
export function computeJobDedupKey(job) {
  if (!job) return '';
  const cleanCompany = String(job.company || '')
    .toLowerCase()
    .replace(/\b(inc|llc|ltd|corp|corporation|technologies|tech)\b\.?/gi, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();

  const cleanTitle = String(job.title || '')
    .toLowerCase()
    .replace(/\(.*?\)|\[.*?\]/g, '')
    .replace(/\b(remote|hybrid|onsite|full-time|part-time|contract)\b/gi, '')
    .replace(/[^a-z0-9]/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');

  const loc = String(job.location || '').toLowerCase();
  const isRemote = loc.includes('remote') || !!job.is_remote;
  const locToken = isRemote ? 'remote' : loc.replace(/[^a-z0-9]/g, '');

  return `${cleanCompany}:::${cleanTitle}:::${locToken}`;
}

/**
 * Helper to extract email and recruiter/founder name from Hacker News hiring text.
 * Supports obfuscated emails: name [at] domain.com, name(at)domain [dot] com, name at domain dot com.
 * Extracts names near keywords: Contact:, Reach out to, Email:, Founder:, Hiring Lead:, CTO:
 */
export function extractHnContactInfo(text) {
  if (!text || typeof text !== 'string') return { email: null, name: null };

  // 1. Email extraction with obfuscation support:
  const emailRegex = /([a-zA-Z0-9._%+-]+(?:\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*|\s+at\s+|\s*@\s*)[a-zA-Z0-9.-]+(?:\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*|\s+dot\s+|\s*\.\s*)[a-zA-Z]{2,})/gi;
  
  let match = emailRegex.exec(text);
  let founderEmail = null;

  if (match && match[1]) {
    let rawEmail = match[1];
    founderEmail = rawEmail
      .replace(/\s*\[\s*at\s*\]\s*|\s*\(\s*at\s*\)\s*|\s+at\s+/gi, '@')
      .replace(/\s*\[\s*dot\s*\]\s*|\s*\(\s*dot\s*\)\s*|\s+dot\s+/gi, '.')
      .replace(/\s+/g, '')
      .toLowerCase();

    if (!/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(founderEmail)) {
      founderEmail = null;
    }
  }

  // Fallback plain email search if obfuscated regex missed
  if (!founderEmail) {
    const plainMatch = text.match(/([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/);
    if (plainMatch) founderEmail = plainMatch[1].toLowerCase();
  }

  // 2. Name extraction preceding or following keywords
  let founderName = null;
  const namePatterns = [
    /(?:contact|founder|hiring lead|cto)\s*:\s*([A-Z][a-zA-Z0-9'-]+(?:\s+[A-Z][a-zA-Z0-9'-]+)?)/i,
    /(?:reach out to|email)\s+([A-Z][a-zA-Z0-9'-]+(?:\s+[A-Z][a-zA-Z0-9'-]+)?)(?:\s+at|\s*:)/i,
    /([A-Z][a-zA-Z0-9'-]+(?:\s+[A-Z][a-zA-Z0-9'-]+)?)\s*\((?:founder|cto|co-founder|engineering lead)\)/i
  ];

  for (const pattern of namePatterns) {
    const nameMatch = text.match(pattern);
    if (nameMatch && nameMatch[1]) {
      const candidate = nameMatch[1].trim();
      if (!/^(us|me|team|jobs|apply|hiring|careers|support|contact|founder)$/i.test(candidate) && candidate.length >= 2 && candidate.length <= 40) {
        founderName = candidate;
        break;
      }
    }
  }

  return { email: founderEmail, name: founderName };
}

/**
 * Intelligently parses Hacker News "Who is hiring?" top-level comment headers into
 * structured { company, title, location, isRemote, visaSponsored }.
 *
 * Handles diverse real-world HN poster habits:
 *  - "Acme Corp | Senior Frontend Engineer | San Francisco, CA | REMOTE | VISA"
 *  - "Location: [City, Country] | Company Name | Role"
 *  - "Location: New York, NY | Stripe | Senior Backend Engineer"
 *  - "Remote (US/EU) | Datadog | Staff Systems Engineer"
 *  - "Company: Vercel | Role: Full-Stack Engineer | Location: Remote"
 *  - "Location: [San Francisco, CA] | Figma | Staff Systems Engineer | ONSITE"
 *  - "Postman | Location: Bengaluru, India | Senior Product Designer"
 *  - "[Hiring] Anthropic | Research Scientist | San Francisco | Onsite"
 *
 * @param {string} firstLine - First non-empty line of HN comment
 * @param {string} [author] - Hacker News author handle fallback
 * @param {string} [fullText] - Entire comment text for secondary classification
 * @returns {{ company: string, title: string, location: string, isRemote: boolean, visaSponsored: boolean }}
 */
export function parseHnPostingHeader(firstLine = '', author = '', fullText = '') {
  const textContext = (fullText || '').toLowerCase();
  let cleanLine = (firstLine || '').replace(/^[\s*#\-–—]+/, '').trim();

  // Strip initial markdown bold/italic formatting e.g. **Company**
  cleanLine = cleanLine.replace(/[*_~`]/g, '').trim();

  // Split by pipe '|' or fallback delimiter if no pipe
  let rawParts = cleanLine.split(/\s*\|\s*/);
  if (rawParts.length === 1 && cleanLine.includes(';')) {
    rawParts = cleanLine.split(/\s*;\s*/);
  }

  let parts = rawParts.map(p => p.trim()).filter(Boolean);

  let identifiedCompany = '';
  let identifiedTitle = '';
  let identifiedLocation = '';
  let isRemote = textContext.includes('remote');
  let visaSponsored = textContext.includes('visa') && !textContext.includes('no visa');

  const remainingTokens = [];

  // Helper patterns
  const isLocationIndicator = (str) => {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    if (/^(?:\[?\s*location\s*[:-]|remote\b|onsite\b|hybrid\b|in-office\b|anywhere\b|wfh\b|work\s+from\s+home\b)/i.test(s)) return true;
    if (/^(?:us|usa|uk|eu|emea|apac|latam|europe|india|germany|canada|australia)\s*(?:only|\b)/i.test(s)) return true;
    if (/^\[?\s*(?:san francisco|sf bay|new york|nyc|london|berlin|toronto|bengaluru|bangalore|singapore|amsterdam|paris|tokyo|chicago|seattle|austin|boston|zurich|dublin|munich)(?:[,\s]+[a-z]{2,})?\s*\]?$/i.test(s)) {
      return true;
    }
    return false;
  };

  const isTitleIndicator = (str) => {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    if (/^(?:(?:job\s+)?title|role|position)\s*[:-]/i.test(s)) return true;
    return /\b(engineer|developer|designer|manager|architect|lead|analyst|specialist|intern|scientist|director|vp|cto|cpo|head of|consultant|researcher|devops|sre|programmer|full[\s-]?stack|backend|frontend|android|ios)\b/i.test(s);
  };

  const isMetaIndicator = (str) => {
    if (!str || typeof str !== 'string') return false;
    const s = str.trim();
    return /^(?:full[\s-]?time|part[\s-]?time|contract|contractor|internship|visa|no\s+visa|equity|\$\d+)/i.test(s);
  };

  const stripLocationPrefix = (str) => (str || '').replace(/^(?:\[?\s*location\s*[:-]\s*)+/i, '').replace(/[[\]]/g, '').trim();

  for (let part of parts) {
    const cleanPart = part.replace(/^[\s*#\-–—]+/, '').trim();
    if (!cleanPart) continue;

    if (/remote/i.test(cleanPart)) isRemote = true;
    if (/visa/i.test(cleanPart) && !/no\s+visa/i.test(cleanPart)) visaSponsored = true;

    // 1. Explicitly labeled segments
    const locMatch = cleanPart.match(/^(?:\[?\s*location\s*[:-]\s*)(.*)$/i);
    if (locMatch) {
      identifiedLocation = stripLocationPrefix(locMatch[1] || cleanPart);
      continue;
    }

    const compMatch = cleanPart.match(/^(?:company\s*[:-]\s*)(.*)$/i);
    if (compMatch) {
      identifiedCompany = compMatch[1].trim();
      continue;
    }

    const titleMatch = cleanPart.match(/^(?:(?:job\s+)?title|role|position)\s*[:-]\s*(.*)$/i);
    if (titleMatch) {
      identifiedTitle = titleMatch[1].trim();
      continue;
    }

    // Skip pure work-mode / visa tokens from company/title/location queue
    if (isMetaIndicator(cleanPart)) {
      continue;
    }

    remainingTokens.push(cleanPart);
  }

  // If first token is a location indicator (e.g. "Location: [San Francisco, CA]" or "Remote / NYC")
  if (remainingTokens.length > 0 && isLocationIndicator(remainingTokens[0])) {
    const locToken = remainingTokens.shift();
    if (!identifiedLocation) {
      identifiedLocation = stripLocationPrefix(locToken);
    }
  }

  // Next available token is company if not yet found
  if (!identifiedCompany && remainingTokens.length > 0) {
    if (isTitleIndicator(remainingTokens[0]) && remainingTokens.length === 1 && !identifiedTitle) {
      identifiedTitle = remainingTokens.shift();
    } else {
      identifiedCompany = remainingTokens.shift();
    }
  }

  // Next available token is title if not yet found
  if (!identifiedTitle && remainingTokens.length > 0) {
    if (isLocationIndicator(remainingTokens[0]) && !identifiedLocation) {
      identifiedLocation = stripLocationPrefix(remainingTokens.shift());
    } else {
      identifiedTitle = remainingTokens.shift();
    }
  }

  // Next available token is location if not yet found
  if (!identifiedLocation && remainingTokens.length > 0) {
    identifiedLocation = stripLocationPrefix(remainingTokens.shift());
  }

  // Defensive sanity swaps:
  // If identifiedCompany still starts with "Location:" or matches location indicators
  if (isLocationIndicator(identifiedCompany)) {
    if (!identifiedLocation || identifiedLocation === 'Remote / Direct') {
      identifiedLocation = stripLocationPrefix(identifiedCompany);
    }
    identifiedCompany = '';
  }

  // If title includes remote/onsite/hybrid, swap with location
  if (identifiedTitle && (identifiedTitle.toLowerCase().includes('remote') || identifiedTitle.toLowerCase().includes('onsite') || identifiedTitle.toLowerCase().includes('hybrid'))) {
    if (!identifiedLocation || identifiedLocation === 'Remote / Direct') {
      identifiedLocation = identifiedTitle;
    }
    identifiedTitle = '';
  }

  // Clean company formatting
  let cleanCompany = (identifiedCompany || author || 'HN Founder Direct')
    .replace(/^(?:\[?\s*location\s*[:-]\s*)+/i, '')
    .replace(/[[\]]/g, '')
    .replace(/^[\s*#\-–—]+/, '')
    .trim();

  // If cleanCompany is still blank or matches location indicator, fallback to author or default
  if (!cleanCompany || isLocationIndicator(cleanCompany)) {
    cleanCompany = author || 'HN Founder Direct';
  }

  // Title fallback
  let cleanTitle = (identifiedTitle || 'Software Engineer')
    .replace(/^(?:role|position|title)\s*[:-]\s*/i, '')
    .trim();

  if (cleanTitle.startsWith('http') || cleanTitle.length < 3) {
    cleanTitle = 'Founding / Core Engineer';
  }

  // Location fallback
  let cleanLoc = stripLocationPrefix(identifiedLocation);
  if (!cleanLoc) {
    cleanLoc = isRemote ? 'Remote / Direct' : 'Flexible / Direct';
  }

  return {
    company: cleanCompany,
    title: cleanTitle,
    location: cleanLoc,
    isRemote: isRemote || /remote/i.test(cleanLoc),
    visaSponsored
  };
}

/**
 * Maps arbitrary location strings, city names, or country identifiers to Adzuna 2-letter ISO country codes.
 * Supported Adzuna endpoints: in (India), gb (UK), de (Germany), ca (Canada), us (US),
 * plus regional European / global endpoints: au, fr, nl, pl, at, ch, it, es, sg.
 *
 * @param {string} locationOrCountry
 * @returns {string} Two-letter Adzuna country code (default 'us')
 */
export function mapLocationToCountryCode(locationOrCountry = '') {
  if (!locationOrCountry || typeof locationOrCountry !== 'string') return 'us';
  const norm = locationOrCountry.trim().toLowerCase();

  // Direct 2-letter matches
  const VALID_ADZUNA_COUNTRIES = new Set([
    'in', 'gb', 'de', 'ca', 'us', 'au', 'fr', 'nl', 'pl', 'at', 'ch', 'it', 'es', 'sg', 'nz', 'br', 'mx', 'za'
  ]);
  if (VALID_ADZUNA_COUNTRIES.has(norm)) return norm;
  if (norm === 'uk') return 'gb';
  if (norm === 'usa') return 'us';

  // 1. India (in)
  if (/\b(india|bharat|bengaluru|bangalore|hyderabad|delhi|new delhi|mumbai|pune|chennai|noida|gurgaon|gurugram|kolkata|ahmedabad|indore|jaipur)\b/i.test(norm)) {
    return 'in';
  }

  // 2. United Kingdom (gb)
  if (/\b(uk|united kingdom|great britain|england|scotland|wales|london|manchester|birmingham|edinburgh|bristol|cambridge|oxford|leeds|glasgow|belfast)\b/i.test(norm)) {
    return 'gb';
  }

  // 3. Germany & Europe/EU Regional Fallback (de)
  if (/\b(germany|deutschland|berlin|munich|münchen|frankfurt|hamburg|cologne|köln|stuttgart|düsseldorf|leipzig|europe|european|eu|emea)\b/i.test(norm)) {
    return 'de';
  }

  // 4. Canada (ca)
  if (/\b(canada|toronto|vancouver|montreal|ottawa|calgary|waterloo|edmonton|quebec)\b/i.test(norm)) {
    return 'ca';
  }

  // 5. United States (us)
  if (/\b(united states|usa|u\.s\.a\.|u\.s\.|america|seattle|austin|san francisco|sf|bay area|nyc|new york|boston|chicago|los angeles|denver|atlanta|california|texas|washington|silicon valley)\b/i.test(norm)) {
    return 'us';
  }

  // Regional European & Global
  if (/\b(france|paris|lyon)\b/i.test(norm)) return 'fr';
  if (/\b(netherlands|holland|amsterdam|rotterdam|utrecht)\b/i.test(norm)) return 'nl';
  if (/\b(poland|polska|warsaw|warszawa|krakow)\b/i.test(norm)) return 'pl';
  if (/\b(austria|österreich|vienna|wien)\b/i.test(norm)) return 'at';
  if (/\b(switzerland|schweiz|suisse|zurich|zürich|geneva)\b/i.test(norm)) return 'ch';
  if (/\b(australia|sydney|melbourne|brisbane|perth)\b/i.test(norm)) return 'au';
  if (/\b(italy|italia|milan|milano|rome|roma)\b/i.test(norm)) return 'it';
  if (/\b(spain|españa|madrid|barcelona)\b/i.test(norm)) return 'es';
  if (/\b(singapore)\b/i.test(norm)) return 'sg';

  return 'us';
}

/**
 * Extracts and formats company names from ATS posting URLs (Greenhouse, Ashby, Lever, Workable, SmartRecruiters, Rippling, Workday).
 * Ignores routing noise (jobs, boards, embed, v1, v2) and converts slugs to clean Title Case.
 *
 * @param {string} urlString
 * @returns {{ company: string, source: string }}
 */
export function parseCompanyFromAtsUrl(urlString) {
  if (!urlString || typeof urlString !== 'string' || !urlString.trim()) {
    return null;
  }

  try {
    const parsed = new URL(urlString);
    const host = parsed.hostname.toLowerCase();
    let source = null;

    if (host.includes('greenhouse.io')) {
      source = 'GREENHOUSE';
    } else if (host.includes('ashbyhq.com')) {
      source = 'ASHBY';
    } else if (host.includes('lever.co')) {
      source = 'LEVER';
    } else if (host.includes('workable.com')) {
      source = 'WORKABLE';
    } else if (host.includes('smartrecruiters.com')) {
      source = 'SMARTRECRUITERS';
    } else if (host.includes('rippling.com')) {
      source = 'RIPPLING';
    } else if (host.includes('myworkdayjobs.com') || host.includes('workday.com')) {
      source = 'WORKDAY';
    } else if (host.includes('personio.de') || host.includes('personio.com')) {
      source = 'PERSONIO';
    } else if (host.includes('bamboohr.com')) {
      source = 'BAMBOOHR';
    }

    // If domain is not an ATS or known direct job board, return null
    if (!source) {
      return null;
    }

    let candidateSlug = '';

    // Workday domains: company name is in the first subdomain (e.g., nvidia.wd5.myworkdayjobs.com)
    if (source === 'WORKDAY') {
      const parts = host.split('.');
      if (parts.length > 0 && !['www', 'jobs', 'apply', 'myworkdayjobs'].includes(parts[0])) {
        candidateSlug = parts[0];
      }
    }

    // BambooHR domains: company name is in the first subdomain (e.g., modal.bamboohr.com)
    if (source === 'BAMBOOHR') {
      const parts = host.split('.');
      if (parts.length > 0 && !['www', 'api', 'jobs', 'resources'].includes(parts[0])) {
        candidateSlug = parts[0];
      }
    }

    // Personio domains: company name is in subdomain (e.g., company.jobs.personio.de)
    if (source === 'PERSONIO') {
      const parts = host.split('.');
      if (parts.length > 0 && !['www', 'api', 'jobs'].includes(parts[0])) {
        candidateSlug = parts[0];
      }
    }

    // 1. Check query parameters (Greenhouse embed job board: ?for=company)
    if (!candidateSlug) {
      const forParam = parsed.searchParams.get('for') || parsed.searchParams.get('token') || parsed.searchParams.get('company');
      if (forParam) candidateSlug = forParam.trim();
    }

    // 2. Filter pathname segments to ignore routing noise
    const IGNORED_SEGMENTS = new Set([
      'jobs', 'job', 'boards', 'board', 'embed', 'v1', 'v2', 'api',
      'careers', 'career', 'view', 'posting', 'postings', 'external',
      'en-us', 'en', 'j', 'apply', 'search', 'detail', 'details'
    ]);

    if (!candidateSlug) {
      const segments = parsed.pathname.split('/').filter(Boolean);
      for (const seg of segments) {
        const cleanSeg = seg.toLowerCase().trim();
        // Ignore known routing noise and hex/numeric job IDs
        if (!IGNORED_SEGMENTS.has(cleanSeg) && !/^[0-9a-f]{8,}$/i.test(cleanSeg) && !/^\d+$/.test(cleanSeg)) {
          candidateSlug = seg;
          break;
        }
      }
    }

    // 3. Fallback to subdomain if hostname is company.greenhouse.io
    if (!candidateSlug) {
      const parts = host.split('.');
      if (parts.length > 2) {
        const sub = parts[0].toLowerCase();
        if (!['boards', 'jobs', 'apply', 'ats', 'www', 'job-boards'].includes(sub)) {
          candidateSlug = sub;
        }
      }
    }

    if (!candidateSlug) {
      return null;
    }

    // Clean and Title-Case the slug
    let cleanCompany = candidateSlug
      .replace(/externalcareersite/i, '')
      .replace(/careersite/i, '')
      .replace(/[-_]+/g, ' ')
      .replace(/\s+careers?$/i, '')
      .replace(/\s+jobs?$/i, '')
      .trim();

    cleanCompany = cleanCompany
      .split(/\s+/)
      .filter(Boolean)
      .map(word => {
        const lower = word.toLowerCase();
        if (lower === 'ai') return 'AI';
        if (lower === 'ml') return 'ML';
        if (lower === 'io') return 'io';
        if (lower === 'hq') return 'HQ';
        if (lower === 'llc') return 'LLC';
        if (lower === 'inc') return 'Inc';
        if (lower === 'aws') return 'AWS';
        if (lower === 'ibm') return 'IBM';
        return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
      })
      .join(' ');

    if (!cleanCompany) return null;

    return {
      company: cleanCompany,
      source
    };
  } catch {
    return null;
  }
}

/**
 * Cleans and sanitizes company names, guarding against instances where job titles
 * or webpage headlines (e.g. "Senior Manager, Internal Communications - Greenhouse")
 * were accidentally ingested as company names.
 *
 * @param {string} company - Raw company name
 * @param {string} [title] - Optional job title to cross-reference
 * @param {string} [url] - Optional job URL to extract company slug if needed
 * @returns {string} Sanitized clean company name
 */
export function sanitizeCompanyName(company, title = '', url = '') {
  if (!company || typeof company !== 'string') {
    if (url) {
      const atsParsed = parseCompanyFromAtsUrl(url);
      if (atsParsed?.company) return atsParsed.company;
    }
    return 'Tech Employer';
  }

  let c = company.trim();

  // Strip leading location prefixes like "Location: [City, Country]", "Location: ...", "[Location: ...]"
  c = c.replace(/^(?:\[?\s*location\s*[:-]\s*)+/i, '')
       .replace(/[[\]]/g, '')
       .trim();

  // Strip trailing ATS platform suffixes like " - Greenhouse", " - Lever", " | Ashby"
  c = c.replace(/\s*[-–|]\s*(greenhouse|ashby|lever|workable|smartrecruiters|workday|personio|bamboohr|recruitee)(\s+(software|inc|hq|jobs|search))?$/i, '').trim();

  // If company name looks suspiciously like a pure location (e.g. "San Francisco, CA", "Remote (US)", "London, UK")
  const isPureLocation = (str) => {
    const s = str.trim();
    if (/^(?:remote|onsite|hybrid|in-office|anywhere|wfh|work\s+from\s+home)(?:\s*[([]?[^)]*[)\]]?)?$/i.test(s)) return true;
    if (/^(?:san francisco|sf bay|new york|nyc|london|berlin|toronto|bengaluru|bangalore|singapore|amsterdam|paris|tokyo|chicago|seattle|austin|boston|zurich|dublin|munich|india|us|usa|uk|canada|germany|europe)(?:[,\s]+[a-z]{2,})?$/i.test(s)) return true;
    return false;
  };

  if (isPureLocation(c)) {
    if (url) {
      const atsParsed = parseCompanyFromAtsUrl(url);
      if (atsParsed?.company && !isPureLocation(atsParsed.company)) {
        return atsParsed.company;
      }
    }
    return 'Tech Employer';
  }

  // Job title keywords indicator
  const titleKeywordsRegex = /\b(engineer|developer|manager|architect|director|lead|intern|analyst|specialist|designer|consultant|officer|head of|vp of)\b/i;

  // If company name looks suspiciously like a job title
  if (titleKeywordsRegex.test(c)) {
    // 1. Try parsing company from ATS URL if available
    if (url) {
      const atsParsed = parseCompanyFromAtsUrl(url);
      if (atsParsed?.company && !titleKeywordsRegex.test(atsParsed.company)) {
        return atsParsed.company;
      }
    }

    // 2. If it contains " - Part", check if second part is a company name
    if (c.includes(' - ')) {
      const parts = c.split(' - ');
      const candidate = parts[parts.length - 1].trim();
      if (candidate && !titleKeywordsRegex.test(candidate)) {
        return candidate;
      }
    }

    // 3. Fallback to URL or generic
    if (url) {
      const atsParsed = parseCompanyFromAtsUrl(url);
      if (atsParsed?.company) return atsParsed.company;
    }
    return 'Tech Employer';
  }

  return c || 'Tech Employer';
}

export const LOCATION_ALIASES = getGlobalLocationAliases();

export const REMOTE_GEO_RESTRICTIONS = [
  { region: 'us',
    patterns: [
      /\b(us|usa|united states|u\.s\.|america)\s*(only|\b)/i,
      /\bremote[,\s-]+(us|usa|united states|america)\b/i,
      /\bremote\s*[([]\s*(us|usa|united states|u\.s\.|america)\s*[)\]]/i,
      /\b(us|usa)\s+remote\b/i,
      /\bamericas only\b/i,
      /\bus timezone\b/i,
      /\bus citizens?\b/i,
      /\b(san francisco|bay area|silicon valley|new york|nyc|seattle|austin|boston|los angeles|chicago|denver|california|texas|washington|ca|ny|wa|tx)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(the\s+)?(us|usa|united states|america|north america)\b/i,
      /\b(only\s+open\s+to|open\s+only\s+to)\s+(residents\s+of\s+)?(the\s+)?(us|usa|united states|america)\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+(the\s+)?(us|usa|united states|america)\s*(without\s+sponsorship)?\b/i,
      /\b(us|u\.s\.)\s+(citizenship|work\s+authorization|green\s+card)\s+(is\s+)?required\b/i,
      /\bwe\s+(can\s+only|are\s+only\s+able\s+to)\s+hire\s+(in|within)\s+(the\s+)?(us|usa|united states)\b/i,
      /\bunable\s+to\s+hire\s+(outside|internationally)\s+(of\s+)?(the\s+)?(us|usa|united states)\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+(the\s+)?(us|usa|united states)\b/i,
      /\b(must\s+be\s+a\s+)?(us|u\.s\.)\s+citizen\b/i
    ]
  },
  { region: 'europe',
    patterns: [
      /\b(eu|europe|emea)\s*(only|\b)/i,
      /\bremote[,\s-]+(eu|europe|emea)\b/i,
      /\bremote\s*[([]\s*(eu|europe|emea)\s*[)\]]/i,
      /\beuropean timezone\b/i,
      /\b(london|berlin|munich|münchen|amsterdam|paris|dublin|zurich|stockholm|germany|deutschland|france|netherlands|switzerland|ireland|poland|spain|portugal|italy|austria|sweden|norway|denmark|finland|belgium|czech|romania|greece|hungary)\b/i,
      /\b(m\/w\/d|d\/m\/w)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(the\s+)?(eu|europe|emea|germany|deutschland|france|netherlands|ireland|spain|portugal|poland|italy|switzerland|sweden|austria)\b/i,
      /\b(only\s+open\s+to|open\s+only\s+to)\s+(residents\s+of\s+)?(the\s+)?(eu|europe|emea|germany|deutschland)\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+(the\s+)?(eu|europe|germany|deutschland)\b/i,
      /\bwe\s+(can\s+only|are\s+only\s+able\s+to)\s+hire\s+(in|within)\s+(the\s+)?(eu|europe|emea|germany|deutschland)\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+(the\s+)?(eu|europe|emea|germany|deutschland)\b/i
    ]
  },
  { region: 'uk',
    patterns: [
      /\buk\s*(only|\b)/i,
      /\bremote[,\s-]+(uk|united kingdom|britain)\b/i,
      /\bremote\s*[([]\s*(uk|united kingdom)\b/i,
      /\buk\s+remote\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(the\s+)?(uk|united kingdom|britain|england)\b/i,
      /\b(only\s+open\s+to|open\s+only\s+to)\s+(residents\s+of\s+)?(the\s+)?(uk|united kingdom)\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+(the\s+)?(uk|united kingdom)\b/i,
      /\bwe\s+(can\s+only|are\s+only\s+able\s+to)\s+hire\s+(in|within)\s+(the\s+)?(uk|united kingdom)\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+(the\s+)?(uk|united kingdom)\b/i
    ]
  },
  { region: 'canada',
    patterns: [
      /\bcanada\s*(only|\b)/i,
      /\bremote[,\s-]+canada\b/i,
      /\bremote\s*[([]\s*canada\b/i,
      /\bcanada\s+remote\b/i,
      /\b(toronto|vancouver|montreal|ontario|bc|quebec)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+canada\b/i,
      /\b(only\s+open\s+to|open\s+only\s+to)\s+(residents\s+of\s+)?canada\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+canada\b/i,
      /\bwe\s+(can\s+only|are\s+only\s+able\s+to)\s+hire\s+(in|within)\s+canada\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+canada\b/i
    ]
  },
  { region: 'australia',
    patterns: [
      /\b(australia|new zealand|anz)\s*(only|\b)/i,
      /\bremote[,\s-]+(australia|new zealand|anz)\b/i,
      /\bremote\s*[([]\s*(australia|new zealand|anz)\s*[)\]]/i,
      /\b(sydney|melbourne|brisbane|perth|auckland|wellington)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(australia|new zealand|anz)\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+(australia|new zealand)\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+(australia|new zealand)\b/i
    ]
  },
  { region: 'singapore',
    patterns: [
      /\bsingapore\s*(only|\b)/i,
      /\bremote[,\s-]+singapore\b/i,
      /\bremote\s*[([]\s*singapore\s*[)\]]/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+singapore\b/i,
      /\b(authorized|eligible)\s+to\s+work\s+in\s+singapore\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+singapore\b/i
    ]
  },
  { region: 'japan',
    patterns: [
      /\bjapan\s*(only|\b)/i,
      /\bremote[,\s-]+japan\b/i,
      /\bremote\s*[([]\s*japan\s*[)\]]/i,
      /\b(tokyo|osaka|kyoto)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+japan\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+japan\b/i
    ]
  },
  { region: 'latin_america',
    patterns: [
      /\b(latam|latin america)\s*(only|\b)/i,
      /\bremote[,\s-]+latam\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(latam|latin america|brazil|mexico|colombia|argentina|chile)\b/i,
      /\b(only\s+open\s+to|open\s+only\s+to)\s+(residents\s+of\s+)?(latam|latin america)\b/i
    ]
  },
  { region: 'asia_pacific',
    patterns: [
      /\b(apac|asia|india)\s*(only|\b)/i,
      /\bremote[,\s-]+(apac|asia|india)\b/i,
      /\bremote\s*[([]\s*(apac|asia|india)\s*[)\]]/i,
      /\b(india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|chennai|noida|gurgaon)\b/i
    ],
    descriptionPatterns: [
      /\b(must|have to)\s+(reside|be located|be based|live)\s+(in|within)\s+(apac|asia|india)\b/i,
      /\bwork\s+from\s+anywhere\s+in\s+(apac|asia|india)\b/i
    ]
  }
];

export function matchLocationString(jobLoc, targetLoc) {
  return matchLocationStringTaxonomy(jobLoc, targetLoc);
}

export class BrowserAtsScanner {
  constructor() {
    this.isRunning = false;
    this.listeners = new Set();
    this.status = {
      active: false,
      state: 'Idle',
      scannedCompanies: 0,
      discoveredCount: 0,
      lastScanTime: null,
      currentCompany: ''
    };
    this.abortController = null;
    this._inactiveLeverSlugs = new Set();
    this._inactiveSlugs = new Set();

    // Listen for jobs captured via Universal Job Grabber Bookmarklet
    if (typeof BroadcastChannel !== 'undefined') {
      try {
        this.importChannel = new BroadcastChannel('sprav_job_sync');
        if (typeof this.importChannel.unref === 'function') {
          this.importChannel.unref();
        }
        this.importChannel.onmessage = async (event) => {
          if (event.data?.type === 'SPRAV_IMPORT_JOB' && event.data.job) {
            await this.ingestGrabbedJob(event.data.job);
            this._notify();
          }
        };
      } catch {}
    }
  }

  async ingestGrabbedJob(rawJob) {
    if (!rawJob || !rawJob.title) return null;
    const cleanJob = sanitizeObject(rawJob);
    if (cleanJob.url) {
      cleanJob.url = formatSafeWebUrl(cleanJob.url, '#');
    }
    let kb = null;
    try {
      kb = await storageVault.getKnowledgeBase();
    } catch {}

    const candidateSkills = [];
    if (kb && kb.skills && typeof kb.skills === 'object') {
      Object.values(kb.skills).forEach(val => {
        if (Array.isArray(val)) candidateSkills.push(...val);
        else if (typeof val === 'string') candidateSkills.push(val);
      });
    } else if (Array.isArray(kb?.skills)) {
      candidateSkills.push(...kb.skills);
    }

    const fit = this.calculateAtsFit(candidateSkills, `${cleanJob.title} ${cleanJob.description || ''}`);
    const normalized = this.normalizeJob({
      ...cleanJob,
      ats_match_score: fit.score,
      matched_skills: fit.matched,
      missing_skills: fit.missing,
      status: cleanJob.status || 'ready_to_apply',
      is_saved: true,
      saved: true
    });

    try {
      await storageVault.saveJob(normalized);
    } catch (e) {
      console.warn('[ATS Scanner] Error saving grabbed job:', e);
    }
    return normalized;
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const listener of this.listeners) {
      try {
        listener({ ...this.status });
      } catch (e) {
        console.error('[ATS Scanner] Listener notification error:', e);
      }
    }
  }

  getStatus() {
    return { ...this.status };
  }

  /**
   * Evaluates ATS fit score (0-100) and extracts matched & missing skills.
   * Strictly authentic: uses word-boundary token regex (\b) and canonical synonym
   * expansions (k8s <-> kubernetes) to prevent false collisions like "Java" in "JavaScript".
   */
  calculateAtsFit(candidateSkills = [], jobText = '', options = {}) {
    const opts = typeof options === 'number' ? { semanticScore: options } : (options || {});
    const rawJob = typeof jobText === 'string'
      ? jobText
      : ((jobText && typeof jobText === 'object') ? `${jobText.title || ''} ${jobText.description || ''}` : '');
    if (!rawJob || !rawJob.trim()) return { score: 50, matched: [], missing: [], semanticSimilarity: null, semantic_score: null };

    const lowerJob = rawJob.toLowerCase();
    const matched = [];
    const missing = [];

    // Flatten candidate verified skills (supporting raw array, profile object with .skills, or skill map)
    let rawSkillList = [];
    if (Array.isArray(candidateSkills)) {
      rawSkillList = candidateSkills;
    } else if (candidateSkills && typeof candidateSkills === 'object') {
      const skillsContainer = (candidateSkills.skills && typeof candidateSkills.skills === 'object')
        ? candidateSkills.skills
        : candidateSkills;
      Object.values(skillsContainer).forEach(val => {
        if (Array.isArray(val)) rawSkillList.push(...val);
        else if (typeof val === 'string') rawSkillList.push(val);
      });
    }

    const candidateSkillSet = new Set(
      rawSkillList
        .map(s => String(s).toLowerCase().trim())
        .filter(Boolean)
    );

    // Expanded technical catalog across all 17 tech domains (Cloud, Cyber, AI/ML, Data, Embedded, Mobile, QA, Web)
    const expandedCatalog = [
      // Web & Full Stack
      'python', 'javascript', 'typescript', 'react', 'fastapi', 'docker',
      'kubernetes', 'aws', 'sql', 'postgresql', 'graphql', 'rest api', 'rest apis',
      'ci/cd', 'git', 'linux', 'langgraph', 'langchain', 'qdrant', 'redis',
      'node.js', 'nodejs', 'next.js', 'vue', 'django', 'flask', 'tailwind',
      'mongodb', 'pytorch', 'tensorflow', 'scikit-learn', 'rag', 'llm',
      'prompt engineering', 'gcp', 'azure', 'microservices', 'system design',
      'go', 'golang', 'rust', 'c++', 'java', 'spring boot',
      // Cloud, DevOps & SRE
      'terraform', 'ansible', 'helm', 'prometheus', 'grafana', 'datadog',
      'argo cd', 'argocd', 'jenkins', 'github actions', 'gitlab ci', 'cloudformation',
      'site reliability', 'sre', 'observability', 'kafka', 'opentelemetry',
      // Cybersecurity, AppSec & SecOps
      'siem', 'soc', 'owasp', 'penetration testing', 'incident response', 'iam',
      'identity and access management', 'threat modeling', 'firewall', 'wireshark',
      'splunk', 'vulnerability management', 'edr', 'pki', 'zero trust', 'cryptography',
      'kali linux', 'nessus', 'burp suite', 'metasploit', 'cissp', 'security operations',
      // Data Engineering & Big Data
      'spark', 'apache spark', 'pyspark', 'dbt', 'snowflake', 'databricks',
      'bigquery', 'hadoop', 'airflow', 'apache airflow', 'etl', 'elt', 'tableau',
      'power bi', 'pandas', 'numpy', 'data warehousing', 'data modeling',
      // Mobile Development
      'swift', 'swiftui', 'kotlin', 'android sdk', 'flutter', 'react native', 'objective-c',
      // QA & Test Automation
      'selenium', 'cypress', 'playwright', 'testng', 'junit', 'jest',
      'load testing', 'performance testing', 'qa automation', 'automated testing',
      // Embedded & Hardware Systems
      'embedded c', 'c', 'rtos', 'arm', 'firmware', 'fpga', 'verilog', 'vhdl',
      'microcontroller', 'kernel',
      // Enterprise Systems & Distributed Data
      'c#', '.net', '.net core', 'grpc', 'distributed systems', 'nosql', 'elasticsearch', 'dynamodb'
    ];

    // Check candidate skills first using word-boundaries & synonyms
    for (const skill of candidateSkillSet) {
      if (checkSkillInText(skill, lowerJob)) {
        matched.push(skill);
      }
    }

    // Check catalog skills that the candidate might be missing or matching
    for (const kw of expandedCatalog) {
      if (checkSkillInText(kw, lowerJob)) {
        const isCandidateMatch = candidateSkillSet.has(kw) || 
          matched.includes(kw) || 
          (TECH_SKILL_SYNONYMS[kw] || []).some(syn => candidateSkillSet.has(syn));
        if (isCandidateMatch) {
          if (!matched.includes(kw)) matched.push(kw);
        } else {
          missing.push(kw);
        }
      }
    }

    const totalKeywords = matched.length + missing.length;
    let keywordScore = 50;
    if (totalKeywords > 0) {
      keywordScore = Math.min(98, Math.max(35, Math.round((matched.length / totalKeywords) * 100)));
    } else if (candidateSkillSet.size > 0) {
      keywordScore = 75;
    }

    // Blend with dense vector score if provided in options
    let finalScore = keywordScore;
    if (typeof opts.semanticScore === 'number' && !isNaN(opts.semanticScore)) {
      finalScore = Math.min(100, Math.round(keywordScore * 0.7 + opts.semanticScore * 0.3));
    }

    return {
      score: finalScore,
      overallScore: finalScore,
      keywordScore,
      semantic_score: opts.semanticScore ?? null,
      semanticScore: opts.semanticScore ?? null,
      matched: Array.from(new Set(matched)),
      matchedKeywords: Array.from(new Set(matched)),
      missing: Array.from(new Set(missing)).slice(0, 6)
    };
  }

  /**
   * Matches job against target roles, locations, work mode, and regional geo-fences
   * configured in Application Scope.
   */
  isJobMatchingScope(job, scope) {
    if (!scope) return true;

    const title = (job.title || '').toLowerCase();
    const targetSeniority = scope.experience_level || 'any';
    const jobSeniority = classifySeniority(job.title, job.description);

    // 1. Role match with Seniority Guardrails
    // Resiliently gather roles from scope.roles, scope.target_roles, scope.target_titles, or singular role fields
    const rawRoles = [
      ...(Array.isArray(scope.roles) ? scope.roles : []),
      ...(Array.isArray(scope.target_roles) ? scope.target_roles : []),
      ...(Array.isArray(scope.target_titles) ? scope.target_titles : [])
    ];
    if (scope.target_role && typeof scope.target_role === 'string') rawRoles.push(scope.target_role);
    if (scope.primary_role && typeof scope.primary_role === 'string') rawRoles.push(scope.primary_role);
    if (scope.role && typeof scope.role === 'string') rawRoles.push(scope.role);

    const targetRoles = rawRoles
      .filter(r => r && (typeof r === 'string' || (r.preference !== 'exclude' && r.preference !== 'never')))
      .map(r => (typeof r === 'string' ? r : r.keyword || '').toLowerCase().trim())
      .map(r => r.replace(/\b(roles|jobs|openings|positions)\b/gi, '').trim())
      .filter(Boolean);

    const excludedRoles = rawRoles
      .filter(r => r && typeof r === 'object' && (r.preference === 'exclude' || r.preference === 'never'))
      .map(r => (typeof r === 'string' ? r : r.keyword || '').toLowerCase().trim())
      .map(r => r.replace(/\b(roles|jobs|openings|positions)\b/gi, '').trim())
      .filter(Boolean);

    // Check explicit excludes
    for (const ex of excludedRoles) {
      if (ex && title.includes(ex)) return false;
    }

    if (targetRoles.length > 0) {
      const hasRoleMatch = matchesTargetRoleWithSeniority(job.title, targetRoles, targetSeniority);
      if (!hasRoleMatch) return false;
    }

    // 2. Seniority Level Enforcement
    if (targetSeniority === 'fresher') {
      // Fresher (0 years exp): Reject any senior, staff, lead, or executive roles
      if (jobSeniority.level === 'senior' || jobSeniority.level === 'staff_exec') {
        return false;
      }
      if (/\b(senior|sr\.?|lead|team lead|staff|principal|director|vp|head)\b/i.test(title)) {
        return false;
      }
    } else if (targetSeniority === 'entry') {
      // Entry / Junior (0-2 years exp): Reject senior and staff/exec roles
      if (jobSeniority.level === 'senior' || jobSeniority.level === 'staff_exec') {
        return false;
      }
    } else if (targetSeniority === 'senior') {
      // Senior (5+ years exp): Reject internships and fresher trainee roles
      if (jobSeniority.level === 'fresher' && jobSeniority.isInternship) {
        return false;
      }
    } else if (targetSeniority === 'staff_exec') {
      // Staff / Exec: Reject entry, fresher, and mid roles
      if (jobSeniority.level === 'fresher' || jobSeniority.level === 'entry' || jobSeniority.level === 'mid') {
        return false;
      }
    }

    // 3. Job Types / Contract Enforcement
    const jobTypes = scope.job_types || {};
    if (jobTypes.internship === 'exclude' && jobSeniority.isInternship) {
      return false;
    }
    if (jobTypes.contract === 'exclude' && jobSeniority.isContract) {
      return false;
    }
    if (jobTypes.internship === 'include' && jobTypes.full_time === 'exclude') {
      if (!jobSeniority.isInternship && jobSeniority.level !== 'fresher') {
        return false;
      }
    }

    // 4. Extract locations
    const targetLocs = (scope.locations || [])
      .filter(l => l && (l.preference !== 'exclude' && l.preference !== 'never'))
      .map(l => (typeof l === 'string' ? l : l.label || l.name || '').toLowerCase().trim())
      .filter(Boolean);

    if (targetLocs.length === 0 && scope.target_location) {
      targetLocs.push(scope.target_location.toLowerCase().trim());
    }
    if (targetLocs.length === 0 && Array.isArray(scope.preferred_locations)) {
      targetLocs.push(...scope.preferred_locations.map(x => String(x).toLowerCase().trim()).filter(Boolean));
    }

    const excludedLocs = (scope.locations || [])
      .filter(l => l && (l.preference === 'exclude' || l.preference === 'never'))
      .map(l => (typeof l === 'string' ? l : l.label || l.name || '').toLowerCase().trim())
      .filter(Boolean);

    if (Array.isArray(scope.excluded_locations)) {
      excludedLocs.push(...scope.excluded_locations.map(x => String(x).toLowerCase().trim()).filter(Boolean));
    }

    const jobLoc = (job.location || '').toLowerCase();
    const workMode = scope.work_mode || 'any';
    const isRemote = jobLoc.includes('remote') || !!job.is_remote || !!job.remote || jobLoc.includes('anywhere') || jobLoc.includes('worldwide') || job.workplace_type === 'remote' || String(job.title || '').toLowerCase().includes('remote');

    // Check explicit location exclusions first
    for (const ex of excludedLocs) {
      if (matchLocationString(jobLoc, ex)) return false;
    }

    // 5. Work mode constraints
    if (workMode === 'remote_only' && !isRemote) {
      return false;
    }
    if (workMode === 'onsite_only' && isRemote) {
      return false;
    }

    // 6. Geographic location matching
    if (targetLocs.length > 0) {
      const fullJobGeoText = `${job.location || ''} ${job.title || ''} ${job.company || ''}`.toLowerCase();

      // Enforce strict foreign geo-anchor barrier across all jobs (remote, hybrid, onsite)
      const FOREIGN_GEO_ANCHORS = [
        { name: 'us', regex: /\b(us|usa|united states|america|americas|california|texas|new york|washington|florida|sf|bay area|seattle|austin|nyc|boston|chicago|los angeles|denver|san francisco|silicon valley|san jose|sunnyvale|mountain view|palo alto|cambridge|boulder|charlotte|raleigh|atlanta|miami|dallas|houston|philadelphia|phoenix|minneapolis|detroit|tampa|salt lake city|portland|pittsburgh|nashville|san diego|est|pst|cst|mst)\b/i },
        { name: 'uk', regex: /\b(uk|united kingdom|london|manchester|england|scotland|wales|gmt|bst)\b/i },
        { name: 'europe', regex: /\b(eu|europe|germany|deutschland|france|netherlands|ireland|berlin|munich|münchen|paris|amsterdam|dublin|zurich|stockholm|poland|spain|portugal|italy|austria|switzerland|sweden|norway|denmark|finland|belgium|romania|czech|greece|hungary|bavaria|hamburg|frankfurt|cologne|köln|stuttgart|düsseldorf|dusseldorf|leipzig|dresden|nuremberg|karlsruhe|madrid|barcelona|warsaw|prague|vienna|lisbon|milan|rome|oslo|copenhagen|helsinki|bucharest|budapest|athens|brussels|emea|cet|cest|western europe|central europe|eastern europe|m\/w\/d|d\/m\/w)\b/i },
        { name: 'canada', regex: /\b(canada|toronto|vancouver|montreal|ottawa|calgary|waterloo|edmonton|halifax|quebec)\b/i },
        { name: 'australia', regex: /\b(australia|sydney|melbourne|brisbane)\b/i },
        { name: 'singapore', regex: /\b(singapore|sg)\b/i },
        { name: 'japan', regex: /\b(japan|tokyo)\b/i },
        { name: 'uae', regex: /\b(dubai|uae|united arab emirates)\b/i },
        { name: 'latin_america', regex: /\b(brazil|argentina|colombia|chile|peru|mexico)\b/i },
        { name: 'middle_east_africa', regex: /\b(israel|egypt|south africa|nigeria|kenya)\b/i }
      ];

      for (const foreign of FOREIGN_GEO_ANCHORS) {
        if (foreign.regex.test(fullJobGeoText)) {
          const candidateTargetsForeign = targetLocs.some(tl => foreign.regex.test(tl) || matchLocationString(foreign.name, tl));
          if (!candidateTargetsForeign) {
            return false;
          }
        }
      }

      // Check if job directly matches any of candidate's target locations (e.g. Bengaluru, India Remote)
      const hasDirectTargetMatch = targetLocs.some(target => matchLocationString(jobLoc, target));
      if (hasDirectTargetMatch) {
        // Even if direct target matches, if job description specifies a contradictory foreign residency restriction, verify it!
        if (isRemote && job.description) {
          for (const rule of REMOTE_GEO_RESTRICTIONS) {
            if (rule.descriptionPatterns && rule.descriptionPatterns.some(p => p.test(job.description))) {
              const candidateInRegion = targetLocs.some(tl => {
                if (matchLocationString(rule.region, tl) || matchLocationString(jobLoc, tl)) return true;
                return isLocationInRegion(tl, rule.region);
              });
              if (!candidateInRegion) {
                return false;
              }
            }
          }
        }
        return true;
      }

      const nonRemoteTargetLocs = targetLocs.filter(t => !['remote', 'worldwide', 'global', 'anywhere'].includes(t));
      const hasExplicitRemoteTarget = targetLocs.some(t => ['remote', 'worldwide', 'global', 'anywhere'].includes(t));
      const candidateRegion = detectCandidateRegionFromScope(scope);
      const compSlug = (job.company || '').toLowerCase().replace(/[^a-z0-9]/g, '');

      if (!isRemote) {
        // Job is Onsite or Hybrid: It MUST match at least one candidate target location!
        if (nonRemoteTargetLocs.length > 0) {
          const hasLocationMatch = nonRemoteTargetLocs.some(target => matchLocationString(jobLoc, target));
          if (!hasLocationMatch) return false;
        } else {
          // Candidate targeted only remote keywords but job is onsite
          return false;
        }
      } else {
        // Job is Remote:
        // 1. Check if remote role has geo-fenced regional restrictions across location, title, and description
        for (const rule of REMOTE_GEO_RESTRICTIONS) {
          const matchesLocOrTitle = rule.patterns.some(p => p.test(fullJobGeoText));
          const matchesDesc = (rule.descriptionPatterns && job.description)
            ? rule.descriptionPatterns.some(p => p.test(job.description))
            : false;

          if (matchesLocOrTitle || matchesDesc) {
            // Check if candidate qualifies for this region
            const candidateInRegion = targetLocs.some(tl => {
              if (matchLocationString(rule.region, tl) || matchLocationString(jobLoc, tl)) return true;
              return isLocationInRegion(tl, rule.region);
            });
            if (!candidateInRegion) {
              return false;
            }
          }
        }

        // 2. Work mode constraints
        if (workMode === 'onsite_only') return false;

        // 3. Regional scope boundary enforcement for Remote roles:
        if (candidateRegion === 'india_gccs') {
          const indiaCities = COUNTRY_CITY_MAP['india']?.cities || [];
          const hasIndiaTie = indiaCities.some(c => matchLocationString(jobLoc, c) || matchLocationString(fullJobGeoText, c)) ||
            INDIA_GCCS_COMPANIES.has(compSlug) ||
            /\b(india|bengaluru|bangalore|hyderabad|pune|delhi|mumbai|gurgaon|gurugram|noida|chennai|kolkata|ahmedabad|kochi|apac|asia)\b/i.test(fullJobGeoText);

          if (hasIndiaTie) {
            return true;
          }

          const isAuthenticWorldwide = /\b(worldwide|anywhere|global remote|work from anywhere|all countries)\b/i.test(fullJobGeoText) ||
            (job.description && /\b(worldwide|anywhere|hire anywhere|work from anywhere in the world)\b/i.test(job.description));

          // Strictly reject foreign regional/curated companies hiring locally (e.g. Personio in Germany, Taxfix, Wolt, Klarna, Deepnote, Brex, Ramp)
          if (compSlug && isKnownForeignCompany(compSlug) && !isAuthenticWorldwide) {
            return false;
          }

          if (isAuthenticWorldwide && (hasExplicitRemoteTarget || workMode === 'remote_only' || workMode === 'any')) {
            return true;
          }
        }

        return true;
      }
    }

    return true;
  }

  /**
   * Normalizes a raw job into the standard SPrav Job format.
   * Enforces forensic first-published date precedence over editing timestamps
   * and calculates dynamic freshness-decay priority scores.
   */
  normalizeJob(raw) {
    const cleanDesc = cleanJobDescription(raw.description || '');
    
    // Forensic date prioritization: First-published always trumps edit bumps
    const firstPublished = raw.first_published_at || raw.first_published || raw.firstPublishedAt ||
      raw.published_at || raw.publishedAt || raw.published_on || raw.releasedDate ||
      raw.createdAt || raw.created_at;
    
    const postedAt = firstPublished || raw.posted_at || raw.pubDate || raw.publication_date || raw.date || raw.scraped_at || new Date().toISOString();
    const updatedAt = raw.updated_at || raw.updatedAt || postedAt;
    
    const telemetry = calculateFreshnessTelemetry({
      posted_at: postedAt,
      updated_at: updatedAt,
      first_published_at: firstPublished || postedAt
    });

    const baseScore = raw.ats_match_score != null ? raw.ats_match_score : 75;
    const decayInfo = calculateFreshnessDecayScore(baseScore, telemetry);

    const descAndTitle = `${raw.title || ''} ${cleanDesc} ${Array.isArray(raw.tags) ? raw.tags.join(' ') : ''}`.toLowerCase();
    const isVisaSponsored = !!raw.visa_sponsorship || /visa\s*sponsor|visa\s*support|relocation\s*support|relocation\s*package|h-?1b/i.test(descAndTitle);

    return {
      id: raw.id || `ats_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      title: raw.title || 'Untitled Role',
      company: raw.company || 'Company',
      location: raw.location || 'Remote',
      url: raw.url || '',
      source: raw.source || 'ATS Direct',
      portal: raw.portal || raw.source || 'ATS',
      description: cleanDesc,
      status: raw.status || 'new',
      ats_match_score: baseScore,
      priority_score: decayInfo.decayScore,
      freshness_multiplier: decayInfo.multiplier,
      relative_posted_time: formatRelativeListingTime(postedAt),
      matched_skills: Array.isArray(raw.matched_skills) ? raw.matched_skills.join(', ') : (raw.matched_skills || ''),
      missing_skills: Array.isArray(raw.missing_skills) ? raw.missing_skills.join(', ') : (raw.missing_skills || ''),
      is_remote: !!raw.is_remote,
      visa_sponsorship: isVisaSponsored,
      salary: raw.salary || raw.compensation || null,
      founder_email: raw.founder_email || null,
      founder_username: raw.founder_username || null,
      posted_at: postedAt,
      updated_at: updatedAt,
      first_published_at: firstPublished || null,
      freshness: telemetry,
      red_flags: detectJdRedFlags(cleanDesc, { freshness: telemetry, posted_at: postedAt, salary: raw.salary || raw.compensation, salary_min: raw.salary_min, salary_max: raw.salary_max }),
      scraped_at: raw.scraped_at || new Date().toISOString()
    };
  }

  /**
   * Fetches public Greenhouse board jobs.
   */
  async scanGreenhouseCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug || this._inactiveSlugs?.has(`gh_${slug}`)) return [];
      const endpoint = `https://boards-api.greenhouse.io/v1/boards/${slug}/jobs?content=true`;
      let data = null;

      try {
        const res = await fetchWithTimeout(endpoint, { signal }, 4500);
        if (res.ok) {
          data = await res.json();
        } else if (res.status === 404) {
          this._inactiveSlugs?.add(`gh_${slug}`);
          return [];
        }
      } catch {
        // Fallback to companion extension CORS-free proxy if active
        if (typeof isExtensionInstalled === 'function' && isExtensionInstalled()) {
          const extRes = await fetchAtsViaExtension(endpoint, 4500);
          if (extRes.ok && extRes.data) {
            data = extRes.data;
          }
        }
      }

      if (!data) return [];
      return (data.jobs || []).map(j => ({
        id: `gh_${slug}_${j.id}`,
        title: j.title || '',
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location?.name || 'Remote',
        url: j.absolute_url || '',
        source: 'Greenhouse',
        portal: 'Greenhouse',
        provenance_tier: 'live_direct_ats',
        provenance_label: 'Live Direct ATS (0s Freshness)',
        freshness_guarantee: 'Live 0s Direct First-Party Scan',
        description: j.content || j.title || '',
        is_remote: (j.location?.name || '').toLowerCase().includes('remote'),
        posted_at: j.first_published || j.updated_at || new Date().toISOString(),
        updated_at: j.updated_at || new Date().toISOString(),
        first_published_at: j.first_published || null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches public Ashby posting board jobs.
   */
  async scanAshbyCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug || this._inactiveSlugs?.has(`ashby_${slug}`)) return [];
      const endpoint = `https://api.ashbyhq.com/posting-api/job-board/${slug}`;
      let data = null;

      try {
        const res = await fetchWithTimeout(endpoint, { signal }, 4500);
        if (res.ok) {
          data = await res.json();
        } else if (res.status === 404) {
          this._inactiveSlugs?.add(`ashby_${slug}`);
          return [];
        }
      } catch {
        // Fallback to companion extension CORS-free proxy if active
        if (typeof isExtensionInstalled === 'function' && isExtensionInstalled()) {
          const extRes = await fetchAtsViaExtension(endpoint, 4500);
          if (extRes.ok && extRes.data) {
            data = extRes.data;
          }
        }
      }

      if (!data) return [];
      return (data.jobs || []).map(j => ({
        id: `ashby_${slug}_${j.id}`,
        title: j.title || '',
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.location || 'Remote',
        url: j.jobUrl || `https://jobs.ashbyhq.com/${slug}/${j.id}`,
        source: 'Ashby',
        portal: 'Ashby',
        provenance_tier: 'live_direct_ats',
        provenance_label: 'Live Direct ATS (0s Freshness)',
        freshness_guarantee: 'Live 0s Direct First-Party Scan',
        description: j.descriptionPlain || j.title || '',
        is_remote: !!j.isRemote || (j.location || '').toLowerCase().includes('remote'),
        posted_at: j.publishedAt || j.firstPublishedAt || j.updatedAt || new Date().toISOString(),
        updated_at: j.updatedAt || j.publishedAt || new Date().toISOString(),
        first_published_at: j.firstPublishedAt || j.publishedAt || null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches public Lever board jobs.
   */
  async scanLeverCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug) return [];
      if (this._inactiveLeverSlugs && this._inactiveLeverSlugs.has(slug)) return [];
      if (this._inactiveSlugs && this._inactiveSlugs.has(`lever_${slug}`)) return [];

      const endpoint = `https://api.lever.co/v0/postings/${slug}?mode=json`;
      let data = null;

      try {
        const res = await fetchWithTimeout(endpoint, { signal }, 4500);
        if (res.ok) {
          data = await res.json();
        } else if (res.status === 404) {
          if (!this._inactiveLeverSlugs) this._inactiveLeverSlugs = new Set();
          this._inactiveLeverSlugs.add(slug);
          if (this._inactiveSlugs) this._inactiveSlugs.add(`lever_${slug}`);
          return [];
        }
      } catch {
        // Fallback to companion extension CORS-free proxy if active
        if (typeof isExtensionInstalled === 'function' && isExtensionInstalled()) {
          const extRes = await fetchAtsViaExtension(endpoint, 4500);
          if (extRes.ok && extRes.data) {
            data = extRes.data;
          }
        }
      }

      if (!data || !Array.isArray(data)) return [];
      return data.map(j => ({
        id: `lever_${slug}_${j.id}`,
        title: j.text || '',
        company: slug.charAt(0).toUpperCase() + slug.slice(1),
        location: j.categories?.location || (j.workplaceType === 'remote' ? 'Remote' : 'Onsite'),
        url: j.hostedUrl || j.applyUrl || '',
        source: 'Lever',
        portal: 'Lever',
        provenance_tier: 'live_direct_ats',
        provenance_label: 'Live Direct ATS (0s Freshness)',
        freshness_guarantee: 'Live 0s Direct First-Party Scan',
        description: j.descriptionPlain || j.description || j.text || '',
        is_remote: j.workplaceType === 'remote' || (j.categories?.location || '').toLowerCase().includes('remote'),
        posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
        updated_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString(),
        first_published_at: j.createdAt ? new Date(j.createdAt).toISOString() : null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches curated remote tech jobs from Remotive open API.
   * 100% CORS-friendly (Access-Control-Allow-Origin: *).
   */
  async scanRemotive(signal, scope = null) {
    try {
      let category = 'software-dev';
      if (scope?.roles?.length > 0) {
        const rawRole = typeof scope.roles[0] === 'string' ? scope.roles[0] : scope.roles[0].keyword;
        const lower = (rawRole || '').toLowerCase();
        if (lower.includes('devops') || lower.includes('cloud') || lower.includes('sysadmin')) category = 'devops';
        else if (lower.includes('data') || lower.includes('ai') || lower.includes('ml')) category = 'data';
        else if (lower.includes('design') || lower.includes('product designer')) category = 'design';
        else if (lower.includes('qa') || lower.includes('test')) category = 'qa';
      }

      const res = await fetch(`https://remotive.com/api/remote-jobs?category=${category}&limit=50`, { 
        headers: { 'Accept': 'application/json' },
        signal 
      });
      if (!res.ok) return [];
      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      return jobs.map(j => {
        const postedDate = j.publication_date ? new Date(j.publication_date).toISOString() : new Date().toISOString();
        return {
          id: `remotive_${j.id}`,
          title: j.title || '',
          company: j.company_name || 'Remote Tech',
          location: j.candidate_required_location || 'Remote',
          url: j.url || '',
          source: 'Remotive',
          portal: 'Remotive',
          description: j.description || j.title || '',
          salary: j.salary || null,
          is_remote: true,
          posted_at: postedDate,
          updated_at: postedDate,
          first_published_at: postedDate
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches live engineering jobs from Jobicy open API.
   * 100% CORS-friendly (Access-Control-Allow-Origin: *).
   */
  async scanJobicy(signal, scope = null) {
    try {
      let industry = 'engineering';
      if (scope?.roles?.length > 0) {
        const rawRole = typeof scope.roles[0] === 'string' ? scope.roles[0] : scope.roles[0].keyword;
        const lower = (rawRole || '').toLowerCase();
        if (lower.includes('design') || lower.includes('ui') || lower.includes('ux')) industry = 'design';
        else if (lower.includes('product') || lower.includes('management')) industry = 'supporting';
      }

      const res = await fetch(`https://jobicy.com/api/v2/remote-jobs?count=50&industry=${industry}`, { 
        headers: { 'Accept': 'application/json' },
        signal 
      });
      if (!res.ok) return [];
      const data = await res.json();
      const jobs = Array.isArray(data.jobs) ? data.jobs : [];
      return jobs.map(j => {
        let salaryStr = null;
        if (j.annualSalaryMin && j.annualSalaryMax) {
          const curr = j.salaryCurrency || 'USD';
          salaryStr = `${curr} ${Number(j.annualSalaryMin).toLocaleString('en-US')} - ${Number(j.annualSalaryMax).toLocaleString('en-US')}`;
        }

        const postedDate = j.pubDate ? new Date(j.pubDate).toISOString() : new Date().toISOString();

        return {
          id: `jobicy_${j.id}`,
          title: j.jobTitle || '',
          company: j.companyName || 'Remote Tech',
          location: j.jobGeo || 'Remote',
          url: j.url || '',
          source: 'Jobicy',
          portal: 'Jobicy',
          description: j.jobDescription || j.jobTitle || '',
          is_remote: true,
          salary: salaryStr,
          posted_at: postedDate,
          updated_at: postedDate,
          first_published_at: postedDate
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches remote & European tech jobs from Arbeitnow open API.
   * 100% CORS-friendly (Access-Control-Allow-Origin: *). Includes explicit visa sponsorship flags.
   * Fetches pages 1 & 2 directly via https://www.arbeitnow.com to avoid 301 redirect latency.
   */
  async scanArbeitnow(signal, maxPages = 2) {
    const jobs = [];
    for (let page = 1; page <= maxPages; page++) {
      if (signal?.aborted) break;
      try {
        const url = page === 1 
          ? 'https://www.arbeitnow.com/api/job-board-api' 
          : `https://www.arbeitnow.com/api/job-board-api?page=${page}`;
        const res = await fetch(url, { 
          headers: { 'Accept': 'application/json' },
          signal 
        });
        if (!res.ok) break;
        const data = await res.json();
        const list = Array.isArray(data?.data) ? data.data : [];
        if (list.length === 0) break;

        for (const j of list) {
          jobs.push({
            id: `arbeitnow_${j.slug || Math.random().toString(36).substring(2, 8)}`,
            title: j.title || '',
            company: j.company_name || 'Tech Employer',
            location: j.location || (j.remote ? 'Remote' : 'Onsite'),
            url: j.url || '',
            source: 'Arbeitnow',
            portal: 'Arbeitnow',
            description: j.description || j.title || '',
            is_remote: !!j.remote || (j.location || '').toLowerCase().includes('remote'),
            visa_sponsorship: !!j.visa_sponsorship,
            posted_at: j.created_at ? (typeof j.created_at === 'number' ? new Date(j.created_at * 1000).toISOString() : new Date(j.created_at).toISOString()) : new Date().toISOString(),
            updated_at: new Date().toISOString(),
            first_published_at: j.created_at ? (typeof j.created_at === 'number' ? new Date(j.created_at * 1000).toISOString() : new Date(j.created_at).toISOString()) : null
          });
        }
      } catch {
        break;
      }
    }
    return jobs;
  }

  /**
   * Fetches fresh direct engineering & tech job requisitions from open-jobs-data (1,700+ daily roles).
   * Aggregates direct Greenhouse, Ashby, and Lever career drops.
   * @param {AbortSignal} [signal]
   * @returns {Promise<Array<Object>>}
   */
  async scanOpenJobsData(signal) {
    try {
      const res = await fetch('https://raw.githubusercontent.com/ConorsCode/open-jobs-data/main/data/new-jobs.json', {
        headers: { 'Accept': 'application/json' },
        signal
      });
      if (!res.ok) return [];
      const list = await res.json();
      if (!Array.isArray(list)) return [];

      const jobs = [];
      for (const item of list) {
        if (!item.title || !item.company) continue;
        const locStr = Array.isArray(item.locations) && item.locations.length > 0 
          ? item.locations.join(', ') 
          : (typeof item.locations === 'string' ? item.locations : 'Remote / Multiple Locations');
        const isRemote = item.isRemote === true || 
          locStr.toLowerCase().includes('remote') || 
          (item.title && item.title.toLowerCase().includes('remote'));

        jobs.push({
          id: `openjobs_${item.platform || 'direct'}_${item.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${item.jobId || Math.random().toString(36).substring(2, 8)}`,
          title: item.title.trim(),
          company: item.company.trim(),
          location: locStr,
          url: item.applyUrl || `https://boards.greenhouse.io/${item.company.toLowerCase()}`,
          source: `Direct ${item.platform ? item.platform.toUpperCase() : 'ATS'}`,
          portal: item.platform ? item.platform.toLowerCase() : 'direct',
          description: item.title,
          is_remote: isRemote,
          posted_at: item.postedAt || item.scrapedAt || new Date().toISOString(),
          updated_at: item.scrapedAt || new Date().toISOString(),
          first_published_at: item.firstSeenAt || item.postedAt || null
        });
      }
      return jobs;
    } catch {
      return [];
    }
  }

  /**
   * Fetches curated remote tech jobs from We Work Remotely public RSS feed.
   * Confirmed 100% CORS-open (Access-Control-Allow-Origin: *).
   * Parses XML using DOMParser (with resilient regex fallback for worker/test environments).
   */
  async scanWeWorkRemotely(signal, _scope = null) {
    try {
      const res = await fetch('https://weworkremotely.com/remote-jobs.rss', {
        headers: { 'Accept': 'application/rss+xml, application/xml, text/xml' },
        signal
      });
      if (!res.ok) return [];
      const xmlText = await res.text();
      if (!xmlText) return [];

      const rawItems = [];
      if (typeof DOMParser !== 'undefined') {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmlText, 'text/xml');
          const itemNodes = doc.querySelectorAll('item');
          itemNodes.forEach(node => {
            const title = node.querySelector('title')?.textContent || '';
            const link = node.querySelector('link')?.textContent || node.querySelector('guid')?.textContent || '';
            const pubDate = node.querySelector('pubDate')?.textContent || '';
            const description = node.querySelector('description')?.textContent || '';
            const region = node.querySelector('region')?.textContent || '';
            const category = node.querySelector('category')?.textContent || '';
            rawItems.push({ title, link, pubDate, description, region, category });
          });
        } catch {
          // Fall back to regex parser below
        }
      }

      if (rawItems.length === 0) {
        // Resilient regex parser fallback for Node/Worker contexts
        const itemMatches = xmlText.split(/<item[\s>]/i).slice(1);
        for (const itemBlock of itemMatches) {
          const title = (itemBlock.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is)?.[1] || '').trim();
          const link = (itemBlock.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/is)?.[1] || itemBlock.match(/<guid[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/guid>/is)?.[1] || '').trim();
          const pubDate = (itemBlock.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/is)?.[1] || '').trim();
          const description = (itemBlock.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is)?.[1] || '').trim();
          const region = (itemBlock.match(/<region>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/region>/is)?.[1] || '').trim();
          const category = (itemBlock.match(/<category>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/category>/is)?.[1] || '').trim();
          if (title && link) {
            rawItems.push({ title, link, pubDate, description, region, category });
          }
        }
      }

      return rawItems.map(item => {
        let company = 'We Work Remotely Partner';
        let cleanTitle = item.title;

        // WWR titles are typically formatted "Company Name: Job Title"
        if (item.title.includes(': ')) {
          const parts = item.title.split(': ');
          company = parts[0].trim();
          cleanTitle = parts.slice(1).join(': ').trim();
        }

        const idSuffix = item.link.split('/').filter(Boolean).pop() || Math.random().toString(36).substring(2, 8);
        let postedAt;
        try {
          postedAt = item.pubDate ? new Date(item.pubDate).toISOString() : new Date().toISOString();
        } catch {
          postedAt = new Date().toISOString();
        }

        return {
          id: `wwr_${idSuffix}`,
          title: cleanTitle || item.title,
          company,
          location: item.region ? `Remote (${item.region})` : 'Remote (Worldwide)',
          url: item.link,
          source: 'We Work Remotely',
          portal: 'WeWorkRemotely',
          description: item.description || cleanTitle,
          is_remote: true,
          tags: item.category ? [item.category] : ['Remote Tech'],
          posted_at: postedAt,
          updated_at: new Date().toISOString(),
          first_published_at: postedAt
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches developer hiring posts from Dev.to community API (#hiring tag).
   * Confirmed 100% CORS-friendly (Access-Control-Allow-Origin: *).
   * Delivers direct postings from founders, engineering teams, and early-stage startups.
   */
  async scanDevToHiring(signal, options = {}) {
    try {
      const res = await fetch('https://dev.to/api/articles?tag=hiring&per_page=30', {
        headers: { 'Accept': 'application/json' },
        signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];

      const now = Date.now();
      const maxAgeMs = (options.maxAgeDays || 60) * 24 * 60 * 60 * 1000;

      return data
        .filter(item => {
          if (!item || !item.id || !item.title) return false;

          // 1. Anti-Ghost Filter: Discard postings older than 60 days (kills 2017/2018 archival posts)
          if (item.published_at) {
            const ageMs = now - new Date(item.published_at).getTime();
            if (ageMs > maxAgeMs) return false;
          }

          // 2. Anti-Spam & Anti-Tutorial Filter: Reject blog tutorials, listicles, and career advice essays
          const title = String(item.title || '');
          const isTutorialOrMeta = /(?:tutorial|how to|guide to|tips for|cheatsheet|course|roadmap|my experience|learning|scraping|extract(?:ing)?|why I|why we don't|free resources|round-?up|here's what|top \d+|best \d+|ways to|reasons why|broken in|discussion|ask dev|weekly digest|salary guide|negotiat(?:e|ing)|cover letter|trends, tips|trends and tips|part \d+)/i.test(title);
          if (isTutorialOrMeta) return false;

          // 3. Genuine Hiring Intent: Must indicate an authentic opening or legitimate role
          const textCorpus = `${title} ${item.description || ''} ${(item.tag_list || []).join(' ')}`.toLowerCase();
          const hasHiringIntent = /\b(is hiring|we'?re hiring|looking for|urgently needed|join our team|we are looking for|open position|job opening|hiring a|hiring an|hiring for)\b/i.test(title) ||
            /\b(software engineer|developer|designer|sre|devops|architect|data scientist|frontend|front-end|backend|back-end|fullstack|full-stack|engineering manager|tech lead|cloud engineer|security engineer|engineer)\b/i.test(title);
          
          if (!hasHiringIntent) return false;

          // 4. Anti-Volunteer / Unpaid Filter
          if (/\b(volunteer|unpaid|no compensation)\b/i.test(textCorpus)) return false;

          return true;
        })
        .map(item => {
          const companyName = item.organization?.name ||
            item.organization?.username ||
            item.user?.name ||
            'Dev.to Community Partner';

          const tags = Array.isArray(item.tag_list) ? item.tag_list : [];
          const textCorpus = `${item.title} ${item.description || ''}`.toLowerCase();
          const isRemote = textCorpus.includes('remote') || tags.includes('remote');

          const postedDate = item.published_at ? new Date(item.published_at).toISOString() : new Date().toISOString();

          return {
            id: `devto_${item.id}`,
            title: item.title.trim(),
            company: companyName.trim(),
            location: isRemote ? 'Remote (Worldwide)' : 'Global Tech Community',
            url: item.url || `https://dev.to/i/${item.id}`,
            source: 'Dev.to',
            portal: 'Dev.to Community',
            description: item.description || item.title,
            is_remote: isRemote,
            tags: tags.length > 0 ? tags : ['Engineering', 'Community'],
            posted_at: postedDate,
            updated_at: postedDate,
            first_published_at: postedDate
          };
        });
    } catch {
      return [];
    }
  }

  /**
   * Scans companies curated in the "Hiring Without Whiteboards" (HWOW) registry.
   * Cross-references rotating batches of companies against Greenhouse, Ashby, and Lever APIs.
   * Tags matching jobs with no_whiteboard: true and practical interview format details.
   */
  async scanHiringWithoutWhiteboards(signal) {
    try {
      const companies = await fetchHwowCompanies({ signal });
      if (!Array.isArray(companies) || companies.length === 0) return [];

      const HWOW_CURSOR_KEY = 'sprav_hwow_cursor';
      let cursor = 0;
      try {
        const stored = await storageVault.getItem(HWOW_CURSOR_KEY);
        if (typeof stored === 'number') cursor = stored;
      } catch {
        // Ignore cursor read error
      }

      // Prioritize companies with identified ATS platforms or direct slugs
      const candidatePool = companies.filter(c => c.platform && c.platform !== 'auto');
      const pool = candidatePool.length > 0 ? candidatePool : companies;
      const batchSize = 6;
      const startIdx = cursor % pool.length;
      const selected = [];
      for (let i = 0; i < batchSize; i++) {
        selected.push(pool[(startIdx + i) % pool.length]);
      }

      // Save updated cursor for next rotation
      try {
        await storageVault.setItem(HWOW_CURSOR_KEY, (startIdx + batchSize) % pool.length);
      } catch {
        // Ignore cursor save error
      }

      const hwowJobs = [];
      for (const comp of selected) {
        if (signal?.aborted) break;
        this.status.currentCompany = `HWOW: ${comp.name} (No Whiteboard)`;
        this._notify();

        let rawJobs = [];
        if (comp.platform === 'greenhouse' || comp.platform === 'auto') {
          rawJobs = await this.scanGreenhouseCompany(comp.slug, signal);
        }
        if (rawJobs.length === 0 && (comp.platform === 'ashby' || comp.platform === 'auto')) {
          rawJobs = await this.scanAshbyCompany(comp.slug, signal);
        }
        if (rawJobs.length === 0 && (comp.platform === 'lever' || comp.platform === 'auto')) {
          rawJobs = await this.scanLeverCompany(comp.slug, signal);
        }
        if (rawJobs.length === 0 && comp.platform === 'workable') {
          rawJobs = await this.scanWorkableCompany(comp.slug, signal);
        }

        for (const job of rawJobs) {
          hwowJobs.push({
            ...job,
            no_whiteboard: true,
            interview_format: comp.interview_notes || 'Practical engineering pairing / real-world problem solving.',
            tags: Array.isArray(job.tags) ? [...new Set([...job.tags, 'No Whiteboard'])] : ['No Whiteboard']
          });
        }
        await new Promise(r => setTimeout(r, 120));
      }

      return hwowJobs;
    } catch {
      return [];
    }
  }

  /**
   * Defensive scanner for FreeJobsBoard (formerly Authentic Jobs).
   * Handles DNS/network unreachability gracefully without disrupting the scan pipeline.
   */
  async scanFreeJobsBoard(signal) {
    try {
      const res = await fetch('https://freejobsboard.com/api/jobs?format=json', {
        headers: { 'Accept': 'application/json' },
        signal: signal || AbortSignal.timeout?.(3000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data?.jobs) ? data.jobs : (Array.isArray(data) ? data : []);
      return list.map(j => ({
        id: `fjb_${j.id || Math.random().toString(36).substring(2, 8)}`,
        title: j.title || '',
        company: j.company || 'Tech Employer',
        location: j.location || 'Remote',
        url: j.url || '',
        source: 'FreeJobsBoard',
        portal: 'FreeJobsBoard',
        description: j.description || j.title || '',
        is_remote: !!j.is_remote || (j.location || '').toLowerCase().includes('remote'),
        posted_at: j.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        first_published_at: j.created_at || null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Defensive scanner for Jobsearch.dev open API.
   * Handles 404/network errors gracefully without disrupting the scan pipeline.
   */
  async scanJobsearchDev(signal) {
    try {
      const res = await fetch('https://jobsearch.dev/api/jobs', {
        headers: { 'Accept': 'application/json' },
        signal: signal || AbortSignal.timeout?.(3000)
      });
      if (!res.ok) return [];
      const data = await res.json();
      const list = Array.isArray(data?.jobs) ? data.jobs : (Array.isArray(data?.data) ? data.data : []);
      return list.map(j => ({
        id: `jsdev_${j.id || Math.random().toString(36).substring(2, 8)}`,
        title: j.title || '',
        company: j.company || 'Developer Org',
        location: j.location || 'Remote',
        url: j.url || '',
        source: 'Jobsearch.dev',
        portal: 'Jobsearch.dev',
        description: j.description || j.title || '',
        is_remote: !!j.is_remote || (j.location || '').toLowerCase().includes('remote'),
        posted_at: j.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        first_published_at: j.created_at || null
      }));
    } catch {
      return [];
    }
  }

  /**
   * Fetches public SmartRecruiters postings.
   * SmartRecruiters powers enterprise tech employers (Canva, Delivery Hero, Skechers, Collibra, Glovo, Criteo).
   */
  async scanSmartRecruitersCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      const res = await fetch(`https://api.smartrecruiters.com/v1/companies/${slug}/postings?limit=50`, { signal });
      if (!res.ok) return [];
      const data = await res.json();
      const content = Array.isArray(data.content) ? data.content : [];
      return content.map(j => {
        const city = j.location?.city || '';
        const country = j.location?.country || '';
        const locName = city ? `${city}, ${country}` : (j.location?.fullLocation || 'Remote');
        const isRemote = !!j.location?.remote || !!j.location?.hybrid || locName.toLowerCase().includes('remote');
        const companyName = j.company?.name || slug.charAt(0).toUpperCase() + slug.slice(1);
        const compIdentifier = j.company?.identifier || slug;
        const jobUrl = `https://jobs.smartrecruiters.com/${compIdentifier}/${j.id}`;
        const descParts = [
          j.name,
          j.function?.label ? `Function: ${j.function.label}` : '',
          j.typeOfEmployment?.label ? `Type: ${j.typeOfEmployment.label}` : '',
          j.experienceLevel?.label ? `Experience: ${j.experienceLevel.label}` : '',
          j.industry?.label ? `Industry: ${j.industry.label}` : ''
        ].filter(Boolean).join(' • ');

        return {
          id: `smart_${slug}_${j.id}`,
          title: j.name || 'Software Engineer',
          company: companyName,
          location: locName,
          url: jobUrl,
          source: 'SmartRecruiters',
          portal: 'SmartRecruiters',
          description: descParts || j.name || '',
          is_remote: isRemote,
          posted_at: j.releasedDate || new Date().toISOString(),
          updated_at: j.releasedDate || new Date().toISOString(),
          first_published_at: j.releasedDate || null
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches public Recruitee company offers.
   * Recruitee powers European and international tech startups (Bunq, TicketSwap, Transloadit, Blendle).
   */
  async scanRecruiteeCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      let offers = [];
      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      // 1. Primary: Public jobs API: https://api.recruitee.com/c/{company}/jobs
      try {
        const res = await fetch(`https://api.recruitee.com/c/${slug}/jobs`, { signal });
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data.jobs) && data.jobs.length > 0) {
            offers = data.jobs;
          }
        }
      } catch {}

      // 2. Subdomain offers API fallback: https://{company}.recruitee.com/api/offers/
      if (offers.length === 0) {
        const res = await fetch(`https://${slug}.recruitee.com/api/offers/`, { signal });
        if (res.ok) {
          const data = await res.json();
          offers = Array.isArray(data.offers) ? data.offers : (Array.isArray(data.jobs) ? data.jobs : []);
        }
      }

      if (!offers || offers.length === 0) return [];
      return offers.map(j => {
        const isRemote = !!j.remote || !!j.telecommuting || (j.location || '').toLowerCase().includes('remote');
        return {
          id: `recruitee_${slug}_${j.id || j.slug}`,
          title: j.title || 'Tech Role',
          company: companyName,
          location: j.location || (isRemote ? 'Remote' : 'Onsite'),
          url: j.careers_url || `https://${slug}.recruitee.com/o/${j.slug || j.id}`,
          source: 'Recruitee',
          portal: 'Recruitee',
          description: j.description || j.title || '',
          is_remote: isRemote,
          posted_at: j.created_at || j.published_at || new Date().toISOString(),
          updated_at: j.created_at || j.published_at || new Date().toISOString(),
          first_published_at: j.created_at || j.published_at || null
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches public Workable account widget postings.
   * Workable powers tens of thousands of scale-up tech employers with direct CORS-open widget feeds.
   */
  async scanWorkableCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      let jobs = [];
      let companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      // 1. Primary: Widget details endpoint
      try {
        const res = await fetch(`https://apply.workable.com/api/v1/widget/accounts/${slug}?details=true`, { signal });
        if (res.ok) {
          const data = await res.json();
          if (data.name) companyName = data.name;
          if (Array.isArray(data.jobs)) jobs = data.jobs;
        }
      } catch {}

      // 2. Fallback: Accounts v2 endpoint
      if (jobs.length === 0) {
        try {
          const res = await fetch(`https://apply.workable.com/api/v2/accounts/${slug}/jobs`, { signal });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data.results)) jobs = data.results;
            else if (Array.isArray(data.jobs)) jobs = data.jobs;
          }
        } catch {}
      }

      if (!jobs || jobs.length === 0) return [];
      return jobs.map(j => {
        const isRemote = !!j.telecommuting || (j.workplace || '').toLowerCase() === 'remote' || (j.city || '').toLowerCase().includes('remote');
        const locStr = [j.city, j.country].filter(Boolean).join(', ') || (isRemote ? 'Remote' : 'Onsite');
        const publishedAt = j.published_on ? new Date(j.published_on).toISOString() : new Date().toISOString();
        return {
          id: `workable_${slug}_${j.shortcode || j.id}`,
          title: j.title || 'Engineering Role',
          company: companyName,
          location: locStr,
          url: j.url || `https://apply.workable.com/${slug}/j/${j.shortcode || j.id}/`,
          source: 'Workable',
          portal: 'Workable',
          description: j.description || j.title || '',
          is_remote: isRemote,
          posted_at: publishedAt,
          updated_at: publishedAt,
          first_published_at: publishedAt
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches public Personio job board positions via the official XML feed.
   * Confirmed 100% CORS-friendly (Access-Control-Allow-Origin: *).
   * Powers hundreds of German and European scale-ups.
   */
  async scanPersonioCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug) return [];

      const res = await fetch(`https://${slug}.jobs.personio.de/xml`, {
        headers: { 'Accept': 'application/xml, text/xml, */*' },
        signal
      });
      if (!res.ok) return [];
      const xmlText = await res.text();
      if (!xmlText) return [];

      const positions = [];
      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      if (typeof DOMParser !== 'undefined') {
        try {
          const parser = new DOMParser();
          const doc = parser.parseFromString(xmlText, 'text/xml');
          const posNodes = doc.querySelectorAll('position');
          posNodes.forEach(pos => {
            const id = pos.querySelector('id')?.textContent || '';
            const name = pos.querySelector('name')?.textContent || '';
            const office = pos.querySelector('office')?.textContent || '';
            const department = pos.querySelector('department')?.textContent || '';
            const recruitingCategory = pos.querySelector('recruitingCategory')?.textContent || '';
            const employmentType = pos.querySelector('employmentType')?.textContent || '';
            const schedule = pos.querySelector('schedule')?.textContent || '';

            let desc = '';
            const descValues = pos.querySelectorAll('jobDescription > value');
            if (descValues.length > 0) {
              desc = Array.from(descValues).map(v => v.textContent).join('\n\n');
            }
            if (!desc) {
              desc = [name, department, recruitingCategory, employmentType, schedule].filter(Boolean).join(' • ');
            }

            if (id && name) {
              positions.push({
                id,
                name,
                office,
                department,
                recruitingCategory,
                employmentType,
                schedule,
                desc
              });
            }
          });
        } catch {
          // Fall back to regex parser below
        }
      }

      if (positions.length === 0) {
        // Resilient regex parser fallback for Node / Web Worker contexts
        const posBlocks = xmlText.split(/<position[\s>]/i).slice(1);
        for (const block of posBlocks) {
          const id = (block.match(/<id>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/id>/is)?.[1] || '').trim();
          const name = (block.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/is)?.[1] || '').trim();
          const office = (block.match(/<office>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/office>/is)?.[1] || '').trim();
          const department = (block.match(/<department>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/department>/is)?.[1] || '').trim();
          const desc = (block.match(/<value>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/value>/is)?.[1] || name).trim();
          if (id && name) {
            positions.push({ id, name, office, department, desc });
          }
        }
      }

      return positions.map(p => {
        const isRemote = (p.office || '').toLowerCase().includes('remote') ||
          (p.department || '').toLowerCase().includes('remote') ||
          (p.name || '').toLowerCase().includes('remote');
        const loc = p.office || (isRemote ? 'Remote (Europe)' : 'Europe');
        const jobUrl = `https://${slug}.jobs.personio.de/job/${p.id}`;

        return {
          id: `personio_${slug}_${p.id}`,
          title: p.name,
          company: companyName,
          location: loc,
          url: jobUrl,
          source: 'Personio',
          portal: 'Personio',
          description: p.desc || p.name,
          is_remote: isRemote,
          tags: p.department ? [p.department] : ['Engineering'],
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          first_published_at: null
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches public BambooHR job postings via official embed JSON API.
   * Confirmed 100% CORS-friendly (Access-Control-Allow-Origin: *).
   * Powers thousands of SME tech companies and high-growth scale-ups.
   */
  async scanBambooHrCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug) return [];

      const res = await fetch(`https://${slug}.bamboohr.com/jobs/embed2.php?version=1.0.0&format=json`, {
        headers: { 'Accept': 'application/json' },
        signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!data || !Array.isArray(data.departments)) return [];

      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);
      const jobs = [];

      for (const dept of data.departments) {
        const deptName = dept.label || '';
        const positions = Array.isArray(dept.positions) ? dept.positions : [];
        for (const pos of positions) {
          const isRemote = (pos.location || '').toLowerCase().includes('remote') ||
            (pos.name || '').toLowerCase().includes('remote');
          const loc = pos.location || (isRemote ? 'Remote' : 'Onsite');
          const jobUrl = pos.url || `https://${slug}.bamboohr.com/careers/${pos.id}`;

          jobs.push({
            id: `bamboohr_${slug}_${pos.id}`,
            title: pos.name || 'Engineering Role',
            company: companyName,
            location: loc,
            url: jobUrl,
            source: 'BambooHR',
            portal: 'BambooHR',
            description: `${pos.name}${deptName ? ` • Department: ${deptName}` : ''}${pos.location ? ` • Location: ${pos.location}` : ''}`,
            is_remote: isRemote,
            tags: deptName ? [deptName] : [],
            posted_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            first_published_at: null
          });
        }
      }

      return jobs;
    } catch {
      return [];
    }
  }

  /**
   * Fetches enterprise engineering jobs from Workday CXS public search endpoint.
   * Powers FAANG and Global 2000 employers (Nvidia, Adobe, Salesforce, Autodesk, Workday, Mastercard, Target).
   * 
   * Sandbox Boundary: In pure web browser tabs without extension/proxy, Workday restricts CORS.
   * Bypassed automatically when running with SPrav Companion Extension or local proxy;
   * gracefully catches and yields [] in unprivileged browser tabs.
   */
  async scanWorkdayCompany(tenantOrSlug, signal, searchText = 'engineer') {
    try {
      let tenantConfig;
      if (typeof tenantOrSlug === 'object' && tenantOrSlug !== null) {
        tenantConfig = tenantOrSlug;
      } else {
        const slug = String(tenantOrSlug || '').toLowerCase().trim();
        tenantConfig = VERIFIED_WORKDAY_TENANTS[slug] || {
          company: slug,
          subdomain: `${slug}.wd5`,
          site: 'External_Career_Site'
        };
      }

      const { company, subdomain, site } = tenantConfig;
      if (!company || !subdomain || !site) return [];

      const endpoint = `https://${subdomain}.myworkdayjobs.com/wday/cxs/${company}/${site}/jobs`;
      const postPayload = {
        appliedFacets: {},
        limit: 20,
        offset: 0,
        searchText: searchText || ''
      };

      let data = null;

      // 1. Companion Extension bridge (cross-origin elevated permissions)
      if (typeof isExtensionInstalled === 'function' && isExtensionInstalled()) {
        try {
          const extRes = await fetchAtsViaExtension(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: postPayload
          }, 5000);
          if (extRes && extRes.ok && extRes.data) {
            data = extRes.data;
          }
        } catch {}
      }

      // 2. Direct browser fetch (for CORS-unrestricted environments or local proxies)
      if (!data) {
        try {
          const res = await fetch(endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify(postPayload),
            signal
          });
          if (res.ok) {
            data = await res.json();
          }
        } catch {}
      }

      // 3. Fallback: query 3.5M Global Index for this Workday company's indexed snapshot listings
      if (!data) {
        try {
          const streamRes = await searchHighVolumeStream(company, {
            targetMatches: 20,
            maxChunksToScan: 2,
            signal
          });
          if (streamRes?.jobs && streamRes.jobs.length > 0) {
            return streamRes.jobs.map(j => ({
              ...j,
              source: 'Workday',
              portal: 'Workday (Global Index)',
              provenance_tier: 'global_index',
              provenance_label: 'Workday (Global Index Snapshot)',
              freshness_guarantee: 'Aggregated Daily Mirror Index Snapshot'
            }));
          }
        } catch {}
        return [];
      }

      const postings = Array.isArray(data?.jobPostings) ? data.jobPostings : [];
      const companyName = company.charAt(0).toUpperCase() + company.slice(1);
      const siteBase = `https://${subdomain}.myworkdayjobs.com/en-US/${site}`;

      return postings.map(p => {
        const reqId = Array.isArray(p.bulletFields) && p.bulletFields[0] ? p.bulletFields[0] : Math.random().toString(36).substring(2, 8);
        const isRemote = (p.locationsText || '').toLowerCase().includes('remote') || (p.title || '').toLowerCase().includes('remote');
        const jobUrl = p.externalPath ? `${siteBase}${p.externalPath}` : `${siteBase}/job/${reqId}`;

        return {
          id: `workday_${company}_${reqId}`,
          title: p.title || 'Engineering Role',
          company: companyName,
          location: p.locationsText || (isRemote ? 'Remote' : 'Enterprise HQ'),
          url: jobUrl,
          source: 'Workday',
          portal: 'Workday',
          provenance_tier: 'enterprise_workday',
          provenance_label: 'Workday Enterprise CXS',
          freshness_guarantee: 'Live Workday Enterprise CXS (Extension Assisted)',
          description: `${p.title} • Requisition ID: ${reqId}${p.postedOn ? ` • ${p.postedOn}` : ''}`,
          is_remote: isRemote,
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          first_published_at: null
        };
      });
    } catch {
      // Gracefully handles CORS violation in unprivileged browser contexts without halting scan
      return [];
    }
  }

  /**
   * Scans public job board of high-growth tech companies powered by Rippling ATS.
   * Extracts pre-rendered job catalog from the Next.js application state (__NEXT_DATA__).
   * Handles CORS boundary gracefully in unprivileged browser contexts.
   */
  async scanRipplingCompany(company, signal) {
    try {
      const slug = company.toLowerCase().trim().replace(/[^a-z0-9_-]/g, '');
      if (!slug) return [];

      const res = await fetch(`https://ats.rippling.com/${slug}/jobs`, { signal });
      if (!res.ok) return [];
      const html = await res.text();
      if (!html) return [];

      const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
      if (!nextDataMatch) return [];

      const data = JSON.parse(nextDataMatch[1]);
      const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
      const jobQuery = queries.find(q => Array.isArray(q.queryKey) && q.queryKey[2] === 'job-posts');
      const items = Array.isArray(jobQuery?.state?.data?.items) ? jobQuery.state.data.items : [];

      const companyName = slug.charAt(0).toUpperCase() + slug.slice(1);

      return items.map(j => {
        const locations = Array.isArray(j.locations) ? j.locations : [];
        const locName = locations.map(l => l.name).filter(Boolean).join('; ') || 'Remote';
        const isRemote = locations.some(l => l.workplaceType === 'REMOTE' || (l.name || '').toLowerCase().includes('remote')) ||
          (j.name || '').toLowerCase().includes('remote');
        const deptName = j.department?.name || '';
        const jobUrl = j.url || `https://ats.rippling.com/${slug}/jobs/${j.id}`;

        return {
          id: `rippling_${slug}_${j.id}`,
          title: j.name || 'Engineering Role',
          company: companyName,
          location: locName,
          url: jobUrl,
          source: 'Rippling',
          portal: 'Rippling',
          description: `${j.name}${deptName ? ` • Department: ${deptName}` : ''}${locName ? ` • Location: ${locName}` : ''}`,
          is_remote: isRemote,
          tags: deptName ? [deptName] : [],
          posted_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          first_published_at: null
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches global remote engineering opportunities from RemoteOK open feed.
   * 100% CORS-friendly (Access-Control-Allow-Origin: *).
   */
  async scanRemoteOK(signal, scope = null) {
    try {
      let tagParam = '';
      if (scope?.experience_level === 'fresher' || (scope?.roles || []).some(r => /intern/i.test(typeof r === 'string' ? r : r.keyword || ''))) {
        tagParam = '?tag=intern';
      } else if (scope?.experience_level === 'entry' || (scope?.roles || []).some(r => /junior/i.test(typeof r === 'string' ? r : r.keyword || ''))) {
        tagParam = '?tag=junior';
      } else if (scope?.roles?.length > 0) {
        const rawRole = typeof scope.roles[0] === 'string' ? scope.roles[0] : scope.roles[0].keyword;
        const lower = (rawRole || '').toLowerCase();
        if (lower.includes('devops') || lower.includes('sre')) tagParam = '?tag=devops';
        else if (lower.includes('frontend') || lower.includes('react')) tagParam = '?tag=frontend';
        else if (lower.includes('backend') || lower.includes('python')) tagParam = '?tag=backend';
        else if (lower.includes('data') || lower.includes('ml')) tagParam = '?tag=data';
        else tagParam = '?tag=engineer';
      }

      const res = await fetch(`https://remoteok.com/api${tagParam}`, { 
        headers: { 'Accept': 'application/json' },
        signal 
      });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      const listings = data.filter(item => item && item.id && item.position);
      return listings.slice(0, 50).map(j => {
        let salaryStr = null;
        if (j.salary_min && j.salary_max && j.salary_min > 0) {
          salaryStr = `$${Number(j.salary_min).toLocaleString('en-US')} - $${Number(j.salary_max).toLocaleString('en-US')}`;
        } else if (j.salary_min && j.salary_min > 0) {
          salaryStr = `From $${Number(j.salary_min).toLocaleString('en-US')}`;
        }

        const postedDate = j.date ? new Date(j.date).toISOString() : (j.epoch ? new Date(j.epoch * 1000).toISOString() : new Date().toISOString());

        return {
          id: `remoteok_${j.id}`,
          title: j.position || '',
          company: j.company || 'Remote Tech Company',
          location: j.location || 'Remote (Global)',
          url: j.url || (j.apply_url ? j.apply_url : `https://remoteok.com/remote-jobs/${j.id}`),
          source: 'RemoteOK',
          portal: 'RemoteOK',
          description: `${j.description || j.position}\n\nTags: ${(j.tags || []).join(', ')}`,
          is_remote: true,
          salary: salaryStr,
          tags: j.tags || [],
          posted_at: postedDate,
          updated_at: postedDate,
          first_published_at: postedDate
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Ingests the latest monthly official "Ask HN: Who is hiring?" thread via the high-speed Algolia Search API
   * with automatic fallback to the official Firebase endpoints.
   * Provides direct access to founders, VPs of Engineering, and CTOs with zero recruiter intermediaries.
   * 100% Free, 100% CORS-friendly (Access-Control-Allow-Origin: *).
   */
  async scanHackerNewsHiring(signal) {
    try {
      // 1. Attempt high-speed Algolia Search API first (1-2 network calls for ~100 posts)
      try {
        let storyId = null;
        // Option A: Specific whoishiring author search by date
        const storySearchUrl = 'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=%22Who%20is%20hiring%22';
        const storyRes = await fetch(storySearchUrl, { signal });
        if (storyRes.ok) {
          const storyData = await storyRes.json();
          const latestStory = (storyData.hits || []).find(h => 
            h && h.title && h.title.toLowerCase().includes('who is hiring')
          ) || storyData.hits?.[0];
          if (latestStory && latestStory.objectID) {
            storyId = latestStory.objectID;
          }
        }

        // Option B: Public Ask HN hiring tag query fallback (Algolia Ask HN feed)
        if (!storyId) {
          const askHnSearchUrl = 'https://hn.algolia.com/api/v1/search?query=hiring&tags=ask_hn';
          const askHnRes = await fetch(askHnSearchUrl, { signal });
          if (askHnRes.ok) {
            const askHnData = await askHnRes.json();
            const latestAskHn = (askHnData.hits || []).find(h =>
              h && h.title && h.title.toLowerCase().includes('who is hiring')
            ) || askHnData.hits?.[0];
            if (latestAskHn && latestAskHn.objectID) {
              storyId = latestAskHn.objectID;
            }
          }
        }

        if (storyId) {
          const commentsUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=100`;
          const commentsRes = await fetch(commentsUrl, { signal });
            if (commentsRes.ok) {
              const commentsData = await commentsRes.json();
              const hits = Array.isArray(commentsData.hits) ? commentsData.hits : [];
              if (hits.length > 0) {
                const jobs = [];
                for (const item of hits) {
                  if (signal?.aborted) break;
                  if (!item || !item.comment_text) continue;
                  if (item.parent_id && String(item.parent_id) !== String(storyId)) continue;

                  let clean = item.comment_text
                    .replace(/<p>/gi, '\n\n')
                    .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$2')
                    .replace(/<[^>]+>/g, ' ')
                    .replace(/&#x2F;/g, '/')
                    .replace(/&#x27;/g, "'")
                    .replace(/&amp;/g, '&')
                    .replace(/&quot;/g, '"')
                    .replace(/&lt;/g, '<')
                    .replace(/&gt;/g, '>')
                    .trim();

                  if (!clean || clean.length < 25) continue;

                  const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
                  if (lines.length === 0) continue;
                  const firstLine = lines[0] || '';
                  const parsedHeader = parseHnPostingHeader(firstLine, item.author, clean);
                  let company = sanitizeCompanyName(parsedHeader.company);
                  let title = parsedHeader.title;
                  let location = parsedHeader.location;
                  const isRemote = parsedHeader.isRemote || clean.toLowerCase().includes('remote');
                  const contactInfo = extractHnContactInfo(clean);
                  const founderEmail = contactInfo.email;
                  const founderName = contactInfo.name;
                  const urlMatch = clean.match(/https?:\/\/[^\s<>"')]+/);
                  const jobUrl = urlMatch ? urlMatch[0] : `https://news.ycombinator.com/item?id=${item.objectID || item.id}`;

                  const salaryMatch = clean.match(/(\$\s*\d+[\d,]*\s*(?:k|K)?(?:\s*[-–to]\s*\$?\s*\d+[\d,]*\s*(?:k|K)?)?(?:\s*(?:USD|EUR|GBP|per year|\/yr|\/year))?)/i);
                  const salaryStr = salaryMatch ? salaryMatch[1].trim() : null;

                  const postedIso = item.created_at || (item.created_at_i ? new Date(item.created_at_i * 1000).toISOString() : new Date().toISOString());

                  jobs.push({
                    id: `hn_${item.objectID || item.id}`,
                    title: title.slice(0, 100),
                    company: company.slice(0, 60),
                    location: location.slice(0, 80),
                    url: jobUrl,
                    source: 'Hacker News',
                    portal: 'Hacker News (Founder Direct)',
                    description: clean,
                    is_remote: isRemote,
                    salary: salaryStr,
                    founder_email: founderEmail,
                    founder_name: founderName,
                    founder_username: item.author || 'founder',
                    posted_at: postedIso,
                    updated_at: postedIso,
                    first_published_at: postedIso
                  });
                }
                if (jobs.length > 0) return jobs;
              }
            }
          }
      } catch {
        // Fall back to Firebase endpoints
      }

      // 2. Fallback to official Firebase endpoints (if Algolia is unreachable or mocked)
      const userRes = await fetch('https://hacker-news.firebaseio.com/v0/user/whoishiring.json', { signal });
      if (!userRes.ok) return [];
      const userData = await userRes.json();
      const submitted = Array.isArray(userData.submitted) ? userData.submitted : [];

      let fbStoryId = null;
      for (const subId of submitted.slice(0, 4)) {
        if (signal?.aborted) return [];
        try {
          const subRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${subId}.json`, { signal });
          if (!subRes.ok) continue;
          const sub = await subRes.json();
          if (sub && sub.title && sub.title.toLowerCase().includes('who is hiring')) {
            fbStoryId = subId;
            break;
          }
        } catch {}
      }

      if (!fbStoryId) return [];

      const fbStoryRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${fbStoryId}.json`, { signal });
      if (!fbStoryRes.ok) return [];
      const fbStory = await fbStoryRes.json();
      const kids = Array.isArray(fbStory.kids) ? fbStory.kids.slice(0, 35) : [];

      const fbJobs = [];
      for (const kidId of kids) {
        if (signal?.aborted) break;
        try {
          const itemRes = await fetch(`https://hacker-news.firebaseio.com/v0/item/${kidId}.json`, { signal });
          if (!itemRes.ok) continue;
          const item = await itemRes.json();
          if (!item || !item.text || item.deleted || item.dead) continue;

          let clean = item.text
            .replace(/<p>/gi, '\n\n')
            .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$2')
            .replace(/<[^>]+>/g, ' ')
            .replace(/&#x2F;/g, '/')
            .replace(/&#x27;/g, "'")
            .replace(/&amp;/g, '&')
            .replace(/&quot;/g, '"')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .trim();

          if (!clean || clean.length < 25) continue;

          const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
          if (lines.length === 0) continue;
          const firstLine = lines[0] || '';
          const parsedHeader = parseHnPostingHeader(firstLine, item.by, clean);
          let company = sanitizeCompanyName(parsedHeader.company);
          let title = parsedHeader.title;
          let location = parsedHeader.location;
          const isRemote = parsedHeader.isRemote || clean.toLowerCase().includes('remote');
          const contactInfo = extractHnContactInfo(clean);
          const founderEmail = contactInfo.email;
          const founderName = contactInfo.name;
          const urlMatch = clean.match(/https?:\/\/[^\s<>"')]+/);
          const jobUrl = urlMatch ? urlMatch[0] : `https://news.ycombinator.com/item?id=${kidId}`;
          const postedIso = item.time ? new Date(item.time * 1000).toISOString() : new Date().toISOString();

          fbJobs.push({
            id: `hn_${kidId}`,
            title: title.slice(0, 100),
            company: company.slice(0, 60),
            location: location.slice(0, 80),
            url: jobUrl,
            source: 'Hacker News',
            portal: 'Hacker News (Founder Direct)',
            description: clean,
            is_remote: isRemote,
            founder_email: founderEmail,
            founder_name: founderName,
            founder_username: item.by || 'founder',
            posted_at: postedIso,
            updated_at: postedIso,
            first_published_at: postedIso
          });
        } catch {}
      }

      return fbJobs;
    } catch {
      return [];
    }
  }

  /**
   * Fetches US Federal Government engineering roles from USAJOBS API (Free Developer Key / Email).
   * Covers defense, research labs, civil aerospace, cybersecurity, and federal agencies.
   */
  async scanUSAJobs(query = 'Software Engineer', signal) {
    try {
      const apiKey = (await storageVault.getItem('sprav_usajobs_key')) || '';
      const email = (await storageVault.getItem('sprav_usajobs_email')) || 'candidate@sprav-job-ai.local';
      if (!apiKey) return [];

      const headers = {
        'User-Agent': email,
        'Authorization-Key': apiKey
      };

      const q = encodeURIComponent(query || 'Software Engineer');
      const res = await fetch(`https://data.usajobs.gov/api/search?Keyword=${q}&RemoteIndicator=true&ResultsPerPage=25`, {
        headers,
        signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      const items = data.SearchResult?.SearchResultItems || [];

      return items.map(item => {
        const desc = item.MatchedObjectDescriptor || {};
        const isRemote = (desc.PositionLocationDisplay || '').toLowerCase().includes('remote') || !!desc.RemoteIndicator;
        const startSalary = desc.PositionRemuneration?.[0]?.MinimumRange;
        const endSalary = desc.PositionRemuneration?.[0]?.MaximumRange;
        const rate = desc.PositionRemuneration?.[0]?.RateIntervalCode || 'Per Year';
        const salaryStr = startSalary && endSalary ? `$${Math.round(startSalary).toLocaleString('en-US')} - $${Math.round(endSalary).toLocaleString('en-US')} ${rate}` : null;

        return {
          id: `usajobs_${desc.PositionID || Math.random().toString(36).substring(2, 8)}`,
          title: desc.PositionTitle || 'Federal Software Engineer',
          company: desc.DepartmentName || desc.OrganizationName || 'US Federal Government',
          location: desc.PositionLocationDisplay || 'Remote (USA Federal)',
          url: desc.PositionURI || desc.ApplyURI?.[0] || '',
          source: 'USAJOBS',
          portal: 'USAJOBS (Federal Direct)',
          description: `${desc.UserArea?.Details?.MajorDuties?.join('\n\n') || desc.QualificationSummary || desc.PositionTitle}\n\nSecurity Clearance: ${desc.UserArea?.Details?.ClearanceLevel || 'None Specified'}\nWho May Apply: ${desc.UserArea?.Details?.WhoMayApply?.Name || 'Open to the public'}`,
          is_remote: isRemote,
          salary: salaryStr,
          posted_at: desc.PublicationStartDate ? new Date(desc.PublicationStartDate).toISOString() : new Date().toISOString(),
          updated_at: desc.ApplicationCloseDate ? new Date(desc.ApplicationCloseDate).toISOString() : new Date().toISOString(),
          first_published_at: desc.PublicationStartDate ? new Date(desc.PublicationStartDate).toISOString() : null
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Fetches roles from Adzuna API (Free Developer App ID & Key).
   * Supports multi-region discovery across India, UK, Europe, Canada, Australia, and US.
   */
  async scanAdzuna(query = 'Software Engineer', signal, options = {}) {
    try {
      const appId = (await storageVault.getItem('sprav_adzuna_app_id')) || '';
      const appKey = (await storageVault.getItem('sprav_adzuna_app_key')) || '';
      if (!appId || !appKey) return [];

      let country = 'us';
      if (options?.country) {
        country = mapLocationToCountryCode(options.country);
      } else if (options?.location) {
        country = mapLocationToCountryCode(options.location);
      } else if (query && mapLocationToCountryCode(query) !== 'us') {
        country = mapLocationToCountryCode(query);
      } else {
        try {
          const scope = await storageVault.getScope();
          const targetLoc = (scope?.target_location || (Array.isArray(scope?.locations) ? scope.locations.filter(l => l && l.preference === 'apply').map(l => l.label || l.name || '').join(' ') : '') || (Array.isArray(scope?.preferred_locations) ? scope.preferred_locations.join(' ') : '') || '').toLowerCase();
          if (targetLoc) {
            country = mapLocationToCountryCode(targetLoc);
          }
        } catch {}
      }

      // Adzuna Quota Guard: Prevent auto-exhaustion of monthly 250 free requests
      const quota = await getAdzunaQuotaTelemetry();
      if (quota.used >= 245) {
        console.warn(`[Adzuna Scanner] Monthly quota protection triggered (${quota.used}/250 calls used in ${quota.monthYear}). Halting scan to preserve queries.`);
        return [];
      }

      const q = encodeURIComponent(query || 'Software Engineer');
      const res = await fetch(`https://api.adzuna.com/v1/api/jobs/${country}/search/1?app_id=${appId}&app_key=${appKey}&results_per_page=20&what=${q}&content-type=application/json`, {
        signal
      });
      if (!res.ok) return [];
      const data = await res.json();
      const items = data.results || [];

      // Increment quota usage after verified 200 response
      await incrementAdzunaQuotaTelemetry();

      const CURRENCY_SYMBOLS = {
        in: '₹',
        gb: '£',
        de: '€',
        fr: '€',
        nl: '€',
        at: '€',
        it: '€',
        es: '€',
        ca: 'CA$',
        au: 'A$',
        us: '$'
      };
      const curr = CURRENCY_SYMBOLS[country] || '$';

      const COUNTRY_LABELS = {
        in: 'India',
        gb: 'United Kingdom',
        de: 'Germany',
        ca: 'Canada',
        us: 'United States',
        au: 'Australia',
        fr: 'France',
        nl: 'Netherlands',
        pl: 'Poland',
        at: 'Austria',
        ch: 'Switzerland',
        sg: 'Singapore'
      };

      return items.map(item => ({
        id: `adzuna_${item.id || Math.random().toString(36).substring(2, 8)}`,
        title: item.title?.replace(/<[^>]*>?/gm, '') || 'Engineering Role',
        company: item.company?.display_name || 'Hiring Employer',
        location: item.location?.display_name || COUNTRY_LABELS[country] || 'United States',
        url: item.redirect_url || '',
        source: 'ADZUNA',
        portal: `Adzuna (${country.toUpperCase()})`,
        description: item.description?.replace(/<[^>]*>?/gm, '') || item.title || '',
        salary: item.salary_min && item.salary_max 
          ? `${curr}${Math.round(item.salary_min).toLocaleString('en-US')} - ${curr}${Math.round(item.salary_max).toLocaleString('en-US')}` 
          : null,
        posted_at: item.created ? new Date(item.created).toISOString() : new Date().toISOString(),
        first_published_at: item.created ? new Date(item.created).toISOString() : null,
        is_remote: (item.title + ' ' + (item.description || '') + ' ' + (item.location?.display_name || '')).toLowerCase().includes('remote')
      }));
    } catch {
      return [];
    }
  }

  /**
   * Meta-Search ATS Discovery via Brave Search API (2,000 free queries/month).
   * Finds fresh direct ATS posting links: site:boards.greenhouse.io, site:jobs.ashbyhq.com, etc.
   */
  async scanBraveAtsDiscovery(query = 'Software Engineer', signal) {
    try {
      const braveKey = (await storageVault.getItem('sprav_brave_search_key')) || '';
      if (!braveKey) return [];

      const searchQ = `site:boards.greenhouse.io OR site:jobs.ashbyhq.com OR site:jobs.lever.co "${query}" remote`;
      let results = [];
      let extensionHandled = false;

      // 1. Check if companion extension relay is active (CORS-exempt background service worker)
      if (typeof window !== 'undefined' && window.chrome?.runtime?.sendMessage) {
        try {
          const extRes = await new Promise((resolve) => {
            const timer = setTimeout(() => resolve(null), 1200);
            try {
              window.chrome.runtime.sendMessage(
                {
                  type: 'SPRAV_DISPATCH_WEB_SEARCH',
                  payload: { query: searchQ, engine: 'brave', apiKey: braveKey, count: 15 }
                },
                (resp) => {
                  clearTimeout(timer);
                  resolve(resp);
                }
              );
            } catch {
              clearTimeout(timer);
              resolve(null);
            }
          });
          if (extRes && extRes.success && Array.isArray(extRes.results)) {
            results = extRes.results;
            extensionHandled = true;
          }
        } catch {
          // Extension bridge inactive
        }
      }

      // 2. Direct fetch (Node test suite or CORS-proxied environment)
      if (!extensionHandled) {
        try {
          const encoded = encodeURIComponent(searchQ);
          const res = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encoded}&count=15&freshness=pw`, {
            headers: {
              'Accept': 'application/json',
              'X-Subscription-Token': braveKey
            },
            signal
          });
          if (res.ok) {
            const data = await res.json();
            results = data.web?.results || [];
          }
        } catch (fetchErr) {
          // In real browser without extension, fetch throws CORS TypeError.
          // Fall back gracefully to CORS-open discovery feeds rather than crashing.
          if (typeof window !== 'undefined' && window.document) {
            console.warn('[Brave Discovery] Direct in-browser fetch blocked by CORS. Using CORS-open HackerNews discovery fallback.');
            return await this.scanHackerNews(signal);
          }
          return [];
        }
      }

      return results.map(item => {
        const atsInfo = parseCompanyFromAtsUrl(item.url);
        let company = atsInfo?.company || null;
        const source = atsInfo?.source || 'DIRECT_ATS';

        // Guard against Brave returning the ATS provider itself or a page title as profile name
        if (item.profile?.name) {
          const prof = item.profile.name.trim();
          const isAtsName = /^(greenhouse|ashby|lever|workable|smartrecruiters|workday|brave)(\s+(software|hq|inc|jobs|search))?$/i.test(prof);
          const hasTitleWord = /\b(engineer|developer|manager|architect|director|lead|intern|analyst|specialist|designer|consultant|officer|head of|vp of)\b/i.test(prof);
          if (!isAtsName && !hasTitleWord && !prof.includes(' - ') && prof.length > 2) {
            company = prof;
          }
        }

        company = sanitizeCompanyName(company, item.title, item.url);

        const cleanRawTitle = (item.title?.replace(/<[^>]*>?/gm, '') || 'Engineering Role')
          .replace(/\s*[-–|]\s*(greenhouse|ashby|lever|workable|smartrecruiters|workday).*$/i, '')
          .replace(/\bSoftare\b/gi, 'Software')
          .trim();

        return {
          id: `brave_${Math.random().toString(36).substring(2, 8)}`,
          title: cleanRawTitle || 'Engineering Role',
          company,
          location: 'Remote',
          url: item.url,
          source: source,
          portal: `${source} (Brave Meta-Discovery)`,
          description: item.description || item.title || '',
          posted_at: item.page_age ? new Date(item.page_age).toISOString() : new Date().toISOString(),
          first_published_at: item.page_age ? new Date(item.page_age).toISOString() : null,
          is_remote: true
        };
      });
    } catch {
      return [];
    }
  }

  /**
   * Scans Hacker News "Ask HN: Who is hiring?" monthly thread using Algolia API.
   * Free, CORS-friendly, zero API key required (Phase 4.2).
   */
  async scanHackerNews(signal) {
    try {
      // Find latest Who is Hiring story by user "whoishiring"
      const storyUrl = 'https://hn.algolia.com/api/v1/search?tags=story,author_whoishiring&query=%22Who%20is%20hiring%22&hitsPerPage=1';
      const storyRes = await fetch(storyUrl, { signal });
      if (!storyRes.ok) return [];
      const storyData = await storyRes.json();
      const latestStory = storyData.hits?.[0];
      if (!latestStory?.objectID) return [];

      const commentsUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${latestStory.objectID}&hitsPerPage=40`;
      const commentsRes = await fetch(commentsUrl, { signal });
      if (!commentsRes.ok) return [];
      const commentsData = await commentsRes.json();
      const hits = commentsData.hits || [];

      return hits.map(item => {
        const text = (item.comment_text || '').replace(/<[^>]+>/g, ' ').replace(/&#x27;/g, "'").replace(/&amp;/g, '&');
        const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
        const firstLine = lines[0] || 'Software Engineer';
        const parsedHeader = parseHnPostingHeader(firstLine, item.author, text);
        const company = sanitizeCompanyName(parsedHeader.company);
        const title = parsedHeader.title;
        const location = parsedHeader.location;

        return {
          id: `hn_${item.objectID}`,
          title,
          company,
          location,
          url: `https://news.ycombinator.com/item?id=${item.objectID}`,
          source: 'Hacker News',
          portal: 'Hacker News (Founder Direct)',
          description: text,
          is_remote: /remote/i.test(firstLine) || /remote/i.test(text),
          posted_at: item.created_at || new Date().toISOString(),
          first_published_at: item.created_at || new Date().toISOString()
        };
      });
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      return [];
    }
  }

  /**
   * Discovers direct technical recruiters, hiring managers, and talent acquisition leads
   * using the Brave Search API LinkedIn Dorking technique (Phase 3.1).
   * Query: site:linkedin.com/in ("technical recruiter" OR "talent acquisition" OR "engineering manager") "${companyName}"
   */
  async discoverCompanyRecruiters(companyName, targetRole = 'tech', signal) {
    if (!companyName || typeof companyName !== 'string' || !companyName.trim()) {
      return {
        success: false,
        error: 'INVALID_COMPANY',
        message: 'Company name is required for recruiter discovery.',
        recruiters: []
      };
    }

    const cleanCompany = companyName.trim();
    const braveKey = (await storageVault.getItem('sprav_brave_search_key')) || '';

    // Build targeted Google/Brave dork query
    let roleTokens = '("technical recruiter" OR "talent acquisition" OR "engineering manager")';
    const roleLower = (targetRole || '').toLowerCase();
    if (roleLower.includes('founder') || roleLower.includes('cto') || roleLower.includes('ceo')) {
      roleTokens = '("founder" OR "co-founder" OR "CTO" OR "VP of Engineering")';
    } else if (roleLower.includes('manager') || roleLower.includes('lead')) {
      roleTokens = '("engineering manager" OR "director of engineering" OR "tech lead manager")';
    } else if (roleLower.includes('talent') || roleLower.includes('recruiter')) {
      roleTokens = '("technical recruiter" OR "talent acquisition" OR "head of talent")';
    } else if (targetRole && targetRole !== 'tech') {
      roleTokens = `("${targetRole}" OR "technical recruiter" OR "talent acquisition")`;
    }

    const dorkQuery = `site:linkedin.com/in ${roleTokens} "${cleanCompany}"`;

    if (!braveKey) {
      return {
        success: false,
        error: 'NO_KEY',
        message: 'Brave Search API key not configured in Settings. Add your free key (2,000 queries/mo) to unlock live LinkedIn recruiter discovery.',
        query: dorkQuery,
        company: cleanCompany,
        recruiters: []
      };
    }

    try {
      const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(dorkQuery)}&count=10`;
      const res = await fetch(searchUrl, {
        headers: {
          'Accept': 'application/json',
          'X-Subscription-Token': braveKey
        },
        signal
      });

      if (!res.ok) {
        return {
          success: false,
          error: `HTTP_${res.status}`,
          message: `Brave Search returned status ${res.status}. Check API key or quota in Settings.`,
          query: dorkQuery,
          company: cleanCompany,
          recruiters: []
        };
      }

      const data = await res.json();
      const results = data.web?.results || [];

      const recruiters = [];
      for (const item of results) {
        if (!item.url || !item.url.includes('linkedin.com/in/')) continue;

        const rawTitle = (item.title || '').replace(/<[^>]*>?/gm, '').trim();
        const snippet = (item.description || '').replace(/<[^>]*>?/gm, '').trim();

        const cleanTitle = rawTitle.replace(/\s*\|\s*LinkedIn$/i, '').trim();
        const parts = cleanTitle.split(/\s*[-–—]\s*/);

        let name = (parts[0] || 'Technical Recruiter').trim();
        let role = (parts[1] || 'Talent Acquisition / Engineering Lead').trim();

        if (name.toLowerCase().includes(' at ') && !parts[1]) {
          const atParts = name.split(/\s+at\s+/i);
          name = atParts[0].trim();
          role = `Recruiter at ${atParts[1] || cleanCompany}`.trim();
        }

        name = name.replace(/\s*\([^)]*\)/g, '').trim();

        let team = 'Technical Talent Acquisition';
        const combined = `${role} ${snippet}`.toLowerCase();
        if (combined.includes('engineering manager') || combined.includes('director of engineering')) {
          team = 'Engineering Leadership';
        } else if (combined.includes('founder') || combined.includes('cto')) {
          team = 'Founding Team & Executive';
        } else if (combined.includes('infra') || combined.includes('cloud') || combined.includes('sre')) {
          team = 'Infrastructure & Systems Recruiting';
        } else if (combined.includes('ai') || combined.includes('machine learning')) {
          team = 'AI/ML Talent Acquisition';
        }

        recruiters.push({
          id: `rec_${Math.random().toString(36).substring(2, 9)}`,
          name,
          title: role,
          company: cleanCompany,
          team,
          snippet,
          linkedin_url: item.url,
          source: 'Brave Search LinkedIn Dorking'
        });
      }

      try {
        const cacheKey = `sprav_recruiter_cache_${cleanCompany.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
        await storageVault.setItem(cacheKey, {
          company: cleanCompany,
          query: dorkQuery,
          recruiters,
          updated_at: new Date().toISOString()
        });
      } catch {
        // Non-critical cache error
      }

      return {
        success: true,
        company: cleanCompany,
        query: dorkQuery,
        recruiters,
        total: recruiters.length
      };
    } catch (err) {
      if (err.name === 'AbortError') throw err;
      return {
        success: false,
        error: 'NETWORK_ERROR',
        message: err.message || 'Failed to connect to Brave Search API.',
        query: dorkQuery,
        company: cleanCompany,
        recruiters: []
      };
    }
  }

  /**
   * Parses user watchlist from Storage Vault to extract company names and ATS targets.
   * Checks both the IndexedDB v2 watchlist store (storageVault.getWatchlist())
   * and the legacy fallback settings key ('sprav_watchlist').
   */
  async getUserWatchlistTargets() {
    try {
      let watchlist = [];
      if (typeof storageVault.getWatchlist === 'function') {
        try {
          const entries = await storageVault.getWatchlist();
          if (Array.isArray(entries) && entries.length > 0) {
            watchlist = entries;
          }
        } catch {
          // Fall through to legacy
        }
      }

      if (!Array.isArray(watchlist) || watchlist.length === 0) {
        const legacy = await storageVault.getItem('sprav_watchlist');
        if (Array.isArray(legacy)) {
          watchlist = legacy;
        }
      }

      if (!Array.isArray(watchlist)) return [];

      const targets = [];
      for (const item of watchlist) {
        if (!item || (!item.name && !item.company)) continue;
        const name = String(item.name || item.company).trim();
        const url = String(item.careers_url || '').toLowerCase();
        let platform = item.platform || 'auto';

        let slug = name.toLowerCase().replace(/[^a-z0-9_-]/g, '');
        if (url.includes('greenhouse.io')) {
          platform = 'greenhouse';
          const match = url.match(/greenhouse\.io\/(?:v1\/boards\/)?([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        } else if (url.includes('ashbyhq.com')) {
          platform = 'ashby';
          const match = url.match(/ashbyhq\.com\/(?:job-board\/)?([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        } else if (url.includes('lever.co')) {
          platform = 'lever';
          const match = url.match(/lever\.co\/([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        } else if (url.includes('smartrecruiters.com')) {
          platform = 'smartrecruiters';
          const match = url.match(/smartrecruiters\.com\/(?:[a-zA-Z0-9_-]+\/)?([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        } else if (url.includes('recruitee.com')) {
          platform = 'recruitee';
          const match = url.match(/([a-zA-Z0-9_-]+)\.recruitee\.com/i);
          if (match) slug = match[1];
        } else if (url.includes('workable.com')) {
          platform = 'workable';
          const match = url.match(/apply\.workable\.com\/(?:[a-zA-Z0-9_-]+\/)?([a-zA-Z0-9_-]+)/i) || url.match(/([a-zA-Z0-9_-]+)\.workable\.com/i);
          if (match) slug = match[1];
        } else if (url.includes('personio.de') || url.includes('personio.com')) {
          platform = 'personio';
          const match = url.match(/([a-zA-Z0-9_-]+)\.jobs\.personio\.de/i) || url.match(/jobs\.personio\.de\/([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        } else if (url.includes('bamboohr.com')) {
          platform = 'bamboohr';
          const match = url.match(/([a-zA-Z0-9_-]+)\.bamboohr\.com/i);
          if (match) slug = match[1];
        } else if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) {
          platform = 'workday';
          const match = url.match(/([a-zA-Z0-9_-]+)\.[a-z0-9]+\.myworkdayjobs\.com/i) || url.match(/([a-zA-Z0-9_-]+)\.myworkdayjobs\.com/i);
          if (match) slug = match[1];
        } else if (url.includes('rippling.com')) {
          platform = 'rippling';
          const match = url.match(/rippling\.com\/(?:[a-zA-Z0-9_-]+\/)?([a-zA-Z0-9_-]+)/i);
          if (match) slug = match[1];
        }

        targets.push({ name, company: name, slug, platform });
      }
      return targets;
    } catch {
      return [];
    }
  }

  /**
   * Runs a single complete scan across available ATS sources and user watchlist.
   */
  async scanOnce(options = {}) {
    let { onJobFound = null, scope = null, kb = null } = options;

    if (!scope) {
      try {
        scope = await storageVault.getScope();
      } catch {
        scope = null;
      }
    }
    if (!kb) {
      try {
        kb = await storageVault.getKnowledgeBase();
      } catch {
        kb = null;
      }
    }

    this.status.active = true;
    this.status.state = 'Scanning Direct ATS Feeds...';
    this.status.lastScanTime = new Date().toISOString();
    this._notify();

    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const candidateSkills = [];
    if (kb && kb.skills) {
      for (const list of Object.values(kb.skills)) {
        if (Array.isArray(list)) candidateSkills.push(...list);
      }
    }

    let newlyDiscovered = 0;

    // Load existing jobs to perform semantic deduplication at scan time
    let existingJobs = [];
    try {
      existingJobs = (await storageVault.getJobs()) || [];
    } catch {
      existingJobs = [];
    }
    const knownJobKeys = new Map();
    for (const j of existingJobs) {
      const key = computeJobDedupKey(j);
      if (key) knownJobKeys.set(key, j);
    }

    // Pre-embed Candidate Profile Vector for Zero-Cost Dense Semantic Match Scoring
    let candidateProfileVector = null;
    try {
      if (kb && typeof kb === 'object') {
        candidateProfileVector = await embedText(buildCandidateEmbeddingProfile(kb));
      }
    } catch {}

    const processJobs = async (rawJobs) => {
      if (!Array.isArray(rawJobs) || rawJobs.length === 0) return;
      const batchToSave = [];
      const newItems = [];

      for (const raw of rawJobs) {
        if (!raw || typeof raw !== 'object') continue;
        if (this.isJobMatchingScope(raw, scope)) {
          const dedupKey = computeJobDedupKey(raw);
          const existingJob = dedupKey ? knownJobKeys.get(dedupKey) : null;

          const fit = this.calculateAtsFit(candidateSkills, `${raw.title} ${raw.description}`);

          let semanticScore = existingJob?.semantic_match_score ?? null;
          let cosineSim = existingJob?.semantic_similarity ?? null;
          // Compute dense semantic vector embedding only for viable matches (fit >= 45) to avoid CPU bottlenecks
          if (semanticScore == null && candidateProfileVector && fit.score >= 45) {
            try {
              const jobVec = await embedText(buildJobEmbeddingRepresentation(raw));
              if (jobVec) {
                cosineSim = Number(cosineSimilarity(candidateProfileVector, jobVec).toFixed(4));
                semanticScore = calibrateCosineToPercentage(cosineSim);
              }
            } catch {}
          }

          const finalScore = semanticScore != null
            ? Math.round(fit.score * 0.45 + semanticScore * 0.55)
            : fit.score;

          const normalized = this.normalizeJob({
            ...raw,
            id: existingJob ? existingJob.id : raw.id,
            ats_match_score: finalScore,
            semantic_match_score: semanticScore,
            semantic_similarity: cosineSim,
            matched_skills: fit.matched,
            missing_skills: fit.missing,
            status: existingJob ? existingJob.status : (finalScore >= 85 ? 'matched' : (finalScore >= 65 ? 'near_miss_review' : 'new')),
            created_at: existingJob ? (existingJob.created_at || existingJob.posted_at) : undefined
          });

          batchToSave.push(normalized);
          if (existingJob) {
            knownJobKeys.set(dedupKey, normalized);
          } else {
            if (dedupKey) knownJobKeys.set(dedupKey, normalized);
            newItems.push(normalized);
          }
        }
      }

      if (batchToSave.length > 0) {
        try {
          if (typeof storageVault.saveJobs === 'function') {
            await storageVault.saveJobs(batchToSave);
          } else {
            for (const item of batchToSave) {
              await storageVault.saveJob(item);
            }
          }
        } catch {
          for (const item of batchToSave) {
            try { await storageVault.saveJob(item); } catch {}
          }
        }
      }

      for (const item of newItems) {
        newlyDiscovered++;
        this.status.discoveredCount++;
        if (onJobFound) onJobFound(item);
      }
    };

    try {
      // ──────────────────────────────────────────────────────────────────────────
      // 1. UP-FRONT HIGH-YIELD OPEN FEEDS (Stream hundreds of live roles in 1-2s)
      // ──────────────────────────────────────────────────────────────────────────
      this.status.currentCompany = 'High-Yield Live Feeds (Remotive, RemoteOK, HackerNews, Jobicy, Arbeitnow, Himalayas, Open-ATS)...';
      this._notify();

      const highYieldFeeds = [
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanRemotive(signal, scope);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanRemoteOK(signal, scope);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanHackerNewsHiring(signal);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanJobicy(signal, scope);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanWeWorkRemotely(signal, scope);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanArbeitnow(signal, 4);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanHimalayasJobs({ limit: 80, signal });
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanOpenJobsData(signal);
          if (jobs.length > 0) await processJobs(jobs);
        }
      ];

      await Promise.allSettled(highYieldFeeds.map(fn => fn()));

      // ──────────────────────────────────────────────────────────────────────────
      // 2. SCAN USER CUSTOM WATCHLIST TARGETS (High Priority, Concurrent Chunks)
      // ──────────────────────────────────────────────────────────────────────────
      const userWatchlist = await this.getUserWatchlistTargets();
      if (userWatchlist.length > 0) {
        const CHUNK_SIZE = 4;
        for (let i = 0; i < userWatchlist.length; i += CHUNK_SIZE) {
          if (signal.aborted) break;
          const chunk = userWatchlist.slice(i, i + CHUNK_SIZE);
          this.status.currentCompany = `Watchlist: ${chunk.map(t => t.name).join(', ')}`;
          this._notify();
          const chunkResults = await Promise.allSettled(chunk.map(async (target) => {
            let raw = [];
            if (target.platform === 'greenhouse' || target.platform === 'auto') {
              raw = await this.scanGreenhouseCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'ashby' || target.platform === 'auto')) {
              raw = await this.scanAshbyCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'lever' || target.platform === 'auto')) {
              raw = await this.scanLeverCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'smartrecruiters' || target.platform === 'auto')) {
              raw = await this.scanSmartRecruitersCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'recruitee' || target.platform === 'auto')) {
              raw = await this.scanRecruiteeCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'workable' || target.platform === 'auto')) {
              raw = await this.scanWorkableCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'personio' || target.platform === 'auto')) {
              raw = await this.scanPersonioCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'bamboohr' || target.platform === 'auto')) {
              raw = await this.scanBambooHrCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'workday' || target.platform === 'auto')) {
              raw = await this.scanWorkdayCompany(target.slug, signal);
            }
            if (raw.length === 0 && (target.platform === 'rippling' || target.platform === 'auto')) {
              raw = await this.scanRipplingCompany(target.slug, signal);
            }
            return raw;
          }));

          const allWatchlistJobs = [];
          for (const res of chunkResults) {
            if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
              allWatchlistJobs.push(...res.value);
            }
          }
          if (allWatchlistJobs.length > 0) {
            await processJobs(allWatchlistJobs);
          }
        }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 3. ROTATING SCAN CURSOR & COMMUNITY REGISTRY CONCURRENT POOL
      // ──────────────────────────────────────────────────────────────────────────
      const activeRegistry = await loadCommunityRegistry();

      let cursorMap = {};
      try {
        const stored = await storageVault.getItem(SCAN_CURSOR_KEY);
        if (stored && typeof stored === 'object') cursorMap = stored;
      } catch {
        try { cursorMap = JSON.parse(localStorage.getItem(SCAN_CURSOR_KEY) || '{}'); } catch { cursorMap = {}; }
      }

      const candidateRegion = detectCandidateRegionFromScope(scope);
      const targetRegion = options.region || (candidateRegion !== 'all' ? candidateRegion : 'all');
      const getPlatformList = (platform) => {
        if (targetRegion && targetRegion !== 'all') {
          const regList = getRegionalCompanies(targetRegion, platform);
          if (regList && regList.length > 0) return regList;
        }
        return activeRegistry[platform] || CURATED_ATS_COMPANIES[platform] || [];
      };

      const getBatchForPlatform = (list, platform) => {
        const { batch } = getRotatedBatch(list, platform, cursorMap);
        return batch;
      };

      const queryRole = scope?.roles?.[0] ? (typeof scope.roles[0] === 'string' ? scope.roles[0] : scope.roles[0].keyword) : 'engineer';

      const scanPlatformParallel = async (platformName, scanFn, concurrency = 4) => {
        if (signal.aborted) return;
        const list = getPlatformList(platformName.toLowerCase());
        const batch = getBatchForPlatform(list, platformName.toLowerCase());
        for (let i = 0; i < batch.length; i += concurrency) {
          if (signal.aborted) break;
          const chunk = batch.slice(i, i + concurrency);
          this.status.currentCompany = `${platformName}: ${chunk.join(', ')}`;
          this._notify();
          const results = await Promise.allSettled(chunk.map(c => scanFn(c, signal)));
          const allJobs = [];
          for (const res of results) {
            if (res.status === 'fulfilled' && Array.isArray(res.value) && res.value.length > 0) {
              allJobs.push(...res.value);
            }
          }
          if (allJobs.length > 0) {
            await processJobs(allJobs);
          }
        }
      };

      // Scan ATS platforms with concurrency pool (4 simultaneous requests per batch)
      await scanPlatformParallel('Greenhouse', (c, sig) => this.scanGreenhouseCompany(c, sig));
      await scanPlatformParallel('Ashby', (c, sig) => this.scanAshbyCompany(c, sig));
      await scanPlatformParallel('Lever', (c, sig) => this.scanLeverCompany(c, sig));
      await scanPlatformParallel('SmartRecruiters', (c, sig) => this.scanSmartRecruitersCompany(c, sig));
      await scanPlatformParallel('Recruitee', (c, sig) => this.scanRecruiteeCompany(c, sig));
      await scanPlatformParallel('Workable', (c, sig) => this.scanWorkableCompany(c, sig));
      await scanPlatformParallel('Personio', (c, sig) => this.scanPersonioCompany(c, sig));
      await scanPlatformParallel('BambooHR', (c, sig) => this.scanBambooHrCompany(c, sig));
      await scanPlatformParallel('Workday', (c, sig) => this.scanWorkdayCompany(c, sig, queryRole));
      await scanPlatformParallel('Rippling', (c, sig) => this.scanRipplingCompany(c, sig));

      // Persist updated cursor positions so next scan continues from where we left off
      try {
        await storageVault.setItem(SCAN_CURSOR_KEY, cursorMap);
      } catch {
        try { localStorage.setItem(SCAN_CURSOR_KEY, JSON.stringify(cursorMap)); } catch { /* noop */ }
      }

      // ──────────────────────────────────────────────────────────────────────────
      // 4. SECONDARY & COMMUNITY DEFENSIVE FEEDS (Concurrent Execution)
      // ──────────────────────────────────────────────────────────────────────────
      const secondaryFeeds = [
        async () => {
          if (signal.aborted) return;
          try {
            const mirrorJobs = await fetchDailyMirrorJobs(signal);
            if (mirrorJobs && mirrorJobs.length > 0) await processJobs(mirrorJobs);
          } catch {}
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanHackerNews(signal);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanDevToHiring(signal);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const jobs = await this.scanHiringWithoutWhiteboards(signal);
          if (jobs.length > 0) await processJobs(jobs);
        },
        async () => {
          if (signal.aborted) return;
          const fjbJobs = await this.scanFreeJobsBoard(signal);
          if (fjbJobs.length > 0) await processJobs(fjbJobs);
          const jsdevJobs = await this.scanJobsearchDev(signal);
          if (jsdevJobs.length > 0) await processJobs(jsdevJobs);
        },
        async () => {
          if (signal.aborted) return;
          const fedJobs = await this.scanUSAJobs(queryRole, signal);
          if (fedJobs.length > 0) await processJobs(fedJobs);
        },
        async () => {
          if (signal.aborted) return;
          const adzunaJobs = await this.scanAdzuna(queryRole, signal);
          if (adzunaJobs.length > 0) await processJobs(adzunaJobs);
        },
        async () => {
          if (signal.aborted) return;
          const braveJobs = await this.scanBraveAtsDiscovery(queryRole, signal);
          if (braveJobs.length > 0) await processJobs(braveJobs);
        }
      ];

      await Promise.allSettled(secondaryFeeds.map(fn => fn()));

    } catch (e) {
      console.warn('[ATS Scanner] Scan interrupted or failed:', e);
    } finally {
      this.status.active = false;
      this.status.state = `Idle (Discovered ${newlyDiscovered} jobs)`;
      this.status.currentCompany = '';
      this._notify();
    }

    return newlyDiscovered;
  }

  /**
   * Starts continuous scanning with intervals.
   * Default interval is 60 seconds (1 minute) for maximum safe freshness without 429 rate limiting.
   */
  startContinuousScan(options = {}) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.status.active = true;
    const intervalMs = Number(options.intervalMs) || 60000;
    this.status.state = `Running (Autonomous ATS Scanner • ${Math.round(intervalMs / 1000)}s cycle)`;
    this._notify();

    const loop = async () => {
      if (!this.isRunning) return;

      // Throttle when browser tab is hidden to conserve power and avoid rate limiting
      if (typeof document !== 'undefined' && document.visibilityState === 'hidden') {
        this._loopTimer = setTimeout(loop, 30000);
        return;
      }

      // Dynamically load latest scope and kb from storageVault if not statically pinned
      let dynamicScope = options.scope;
      let dynamicKb = options.kb;
      if (!dynamicScope) {
        try {
          dynamicScope = await storageVault.getScope();
        } catch {
          dynamicScope = null;
        }
      }
      if (!dynamicKb) {
        try {
          dynamicKb = await storageVault.getKnowledgeBase();
        } catch {
          dynamicKb = null;
        }
      }

      await this.scanOnce({ ...options, scope: dynamicScope, kb: dynamicKb });

      if (this.isRunning) {
        // Dynamic interval (default 60s) with ±3s organic jitter to prevent predictable bot fingerprinting
        const jitter = Math.floor(Math.random() * 6000) - 3000;
        const nextDelay = Math.max(30000, intervalMs + jitter);
        this._loopTimer = setTimeout(loop, nextDelay);
      }
    };

    loop();
  }

  /**
   * Stops the continuous scanning loop.
   */
  stopContinuousScan() {
    this.isRunning = false;
    this.status.active = false;
    this.status.state = 'Stopped';
    if (this._loopTimer) {
      clearTimeout(this._loopTimer);
      this._loopTimer = null;
    }
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
    this._notify();
  }

  /**
   * Fast-Path Curated Discovery: Targets the Top 100 Tech Companies catalog
   * (verified Ashby & Greenhouse endpoints) and high-yield open feeds.
   * Runs in the background on first portal open to populate 150+ authentic direct listings in seconds.
   *
   * @param {{
   *   limit?: number,
   *   concurrency?: number,
   *   onJobFound?: (job: object) => void,
   *   signal?: AbortSignal,
   *   scope?: object,
   *   kb?: object
   * }} [options={}]
   * @returns {Promise<number>} Number of newly populated jobs
   */
  async scanTopCuratedTier(options = {}) {
    const limit = options.limit || 150;
    const concurrency = options.concurrency || 4;
    const onJobFound = options.onJobFound || null;
    const externalSignal = options.signal || null;

    let scope = options.scope;
    let kb = options.kb;
    if (!scope) {
      try { scope = await storageVault.getScope(); } catch { scope = null; }
    }
    if (!kb) {
      try { kb = await storageVault.getKnowledgeBase(); } catch { kb = null; }
    }

    const candidateSkills = [];
    if (kb && kb.skills) {
      for (const list of Object.values(kb.skills)) {
        if (Array.isArray(list)) candidateSkills.push(...list);
      }
    }

    const localAbort = new AbortController();
    const signal = externalSignal || localAbort.signal;

    this.status.active = true;
    this.status.state = 'Auto-Populating Direct ATS Feed (Top Tech Companies)...';
    this.status.lastScanTime = new Date().toISOString();
    this._notify();

    let existingJobs = [];
    try { existingJobs = (await storageVault.getJobs()) || []; } catch { existingJobs = []; }
    const knownKeys = new Set(existingJobs.map(j => computeJobDedupKey(j)).filter(Boolean));

    let newlyDiscovered = 0;

    const processBatch = async (rawJobs) => {
      if (!Array.isArray(rawJobs) || rawJobs.length === 0 || signal.aborted) return;
      const batchToSave = [];

      for (const raw of rawJobs) {
        if (!raw || !raw.title) continue;
        const dedupKey = computeJobDedupKey(raw);
        if (dedupKey && knownKeys.has(dedupKey)) continue;
        if (dedupKey) knownKeys.add(dedupKey);

        if (scope && typeof this.isJobMatchingScope === 'function' && !this.isJobMatchingScope(raw, scope)) {
          continue;
        }

        const fit = this.calculateAtsFit(candidateSkills, `${raw.title} ${raw.description || ''}`);
        const normalized = this.normalizeJob({
          ...raw,
          ats_match_score: fit.score,
          matched_skills: fit.matched,
          missing_skills: fit.missing,
          status: fit.score >= 85 ? 'matched' : (fit.score >= 65 ? 'near_miss_review' : 'new')
        });

        batchToSave.push(normalized);
        newlyDiscovered++;
        this.status.discoveredCount++;
        if (onJobFound) {
          try { onJobFound(normalized); } catch {}
        }
      }

      if (batchToSave.length > 0) {
        try {
          if (typeof storageVault.saveJobs === 'function') {
            await storageVault.saveJobs(batchToSave);
          } else {
            for (const item of batchToSave) {
              await storageVault.saveJob(item);
            }
          }
        } catch {
          for (const item of batchToSave) {
            try { await storageVault.saveJob(item); } catch {}
          }
        }
        this._notify();
      }
    };

    try {
      // Stage 1: High-Speed Open Feeds (Stream 50-100 roles in ~1.5s)
      this.status.currentCompany = 'High-Yield Live Feeds (Remotive, Jobicy, WeWorkRemotely, HackerNews)...';
      this._notify();

      await Promise.allSettled([
        (async () => {
          if (signal.aborted) return;
          const jobs = await this.scanRemotive(signal, scope);
          await processBatch(jobs);
        })(),
        (async () => {
          if (signal.aborted) return;
          const jobs = await this.scanJobicy(signal, scope);
          await processBatch(jobs);
        })(),
        (async () => {
          if (signal.aborted) return;
          const jobs = await this.scanWeWorkRemotely(signal, scope);
          await processBatch(jobs);
        })(),
        (async () => {
          if (signal.aborted) return;
          const jobs = await this.scanHackerNewsHiring(signal);
          await processBatch(jobs);
        })()
      ]);

      // Stage 2: Direct ATS Top 100 Tech Companies (Ashby & Greenhouse)
      const topTargets = Array.isArray(TOP_100_TECH_COMPANIES) ? TOP_100_TECH_COMPANIES : [];
      for (let i = 0; i < topTargets.length; i += concurrency) {
        if (signal.aborted || (limit > 0 && newlyDiscovered >= limit)) break;
        const chunk = topTargets.slice(i, i + concurrency);
        this.status.currentCompany = `Top Tech ATS: ${chunk.map(c => c.name).join(', ')}`;
        this._notify();

        const chunkResults = await Promise.allSettled(chunk.map(async (company) => {
          if (company.platform === 'ashby') {
            return await this.scanAshbyCompany(company.slug, signal);
          } else if (company.platform === 'greenhouse') {
            return await this.scanGreenhouseCompany(company.slug, signal);
          }
          return [];
        }));

        const chunkJobs = [];
        for (const res of chunkResults) {
          if (res.status === 'fulfilled' && Array.isArray(res.value)) {
            chunkJobs.push(...res.value);
          }
        }

        if (chunkJobs.length > 0) {
          await processBatch(chunkJobs);
        }
      }
    } catch (e) {
      console.warn('[ATS Scanner] Top curated tier scan interrupted:', e);
    } finally {
      this.status.active = false;
      this.status.state = `Discovery Complete (${newlyDiscovered} live jobs added)`;
      this.status.currentCompany = '';
      this._notify();
    }

    return newlyDiscovered;
  }

  /**
   * Searches live public endpoints (Algolia HN, Remotive, Brave, Adzuna, USAJobs)
   * specifically matching an on-demand keyword query.
   */
  async searchLiveKeyword(keyword = '', options = {}) {
    if (!keyword || typeof keyword !== 'string' || !keyword.trim()) return 0;
    const cleanQ = keyword.trim();
    const { onJobFound = null, kb = null } = options;

    const candidateSkills = [];
    if (kb && kb.skills) {
      for (const list of Object.values(kb.skills)) {
        if (Array.isArray(list)) candidateSkills.push(...list);
      }
    }

    let discovered = 0;
    const existingJobs = (await storageVault.getJobs().catch(() => [])) || [];
    const knownKeys = new Set(existingJobs.map(j => computeJobDedupKey(j)).filter(Boolean));

    const ingestBatch = async (rawBatch) => {
      if (!Array.isArray(rawBatch) || rawBatch.length === 0) return;
      for (const raw of rawBatch) {
        if (!isActiveJob(raw)) continue;
        const dedupKey = computeJobDedupKey(raw);
        if (dedupKey && knownKeys.has(dedupKey)) continue;
        if (dedupKey) knownKeys.add(dedupKey);

        const fit = this.calculateAtsFit(candidateSkills, `${raw.title || ''} ${raw.description || ''}`);
        const normalized = this.normalizeJob({
          ...raw,
          ats_match_score: fit.score,
          matched_skills: fit.matched,
          missing_skills: fit.missing,
          status: fit.score >= 85 ? 'matched' : (fit.score >= 65 ? 'near_miss_review' : 'new')
        });

        await storageVault.saveJob(normalized);
        discovered++;
        if (onJobFound) onJobFound(normalized);
      }
    };

    // Parallelize all live keyword discovery engines concurrently
    await Promise.allSettled([
      // 0. Direct Targeted Company ATS Probes (Ashby, Greenhouse, Lever, Workday)
      (async () => {
        try {
          const compSlug = cleanQ.toLowerCase().replace(/[^a-z0-9_-]/g, '');
          if (compSlug.length >= 2) {
            const isKnownCompany = Boolean(
              VERIFIED_WORKDAY_TENANTS?.[compSlug] ||
              WORKDAY_ENTERPRISE_TENANTS?.some(t => t.name.toLowerCase() === compSlug || t.tenant?.toLowerCase() === compSlug) ||
              TOP_100_TECH_COMPANIES?.some(c => (c.slug && c.slug.toLowerCase() === compSlug) || (c.name && c.name.toLowerCase() === compSlug)) ||
              REGIONAL_ATS_COMPANIES?.some(c => (c.slug && c.slug.toLowerCase() === compSlug) || (c.name && c.name.toLowerCase() === compSlug)) ||
              options.isCompanyScan
            );

            if (isKnownCompany) {
              // Check Workday tenants
              if (VERIFIED_WORKDAY_TENANTS?.[compSlug] || WORKDAY_ENTERPRISE_TENANTS?.some(t => t.name.toLowerCase() === compSlug || t.tenant?.toLowerCase() === compSlug)) {
                const wdJobs = await this.scanWorkdayCompany(compSlug, options.signal, 'engineer');
                if (wdJobs && wdJobs.length > 0) await ingestBatch(wdJobs);
              }
              // Check Greenhouse/Ashby/Lever
              const ghJobs = await this.scanGreenhouseCompany(compSlug, options.signal);
              if (ghJobs && ghJobs.length > 0) await ingestBatch(ghJobs);

              const ashbyJobs = await this.scanAshbyCompany(compSlug, options.signal);
              if (ashbyJobs && ashbyJobs.length > 0) await ingestBatch(ashbyJobs);

              const leverJobs = await this.scanLeverCompany(compSlug, options.signal);
              if (leverJobs && leverJobs.length > 0) await ingestBatch(leverJobs);
            }
          }
        } catch {}
      })(),

      // 1. Algolia HN query search scoped strictly to latest "Ask HN: Who is hiring?" story
      (async () => {
        try {
          let storyId = this._cachedHnStoryId;
          const now = Date.now();
          if (!storyId || !this._cachedHnStoryTime || (now - this._cachedHnStoryTime > 3600000)) {
            try {
              const storySearchUrl = 'https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&query=%22Who%20is%20hiring%22';
              const storyRes = await fetchWithTimeout(storySearchUrl, {}, 4000);
              if (storyRes.ok) {
                const storyData = await storyRes.json();
                const latestStory = (storyData.hits || []).find(h => 
                  h && h.title && /\bwho is hiring\b/i.test(h.title) && !/who wants to be hired/i.test(h.title)
                ) || (storyData.hits || []).find(h =>
                  h && h.title && !/who wants to be hired/i.test(h.title) && h.title.toLowerCase().includes('who is hiring')
                );
                if (latestStory && latestStory.objectID) {
                  storyId = String(latestStory.objectID);
                  this._cachedHnStoryId = storyId;
                  this._cachedHnStoryTime = now;
                }
              }

              if (!storyId) {
                const askHnUrl = 'https://hn.algolia.com/api/v1/search?query=hiring&tags=ask_hn';
                const askHnRes = await fetchWithTimeout(askHnUrl, {}, 4000);
                if (askHnRes.ok) {
                  const askHnData = await askHnRes.json();
                  const latestAskHn = (askHnData.hits || []).find(h =>
                    h && h.title && /\bwho is hiring\b/i.test(h.title) && !/who wants to be hired/i.test(h.title)
                  ) || askHnData.hits?.[0];
                  if (latestAskHn && latestAskHn.objectID) {
                    storyId = String(latestAskHn.objectID);
                    this._cachedHnStoryId = storyId;
                    this._cachedHnStoryTime = now;
                  }
                }
              }
            } catch {}
          }

          if (storyId) {
            const hnUrl = `https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&query=${encodeURIComponent(cleanQ)}&hitsPerPage=25`;
            const res = await fetchWithTimeout(hnUrl, {}, 4500);
            if (res.ok) {
              const data = await res.json();
              const hits = data.hits || [];
              const hnJobs = [];
              const HIRING_MARKERS = /(?:hiring|intern|full[- ]time|part[- ]time|contract|remote|onsite|\$|salary|engineer|developer|architect|designer|lead)/i;

              for (const item of hits) {
                if (!item || !item.comment_text) continue;
                // Reject nested discussion replies; only accept root comments on the Who is hiring thread
                if (item.parent_id && String(item.parent_id) !== String(storyId)) continue;

                let clean = item.comment_text
                  .replace(/<p>/gi, '\n\n')
                  .replace(/<a\s+(?:[^>]*?\s+)?href=(["'])(.*?)\1[^>]*>(.*?)<\/a>/gi, '$2')
                  .replace(/<[^>]+>/g, ' ')
                  .replace(/&#x2F;/g, '/')
                  .replace(/&#x27;/g, "'")
                  .replace(/&amp;/g, '&')
                  .replace(/&quot;/g, '"')
                  .replace(/&lt;/g, '<')
                  .replace(/&gt;/g, '>')
                  .trim();

                if (!clean || clean.length < 35) continue;
                if (!HIRING_MARKERS.test(clean)) continue;

                const lines = clean.split('\n').map(l => l.trim()).filter(Boolean);
                if (lines.length === 0) continue;
                const firstLine = lines[0] || '';
                const parsedHeader = parseHnPostingHeader(firstLine, item.author, clean);
                let company = sanitizeCompanyName(parsedHeader.company);
                let title = parsedHeader.title || `${cleanQ} Engineer`;
                let location = parsedHeader.location;
                const isRemote = parsedHeader.isRemote || clean.toLowerCase().includes('remote');
                const contactInfo = extractHnContactInfo(clean);
                const founderEmail = contactInfo.email;
                const founderName = contactInfo.name;
                const urlMatch = clean.match(/https?:\/\/[^\s<>"')]+/);
                const jobUrl = urlMatch ? urlMatch[0] : `https://news.ycombinator.com/item?id=${item.objectID || item.id}`;

                hnJobs.push({
                  id: `hn_live_${item.objectID || Math.random().toString(36).substring(2, 8)}`,
                  title: title.slice(0, 100),
                  company: company.slice(0, 80),
                  location,
                  url: jobUrl,
                  source: 'Hacker News',
                  portal: 'Hacker News (Algolia Search)',
                  description: clean,
                  is_remote: isRemote,
                  founder_email: founderEmail || null,
                  founder_name: founderName || null,
                  posted_at: item.created_at || new Date().toISOString()
                });
              }
              await ingestBatch(hnJobs);
            }
          }
        } catch {}
      })(),

      // 2. Remotive search query (CORS-friendly)
      (async () => {
        try {
          const remUrl = `https://remotive.com/api/remote-jobs?search=${encodeURIComponent(cleanQ)}`;
          const res = await fetchWithTimeout(remUrl, {}, 4500);
          if (res.ok) {
            const data = await res.json();
            const jobs = (data.jobs || []).slice(0, 20).map(j => ({
              id: `remotive_${j.id}`,
              title: j.title,
              company: j.company_name,
              location: j.candidate_required_location || 'Remote',
              url: j.url,
              source: 'REMOTIVE',
              portal: 'Remotive Live Search',
              description: j.description || j.title,
              is_remote: true,
              posted_at: j.publication_date || new Date().toISOString()
            }));
            await ingestBatch(jobs);
          }
        } catch {}
      })(),

      // 3. Brave Meta-Discovery (if key configured)
      (async () => {
        try {
          const braveJobs = await this.scanBraveAtsDiscovery(cleanQ);
          if (braveJobs && braveJobs.length > 0) await ingestBatch(braveJobs);
        } catch {}
      })(),

      // 4. USAJOBS / Adzuna (if keys configured)
      (async () => {
        try {
          const usajobs = await this.scanUSAJobs(cleanQ);
          if (usajobs && usajobs.length > 0) await ingestBatch(usajobs);
        } catch {}
      })(),
      (async () => {
        try {
          const adzunaJobs = await this.scanAdzuna(cleanQ, null, options);
          if (adzunaJobs && adzunaJobs.length > 0) await ingestBatch(adzunaJobs);
        } catch {}
      })(),

      // 5. 3.5M+ Directly-Sourced Tech Listings (Ashby, Greenhouse, Lever, Workday, Himalayas)
      (async () => {
        try {
          const streamResult = await searchHighVolumeStream(cleanQ, {
            location: options.location || '',
            directOnly: options.directOnly || false,
            hasSalary: options.hasSalary || false,
            targetMatches: options.targetMatches || 25,
            maxChunksToScan: options.maxChunksToScan || 2,
            signal: options.signal
          });
          if (streamResult?.jobs && streamResult.jobs.length > 0) {
            await ingestBatch(streamResult.jobs);
          }
        } catch {}
      })(),

      // 6. SimplifyJobs Curated Index (SWE, Intern, New-Grad)
      (async () => {
        try {
          if (options.includeEarlyCareer || /intern|junior|entry|grad|university/i.test(cleanQ)) {
            const simplifyJobs = await fetchSimplifyJobs(
              /intern/i.test(cleanQ) ? 'intern' : 'new_grad',
              { keyword: cleanQ, limit: 15, signal: options.signal }
            );
            if (simplifyJobs && simplifyJobs.length > 0) {
              await ingestBatch(simplifyJobs);
            }
          }
        } catch {}
      })(),

      // 7. Himalayas Remote Tech (90K+ free CORS API — direct search endpoint)
      (async () => {
        try {
          const himalayasJobs = await fetchHimalayasSearch(cleanQ, {
            limit: 20,
            signal: options.signal
          });
          if (himalayasJobs && himalayasJobs.length > 0) {
            await ingestBatch(himalayasJobs);
          }
        } catch {}
      })()
    ]);

    return discovered;
  }

  /**
   * High-Volume 1.6M+ Global Index Search using native client-side gzip streaming.
   */
  async scanGlobalAtsIndex(query = '', options = {}) {
    return searchHighVolumeStream(query, options);
  }

  async scanSimplifyJobs(feedType = 'new_grad', options = {}) {
    return fetchSimplifyJobs(feedType, options);
  }

  /**
   * Fetches fresh remote tech jobs from the Himalayas public API.
   * @param {Object} [options={}]
   * @param {string} [options.keyword=''] - Optional keyword filter
   * @param {number} [options.limit=80] - Max jobs to return
   * @param {AbortSignal} [options.signal]
   * @returns {Promise<Array<Object>>} Normalized SPrav job objects
   */
  async scanHimalayasJobs(options = {}) {
    const { keyword = '', limit = 80, signal } = options;
    try {
      if (keyword.trim()) {
        return fetchHimalayasSearch(keyword, { limit, signal });
      }
      const { jobs } = await fetchHimalayasJobs({ limit, signal });
      return jobs;
    } catch {
      return [];
    }
  }

  async getGlobalIndexMetadata() {
    return fetchJobBoardMetadata();
  }
}

export const browserAtsScanner = new BrowserAtsScanner();

/**
 * Detects common JD red flags using rule-based pattern matching (zero LLM cost).
 * Categorizes risks including burnout, lack of resources, unrealistic requirements,
 * hidden compensation, informal cultural filtering, visa restrictions,
 * commission-only/multi-level schemes, and ghost-job probability.
 *
 * @param {string} jdText - The raw or cleaned job description text
 * @param {Object} [jobMeta={}] - Optional metadata such as freshness, posted_at, or daysOld
 * @returns {Array<{label: string, color: string}>} Array of detected red flag badges
 */
export function detectJdRedFlags(jdText = '', jobMeta = {}) {
  const text = (typeof jdText === 'string' ? jdText : String(jdText || '')).toLowerCase();
  const hasMeta = Boolean(jobMeta && (jobMeta.freshness || jobMeta.posted_at || jobMeta.daysOld));
  if (!text.trim() && !hasMeta) return [];
  const flags = [];
  if (/fast.?paced environment/i.test(text)) flags.push({ label: 'Burnout Risk', color: '#f59e0b' });
  if (/wear.{0,10}many hats|multiple hat/i.test(text)) flags.push({ label: 'Under-Resourced', color: '#f59e0b' });
  if (/10\+?\s*years.{0,30}(react|next|kubernetes|docker)/i.test(text)) flags.push({ label: 'Unrealistic Requirements', color: '#ef4444' });
  const hasMetaSalary = !!(
    jobMeta?.salary ||
    jobMeta?.salary_min ||
    jobMeta?.salary_max ||
    jobMeta?.compensation ||
    jobMeta?.comp?.hasSalary ||
    (typeof jobMeta?.extractedSalaryText === 'string' && jobMeta.extractedSalaryText.trim())
  );
  const cleanTextForSalary = text.replace(/401\s*\(?k\)?/gi, '');
  const hasTextSalary = /salary|compensation|\$\d|[€£₹]\d|\b\d+\s*lpa\b|\b\d{2,4}\s*k\b/i.test(cleanTextForSalary);
  if (text.trim() && !hasMetaSalary && !hasTextSalary) flags.push({ label: 'No Salary Listed', color: '#a78bfa' });
  if (/culture fit/i.test(text) && !/diversity|inclusion/i.test(text)) flags.push({ label: 'Vague Culture Filter', color: '#a78bfa' });
  if (/rock\s?star|ninja|wizard|guru/i.test(text)) flags.push({ label: 'Informal Tone', color: '#6b7280' });

  // 7. Visa Restriction / Citizen-Only / Clearance
  if (/(?:no\s+(?:visa\s+)?sponsorship|unable\s+to\s+sponsor|cannot\s+sponsor|no\s+sponsorship\s+available|not\s+offering\s+sponsorship|must\s+be\s+a\s+(?:u\.?s\.?|us)\s+citizen|u\.?s\.?\s+citizenship\s+required|us\s+citizens\s+only|active\s+security\s+clearance\s+required|must\s+possess\s+active\s+(?:secret|top\s+secret)\s+clearance|visa.?only|green\s+card\s+or\s+us\s+citizen\s+only)/i.test(text)) {
    flags.push({ label: 'Visa Restriction', color: '#f97316' });
  }

  // 8. Multi-Level / Commission-Only / Unpaid Risk
  if (/(?:commission\s+only|100%\s+commission|multi-?level|unpaid\s+(?:internship|trial|training)|pay\s+to\s+join|referral\s+fee\s+required|revenue\s+share\s+only|no\s+base\s+salary)/i.test(text)) {
    flags.push({ label: 'Multi-Level / Commission Risk', color: '#ef4444' });
  }

  // 9. Ghost-Job Probability / Evergreen / Talent Pool
  const hasGhostKeywords = /(?:evergreen\s+requisition|talent\s+pool\s+only|future\s+opportunities\s+only|pooling\s+requisition|not\s+actively\s+hiring|pipeline\s+building\s+only|general\s+application\s+pool|expression\s+of\s+interest\s+only)/i.test(text);
  const isGhostByMeta = jobMeta?.freshness?.code === 'GHOST' || 
    (jobMeta?.posted_at && (Date.now() - new Date(jobMeta.posted_at).getTime()) > 90 * 24 * 3600 * 1000) ||
    (typeof jobMeta?.daysOld === 'number' && jobMeta.daysOld > 90);
  if (hasGhostKeywords || isGhostByMeta) {
    flags.push({ label: 'Ghost-Job Probability', color: '#eab308' });
  }

  // 10. Interview Phishing / Recruitment Scam Risk
  if (/(?:contact\s*(?:us\s*)?(?:on|via)\s*telegram|interview\s*(?:on|via)\s*telegram|telegram\s*(?:username|handle|app)\s*[:-]|wire\s+transfer\s+for\s+(?:home\s+)?equipment|check\s+(?:will\s+be\s+sent|deposit)\s+for\s+equipment|purchase\s+(?:your\s+own\s+)?(?:laptop|equipment)\s+and\s+(?:we\s+will\s+)?reimburse|cashier(?:'s)?\s+check|application\s+fee\s+required|pay\s+(?:to\s+)?(?:apply|start|join|train))/i.test(text)) {
    flags.push({ label: 'Interview Phishing / Scam Risk', color: '#ef4444' });
  }

  // 11. Resume Harvesting / Staffing Farm Risk
  if (/(?:confidential\s+client|undisclosed\s+client|resume\s+collection\s+only|general\s+pipeline\s+building|talent\s+community\s+submission|candidate\s+pool\s+building)/i.test(text)) {
    flags.push({ label: 'Resume Harvesting / Staffing Farm', color: '#f59e0b' });
  }

  // 12. Unpaid Trial / Labor Exploitation
  if (/(?:unpaid\s+(?:trial|assessment|project|task|take-?home)|free\s+trial\s+work|production\s+ready\s+(?:app|system)\s+as\s+interview|20\+\s*hours?\s+take-?home)/i.test(text)) {
    flags.push({ label: 'Unpaid Trial / Work Exploitation', color: '#ef4444' });
  }

  // 13. Stale Requisition (>45d) via metadata
  const daysOld = jobMeta?.freshness?.ageDays ?? (jobMeta?.posted_at ? Math.max(0, Math.floor((Date.now() - new Date(jobMeta.posted_at).getTime()) / (1000 * 60 * 60 * 24))) : (typeof jobMeta?.daysOld === 'number' ? jobMeta.daysOld : null));
  if (daysOld !== null && daysOld > 45 && daysOld <= 90) {
    flags.push({ label: 'Stale Requisition (>45d)', color: '#f97316' });
  }

  return flags;
}

// ── Company Health Score from Red Flag Array ──────────────────────────────────
/**
 * Converts a red flag array into a 0–100 health score with tier label.
 * 100 = clean, 0 = avoid.
 * @param {Array} flags - Output of detectJdRedFlags()
 * @returns {{ score: number, tier: 'clean'|'caution'|'risky'|'avoid', color: string, bg: string, label: string }}
 */
export function computeJobHealthScore(flags = []) {
  if (!Array.isArray(flags) || flags.length === 0) {
    return { score: 100, tier: 'clean', color: '#10b981', bg: 'rgba(16,185,129,0.12)', label: '✓ Clean' };
  }
  const SEVERITY = {
    'Interview Phishing / Scam Risk': 50,
    'Multi-Level / Commission Risk': 40,
    'Unpaid Trial / Work Exploitation': 40,
    'Unrealistic Requirements': 30,
    'Resume Harvesting / Staffing Farm': 30,
    'Ghost-Job Probability': 25,
    'Stale Requisition (>45d)': 20,
    'Visa Restriction': 20,
    'Burnout Risk': 15,
    'Under-Resourced': 15,
    'No Salary Listed': 10,
    'Vague Culture Filter': 10,
    'Informal Tone': 5
  };
  let penalty = 0;
  for (const flag of flags) {
    const flagLabel = typeof flag === 'string' ? flag : flag?.label;
    penalty += SEVERITY[flagLabel] || 10;
  }
  const score = Math.max(0, 100 - penalty);
  let tier = 'clean';
  let color = '#10b981';
  let bg = 'rgba(16,185,129,0.12)';
  let label = '✓ Clean';


  if (score < 50) {
    tier = 'avoid';
    color = '#ef4444';
    bg = 'rgba(239,68,68,0.15)';
    label = '⛔ Avoid';
  } else if (score < 70) {
    tier = 'risky';
    color = '#f59e0b';
    bg = 'rgba(245,158,11,0.15)';
    label = '⚡ Risky';
  } else if (score < 90) {
    tier = 'caution';
    color = '#38bdf8';
    bg = 'rgba(56,189,248,0.15)';
    label = '⚠️ Caution';
  }
  return { score, tier, color, bg, label };
}

// ── Adzuna Monthly Quota & BYOK Connection Helpers ─────────────────────────────

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

