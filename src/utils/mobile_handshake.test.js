import test from 'node:test';
import assert from 'node:assert/strict';
import { generateQrMatrix, generateQrSvg } from './qr_generator.js';
import {
  buildMobileHandshakePayload,
  encodeHandshakePayload,
  decodeHandshakePayload,
  applyMobileHandshakeToVault,
  generateMobileSyncUrl,
  isMobileDevice
} from './mobile_handshake.js';

test('generateQrMatrix: builds valid QR matrix with correct finder patterns', () => {
  const url = 'http://localhost:5174/#/mobile-sync';
  const { size, modules } = generateQrMatrix(url);

  assert.ok(size >= 21, 'QR matrix size must be >= 21');
  assert.equal(modules.length, size);
  assert.equal(modules[0].length, size);

  // Top-left finder pattern center (row 3, col 3) must be true (dark)
  assert.equal(modules[3][3], true);
  // Top-right finder pattern center (row 3, col size - 4) must be true
  assert.equal(modules[3][size - 4], true);
  // Bottom-left finder pattern center (row size - 4, col 3) must be true
  assert.equal(modules[size - 4][3], true);
});

test('generateQrSvg: outputs clean SVG XML string with customizable colors', () => {
  const text = 'https://sprav-job-ai.app';
  const svg = generateQrSvg(text, { color: '#10b981', background: '#0f172a', margin: 4 });

  assert.ok(svg.includes('<svg xmlns="http://www.w3.org/2000/svg"'), 'Must contain svg root');
  assert.ok(svg.includes('fill="#10b981"'), 'Must contain custom module color');
  assert.ok(svg.includes('fill="#0f172a"'), 'Must contain custom background color');
  assert.ok(svg.includes('</svg>'), 'Must close svg tag');
});

test('buildMobileHandshakePayload: compacts and sorts top matched jobs', () => {
  const mockKb = {
    name: 'Ada Lovelace',
    email: 'ada@computing.org',
    phone: '555-1815',
    location: 'London, UK',
    linkedin: 'linkedin.com/in/ada',
    github: 'github.com/ada',
    skills: Array.from({ length: 30 }, (_, i) => `Skill${i + 1}`)
  };

  const mockScope = {
    roles: Array.from({ length: 15 }, (_, i) => `Role${i + 1}`),
    locations: Array.from({ length: 8 }, (_, i) => `Location${i + 1}`),
    target_salary: '$200,000'
  };

  const mockJobs = [
    { id: '1', title: 'Junior Dev', company: 'Company A', ats_match_score: 55 },
    { id: '2', title: 'Staff Systems Engineer', company: 'Company B', ats_match_score: 95, cover_letter_body: 'Tailored pitch', fit_score: 4.5, founder_email: 'b@example.com' },
    { id: '3', title: 'Senior Backend Engineer', company: 'Company C', ats_match_score: 82 }
  ];

  const payload = buildMobileHandshakePayload({
    kb: mockKb,
    scope: mockScope,
    jobs: mockJobs,
    topLimit: 2
  });

  assert.equal(payload.sprav_sync, true);
  assert.equal(payload.version, 1);
  assert.equal(payload.device, 'desktop_gpu');
  assert.equal(payload.candidate.name, 'Ada Lovelace');
  assert.equal(payload.candidate.email, 'ada@computing.org');
  assert.equal(payload.candidate.phone, '555-1815');
  assert.equal(payload.candidate.location, 'London, UK');
  assert.equal(payload.candidate.linkedin, 'linkedin.com/in/ada');
  assert.equal(payload.candidate.github, 'github.com/ada');
  assert.equal(payload.candidate.skills.length, 25, 'Skills capped at 25 in non-compact');
  assert.equal(payload.scope.roles.length, 10, 'Roles capped at 10');
  assert.equal(payload.scope.locations.length, 5, 'Locations capped at 5');
  assert.equal(payload.scope.salary, '$200,000');

  assert.equal(payload.jobs.length, 2, 'Must enforce topLimit of 2');
  assert.equal(payload.jobs[0].company, 'Company B');
  assert.equal(payload.jobs[0].location, 'Remote');
  assert.equal(payload.jobs[0].url, '');
  assert.equal(payload.jobs[0].source, 'direct_ats');
  assert.equal(payload.jobs[0].status, 'new');
  assert.equal(payload.jobs[0].ats, 95);
  assert.equal(payload.jobs[0].fit, 4.5);
  assert.equal(payload.jobs[0].founder_email, 'b@example.com');
  assert.equal(payload.jobs[0].pitch, 'Tailored pitch');

  assert.equal(payload.jobs[1].company, 'Company C');
  assert.equal(payload.jobs[1].founder_email, null);

  assert.equal(payload.meta.total_scanned, 3);
  assert.equal(payload.meta.transferred_count, 2);
});

test('encodeHandshakePayload & decodeHandshakePayload: round-trip fidelity', () => {
  const original = {
    sprav_sync: true,
    version: 1,
    candidate: { name: 'Margaret Hamilton', email: 'margaret@apollo.nasa.gov' },
    jobs: [
      { id: 'apollo_1', title: 'Director of Software Engineering', company: 'NASA', ats: 99 }
    ]
  };

  const encoded = encodeHandshakePayload(original);
  assert.ok(typeof encoded === 'string');
  assert.ok(!encoded.includes('+') && !encoded.includes('/'), 'Must be URL-safe');

  const decoded = decodeHandshakePayload(encoded);
  assert.deepEqual(decoded, original);
});

test('applyMobileHandshakeToVault: merges candidate facts and jobs into vault', async () => {
  let savedKb = null;
  let savedJobs = [];

  const mockVault = {
    getKnowledgeBase: async () => ({ name: 'Old Candidate' }),
    saveKnowledgeBase: async (kb) => { savedKb = kb; },
    getScope: async () => ({}),
    saveScope: async () => {},
    getJobs: async () => [
      { id: 'existing_1', company: 'Acme Corp', title: 'Engineer' }
    ],
    saveJobs: async (jobs) => { savedJobs = jobs; }
  };

  const payload = {
    sprav_sync: true,
    timestamp: Date.now(),
    device: 'desktop_webgpu',
    candidate: {
      name: 'Katherine Johnson',
      email: 'katherine@space.gov',
      skills: ['Orbital Mechanics']
    },
    scope: { roles: ['Trajectory Analyst'] },
    jobs: [
      { id: 'job_new_1', company: 'Langley', title: 'Research Mathematician', ats: 98 },
      // Duplicate should merge
      { id: 'job_dup', company: 'Acme Corp', title: 'Engineer', ats: 88 }
    ]
  };

  const result = await applyMobileHandshakeToVault(payload, mockVault);

  assert.equal(result.success, true);
  assert.equal(result.candidateName, 'Katherine Johnson');
  assert.equal(savedKb.name, 'Katherine Johnson');
  assert.equal(savedJobs.length, 2, 'Must deduplicate matching company and title');
  const langley = savedJobs.find(j => j.company === 'Langley');
  assert.ok(langley);
  assert.equal(langley.ats_match_score, 98);
});

test('isMobileDevice: detects user agent and screen widths', () => {
  // 1. In Node environment without window/navigator
  assert.equal(isMobileDevice(), false);

  const origWindow = globalThis.window;
  const origNavigator = globalThis.navigator;
  const setNav = (val) => Object.defineProperty(globalThis, 'navigator', { value: val, configurable: true, writable: true });

  try {
    // 2. Desktop browser wide screen
    globalThis.window = { innerWidth: 1200 };
    setNav({ userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' });
    assert.equal(isMobileDevice(), false);

    // 3. Mobile User Agent matches
    setNav({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X)' });
    assert.equal(isMobileDevice(), true);

    setNav({ userAgent: 'Mozilla/5.0 (Linux; Android 13; Pixel 7)' });
    assert.equal(isMobileDevice(), true);

    // 4. Narrow screen boundary (<= 768)
    setNav({ userAgent: 'Mozilla/5.0 (Windows NT 10.0)' });
    globalThis.window.innerWidth = 768;
    assert.equal(isMobileDevice(), true);

    globalThis.window.innerWidth = 769;
    assert.equal(isMobileDevice(), false);

    // 5. Vendor and Opera fallbacks
    setNav({ userAgent: '', vendor: 'Android Inc' });
    assert.equal(isMobileDevice(), true);

    setNav({ userAgent: '', vendor: '' });
    globalThis.window.opera = 'Opera Mini/9.0';
    assert.equal(isMobileDevice(), true);
  } finally {
    globalThis.window = origWindow;
    setNav(origNavigator);
  }
});

test('generateMobileSyncUrl: constructs valid hash route URLs', () => {
  const payload = { sprav_sync: true, version: 1 };
  
  // Custom origin
  const url1 = generateMobileSyncUrl(payload, 'https://career.sprav.ai');
  assert.ok(url1.startsWith('https://career.sprav.ai/#/mobile-sync?import='));
  
  // Fallback origin in Node
  const url2 = generateMobileSyncUrl(payload);
  assert.ok(url2.startsWith('http://localhost:5174/#/mobile-sync?import='));

  // Window origin fallback
  const origWindow = globalThis.window;
  try {
    globalThis.window = { location: { origin: 'https://app.sprav.dev' } };
    const url3 = generateMobileSyncUrl(payload);
    assert.ok(url3.startsWith('https://app.sprav.dev/#/mobile-sync?import='));
  } finally {
    globalThis.window = origWindow;
  }
});

test('buildMobileHandshakePayload: compactForQr format and full normalization round-trip', () => {
  const mockKb = {
    name: 'Grace Hopper',
    email: 'grace@navy.mil',
    phone: '555-0100',
    linkedin: 'linkedin.com/in/grace',
    skills: ['COBOL', 'Compilers', 'FORTRAN', 'B-0', 'Flow-Matic', 'A-2', 'UNIVAC']
  };

  const mockScope = {
    roles: ['Rear Admiral', 'Chief Scientist', 'Systems Architect', 'Lead Researcher'],
    locations: ['Arlington, VA', 'Washington, DC', 'Remote'],
    target_salary: '$180,000'
  };

  const mockJobs = Array.from({ length: 12 }, (_, i) => ({
    id: `job_${i + 1}`,
    title: `Role ${i + 1}`,
    company: `Company ${i + 1}`,
    ats_match_score: 90 - i,
    url: `https://example.com/job/${i + 1}`,
    founder_email: i === 0 ? 'founder@example.com' : undefined
  }));

  // Compact payload for QR
  const compactPayload = buildMobileHandshakePayload({
    kb: mockKb,
    scope: mockScope,
    jobs: mockJobs,
    compactForQr: true
  });

  assert.equal(compactPayload.sprav_sync, true);
  assert.equal(compactPayload.v, 2);
  assert.equal(compactPayload.compact, true);
  assert.equal(compactPayload.c.n, 'Grace Hopper');
  assert.equal(compactPayload.c.e, 'grace@navy.mil');
  assert.equal(compactPayload.s.r.length, 3, 'Roles sliced to 3 in compact');
  assert.equal(compactPayload.s.l.length, 2, 'Locations sliced to 2 in compact');
  assert.equal(compactPayload.j.length, 8, 'Jobs limited to 8 in compact');
  assert.equal(compactPayload.j[0].f, 'founder@example.com');
  assert.equal(compactPayload.meta.total_scanned, 12);
  assert.equal(compactPayload.meta.transferred_count, 8);

  // Encode and decode round-trip normalization
  const encoded = encodeHandshakePayload(compactPayload);
  const normalized = decodeHandshakePayload(encoded);

  assert.equal(normalized.sprav_sync, true);
  assert.equal(normalized.version, 2);
  assert.equal(normalized.device, 'desktop_gpu_qr');
  assert.equal(normalized.candidate.name, 'Grace Hopper');
  assert.equal(normalized.candidate.email, 'grace@navy.mil');
  assert.equal(normalized.candidate.linkedin, 'linkedin.com/in/grace');
  assert.equal(normalized.scope.roles.length, 3);
  assert.equal(normalized.scope.locations.length, 2);
  assert.equal(normalized.jobs.length, 8);
  assert.equal(normalized.jobs[0].company, 'Company 1');
  assert.equal(normalized.jobs[0].ats_match_score, 90);
  assert.equal(normalized.jobs[0].founder_email, 'founder@example.com');
  assert.equal(normalized.jobs[0].source, 'desktop_qr_sync');
});

test('buildMobileHandshakePayload: candidate fallback fields, tailored pitch, and sorting', () => {
  // Fallbacks: candidate_name, contact_info, scope.locations[0]
  const fallbackKb = {
    candidate_name: 'Alan Turing',
    contact_info: { email: 'alan@bletchley.uk', phone: '1234' },
    skills: null
  };
  const fallbackScope = {
    locations: ['Bletchley, UK']
  };
  const jobsWithPitches = [
    { id: '1', title: 'Cryptanalyst', company: 'GCHQ', ats_match_score: '85.5', tailored_pitch: 'Expert in Enigma' },
    { id: '2', title: 'Mathematician', company: 'Cambridge', ats_match_score: null, fit_score: '4.8', cover_letter_body: 'Long cover letter '.repeat(20) },
    { id: '3', title: 'Logician', company: 'Manchester', ats_match_score: undefined }
  ];

  const payload = buildMobileHandshakePayload({
    kb: fallbackKb,
    scope: fallbackScope,
    jobs: jobsWithPitches,
    includePitches: true
  });

  assert.equal(payload.candidate.name, 'Alan Turing');
  assert.equal(payload.candidate.email, 'alan@bletchley.uk');
  assert.equal(payload.candidate.phone, '1234');
  assert.equal(payload.candidate.location, 'Bletchley, UK');
  assert.deepEqual(payload.candidate.skills, []);

  // First job should be highest ATS score (86 rounded)
  assert.equal(payload.jobs[0].ats, 86);
  assert.equal(payload.jobs[0].pitch, 'Expert in Enigma');

  // Second job has cover_letter_body truncated to 280
  assert.equal(payload.jobs[1].company, 'Cambridge');
  assert.equal(payload.jobs[1].fit, 4.8);
  assert.equal(payload.jobs[1].pitch.length, 280);

  // When includePitches is false
  const noPitch = buildMobileHandshakePayload({
    kb: fallbackKb,
    jobs: jobsWithPitches,
    includePitches: false
  });
  assert.equal(noPitch.jobs[0].pitch, '');
});

test('decodeHandshakePayload: error cases and padding variations', () => {
  assert.throws(() => decodeHandshakePayload(''), /Empty payload string/);
  assert.throws(() => decodeHandshakePayload(null), /Empty payload string/);
  assert.throws(() => decodeHandshakePayload(undefined), /Empty payload string/);

  // Test padding lengths: 1, 2, and 3
  const p1 = { a: '1' };
  const p2 = { ab: '12' };
  const p3 = { abc: '123' };

  assert.deepEqual(decodeHandshakePayload(encodeHandshakePayload(p1)), p1);
  assert.deepEqual(decodeHandshakePayload(encodeHandshakePayload(p2)), p2);
  assert.deepEqual(decodeHandshakePayload(encodeHandshakePayload(p3)), p3);
});

test('applyMobileHandshakeToVault: validation, error handling, and field updates', async () => {
  // 1. Validation failure
  await assert.rejects(
    async () => applyMobileHandshakeToVault(null, {}),
    /Invalid SPrav sync package format/
  );
  await assert.rejects(
    async () => applyMobileHandshakeToVault({ sprav_sync: false }, {}),
    /Invalid SPrav sync package format/
  );

  // 2. Warning on KB failure
  const origWarn = console.warn;
  let warnCalled = false;
  console.warn = () => { warnCalled = true; };

  try {
    const failingKbVault = {
      getKnowledgeBase: async () => { throw new Error('DB Error'); },
      saveScope: async () => {},
      getJobs: async () => [],
      saveJobs: async () => {}
    };
    const res = await applyMobileHandshakeToVault({
      sprav_sync: true,
      candidate: { name: 'Test' }
    }, failingKbVault);
    assert.equal(res.success, true);
    assert.equal(warnCalled, true);
  } finally {
    console.warn = origWarn;
  }

  // 3. Scope error handling
  warnCalled = false;
  console.warn = () => { warnCalled = true; };
  try {
    const failingScopeVault = {
      getKnowledgeBase: async () => ({}),
      saveKnowledgeBase: async () => {},
      saveScope: async () => { throw new Error('Scope DB Error'); },
      getJobs: async () => [],
      saveJobs: async () => {}
    };
    const resScope = await applyMobileHandshakeToVault({
      sprav_sync: true,
      scope: { roles: ['Dev'] }
    }, failingScopeVault);
    assert.equal(resScope.success, true);
    assert.equal(warnCalled, true);
  } finally {
    console.warn = origWarn;
  }

  // 4. Job save error rethrow
  const origError = console.error;
  let errorLogged = null;
  console.error = (msg) => { errorLogged = msg; };
  try {
    const failingJobVault = {
      getKnowledgeBase: async () => ({}),
      saveKnowledgeBase: async () => {},
      getJobs: async () => [],
      saveJobs: async () => { throw new Error('QuotaExceeded'); }
    };
    await assert.rejects(
      async () => applyMobileHandshakeToVault({
        sprav_sync: true,
        jobs: [{ title: 'Failing Job', company: 'FailCo' }]
      }, failingJobVault),
      /QuotaExceeded/
    );
    assert.equal(errorLogged, 'Failed to save transferred jobs to vault:');
  } finally {
    console.error = origError;
  }

  // 5. Existing job merging cover letter fallback & generated ID
  let mergedSavedJobs = [];
  const mergingVault = {
    getKnowledgeBase: async () => ({}),
    saveKnowledgeBase: async () => {},
    getJobs: async () => [
      { id: 'job_exist', company: 'Meta', title: 'AI Engineer', cover_letter_body: 'Existing Cover Letter' }
    ],
    saveJobs: async (jobs) => { mergedSavedJobs = jobs; }
  };

  const mergePayload = {
    sprav_sync: true,
    candidate: null,
    jobs: [
      { company: 'Meta', title: 'AI Engineer' }, // without id, without pitch
      { company: 'Apple', title: 'Swift Dev', pitch: 'New Pitch' } // without id, with pitch
    ]
  };

  const mergeResult = await applyMobileHandshakeToVault(mergePayload, mergingVault);
  assert.equal(mergeResult.success, true);
  assert.equal(mergeResult.candidateName, 'Candidate');
  assert.equal(mergedSavedJobs.length, 2);

  const metaJob = mergedSavedJobs.find(j => j.company === 'Meta');
  assert.equal(metaJob.cover_letter_body, 'Existing Cover Letter');
  assert.ok(metaJob.id.startsWith('m_'));
  assert.equal(metaJob.ats_match_score, 80);
  assert.equal(metaJob.fit_score, 4.0);
  assert.equal(metaJob.status, 'action_required');

  const appleJob = mergedSavedJobs.find(j => j.company === 'Apple');
  assert.equal(appleJob.cover_letter_body, 'New Pitch');
  assert.ok(appleJob.id.startsWith('m_'));

  // 6. Complete candidate profile fields update and fallback preservation
  let fullSavedKb = null;
  const fullKbVault = {
    getKnowledgeBase: async () => ({
      name: 'Initial Name',
      candidate_name: 'Initial Name',
      email: 'initial@test.com',
      phone: '000',
      location: 'Old City',
      linkedin: 'old-linkedin',
      github: 'old-github',
      skills: ['LegacySkill']
    }),
    saveKnowledgeBase: async (kb) => { fullSavedKb = kb; },
    getScope: async () => ({}),
    saveScope: async () => {},
    getJobs: async () => [],
    saveJobs: async () => {}
  };

  const fullUpdatePayload = {
    sprav_sync: true,
    candidate: {
      name: 'New Name',
      email: 'new@test.com',
      phone: '111',
      location: 'New City',
      linkedin: 'new-linkedin',
      github: 'new-github',
      skills: ['NewSkill1', 'NewSkill2']
    }
  };

  await applyMobileHandshakeToVault(fullUpdatePayload, fullKbVault);
  assert.equal(fullSavedKb.name, 'New Name');
  assert.equal(fullSavedKb.candidate_name, 'New Name');
  assert.equal(fullSavedKb.email, 'new@test.com');
  assert.equal(fullSavedKb.phone, '111');
  assert.equal(fullSavedKb.location, 'New City');
  assert.equal(fullSavedKb.linkedin, 'new-linkedin');
  assert.equal(fullSavedKb.github, 'new-github');
  assert.deepEqual(fullSavedKb.skills, ['NewSkill1', 'NewSkill2']);

  // 7. Deduplication with mixed casing, spaces, and custom source/founder_email
  let dedupeSavedJobs = [];
  const dedupeVault = {
    getKnowledgeBase: async () => ({}),
    getJobs: async () => [
      { id: '1', company: '  Amazon Web Services  ', title: '  Solutions Architect  ' }
    ],
    saveJobs: async (jobs) => { dedupeSavedJobs = jobs; }
  };

  const dedupeRes = await applyMobileHandshakeToVault({
    sprav_sync: true,
    jobs: [
      {
        company: 'amazon web services',
        title: 'solutions architect',
        ats: 92,
        source: 'custom_source',
        founder_email: 'andy@amazon.com'
      }
    ]
  }, dedupeVault);

  assert.equal(dedupeRes.jobsTransferred, 1);
  assert.equal(dedupeSavedJobs.length, 1);
  assert.equal(dedupeSavedJobs[0].ats_match_score, 92);
  assert.equal(dedupeSavedJobs[0].source, 'custom_source');
  assert.equal(dedupeSavedJobs[0].founder_email, 'andy@amazon.com');

  // 8. Scope branch variations: roles-only, locations-only, and empty scope
  let savedScope = null;
  const scopeVault = {
    getKnowledgeBase: async () => ({}),
    saveScope: async (sc) => { savedScope = sc; },
    getJobs: async () => [],
    saveJobs: async () => {}
  };

  // Roles only
  await applyMobileHandshakeToVault({ sprav_sync: true, scope: { roles: ['Dev'], locations: [] } }, scopeVault);
  assert.deepEqual(savedScope.roles, ['Dev']);

  // Locations only
  savedScope = null;
  await applyMobileHandshakeToVault({ sprav_sync: true, scope: { roles: [], locations: ['Remote'] } }, scopeVault);
  assert.deepEqual(savedScope.locations, ['Remote']);

  // Both empty: saveScope should not be called
  savedScope = null;
  await applyMobileHandshakeToVault({ sprav_sync: true, scope: { roles: [], locations: [] } }, scopeVault);
  assert.equal(savedScope, null);

  // 9. Candidate without name: saveKnowledgeBase should NOT be called
  let kbCalled = false;
  const noNameVault = {
    getKnowledgeBase: async () => ({ name: 'KeepName' }),
    saveKnowledgeBase: async () => { kbCalled = true; },
    getJobs: async () => [],
    saveJobs: async () => {}
  };
  await applyMobileHandshakeToVault({ sprav_sync: true, candidate: { name: '' } }, noNameVault);
  assert.equal(kbCalled, false);

  // 10. Candidate with empty skills: existing skills preserved
  let preservedSkillsKb = null;
  const emptySkillsVault = {
    getKnowledgeBase: async () => ({ name: 'Dev', skills: ['OriginalSkill'] }),
    saveKnowledgeBase: async (kb) => { preservedSkillsKb = kb; },
    getJobs: async () => [],
    saveJobs: async () => {}
  };
  await applyMobileHandshakeToVault({
    sprav_sync: true,
    candidate: { name: 'Dev', skills: [] }
  }, emptySkillsVault);
  assert.deepEqual(preservedSkillsKb.skills, ['OriginalSkill']);

  // 11. Empty jobs array: saveJobs should NOT be called
  let saveJobsCalled = false;
  const emptyJobsVault = {
    getKnowledgeBase: async () => ({}),
    saveKnowledgeBase: async () => {},
    getJobs: async () => [],
    saveJobs: async () => { saveJobsCalled = true; }
  };
  await applyMobileHandshakeToVault({
    sprav_sync: true,
    jobs: []
  }, emptyJobsVault);
  assert.equal(saveJobsCalled, false);
});

test('decodeHandshakePayload: compact v2 fallback values and score variations', () => {
  // 1. Compact payload without 'a' (ats_match_score), testing item.ats and fallback 85
  const payloadWithAts = {
    sprav_sync: true,
    compact: true,
    c: { n: 'N', p: '555-9999' },
    j: [
      { i: 'j1', t: 'T1', c: 'C1', ats: 77 },
      { i: 'j2', t: 'T2', c: 'C2' } // neither a nor ats
    ]
  };

  const decoded = decodeHandshakePayload(encodeHandshakePayload(payloadWithAts));
  assert.equal(decoded.candidate.name, 'N');
  assert.equal(decoded.candidate.phone, '555-9999');
  assert.equal(decoded.jobs[0].ats_match_score, 77);
  assert.equal(decoded.jobs[1].ats_match_score, 85);
  assert.equal(decoded.jobs[1].founder_email, null);
  assert.equal(decoded.meta.transferred_count, 2);

  // 2. Compact payload using full keys (jobs, candidate) instead of short keys (j, c)
  const payloadWithFullKeys = {
    sprav_sync: true,
    compact: true,
    candidate: { name: 'FullCand', email: 'fc@test.com', linkedin: 'fc-in' },
    scope: { roles: ['Architect'], locations: ['Berlin'] },
    jobs: [
      { id: 'full_j1', title: 'Chief Architect', company: 'Tech Inc', url: 'https://tech.inc', ats: 99 }
    ]
  };

  const decodedFull = decodeHandshakePayload(encodeHandshakePayload(payloadWithFullKeys));
  assert.equal(decodedFull.candidate.name, 'FullCand');
  assert.equal(decodedFull.candidate.email, 'fc@test.com');
  assert.equal(decodedFull.candidate.linkedin, 'fc-in');
  assert.deepEqual(decodedFull.scope.roles, ['Architect']);
  assert.deepEqual(decodedFull.scope.locations, ['Berlin']);
  assert.equal(decodedFull.jobs[0].id, 'full_j1');
  assert.equal(decodedFull.jobs[0].title, 'Chief Architect');
  assert.equal(decodedFull.jobs[0].company, 'Tech Inc');
  assert.equal(decodedFull.jobs[0].url, 'https://tech.inc');
  assert.equal(decodedFull.jobs[0].ats_match_score, 99);
  assert.equal(decodedFull.jobs[0].status, 'new');

  // 3. Ultra-minimal compact payload defaulting
  const minimalCompact = { sprav_sync: true, compact: true };
  const decodedMin = decodeHandshakePayload(encodeHandshakePayload(minimalCompact));
  assert.equal(decodedMin.candidate.name, '');
  assert.equal(decodedMin.candidate.email, '');
  assert.equal(decodedMin.candidate.phone, '');
  assert.equal(decodedMin.candidate.linkedin, '');
  assert.deepEqual(decodedMin.candidate.skills, []);
  assert.deepEqual(decodedMin.scope.roles, []);
  assert.deepEqual(decodedMin.scope.locations, []);
  assert.equal(decodedMin.scope.salary, '');
  assert.deepEqual(decodedMin.jobs, []);
  assert.equal(decodedMin.version, 2);
  assert.equal(decodedMin.device, 'desktop_gpu_qr');
  assert.equal(decodedMin.meta.transferred_count, 0);
  assert.ok(decodedMin.timestamp > 0);
});

test('buildMobileHandshakePayload: compact string truncation and skill slicing', () => {
  const longJob = {
    id: 'id_'.repeat(20), // 60 chars > 36
    title: 'Very Long Engineering Lead Title That Exceeds The Limit'.repeat(2), // > 45
    company: 'International Business Machines Corporation Global', // > 30
    url: 'https://ibm.com/jobs/1',
    ats_match_score: 91.4
  };

  const payload = buildMobileHandshakePayload({
    kb: {
      skills: Array.from({ length: 15 }, (_, i) => `Skill${i}`)
    },
    jobs: [longJob],
    compactForQr: true
  });

  assert.equal(payload.c.n, '');
  assert.equal(payload.c.e, '');
  assert.equal(payload.c.p, '');
  assert.equal(payload.c.l, '');
  assert.equal(payload.j[0].i.length, 36);
  assert.equal(payload.j[0].t.length, 45);
  assert.equal(payload.j[0].c.length, 30);
  assert.equal(payload.j[0].u, 'https://ibm.com/jobs/1');
  assert.equal(payload.j[0].a, 91);
  assert.equal(payload.j[0].f, undefined);

  // Non-compact skill slicing (capped at 25) vs compact (capped at 6)
  const nonCompactPayload = buildMobileHandshakePayload({
    kb: { skills: Array.from({ length: 30 }, (_, i) => `S${i}`) },
    compactForQr: false
  });
  assert.equal(nonCompactPayload.candidate.skills.length, 25);

  const compactPayload = buildMobileHandshakePayload({
    kb: { skills: Array.from({ length: 30 }, (_, i) => `S${i}`) },
    compactForQr: true
  });
  // In compactForQr, top candidate.skills inside buildMobileHandshakePayload is sliced to 6
  assert.equal(compactPayload.meta.total_scanned, 0);
});

test('applyMobileHandshakeToVault: nullish coalescing, id random length, and edge fields', async () => {
  let savedJobs = [];
  let warnMessages = [];
  const origWarn = console.warn;
  console.warn = (msg) => { warnMessages.push(msg); };

  const mockVault = {
    getKnowledgeBase: async () => { throw new Error('KB fail'); },
    saveKnowledgeBase: async () => {},
    saveScope: async () => { throw new Error('Scope fail'); },
    getJobs: async () => [
      // Job with undefined company and title to exercise fallback key generation
      { id: 'undef_1', company: undefined, title: undefined, cover_letter_body: 'Old pitch' }
    ],
    saveJobs: async (jobs) => { savedJobs = jobs; }
  };

  const payload = {
    sprav_sync: true,
    timestamp: 1700000000000,
    candidate: { name: 'Marie Curie' },
    scope: { roles: ['Physicist'] },
    jobs: [
      {
        company: undefined,
        title: undefined,
        ats: 0, // Must coalesce to 0, NOT 80
        fit: 0, // Must coalesce to 0, NOT 4.0
        pitch: 'Fresh Pitch',
        status: undefined // Must fallback to 'action_required'
      }
    ]
  };

  try {
    const res = await applyMobileHandshakeToVault(payload, mockVault);
    assert.equal(res.success, true);
    assert.equal(res.candidateName, 'Marie Curie');
    assert.equal(res.jobsTransferred, 1);
    assert.equal(res.syncTimestamp, 1700000000000);

    // Verify exact warning strings to kill string mutation
    assert.ok(warnMessages.includes('Failed to merge candidate KB in mobile handshake:'));
    assert.ok(warnMessages.includes('Failed to merge scope in mobile handshake:'));

    // Verify nullish coalesced scores
    assert.equal(savedJobs.length, 1);
    const job = savedJobs[0];
    assert.equal(job.ats_match_score, 0);
    assert.equal(job.fit_score, 0);
    assert.equal(job.status, 'action_required');
    assert.equal(job.cover_letter_body, 'Fresh Pitch');
    assert.ok(job.id.startsWith('m_'));
    const idParts = job.id.split('_');
    assert.equal(idParts.length, 3);
    assert.equal(idParts[2].length, 6); // Tests .substr(2, 6)
    assert.ok(!isNaN(new Date(job.synced_at).getTime())); // Tests new Date().toISOString()
  } finally {
    console.warn = origWarn;
  }
});

test('isMobileDevice: regex keywords and navigator undefined edge case', () => {
  const origWindow = globalThis.window;
  const origNavigator = globalThis.navigator;
  const setNav = (val) => Object.defineProperty(globalThis, 'navigator', { value: val, configurable: true, writable: true });

  try {
    // Window defined, navigator undefined
    globalThis.window = { innerWidth: 1024 };
    setNav(undefined);
    assert.equal(isMobileDevice(), false);

    // Test each mobile regex keyword
    const mobileTokens = ['ipad', 'ipod', 'blackberry', 'iemobile', 'opera mini'];
    for (const token of mobileTokens) {
      setNav({ userAgent: `TestDevice/${token}/Version` });
      assert.equal(isMobileDevice(), true, `Failed detecting ${token}`);
    }

    // Default empty ua string on desktop
    setNav({ userAgent: '', vendor: '' });
    delete globalThis.window.opera;
    globalThis.window.innerWidth = 1200;
    assert.equal(isMobileDevice(), false);
  } finally {
    globalThis.window = origWindow;
    setNav(origNavigator);
  }
});

test('buildMobileHandshakePayload & applyMobileHandshakeToVault: strict fallback and trimming', async () => {
  // 1. Strict empty candidate & scope defaults
  const emptyPayload = buildMobileHandshakePayload({});
  assert.equal(emptyPayload.candidate.location, '');
  assert.equal(emptyPayload.candidate.github, '');
  assert.deepEqual(emptyPayload.scope.roles, []);
  assert.deepEqual(emptyPayload.scope.locations, []);
  assert.equal(emptyPayload.scope.salary, '');

  // 2. Compact empty job defaults and null ats score
  const compactWithEmptyJob = buildMobileHandshakePayload({
    jobs: [{ ats_match_score: null, fit_score: null }],
    compactForQr: true
  });
  assert.equal(compactWithEmptyJob.j[0].i, '');
  assert.equal(compactWithEmptyJob.j[0].t, '');
  assert.equal(compactWithEmptyJob.j[0].c, '');
  assert.equal(compactWithEmptyJob.j[0].u, '');
  assert.equal(compactWithEmptyJob.j[0].a, null);
  assert.equal(compactWithEmptyJob.j[0].f, undefined);

  // 3. Non-compact null score and empty pitch when pitches enabled
  const nonCompactNullScores = buildMobileHandshakePayload({
    jobs: [{ ats_match_score: null, fit_score: null }],
    includePitches: true
  });
  assert.equal(nonCompactNullScores.jobs[0].ats, null);
  assert.equal(nonCompactNullScores.jobs[0].fit, null);
  assert.equal(nonCompactNullScores.jobs[0].pitch, '');

  // 4. Safe base64 handling for characters requiring URL replacement (+ -> -, / -> _)
  const trickyPayload = {
    testChars: '\xfb\xff\xbf\xfe~?>>',
    data: [1, 2, 3, 4, 5, 6, 7, 8, 9]
  };
  const trickyEncoded = encodeHandshakePayload(trickyPayload);
  assert.ok(!trickyEncoded.includes('+'));
  assert.ok(!trickyEncoded.includes('/'));
  assert.ok(!trickyEncoded.includes('='));
  const trickyDecoded = decodeHandshakePayload(trickyEncoded);
  assert.deepEqual(trickyDecoded, trickyPayload);

  // 5. Optional chaining on scope roles and locations
  let scopeSaved = false;
  const optChainVault = {
    getKnowledgeBase: async () => ({}),
    saveScope: async () => { scopeSaved = true; },
    getJobs: async () => [],
    saveJobs: async () => {}
  };
  await applyMobileHandshakeToVault({
    sprav_sync: true,
    scope: { roles: null, locations: null }
  }, optChainVault);
  assert.equal(scopeSaved, false);

  // 6. Trimming in rawJob.company and rawJob.title deduplication
  let dedupeSaved = [];
  const trimVault = {
    getKnowledgeBase: async () => ({}),
    getJobs: async () => [
      { id: '1', company: 'stripe', title: 'staff engineer', cover_letter_body: '' }
    ],
    saveJobs: async (jobs) => { dedupeSaved = jobs; }
  };
  await applyMobileHandshakeToVault({
    sprav_sync: true,
    jobs: [
      {
        company: '  STRIPE  ',
        title: '  STAFF ENGINEER  ',
        source: undefined // tests fallback to 'desktop_p2p_sync'
      }
    ]
  }, trimVault);
  assert.equal(dedupeSaved.length, 1);
  assert.equal(dedupeSaved[0].source, 'desktop_p2p_sync');
  assert.equal(dedupeSaved[0].cover_letter_body, '');
});




