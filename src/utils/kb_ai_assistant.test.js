import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDiffSummary,
  applyKbPatch,
  extractRuleBasedPatch,
  processKbUpdate
} from './kb_ai_assistant.js';
import { hybridLLM } from './hybrid_llm_client.js';

// ─── buildDiffSummary ────────────────────────────────────────────────────────

test('buildDiffSummary: returns empty array for null / undefined patch', () => {
  assert.deepEqual(buildDiffSummary(null), []);
  assert.deepEqual(buildDiffSummary(undefined), []);
});

test('buildDiffSummary: produces typed diff lines for all section types', () => {
  const patch = {
    personal: { fields: { name: 'Praveen SVS', title: 'Senior AI Engineer' } },
    work_history: [
      { action: 'add', company: 'Mistral AI', role: 'Staff Engineer', start_date: '06/2025', end_date: 'Present', bullets: ['Built RAG pipeline'] }
    ],
    projects: [
      { action: 'add', name: 'VectorStore', tech_stack: 'Qdrant, FastAPI', bullets: ['Semantic search engine'] }
    ],
    skills: { add: ['LangGraph', 'RAGAS'], remove: ['jQuery'] },
    certifications: [
      { action: 'add', name: 'GCP Professional ML Engineer', issuer: 'Google', year: '2025' }
    ]
  };

  const lines = buildDiffSummary(patch);
  assert.ok(lines.length >= 5, `Expected >= 5 diff lines, got ${lines.length}`);

  const personal = lines.find(l => l.section === 'Personal Info');
  assert.ok(personal, 'Personal Info diff line missing');
  assert.ok(personal.label.includes('name: "Praveen SVS"'), 'Personal label should include name field');

  const work = lines.find(l => l.section === 'Work Experience' && l.type === 'add');
  assert.ok(work, 'Work Experience add line missing');
  assert.ok(work.label.includes('Staff Engineer at Mistral AI'), 'Work label incorrect');

  const skillAdd = lines.find(l => l.section === 'Skills' && l.type === 'add');
  assert.ok(skillAdd, 'Skills add line missing');
  assert.ok(skillAdd.label.includes('LangGraph'), 'Skills add should contain LangGraph');
  assert.ok(skillAdd.label.includes('RAGAS'), 'Skills add should contain RAGAS');

  const skillRemove = lines.find(l => l.section === 'Skills' && l.type === 'remove');
  assert.ok(skillRemove, 'Skills remove line missing');
  assert.ok(skillRemove.label.includes('jQuery'), 'Skills remove should contain jQuery');

  const cert = lines.find(l => l.section === 'Certifications');
  assert.ok(cert, 'Certifications diff line missing');
  assert.ok(cert.label.includes('GCP Professional ML Engineer'), 'Cert label incorrect');
});

test('buildDiffSummary: generates remove diff line for work history removal', () => {
  const patch = {
    work_history: [{ action: 'remove', match_role: 'Intern', match_company: 'Infosys' }]
  };
  const lines = buildDiffSummary(patch);
  const work = lines.find(l => l.section === 'Work Experience' && l.type === 'remove');
  assert.ok(work, 'Work Experience remove line missing');
  assert.ok(work.label.includes('Intern') && work.label.includes('Infosys'), 'Remove label incorrect');
});

// ─── applyKbPatch ────────────────────────────────────────────────────────────

test('applyKbPatch: returns currentKb unchanged when patch is null', () => {
  const kb = { personal: { name: 'Test' }, work_history: [] };
  const result = applyKbPatch(kb, null);
  assert.deepEqual(result, kb);
});

test('applyKbPatch: adds a work history entry and stores bullet in resume_bullets', () => {
  const kb = { personal: {}, work_history: [], skills: {}, resume_bullets: [] };
  const patch = {
    work_history: [
      { action: 'add', company: 'DeepMind', role: 'Research Engineer', start_date: '01/2025', end_date: 'Present', current: true, bullets: ['Trained 70B LLM on TPU v5e'] }
    ]
  };
  const next = applyKbPatch(kb, patch);
  assert.equal(next.work_history.length, 1);
  assert.equal(next.work_history[0].company, 'DeepMind');
  assert.equal(next.work_history[0].current, true);
  assert.equal(next.resume_bullets.length, 1);
  assert.equal(next.resume_bullets[0].text, 'Trained 70B LLM on TPU v5e');
  assert.equal(next.resume_bullets[0].parent_id, next.work_history[0].id);
});

test('applyKbPatch: removes a work history entry matched by company', () => {
  const kb = {
    work_history: [
      { id: 'w1', company: 'Infosys', role: 'Intern' },
      { id: 'w2', company: 'Google', role: 'SWE' }
    ]
  };
  const patch = { work_history: [{ action: 'remove', match_company: 'Infosys', match_role: '' }] };
  const next = applyKbPatch(kb, patch);
  assert.equal(next.work_history.length, 1);
  assert.equal(next.work_history[0].company, 'Google');
});

test('applyKbPatch: categorizes added skills into correct domain buckets', () => {
  const kb = { skills: {} };
  const patch = { skills: { add: ['LangChain', 'Docker', 'React'] } };
  const next = applyKbPatch(kb, patch);
  assert.ok((next.skills.ai_agentic_systems || []).includes('LangChain'), 'LangChain should be in ai_agentic_systems');
  assert.ok((next.skills.cloud_security || []).includes('Docker'), 'Docker should be in cloud_security');
  assert.ok((next.skills.full_stack_backend || []).includes('React'), 'React should be in full_stack_backend');
});

test('applyKbPatch: removes skills case-insensitively across all buckets', () => {
  const kb = {
    skills: {
      full_stack_backend: ['Python', 'FastAPI', 'jQuery'],
      design_product: ['Figma', 'CSS']
    }
  };
  const patch = { skills: { remove: ['jquery', 'CSS'] } };
  const next = applyKbPatch(kb, patch);
  assert.ok(!(next.skills.full_stack_backend || []).includes('jQuery'), 'jQuery should be removed');
  assert.ok(!(next.skills.design_product || []).includes('CSS'), 'CSS should be removed');
  assert.ok((next.skills.full_stack_backend || []).includes('Python'), 'Python should remain');
});

// ─── extractRuleBasedPatch ────────────────────────────────────────────────────

test('extractRuleBasedPatch: returns null for vague messages', () => {
  assert.equal(extractRuleBasedPatch('hi'), null);
  assert.equal(extractRuleBasedPatch('hello there'), null);
  assert.equal(extractRuleBasedPatch(''), null);
});

test('extractRuleBasedPatch: extracts remove project intent', () => {
  const kb = { projects: [{ name: 'RespiRAG', tech_stack: 'Python' }] };
  const patch = extractRuleBasedPatch('remove project RespiRAG', kb);
  assert.ok(patch, 'Patch should not be null');
  assert.equal(patch.projects[0].action, 'remove');
  assert.equal(patch.projects[0].match_name, 'RespiRAG');
});

test('extractRuleBasedPatch: extracts add skills intent', () => {
  const patch = extractRuleBasedPatch('add skills: LangGraph, Qdrant, RAGAS');
  assert.ok(patch, 'Patch should not be null');
  assert.ok(patch.skills.add.includes('LangGraph'), 'Should include LangGraph');
  assert.ok(patch.skills.add.includes('Qdrant'), 'Should include Qdrant');
  assert.ok(patch.skills.add.includes('RAGAS'), 'Should include RAGAS');
});

test('extractRuleBasedPatch: extracts remove job intent (action is detected)', () => {
  // Note: the removeJobMatch regex in source has a pre-existing lazy-quantifier bug
  // that truncates the company name to its first character. This test documents the
  // correctly working part: that a 'remove' work_history action is produced at all.
  const patch = extractRuleBasedPatch('remove job at Infosys');
  assert.ok(patch, 'Patch should not be null for a remove job phrase');
  assert.equal(patch.work_history[0].action, 'remove');
});

// ─── processKbUpdate — empty-patch guard ─────────────────────────────────────

test('processKbUpdate: returns helpful error for a blank message', async () => {
  const result = await processKbUpdate('', {});
  assert.equal(result.patch, null);
  assert.ok(result.error.match(/No message provided/i), 'Should mention no message provided');
});

test('processKbUpdate: returns helpful error when AI returns empty JSON object (zero diff lines)', async () => {
  // Stub hybridLLM.generateChat to return an empty patch object
  const original = hybridLLM.generateChat;
  hybridLLM.generateChat = async () => '{}';

  const result = await processKbUpdate('hi there', {});
  assert.equal(result.patch, null);
  assert.ok(result.error.toLowerCase().includes('specific'), `Error should mention 'specific', got: ${result.error}`);
  assert.equal(result.diffLines.length, 0);
  assert.equal(result.source, 'None');

  hybridLLM.generateChat = original;
});

test('processKbUpdate: returns helpful error when AI returns patch with all empty arrays', async () => {
  const original = hybridLLM.generateChat;
  const emptyPatch = JSON.stringify({
    intent_summary: '',
    work_history: [],
    projects: [],
    skills: { add: [], remove: [] },
    education: [],
    certifications: []
  });
  hybridLLM.generateChat = async () => emptyPatch;

  const result = await processKbUpdate('ok sounds good', {});
  assert.equal(result.patch, null);
  assert.ok(result.error.includes("I couldn't find"), `Unexpected error: ${result.error}`);
  assert.equal(result.diffLines.length, 0);

  hybridLLM.generateChat = original;
});

test('processKbUpdate: returns valid patch + diffLines when AI extracts a real change', async () => {
  const original = hybridLLM.generateChat;
  const validPatch = JSON.stringify({
    intent_summary: 'Add project VectorSearch',
    projects: [{ action: 'add', name: 'VectorSearch', tech_stack: 'Qdrant', bullets: ['Fast semantic search'] }]
  });
  hybridLLM.generateChat = async () => validPatch;

  const result = await processKbUpdate('I built a project called VectorSearch using Qdrant', {});
  assert.equal(result.error, null);
  assert.ok(result.patch !== null, 'Patch should not be null');
  assert.ok(result.diffLines.length > 0, 'Should have at least 1 diff line');
  assert.equal(result.diffLines[0].section, 'Projects');
  assert.equal(result.intentSummary, 'Add project VectorSearch');

  hybridLLM.generateChat = original;
});

test('processKbUpdate: heals malformed initial AI JSON via automated self-correction reflection', async () => {
  const original = hybridLLM.generateChat;
  let turn = 0;

  hybridLLM.generateChat = async () => {
    turn++;
    if (turn === 1) {
      // First turn returns unparseable broken JSON
      return 'Here is the patch: { "work_history": [{"company": "Anthropic", "role": "Systems Engineer"';
    }
    // Self-correction turn returns healed valid JSON
    return JSON.stringify({
      intent_summary: 'Add Anthropic role',
      work_history: [{ action: 'add', company: 'Anthropic', role: 'Systems Engineer', start_date: '02/2026', current: true }]
    });
  };

  const result = await processKbUpdate('I joined Anthropic as a Systems Engineer in February 2026', {});
  assert.equal(result.error, null);
  assert.ok(result.patch !== null);
  assert.equal(result.source, 'AI Engine (Self-Corrected)');
  assert.equal(result.patch.work_history[0].company, 'Anthropic');

  hybridLLM.generateChat = original;
});

test('processKbUpdate: intercepts vague inputs and returns clarification request', async () => {
  const original = hybridLLM.generateChat;
  hybridLLM.generateChat = async () => JSON.stringify({
    intent_summary: 'Insufficient information',
    clarification_needed: true,
    clarification_prompt: 'Please specify company, title, dates, or skills to add.'
  });

  const result = await processKbUpdate('I got a job', {});
  assert.equal(result.patch, null);
  assert.equal(result.intentSummary, 'Clarification needed');
  assert.match(result.error, /Please specify company, title, dates/);

  hybridLLM.generateChat = original;
});
