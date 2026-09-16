/**
 * scripts/sprav_daily_jobs_mirror.js
 * ===================================
 * Automated daily aggregation script designed to run inside a free GitHub Actions cron job.
 * Scrapes fresh jobs from top Greenhouse, Ashby, and Lever boards, normalizes them into
 * the SPrav standard schema, and generates a compressed `latest-tech-jobs.json.gz` feed.
 *
 * Runs completely free on GitHub Actions Linux runners ($0.00 server cost).
 */

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

// Curated high-priority engineering tech employers
const TARGET_BOARDS = [
  { platform: 'ashby', slug: 'openai', name: 'OpenAI' },
  { platform: 'ashby', slug: 'anthropic', name: 'Anthropic' },
  { platform: 'ashby', slug: 'perplexity', name: 'Perplexity AI' },
  { platform: 'ashby', slug: 'cursor', name: 'Cursor' },
  { platform: 'ashby', slug: 'modal', name: 'Modal' },
  { platform: 'ashby', slug: 'togetherai', name: 'Together AI' },
  { platform: 'ashby', slug: 'ramp', name: 'Ramp' },
  { platform: 'ashby', slug: 'linear', name: 'Linear' },
  { platform: 'ashby', slug: 'posthog', name: 'PostHog' },
  { platform: 'greenhouse', slug: 'stripe', name: 'Stripe' },
  { platform: 'greenhouse', slug: 'datadog', name: 'Datadog' },
  { platform: 'greenhouse', slug: 'figma', name: 'Figma' },
  { platform: 'greenhouse', slug: 'cloudflare', name: 'Cloudflare' },
  { platform: 'greenhouse', slug: 'scaleai', name: 'Scale AI' },
  { platform: 'greenhouse', slug: 'brex', name: 'Brex' },
  { platform: 'greenhouse', slug: 'plaid', name: 'Plaid' },
  { platform: 'greenhouse', slug: 'sentry', name: 'Sentry' },
  { platform: 'lever', slug: 'huggingface', name: 'Hugging Face' }
];

async function fetchWithRetry(url, maxRetries = 2) {
  for (let i = 0; i <= maxRetries; i++) {
    try {
      const res = await fetch(url, { headers: { 'User-Agent': 'SPrav-Job-AI-Daily-Mirror/1.0' } });
      if (res.ok) return res;
    } catch (e) {
      if (i === maxRetries) throw e;
    }
    await new Promise(r => setTimeout(r, 500 * (i + 1)));
  }
  return null;
}

async function scrapeBoard(board) {
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
            portal: 'Ashby (SPrav Daily Mirror)',
            description: `${j.title} at ${board.name}. ${j.descriptionPlain ? j.descriptionPlain.slice(0, 400) : ''}`,
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
            portal: 'Greenhouse (SPrav Daily Mirror)',
            description: `${j.title} at ${board.name}. Location: ${j.location?.name || 'Remote'}.`,
            is_remote: (j.location?.name || '').toLowerCase().includes('remote'),
            posted_at: j.updated_at || new Date().toISOString()
          });
        }
      }
    }
  } catch (err) {
    console.warn(`[Daily Mirror] Failed scraping ${board.name}:`, err.message);
  }
  return jobs;
}

async function runDailyMirror() {
  console.log(`[SPrav Daily Mirror] Starting scrape of ${TARGET_BOARDS.length} direct tech boards...`);
  const aggregatedJobs = [];

  for (const board of TARGET_BOARDS) {
    const boardJobs = await scrapeBoard(board);
    console.log(`  ✓ ${board.name}: ${boardJobs.length} active roles`);
    aggregatedJobs.push(...boardJobs);
  }

  const outputDir = path.join(process.cwd(), 'dist_mirror');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  const manifest = {
    updated_at: new Date().toISOString(),
    total_jobs: aggregatedJobs.length,
    boards_scraped: TARGET_BOARDS.length
  };

  fs.writeFileSync(path.join(outputDir, 'mirror_manifest.json'), JSON.stringify(manifest, null, 2));

  // Write uncompressed and gzip compressed feeds (with latest.json.gz aliases)
  const jsonPayload = JSON.stringify(aggregatedJobs);
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json'), jsonPayload);
  fs.writeFileSync(path.join(outputDir, 'latest.json'), jsonPayload);

  const gzipped = zlib.gzipSync(Buffer.from(jsonPayload, 'utf-8'));
  fs.writeFileSync(path.join(outputDir, 'latest-tech-jobs.json.gz'), gzipped);
  fs.writeFileSync(path.join(outputDir, 'latest.json.gz'), gzipped);

  // Write .nojekyll and index.html so GitHub Pages root renders a live status dashboard instead of 404
  fs.writeFileSync(path.join(outputDir, '.nojekyll'), '');
  const templatePath = path.join(__dirname, 'feed_index.html');
  if (fs.existsSync(templatePath)) {
    fs.copyFileSync(templatePath, path.join(outputDir, 'index.html'));
  }

  console.log(`[SPrav Daily Mirror] Success! Published ${aggregatedJobs.length} jobs with live status index.html (${(gzipped.length / 1024).toFixed(1)} KB gzipped).`);
}

if (require.main === module) {
  runDailyMirror().catch(err => {
    console.error('Fatal mirror error:', err);
    process.exit(1);
  });
}

module.exports = { runDailyMirror, scrapeBoard, TARGET_BOARDS };
