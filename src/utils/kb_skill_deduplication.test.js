import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeSkill,
  findSkillDuplicate,
  detectSkillDuplicates,
  formatDuplicateWarning,
  formatCategoryFallbackTitle
} from './kb_skill_deduplication.js';

const mockCategoryMeta = {
  frontend_web: { title: 'Frontend Web Engineering' },
  full_stack_backend: { title: 'Full Stack & Backend Engineering' },
  cloud_security: { title: 'Cloud, DevOps & SRE' },
  ml_evaluation: { title: 'ML, Evaluation & Data Science' }
};

const mockExistingSkills = {
  frontend_web: ['React', 'TypeScript', 'Next.js'],
  full_stack_backend: ['Python', 'PostgreSQL', 'FastAPI'],
  cloud_security: ['Docker', 'AWS', 'Kubernetes'],
  ml_evaluation: ['PyTorch']
};

test('normalizeSkill: handles casing, whitespace, and edge cases safely', () => {
  assert.equal(normalizeSkill('  Python  '), 'python');
  assert.equal(normalizeSkill('React.js'), 'react.js');
  assert.equal(normalizeSkill('DOCKER'), 'docker');
  assert.equal(normalizeSkill('  Node.js   Runtime  '), 'node.js runtime');
  assert.equal(normalizeSkill(''), '');
  assert.equal(normalizeSkill(null), '');
  assert.equal(normalizeSkill(undefined), '');
  assert.equal(normalizeSkill(123), '');
});

test('findSkillDuplicate: detects existing skills case-insensitively across categories', () => {
  // Case-insensitive match in same category
  const res1 = findSkillDuplicate('react', mockExistingSkills, mockCategoryMeta);
  assert.equal(res1.found, true);
  assert.equal(res1.exactName, 'React');
  assert.equal(res1.categoryKey, 'frontend_web');
  assert.equal(res1.categoryTitle, 'Frontend Web Engineering');

  // Case-insensitive match with leading/trailing spaces
  const res2 = findSkillDuplicate('  PYTHON  ', mockExistingSkills, mockCategoryMeta);
  assert.equal(res2.found, true);
  assert.equal(res2.exactName, 'Python');
  assert.equal(res2.categoryKey, 'full_stack_backend');

  // Not found
  const res3 = findSkillDuplicate('Rust', mockExistingSkills, mockCategoryMeta);
  assert.equal(res3.found, false);
  assert.equal(res3.categoryKey, null);
});

test('detectSkillDuplicates: blocks duplicate in same category and generates clear warning', () => {
  const result = detectSkillDuplicates(
    'React',
    'frontend_web',
    mockExistingSkills,
    mockCategoryMeta
  );

  assert.equal(result.hasDuplicates, true);
  assert.equal(result.validSkills.length, 0);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].skill, 'React');
  assert.equal(result.duplicates[0].isSameCategory, true);
  assert.match(result.warningMessage, /"React" is already present in this category/);
});

test('detectSkillDuplicates: blocks duplicate in another category and points to where it is', () => {
  // Trying to add 'Python' to ml_evaluation when it's already in full_stack_backend
  const result = detectSkillDuplicates(
    'python',
    'ml_evaluation',
    mockExistingSkills,
    mockCategoryMeta
  );

  assert.equal(result.hasDuplicates, true);
  assert.equal(result.validSkills.length, 0);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].isSameCategory, false);
  assert.equal(result.duplicates[0].categoryKey, 'full_stack_backend');
  assert.match(result.warningMessage, /already exists in "Full Stack & Backend Engineering"/i);
  assert.match(result.warningMessage, /Duplicate not added/i);
});

test('detectSkillDuplicates: handles comma-separated batch input with mixed duplicates and unique skills', () => {
  // Input: 'Docker, Go, KUBERNETES, Terraform'
  // Existing: Docker and Kubernetes in cloud_security
  // New: Go and Terraform
  const result = detectSkillDuplicates(
    'Docker, Go, KUBERNETES, Terraform',
    'cloud_security',
    mockExistingSkills,
    mockCategoryMeta
  );

  assert.equal(result.hasDuplicates, true);
  assert.deepEqual(result.validSkills, ['Go', 'Terraform']);
  assert.equal(result.duplicates.length, 2);
  assert.match(result.warningMessage, /Duplicate skills detected/);
  assert.match(result.warningMessage, /Added unique skills: Go, Terraform/);
});

test('detectSkillDuplicates: detects duplicate within the same batch addition', () => {
  const result = detectSkillDuplicates(
    'GraphQL, graphql',
    'frontend_web',
    mockExistingSkills,
    mockCategoryMeta
  );

  assert.equal(result.hasDuplicates, true);
  assert.deepEqual(result.validSkills, ['GraphQL']);
  assert.equal(result.duplicates.length, 1);
  assert.equal(result.duplicates[0].skill, 'graphql');
});

test('detectSkillDuplicates: returns no duplicates when all skills are fresh', () => {
  const result = detectSkillDuplicates(
    'Elixir, Phoenix, Erlang',
    'full_stack_backend',
    mockExistingSkills,
    mockCategoryMeta
  );

  assert.equal(result.hasDuplicates, false);
  assert.deepEqual(result.validSkills, ['Elixir', 'Phoenix', 'Erlang']);
  assert.equal(result.duplicates.length, 0);
  assert.equal(result.warningMessage, null);
});

test('formatCategoryFallbackTitle: creates clean title when meta is absent', () => {
  assert.equal(formatCategoryFallbackTitle('systems_architecture'), 'Systems Architecture');
  assert.equal(formatCategoryFallbackTitle('ai_ml_tools'), 'Ai Ml Tools');
  assert.equal(formatCategoryFallbackTitle(''), 'General Skills');
});
