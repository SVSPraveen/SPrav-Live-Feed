import test from 'node:test';
import assert from 'node:assert/strict';
import { computeProfileStrengthScore } from './profile_strength_engine.js';

test('computeProfileStrengthScore: returns 0-100 baseline with empty profile', () => {
  const result = computeProfileStrengthScore({}, {});
  assert.equal(typeof result.total, 'number');
  assert.equal(result.total >= 0 && result.total <= 100, true);
  assert.equal(result.tier, 'Needs Setup');
});

test('computeProfileStrengthScore: calculates high score for fully complete profile', () => {
  const kb = {
    personal: { name: 'Jane Doe', email: 'jane@example.com', phone: '1234567890', linkedin: 'linkedin.com/in/jane' },
    work_history: [
      { company: 'TechCorp', role: 'Staff Engineer', bullets: ['Engineered microservices scaling to 50k rps', 'Reduced p99 by 40%'] },
      { company: 'DevInc', role: 'Senior Engineer', bullets: ['Built distributed pipeline'] }
    ],
    skills: ['Go', 'Kubernetes', 'Python', 'React', 'PostgreSQL', 'Docker', 'AWS', 'Redis', 'Kafka', 'TypeScript'],
    education: [{ school: 'MIT', degree: 'BS CS' }],
    projects: [{ title: 'OpenSource Distributed KV' }]
  };

  const scope = {
    roles: [{ keyword: 'Staff Engineer', preference: 'apply' }, { keyword: 'Backend Architect', preference: 'apply' }, { keyword: 'Systems Lead', preference: 'apply' }],
    locations: [{ label: 'Remote', preference: 'apply' }, { label: 'San Francisco', preference: 'apply' }],
    work_mode: 'remote',
    experience_level: 'senior',
    target_salary: { minimum: 180000 }
  };

  const extra = { masterResumeUploaded: true, atsScanned: true };

  const result = computeProfileStrengthScore(kb, scope, extra);
  assert.equal(result.resumeScore, 40);
  assert.equal(result.atsScore, 30);
  assert.equal(result.scopeScore, 30);
  assert.equal(result.total, 100);
  assert.equal(result.tier, 'Elite ATS Ready');
});

test('computeProfileStrengthScore: calculates partial calibration properly', () => {
  const kb = {
    personal: { name: 'John Smith', email: 'john@example.com' },
    work_history: [{ company: 'Startup', role: 'Developer', bullets: ['Built React components'] }],
    skills: ['JavaScript', 'HTML', 'CSS', 'React']
  };
  const scope = {
    roles: [{ keyword: 'Frontend Developer', preference: 'apply' }]
  };
  const result = computeProfileStrengthScore(kb, scope, {});
  assert.equal(result.total >= 40 && result.total <= 70, true);
  assert.equal(['Calibrating', 'Needs Setup'].includes(result.tier), true);
  assert.equal(Boolean(result.nextAction), true);
});
