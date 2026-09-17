/**
 * scripts/sprav_daily_jobs_mirror.js
 * ===================================
 * Automated high-volume ATS & sovereign tech job aggregator for SPrav Job AI.
 * Designed to execute inside a free GitHub Actions cron job ($0 server cost).
 *
 * Ingests and normalizes:
 * 1. 159+ Direct ATS Career Boards (Ashby, Greenhouse, Lever, SmartRecruiters)
 * 2. SimplifyJobs Verified Community Feeds (New-Grad & Summer Internships)
 * 3. Open Global Tech Feeds (Arbeitnow & Remotive)
 *
 * Produces:
 * - dist_mirror/mirror_manifest.json
 * - dist_mirror/latest-tech-jobs.json & latest.json
 * - dist_mirror/latest-tech-jobs.json.gz & latest.json.gz
 * - dist_mirror/index.html & .nojekyll
 */

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';
import { ALL_SOVEREIGN_TECH_COMPANIES, WORKDAY_ENTERPRISE_TENANTS } from '../src/utils/top_tech_companies_catalog.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function fetchWithRetry(url, maxRetries = 1, timeoutMs = 3500) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, {
        headers: { 'User-Agent': 'SPrav-Job-AI-Daily-Mirror/3.0' },
        signal: AbortSignal.timeout(timeoutMs)
      });
      if (res.ok) return res;
    } catch (e) {
      if (i === maxRetries) return null;
    }
    await new Promise(r => setTimeout(r, 100 * (i + 1)));
  }
  return null;
}

// 1. Scrape Direct ATS Boards (Ashby, Greenhouse, Lever, SmartRecruiters)
async function scrapeDirectAts(board) {
  const jobs = [];
  try {
    if (board.platform === 'ashby') {
      const res = await fetchWithRetry(`https://api.ashbyhq.com/posting-api/job-board/${board.slug}`);
      if (res && res.ok) {
        const data = await res.json();
        for (const j of (data.jobs || [])) {
          jobs.push({
            id: `mirror_ashby_${board.slug}_${j.id}`,
            title: j.title || 'Software Engineer',
            company: board.name,
            location: j.location || 'Remote',
            url: j.jobUrl || `https://jobs.ashbyhq.com/${board.slug}/${j.id}`,
            source: 'ASHBY_MIRROR',
            portal: 'Ashby (Direct ATS)',
            category: board.category || 'Tech',
            description: `${j.title} at ${board.name}. ${j.descriptionPlain ? j.descriptionPlain.slice(0, 300) : ''}`,
            is_remote: !!j.isRemote || (j.location || '').toLowerCase().includes('remote'),
            posted_at: j.publishedAt || new Date().toISOString()
          });
        }
      }
    } else if (board.platform === 'greenhouse') {
      const res = await fetchWithRetry(`https://boards-api.greenhouse.io/v1/boards/${board.slug}/jobs?content=true`);
      if (res && res.ok) {
        const data = await res.json();
        for (const j of (data.jobs || [])) {
          jobs.push({
            id: `mirror_gh_${board.slug}_${j.id}`,
            title: j.title || 'Software Engineer',
            company: board.name,
            location: j.location?.name || 'Remote',
            url: j.absolute_url || `https://boards.greenhouse.io/${board.slug}`,
            source: 'GREENHOUSE_MIRROR',
            portal: 'Greenhouse (Direct ATS)',
            category: board.category || 'Tech',
            description: `${j.title} at ${board.name}. Location: ${j.location?.name || 'Remote'}.`,
            is_remote: (j.location?.name || '').toLowerCase().includes('remote'),
            posted_at: j.updated_at || new Date().toISOString()
          });
        }
      }
    } else if (board.platform === 'lever') {
      const res = await fetchWithRetry(`https://api.lever.co/v0/postings/${board.slug}?mode=json`);
      if (res && res.ok) {
        const data = await res.json();
        for (const j of (Array.isArray(data) ? data : [])) {
          jobs.push({
            id: `mirror_lever_${board.slug}_${j.id}`,
            title: j.text || 'Software Engineer',
            company: board.name,
            location: j.categories?.location || 'Remote',
            url: j.hostedUrl || `https://jobs.lever.co/${board.slug}/${j.id}`,
            source: 'LEVER_MIRROR',
            portal: 'Lever (Direct ATS)',
            category: board.category || 'Tech',
            description: `${j.text} at ${board.name}.`,
            is_remote: (j.categories?.location || '').toLowerCase().includes('remote') || !!j.workplaceType?.includes('remote'),
            posted_at: j.createdAt ? new Date(j.createdAt).toISOString() : new Date().toISOString()
          });
        }
      }
    } else if (board.platform === 'smartrecruiters') {
      const res = await fetchWithRetry(`https://api.smartrecruiters.com/v1/companies/${board.slug}/postings`);
      if (res && res.ok) {
        const data = await res.json();
        for (const j of (data.content || [])) {
          const loc = j.location?.city ? `${j.location.city}, ${j.location.country || ''}` : 'Remote';
          jobs.push({
            id: `mirror_sr_${board.slug}_${j.id}`,
            title: j.name || 'Software Engineer',
            company: board.name,
            location: loc,
            url: `https://jobs.smartrecruiters.com/${board.name}/${j.id}`,
            source: 'SMARTRECRUITERS_MIRROR',
            portal: 'SmartRecruiters (Direct ATS)',
            category: board.category || 'Tech',
            description: `${j.name} at ${board.name}.`,
            is_remote: loc.toLowerCase().includes('remote'),
            posted_at: j.releasedDate || new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    // Graceful error tolerance for individual board failure
  }
  return jobs;
}

// 2. Scrape SimplifyJobs Community Feeds
async function scrapeSimplifyJobs() {
  const jobs = [];
  const feeds = [
    { name: 'New-Grad', url: 'https://raw.githubusercontent.com/SimplifyJobs/New-Grad-Positions/dev/.github/scripts/listings.json' },
    { name: 'Internships 2025', url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json' },
    { name: 'Internships 2026', url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2026-Internships/dev/.github/scripts/listings.json' }
  ];

  for (const feed of feeds) {
    try {
      const res = await fetchWithRetry(feed.url, 1, 6000);
      if (res && res.ok) {
        const data = await res.json();
        const activeOnly = data.filter(j => j.active !== false && j.is_visible !== false);
        for (const j of activeOnly) {
          const locs = Array.isArray(j.locations) ? j.locations.join(', ') : (j.locations || 'Remote');
          jobs.push({
            id: `mirror_simplify_${j.id || Math.random().toString(36).slice(2, 9)}`,
            title: j.title || 'Software Engineer',
            company: j.company_name || 'Tech Employer',
            location: locs,
            url: j.url || j.company_url || '',
            source: 'SIMPLIFY_COMMUNITY_MIRROR',
            portal: 'Direct ATS (Simplify Verified)',
            category: j.category || 'Software Engineering',
            description: `${j.title} at ${j.company_name}. Sponsorship: ${j.sponsorship || 'Standard'}.`,
            is_remote: locs.toLowerCase().includes('remote'),
            posted_at: j.date_posted ? new Date(j.date_posted * 1000).toISOString() : new Date().toISOString()
          });
        }
      }
    } catch (e) {
      console.warn(`[Daily Mirror] Failed SimplifyJobs ${feed.name}:`, e.message);
    }
  }
  return jobs;
}

// 3. Scrape Open Global Tech APIs (Arbeitnow & Remotive)
async function scrapeOpenApis() {
  const jobs = [];
  // Arbeitnow
  try {
    const res = await fetchWithRetry('https://www.arbeitnow.com/api/job-board-api', 1, 5000);
    if (res && res.ok) {
      const json = await res.json();
      for (const j of (json.data || [])) {
        jobs.push({
          id: `mirror_arbeitnow_${j.slug || Math.random().toString(36).slice(2, 9)}`,
          title: j.title,
          company: j.company_name,
          location: j.location || (j.remote ? 'Remote' : 'Worldwide'),
          url: j.url,
          source: 'ARBEITNOW_MIRROR',
          portal: 'Arbeitnow Open Feed',
          category: (j.tags || []).join(', ') || 'Engineering',
          description: `${j.title} at ${j.company_name}. ${j.tags ? 'Tags: ' + j.tags.join(', ') : ''}`,
          is_remote: !!j.remote || (j.location || '').toLowerCase().includes('remote'),
          posted_at: j.created_at ? new Date(j.created_at * 1000).toISOString() : new Date().toISOString()
        });
      }
    }
  } catch (e) {}

  // Remotive
  try {
    const res = await fetchWithRetry('https://remotive.com/api/remote-jobs?category=software-dev&limit=100', 1, 5000);
    if (res && res.ok) {
      const json = await res.json();
      for (const j of (json.jobs || [])) {
        jobs.push({
          id: `mirror_remotive_${j.id}`,
          title: j.title,
          company: j.company_name,
          location: j.candidate_required_location || 'Remote',
          url: j.url,
          source: 'REMOTIVE_MIRROR',
          portal: 'Remotive Global Feed',
          category: j.category || 'Software Development',
          description: `${j.title} at ${j.company_name}. Salary: ${j.salary || 'Competitive'}.`,
          is_remote: true,
          salary: j.salary || null,
          posted_at: j.publication_date || new Date().toISOString()
        });
      }
    }
  } catch (e) {}

  // Jobicy Engineering API
  try {
    const res = await fetchWithRetry('https://jobicy.com/api/v2/remote-jobs?count=100&industry=engineering', 1, 5000);
    if (res && res.ok) {
      const json = await res.json();
      for (const j of (json.jobs || [])) {
        jobs.push({
          id: `mirror_jobicy_${j.id || Math.random().toString(36).slice(2, 9)}`,
          title: j.jobTitle,
          company: j.companyName,
          location: j.jobGeo || 'Remote',
          url: j.url,
          source: 'JOBICY_MIRROR',
          portal: 'Jobicy Remote Tech',
          category: j.jobIndustry || 'Engineering',
          description: `${j.jobTitle} at ${j.companyName}. Level: ${j.jobLevel || 'Any'}.`,
          is_remote: true,
          salary: (j.annualSalaryMin && j.annualSalaryMax) ? `${j.salaryCurrency || '$'}${j.annualSalaryMin} - ${j.annualSalaryMax}` : null,
          posted_at: j.pubDate || new Date().toISOString()
        });
      }
    }
  } catch (e) {}

  // Hacker News "Who is Hiring" Algolia Stream
  try {
    const res = await fetchWithRetry('https://hn.algolia.com/api/v1/search_by_date?tags=story,author_whoishiring&hitsPerPage=1', 1, 4000);
    if (res && res.ok) {
      const data = await res.json();
      const storyId = data.hits?.[0]?.objectID;
      if (storyId) {
        const commRes = await fetchWithRetry(`https://hn.algolia.com/api/v1/search?tags=comment,story_${storyId}&hitsPerPage=50`, 1, 4000);
        if (commRes && commRes.ok) {
          const commData = await commRes.json();
          for (const c of (commData.hits || [])) {
            const rawText = (c.comment_text || '').replace(/<[^>]+>/g, ' ');
            const lines = rawText.split('\n').map(l => l.trim()).filter(Boolean);
            const firstLine = lines[0] || 'Software Engineer';
            const parts = firstLine.split('|').map(p => p.trim());
            const company = parts[0] || 'Tech Startup (HN)';
            const title = parts[1] || 'Software Engineer';
            const loc = parts[2] || 'Remote / Hybrid';
            const hnUrl = `https://news.ycombinator.com/item?id=${c.objectID}`;

            jobs.push({
              id: `mirror_hn_${c.objectID}`,
              title: title.length > 80 ? title.slice(0, 77) + '...' : title,
              company: company.length > 50 ? company.slice(0, 47) + '...' : company,
              location: loc.length > 60 ? loc.slice(0, 57) + '...' : loc,
              url: hnUrl,
              source: 'HN_WHO_IS_HIRING',
              portal: 'Hacker News Who is Hiring',
              category: 'Startup & Foundation Engineering',
              description: rawText.slice(0, 400),
              is_remote: loc.toLowerCase().includes('remote'),
              posted_at: c.created_at || new Date().toISOString()
            });
          }
        }
      }
    }
  } catch (e) {}

  // RemoteOK Developer Stream
  try {
    const res = await fetchWithRetry('https://remoteok.com/api', 1, 5000);
    if (res && res.ok) {
      const json = await res.json();
      const devJobs = (Array.isArray(json) ? json.slice(1) : []).filter(j => j && j.position && j.url);
      for (const j of devJobs.slice(0, 100)) {
        jobs.push({
          id: `mirror_remoteok_${j.id || Math.random().toString(36).slice(2, 9)}`,
          title: j.position,
          company: j.company || 'Remote Tech Co',
          location: j.location || 'Remote',
          url: j.url,
          source: 'REMOTEOK_MIRROR',
          portal: 'RemoteOK Developer Feed',
          category: (j.tags || []).join(', ') || 'Software Development',
          description: `${j.position} at ${j.company}. Tags: ${(j.tags || []).join(', ')}.`,
          is_remote: true,
          salary: (j.salary_min && j.salary_max) ? `$${j.salary_min} - $${j.salary_max}` : null,
          posted_at: j.date || new Date().toISOString()
        });
      }
    }
  } catch (e) {}

  return jobs;
}

// 4. Scrape Workday Enterprise CXS Tenants (Fortune 500 Tech Titans)
async function scrapeWorkdayTenant(tenantConfig) {
  const { name, url, host, maxJobs = 100 } = tenantConfig;
  const jobs = [];
  const pageSize = 20;
  const maxPages = Math.ceil(maxJobs / pageSize);

  for (let page = 0; page < maxPages; page++) {
    const offset = page * pageSize;
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        },
        body: JSON.stringify({ appliedFacets: {}, limit: pageSize, offset, searchText: '' }),
        signal: AbortSignal.timeout(4500)
      });
      if (!res.ok) break;
      const data = await res.json();
      const postings = data.jobPostings || [];
      if (postings.length === 0) break;

      for (const p of postings) {
        const fullUrl = p.externalPath ? `${host}${p.externalPath.startsWith('/') ? '' : '/'}${p.externalPath}` : host;
        jobs.push({
          id: `mirror_workday_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${p.bulletFields?.[0] || Math.random().toString(36).slice(2, 9)}`,
          title: p.title || 'Software Engineer',
          company: name,
          location: p.locationsText || 'Multiple Locations',
          url: fullUrl,
          source: 'WORKDAY_CXS_ENTERPRISE',
          portal: `${name} Workday Careers`,
          category: 'Enterprise Engineering',
          description: `${p.title} at ${name}. Locations: ${p.locationsText || 'Global'}.`,
          is_remote: (p.locationsText || '').toLowerCase().includes('remote'),
          posted_at: new Date().toISOString()
        });
      }
      if (postings.length < pageSize) break;
    } catch (e) {
      break;
    }
  }
  return jobs;
}

// 5. Scrape High-Volume Open Tech Universe Stream (29,000+ Company ATS Index)
async function scrapeUniverseStream(chunkCount = 4) {
  const chunkIds = Array.from({ length: chunkCount }, (_, i) => i);
  try {
    const chunkPromises = chunkIds.map(async id => {
      try {
        const res = await fetchWithRetry(`https://raw.githubusercontent.com/Feashliaa/job-board-data/main/data/chunks/jobs_chunk_${id}.json.gz`, 1, 8000);
        if (!res || !res.ok) return [];
        const buf = await res.arrayBuffer();
        const decompressed = zlib.gunzipSync(Buffer.from(buf));
        const list = JSON.parse(decompressed.toString('utf-8'));
        if (!Array.isArray(list)) return [];
        const mapped = [];
        for (const j of list) {
          if (!j || !j.title || !j.company) continue;
          const ats = (j.ats || 'ATS').trim();
          let salaryRange = null;
          if (j.salary && j.salary.median) {
            const p25 = j.salary.p25 ? Math.round(j.salary.p25 / 1000) : null;
            const p75 = j.salary.p75 ? Math.round(j.salary.p75 / 1000) : null;
            salaryRange = p25 && p75 ? `$${p25}k - $${p75}k` : `~$${Math.round(j.salary.median / 1000)}k/yr`;
          }
          mapped.push({
            id: `mirror_univ_${ats.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Math.random().toString(36).slice(2, 9)}`,
            title: j.title.trim(),
            company: j.company.trim(),
            location: j.location || 'Remote',
            url: j.url || `https://jobs.${ats.toLowerCase()}.com`,
            source: `${ats.toUpperCase()}_UNIVERSE`,
            portal: `${ats} (Universe Index)`,
            category: 'Engineering & Tech',
            description: `${j.title} at ${j.company}. Level: ${j.skill_level || 'General'}. Location: ${j.location || 'Remote'}.${salaryRange ? ' Compensation: ' + salaryRange : ''}`,
            salary: salaryRange,
            is_remote: !j.location || /remote|anywhere|virtual/i.test(j.location),
            posted_at: j.first_seen || j.scraped_at || new Date().toISOString()
          });
        }
        return mapped;
      } catch (err) {
        console.warn(`[Daily Mirror] Failed universe chunk ${id}:`, err.message);
        return [];
      }
    });

    const chunkResults = await Promise.all(chunkPromises);
    return chunkResults.flat();
  } catch (e) {
    console.warn('[Daily Mirror] Universe stream error:', e.message);
    return [];
  }
}

// Concurrency Pool Helper
async function asyncPool(limit, items, fn) {
  const results = [];
  const executing = [];
  for (const item of items) {
    const p = Promise.resolve().then(() => fn(item));
    results.push(p);
    if (limit <= items.length) {
      const e = p.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);
      if (executing.length >= limit) {
        await Promise.race(executing);
      }
    }
  }
  return Promise.all(results);
}

// Main Aggregator Execution
export async function runDailyMirror() {
  const t0 = Date.now();
  console.log(`[SPrav V4 Universe] Starting massive ingestion across ${ALL_SOVEREIGN_TECH_COMPANIES.length} direct ATS boards, ${WORKDAY_ENTERPRISE_TENANTS.length} Workday Titans, SimplifyJobs & Global APIs...`);

  // Phase 1: Parallel Direct ATS scrape (concurrency 12)
  const atsResults = await asyncPool(12, ALL_SOVEREIGN_TECH_COMPANIES, scrapeDirectAts);
  const atsJobs = atsResults.flat();
  console.log(`  ✓ Phase 1: Ingested ${atsJobs.length} roles from ${ALL_SOVEREIGN_TECH_COMPANIES.length} Direct ATS Boards.`);

  // Phase 2: Workday Enterprise CXS Titans
  const workdayResults = await asyncPool(6, WORKDAY_ENTERPRISE_TENANTS, scrapeWorkdayTenant);
  const workdayJobs = workdayResults.flat();
  console.log(`  ✓ Phase 2: Ingested ${workdayJobs.length} roles from ${WORKDAY_ENTERPRISE_TENANTS.length} Enterprise Workday Tenants.`);

  // Phase 3: SimplifyJobs Verified Community Feeds
  const simplifyJobs = await scrapeSimplifyJobs();
  console.log(`  ✓ Phase 3: Ingested ${simplifyJobs.length} roles from SimplifyJobs.`);

  // Phase 4: Open Global Tech APIs & Streams
  const apiJobs = await scrapeOpenApis();
  console.log(`  ✓ Phase 4: Ingested ${apiJobs.length} roles from Open Global APIs & Streams.`);

  // Phase 5: High-Volume Open Tech Universe Stream (5 chunks = 125k roles -> 100k+ unique)
  const universeJobs = await scrapeUniverseStream(5);
  console.log(`  ✓ Phase 5: Ingested ${universeJobs.length} roles from Universe ATS Stream.`);

  // Phase 6: High-Efficiency Deduplication
  const allRaw = [...atsJobs, ...workdayJobs, ...simplifyJobs, ...apiJobs, ...universeJobs];
  const seenUrls = new Set();
  const seenSignatures = new Set();
  const aggregatedJobs = [];

  for (const j of allRaw) {
    if (!j.url || !j.title || !j.company) continue;
    const cleanUrl = j.url.toLowerCase().split('?')[0].replace(/\/$/, '');
    const signature = `${j.company.toLowerCase().trim()}:::${j.title.toLowerCase().trim()}`;
    if (seenUrls.has(cleanUrl) || seenSignatures.has(signature)) continue;
    seenUrls.add(cleanUrl);
    seenSignatures.add(signature);
    aggregatedJobs.push(j);
  }

  // Calculate distinct companies
  const distinctCompanies = new Set();
  for (const j of aggregatedJobs) {
    if (j.company) distinctCompanies.add(j.company.toLowerCase().trim());
  }

  // Sort by newest first
  aggregatedJobs.sort((a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0));

  const outputDir = path.join(process.cwd(), 'dist_mirror');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifest = {
    updated_at: new Date().toISOString(),
    total_jobs: aggregatedJobs.length,
    companies_count: distinctCompanies.size,
    boards_scraped: ALL_SOVEREIGN_TECH_COMPANIES.length + WORKDAY_ENTERPRISE_TENANTS.length,
    sources_breakdown: {
      direct_ats_boards: atsJobs.length,
      workday_enterprise: workdayJobs.length,
      simplify_community: simplifyJobs.length,
      open_apis: apiJobs.length,
      universe_stream: universeJobs.length,
      unique_published: aggregatedJobs.length,
      distinct_companies: distinctCompanies.size
    },
    version: '4.0.0-universe'
  };

  fs.writeFileSync(path.join(outputDir, 'mirror_manifest.json'), JSON.stringify(manifest, null, 2));

  // Write uncompressed and gzip compressed feeds (with latest.json.gz aliases)
  const jsonPayload = JSON.stringify(aggregatedJobs);
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json'), jsonPayload);
  fs.writeFileSync(path.join(outputDir, 'latest.json'), jsonPayload);

  const gzipped = zlib.gzipSync(Buffer.from(jsonPayload, 'utf-8'));
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json.gz'), gzipped);
  fs.writeFileSync(path.join(outputDir, 'latest.json.gz'), gzipped);

  // Write lite tier (top 15,000 roles)
  const litePayload = JSON.stringify(aggregatedJobs.slice(0, 15000));
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs-lite.json'), litePayload);
  const liteGzipped = zlib.gzipSync(Buffer.from(litePayload, 'utf-8'));
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs-lite.json.gz'), liteGzipped);

  // Write .nojekyll and index.html
  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  const templatePath = path.join(__dirname, 'feed_index.html');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, path.join(outputDir, 'index.html'));
  }

  // Write vercel.json into dist_mirror so Vercel skips/ignores preview builds on sovereign-job-feed branch
  const mirrorVercelConfig = {
    version: 2,
    buildCommand: "echo 'Sovereign job feed data branch - skipping compilation'",
    outputDirectory: ".",
    ignoreCommand: "exit 0"
  };
  fs.writeFileSync(path.join(outputDir, 'vercel.json'), JSON.stringify(mirrorVercelConfig, null, 2));

  // Write minimal package.json into dist_mirror so Vercel detects a valid no-op build script if triggered
  const mirrorPackageJson = {
    name: "sprav-sovereign-job-feed",
    private: true,
    version: "1.0.0",
    description: "SPrav Sovereign Daily Jobs Mirror Data Feed",
    scripts: {
      build: "echo 'Sovereign job feed data branch - skipping compilation'"
    }
  };
  fs.writeFileSync(path.join(outputDir, 'package.json'), JSON.stringify(mirrorPackageJson, null, 2));

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[SPrav V4 Universe] Success! Published ${aggregatedJobs.length} verified jobs across ${distinctCompanies.size} companies in ${durationSec}s (${(gzipped.length / 1024 / 1024).toFixed(2)} MB full .gz / ${(liteGzipped.length / 1024).toFixed(0)} KB lite .gz).`);
  return aggregatedJobs;
}

export const TARGET_BOARDS = ALL_SOVEREIGN_TECH_COMPANIES;
export const scrapeBoard = scrapeDirectAts;
export { scrapeDirectAts, scrapeWorkdayTenant, scrapeSimplifyJobs, scrapeOpenApis, scrapeUniverseStream, WORKDAY_ENTERPRISE_TENANTS };

// Direct execution entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDailyMirror().catch(err => {
    console.error('Fatal mirror error:', err);
    process.exit(1);
  });
}

