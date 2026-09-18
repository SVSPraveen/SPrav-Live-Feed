import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateFollowupCadence,
  generateFollowupIcs,
  buildSprintOutreachVariants,
  formatSprintMarkdownSummary
} from './one_job_sprint_engine.js';

test('calculateFollowupCadence: calculates Day 3, Day 7, and Day 14 offsets correctly', () => {
  const base = new Date('2026-09-01T10:00:00Z');
  const cadence = calculateFollowupCadence(base);

  assert.equal(cadence.length, 3);
  assert.equal(cadence[0].dayOffset, 3);
  assert.equal(cadence[1].dayOffset, 7);
  assert.equal(cadence[2].dayOffset, 14);

  assert.equal(cadence[0].dateString, '2026-09-04');
  assert.equal(cadence[1].dateString, '2026-09-08');
  assert.equal(cadence[2].dateString, '2026-09-15');

  assert.match(cadence[0].title, /Day 3/i);
  assert.match(cadence[1].title, /Day 7/i);
  assert.match(cadence[2].title, /Day 14/i);
});

test('generateFollowupIcs: produces valid RFC 5545 calendar entries with alarms', () => {
  const job = {
    id: 'test-job-42',
    title: 'Senior Frontend Engineer',
    company: 'Stripe',
    url: 'https://stripe.com/jobs/42'
  };
  const cadence = calculateFollowupCadence('2026-09-10');
  const ics = generateFollowupIcs(job, cadence);

  assert.ok(ics.includes('BEGIN:VCALENDAR'));
  assert.ok(ics.includes('END:VCALENDAR'));
  assert.ok(ics.includes('VERSION:2.0'));
  assert.ok(ics.includes('PRODID:-//SPrav Job AI//1-Job Sprint Follow-up Reminders//EN'));

  // Should have 3 VEVENT blocks
  const eventMatches = ics.match(/BEGIN:VEVENT/g);
  assert.equal(eventMatches?.length, 3);

  assert.ok(ics.includes('SUMMARY:SPrav Follow-up: Senior Frontend Engineer at Stripe'));
  assert.ok(ics.includes('BEGIN:VALARM'));
});

test('generateFollowupIcs: neutralizes CRLF injection attempts in title and company', () => {
  const maliciousJob = {
    id: 'inject-1',
    title: 'Staff Engineer\r\nSTATUS:CANCELLED\r\nTRIGGER:-PT15M',
    company: 'Evil Corp\nLOCATION:Remote',
    url: 'https://evil.com/job\r\nATTENDEE:admin@evil.com'
  };
  const ics = generateFollowupIcs(maliciousJob);

  // Line injections should be stripped or collapsed into safe space
  assert.strictEqual(ics.includes('\r\nSTATUS:CANCELLED'), false);
  assert.strictEqual(ics.includes('\nLOCATION:Remote'), false);
  assert.ok(ics.includes('Staff Engineer STATUS:CANCELLED TRIGGER:-PT15M at Evil Corp LOCATION:Remote'));
});

test('buildSprintOutreachVariants: enforces LinkedIn note hard limit of 300 characters', () => {
  const job = {
    title: 'Staff Distributed Systems Engineer',
    company: 'Anthropic'
  };
  const kb = {
    personal: { name: 'Praveen SV', email: 'praveen@example.com' },
    skills: ['Distributed Consensus & Raft', 'Kubernetes', 'Go']
  };

  const variants = buildSprintOutreachVariants(job, kb);

  assert.ok(variants.linkedin);
  assert.ok(variants.linkedin.content.length <= 300, `LinkedIn note exceeded 300 chars: ${variants.linkedin.content.length}`);
  assert.match(variants.linkedin.content, /Distributed Consensus & Raft/i);

  assert.ok(variants.inmail);
  assert.match(variants.inmail.content, /Anthropic/);

  assert.ok(variants.email);
  assert.match(variants.email.subject, /Staff Distributed Systems Engineer/);
  assert.match(variants.email.content, /Praveen SV/);
});

test('formatSprintMarkdownSummary: formats structured kit with all 5 sections', () => {
  const sprintData = {
    job: { title: 'AI Infrastructure Architect', company: 'Databricks', url: 'https://databricks.com/job/1' },
    tailoring: { matchedKeywords: ['PyTorch', 'CUDA', 'Ray'], missingKeywords: ['Triton'] },
    coverLetter: 'I am excited to bring my systems depth in PyTorch and CUDA to Databricks.',
    outreach: {
      linkedin: { content: 'Hi! Connecting regarding the role.' },
      email: { subject: 'AI Architect — Application', content: 'Here is my application.' }
    },
    cadence: calculateFollowupCadence(),
    templateId: 'modern_tech'
  };

  const summary = formatSprintMarkdownSummary(sprintData);

  assert.match(summary, /# SPrav 1-Job Sprint Application Kit/);
  assert.match(summary, /AI Infrastructure Architect/);
  assert.match(summary, /Databricks/);
  assert.match(summary, /PyTorch, CUDA, Ray/);
  assert.match(summary, /modern_tech/);
  assert.match(summary, /Day 3/);
  assert.match(summary, /Day 7/);
  assert.match(summary, /Day 14/);
});
