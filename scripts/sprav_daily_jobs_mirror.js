/**
 * scripts/sprav_daily_jobs_mirror.js
 * ===================================
 * Automated high-volume ATS & sovereign tech job aggregator for SPrav Job AI.
 * Designed to execute inside a free GitHub Actions cron job ($0 server cost).
 *
 * Ingests and normalizes:
 * 1. 350+ Direct ATS Career Boards (Ashby, Greenhouse, Lever, SmartRecruiters)
 * 2. SimplifyJobs Verified Community Feeds (New-Grad & Summer Internships)
 * 3. Open Global Tech Feeds (Himalayas, Arbeitnow, Remotive, Jobicy, RemoteOK, Hacker News)
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
import { CURATED_ATS_COMPANIES } from '../src/utils/browser_ats_scanner.js';
import { filterCleanActiveJobs, chunkAndCompressJobs } from './sprav_universe_chunker.js';

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

// 1. Scrape Direct ATS Boards (Ashby, Greenhouse, Lever, SmartRecruiters, Recruitee, Workable, Personio, BambooHR, Rippling)
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
    } else if (board.platform === 'recruitee') {
      let offers = [];
      const res = await fetchWithRetry(`https://api.recruitee.com/c/${board.slug}/jobs`);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs) && data.jobs.length > 0) offers = data.jobs;
      }
      if (offers.length === 0) {
        const resOffers = await fetchWithRetry(`https://${board.slug}.recruitee.com/api/offers/`);
        if (resOffers && resOffers.ok) {
          const data = await resOffers.json();
          offers = Array.isArray(data.offers) ? data.offers : (Array.isArray(data.jobs) ? data.jobs : []);
        }
      }
      for (const j of offers) {
        const isRemote = !!j.remote || !!j.telecommuting || (j.location || '').toLowerCase().includes('remote');
        jobs.push({
          id: `mirror_recruitee_${board.slug}_${j.id || j.slug}`,
          title: j.title || 'Engineering Role',
          company: board.name,
          location: j.location || (isRemote ? 'Remote' : 'Onsite'),
          url: j.careers_url || `https://${board.slug}.recruitee.com/o/${j.slug || j.id}`,
          source: 'RECRUITEE_MIRROR',
          portal: 'Recruitee (Direct ATS)',
          category: board.category || 'European Tech',
          description: `${j.title} at ${board.name}. ${j.description ? String(j.description).replace(/<[^>]+>/g, ' ').slice(0, 300) : ''}`,
          is_remote: isRemote,
          posted_at: j.created_at || j.published_at || new Date().toISOString()
        });
      }
    } else if (board.platform === 'workable') {
      let wJobs = [];
      const res = await fetchWithRetry(`https://apply.workable.com/api/v1/widget/accounts/${board.slug}?details=true`);
      if (res && res.ok) {
        const data = await res.json();
        if (Array.isArray(data.jobs)) wJobs = data.jobs;
      }
      if (wJobs.length === 0) {
        const res2 = await fetchWithRetry(`https://apply.workable.com/api/v2/accounts/${board.slug}/jobs`);
        if (res2 && res2.ok) {
          const data = await res2.json();
          if (Array.isArray(data.results)) wJobs = data.results;
          else if (Array.isArray(data.jobs)) wJobs = data.jobs;
        }
      }
      for (const j of wJobs) {
        const isRemote = !!j.telecommuting || (j.workplace || '').toLowerCase() === 'remote' || (j.city || '').toLowerCase().includes('remote');
        const locStr = [j.city, j.country].filter(Boolean).join(', ') || (isRemote ? 'Remote' : 'Onsite');
        jobs.push({
          id: `mirror_workable_${board.slug}_${j.shortcode || j.id}`,
          title: j.title || 'Engineering Role',
          company: board.name,
          location: locStr,
          url: j.url || `https://apply.workable.com/${board.slug}/j/${j.shortcode || j.id}/`,
          source: 'WORKABLE_MIRROR',
          portal: 'Workable (Direct ATS)',
          category: board.category || 'High-Growth Tech',
          description: `${j.title} at ${board.name}. ${j.description ? String(j.description).replace(/<[^>]+>/g, ' ').slice(0, 300) : ''}`,
          is_remote: isRemote,
          posted_at: j.published_on ? new Date(j.published_on).toISOString() : new Date().toISOString()
        });
      }
    } else if (board.platform === 'personio') {
      const res = await fetchWithRetry(`https://${board.slug}.jobs.personio.de/xml`);
      if (res && res.ok) {
        const xmlText = await res.text();
        const posBlocks = xmlText.split(/<position[\s>]/i).slice(1);
        for (const block of posBlocks) {
          const posId = (block.match(/<id>(.*?)<\/id>/is)?.[1] || Math.random().toString(36).slice(2, 8)).trim();
          const posName = (block.match(/<name>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/name>/is)?.[1] || 'Software Engineer').trim();
          const office = (block.match(/<office>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/office>/is)?.[1] || 'Remote').trim();
          const isRemote = office.toLowerCase().includes('remote') || posName.toLowerCase().includes('remote');
          jobs.push({
            id: `mirror_personio_${board.slug}_${posId}`,
            title: posName,
            company: board.name,
            location: office || (isRemote ? 'Remote' : 'Onsite'),
            url: `https://${board.slug}.jobs.personio.de/job/${posId}`,
            source: 'PERSONIO_MIRROR',
            portal: 'Personio (Direct ATS)',
            category: board.category || 'European Tech',
            description: `${posName} at ${board.name}. Office: ${office}.`,
            is_remote: isRemote,
            posted_at: new Date().toISOString()
          });
        }
      }
    } else if (board.platform === 'bamboohr') {
      const res = await fetchWithRetry(`https://${board.slug}.bamboohr.com/jobs/embed2.php?version=1.0.0&format=json`);
      if (res && res.ok) {
        const data = await res.json();
        for (const dept of (data.departments || [])) {
          for (const pos of (dept.positions || [])) {
            const isRemote = (pos.location || '').toLowerCase().includes('remote') || (pos.name || '').toLowerCase().includes('remote');
            jobs.push({
              id: `mirror_bamboohr_${board.slug}_${pos.id}`,
              title: pos.name || 'Engineering Role',
              company: board.name,
              location: pos.location || (isRemote ? 'Remote' : 'Onsite'),
              url: pos.url || `https://${board.slug}.bamboohr.com/careers/${pos.id}`,
              source: 'BAMBOOHR_MIRROR',
              portal: 'BambooHR (Direct ATS)',
              category: board.category || 'Tech',
              description: `${pos.name} at ${board.name}. ${dept.label ? 'Dept: ' + dept.label : ''}`,
              is_remote: isRemote,
              posted_at: new Date().toISOString()
            });
          }
        }
      }
    } else if (board.platform === 'rippling') {
      const res = await fetchWithRetry(`https://ats.rippling.com/${board.slug}/jobs`);
      if (res && res.ok) {
        const html = await res.text();
        const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>(.*?)<\/script>/s);
        if (nextDataMatch) {
          const data = JSON.parse(nextDataMatch[1]);
          const queries = data?.props?.pageProps?.dehydratedState?.queries || [];
          const jobQuery = queries.find(q => Array.isArray(q.queryKey) && q.queryKey[2] === 'job-posts');
          const items = Array.isArray(jobQuery?.state?.data?.items) ? jobQuery.state.data.items : [];
          for (const j of items) {
            const locations = Array.isArray(j.locations) ? j.locations : [];
            const locName = locations.map(l => l.name).filter(Boolean).join('; ') || 'Remote';
            const isRemote = locations.some(l => l.workplaceType === 'REMOTE' || (l.name || '').toLowerCase().includes('remote')) ||
              (j.name || '').toLowerCase().includes('remote');
            jobs.push({
              id: `mirror_rippling_${board.slug}_${j.id}`,
              title: j.name || 'Engineering Role',
              company: board.name,
              location: locName,
              url: j.url || `https://ats.rippling.com/${board.slug}/jobs/${j.id}`,
              source: 'RIPPLING_MIRROR',
              portal: 'Rippling (Direct ATS)',
              category: board.category || 'Startup Engineering',
              description: `${j.name} at ${board.name}. Location: ${locName}.`,
              is_remote: isRemote,
              posted_at: new Date().toISOString()
            });
          }
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

// 3. Scrape Open Global Tech APIs (Himalayas, Arbeitnow, Remotive, Jobicy, HN, RemoteOK)
async function scrapeOpenApis() {
  const jobs = [];
  const seenIds = new Set();

  const addJob = (job) => {
    if (job && job.url && !seenIds.has(job.url)) {
      seenIds.add(job.url);
      jobs.push(job);
    }
  };

  // ── Himalayas: Free public CORS API, cursor-paginated (800–1000 quality remote tech roles)
  try {
    let cursor = null;
    let himalayasCount = 0;
    const HIMALAYAS_MAX = 1000;
    while (himalayasCount < HIMALAYAS_MAX) {
      const url = new URL('https://himalayas.app/jobs/api');
      url.searchParams.set('limit', '100');
      if (cursor) url.searchParams.set('cursor', cursor);
      const res = await fetchWithRetry(url.toString(), 1, 6000);
      if (!res || !res.ok) break;
      const json = await res.json();
      const rawJobs = Array.isArray(json.jobs) ? json.jobs : [];
      if (rawJobs.length === 0) break;

      for (const j of rawJobs) {
        if (!j || !j.title) continue;
        const company = j.company?.name || j.companyName || 'Tech Company';
        const location = j.location?.name || j.locationPolicy || 'Remote';
        let salaryRange = null;
        if (j.minSalary && j.maxSalary) {
          const sym = (j.currency || 'USD') === 'USD' ? '$' : (j.currency || '') + ' ';
          salaryRange = `${sym}${Math.round(j.minSalary / 1000)}k – ${sym}${Math.round(j.maxSalary / 1000)}k`;
        }
        addJob({
          id: `mirror_himalayas_${j.slug || j.id || Math.random().toString(36).slice(2, 9)}`,
          title: j.title.trim(),
          company,
          location,
          url: j.applicationLink || j.url || `https://himalayas.app/jobs/${j.slug || ''}`,
          source: 'HIMALAYAS_MIRROR',
          portal: 'Himalayas Remote Tech',
          category: (j.categories || [])[0] || 'Engineering',
          description: j.description
            ? j.description.replace(/<[^>]+>/g, ' ').slice(0, 300).trim()
            : `${j.title} at ${company}. ${(j.categories || []).join(', ')}.`,
          salary: salaryRange,
          is_remote: j.locationPolicy === 'remote' || /remote|worldwide|anywhere/i.test(location),
          posted_at: j.publishedAt || j.createdAt || new Date().toISOString()
        });
        himalayasCount++;
        if (himalayasCount >= HIMALAYAS_MAX) break;
      }

      cursor = json.nextCursor || null;
      if (!cursor) break;
      await new Promise(r => setTimeout(r, 200)); // courteous delay between pages
    }
    console.log(`    → Himalayas: ${himalayasCount} jobs ingested`);
  } catch (e) {
    console.warn('[Daily Mirror] Himalayas fetch failed:', e.message);
  }


  // ── Arbeitnow: Paginate 5 pages (~400 jobs, EU & global ATS aggregator)
  try {
    let arbeitnowCount = 0;
    for (let page = 1; page <= 5; page++) {
      const res = await fetchWithRetry(
        `https://www.arbeitnow.com/api/job-board-api?page=${page}`,
        1, 5000
      );
      if (!res || !res.ok) break;
      const json = await res.json();
      const listings = json.data || [];
      if (listings.length === 0) break;
      for (const j of listings) {
        if (!j.title || !j.url) continue;
        addJob({
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
        arbeitnowCount++;
      }
      if (listings.length < 25) break; // last page
      await new Promise(r => setTimeout(r, 150));
    }
    console.log(`    → Arbeitnow: ${arbeitnowCount} jobs ingested (5 pages)`);
  } catch (e) { console.warn('[Daily Mirror] Arbeitnow error:', e.message); }

  // ── Remotive: 7 tech categories (~700 jobs total)
  try {
    const remotiveCategories = [
      'software-dev', 'devops-sysadmin', 'data', 'backend',
      'frontend', 'product', 'design'
    ];
    let remotiveCount = 0;
    for (const category of remotiveCategories) {
      try {
        const res = await fetchWithRetry(
          `https://remotive.com/api/remote-jobs?category=${category}&limit=100`,
          1, 5000
        );
        if (!res || !res.ok) continue;
        const json = await res.json();
        for (const j of (json.jobs || [])) {
          if (!j.title || !j.url) continue;
          addJob({
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
          remotiveCount++;
        }
        await new Promise(r => setTimeout(r, 200)); // respect rate limit (max 2/min)
      } catch {}
    }
    console.log(`    → Remotive: ${remotiveCount} jobs ingested (7 categories)`);
  } catch (e) { console.warn('[Daily Mirror] Remotive error:', e.message); }

  // ── Jobicy: 6 industries (~500 jobs total)
  try {
    const jobicyIndustries = [
      'engineering', 'tech', 'data-science', 'devops', 'design', 'product'
    ];
    let jobicyCount = 0;
    for (const industry of jobicyIndustries) {
      try {
        const res = await fetchWithRetry(
          `https://jobicy.com/api/v2/remote-jobs?count=100&industry=${industry}`,
          1, 5000
        );
        if (!res || !res.ok) continue;
        const json = await res.json();
        for (const j of (json.jobs || [])) {
          if (!j.jobTitle || !j.url) continue;
          addJob({
            id: `mirror_jobicy_${j.id || Math.random().toString(36).slice(2, 9)}`,
            title: j.jobTitle,
            company: j.companyName,
            location: j.jobGeo || 'Remote',
            url: j.url,
            source: 'JOBICY_MIRROR',
            portal: 'Jobicy Remote Tech',
            category: j.jobIndustry || industry,
            description: `${j.jobTitle} at ${j.companyName}. Level: ${j.jobLevel || 'Any'}.`,
            is_remote: true,
            salary: (j.annualSalaryMin && j.annualSalaryMax)
              ? `${j.salaryCurrency || '$'}${j.annualSalaryMin} - ${j.annualSalaryMax}`
              : null,
            posted_at: j.pubDate || new Date().toISOString()
          });
          jobicyCount++;
        }
        await new Promise(r => setTimeout(r, 200));
      } catch {}
    }
    console.log(`    → Jobicy: ${jobicyCount} jobs ingested (6 industries)`);
  } catch (e) { console.warn('[Daily Mirror] Jobicy error:', e.message); }

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

  // ── Open-Jobs-Data: Direct ATS Engineering Drops (ConorsCode/open-jobs-data)
  try {
    const res = await fetchWithRetry('https://raw.githubusercontent.com/ConorsCode/open-jobs-data/main/data/new-jobs.json', 2, 8000);
    if (res && res.ok) {
      const list = await res.json();
      let openJobsCount = 0;
      if (Array.isArray(list)) {
        for (const item of list) {
          if (!item.title || !item.company) continue;
          const locStr = Array.isArray(item.locations) && item.locations.length > 0 
            ? item.locations.join(', ') 
            : (typeof item.locations === 'string' ? item.locations : 'Remote / Global');
          const isRemote = item.isRemote === true || 
            locStr.toLowerCase().includes('remote') || 
            (item.title && item.title.toLowerCase().includes('remote'));

          addJob({
            id: `mirror_openjobs_${item.platform || 'direct'}_${item.company.toLowerCase().replace(/[^a-z0-9]/g, '')}_${item.jobId || Math.random().toString(36).slice(2, 9)}`,
            title: item.title.trim(),
            company: item.company.trim(),
            location: locStr,
            url: item.applyUrl || `https://boards.greenhouse.io/${item.company.toLowerCase()}`,
            source: 'OPEN_JOBS_DIRECT_ATS',
            portal: `Direct ${item.platform ? item.platform.toUpperCase() : 'ATS'}`,
            category: 'Engineering & Technology',
            description: `${item.title} at ${item.company}. Location: ${locStr}. Platform: ${item.platform || 'ATS'}.`,
            is_remote: isRemote,
            posted_at: item.postedAt || item.scrapedAt || new Date().toISOString()
          });
        }
      }
      console.log(`    → Open-Jobs-Data: ${openJobsCount} daily direct engineering jobs ingested`);
    }
  } catch (e) {
    console.warn('[Daily Mirror] Open-Jobs-Data error:', e.message);
  }

  // ── WeWorkRemotely: Remote Developer RSS Stream
  try {
    const res = await fetchWithRetry('https://weworkremotely.com/remote-jobs.rss', 1, 6000);
    if (res && res.ok) {
      const xmlText = await res.text();
      const itemMatches = xmlText.split(/<item[\s>]/i).slice(1);
      let wwrCount = 0;
      for (const itemBlock of itemMatches) {
        const title = (itemBlock.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/is)?.[1] || '').trim();
        const link = (itemBlock.match(/<link>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/link>/is)?.[1] || itemBlock.match(/<guid[^>]*>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/guid>/is)?.[1] || '').trim();
        const pubDate = (itemBlock.match(/<pubDate>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/pubDate>/is)?.[1] || '').trim();
        const description = (itemBlock.match(/<description>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/description>/is)?.[1] || '').trim();
        const region = (itemBlock.match(/<region>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/region>/is)?.[1] || '').trim();

        if (title && link) {
          let company = 'WeWorkRemotely Partner';
          let cleanTitle = title;
          if (title.includes(': ')) {
            const parts = title.split(': ');
            company = parts[0].trim();
            cleanTitle = parts.slice(1).join(': ').trim();
          }

          addJob({
            id: `mirror_wwr_${link.split('/').filter(Boolean).pop() || Math.random().toString(36).slice(2, 9)}`,
            title: cleanTitle,
            company,
            location: region ? `Remote (${region})` : 'Remote (Worldwide)',
            url: link,
            source: 'WEWORKREMOTELY_MIRROR',
            portal: 'We Work Remotely',
            category: 'Remote Tech',
            description: `${cleanTitle} at ${company}. ${description.slice(0, 300)}`,
            is_remote: true,
            posted_at: pubDate ? new Date(pubDate).toISOString() : new Date().toISOString()
          });
          wwrCount++;
        }
      }
      console.log(`    → WeWorkRemotely: ${wwrCount} remote engineering jobs ingested`);
    }
  } catch (e) {
    console.warn('[Daily Mirror] WeWorkRemotely error:', e.message);
  }

  // ── Dev.to: Direct Founder & Engineering Team Hiring Posts
  try {
    const res = await fetchWithRetry('https://dev.to/api/articles?tag=hiring&per_page=50', 1, 5000);
    if (res && res.ok) {
      const articles = await res.json();
      let devtoCount = 0;
      if (Array.isArray(articles)) {
        for (const item of articles) {
          if (!item.title || !item.url) continue;
          const title = String(item.title || '');
          const isTutorial = /(?:tutorial|how to|guide to|tips for|cheatsheet|course|roadmap|my experience|salary guide)/i.test(title);
          if (isTutorial) continue;

          const company = item.organization?.name || item.user?.name || 'Dev.to Startup';
          addJob({
            id: `mirror_devto_${item.id}`,
            title: title.trim(),
            company: company.trim(),
            location: 'Remote (Global Tech Community)',
            url: item.url,
            source: 'DEVTO_MIRROR',
            portal: 'Dev.to Community Hiring',
            category: 'Engineering & Community',
            description: `${title} at ${company}. ${item.description ? item.description.slice(0, 300) : ''}`,
            is_remote: true,
            posted_at: item.published_at ? new Date(item.published_at).toISOString() : new Date().toISOString()
          });
          devtoCount++;
        }
      }
      console.log(`    → Dev.to: ${devtoCount} founder/startup hiring posts ingested`);
    }
  } catch (e) {
    console.warn('[Daily Mirror] Dev.to error:', e.message);
  }

  // ── FreeCodeCamp: Developer Jobs Directory
  try {
    const res = await fetchWithRetry('https://raw.githubusercontent.com/freeCodeCamp/developer-jobs-directory/main/jobs.json', 1, 6000);
    if (res && res.ok) {
      const fccList = await res.json();
      let fccCount = 0;
      if (Array.isArray(fccList)) {
        for (const item of fccList.slice(0, 300)) {
          if (!item.title || !item.company) continue;
          addJob({
            id: `mirror_fcc_${Math.random().toString(36).slice(2, 9)}`,
            title: item.title,
            company: item.company,
            location: item.location || 'Remote',
            url: item.url || item.apply_url || 'https://freecodecamp.org',
            source: 'FCC_JOBS_MIRROR',
            portal: 'FreeCodeCamp Developer Jobs',
            category: 'Software Engineering',
            description: `${item.title} at ${item.company}.`,
            is_remote: (item.location || '').toLowerCase().includes('remote') || !!item.is_remote,
            posted_at: item.posted_at || new Date().toISOString()
          });
          fccCount++;
        }
      }
      console.log(`    → FreeCodeCamp Directory: ${fccCount} jobs ingested`);
    }
  } catch (e) {
    console.warn('[Daily Mirror] FreeCodeCamp error:', e.message);
  }

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

// Curated High-Yield Expanded Board Registry combining top companies and platform rosters
export const EXPANDED_SOVEREIGN_BOARDS = (() => {
  const boards = [...ALL_SOVEREIGN_TECH_COMPANIES];
  const seen = new Set(boards.map(b => `${b.platform}:${b.slug.toLowerCase()}`));

  const addFromCurated = (platform, category) => {
    const slugs = CURATED_ATS_COMPANIES[platform] || [];
    for (const slug of slugs) {
      const cleanSlug = String(slug).toLowerCase().trim();
      const key = `${platform}:${cleanSlug}`;
      if (!seen.has(key)) {
        seen.add(key);
        const name = cleanSlug.charAt(0).toUpperCase() + cleanSlug.slice(1);
        boards.push({ name, slug: cleanSlug, platform, category });
      }
    }
  };

  addFromCurated('recruitee', 'European Scaleup');
  addFromCurated('workable', 'High-Growth Tech');
  addFromCurated('personio', 'European Tech');
  addFromCurated('bamboohr', 'Scaleup Tech');
  addFromCurated('rippling', 'Startup Engineering');
  addFromCurated('smartrecruiters', 'Global Enterprise');

  return Object.freeze(boards);
})();

// Main Aggregator Execution
export async function runDailyMirror() {
  const t0 = Date.now();
  console.log(`[SPrav V4 Universe] Starting massive ingestion across ${EXPANDED_SOVEREIGN_BOARDS.length} direct ATS boards (Ashby, GH, Lever, SmartRecruiters, Recruitee, Workable, Personio, BambooHR, Rippling), ${WORKDAY_ENTERPRISE_TENANTS.length} Workday Titans, SimplifyJobs & Global APIs...`);

  // Phase 1: Parallel Direct ATS scrape (concurrency 16)
  const atsResults = await asyncPool(16, EXPANDED_SOVEREIGN_BOARDS, scrapeDirectAts);
  const atsJobs = atsResults.flat();
  console.log(`  ✓ Phase 1: Ingested ${atsJobs.length} roles from ${EXPANDED_SOVEREIGN_BOARDS.length} Direct ATS Boards.`);

  // Phase 2: Workday Enterprise CXS Titans
  const workdayResults = await asyncPool(6, WORKDAY_ENTERPRISE_TENANTS, scrapeWorkdayTenant);
  const workdayJobs = workdayResults.flat();
  console.log(`  ✓ Phase 2: Ingested ${workdayJobs.length} roles from ${WORKDAY_ENTERPRISE_TENANTS.length} Enterprise Workday Tenants.`);

  // Phase 3: SimplifyJobs Verified Community Feeds
  const simplifyJobs = await scrapeSimplifyJobs();
  console.log(`  ✓ Phase 3: Ingested ${simplifyJobs.length} roles from SimplifyJobs.`);

  // Phase 4: Open Global Tech APIs & Streams (Himalayas, Arbeitnow, Remotive, Jobicy, HN, RemoteOK, WWR, Dev.to, FCC)
  const apiJobs = await scrapeOpenApis();
  console.log(`  ✓ Phase 4: Ingested ${apiJobs.length} roles from Open Global APIs & Streams.`);

  // Phase 5: High-Volume Open Tech Universe Stream (15 chunks = 375k roles)
  const universeJobs = await scrapeUniverseStream(15);
  console.log(`  ✓ Phase 5: Ingested ${universeJobs.length} roles from Universe ATS Stream.`);

  // Phase 6: Multi-Stage Sovereign Hygiene (Active-Only, Ghost Detection, Spam Detection, Canonical Dedup)
  const allRaw = [...atsJobs, ...workdayJobs, ...simplifyJobs, ...apiJobs, ...universeJobs];
  const { cleanJobs: aggregatedJobs, stats: hygieneStats } = filterCleanActiveJobs(allRaw, {
    maxAgeDays: 45
  });
  console.log(`  ✓ Phase 6: Sovereign Hygiene Complete.`);
  console.log(`    → Clean Active: ${aggregatedJobs.length} | Inactive: ${hygieneStats.droppedInactive} | Ghost: ${hygieneStats.droppedGhost} | Spam: ${hygieneStats.droppedSpam} | Duplicates: ${hygieneStats.droppedDuplicates}`);

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

  // Phase 7: Partition & Compress into Sovereign 25k Chunks (chunks/jobs_chunk_N.json.gz) and Inverted Index
  const chunkResult = chunkAndCompressJobs(aggregatedJobs, outputDir, {
    platforms: 'Greenhouse, Ashby, Lever, Workday, SmartRecruiters, Himalayas, Remotive, Jobicy, Arbeitnow, HN',
    maxAgeDays: 45
  });
  console.log(`  ✓ Phase 7: Partitioned into ${chunkResult.chunksWritten} sovereign chunks (${chunkResult.totalJobs} jobs) with manifest.`);
  if (chunkResult.indexStats) {
    console.log(`  ✓ Phase 8: Built Chunked Inverted Index: ${chunkResult.indexStats.totalTerms} terms, ${(chunkResult.indexStats.compressedBytes / 1024).toFixed(1)} KB gzipped.`);
  }

  const manifest = {
    updated_at: new Date().toISOString(),
    total_jobs: aggregatedJobs.length,
    companies_count: distinctCompanies.size,
    boards_scraped: EXPANDED_SOVEREIGN_BOARDS.length + WORKDAY_ENTERPRISE_TENANTS.length,
    chunks_count: chunkResult.chunksWritten,
    hygiene_metrics: hygieneStats,
    index_metrics: chunkResult.indexStats ? {
      total_terms: chunkResult.indexStats.totalTerms,
      compressed_bytes: chunkResult.indexStats.compressedBytes
    } : null,
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

  // Write lite tier (top 25,000 roles)
  const litePayload = JSON.stringify(aggregatedJobs.slice(0, 25000));
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

export const TARGET_BOARDS = EXPANDED_SOVEREIGN_BOARDS;
export const scrapeBoard = scrapeDirectAts;
export { scrapeDirectAts, scrapeWorkdayTenant, scrapeSimplifyJobs, scrapeOpenApis, scrapeUniverseStream, WORKDAY_ENTERPRISE_TENANTS };

// Direct execution entrypoint
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runDailyMirror().catch(err => {
    console.error('Fatal mirror error:', err);
    process.exit(1);
  });
}

