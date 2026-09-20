import test from 'node:test';
import assert from 'node:assert';
import {
  computeJobDedupKey,
  detectJdRedFlags,
  computeJobHealthScore
} from './ats_job_analyzer.js';

test('computeJobDedupKey: normalizes company, title, and location', () => {
  const key1 = computeJobDedupKey({
    company: 'Stripe, Inc.',
    title: 'Senior Software Engineer (Remote)',
    location: 'San Francisco, CA'
  });
  const key2 = computeJobDedupKey({
    company: 'stripe',
    title: 'Senior Software Engineer',
    location: 'Remote'
  });
  assert.strictEqual(key1, 'stripe:::senior software engineer:::sanfranciscoca');
  assert.strictEqual(key2, 'stripe:::senior software engineer:::remote');
  assert.strictEqual(computeJobDedupKey(null), '');
});

test('detectJdRedFlags: flags burnout, missing salary, and phishing', () => {
  const text = 'Work in a fast-paced environment. Contact us on Telegram for interview.';
  const flags = detectJdRedFlags(text);
  assert.ok(flags.some(f => f.label === 'Burnout Risk'));
  assert.ok(flags.some(f => f.label === 'Interview Phishing / Scam Risk'));
  assert.ok(flags.some(f => f.label === 'No Salary Listed'));
});

test('computeJobHealthScore: accurately scores flags', () => {
  const cleanScore = computeJobHealthScore([]);
  assert.strictEqual(cleanScore.score, 100);
  assert.strictEqual(cleanScore.tier, 'clean');

  const scamScore = computeJobHealthScore([{ label: 'Interview Phishing / Scam Risk' }]);
  assert.strictEqual(scamScore.score, 50);
  assert.strictEqual(scamScore.tier, 'risky');

  const avoidScore = computeJobHealthScore([
    { label: 'Interview Phishing / Scam Risk' },
    { label: 'Multi-Level / Commission Risk' },
    { label: 'Unpaid Trial / Work Exploitation' }
  ]);
  assert.strictEqual(avoidScore.tier, 'avoid');
});
