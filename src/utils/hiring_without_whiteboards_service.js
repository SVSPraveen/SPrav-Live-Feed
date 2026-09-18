/**
 * hiring_without_whiteboards_service.js
 * 
 * Fetches, parses, and caches the curated list of companies that don't do whiteboard interviews
 * from the authoritative "Hiring Without Whiteboards" repository (poteto/hiring-without-whiteboards).
 * 
 * Sources:
 * - Master Registry: https://raw.githubusercontent.com/poteto/hiring-without-whiteboards/master/README.md (CORS open)
 * - Dynamic Issues & PRs: https://api.github.com/repos/poteto/hiring-without-whiteboards/issues?state=all&per_page=50
 * 
 * High signal for senior developers and tech talent who prioritize practical engineering assessments
 * (take-homes, pair programming, architecture discussions) over LeetCode/trivia tests.
 */

const HWOW_RAW_README_URL = 'https://raw.githubusercontent.com/poteto/hiring-without-whiteboards/master/README.md';
const HWOW_ISSUES_API_URL = 'https://api.github.com/repos/poteto/hiring-without-whiteboards/issues?state=all&per_page=50';
const CACHE_KEY = 'sprav_hwow_companies_cache';
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Top curated seed companies from Hiring Without Whiteboards
 * Used as immediate offline fallback if network/rate-limits occur.
 */
export const CURATED_HWOW_SEED = [
  {
    name: 'Airtable',
    careers_url: 'https://airtable.com/careers',
    location: 'San Francisco, CA; Austin, TX; Mountain View, CA; New York, NY; Remote',
    interview_notes: 'Take-home project resembling real Airtable product challenges. Discussion of project, UI design, architectural tradeoffs, and debugging.',
    platform: 'greenhouse',
    slug: 'airtable'
  },
  {
    name: 'Adyen',
    careers_url: 'https://www.adyen.com/careers',
    location: 'Amsterdam, NL / Global / Remote',
    interview_notes: 'Take-home assignment, design discussion based on take home, culture fit. Provides visa sponsorship to the Netherlands.',
    platform: 'greenhouse',
    slug: 'adyen'
  },
  {
    name: 'Storyblok',
    careers_url: 'https://www.storyblok.com/jobs',
    location: 'Remote / Global',
    interview_notes: 'Practical code challenge and architecture walkthrough based on headless CMS integration.',
    platform: 'greenhouse',
    slug: 'storyblok'
  },
  {
    name: 'Abstract',
    careers_url: 'https://www.abstract.com/about#careers',
    location: 'San Francisco, CA / Remote',
    interview_notes: 'Real-world problem solving, code review discussion, and architecture collaboration.',
    platform: 'greenhouse',
    slug: 'abstract'
  },
  {
    name: 'Airbase',
    careers_url: 'https://www.airbase.com/careers',
    location: 'San Francisco, CA; Bangalore, India; Remote',
    interview_notes: 'Small take-home project, two tech rounds with engineers on real-world engineering problems.',
    platform: 'greenhouse',
    slug: 'airbase'
  },
  {
    name: 'Supabase',
    careers_url: 'https://jobs.ashbyhq.com/supabase',
    location: 'Remote (Worldwide)',
    interview_notes: 'Asynchronous pairing, open-source portfolio discussion, and pragmatic technical chat.',
    platform: 'ashby',
    slug: 'supabase'
  },
  {
    name: 'Acko',
    careers_url: 'https://www.acko.com/careers',
    location: 'Mumbai / Bangalore, India',
    interview_notes: 'Phone interview, followed by small take-home problem, finally a pair programming session.',
    platform: 'lever',
    slug: 'acko'
  },
  {
    name: 'Adaface',
    careers_url: 'https://www.adaface.com/careers',
    location: 'Remote / Singapore / Bangalore, India',
    interview_notes: 'Conversational on-the-job technical assessment, followed by video calls with technical lead and founders.',
    platform: 'greenhouse',
    slug: 'adaface'
  },
  {
    name: 'Accredible',
    careers_url: 'https://www.accredible.com/careers',
    location: 'Cambridge, UK / San Francisco, CA / Remote',
    interview_notes: 'Take-home project, then pair-programming and discussion on real-world problems.',
    platform: 'greenhouse',
    slug: 'accredible'
  },
  {
    name: 'Able',
    careers_url: 'https://able.co/careers',
    location: 'Lima, PE / Remote',
    interview_notes: 'Practical technical interview (Backlog Refinement + System Design), Leadership interview.',
    platform: 'lever',
    slug: 'able'
  },
  {
    name: '1000.software',
    careers_url: 'https://www.1000.software/careers',
    location: 'Krakow, Poland / Remote',
    interview_notes: 'Two interviews: soft skills, technical skills on solving specific real-world problems, sometimes a simple take-home.',
    platform: 'auto',
    slug: '1000software'
  },
  {
    name: 'Basecamp',
    careers_url: 'https://basecamp.com/about/jobs',
    location: 'Remote Worldwide',
    interview_notes: 'Work-sample reviews and conversations about past projects and pragmatic web software design.',
    platform: 'auto',
    slug: 'basecamp'
  }
];

/**
 * Extracts ATS platform type and slug from careers URL or company name.
 */
export function extractAtsDetailsFromUrl(url = '', name = '') {
  const cleanUrl = String(url || '').toLowerCase().trim();
  const cleanName = String(name || '').trim();
  let platform = 'auto';
  let slug = cleanName.toLowerCase().replace(/[^a-z0-9_-]/g, '');

  if (cleanUrl.includes('greenhouse.io')) {
    platform = 'greenhouse';
    const match = cleanUrl.match(/greenhouse\.io\/(?:v1\/boards\/)?([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) slug = match[1];
  } else if (cleanUrl.includes('ashbyhq.com')) {
    platform = 'ashby';
    const match = cleanUrl.match(/ashbyhq\.com\/(?:job-board\/)?([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) slug = match[1];
  } else if (cleanUrl.includes('lever.co')) {
    platform = 'lever';
    const match = cleanUrl.match(/lever\.co\/([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) slug = match[1];
  } else if (cleanUrl.includes('smartrecruiters.com')) {
    platform = 'smartrecruiters';
    const match = cleanUrl.match(/smartrecruiters\.com\/(?:[a-zA-Z0-9_-]+\/)?([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) slug = match[1];
  } else if (cleanUrl.includes('workable.com')) {
    platform = 'workable';
    const match = cleanUrl.match(/apply\.workable\.com\/([a-zA-Z0-9_-]+)/i) || cleanUrl.match(/workable\.com\/j\/([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) slug = match[1];
  } else if (cleanUrl.includes('recruitee.com')) {
    platform = 'recruitee';
    const match = cleanUrl.match(/([a-zA-Z0-9_-]+)\.recruitee\.com/i);
    if (match?.[1]) slug = match[1];
  }

  return { platform, slug };
}

/**
 * Parses markdown lines from the Hiring Without Whiteboards README.
 * Format: - [Company Name](url) | Location | Interview notes
 */
export function parseHwowReadme(markdownText = '') {
  if (!markdownText || typeof markdownText !== 'string') return [];

  const companies = [];
  const lines = markdownText.split('\n');
  const ignorePatterns = [
    /HackerNews/i,
    /Discussion/i,
    /Finding a better alternative/i,
    /How to hire/i,
    /How I Hire/i,
    /RECOMMENDATIONS/i,
    /pull\/new/i
  ];

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line.startsWith('- [')) continue;

    // Pattern: - [Name](url) | Location | Interview Notes
    // or: - [Name](url) | Location
    // or: - [Name](url)
    const match = line.match(/^-\s*\[([^\]]+)\]\(([^)]+)\)(?:\s*\|\s*([^|\n]+))?(?:\s*\|\s*(.+))?$/);
    if (!match) continue;

    const name = match[1].trim();
    const url = match[2].trim();
    const location = match[3] ? match[3].trim() : 'Remote / Global';
    const interview_notes = match[4] ? match[4].trim() : 'Real-world problem solving & practical technical evaluation.';

    if (!name || !url) continue;

    // Skip discussion/meta links by testing company name or url
    if (ignorePatterns.some(pat => pat.test(name) || pat.test(url))) continue;

    const { platform, slug } = extractAtsDetailsFromUrl(url, name);

    companies.push({
      name,
      careers_url: url,
      location,
      interview_notes,
      platform,
      slug,
      source: 'Hiring Without Whiteboards'
    });
  }

  return companies;
}

/**
 * Parses GitHub issues / PRs list to extract newly submitted companies.
 */
export function parseHwowIssues(issuesList = []) {
  if (!Array.isArray(issuesList)) return [];
  const companies = [];

  for (const issue of issuesList) {
    if (!issue || !issue.title) continue;
    const title = issue.title.trim();

    // Look for typical PR titles like "Add CompanyName", "Add Acme Corp", "CompanyName - Location"
    let companyName = null;
    const addMatch = title.match(/^Add\s+([A-Za-z0-9\s._-]+?)(?:\s+careers|\s+process|\s+interview|\s*\(.*?\))?$/i);
    if (addMatch?.[1]) {
      companyName = addMatch[1].trim();
    } else if (title.includes(' - ') && !title.toLowerCase().startsWith('fix') && !title.toLowerCase().startsWith('update')) {
      companyName = title.split(' - ')[0].trim();
    }

    if (companyName && companyName.length > 1 && !companyName.toLowerCase().includes('readme') && !companyName.toLowerCase().includes('links')) {
      const { platform, slug } = extractAtsDetailsFromUrl('', companyName);
      companies.push({
        name: companyName,
        careers_url: issue.html_url || '',
        location: 'Remote / Multi-region',
        interview_notes: issue.body ? issue.body.substring(0, 200).replace(/\r?\n/g, ' ') : 'Community submitted real-world interview process.',
        platform,
        slug,
        source: 'HWOW Community Issue'
      });
    }
  }

  return companies;
}

/**
 * Fetches all Hiring Without Whiteboards companies with local caching.
 * Falls back to curated seed companies if offline or network fails.
 */
export async function fetchHwowCompanies(options = {}) {
  const { forceRefresh = false, signal = null } = options;

  // 1. Check local cache unless forced
  if (!forceRefresh && typeof localStorage !== 'undefined') {
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { timestamp, data } = JSON.parse(cached);
        if (Date.now() - timestamp < CACHE_TTL_MS && Array.isArray(data) && data.length > 0) {
          return data;
        }
      }
    } catch {
      // Ignore cache read error
    }
  }

  try {
    // 2. Fetch master README from GitHub Raw
    const readmeRes = await fetch(HWOW_RAW_README_URL, {
      headers: { 'Accept': 'text/plain' },
      signal: signal ? signal : AbortSignal.timeout?.(8000)
    });

    if (readmeRes.ok) {
      const text = await readmeRes.text();
      const parsed = parseHwowReadme(text);

      if (parsed.length > 0) {
        // Cache parsed companies
        if (typeof localStorage !== 'undefined') {
          try {
            localStorage.setItem(CACHE_KEY, JSON.stringify({
              timestamp: Date.now(),
              data: parsed
            }));
          } catch {
            // Storage quota exceeded or disabled
          }
        }
        return parsed;
      }
    }
  } catch (err) {
    console.warn('[HWOW Service] Failed to fetch raw README, attempting fallback:', err.message);
  }

  // 3. Optional: check dynamic issues API if available
  try {
    const issuesRes = await fetch(HWOW_ISSUES_API_URL, {
      headers: { 'Accept': 'application/vnd.github.v3+json' },
      signal: signal ? signal : AbortSignal.timeout?.(5000)
    });
    if (issuesRes.ok) {
      const issuesData = await issuesRes.json();
      const issueCompanies = parseHwowIssues(issuesData);
      if (issueCompanies.length > 0) {
        return [...CURATED_HWOW_SEED, ...issueCompanies];
      }
    }
  } catch {
    // Issues fetch failed or rate limited
  }

  // 4. Return offline seed as guaranteed fallback
  return CURATED_HWOW_SEED;
}
