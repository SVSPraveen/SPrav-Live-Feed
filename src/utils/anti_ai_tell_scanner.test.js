import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AI_BUZZWORD_CATALOG,
  hasQuantitativeMetrics,
  auditAntiAiTone,
  humanizeAiText
} from './anti_ai_tell_scanner.js';

test('AI_BUZZWORD_CATALOG contains at least 50 buzzwords with alternatives', () => {
  assert.ok(AI_BUZZWORD_CATALOG.length >= 50, `Expected at least 50 buzzwords, got ${AI_BUZZWORD_CATALOG.length}`);
  for (const item of AI_BUZZWORD_CATALOG) {
    assert.ok(item.phrase, 'Each item must have a phrase');
    assert.ok(item.severity === 'high' || item.severity === 'medium');
    assert.ok(Array.isArray(item.alternatives) && item.alternatives.length > 0);
  }
});

test('hasQuantitativeMetrics: accurately detects numbers, %, $, and technical units', () => {
  assert.equal(hasQuantitativeMetrics('Reduced p99 latency from 140ms to 28ms.'), true);
  assert.equal(hasQuantitativeMetrics('Generated $2.5M in annual cost savings.'), true);
  assert.equal(hasQuantitativeMetrics('Improved query throughput by 45%.'), true);
  assert.equal(hasQuantitativeMetrics('Scaled distributed cluster to 15 nodes.'), true);
  assert.equal(hasQuantitativeMetrics('Achieved 3x performance multiplier.'), true);
  assert.equal(hasQuantitativeMetrics('Collaborated with cross-functional teams.'), false);
  assert.equal(hasQuantitativeMetrics(''), false);
  assert.equal(hasQuantitativeMetrics(null), false);
});

test('auditAntiAiTone: high score for authentic human engineering bullet points', () => {
  const humanBullets = [
    'Engineered distributed ingestion pipeline processing 2.5B events daily with 99.99% uptime.',
    'Reduced database p99 latency from 120ms to 18ms by implementing Redis caching tier.',
    'Refactored legacy monolith into 8 Go microservices, saving $450k annually in compute costs.'
  ];

  const audit = auditAntiAiTone(humanBullets);
  assert.equal(audit.flaggedWords.length, 0);
  assert.equal(audit.metricDensity, 100);
  assert.equal(audit.humanVoiceScore, 100);
  assert.equal(audit.isAiLikely, false);
  assert.ok(audit.summary.includes('Authentic Human Voice'));
});

test('auditAntiAiTone: flags multiple AI tells and penalizes score', () => {
  const aiBullets = [
    'Spearheaded the development of a multifaceted system in a dynamic environment.',
    'Delved into cutting-edge machine learning models to weave a rich tapestry of insights.',
    'Instrumental in fostering seamless integration as a testament to our team synergy.'
  ];

  const audit = auditAntiAiTone(aiBullets);
  assert.ok(audit.flaggedWords.length >= 6);
  assert.ok(audit.severityCount.high >= 3);
  assert.ok(audit.humanVoiceScore < 60, `Expected score < 60, got ${audit.humanVoiceScore}`);
  assert.equal(audit.isAiLikely, true);
  assert.ok(audit.summary.includes('High AI Tell Density'));

  // Verify alternatives are attached
  const spearheaded = audit.flaggedWords.find(f => f.word === 'spearheaded');
  assert.ok(spearheaded);
  assert.ok(spearheaded.alternatives.includes('led') || spearheaded.alternatives.includes('engineered'));
});

test('auditAntiAiTone: handles empty input gracefully', () => {
  const emptyAudit = auditAntiAiTone('');
  assert.equal(emptyAudit.humanVoiceScore, 100);
  assert.equal(emptyAudit.flaggedWords.length, 0);
  assert.equal(emptyAudit.totalBullets, 0);

  const arrayAudit = auditAntiAiTone([]);
  assert.equal(arrayAudit.humanVoiceScore, 100);
  assert.equal(arrayAudit.flaggedWords.length, 0);
});

test('humanizeAiText: replaces dead-giveaway buzzwords cleanly and preserves case', () => {
  const aiText = 'Spearheaded the initiative and delved into the complex tapestry of services.';
  const humanized = humanizeAiText(aiText);

  assert.ok(!humanized.includes('Spearheaded'));
  assert.ok(!humanized.includes('delved'));
  assert.ok(!humanized.includes('tapestry'));
  assert.ok(humanized.startsWith('Led') || humanized.startsWith('Engineered'));
});
