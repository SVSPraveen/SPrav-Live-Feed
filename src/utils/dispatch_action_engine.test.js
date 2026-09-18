import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildScreeningAnswerList,
  buildJobAutofillBookmarkletCode,
  syncJobApplicationStatus
} from './dispatch_action_engine.js';

test('buildScreeningAnswerList: generates complete list of 7 normalized questions', () => {
  const kb = {
    name: 'Jane Doe',
    years_experience: 5,
    work_history: [{ company: 'Acme', role: 'Staff Engineer' }]
  };
  const scope = {
    target_salary: { minimum: 150000 }
  };

  const answers = buildScreeningAnswerList(kb, scope);
  assert.equal(answers.length, 7);
  assert.ok(answers.some(a => a.id === 'work_auth'));
  assert.ok(answers.some(a => a.id === 'visa_sponsorship'));
  assert.ok(answers.some(a => a.id === 'target_salary'));
  assert.ok(answers.some(a => a.id === 'notice_period'));
  assert.ok(answers.some(a => a.id === 'years_experience'));
});

test('buildScreeningAnswerList: respects custom overrides', () => {
  const kb = { name: 'Alex' };
  const scope = {};
  const overrides = {
    workAuth: 'US Citizen',
    salary: '$180,000'
  };

  const answers = buildScreeningAnswerList(kb, scope, overrides);
  const authItem = answers.find(a => a.id === 'work_auth');
  const salItem = answers.find(a => a.id === 'target_salary');

  assert.equal(authItem.value, 'US Citizen');
  assert.equal(salItem.value, '$180,000');
});

test('buildJobAutofillBookmarkletCode: produces valid javascript bookmarklet string', () => {
  const kb = { name: 'John Doe', email: 'john@example.com' };
  const scope = { roles: ['Frontend Engineer'] };

  const script = buildJobAutofillBookmarkletCode(kb, scope);
  assert.ok(typeof script === 'string');
  assert.ok(script.startsWith('javascript:'));
  const decoded = decodeURIComponent(script);
  assert.ok(decoded.includes('john@example.com') || decoded.includes('John Doe'));
});

test('syncJobApplicationStatus: handles null or missing job gracefully', async () => {
  const resNull = await syncJobApplicationStatus(null, true);
  assert.equal(resNull, false);

  const resNoId = await syncJobApplicationStatus({}, true);
  assert.equal(resNoId, false);
});
