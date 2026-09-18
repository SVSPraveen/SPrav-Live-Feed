import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeJob, processChunk } from './job_streamer_worker.js';

test('job_streamer_worker: normalizeJob standard mapping', () => {
  const raw = {
    title: 'Senior Distributed Systems Architect',
    ats: 'Greenhouse',
    company: 'Sovereign Cloud',
    location: 'Remote, US',
    salary: {
      p25: 180000,
      median: 210000,
      p75: 250000
    },
    url: 'https://boards.greenhouse.io/sovereign/jobs/999'
  };

  const norm = normalizeJob(raw);
  assert.equal(norm.title, 'Senior Distributed Systems Architect');
  assert.equal(norm.company, 'Sovereign Cloud');
  assert.equal(norm.source, 'GREENHOUSE_INDEX');
  assert.equal(norm.is_remote, true);
  assert.equal(norm.salary_range, '$180k - $250k');
  assert.equal(norm.salary_median, 210000);
});

test('job_streamer_worker: processChunk filters accurately', async () => {
  const jobs = await processChunk(0, {
    keyword: 'Engineer',
    limit: 5
  });

  assert.ok(Array.isArray(jobs));
  assert.ok(jobs.length > 0);
  assert.ok(jobs.length <= 5);
  for (const j of jobs) {
    assert.ok(j.title);
    assert.ok(j.company);
  }
});
