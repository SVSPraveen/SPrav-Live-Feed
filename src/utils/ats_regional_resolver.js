/**
 * ats_regional_resolver.js
 * =========================
 * Dedicated Regional ATS Registry and Location Resolution Engine.
 * Extracted from browser_ats_scanner.js for tree-shaking and faster scan startup.
 *
 * Responsibilities:
 * 1. Regional company lookups & domestic vs foreign company resolution (isKnownForeignCompany).
 * 2. Community & local company registry fetching, caching, and merging.
 * 3. Country code normalization (mapLocationToCountryCode) for global and regional endpoints.
 * 4. Location matching & Hacker News posting header parsing.
 */

import { storageVault } from './browser_storage_vault.js';
import {
  REGIONS,
  REGIONAL_ATS_COMPANIES,
  VERIFIED_WORKDAY_TENANTS,
  detectCandidateRegionFromScope,
  getRegionalCompanies
} from './regional_ats_registries.js';
import {
  COUNTRY_CITY_MAP,
  TECH_LOCATIONS,
  getGlobalLocationAliases,
  isLocationInRegion,
  matchLocationString as matchLocationStringTaxonomy
} from './country_city_taxonomy.js';

export {
  REGIONS,
  REGIONAL_ATS_COMPANIES,
  VERIFIED_WORKDAY_TENANTS,
  detectCandidateRegionFromScope,
  getRegionalCompanies,
  COUNTRY_CITY_MAP,
  TECH_LOCATIONS,
  getGlobalLocationAliases,
  isLocationInRegion
};

import { CURATED_ATS_COMPANIES } from './curated_ats_companies.js';
export { CURATED_ATS_COMPANIES };

// Regional company lookup sets for strict scope barrier filtering
export const INDIA_GCCS_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.india_gccs || {}).flat().map(c => String(c).toLowerCase().trim())
);
export const EUROPE_UK_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.europe_uk || {}).flat().map(c => String(c).toLowerCase().trim())
);
export const NORTH_AMERICA_COMPANIES = new Set(
  Object.values(REGIONAL_ATS_COMPANIES?.north_america || {}).flat().map(c => String(c).toLowerCase().trim())
);

/**
 * Checks whether a given company slug belongs to a known foreign entity (US, UK, Europe)
 * rather than an Indian tech company or GCC.
 *
 * @param {string} compSlug - Normalized company slug
 * @param {object} [curatedCompanies=CURATED_ATS_COMPANIES] - Optional curated catalog override
 * @returns {boolean} True if identified as foreign company
 */
export function isKnownForeignCompany(compSlug, curatedCompanies = CURATED_ATS_COMPANIES) {
  if (!compSlug) return false;
  const lower = compSlug.toLowerCase().trim();
  if (INDIA_GCCS_COMPANIES.has(lower)) return false;
  if (EUROPE_UK_COMPANIES.has(lower) || NORTH_AMERICA_COMPANIES.has(lower)) return true;
  for (const list of Object.values(curatedCompanies || {})) {
    if (Array.isArray(list) && list.some(c => c.toLowerCase() === lower)) {
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
 * Matches a job location string against a target location.
 */
export function matchLocationString(jobLoc, targetLoc) {
  return matchLocationStringTaxonomy(jobLoc, targetLoc);
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
