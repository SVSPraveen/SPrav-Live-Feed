import test from 'node:test';
import assert from 'node:assert/strict';
import {
  JD_COMPETENCY_SCHEMA,
  ATS_AUDIT_SCHEMA,
  MULTI_TONE_FOLLOWUP_SCHEMA,
  BULLET_REWRITE_SCHEMA,
  SCREENING_ANSWER_SCHEMA,
  MICRO_ACTION_SCHEMA,
  validateAgainstSchema
} from './structured_schemas.js';

test('schemas: all schemas serialize cleanly to JSON for XGrammar compilation', () => {
  const schemas = [
    JD_COMPETENCY_SCHEMA,
    ATS_AUDIT_SCHEMA,
    MULTI_TONE_FOLLOWUP_SCHEMA,
    BULLET_REWRITE_SCHEMA,
    SCREENING_ANSWER_SCHEMA,
    MICRO_ACTION_SCHEMA
  ];

  for (const schema of schemas) {
    assert.equal(typeof schema, 'object');
    assert.equal(schema.type, 'object');
    const jsonStr = JSON.stringify(schema);
    assert.ok(jsonStr.length > 20);
    const roundtrip = JSON.parse(jsonStr);
    assert.deepEqual(roundtrip, schema);
  }
});

test('validateAgainstSchema: validates JD_COMPETENCY_SCHEMA', () => {
  const validData = {
    must_have_skills: ['Python', 'Kafka', 'Kubernetes'],
    minimum_years: 5,
    level: 'senior'
  };
  const resValid = validateAgainstSchema(validData, JD_COMPETENCY_SCHEMA);
  assert.equal(resValid.valid, true);
  assert.equal(resValid.errors.length, 0);

  // Missing required field
  const invalidData = {
    must_have_skills: ['Python'],
    level: 'senior'
  };
  const resInvalid = validateAgainstSchema(invalidData, JD_COMPETENCY_SCHEMA);
  assert.equal(resInvalid.valid, false);
  assert.ok(resInvalid.errors.some(e => e.includes('minimum_years')));

  // Bad enum value
  const badEnum = {
    must_have_skills: ['Go'],
    minimum_years: 3,
    level: 'god_mode'
  };
  const resBadEnum = validateAgainstSchema(badEnum, JD_COMPETENCY_SCHEMA);
  assert.equal(resBadEnum.valid, false);
  assert.ok(resBadEnum.errors.some(e => e.includes('level')));
});

test('validateAgainstSchema: validates ATS_AUDIT_SCHEMA', () => {
  const validAudit = {
    ats_score: 88,
    matching_skills: ['React', 'TypeScript'],
    missing_skills: ['GraphQL'],
    strategic_advice: 'Add concrete GraphQL performance metrics.'
  };
  const res = validateAgainstSchema(validAudit, ATS_AUDIT_SCHEMA);
  assert.equal(res.valid, true);

  const invalidScore = {
    ats_score: 'eighty-eight',
    matching_skills: ['React'],
    missing_skills: [],
    strategic_advice: 'Good'
  };
  const resBad = validateAgainstSchema(invalidScore, ATS_AUDIT_SCHEMA);
  assert.equal(resBad.valid, false);
  assert.ok(resBad.errors.some(e => e.includes('ats_score')));
});

test('validateAgainstSchema: validates MULTI_TONE_FOLLOWUP_SCHEMA', () => {
  const validFollowup = {
    subject: 'Stripe Engineering Followup - Alex Morgan',
    email: 'Following up on my Staff Engineer application...',
    tech: 'Discussing distributed Kafka pipeline optimizations...',
    inmail: 'Brief status inquiry regarding my submission...',
    cover: 'Organic cover letter without template headers...'
  };
  const res = validateAgainstSchema(validFollowup, MULTI_TONE_FOLLOWUP_SCHEMA);
  assert.equal(res.valid, true);
});
