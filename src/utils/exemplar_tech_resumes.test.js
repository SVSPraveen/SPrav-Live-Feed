import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  EXEMPLAR_RESUMES,
  DEFAULT_EXEMPLAR_ID,
  getExemplarById,
  getAllExemplars,
  retrieveExemplarBulletAnchors
} from './exemplar_tech_resumes.js';

describe('exemplar_tech_resumes', () => {
  it('contains SVS Praveen as default exemplar with 98% ATS score', () => {
    const alex = getExemplarById(DEFAULT_EXEMPLAR_ID);
    assert.ok(alex);
    assert.strictEqual(alex.id, 'alex_morgan');
    assert.strictEqual(alex.atsScore, 98);
    assert.strictEqual(alex.candidate.name, 'SVS Praveen');
    assert.strictEqual(alex.candidate.title, 'Senior Full Stack & AI Solutions Architect');
    assert.ok(alex.metricsBreakdown.length >= 3);
    assert.ok(alex.work_history.length >= 2);
  });

  it('contains quantified STAR metrics for Alex Morgan', () => {
    const alex = getExemplarById('alex_morgan');
    const allBullets = alex.work_history.flatMap(w => w.bullets).join(' ');
    assert.ok(allBullets.includes('1.2M events/sec'));
    assert.ok(allBullets.includes('sub-45ms p99 latency'));
    assert.ok(allBullets.includes('$480,000 annually'));
    assert.ok(allBullets.includes('Rust'));
    assert.ok(allBullets.includes('Apache Kafka'));
  });

  it('provides Elena Rostova and Marcus Chen profiles', () => {
    const elena = getExemplarById('elena_rostova');
    assert.ok(elena);
    assert.strictEqual(elena.candidate.name, 'Elena Rostova (Sample Blueprint)');
    assert.strictEqual(elena.atsScore, 99);

    const marcus = getExemplarById('marcus_chen');
    assert.ok(marcus);
    assert.strictEqual(marcus.candidate.name, 'Marcus Chen (Sample Blueprint)');
    assert.strictEqual(marcus.atsScore, 97);
  });

  it('falls back to default exemplar when unknown ID is passed', () => {
    const fallback = getExemplarById('unknown_candidate_xyz');
    assert.ok(fallback);
    assert.strictEqual(fallback.id, 'alex_morgan');
  });

  it('returns all exemplars via getAllExemplars', () => {
    const list = getAllExemplars();
    assert.ok(Array.isArray(list));
    assert.strictEqual(list.length, 3);
  });

  it('retrieves top 2 exemplar bullet anchors for prompt few-shot styling', () => {
    const anchors = retrieveExemplarBulletAnchors('Built streaming event pipeline', 'distributed systems');
    assert.equal(anchors.length, 2);
    assert.ok(typeof anchors[0] === 'string');
    assert.ok(typeof anchors[1] === 'string');
    // Verify metric density in retrieved anchors
    assert.ok(/\d+%|\$\d+|\d+x|\d+\s*(ms|events|req|users|clusters)/i.test(anchors[0]));
  });
});
