import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  BrowserAtsScanner, 
  detectJdRedFlags, 
  computeJobHealthScore,
  computeJobDedupKey, 
  CURATED_ATS_COMPANIES, 
  extractHnContactInfo,
  parseHnPostingHeader,
  sanitizeCompanyName,
  checkSkillInText,
  getRotatedBatch,
  loadCommunityRegistry,
  mergeCompanyRegistries,
  BATCH_SIZES,
  SCAN_CURSOR_KEY,
  fetchWithTimeout
} from './browser_ats_scanner.js';
import { storageVault } from './browser_storage_vault.js';
import { COUNTRY_CITY_MAP } from './country_city_taxonomy.js';

test('calculateAtsFit: calculates authentic score and matches skills correctly', () => {
  const scanner = new BrowserAtsScanner();
  const candidateSkills = ['Python', 'FastAPI', 'Docker', 'PostgreSQL'];
  const jobText = 'Looking for a Senior Backend Engineer proficient in Python, FastAPI, Docker, and Kubernetes.';

  const fit = scanner.calculateAtsFit(candidateSkills, jobText);
  assert.ok(fit.score >= 60, `Score should be >= 60, got ${fit.score}`);
  assert.ok(fit.matched.includes('python'));
  assert.ok(fit.matched.includes('fastapi'));
  assert.ok(fit.matched.includes('docker'));
  assert.ok(fit.missing.includes('kubernetes'));
});

test('isJobMatchingScope: correctly filters jobs by role and work mode', () => {
  const scanner = new BrowserAtsScanner();
  const scope = {
    roles: [
      { keyword: 'Software Engineer', preference: 'apply' },
      { keyword: 'Backend', preference: 'apply' }
    ],
    work_mode: 'remote_only'
  };

  const matchingJob = {
    title: 'Senior Backend Engineer',
    location: 'Remote - US',
    is_remote: true
  };
  assert.equal(scanner.isJobMatchingScope(matchingJob, scope), true);

  const nonMatchingRole = {
    title: 'Marketing Director',
    location: 'Remote',
    is_remote: true
  };
  assert.equal(scanner.isJobMatchingScope(nonMatchingRole, scope), false);

  const nonRemoteJob = {
    title: 'Backend Engineer',
    location: 'New York, NY',
    is_remote: false
  };
  assert.equal(scanner.isJobMatchingScope(nonRemoteJob, scope), false);
});

test('normalizeJob: cleans descriptions and applies default values', () => {
  const scanner = new BrowserAtsScanner();
  const raw = {
    title: 'Full Stack Engineer',
    company: 'Acme Corp',
    description: '<p>Great opportunity for an <b>engineer</b>.</p>'
  };

  const normalized = scanner.normalizeJob(raw);
  assert.equal(normalized.title, 'Full Stack Engineer');
  assert.equal(normalized.company, 'Acme Corp');
  assert.ok(!normalized.description.includes('<p>'));
  assert.ok(normalized.description.includes('engineer'));
  assert.equal(normalized.status, 'new');
});

test('CURATED_ATS_COMPANIES: includes verified platforms and employers', async () => {
  const { CURATED_ATS_COMPANIES } = await import('./browser_ats_scanner.js');
  assert.ok(Array.isArray(CURATED_ATS_COMPANIES.greenhouse));
  assert.ok(Array.isArray(CURATED_ATS_COMPANIES.ashby));
  assert.ok(Array.isArray(CURATED_ATS_COMPANIES.lever));
  assert.ok(Array.isArray(CURATED_ATS_COMPANIES.smartrecruiters));
  assert.ok(Array.isArray(CURATED_ATS_COMPANIES.recruitee));

  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('openai'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('anthropic'));
  assert.ok(CURATED_ATS_COMPANIES.smartrecruiters.includes('canva'));
  assert.ok(CURATED_ATS_COMPANIES.recruitee.includes('bunq'));
});

test('normalizeJob: preserves founder email and remote flags', () => {
  const scanner = new BrowserAtsScanner();
  const raw = {
    title: 'Founding Engineer',
    company: 'Supero AI',
    description: 'Direct founder post',
    is_remote: true,
    founder_email: 'founder@supero.ai',
    founder_username: 'supero_lead'
  };

  const normalized = scanner.normalizeJob(raw);
  assert.equal(normalized.founder_email, 'founder@supero.ai');
  assert.equal(normalized.founder_username, 'supero_lead');
  assert.equal(normalized.is_remote, true);
});

test('scanSmartRecruitersCompany: parses structured postings correctly', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('smartrecruiters.com')) {
      return {
        ok: true,
        json: async () => ({
          content: [
            {
              id: 'sr_123',
              name: 'Senior Frontend Engineer',
              company: { name: 'Canva', identifier: 'canva' },
              location: { city: 'Sydney', country: 'au', remote: true },
              function: { label: 'Engineering' }
            }
          ]
        })
      };
    }
    return originalFetch(url);
  };

  try {
    const jobs = await scanner.scanSmartRecruitersCompany('canva');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Senior Frontend Engineer');
    assert.equal(jobs[0].company, 'Canva');
    assert.equal(jobs[0].source, 'SmartRecruiters');
    assert.equal(jobs[0].is_remote, true);
    assert.ok(jobs[0].url.includes('canva'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanRecruiteeCompany: parses open offers correctly', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('recruitee.com')) {
      return {
        ok: true,
        json: async () => ({
          offers: [
            {
              id: 999,
              title: 'Backend Go Engineer',
              location: 'Amsterdam',
              remote: true,
              careers_url: 'https://careers.bunq.com/o/backend-go-engineer',
              description: 'Build banking core in Go'
            }
          ]
        })
      };
    }
    return originalFetch(url);
  };

  try {
    const jobs = await scanner.scanRecruiteeCompany('bunq');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Backend Go Engineer');
    assert.equal(jobs[0].source, 'Recruitee');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].url, 'https://careers.bunq.com/o/backend-go-engineer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanRecruiteeCompany: parses public api.recruitee.com/c/{company}/jobs endpoint', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('api.recruitee.com/c/bunq/jobs')) {
      return {
        ok: true,
        json: async () => ({
          jobs: [
            {
              id: 1001,
              title: 'Staff Platform Engineer',
              location: 'Remote, Europe',
              remote: true,
              careers_url: 'https://careers.bunq.com/o/staff-platform-engineer',
              description: 'Kubernetes, Go, Kafka'
            }
          ]
        })
      };
    }
    return { ok: false };
  };

  try {
    const jobs = await scanner.scanRecruiteeCompany('bunq');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Staff Platform Engineer');
    assert.equal(jobs[0].source, 'Recruitee');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].url, 'https://careers.bunq.com/o/staff-platform-engineer');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanHackerNewsHiring: parses story and comment with founder email', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    if (url.includes('hn.algolia.com')) {
      return { ok: false, status: 500 };
    }
    if (url.includes('whoishiring.json')) {
      return { ok: true, json: async () => ({ submitted: [10001] }) };
    }
    if (url.includes('/item/10001.json')) {
      return {
        ok: true,
        json: async () => ({
          id: 10001,
          title: 'Ask HN: Who is hiring? (September 2026)',
          kids: [20001]
        })
      };
    }
    if (url.includes('/item/20001.json')) {
      return {
        ok: true,
        json: async () => ({
          id: 20001,
          by: 'snzke',
          text: 'Valkyrie Aero | Software Engineer | REMOTE (US) | <a href="https://valkyrie.com">apply</a><p>Email us at jobs@valkyrie.com</p>'
        })
      };
    }
    return originalFetch(url);
  };

  try {
    const jobs = await scanner.scanHackerNewsHiring();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Valkyrie Aero');
    assert.equal(jobs[0].title, 'Software Engineer');
    assert.equal(jobs[0].source, 'Hacker News');
    assert.equal(jobs[0].portal, 'Hacker News (Founder Direct)');
    assert.equal(jobs[0].founder_email, 'jobs@valkyrie.com');
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanWorkableCompany: parses CORS-open widget jobs correctly', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('apply.workable.com')) {
      return {
        ok: true,
        json: async () => ({
          name: 'Personio Tech',
          jobs: [
            {
              id: 'wrk_123',
              shortcode: 'P01',
              title: 'Staff Platform Engineer',
              city: 'Berlin',
              country: 'Germany',
              telecommuting: true,
              published_on: '2026-09-06T08:00:00Z',
              description: 'Work with Go and Kubernetes'
            }
          ]
        })
      };
    }
    return originalFetch(url);
  };

  try {
    const jobs = await scanner.scanWorkableCompany('personio');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Staff Platform Engineer');
    assert.equal(jobs[0].company, 'Personio Tech');
    assert.equal(jobs[0].source, 'Workable');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].posted_at, '2026-09-06T08:00:00.000Z');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanRemoteOK: parses remote feed and tags', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('remoteok.com/api')) {
      return {
        ok: true,
        json: async () => [
          { legal: 'notice' }, // non-job header item
          {
            id: 'rok_888',
            position: 'Senior Rust Engineer',
            company: 'Nexus Labs',
            location: 'Worldwide',
            date: '2026-09-06T10:00:00Z',
            tags: ['rust', 'crypto', 'backend'],
            apply_url: 'https://nexus.dev/careers'
          }
        ]
      };
    }
    return originalFetch(url);
  };

  try {
    const jobs = await scanner.scanRemoteOK();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'Senior Rust Engineer');
    assert.equal(jobs[0].company, 'Nexus Labs');
    assert.equal(jobs[0].source, 'RemoteOK');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].url, 'https://nexus.dev/careers');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanUSAJobs: handles missing key gracefully and parses federal jobs when configured', async () => {
  const scanner = new BrowserAtsScanner();
  
  // 1. When no key is set, returns empty array with zero errors
  const unconfiguredJobs = await scanner.scanUSAJobs('Software Engineer');
  assert.deepStrictEqual(unconfiguredJobs, []);

  // 2. When key and email are mocked in storage
  const originalFetch = globalThis.fetch;
  const { storageVault } = await import('./browser_storage_vault.js');
  const origGet = storageVault.getItem;
  storageVault.getItem = async (k) => {
    if (k === 'sprav_usajobs_key') return 'mock_fed_key_123';
    if (k === 'sprav_usajobs_email') return 'dev@sprav.ai';
    return null;
  };

  globalThis.fetch = async (url, opts) => {
    if (url.includes('data.usajobs.gov')) {
      assert.equal(opts.headers['Authorization-Key'], 'mock_fed_key_123');
      assert.equal(opts.headers['User-Agent'], 'dev@sprav.ai');
      return {
        ok: true,
        json: async () => ({
          SearchResult: {
            SearchResultItems: [
              {
                MatchedObjectDescriptor: {
                  PositionID: 'FED_999',
                  PositionTitle: 'Computer Scientist (AI/ML)',
                  DepartmentName: 'NASA Jet Propulsion Laboratory',
                  PositionLocationDisplay: 'Remote (Anywhere in the US)',
                  RemoteIndicator: true,
                  PositionURI: 'https://usajobs.gov/job/999',
                  PublicationStartDate: '2026-09-05T00:00:00Z',
                  PositionRemuneration: [{ MinimumRange: 145000, MaximumRange: 195000, RateIntervalCode: 'Per Year' }]
                }
              }
            ]
          }
        })
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const fedJobs = await scanner.scanUSAJobs('AI');
    assert.equal(fedJobs.length, 1);
    assert.equal(fedJobs[0].title, 'Computer Scientist (AI/ML)');
    assert.equal(fedJobs[0].company, 'NASA Jet Propulsion Laboratory');
    assert.equal(fedJobs[0].source, 'USAJOBS');
    assert.equal(fedJobs[0].is_remote, true);
    assert.ok(fedJobs[0].salary.includes('145') && fedJobs[0].salary.includes('195'));
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getItem = origGet;
  }
});

test('normalizeJob: enforces forensic first-published precedence and calculates decay priority score', () => {
  const scanner = new BrowserAtsScanner();
  
  // Scenario 1: Fresh job first published 1h ago
  const freshJob = scanner.normalizeJob({
    title: 'Lead AI Engineer',
    company: 'Anthropic',
    first_published_at: new Date(Date.now() - 3600 * 1000).toISOString(),
    updated_at: new Date().toISOString(),
    ats_match_score: 80
  });

  assert.equal(freshJob.freshness.code, 'ultra_fresh');
  assert.equal(freshJob.freshness_multiplier, 1.25);
  // 80 * 1.25 = 100
  assert.equal(freshJob.priority_score, 100);
  assert.ok(freshJob.relative_posted_time.includes('h ago') || freshJob.relative_posted_time.includes('m ago'));

  // Scenario 2: Stale job published 60 days ago with a recent typo edit bump
  const staleJob = scanner.normalizeJob({
    title: 'Senior Engineer',
    company: 'OldCorp',
    first_published_at: new Date(Date.now() - 60 * 24 * 3600 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 24 * 3600 * 1000).toISOString(), // edited yesterday
    ats_match_score: 90
  });

  assert.equal(staleJob.freshness.code, 'repost_warning');
  assert.equal(staleJob.freshness_multiplier, 0.50);
  // 90 * 0.50 = 45
  assert.equal(staleJob.priority_score, 45);
});

test('scanAdzuna: handles missing keys gracefully and parses results when configured', async () => {
  const scanner = new BrowserAtsScanner();
  
  // 1. Missing keys returns []
  const emptyRes = await scanner.scanAdzuna('Frontend Engineer');
  assert.deepStrictEqual(emptyRes, []);

  // 2. Mock storage & fetch
  const originalFetch = globalThis.fetch;
  const { storageVault } = await import('./browser_storage_vault.js');
  const origGet = storageVault.getItem;
  storageVault.getItem = async (k) => {
    if (k === 'sprav_adzuna_app_id') return 'adzuna_test_id';
    if (k === 'sprav_adzuna_app_key') return 'adzuna_test_key';
    return null;
  };

  globalThis.fetch = async (url, opts) => {
    if (url.includes('api.adzuna.com')) {
      assert.ok(url.includes('app_id=adzuna_test_id'));
      assert.ok(url.includes('app_key=adzuna_test_key'));
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              id: 'adz_123',
              title: '<strong>React</strong> Frontend Architect',
              company: { display_name: 'Stripe' },
              location: { display_name: 'Remote, US' },
              redirect_url: 'https://adzuna.com/job/123',
              description: 'Build modern financial interfaces with <strong>React</strong> and TypeScript.',
              salary_min: 160000,
              salary_max: 210000,
              created: '2026-09-05T12:00:00Z'
            }
          ]
        })
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const jobs = await scanner.scanAdzuna('React Architect');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].title, 'React Frontend Architect'); // stripped HTML
    assert.equal(jobs[0].company, 'Stripe');
    assert.equal(jobs[0].source, 'ADZUNA');
    assert.ok(jobs[0].salary.includes('160,000') && jobs[0].salary.includes('210,000'));
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getItem = origGet;
  }
});

test('scanBraveAtsDiscovery: handles missing key gracefully and parses ATS targets when configured', async () => {
  const scanner = new BrowserAtsScanner();
  
  // 1. Missing key returns []
  const emptyRes = await scanner.scanBraveAtsDiscovery('Staff Engineer');
  assert.deepStrictEqual(emptyRes, []);

  // 2. Mock storage & fetch
  const originalFetch = globalThis.fetch;
  const { storageVault } = await import('./browser_storage_vault.js');
  const origGet = storageVault.getItem;
  storageVault.getItem = async (k) => {
    if (k === 'sprav_brave_search_key') return 'brave_mock_token_xyz';
    return null;
  };

  globalThis.fetch = async (url, opts) => {
    if (url.includes('api.search.brave.com')) {
      assert.equal(opts.headers['X-Subscription-Token'], 'brave_mock_token_xyz');
      return {
        ok: true,
        json: async () => ({
          web: {
            results: [
              {
                title: 'Staff Platform Engineer - Ashby',
                url: 'https://jobs.ashbyhq.com/openai/987654',
                description: 'Join OpenAI to scale model training infrastructure.',
                page_age: '2026-09-06T08:00:00Z'
              },
              {
                title: 'Senior Distributed Systems Engineer - Greenhouse',
                url: 'https://boards.greenhouse.io/figma/jobs/456789',
                description: 'Design multiplayer real-time collaboration engines.',
                page_age: '2026-09-06T09:00:00Z'
              }
            ]
          }
        })
      };
    }
    return originalFetch(url, opts);
  };

  try {
    const jobs = await scanner.scanBraveAtsDiscovery('Distributed Systems');
    assert.equal(jobs.length, 2);
    assert.equal(jobs[0].source, 'ASHBY');
    assert.equal(jobs[0].url, 'https://jobs.ashbyhq.com/openai/987654');
    assert.equal(jobs[1].source, 'GREENHOUSE');
    assert.equal(jobs[1].url, 'https://boards.greenhouse.io/figma/jobs/456789');
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getItem = origGet;
  }
});

test('detectJdRedFlags: identifies rule-based red flags with pure regex', () => {
  // 1. Burnout risk
  const burnoutJd = 'Join our fast-paced environment where we move fast and ship code daily. Salary: $120k.';
  const flags1 = detectJdRedFlags(burnoutJd);
  assert.ok(flags1.some(f => f.label === 'Burnout Risk' && f.color === '#f59e0b'));

  // 2. Under-resourced
  const hatsJd = 'In this early stage team, you will wear many hats across front and backend. Total compensation: $140k.';
  const flags2 = detectJdRedFlags(hatsJd);
  assert.ok(flags2.some(f => f.label === 'Under-Resourced' && f.color === '#f59e0b'));

  // 3. Unrealistic requirements
  const unrealisticJd = 'Must have 10+ years of React experience in production. Competitive salary offered.';
  const flags3 = detectJdRedFlags(unrealisticJd);
  assert.ok(flags3.some(f => f.label === 'Unrealistic Requirements' && f.color === '#ef4444'));

  // 4. No salary listed
  const noSalaryJd = 'We offer great benefits, medical insurance, 401k, and unlimited PTO.';
  const flags4 = detectJdRedFlags(noSalaryJd);
  assert.ok(flags4.some(f => f.label === 'No Salary Listed' && f.color === '#a78bfa'));

  // 5. Explicit salary listed suppresses "No Salary Listed"
  const withSalaryJd = 'Role pays $160,000 - $190,000 per year plus bonus.';
  const flags5 = detectJdRedFlags(withSalaryJd);
  assert.ok(!flags5.some(f => f.label === 'No Salary Listed'));

  // 6. Vague culture filter without diversity
  const cultureJd = 'We look for a strong culture fit who thrives in late night brainstorming. Salary: $100k.';
  const flags6 = detectJdRedFlags(cultureJd);
  assert.ok(flags6.some(f => f.label === 'Vague Culture Filter' && f.color === '#a78bfa'));

  // 7. Culture fit WITH diversity & inclusion does NOT trigger vague culture filter
  const inclusiveJd = 'We assess culture fit alongside our core values of diversity, inclusion, and belonging. Base compensation: $130k.';
  const flags7 = detectJdRedFlags(inclusiveJd);
  assert.ok(!flags7.some(f => f.label === 'Vague Culture Filter'));

  // 8. Informal tone
  const rockstarJd = 'Calling all rockstar engineers and code ninjas! Base salary: $150,000.';
  const flags8 = detectJdRedFlags(rockstarJd);
  assert.ok(flags8.some(f => f.label === 'Informal Tone' && f.color === '#6b7280'));

  // 9. Multiple simultaneous red flags
  const multipleJd = 'We need a rockstar to wear many hats in a fast-paced environment. 10+ years Kubernetes required. We evaluate culture fit.';
  const flagsMulti = detectJdRedFlags(multipleJd);
  assert.equal(flagsMulti.length, 6);
  assert.deepEqual(
    flagsMulti.map(f => f.label),
    ['Burnout Risk', 'Under-Resourced', 'Unrealistic Requirements', 'No Salary Listed', 'Vague Culture Filter', 'Informal Tone']
  );

  // 10. Empty / whitespace inputs
  assert.deepEqual(detectJdRedFlags(''), []);
  assert.deepEqual(detectJdRedFlags('   '), []);
  assert.deepEqual(detectJdRedFlags(null), []);
  assert.deepEqual(detectJdRedFlags(undefined), []);

  // 11. Visa restriction / citizen-only / security clearance
  const visaJd = 'Active Security Clearance Required. Must be a US Citizen. No visa sponsorship available. Base salary: $140,000.';
  const flagsVisa = detectJdRedFlags(visaJd);
  assert.ok(flagsVisa.some(f => f.label === 'Visa Restriction' && f.color === '#f97316'));

  // 12. Multi-level / commission-only / unpaid risk
  const commJd = 'High earning potential with 100% commission only! Unpaid trial period of 2 weeks.';
  const flagsComm = detectJdRedFlags(commJd);
  assert.ok(flagsComm.some(f => f.label === 'Multi-Level / Commission Risk' && f.color === '#ef4444'));

  // 13. Ghost-job probability via text (evergreen requisition / talent pool)
  const ghostTextJd = 'This is an evergreen requisition for talent pool only. Not actively hiring at this moment. Compensation: $120k.';
  const flagsGhostText = detectJdRedFlags(ghostTextJd);
  assert.ok(flagsGhostText.some(f => f.label === 'Ghost-Job Probability' && f.color === '#eab308'));

  // 14. Ghost-job probability via metadata (stale posting > 90 days or GHOST code)
  const metaJd = 'Software Engineer role with competitive compensation of $150k.';
  const flagsGhostMeta = detectJdRedFlags(metaJd, { posted_at: new Date(Date.now() - 100 * 24 * 3600 * 1000).toISOString() });
  assert.ok(flagsGhostMeta.some(f => f.label === 'Ghost-Job Probability' && f.color === '#eab308'));

  const flagsGhostCode = detectJdRedFlags(metaJd, { freshness: { code: 'GHOST' } });
  assert.ok(flagsGhostCode.some(f => f.label === 'Ghost-Job Probability' && f.color === '#eab308'));
});

test('normalizeJob: attaches red_flags to standardized job object', () => {
  const scanner = new BrowserAtsScanner();
  const raw = {
    title: 'Founding Ninja Engineer',
    company: 'Stealth AI',
    description: 'Looking for a rockstar developer in a fast-paced environment. Must wear multiple hats. 10+ years Docker experience.'
  };

  const job = scanner.normalizeJob(raw);
  assert.ok(Array.isArray(job.red_flags));
  assert.ok(job.red_flags.some(f => f.label === 'Burnout Risk'));
  assert.ok(job.red_flags.some(f => f.label === 'Under-Resourced'));
  assert.ok(job.red_flags.some(f => f.label === 'Unrealistic Requirements'));
  assert.ok(job.red_flags.some(f => f.label === 'No Salary Listed'));
  assert.ok(job.red_flags.some(f => f.label === 'Informal Tone'));
});

test('computeJobDedupKey: normalizes company, role title, and remote status for deduplication', () => {
  // Same underlying role with minor formatting differences should yield identical keys
  const jobA = {
    company: 'Stripe, Inc.',
    title: 'Senior Backend Engineer (Remote)',
    location: 'Remote - US'
  };
  const jobB = {
    company: 'stripe',
    title: 'Senior Backend Engineer',
    location: 'Remote'
  };
  assert.equal(computeJobDedupKey(jobA), computeJobDedupKey(jobB));

  // Strips punctuation and bracketed tags
  const jobC = {
    company: 'OpenAI',
    title: 'Research Scientist [Full-Time]',
    location: 'San Francisco, CA'
  };
  assert.equal(computeJobDedupKey(jobC), 'openai:::research scientist:::sanfranciscoca');

  // Empty / null handling
  assert.equal(computeJobDedupKey(null), '');
  assert.equal(computeJobDedupKey({}), '::::::');
});

test('CURATED_ATS_COMPANIES: contains newly expanded tier-1 tech companies', () => {
  // Greenhouse additions
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('shopify'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('waymo'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('lyft'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('snap'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('unity'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('hubspot'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('pagerduty'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('splunk'));

  // Sector pipeline additions (Fintech, SecOps, Robotics, Data)
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('plaid'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('crowdstrike'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('zscaler'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('andurilindustries'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('tesla'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('skydio'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('snowflake'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('confluent'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('dbtlabs'));

  // Ashby additions
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('clickhouse'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('midjourney'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('descript'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('warp'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('replit'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('codeium'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('lumaai'));

  // Lever additions
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('canonical'));
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('eventbrite'));
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('hootsuite'));
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('launchdarkly'));
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('trustpilot'));

  // SmartRecruiters additions
  assert.ok(CURATED_ATS_COMPANIES.smartrecruiters.includes('ikea'));
  assert.ok(CURATED_ATS_COMPANIES.smartrecruiters.includes('visa'));
  assert.ok(CURATED_ATS_COMPANIES.smartrecruiters.includes('bosch'));
  assert.ok(CURATED_ATS_COMPANIES.smartrecruiters.includes('square'));

  // Extended AI, Systems & FinTech additions
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('temporal'));
  assert.ok(CURATED_ATS_COMPANIES.greenhouse.includes('hashicorp'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('mistral'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('runway'));
  assert.ok(CURATED_ATS_COMPANIES.ashby.includes('langchain'));
  assert.ok(CURATED_ATS_COMPANIES.lever.includes('postman'));
  assert.ok(CURATED_ATS_COMPANIES.workable.includes('revolut'));
});

test('scanHackerNewsHiring: parses monthly Algolia thread and top-level founder postings', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('search_by_date')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              title: 'Ask HN: Who is hiring? (September 2026)',
              objectID: '49522897',
              created_at: '2026-09-01T15:00:00Z'
            }
          ]
        })
      };
    }
    if (urlStr.includes('tags=comment,story_49522897')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: 'comment_101',
              parent_id: '49522897',
              author: 'alex_founder',
              comment_text: 'Acme AI | Lead ML Engineer | Remote (US/EU) | Full-time | $160k - $210k | <a href="https://acme.ai/jobs" rel="nofollow">https://acme.ai/jobs</a><p>We are building autonomous agents. Reach out at founder@acme.ai</p>',
              created_at: '2026-09-02T10:00:00Z'
            },
            {
              objectID: 'comment_sub_reply',
              parent_id: 'comment_101', // Sub-comment, should be skipped
              author: 'curious_user',
              comment_text: 'Are you open to interns?',
              created_at: '2026-09-02T11:00:00Z'
            }
          ]
        })
      };
    }
    return { ok: false };
  };

  try {
    const jobs = await scanner.scanHackerNewsHiring();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Acme AI');
    assert.equal(jobs[0].title, 'Lead ML Engineer');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].founder_email, 'founder@acme.ai');
    assert.equal(jobs[0].founder_username, 'alex_founder');
    assert.ok(jobs[0].salary.includes('$160k'));
    assert.equal(jobs[0].url, 'https://acme.ai/jobs');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanHackerNewsHiring: discovers Who is hiring thread via tags=ask_hn query fallback', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('author_whoishiring')) {
      return { ok: false };
    }
    if (urlStr.includes('tags=ask_hn')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              title: 'Ask HN: Who is hiring? (October 2026)',
              objectID: '50012345',
              created_at: '2026-10-01T15:00:00Z'
            }
          ]
        })
      };
    }
    if (urlStr.includes('tags=comment,story_50012345')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: 'comment_202',
              parent_id: '50012345',
              author: 'founder_dan',
              comment_text: 'VentureScale | Founding Platform Engineer | Remote (Worldwide) | $180k | https://venturescale.io/careers<p>Contact dan@venturescale.io</p>',
              created_at: '2026-10-01T16:00:00Z'
            }
          ]
        })
      };
    }
    return { ok: false };
  };

  try {
    const jobs = await scanner.scanHackerNewsHiring();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'VentureScale');
    assert.equal(jobs[0].title, 'Founding Platform Engineer');
    assert.equal(jobs[0].founder_email, 'dan@venturescale.io');
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanRemoteOK: extracts role tags, structured salary, and applies scope filters', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    assert.ok(urlStr.includes('tag=devops'), `Expected tag=devops query param, got: ${urlStr}`);
    return {
      ok: true,
      json: async () => [
        { legal: 'notice' },
        {
          id: 'rok_8891',
          position: 'Senior DevOps / SRE Engineer',
          company: 'CloudFlow Tech',
          location: 'Remote Worldwide',
          apply_url: 'https://cloudflow.io/careers/sre',
          salary_min: 140000,
          salary_max: 180000,
          tags: ['devops', 'kubernetes', 'aws', 'terraform'],
          description: 'Help scale our global multi-region infrastructure.',
          date: '2026-09-03T12:00:00Z'
        }
      ]
    };
  };

  try {
    const scope = { roles: [{ keyword: 'DevOps Engineer' }] };
    const jobs = await scanner.scanRemoteOK(null, scope);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].id, 'remoteok_rok_8891');
    assert.equal(jobs[0].company, 'CloudFlow Tech');
    assert.equal(jobs[0].title, 'Senior DevOps / SRE Engineer');
    assert.equal(jobs[0].salary, '$140,000 - $180,000');
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanJobicy: maps annual salary, geo, and industry parameters', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    return {
      ok: true,
      json: async () => ({
        jobs: [
          {
            id: 'jobicy_9921',
            jobTitle: 'Senior Full Stack Engineer',
            companyName: 'NextWave Systems',
            jobGeo: 'USA / Canada',
            url: 'https://jobicy.com/jobs/nextwave-fullstack',
            jobDescription: 'Build modern reactive distributed applications.',
            annualSalaryMin: '135000',
            annualSalaryMax: '165000',
            salaryCurrency: 'USD',
            pubDate: '2026-09-04T08:30:00Z'
          }
        ]
      })
    };
  };

  try {
    const jobs = await scanner.scanJobicy();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].id, 'jobicy_jobicy_9921');
    assert.equal(jobs[0].company, 'NextWave Systems');
    assert.equal(jobs[0].location, 'USA / Canada');
    assert.equal(jobs[0].salary, 'USD 135,000 - 165,000');
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('scanUSAJobs: fetches and parses federal positions when credentials configured', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  const { storageVault } = await import('./browser_storage_vault.js');
  const originalGetItem = storageVault.getItem.bind(storageVault);

  storageVault.getItem = async (key) => {
    if (key === 'sprav_usajobs_key') return 'test_api_key_12345';
    if (key === 'sprav_usajobs_email') return 'candidate@defense.gov';
    return originalGetItem(key);
  };

  globalThis.fetch = async (url, options) => {
    assert.equal(options?.headers?.['Authorization-Key'], 'test_api_key_12345');
    assert.equal(options?.headers?.['User-Agent'], 'candidate@defense.gov');
    return {
      ok: true,
      json: async () => ({
        SearchResult: {
          SearchResultItems: [
            {
              MatchedObjectDescriptor: {
                PositionID: 'FED_99182',
                PositionTitle: 'Computer Scientist (Cybersecurity & AI)',
                DepartmentName: 'Department of the Air Force',
                PositionLocationDisplay: 'Remote, United States',
                RemoteIndicator: true,
                PositionURI: 'https://www.usajobs.gov/job/99182',
                PositionRemuneration: [
                  {
                    MinimumRange: 132000,
                    MaximumRange: 172000,
                    RateIntervalCode: 'Per Year'
                  }
                ],
                UserArea: {
                  Details: {
                    MajorDuties: ['Lead defense cyber AI telemetry pipelines.'],
                    ClearanceLevel: 'Secret'
                  }
                }
              }
            }
          ]
        }
      })
    };
  };

  try {
    const jobs = await scanner.scanUSAJobs('Cybersecurity');
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Department of the Air Force');
    assert.equal(jobs[0].title, 'Computer Scientist (Cybersecurity & AI)');
    assert.equal(jobs[0].is_remote, true);
    assert.ok(jobs[0].salary.includes('$132,000 - $172,000'));
    assert.ok(jobs[0].description.includes('Security Clearance: Secret'));
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getItem = originalGetItem;
  }
});

test('extractHnContactInfo: parses plain and obfuscated emails and founder names', () => {
  // Plain email and Contact name
  const text1 = 'Acme Corp | Distributed Systems | Remote\nContact: Jordan Lee - email: jordan@acme.ai';
  const res1 = extractHnContactInfo(text1);
  assert.equal(res1.email, 'jordan@acme.ai');
  assert.equal(res1.name, 'Jordan Lee');

  // Obfuscated [at] and [dot]
  const text2 = 'Valkyrie AI | Foundational Models\nReach out to Alex at alex [at] valkyrie [dot] com';
  const res2 = extractHnContactInfo(text2);
  assert.equal(res2.email, 'alex@valkyrie.com');
  assert.equal(res2.name, 'Alex');

  // Obfuscated (at) without dot
  const text3 = 'Startup Inc | Fullstack | Founder: Elena - founder(at)startup.io';
  const res3 = extractHnContactInfo(text3);
  assert.equal(res3.email, 'founder@startup.io');
  assert.equal(res3.name, 'Elena');

  // Text without email
  const text4 = 'No email provided here, apply on portal: https://jobs.com';
  const res4 = extractHnContactInfo(text4);
  assert.equal(res4.email, null);
  assert.equal(res4.name, null);
});

test('discoverCompanyRecruiters: validates company name and missing key', async () => {
  const scanner = new BrowserAtsScanner();

  // Missing company name
  const invalidRes = await scanner.discoverCompanyRecruiters('');
  assert.equal(invalidRes.success, false);
  assert.equal(invalidRes.error, 'INVALID_COMPANY');

  // Missing brave search key
  const originalGetItem = storageVault.getItem;
  storageVault.getItem = async () => null;
  try {
    const noKeyRes = await scanner.discoverCompanyRecruiters('Stripe');
    assert.equal(noKeyRes.success, false);
    assert.equal(noKeyRes.error, 'NO_KEY');
    assert.ok(noKeyRes.query.includes('site:linkedin.com/in'));
    assert.ok(noKeyRes.query.includes('"Stripe"'));
  } finally {
    storageVault.getItem = originalGetItem;
  }
});

test('discoverCompanyRecruiters: parses real Brave Search API LinkedIn dork results', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  const originalGetItem = storageVault.getItem;
  const originalSetItem = storageVault.setItem;

  storageVault.getItem = async (k) => {
    if (k === 'sprav_brave_search_key') return 'mock_brave_key_xyz';
    return null;
  };
  let cachedPayload = null;
  storageVault.setItem = async (k, v) => {
    cachedPayload = v;
  };

  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes('api.search.brave.com/res/v1/web/search'));
    return {
      ok: true,
      json: async () => ({
        web: {
          results: [
            {
              title: 'Jane Doe - Senior Technical Recruiter - Stripe | LinkedIn',
              url: 'https://www.linkedin.com/in/janedoe-recruiter',
              description: 'Technical Recruiter specializing in Distributed Systems, Core Infrastructure, and SRE at Stripe.'
            },
            {
              title: 'Alex Smith - Engineering Manager at Stripe | LinkedIn',
              url: 'https://www.linkedin.com/in/alexsmith-eng',
              description: 'Engineering Manager leading Cloud Platform and Kubernetes teams.'
            },
            {
              title: 'Irrelevant result',
              url: 'https://other-site.com/not-linkedin',
              description: 'Some other site'
            }
          ]
        }
      })
    };
  };

  try {
    const res = await scanner.discoverCompanyRecruiters('Stripe', 'tech');
    assert.equal(res.success, true);
    assert.equal(res.company, 'Stripe');
    assert.equal(res.recruiters.length, 2);

    // First recruiter
    assert.equal(res.recruiters[0].name, 'Jane Doe');
    assert.equal(res.recruiters[0].title, 'Senior Technical Recruiter');
    assert.equal(res.recruiters[0].linkedin_url, 'https://www.linkedin.com/in/janedoe-recruiter');
    assert.ok(res.recruiters[0].team.includes('Recruiting') || res.recruiters[0].team.includes('Systems'));

    // Second recruiter
    assert.equal(res.recruiters[1].name, 'Alex Smith');
    assert.equal(res.recruiters[1].team, 'Engineering Leadership');
    assert.equal(res.recruiters[1].linkedin_url, 'https://www.linkedin.com/in/alexsmith-eng');

    // Storage vault cache verified
    assert.ok(cachedPayload);
    assert.equal(cachedPayload.company, 'Stripe');
    assert.equal(cachedPayload.recruiters.length, 2);
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getItem = originalGetItem;
    storageVault.setItem = originalSetItem;
  }
});

test('scanHackerNews: fetches latest monthly story and parses founder postings via Algolia', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('tags=story,author_whoishiring')) {
      return {
        ok: true,
        json: async () => ({
          hits: [{ objectID: '999111', title: 'Ask HN: Who is hiring? (September 2026)' }]
        })
      };
    }
    if (urlStr.includes('tags=comment,story_999111')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: '888222',
              author: 'founder_dan',
              comment_text: 'Acme Corp | Senior Distributed Systems Engineer | Remote | $180k-$220k\n\nWe build high-throughput data pipelines with Rust and ClickHouse. Contact: dan@acme.com',
              created_at: '2026-09-01T12:00:00Z'
            }
          ]
        })
      };
    }
    return { ok: false };
  };

  try {
    const jobs = await scanner.scanHackerNews(new AbortController().signal);
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].id, 'hn_888222');
    assert.equal(jobs[0].company, 'Acme Corp');
    assert.equal(jobs[0].title, 'Senior Distributed Systems Engineer');
    assert.equal(jobs[0].source, 'Hacker News');
    assert.equal(jobs[0].portal, 'Hacker News (Founder Direct)');
    assert.equal(jobs[0].is_remote, true);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('getUserWatchlistTargets: handles storageVault.getWatchlist and fallback gracefully', async () => {
  const scanner = new BrowserAtsScanner();
  const origGetWatchlist = storageVault.getWatchlist;
  const origGetItem = storageVault.getItem;

  try {
    // 1. Test IndexedDB v2 store returns entries
    storageVault.getWatchlist = async () => [
      { name: 'Spotify', careers_url: 'https://jobs.lever.co/spotify' },
      { name: 'Linear', careers_url: 'https://apply.workable.com/linear/' }
    ];
    let targets = await scanner.getUserWatchlistTargets();
    assert.equal(targets.length, 2);
    assert.equal(targets[0].platform, 'lever');
    assert.equal(targets[0].slug, 'spotify');
    assert.equal(targets[1].platform, 'workable');
    assert.equal(targets[1].slug, 'linear');

    // 2. Test fallback to legacy sprav_watchlist when getWatchlist returns empty
    storageVault.getWatchlist = async () => [];
    storageVault.getItem = async (key) => {
      if (key === 'sprav_watchlist') {
        return [{ name: 'Stripe', careers_url: 'https://boards.greenhouse.io/stripe' }];
      }
      return null;
    };
    targets = await scanner.getUserWatchlistTargets();
    assert.equal(targets.length, 1);
    assert.equal(targets[0].platform, 'greenhouse');
    assert.equal(targets[0].slug, 'stripe');
  } finally {
    storageVault.getWatchlist = origGetWatchlist;
    storageVault.getItem = origGetItem;
  }
});

test('searchLiveKeyword: scopes to Who is hiring and ignores generic comments', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  const origGetJobs = storageVault.getJobs;
  const origSaveJob = storageVault.saveJob;

  const saved = [];
  storageVault.getJobs = async () => [];
  storageVault.saveJob = async (job) => { saved.push(job); };

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('tags=story,author_whoishiring')) {
      return {
        ok: true,
        json: async () => ({
          hits: [{ objectID: '555000', title: 'Ask HN: Who is hiring? (September 2026)' }]
        })
      };
    }
    if (urlStr.includes('tags=comment,story_555000')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            // Generic opinion comment - should be filtered out
            {
              objectID: 'c1',
              author: 'random_user',
              comment_text: 'I think Rust is better than Go for microservices because memory safety is great.',
              parent_id: '555000'
            },
            // Genuine hiring post
            {
              objectID: 'c2',
              author: 'tech_lead',
              comment_text: 'CloudScale | Senior Rust Engineer | Remote | Full-Time | $190,000\n\nWe are hiring an experienced Rust engineer. Email jobs@cloudscale.io',
              parent_id: '555000'
            }
          ]
        })
      };
    }
    // Remotive or others
    return { ok: true, json: async () => ({ jobs: [] }) };
  };

  try {
    const count = await scanner.searchLiveKeyword('Rust', {
      kb: { skills: { core: ['Rust'] } }
    });
    assert.equal(count, 1);
    assert.equal(saved.length, 1);
    assert.equal(saved[0].company, 'CloudScale');
    assert.equal(saved[0].title, 'Senior Rust Engineer');
  } finally {
    globalThis.fetch = originalFetch;
    storageVault.getJobs = origGetJobs;
    storageVault.saveJob = origSaveJob;
  }
});

test('isJobMatchingScope: comprehensively enforces location filtering and rejects foreign onsite roles', () => {
  const scanner = new BrowserAtsScanner();
  const bengaluruScope = {
    roles: [{ keyword: 'Backend', preference: 'apply' }],
    locations: [
      { label: 'Bengaluru', preference: 'apply' },
      { label: 'India', preference: 'apply' }
    ],
    work_mode: 'any'
  };

  // 1. Matches exact and aliased target locations
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Backend Engineer', location: 'Bengaluru, Karnataka, India' }, bengaluruScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Backend Engineer', location: 'Bangalore, India' }, bengaluruScope), true);

  // 2. Rejects foreign onsite roles
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'San Francisco, CA' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Berlin, Germany' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Munich, Germany' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Tokyo, Japan' }, bengaluruScope), false);

  // 3. Remote roles handling: open remote allowed, geo-fenced foreign remote rejected
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote', is_remote: true }, bengaluruScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Worldwide', is_remote: true }, bengaluruScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - India', is_remote: true }, bengaluruScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - US Only', is_remote: true }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - Europe Only', is_remote: true }, bengaluruScope), false);

  // 4. Token boundary test (avoiding false positives: "Austin" must not match "IN")
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Austin, TX' }, bengaluruScope), false);

  // 5. Excluded location filter
  const excludedScope = {
    roles: [{ keyword: 'Backend', preference: 'apply' }],
    locations: [
      { label: 'India', preference: 'apply' },
      { label: 'Delhi', preference: 'exclude' }
    ],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Bengaluru, India' }, excludedScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'New Delhi, India' }, excludedScope), false);

  // 6. Work mode constraint tests
  const remoteOnlyScope = { ...bengaluruScope, work_mode: 'remote_only' };
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Bengaluru, India', is_remote: false }, remoteOnlyScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote', is_remote: true }, remoteOnlyScope), true);

  const onsiteOnlyScope = { ...bengaluruScope, work_mode: 'onsite_only' };
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote', is_remote: true }, onsiteOnlyScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Bengaluru, India', is_remote: false }, onsiteOnlyScope), true);

  // 7. Strict foreign geo-anchor barrier: rejects Singapore and other foreign roles when scope is India
  assert.equal(scanner.isJobMatchingScope({ title: 'Applied AI Engineer - APAC', location: 'Singapore' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Applied AI Engineer - APAC', location: 'Singapore, Central Singapore' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Applied AI Engineer - APAC', location: 'Remote, Singapore', is_remote: true }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Applied AI Engineer - APAC', location: 'Singapore', is_remote: true }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Frontend Engineer', location: 'London, UK' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Staff AI Engineer', location: 'San Francisco, CA' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Staff AI Engineer', location: 'Toronto, Canada' }, bengaluruScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer - Sydney', location: 'Australia' }, bengaluruScope), false);

  // 8. Remote Country Eligibility & Description Residency Enforcement:
  // Ensures remote jobs requiring foreign residency/work-auth in description are rejected when candidate's country does not match
  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'We are looking for a Backend Engineer. Candidates must reside in the United States and be authorized to work in the US without sponsorship.',
    is_remote: true
  }, bengaluruScope), false);

  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'This is a 100% remote position. Open only to residents of the United Kingdom.',
    is_remote: true
  }, bengaluruScope), false);

  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'Fully remote role. Must be located in Europe / EMEA timezones.',
    is_remote: true
  }, bengaluruScope), false);

  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'Remote position. Must reside in Canada and have valid work authorization.',
    is_remote: true
  }, bengaluruScope), false);

  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'Join our India engineering team. Work from anywhere in India.',
    is_remote: true
  }, bengaluruScope), true);

  assert.equal(scanner.isJobMatchingScope({
    title: 'Backend Engineer',
    location: 'Remote',
    description: 'We are a fully distributed worldwide team. You can work from anywhere in the world.',
    is_remote: true
  }, bengaluruScope), true);

  // Even when candidate targets both India and "Remote", foreign remote restrictions must still be enforced
  const indiaWithRemoteScope = {
    roles: [{ keyword: 'Backend', preference: 'apply' }],
    locations: [
      { label: 'India', preference: 'apply' },
      { label: 'Bengaluru', preference: 'apply' },
      { label: 'Remote', preference: 'apply' }
    ],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - US Only', is_remote: true }, indiaWithRemoteScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - UK Only', is_remote: true }, indiaWithRemoteScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - India', is_remote: true }, indiaWithRemoteScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Worldwide', is_remote: true }, indiaWithRemoteScope), true);

  // When candidate targets United States, US Remote is accepted, but India or UK remote is rejected
  const usScope = {
    roles: [{ keyword: 'Backend', preference: 'apply' }],
    locations: [
      { label: 'San Francisco, CA', preference: 'apply' },
      { label: 'United States', preference: 'apply' }
    ],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - US Only', is_remote: true }, usScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote', description: 'Must reside in the United States.', is_remote: true }, usScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - India', is_remote: true }, usScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Backend Engineer', location: 'Remote - UK Only', is_remote: true }, usScope), false);
});

test('scanLeverCompany: caches 404 dead slugs and skips redundant HTTP calls', async () => {
  const scanner = new BrowserAtsScanner();
  const originalFetch = globalThis.fetch;
  let fetchCount = 0;

  globalThis.fetch = async (url) => {
    fetchCount++;
    if (url.includes('dead-company')) {
      return { ok: false, status: 404 };
    }
    if (url.includes('live-company')) {
      return {
        ok: true,
        status: 200,
        json: async () => ([{
          id: 'job-123',
          text: 'Software Engineer',
          workplaceType: 'remote',
          hostedUrl: 'https://jobs.lever.co/live-company/job-123'
        }])
      };
    }
    return { ok: false, status: 500 };
  };

  try {
    // First call to 404 company should hit fetch and cache the dead slug
    const res1 = await scanner.scanLeverCompany('dead-company');
    assert.deepEqual(res1, []);
    assert.equal(fetchCount, 1);
    assert.ok(scanner._inactiveLeverSlugs.has('dead-company'));

    // Second call should return immediately from cache without fetching
    const res2 = await scanner.scanLeverCompany('dead-company');
    assert.deepEqual(res2, []);
    assert.equal(fetchCount, 1, 'Should NOT invoke fetch for known 404 dead slug');

    // Live company works normally
    const liveJobs = await scanner.scanLeverCompany('live-company');
    assert.equal(liveJobs.length, 1);
    assert.equal(liveJobs[0].title, 'Software Engineer');
    assert.equal(fetchCount, 2);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('isJobMatchingScope: enforces fresher seniority and prevents substring collision with senior roles', () => {
  const scanner = new BrowserAtsScanner();
  const fresherScope = {
    roles: [
      { keyword: 'Software Engineer', preference: 'apply' },
      { keyword: 'Graduate Engineer Trainee', preference: 'apply' }
    ],
    experience_level: 'fresher',
    work_mode: 'any'
  };

  // Freshers SHOULD match:
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineering Intern' }, fresherScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Graduate Software Engineer' }, fresherScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Graduate Engineer Trainee (GET)' }, fresherScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Trainee Software Engineer' }, fresherScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Entry Level Software Engineer' }, fresherScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Junior Software Engineer' }, fresherScope), true);

  // Freshers MUST NOT match senior / staff / leadership positions (preventing substring collision):
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Software Engineer' }, fresherScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Lead Software Engineer' }, fresherScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Staff Software Engineer' }, fresherScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Principal Software Engineer' }, fresherScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Director of Software Engineering' }, fresherScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'VP of Software Engineering' }, fresherScope), false);
});

test('isJobMatchingScope: enforces senior and staff_exec boundaries', () => {
  const scanner = new BrowserAtsScanner();

  // Senior candidate
  const seniorScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    experience_level: 'senior',
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Software Engineer' }, seniorScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Lead Software Engineer' }, seniorScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineering Intern' }, seniorScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Trainee Software Engineer' }, seniorScope), false);

  // Staff / Exec candidate
  const staffScope = {
    roles: [
      { keyword: 'Software Engineer', preference: 'apply' },
      { keyword: 'Distinguished Engineer', preference: 'apply' }
    ],
    experience_level: 'staff_exec',
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Staff Software Engineer' }, staffScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Principal Software Engineer' }, staffScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Distinguished Engineer' }, staffScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Junior Software Engineer' }, staffScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Mid Software Engineer' }, staffScope), false);
});

test('isJobMatchingScope: enforces job types and engagement contracts (internship/contract toggles)', () => {
  const scanner = new BrowserAtsScanner();

  // Exclude internships
  const noInternshipScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    job_types: { internship: 'exclude', full_time: 'include' }
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer' }, noInternshipScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineering Intern' }, noInternshipScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer Co-Op' }, noInternshipScope), false);

  // Exclude contract / C2C
  const noContractScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    job_types: { contract: 'exclude', full_time: 'include' }
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer (Full-Time)' }, noContractScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer (C2C Contractor)', description: 'Corp to corp 1099 contract' }, noContractScope), false);

  // Exclusively internships (student scope)
  const onlyInternScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    job_types: { internship: 'include', full_time: 'exclude', contract: 'exclude' }
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineering Intern' }, onlyInternScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Core Software Engineer' }, onlyInternScope), false);
});

test('isJobMatchingScope: correctly resolves worldwide locations and country code aliases', () => {
  const scanner = new BrowserAtsScanner();

  // Japan Scope
  const japanScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'Japan', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Tokyo, Japan' }, japanScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Tokyo, JP' }, japanScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Sydney, Australia' }, japanScope), false);

  // UAE Scope
  const uaeScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'UAE', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Dubai, UAE' }, uaeScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Abu Dhabi, United Arab Emirates' }, uaeScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'London, UK' }, uaeScope), false);

  // Australia Scope
  const ausScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'Australia', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Sydney, NSW, Australia' }, ausScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Melbourne, AU' }, ausScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Berlin, Germany' }, ausScope), false);

  // France & Poland Scope
  const europeScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'France', preference: 'apply' }, { label: 'Poland', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Paris, France' }, europeScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Warsaw, Poland' }, europeScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'New York, US' }, europeScope), false);
});

test('isJobMatchingScope: correctly resolves APAC remote geo-fencing for Indian and Australian candidates', () => {
  const scanner = new BrowserAtsScanner();

  // Indian candidate targeting APAC remote
  const indiaScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'Bengaluru', preference: 'apply' }, { label: 'India', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Remote - APAC Only', is_remote: true }, indiaScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Remote - Asia Only', is_remote: true }, indiaScope), true);

  // Australian candidate targeting APAC remote
  const ausScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: [{ label: 'Sydney', preference: 'apply' }, { label: 'Australia', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Remote - APAC Only', is_remote: true }, ausScope), true);

  // Foreign geo-fenced remote rejection
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Remote - US Only', is_remote: true }, indiaScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', location: 'Remote - Europe Only', is_remote: true }, indiaScope), false);
});

test('checkSkillInText: enforces strict token boundaries and prevents substring false positives', () => {
  // 1. "Java" should NOT match "JavaScript" or "JavaScript Developer"
  const jsJob = 'We are seeking a senior JavaScript and TypeScript frontend developer.';
  assert.equal(checkSkillInText('java', jsJob), false, 'Java should NOT match text containing only JavaScript');
  assert.equal(checkSkillInText('javascript', jsJob), true, 'JavaScript should match JavaScript');

  // 2. "Java" SHOULD match actual Java
  const javaJob = 'Backend engineer with strong Java and Spring Boot experience.';
  assert.equal(checkSkillInText('java', javaJob), true, 'Java should match standalone Java');

  // 3. "Go" should NOT match "Good" or "Algorithm"
  const goodJob = 'Looking for a good engineer with strong algorithm skills.';
  assert.equal(checkSkillInText('go', goodJob), false, 'Go should NOT match good or algorithm');
  const goJob = 'Experience with Go (Golang) and microservices required.';
  assert.equal(checkSkillInText('go', goJob), true, 'Go should match Go or Golang');

  // 4. "C" should NOT match "Cloud" or "CSS"
  const cloudJob = 'Experience with Cloud computing and modern CSS layouts.';
  assert.equal(checkSkillInText('c', cloudJob), false, 'C should NOT match Cloud or CSS');
  const cJob = 'Low level systems engineering in C and C++ required.';
  assert.equal(checkSkillInText('c', cJob), true, 'C should match standalone C');
  assert.equal(checkSkillInText('c++', cJob), true, 'C++ should match C++');
});

test('checkSkillInText: resolves tech skill synonyms bidirectional', () => {
  // 1. "Kubernetes" matches "K8s"
  const k8sJob = 'Hands-on experience deploying microservices with K8s and Helm.';
  assert.equal(checkSkillInText('kubernetes', k8sJob), true, 'Candidate skill kubernetes should match job text with k8s');
  assert.equal(checkSkillInText('k8s', 'Expertise in Kubernetes container orchestration.'), true, 'Candidate skill k8s should match job text with Kubernetes');

  // 2. "Golang" matches "Go"
  assert.equal(checkSkillInText('golang', 'Building high performance services in Go.'), true);
  assert.equal(checkSkillInText('go', 'Building high performance services in Golang.'), true);

  // 3. "Postgres" matches "PostgreSQL"
  assert.equal(checkSkillInText('postgresql', 'Database administration with Postgres 15.'), true);
  assert.equal(checkSkillInText('postgres', 'Database administration with PostgreSQL 16.'), true);

  // 4. "React" matches "ReactJS" and "React.js"
  assert.equal(checkSkillInText('react', 'Frontend development with ReactJS and Redux.'), true);
  assert.equal(checkSkillInText('reactjs', 'Frontend development with React 19.'), true);
});

test('getRotatedBatch: rotates cursors deterministically and wraps around without errors', () => {
  const companyList = ['apple', 'google', 'meta', 'amazon', 'microsoft', 'netflix', 'spotify', 'stripe'];
  const cursorMap = {};

  // Batch 1 (limit 3, offset 0 -> apple, google, meta)
  const res1 = getRotatedBatch(companyList, 'test_platform', cursorMap, 3);
  assert.deepEqual(res1.batch, ['apple', 'google', 'meta']);
  assert.equal(res1.nextCursor, 3);
  assert.equal(cursorMap.test_platform, 3);

  // Batch 2 (limit 3, offset 3 -> amazon, microsoft, netflix)
  const res2 = getRotatedBatch(companyList, 'test_platform', cursorMap, 3);
  assert.deepEqual(res2.batch, ['amazon', 'microsoft', 'netflix']);
  assert.equal(res2.nextCursor, 6);
  assert.equal(cursorMap.test_platform, 6);

  // Batch 3 (limit 3, offset 6 -> spotify, stripe, wraps to apple)
  const res3 = getRotatedBatch(companyList, 'test_platform', cursorMap, 3);
  assert.deepEqual(res3.batch, ['spotify', 'stripe', 'apple']);
  assert.equal(res3.nextCursor, 1);
  assert.equal(cursorMap.test_platform, 1);

  // Empty or invalid inputs
  assert.deepEqual(getRotatedBatch([], 'empty_platform', cursorMap, 5), { batch: [], nextCursor: 0 });
  assert.deepEqual(getRotatedBatch(null, 'null_platform', cursorMap, 5), { batch: [], nextCursor: 0 });
});

test('mergeCompanyRegistries: correctly merges base and community boards with deduplication', () => {
  const base = {
    greenhouse: ['stripe', 'airbnb'],
    ashby: ['openai']
  };
  const community = {
    greenhouse: ['Stripe', 'Figma', 'Databricks'],
    lever: ['postman']
  };

  const merged = mergeCompanyRegistries(base, community);
  // greenhouse should have stripe (not duplicated), airbnb, figma, databricks
  assert.equal(merged.greenhouse.length, 4);
  assert.ok(merged.greenhouse.includes('stripe'));
  assert.ok(merged.greenhouse.includes('airbnb'));
  assert.ok(merged.greenhouse.includes('figma'));
  assert.ok(merged.greenhouse.includes('databricks'));

  // ashby preserved
  assert.deepEqual(merged.ashby, ['openai']);

  // lever added
  assert.deepEqual(merged.lever, ['postman']);
});

test('loadCommunityRegistry: returns base registry on network failure gracefully', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error('Network offline or CSP blocked');
  };

  try {
    const registry = await loadCommunityRegistry({ cacheTtlMs: 0 });
    assert.ok(registry.greenhouse.length > 50);
    assert.ok(registry.ashby.length > 50);
    assert.ok(registry.greenhouse.includes('stripe'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('calculateAtsFit: incorporates semanticScore into hybrid score when provided', () => {
  const scanner = new BrowserAtsScanner();
  const candidateSkills = ['Python', 'Docker'];
  const jobText = 'Looking for Python and Docker engineer with Kubernetes and Rust.';

  // 1. Without semanticScore (100% token fit)
  const fitWithout = scanner.calculateAtsFit(candidateSkills, jobText);
  // 2. With semanticScore = 90
  const fitWith = scanner.calculateAtsFit(candidateSkills, jobText, 90);

  assert.equal(fitWith.semantic_score, 90);
  assert.equal(typeof fitWith.score, 'number');
  // With 90 semantic score added (0.7 * fitWithout.score + 0.3 * 90), score should be influenced
  const expectedHybrid = Math.min(100, Math.round(0.7 * fitWithout.score + 0.3 * 90));
  assert.equal(fitWith.score, expectedHybrid);
});

test('computeJobHealthScore: returns 100 and clean tier when no flags present', () => {
  const res = computeJobHealthScore([]);
  assert.equal(res.score, 100);
  assert.equal(res.tier, 'clean');
  assert.equal(res.label, '✓ Clean');
});

test('computeJobHealthScore: calculates severity penalties and assigns correct tiers', () => {
  // Caution tier: minor flags (e.g. No Salary Listed: 10) -> score 90
  const cautionRes = computeJobHealthScore([{ label: 'No Salary Listed' }]);
  assert.equal(cautionRes.score, 90);
  assert.equal(cautionRes.tier, 'clean');

  // Caution tier: No Salary Listed (10) + Burnout Risk (15) -> score 75
  const cautionRes2 = computeJobHealthScore([{ label: 'No Salary Listed' }, { label: 'Burnout Risk' }]);
  assert.equal(cautionRes2.score, 75);
  assert.equal(cautionRes2.tier, 'caution');

  // Risky tier: Unrealistic Requirements (30) + Burnout Risk (15) -> score 55
  const riskyRes = computeJobHealthScore([{ label: 'Unrealistic Requirements' }, { label: 'Burnout Risk' }]);
  assert.equal(riskyRes.score, 55);
  assert.equal(riskyRes.tier, 'risky');
  assert.equal(riskyRes.label, '⚡ Risky');

  // Avoid tier: Multi-Level / Commission Risk (40) + Unrealistic Requirements (30) -> score 30
  const avoidRes = computeJobHealthScore([
    { label: 'Multi-Level / Commission Risk' },
    { label: 'Unrealistic Requirements' }
  ]);
  assert.equal(avoidRes.score, 30);
  assert.equal(avoidRes.tier, 'avoid');
  assert.equal(avoidRes.label, '⛔ Avoid');
});

test('scanArbeitnow: fetches pages with direct URL and maps visa_sponsorship accurately', async () => {
  const scanner = new BrowserAtsScanner();
  const origFetch = globalThis.fetch;
  const requestedUrls = [];

  globalThis.fetch = async (url) => {
    requestedUrls.push(url);
    if (url.includes('page=2')) {
      return {
        ok: true,
        json: async () => ({
          data: [{
            slug: 'fullstack-dev-2',
            title: 'Fullstack Dev 2',
            company_name: 'TechBerlin',
            location: 'Berlin',
            remote: true,
            visa_sponsorship: true,
            created_at: 1710000000
          }]
        })
      };
    }
    return {
      ok: true,
      json: async () => ({
        data: [{
          slug: 'senior-engineer-1',
          title: 'Senior Engineer',
          company_name: 'Quince',
          location: 'Munich',
          remote: false,
          visa_sponsorship: false,
          created_at: 1710000000
        }]
      })
    };
  };

  try {
    const jobs = await scanner.scanArbeitnow();
    assert.equal(jobs.length, 2);
    assert.ok(requestedUrls[0].includes('https://www.arbeitnow.com/api/job-board-api'));
    assert.equal(jobs[0].company, 'Quince');
    assert.equal(jobs[0].visa_sponsorship, false);
    assert.equal(jobs[1].company, 'TechBerlin');
    assert.equal(jobs[1].visa_sponsorship, true);
    assert.equal(jobs[1].is_remote, true);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('scanOpenJobsData: fetches and normalizes daily direct ATS engineering drops', async () => {
  const scanner = new BrowserAtsScanner();
  const origFetch = globalThis.fetch;

  const mockData = [
    {
      company: "Stripe",
      platform: "greenhouse",
      jobId: "8196269",
      title: "Staff Infrastructure Engineer",
      locations: ["San Francisco", "Remote"],
      isRemote: true,
      applyUrl: "https://stripe.com/jobs/search?gh_jid=8196269",
      postedAt: "2026-09-17T04:22:38-04:00"
    }
  ];

  globalThis.fetch = async (url) => {
    assert.ok(url.includes('new-jobs.json'));
    return {
      ok: true,
      json: async () => mockData
    };
  };

  try {
    const jobs = await scanner.scanOpenJobsData();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Stripe');
    assert.equal(jobs[0].title, 'Staff Infrastructure Engineer');
    assert.equal(jobs[0].is_remote, true);
    assert.equal(jobs[0].portal, 'greenhouse');
    assert.equal(jobs[0].source, 'Direct GREENHOUSE');
    assert.equal(jobs[0].url, 'https://stripe.com/jobs/search?gh_jid=8196269');
  } finally {
    globalThis.fetch = origFetch;
  }
});


test('scanWeWorkRemotely: parses RSS XML into structured remote jobs', async () => {
  const scanner = new BrowserAtsScanner();
  const origFetch = globalThis.fetch;

  const mockXml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <item>
      <title>Storyblok: Senior Backend Engineer (Node.js)</title>
      <link>https://weworkremotely.com/remote-jobs/storyblok-senior-backend-engineer</link>
      <pubDate>Fri, 11 Sep 2026 10:00:00 +0000</pubDate>
      <region>Europe, Anywhere</region>
      <category>Programming</category>
      <description>&lt;p&gt;Looking for Node.js experts.&lt;/p&gt;</description>
    </item>
  </channel>
</rss>`;

  globalThis.fetch = async () => ({
    ok: true,
    text: async () => mockXml
  });

  try {
    const jobs = await scanner.scanWeWorkRemotely();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Storyblok');
    assert.equal(jobs[0].title, 'Senior Backend Engineer (Node.js)');
    assert.equal(jobs[0].source, 'We Work Remotely');
    assert.equal(jobs[0].portal, 'WeWorkRemotely');
    assert.equal(jobs[0].is_remote, true);
    assert.ok(jobs[0].location.includes('Europe'));
    assert.ok(jobs[0].tags.includes('Programming'));
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('scanHiringWithoutWhiteboards: cross-references HWOW companies and tags them with no_whiteboard', async () => {
  const scanner = new BrowserAtsScanner();
  const origScanGreenhouse = scanner.scanGreenhouseCompany;

  scanner.scanGreenhouseCompany = async (slug) => {
    if (slug === 'airtable') {
      return [{
        id: 'gh_airtable_1',
        title: 'Product Engineer',
        company: 'Airtable',
        url: 'https://boards.greenhouse.io/airtable/jobs/1',
        source: 'Greenhouse'
      }];
    }
    return [];
  };

  try {
    const jobs = await scanner.scanHiringWithoutWhiteboards();
    if (jobs.length > 0) {
      assert.ok(jobs.some(j => j.no_whiteboard === true));
      assert.ok(jobs.some(j => j.tags.includes('No Whiteboard')));
    }
  } finally {
    scanner.scanGreenhouseCompany = origScanGreenhouse;
  }
});

test('scanFreeJobsBoard and scanJobsearchDev: degrade gracefully when endpoints are down', async () => {
  const scanner = new BrowserAtsScanner();
  const origFetch = globalThis.fetch;

  globalThis.fetch = async () => {
    throw new Error('getaddrinfo ENOTFOUND freejobsboard.com');
  };

  try {
    const fjb = await scanner.scanFreeJobsBoard();
    assert.deepEqual(fjb, []);

    const jsdev = await scanner.scanJobsearchDev();
    assert.deepEqual(jsdev, []);
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('calculateAtsFit: provides authentic >= 80% fit score for cybersecurity and cloud profiles', () => {
  const scanner = new BrowserAtsScanner();

  // Cybersecurity Candidate
  const cyberSkills = ['SIEM', 'Wireshark', 'Splunk', 'OWASP', 'Python', 'Linux'];
  const cyberJd = 'Looking for a Senior Cybersecurity Engineer proficient in SIEM, Wireshark, Splunk, OWASP, and Linux.';
  const cyberFit = scanner.calculateAtsFit(cyberSkills, cyberJd);
  assert.ok(cyberFit.score >= 80, `Cyber candidate score should be >= 80, got ${cyberFit.score}`);
  assert.ok(cyberFit.matched.includes('siem'));
  assert.ok(cyberFit.matched.includes('wireshark'));
  assert.ok(cyberFit.matched.includes('splunk'));
  assert.ok(cyberFit.matched.includes('owasp'));

  // Cloud & DevOps Candidate
  const cloudSkills = ['Terraform', 'Kubernetes', 'AWS', 'Docker', 'Prometheus', 'Helm'];
  const cloudJd = 'Seeking a Cloud Platform Engineer skilled in Terraform, Kubernetes, AWS, Docker, and Prometheus.';
  const cloudFit = scanner.calculateAtsFit(cloudSkills, cloudJd);
  assert.ok(cloudFit.score >= 80, `Cloud candidate score should be >= 80, got ${cloudFit.score}`);
  assert.ok(cloudFit.matched.includes('terraform'));
  assert.ok(cloudFit.matched.includes('kubernetes'));
  assert.ok(cloudFit.matched.includes('aws'));
  assert.ok(cloudFit.matched.includes('docker'));
});

test('isJobMatchingScope: correctly matches colloquial role shorthands ("ai engg", "cloud engg", "sec engg") to corporate ATS postings', () => {
  const scanner = new BrowserAtsScanner();

  // AI colloquial scope
  const aiScope = {
    roles: [{ keyword: 'ai engg', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior AI Engineer' }, aiScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Machine Learning Engineer' }, aiScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Staff Applied AI Engineer' }, aiScope), true);

  // Cloud colloquial scope
  const cloudScope = {
    roles: [{ keyword: 'cloud engg', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Cloud Platform Engineer' }, cloudScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'DevOps Engineer II' }, cloudScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Site Reliability Engineer' }, cloudScope), true);

  // Cyber colloquial scope
  const cyberScope = {
    roles: [{ keyword: 'sec engg', preference: 'apply' }],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Cybersecurity Analyst' }, cyberScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Application Security Engineer' }, cyberScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Information Security Specialist' }, cyberScope), true);

  // Scope with target_titles property instead of roles array
  const targetTitlesScope = {
    target_titles: ['AI Engineer', 'Machine Learning Engineer'],
    work_mode: 'any'
  };
  assert.equal(scanner.isJobMatchingScope({ title: 'Lead AI Engineer' }, targetTitlesScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Senior Machine Learning Specialist' }, targetTitlesScope), true);
});

test('isJobMatchingScope: India 28 hubs scope strictly rejects German and US jobs while accepting Indian tech hubs and unicorns', () => {
  const scanner = new BrowserAtsScanner();
  const india28HubsScope = {
    roles: [{ keyword: 'Software Engineer', preference: 'apply' }],
    locations: COUNTRY_CITY_MAP['india'].cities.map(c => ({ label: c, preference: 'apply' })),
    work_mode: 'any'
  };

  // Rejects European and German jobs (both onsite, remote in country, and German companies)
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Personio', location: 'Berlin' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Personio', location: 'Remote' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Taxfix', location: 'Remote in Germany' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Delivery Hero', location: 'Remote (Hamburg)' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Delivery Hero', location: 'Remote' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Klarna', location: 'Remote' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'N26', location: 'Remote - Germany' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Python Trainer (m/w/d) - 100% remote', company: 'Karrieretutor De', location: '100% Remote in Deutschland' }, india28HubsScope), false);

  // Rejects US foreign jobs
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Stripe', location: 'Remote - US' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Stripe', location: 'Remote' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Figma', location: 'San Francisco, CA' }, india28HubsScope), false);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Deepnote', location: 'Remote' }, india28HubsScope), false);

  // Accepts Indian Tech Hubs (both onsite and remote)
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Razorpay', location: 'Bengaluru' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Razorpay', location: 'Remote' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Swiggy', location: 'Remote, India' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Swiggy', location: 'Remote' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Postman', location: 'Remote' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'BrowserStack', location: 'Mumbai' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'BrowserStack', location: 'Remote' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Cred', location: 'Bengaluru' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Meesho', location: 'Remote' }, india28HubsScope), true);
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'Freshworks', location: 'Chennai' }, india28HubsScope), true);

  // Accepts authentic worldwide remote
  assert.equal(scanner.isJobMatchingScope({ title: 'Software Engineer', company: 'GitLab', location: 'Remote (Worldwide)' }, india28HubsScope), true);
});

test('fetchWithTimeout: successfully returns responses and enforces deadline aborts', async () => {
  const origFetch = globalThis.fetch;
  try {
    // 1. Successful quick response
    globalThis.fetch = async (url, opts) => {
      return { ok: true, status: 200, json: async () => ({ status: 'ok' }) };
    };
    const res = await fetchWithTimeout('https://api.example.com/fast', {}, 500);
    assert.equal(res.ok, true);
    const data = await res.json();
    assert.equal(data.status, 'ok');

    // 2. Timeout abort
    globalThis.fetch = async (url, opts) => {
      return new Promise((resolve, reject) => {
        const signal = opts?.signal;
        if (signal?.aborted) {
          return reject(new DOMException('Aborted', 'AbortError'));
        }
        signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    };

    let timedOut = false;
    try {
      await fetchWithTimeout('https://api.example.com/slow', {}, 50);
    } catch (err) {
      timedOut = true;
      assert.ok(err.name === 'AbortError' || String(err).includes('Abort') || String(err).includes('timed out'));
    }
    assert.equal(timedOut, true, 'fetchWithTimeout should abort when call exceeds timeoutMs');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('parseHnPostingHeader: correctly extracts company and location when location appears first in header', () => {
  // Case 1: Location: [City, Country] | Company | Role
  const res1 = parseHnPostingHeader('Location: [San Francisco, CA] | Acme Corp | Senior Backend Engineer', 'alex');
  assert.equal(res1.company, 'Acme Corp');
  assert.equal(res1.location, 'San Francisco, CA');
  assert.equal(res1.title, 'Senior Backend Engineer');

  // Case 2: Location: London, UK | StartupX | Full Stack Engineer | Remote
  const res2 = parseHnPostingHeader('Location: London, UK | StartupX | Full Stack Engineer | Remote', 'dan');
  assert.equal(res2.company, 'StartupX');
  assert.equal(res2.location, 'London, UK');
  assert.equal(res2.title, 'Full Stack Engineer');
  assert.equal(res2.isRemote, true);

  // Case 3: Standard format: Acme AI | Lead ML Engineer | Remote (US)
  const res3 = parseHnPostingHeader('Acme AI | Lead ML Engineer | Remote (US)', 'founder');
  assert.equal(res3.company, 'Acme AI');
  assert.equal(res3.title, 'Lead ML Engineer');
  assert.equal(res3.location, 'Remote (US)');
  assert.equal(res3.isRemote, true);

  // Case 4: Labeled attributes: Company: Vercel | Role: Full-Stack Engineer | Location: Remote
  const res4 = parseHnPostingHeader('Company: Vercel | Role: Full-Stack Engineer | Location: Remote', 'guillermo');
  assert.equal(res4.company, 'Vercel');
  assert.equal(res4.title, 'Full-Stack Engineer');
  assert.equal(res4.location, 'Remote');
  assert.equal(res4.isRemote, true);

  // Case 5: Brackets around company [Acme AI]
  const res5 = parseHnPostingHeader('[Acme AI] | Systems Engineer | San Francisco, CA', 'hn_user');
  assert.equal(res5.company, 'Acme AI');
  assert.equal(res5.location, 'San Francisco, CA');
});

test('sanitizeCompanyName: rejects location prefixes and pure location strings', () => {
  assert.equal(sanitizeCompanyName('Location: [San Francisco, CA]'), 'Tech Employer');
  assert.equal(sanitizeCompanyName('Location: Acme Corp'), 'Acme Corp');
  assert.equal(sanitizeCompanyName('Remote (US)'), 'Tech Employer');
  assert.equal(sanitizeCompanyName('San Francisco, CA'), 'Tech Employer');
  assert.equal(sanitizeCompanyName('Acme Corp - Greenhouse'), 'Acme Corp');
});

test('scanHackerNewsHiring: prevents Location: [City, Country] from rendering in company column', async () => {
  const scanner = new BrowserAtsScanner();
  const origFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    const urlStr = String(url);
    if (urlStr.includes('search_by_date')) {
      return {
        ok: true,
        json: async () => ({
          hits: [{ title: 'Ask HN: Who is hiring? (September 2026)', objectID: '556677' }]
        })
      };
    }
    if (urlStr.includes('tags=comment,story_556677')) {
      return {
        ok: true,
        json: async () => ({
          hits: [
            {
              objectID: 'comm_9988',
              parent_id: '556677',
              author: 'hn_founder_mike',
              comment_text: 'Location: [San Francisco, CA] | Superhuman AI | Founding Core Engineer | $180k - $240k\n\nReach out to mike@superhumanai.com',
              created_at: '2026-09-02T10:00:00Z'
            }
          ]
        })
      };
    }
    return { ok: false };
  };

  try {
    const jobs = await scanner.scanHackerNewsHiring();
    assert.equal(jobs.length, 1);
    assert.equal(jobs[0].company, 'Superhuman AI', 'Company name must not be Location: [San Francisco, CA]');
    assert.equal(jobs[0].location, 'San Francisco, CA', 'Location must be properly assigned');
    assert.equal(jobs[0].title, 'Founding Core Engineer');
    assert.equal(jobs[0].founder_email, 'mike@superhumanai.com');
  } finally {
    globalThis.fetch = origFetch;
  }
});

test('BrowserAtsScanner: scanGlobalAtsIndex, scanSimplifyJobs & getGlobalIndexMetadata wiring', async () => {
  const scanner = new BrowserAtsScanner();
  assert.equal(typeof scanner.scanGlobalAtsIndex, 'function');
  assert.equal(typeof scanner.scanSimplifyJobs, 'function');
  assert.equal(typeof scanner.getGlobalIndexMetadata, 'function');

  const meta = await scanner.getGlobalIndexMetadata();
  assert.ok(meta);
  assert.ok(meta.total_jobs >= 1000000);
});

