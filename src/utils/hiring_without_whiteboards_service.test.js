import test from 'node:test';
import assert from 'node:assert/strict';
import {
  parseHwowReadme,
  parseHwowIssues,
  extractAtsDetailsFromUrl,
  CURATED_HWOW_SEED,
  fetchHwowCompanies
} from './hiring_without_whiteboards_service.js';

test('extractAtsDetailsFromUrl: correctly identifies Greenhouse, Ashby, Lever, SmartRecruiters, Workable', () => {
  const gh = extractAtsDetailsFromUrl('https://boards.greenhouse.io/stripe', 'Stripe');
  assert.equal(gh.platform, 'greenhouse');
  assert.equal(gh.slug, 'stripe');

  const ash = extractAtsDetailsFromUrl('https://jobs.ashbyhq.com/supabase', 'Supabase');
  assert.equal(ash.platform, 'ashby');
  assert.equal(ash.slug, 'supabase');

  const lev = extractAtsDetailsFromUrl('https://jobs.lever.co/automattic', 'Automattic');
  assert.equal(lev.platform, 'lever');
  assert.equal(lev.slug, 'automattic');

  const sr = extractAtsDetailsFromUrl('https://careers.smartrecruiters.com/Canva', 'Canva');
  assert.equal(sr.platform, 'smartrecruiters');
  assert.equal(sr.slug, 'canva');

  const wrk = extractAtsDetailsFromUrl('https://apply.workable.com/invision-app', 'InVision');
  assert.equal(wrk.platform, 'workable');
  assert.equal(wrk.slug, 'invision-app');

  const custom = extractAtsDetailsFromUrl('https://example.com/careers', 'Acme Corp');
  assert.equal(custom.platform, 'auto');
  assert.equal(custom.slug, 'acmecorp');
});

test('parseHwowReadme: parses markdown table entries and ignores discussion links', () => {
  const sampleMarkdown = `
# Hiring Without Whiteboards

### Discussion and other reads
- [HackerNews (2017)](https://news.ycombinator.com/item?id=13874026)
- [Finding a better alternative](https://theoutline.com/post/1256)

---

## A - C

- [Airtable](https://airtable.com/careers) | San Francisco, CA; Remote | Take home project that resembles a problem Airtable solves for.
- [Adyen](https://www.adyen.com) | Amsterdam, NL | Take-home assignment, design discussion based on take home, culture fit.
- [Basecamp](https://basecamp.com/about/jobs) | Remote
- [Generic Company](https://generic.com/careers)
`;

  const results = parseHwowReadme(sampleMarkdown);
  assert.equal(results.length, 4);

  assert.equal(results[0].name, 'Airtable');
  assert.equal(results[0].location, 'San Francisco, CA; Remote');
  assert.ok(results[0].interview_notes.includes('Take home project'));

  assert.equal(results[1].name, 'Adyen');
  assert.equal(results[1].location, 'Amsterdam, NL');

  assert.equal(results[2].name, 'Basecamp');
  assert.equal(results[2].location, 'Remote');

  assert.equal(results[3].name, 'Generic Company');
  assert.equal(results[3].location, 'Remote / Global');
});

test('parseHwowIssues: extracts company names from issue titles', () => {
  const issues = [
    { title: 'Add Plivo careers', html_url: 'https://github.com/poteto/hiring-without-whiteboards/pull/101', body: 'Plivo does practical pairing on phone APIs.' },
    { title: 'Fix README dead links', html_url: 'https://github.com/poteto/hiring-without-whiteboards/pull/102', body: 'Removed 404s' },
    { title: 'Add KodeKloud', html_url: 'https://github.com/poteto/hiring-without-whiteboards/pull/103', body: 'DevOps simulation test' }
  ];

  const results = parseHwowIssues(issues);
  assert.equal(results.length, 2);
  assert.equal(results[0].name, 'Plivo');
  assert.equal(results[1].name, 'KodeKloud');
});

test('fetchHwowCompanies: returns curated fallback seed when offline', async () => {
  // Pass an immediately aborted signal to simulate network abort
  const ac = new AbortController();
  ac.abort();

  const companies = await fetchHwowCompanies({ signal: ac.signal, forceRefresh: true });
  assert.ok(Array.isArray(companies));
  assert.ok(companies.length >= CURATED_HWOW_SEED.length);
  assert.ok(companies.some(c => c.name === 'Airtable'));
});
