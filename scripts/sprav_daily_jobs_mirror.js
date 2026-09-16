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
import { ALL_SOVEREIGN_TECH_COMPANIES } from '../src/utils/top_tech_companies_catalog.js';

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
    { name: 'Internships', url: 'https://raw.githubusercontent.com/SimplifyJobs/Summer2025-Internships/dev/.github/scripts/listings.json' }
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

  return jobs;
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
  console.log(`[SPrav V3 Universe] Starting high-volume ingestion across ${ALL_SOVEREIGN_TECH_COMPANIES.length} direct ATS boards, SimplifyJobs & Global APIs...`);

  // Phase 1: Parallel Direct ATS scrape (concurrency 10)
  const atsResults = await asyncPool(10, ALL_SOVEREIGN_TECH_COMPANIES, scrapeDirectAts);
  const atsJobs = atsResults.flat();
  console.log(`  ✓ Phase 1: Ingested ${atsJobs.length} roles from ${ALL_SOVEREIGN_TECH_COMPANIES.length} Direct ATS Boards.`);

  // Phase 2: SimplifyJobs Verified Community Feeds
  const simplifyJobs = await scrapeSimplifyJobs();
  console.log(`  ✓ Phase 2: Ingested ${simplifyJobs.length} roles from SimplifyJobs.`);

  // Phase 3: Open Global Tech APIs
  const apiJobs = await scrapeOpenApis();
  console.log(`  ✓ Phase 3: Ingested ${apiJobs.length} roles from Open Global APIs.`);

  // Phase 4: High-Efficiency Deduplication
  const allRaw = [...atsJobs, ...simplifyJobs, ...apiJobs];
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

  // Sort by newest first
  aggregatedJobs.sort((a, b) => new Date(b.posted_at || 0) - new Date(a.posted_at || 0));

  const outputDir = path.join(process.cwd(), 'dist_mirror');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifest = {
    updated_at: new Date().toISOString(),
    total_jobs: aggregatedJobs.length,
    boards_scraped: ALL_SOVEREIGN_TECH_COMPANIES.length,
    sources_breakdown: {
      direct_ats_boards: atsJobs.length,
      simplify_community: simplifyJobs.length,
      open_apis: apiJobs.length,
      unique_published: aggregatedJobs.length
    },
    version: '3.0.0-universe'
  };

  fs.writeFileSync(path.join(outputDir, 'mirror_manifest.json'), JSON.stringify(manifest, null, 2));

  // Write uncompressed and gzip compressed feeds (with latest.json.gz aliases)
  const jsonPayload = JSON.stringify(aggregatedJobs);
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json'), jsonPayload);
  fs.writeFileSync(path.join(outputDir, 'latest.json'), jsonPayload);

  const gzipped = zlib.gzipSync(Buffer.from(jsonPayload, 'utf-8'));
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json.gz'), gzipped);
  fs.writeFileSync(path.join(outputDir, 'latest.json.gz'), gzipped);

  // Write .nojekyll and index.html
  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  const templatePath = path.join(__dirname, 'feed_index.html');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, path.join(outputDir, 'index.html'));
  }

  const durationSec = ((Date.now() - t0) / 1000).toFixed(1);
  console.log(`[SPrav V3 Universe] Success! Published ${aggregatedJobs.length} verified jobs in ${durationSec}s (${(gzipped.length / 1024 / 1024).toFixed(2)} MB gzipped).`);
  return aggregatedJobs;
}

export const TARGET_BOARDS = ALL_SOVEREIGN_TECH_COMPANIES;
export const scrapeBoard = scrapeDirectAts;
export { scrapeDirectAts, scrapeSimplifyJobs, scrapeOpenApis };

// Direct execution entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDailyMirror().catch(err => {
    console.error('Fatal mirror error:', err);
    process.exit(1);
  });
}
