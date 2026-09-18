import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import {
  getJobDedupKey,
  isActiveJob,
  evaluateGhostRisk,
  evaluateSpamRisk,
  filterCleanActiveJobs,
  chunkAndCompressJobs,
  CHUNK_SIZE
} from './sprav_universe_chunker.js';

test('getJobDedupKey: formats canonical dedup keys across ATS vendors', () => {
  assert.equal(
    getJobDedupKey({ url: 'https://boards.greenhouse.io/stripe/jobs/12345?gh_src=test' }),
    'greenhouse:stripe:12345'
  );
  assert.equal(
    getJobDedupKey({ url: 'https://jobs.ashbyhq.com/openai/abc-123-xyz/' }),
    'ashby:openai:abc-123-xyz'
  );
  assert.equal(
    getJobDedupKey({ url: 'https://jobs.lever.co/figma/def-456-uvw' }),
    'lever:figma:def-456-uvw'
  );
  assert.equal(
    getJobDedupKey({ url: 'https://apple.wd5.myworkdayjobs.com/en-US/Apple_Careers/jobs/987654', company: 'Apple' }),
    'workday:apple:987654'
  );
  assert.equal(
    getJobDedupKey({ title: 'Staff Engineer', company: 'Datadog' }),
    'datadog:::staff engineer'
  );
});

test('isActiveJob: drops expired, closed, or stale positions', () => {
  const freshJob = {
    title: 'Site Reliability Engineer',
    company: 'Cloudflare',
    scraped_at: new Date().toISOString()
  };
  assert.equal(isActiveJob(freshJob), true);

  // Stale age check (>45 days)
  const staleJob = {
    title: 'Site Reliability Engineer',
    company: 'Cloudflare',
    scraped_at: new Date(Date.now() - 50 * 24 * 60 * 60 * 1000).toISOString()
  };
  assert.equal(isActiveJob(staleJob, 45), false);

  // Status checks
  assert.equal(isActiveJob({ ...freshJob, active: false }), false);
  assert.equal(isActiveJob({ ...freshJob, status: 'closed' }), false);
  assert.equal(isActiveJob({ ...freshJob, status: 'archived' }), false);
});

test('evaluateGhostRisk: detects dormant evergreen and generic talent pools', () => {
  // 1. Generic non-requisition talent pool
  const poolResult = evaluateGhostRisk({
    title: 'Join Our Engineering Talent Community',
    company: 'Enterprise Corp',
    description: 'We are always looking for great people to join our talent pool.'
  });
  assert.equal(poolResult.isGhost, true);

  // 2. Dormant evergreen listing (>90 days old)
  const dormantResult = evaluateGhostRisk({
    title: 'Senior Software Engineer',
    company: 'Evergreen Inc',
    first_seen: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString(),
    scraped_at: new Date().toISOString(),
    description: 'A genuine role that has been open for 100 days with no changes.'
  });
  assert.equal(dormantResult.isGhost, true);

  // 3. Clean active requisition
  const cleanResult = evaluateGhostRisk({
    title: 'Senior Frontend Engineer',
    company: 'Vercel',
    description: 'We are seeking a senior frontend engineer with React and Next.js experience to lead web architecture.',
    scraped_at: new Date().toISOString()
  });
  assert.equal(cleanResult.isGhost, false);
});

test('evaluateSpamRisk: detects commission-only, MLM, and crypto/telegram lures', () => {
  // 1. MLM / Commission exploit
  const mlmResult = evaluateSpamRisk({
    title: 'Sales Tech Partner',
    company: 'Pyramid Direct',
    description: 'Make $5000 a week! Uncapped commission only, be your own boss!'
  });
  assert.equal(mlmResult.isSpam, true);

  // 2. Telegram scam redirect
  const telegramResult = evaluateSpamRisk({
    title: 'Remote QA Tester',
    company: 'Global Shady Co',
    description: 'Please message us via telegram t.me/fast_hiring_manager to get started immediately.'
  });
  assert.equal(telegramResult.isSpam, true);

  // 3. Clean tech role
  const cleanResult = evaluateSpamRisk({
    title: 'Distributed Systems Engineer',
    company: 'Temporal',
    description: 'Build robust orchestrations in Go and Rust.'
  });
  assert.equal(cleanResult.isSpam, false);
});

test('filterCleanActiveJobs: sanitizes batch and returns hygiene statistics', () => {
  const rawBatch = [
    { title: 'Engineer 1', company: 'Meta', url: 'https://meta.com/1', scraped_at: new Date().toISOString() },
    { title: 'Engineer 1', company: 'Meta', url: 'https://meta.com/1', scraped_at: new Date().toISOString() }, // duplicate
    { title: 'Closed Role', company: 'Stripe', url: 'https://stripe.com/2', status: 'closed' }, // inactive
    { title: 'Talent Pool', company: 'Google', url: 'https://google.com/3', scraped_at: new Date().toISOString() }, // ghost
    { title: 'Earn $10k', company: 'Scam', url: 'https://scam.com/4', description: 'Uncapped commission only' }, // spam
    { title: 'Staff Engineer', company: 'Netflix', url: 'https://netflix.com/5', scraped_at: new Date().toISOString() }
  ];

  const { cleanJobs, stats } = filterCleanActiveJobs(rawBatch);
  assert.equal(cleanJobs.length, 2);
  assert.equal(stats.totalRaw, 6);
  assert.equal(stats.droppedDuplicates, 1);
  assert.equal(stats.droppedInactive, 1);
  assert.equal(stats.droppedGhost, 1);
  assert.equal(stats.droppedSpam, 1);
  assert.equal(cleanJobs[0].company, 'Meta');
  assert.equal(cleanJobs[1].company, 'Netflix');
});

test('chunkAndCompressJobs: partitions jobs into gzip chunks and writes manifest', () => {
  const testOutputDir = path.join(process.cwd(), 'scratch', 'test_chunks_output');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  // Create 6 sample jobs
  const sampleJobs = Array.from({ length: 6 }, (_, i) => ({
    id: `test_job_${i}`,
    title: `Software Engineer ${i}`,
    company: `TechCorp ${i % 3}`,
    url: `https://techcorp.com/jobs/${i}`,
    scraped_at: new Date().toISOString()
  }));

  const res = chunkAndCompressJobs(sampleJobs, testOutputDir, {
    platforms: 'Ashby, Greenhouse',
    maxAgeDays: 30
  });

  assert.ok(res.chunksWritten >= 1);
  assert.equal(res.totalJobs, 6);
  assert.equal(res.distinctCompanies, 3);

  // Check that files exist on disk
  const chunk0Path = path.join(testOutputDir, 'chunks', 'jobs_chunk_0.json.gz');
  assert.ok(fs.existsSync(chunk0Path));

  // Decompress and verify content
  const decompressed = zlib.gunzipSync(fs.readFileSync(chunk0Path));
  const parsed = JSON.parse(decompressed.toString('utf-8'));
  assert.equal(parsed.length, 6);

  // Check manifest and metadata
  const manifestPath = path.join(testOutputDir, 'chunks', 'jobs_manifest.json');
  assert.ok(fs.existsSync(manifestPath));
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  assert.equal(manifest.totalJobs, 6);
  assert.equal(manifest.chunks.length, 1);

  const metadataPath = path.join(testOutputDir, 'metadata.json');
  assert.ok(fs.existsSync(metadataPath));
  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf-8'));
  assert.equal(metadata.total_jobs, 6);
  assert.equal(metadata.active_companies, 3);
  assert.equal(metadata.quality_metrics.active_only, true);
  assert.equal(metadata.quality_metrics.ghost_filtered, true);

  // Clean up test scratch
  fs.rmSync(testOutputDir, { recursive: true, force: true });
});

test('tokenizeForSearch: extracts clean normalized tokens and preserves tech compounds', async () => {
  const { tokenizeForSearch } = await import('./sprav_universe_chunker.js');
  
  const tokens1 = tokenizeForSearch('Senior React.js / Node.js Developer (AI/ML & CI/CD)');
  assert.ok(tokens1.includes('senior'));
  assert.ok(tokens1.includes('react'));
  assert.ok(tokens1.includes('nodejs'));
  assert.ok(tokens1.includes('aiml'));
  assert.ok(tokens1.includes('cicd'));
  assert.ok(tokens1.includes('developer'));
  // Stopwords omitted
  assert.ok(!tokens1.includes('and'));

  const tokens2 = tokenizeForSearch('C++ / C# Graphics Engine Architect at Unreal');
  assert.ok(tokens2.includes('cpp'));
  assert.ok(tokens2.includes('csharp'));
  assert.ok(tokens2.includes('graphics'));
  assert.ok(tokens2.includes('architect'));
  assert.ok(tokens2.includes('unreal'));
});

test('detectSeniority: accurately classifies role seniority tiers', async () => {
  const { detectSeniority } = await import('./sprav_universe_chunker.js');

  assert.equal(detectSeniority('Staff Software Engineer'), 'staff');
  assert.equal(detectSeniority('Principal Cloud Architect'), 'staff');
  assert.equal(detectSeniority('Senior Fullstack Developer'), 'senior');
  assert.equal(detectSeniority('Sr. Backend Engineer'), 'senior');
  assert.equal(detectSeniority('Junior Frontend Engineer'), 'entry');
  assert.equal(detectSeniority('Software Engineering Intern'), 'entry');
  assert.equal(detectSeniority('Software Engineer'), 'mid');
});

test('buildInvertedIndex: generates compressed inverted index and facets', async () => {
  const { buildInvertedIndex } = await import('./sprav_universe_chunker.js');
  const testOutputDir = path.join(process.cwd(), 'scratch', 'test_index_output');
  if (fs.existsSync(testOutputDir)) {
    fs.rmSync(testOutputDir, { recursive: true, force: true });
  }

  const sampleJobs = [
    { title: 'Senior Rust Engineer', company: 'Stripe', location: 'Remote', skill_level: 'senior' },
    { title: 'Frontend Developer (React)', company: 'Vercel', location: 'San Francisco, CA, US', skill_level: 'mid' },
    { title: 'Staff Go Infrastructure', company: 'Uber', location: 'Bengaluru, India', skill_level: 'staff' },
    { title: 'Junior QA Engineer', company: 'Stripe', location: 'London, UK', skill_level: 'entry' }
  ];

  const res = buildInvertedIndex(sampleJobs, ['jobs_chunk_0.json.gz'], testOutputDir, {
    chunkSize: 2
  });

  assert.ok(res.totalTerms >= 8);
  assert.ok(res.compressedBytes > 0);
  assert.ok(fs.existsSync(res.indexPath));

  // Decompress and verify content
  const decompressed = zlib.gunzipSync(fs.readFileSync(res.indexPath));
  const parsed = JSON.parse(decompressed.toString('utf-8'));

  assert.equal(parsed.version, '1.0.0-edge-index');
  assert.equal(parsed.total_jobs, 4);
  assert.ok(parsed.terms['rust']);
  assert.ok(parsed.terms['stripe']);
  assert.ok(parsed.terms['react']);

  // Check chunk assignment: with chunkSize: 2, jobs 0-1 are chunk 0, jobs 2-3 are chunk 1
  assert.deepEqual(parsed.terms['rust'], [0]); // job 0 -> chunk 0
  assert.deepEqual(parsed.terms['stripe'], [0, 1]); // job 0 in chunk 0, job 3 in chunk 1

  // Facet verification
  assert.ok(parsed.facets.seniority.senior.includes(0));
  assert.ok(parsed.facets.seniority.staff.includes(1));
  assert.ok(parsed.facets.location.remote.includes(0));
  assert.ok(parsed.facets.location.india.includes(1));

  // Clean up
  fs.rmSync(testOutputDir, { recursive: true, force: true });
});

