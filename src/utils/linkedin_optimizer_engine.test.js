import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreLinkedInHeadline,
  scoreLinkedInAbout,
  generateHeadlinePresets,
  generateAboutNarrative,
  LINKEDIN_CLICHES
} from './linkedin_optimizer_engine.js';

test('linkedin_optimizer_engine: scoreLinkedInHeadline handles empty input', () => {
  const result = scoreLinkedInHeadline('');
  assert.equal(result.score, 0);
  assert.equal(result.grade, 'D');
  assert.equal(result.charCount, 0);
  assert.equal(result.charStatus, 'empty');
  assert.ok(result.issues.length > 0);
});

test('linkedin_optimizer_engine: scoreLinkedInHeadline flags headlines exceeding 220 characters', () => {
  const longHeadline = 'Senior Systems Architect | React, TypeScript, Node.js, Kubernetes, Docker, AWS, Distributed Systems, Microservices, Event Sourcing, High Throughput Ingestion Pipelines, CI/CD Automated Deployment Systems | Delivering 99.99% Uptime Globally Across Multi-Cloud Clusters And Edge Nodes Worldwide In Modern Enterprise Tech Teams';
  assert.ok(longHeadline.length > 220, 'Test headline must exceed 220 characters');

  const result = scoreLinkedInHeadline(longHeadline);
  assert.equal(result.charStatus, 'too_long');
  assert.ok(result.issues.some(i => i.message.includes('220-character limit')));
  assert.ok(result.suggestions.length > 0);
});

test('linkedin_optimizer_engine: scoreLinkedInHeadline penalizes cliches', () => {
  const clicheHeadline = 'Aspiring Software Engineer | Seeking opportunities | Rockstar coder and hard worker';
  const result = scoreLinkedInHeadline(clicheHeadline);
  assert.ok(result.issues.some(i => i.message.includes('aspiring')));
  assert.ok(result.issues.some(i => i.message.includes('seeking opportunities')));
  assert.ok(result.issues.some(i => i.message.includes('rockstar')));
  assert.ok(result.issues.some(i => i.message.includes('hard worker')));
  assert.ok(result.score < 65, 'Headline with heavy cliches should score low');
});

test('linkedin_optimizer_engine: scoreLinkedInHeadline rewards optimal length, delimiters, and metrics', () => {
  const strongHeadline = 'Senior Full Stack Engineer | React, Node.js, Go | Scaled Platforms to 10M+ Monthly Active Users • Ex-Stripe';
  const result = scoreLinkedInHeadline(strongHeadline, 'Full Stack Engineer');
  assert.ok(result.score >= 85, `Expected score >= 85, got ${result.score}`);
  assert.ok(result.grade === 'S' || result.grade === 'A');
  assert.equal(result.charStatus, 'optimal');
  assert.ok(result.strengths.some(s => s.includes('delimiter')));
  assert.ok(result.strengths.some(s => s.includes('scale or metric')));
});

test('linkedin_optimizer_engine: scoreLinkedInAbout handles empty input', () => {
  const result = scoreLinkedInAbout('');
  assert.equal(result.score, 0);
  assert.equal(result.grade, 'D');
  assert.equal(result.hookGrade, 'weak');
  assert.equal(result.hasCta, false);
});

test('linkedin_optimizer_engine: scoreLinkedInAbout detects weak 3-line hook and wall of text', () => {
  // A text with conversational greeting and a single huge paragraph >500 chars
  const weakAbout = `Hi, my name is Alex and welcome to my profile. I am a passionate developer who loves writing code every single day. Let me tell you about my journey in tech which began ten years ago when I first saw a computer and wondered how websites were built. From that moment on, I spent thousands of hours studying programming syntax and learning how to solve problems. Over the years I have worked on many projects ranging from small websites to enterprise databases. I believe in writing good code and working closely with product teams to make sure things get done properly and on time without unexpected issues.`;
  const result = scoreLinkedInAbout(weakAbout);
  assert.equal(result.hookGrade, 'weak');
  assert.ok(result.issues.some(i => i.message.includes('Weak opening hook')));
  assert.ok(result.issues.some(i => i.message.includes('walls of text')));
});

test('linkedin_optimizer_engine: scoreLinkedInAbout rewards strong hook, metrics, tech stack index, and CTA', () => {
  const strongAbout = `I engineer high-throughput distributed systems and cloud platforms handling critical production traffic.

Over the past 5 years, I led platform infrastructure at high-growth tech companies:
• Reduced P99 API latency by 45% across microservices serving 15M requests daily.
• Scaled database clustering to maintain 99.99% SLA across 4 global regions.
• Mentored a squad of 8 engineers and cut CI build times from 25m to 4m.

Core Technical Competencies:
• Languages: Go, TypeScript, Python, Rust
• Distributed Systems: Kafka, gRPC, Redis, PostgreSQL
• Cloud & DevOps: AWS, Kubernetes, Docker, Terraform

Always open to discussing distributed systems architecture, performance engineering, and principal roles. Reach me directly at alex.morgan@example.com.`;

  const result = scoreLinkedInAbout(strongAbout, 'Distributed Systems Engineer');
  assert.ok(result.score >= 85, `Expected score >= 85, got ${result.score}`);
  assert.equal(result.hookGrade, 'strong');
  assert.ok(result.metricsCount >= 3, 'Must detect at least 3 metrics');
  assert.equal(result.hasSkillsIndex, true);
  assert.equal(result.hasCta, true);
});

test('linkedin_optimizer_engine: generateHeadlinePresets creates 3 archetypes under 220 chars', () => {
  const candidateKb = {
    personal: { name: 'Elena Rostova', title: 'Senior Backend Architect' },
    skills: ['Go', 'Kubernetes', 'PostgreSQL', 'Kafka', 'Distributed Systems'],
    work_history: [
      { company: 'FinTech Cloud', bullets: ['Engineered payment gateway processing $12M daily with sub-25ms latency.'] }
    ]
  };

  const presets = generateHeadlinePresets(candidateKb, 'Senior Backend Architect');
  assert.equal(presets.length, 3);
  assert.equal(presets[0].id, 'authority_specialist');
  assert.equal(presets[1].id, 'metric_driver');
  assert.equal(presets[2].id, 'product_architect');

  for (const p of presets) {
    assert.ok(p.headline.length > 40, 'Headline should have substantive length');
    assert.ok(p.headline.length <= 220, `Headline exceeds 220 chars: ${p.headline.length}`);
    assert.ok(p.rationale.length > 10, 'Rationale should be explanatory');
  }
});

test('linkedin_optimizer_engine: generateAboutNarrative outputs structured 4-beat summary', () => {
  const candidateKb = {
    personal: { name: 'Marcus Chen', title: 'Principal Platform Engineer', location: 'San Francisco, CA', email: 'marcus@example.com' },
    skills: ['Rust', 'Go', 'Kubernetes', 'Terraform', 'eBPF'],
    work_history: [
      { bullets: ['Architected multi-tenant Kubernetes service mesh handling 20B events monthly.'] }
    ]
  };

  const narrative = generateAboutNarrative(candidateKb, 'Principal Platform Engineer');
  assert.ok(narrative.includes('Principal Platform Engineer'));
  assert.ok(narrative.includes('San Francisco, CA'));
  assert.ok(narrative.includes('20B events monthly'));
  assert.ok(narrative.includes('Core Technical Competencies:'));
  assert.ok(narrative.includes('marcus@example.com'));
});

test('linkedin_optimizer_engine: exports comprehensive LINKEDIN_CLICHES list', () => {
  assert.ok(Array.isArray(LINKEDIN_CLICHES));
  assert.ok(LINKEDIN_CLICHES.length > 5);
  assert.ok(LINKEDIN_CLICHES.some(c => c.phrase.toLowerCase().includes('guru') || c.phrase.toLowerCase().includes('ninja')));
});
