import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeFeashliaaJob,
  normalizeSimplifyJob,
  normalizeJobicyJob,
  normalizeArbeitnowJob,
  fetchLiveKeylessCORSJobs,
  fetchJobBoardMetadata,
  streamJobChunk,
  searchHighVolumeStream,
  fetchSimplifyJobs,
  fetchAndDecompressJobChunk,
  fetchDailyMirrorJobs,
  isActiveJob,
  SOVEREIGN_SPRAV_BASE,
  FALLBACK_MIRROR_BASE
} from './github_job_streamer.js';
import { getJobDedupKey, filterCleanActiveJobs } from '../../scripts/sprav_universe_chunker.js';


test('normalizeFeashliaaJob: standard job mapping & salary percentiles', () => {
  const raw = {
    title: 'Distributed Systems Engineer',
    ats: 'Ashby',
    company: 'Acme Cloud',
    is_recruiter: false,
    skill_level: 'senior',
    salary: {
      p25: 160000,
      median: 195000,
      p75: 230000
    },
    url: 'https://jobs.ashbyhq.com/acme/12345',
    location: 'Remote, US',
    first_seen: '2026-09-10T10:00:00Z'
  };

  const normalized = normalizeFeashliaaJob(raw);
  assert.ok(normalized);
  assert.equal(normalized.title, 'Distributed Systems Engineer');
  assert.equal(normalized.company, 'Acme Cloud');
  assert.equal(normalized.source, 'ASHBY_INDEX');
  assert.equal(normalized.is_remote, true);
  assert.equal(normalized.salary_range, '$160k - $230k');
  assert.equal(normalized.salary_median, 195000);
  assert.equal(normalized.is_recruiter, false);
  assert.equal(normalized.skill_level, 'senior');
});

test('normalizeFeashliaaJob: handles missing salary and non-remote gracefully', () => {
  const raw = {
    title: 'Firmware Engineer',
    ats: 'Greenhouse',
    company: 'Silicon Inc',
    is_recruiter: true,
    location: 'Austin, TX',
    salary: null
  };

  const normalized = normalizeFeashliaaJob(raw);
  assert.ok(normalized);
  assert.equal(normalized.salary_range, null);
  assert.equal(normalized.salary_median, null);
  assert.equal(normalized.is_remote, false);
  assert.equal(normalized.is_recruiter, true);
  assert.equal(normalizeFeashliaaJob(null), null);
});

test('normalizeSimplifyJob: standard Simplify entry & active status', () => {
  const raw = {
    source: 'Simplify',
    category: 'Software',
    company_name: 'Stripe',
    id: 'simp-999',
    title: 'Software Engineer, University Graduate',
    active: true,
    date_posted: 1768864600,
    url: 'https://stripe.com/jobs/999',
    locations: ['San Francisco, CA', 'Seattle, WA'],
    sponsorship: 'Yes'
  };

  const normalized = normalizeSimplifyJob(raw);
  assert.ok(normalized);
  assert.equal(normalized.title, 'Software Engineer, University Graduate');
  assert.equal(normalized.company, 'Stripe');
  assert.equal(normalized.source, 'SIMPLIFY_INDEX');
  assert.equal(normalized.location, 'San Francisco, CA, Seattle, WA');
  assert.equal(normalized.sponsorship, 'Yes');
  assert.equal(normalizeSimplifyJob(null), null);
});

test('fetchJobBoardMetadata: retrieves live or fallback metadata with >1,000,000 jobs', async () => {
  const meta = await fetchJobBoardMetadata();
  assert.ok(meta);
  assert.ok(meta.total_jobs >= 1000000, `Expected total_jobs >= 1M, got ${meta.total_jobs}`);
  assert.ok(meta.active_companies >= 10000, `Expected active_companies >= 10k, got ${meta.active_companies}`);
  assert.ok(typeof meta.platforms === 'string');
});

test('streamJobChunk: successfully streams chunk 0 and filters by keyword', async () => {
  const matches = await streamJobChunk(0, {
    keyword: 'Engineer',
    limit: 5
  });

  assert.ok(Array.isArray(matches));
  assert.ok(matches.length > 0 && matches.length <= 5);
  for (const job of matches) {
    assert.ok(job.title);
    assert.ok(job.company);
    assert.ok(job.url);
    assert.ok(job.source.includes('_INDEX'));
  }
});

test('streamJobChunk: directOnly and hasSalary filters work accurately', async () => {
  const matches = await streamJobChunk(0, {
    keyword: 'Engineer',
    directOnly: true,
    hasSalary: true,
    limit: 5
  });

  assert.ok(Array.isArray(matches));
  for (const job of matches) {
    assert.equal(job.is_recruiter, false);
    assert.ok(job.salary_median > 0);
  }
});

test('searchHighVolumeStream: early-exits and returns timing telemetry', async () => {
  const result = await searchHighVolumeStream('Software', {
    targetMatches: 10,
    maxChunksToScan: 2
  });

  assert.ok(result);
  assert.ok(Array.isArray(result.jobs));
  assert.ok(result.jobs.length > 0);
  assert.ok(result.totalScanned >= 25000);
  assert.ok(result.durationMs >= 0);
});

test('searchHighVolumeStream: handles empty query safely', async () => {
  const empty = await searchHighVolumeStream('', {});
  assert.deepEqual(empty.jobs, []);
  assert.equal(empty.totalScanned, 0);
});

test('fetchSimplifyJobs: fetches active tech listings', async () => {
  const newGrads = await fetchSimplifyJobs('new_grad', {
    keyword: 'Software',
    limit: 5
  });

  assert.ok(Array.isArray(newGrads));
  for (const item of newGrads) {
    assert.ok(item.company);
    assert.ok(item.title);
    assert.equal(item.source, 'SIMPLIFY_INDEX');
  }
});

test('fetchAndDecompressJobChunk: matches Blueprint Section 4 contract', async () => {
  const jobs = await fetchAndDecompressJobChunk(0);
  assert.ok(Array.isArray(jobs));
  assert.ok(jobs.length > 0);
  assert.ok(jobs[0].title);
  assert.ok(jobs[0].company);
});

test('fetchDailyMirrorJobs: gracefully falls back on network failure', async () => {
  const jobs = await fetchDailyMirrorJobs();
  assert.ok(Array.isArray(jobs));
});

test('isActiveJob: strictly validates active status, age, spam, and ghost listings', () => {
  // 1. Clean active job
  const cleanJob = {
    title: 'Senior Backend Engineer',
    company: 'Stripe',
    posted_at: new Date().toISOString()
  };
  assert.equal(isActiveJob(cleanJob), true);

  // 2. Explicit inactive or closed status
  assert.equal(isActiveJob({ ...cleanJob, active: false }), false);
  assert.equal(isActiveJob({ ...cleanJob, is_active: false }), false);
  assert.equal(isActiveJob({ ...cleanJob, status: 'closed' }), false);
  assert.equal(isActiveJob({ ...cleanJob, status: 'inactive' }), false);
  assert.equal(isActiveJob({ ...cleanJob, deleted: true }), false);

  // 3. Stale job older than maxAgeDays (e.g. 70 days ago)
  const staleDate = new Date(Date.now() - 70 * 24 * 60 * 60 * 1000).toISOString();
  assert.equal(isActiveJob({ ...cleanJob, posted_at: staleDate }, 60), false);

  // 4. Commission / MLM spam exploit
  assert.equal(isActiveJob({
    title: 'Technical Sales - 100% Commission',
    company: 'Growth Biz',
    description: 'Uncapped commission only'
  }), false);

  // 5. Off-platform scam redirect
  assert.equal(isActiveJob({
    title: 'Remote Data Entry',
    company: 'Global Corp',
    description: 'Contact us via t.me/recruiter_scam'
  }), false);

  // 6. Generic non-requisition talent pool
  assert.equal(isActiveJob({
    title: 'General Application - Future Opportunities Talent Pool',
    company: 'Big Corp',
    description: 'Leave your resume for future talent community consideration'
  }), false);

  // 7. Null/undefined safety
  assert.equal(isActiveJob(null), false);
  assert.equal(isActiveJob({}), false);
});

test('dual CDN: SOVEREIGN_SPRAV_BASE and FALLBACK_MIRROR_BASE are valid URLs', () => {
  assert.ok(SOVEREIGN_SPRAV_BASE.startsWith('https://raw.githubusercontent.com/'));
  assert.ok(SOVEREIGN_SPRAV_BASE.includes('sovereign-job-feed'));
  assert.ok(FALLBACK_MIRROR_BASE.startsWith('https://raw.githubusercontent.com/'));
  assert.ok(FALLBACK_MIRROR_BASE.includes('job-board-data'));
});

test('normalizeJobicyJob: correctly maps keyless public Jobicy API response', () => {
  const raw = {
    id: 99123,
    url: 'https://jobicy.com/jobs/senior-fullstack-dev-123',
    jobTitle: 'Senior Fullstack Developer',
    companyName: 'Starlight Interactive Inc.',
    jobGeo: 'Remote, US',
    jobIndustry: 'engineering',
    jobExcerpt: 'Build next-generation distributed interfaces with React and Go.',
    pubDate: '2026-09-18T12:00:00Z',
    annualSalaryMin: '140000',
    annualSalaryMax: '180000',
    salaryCurrency: 'USD'
  };

  const normalized = normalizeJobicyJob(raw);
  assert.ok(normalized);
  assert.equal(normalized.title, 'Senior Fullstack Developer');
  assert.equal(normalized.company, 'Starlight Interactive Inc.');
  assert.equal(normalized.source, 'JOBICY_FEED');
  assert.equal(normalized.is_remote, true);
  assert.equal(normalized.salary_range, '$140k – $180k');
  assert.equal(normalized.provenance_tier, 'keyless_public_api');
  assert.equal(normalizeJobicyJob(null), null);
});

test('normalizeArbeitnowJob: correctly maps keyless public Arbeitnow API response', () => {
  const raw = {
    slug: 'kubernetes-platform-engineer-berlin-456',
    company_name: 'FinTech Cloud AG',
    title: 'Kubernetes Platform Engineer',
    description: 'Lead multi-region Kubernetes clusters and Terraform deployments.',
    remote: true,
    url: 'https://www.arbeitnow.com/view/kubernetes-platform-engineer-456',
    tags: ['DevOps', 'Kubernetes', 'Golang'],
    location: 'Berlin / Remote',
    created_at: 1726700000
  };

  const normalized = normalizeArbeitnowJob(raw);
  assert.ok(normalized);
  assert.equal(normalized.title, 'Kubernetes Platform Engineer');
  assert.equal(normalized.company, 'FinTech Cloud AG');
  assert.equal(normalized.source, 'ARBEITNOW_FEED');
  assert.equal(normalized.is_remote, true);
  assert.equal(normalized.category, 'DevOps');
  assert.equal(normalized.provenance_tier, 'keyless_public_api');
  assert.equal(normalizeArbeitnowJob(null), null);
});

test('getJobDedupKey: collapses legal suffixes and bracket variations into canonical fingerprint', () => {
  const jobA = {
    company: 'Amazon Web Services, Inc.',
    title: 'Senior Software Development Engineer (Remote)',
    location: 'Remote - US',
    is_remote: true
  };
  const jobB = {
    company: 'Amazon Web Services',
    title: 'Senior Software Development Engineer [Full-Time]',
    location: 'Virtual',
    is_remote: true
  };
  const keyA = getJobDedupKey(jobA);
  const keyB = getJobDedupKey(jobB);
  assert.equal(keyA, keyB, 'Both variations must produce identical canonical dedup keys');
});

test('filterCleanActiveJobs: prioritizes direct corporate ATS over aggregator duplicates', () => {
  const directWorkday = {
    id: 'mirror_workday_nvidia_1',
    company: 'NVIDIA Corporation',
    title: 'Senior Deep Learning Engineer',
    location: 'Santa Clara, CA',
    source: 'WORKDAY_CXS_ENTERPRISE',
    portal: 'Nvidia Workday Careers',
    posted_at: new Date().toISOString()
  };

  const aggregatorCopy = {
    id: 'mirror_jobicy_2',
    company: 'Nvidia',
    title: 'Senior Deep Learning Engineer (Full-Time)',
    location: 'Remote',
    source: 'JOBICY_FEED',
    portal: 'Jobicy Remote Tech',
    posted_at: new Date().toISOString()
  };

  const { cleanJobs, stats } = filterCleanActiveJobs([aggregatorCopy, directWorkday]);
  assert.equal(cleanJobs.length, 1, 'Duplicate must be filtered out');
  assert.equal(cleanJobs[0].source, 'WORKDAY_CXS_ENTERPRISE', 'Higher fidelity direct Workday posting must be retained');
  assert.equal(stats.droppedDuplicates, 1, 'Duplicate counter must record 1 dropped duplicate');
});

test('fetchLiveKeylessCORSJobs: returns deduplicated normalized jobs array', async () => {
  const jobs = await fetchLiveKeylessCORSJobs('engineer', { limit: 10 });
  assert.ok(Array.isArray(jobs));
  // Ensure no duplicate keys exist in the returned set
  const seenKeys = new Set();
  for (const j of jobs) {
    const key = `${j.company.toLowerCase()}:::${j.title.toLowerCase()}`;
    assert.equal(seenKeys.has(key), false, `Job ${key} must not be duplicated`);
    seenKeys.add(key);
  }
});


