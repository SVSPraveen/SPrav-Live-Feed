import test from 'node:test';
import assert from 'node:assert/strict';
import {
  computeMomentumScore,
  getFallbackLearningRoadmap,
  generateSkillGapRoadmap,
  buildLearningRoadmapPrompt,
  LEARNING_PROMPT,
  SKILL_DOMAINS,
  SKILL_RESOURCES,
  getSkillResources,
  getFreeLearningPlatforms,
  resolveSkillLearningResources
} from './skill_gap_roadmap.js';
import { hybridLLM } from './hybrid_llm_client.js';

test('buildLearningRoadmapPrompt: formats missing skills, target role and current skills', () => {
  const prompt = buildLearningRoadmapPrompt(['Docker', 'Kubernetes'], 'Cloud Architect', ['Node.js', 'React']);
  assert.ok(prompt.includes('A candidate is missing: Docker, Kubernetes'));
  assert.ok(prompt.includes('They are targeting: Cloud Architect'));
  assert.ok(prompt.includes('Their current skills: Node.js, React'));
  assert.ok(prompt.includes('Create a realistic 4-week self-study plan'));
});

test('buildLearningRoadmapPrompt: handles empty arguments with sensible defaults', () => {
  const prompt = buildLearningRoadmapPrompt();
  assert.ok(prompt.includes('General software development tools'));
  assert.ok(prompt.includes('Software Engineer'));
  assert.ok(prompt.includes('Modern software engineering fundamentals'));
});

test('computeMomentumScore: calculates velocity, trend, and daysSinceLastApp', () => {
  const now = Date.now();
  const dayMs = 86400000;

  // 1. Stalled scenario: last application > 3 days ago
  const stalledApps = [
    { id: 1, applied_at: new Date(now - 5 * dayMs).toISOString() }
  ];
  const stalledResult = computeMomentumScore([], stalledApps);
  assert.equal(stalledResult.velocity, 1);
  assert.equal(stalledResult.daysSinceLastApp, 5);
  assert.equal(stalledResult.stalled, true);

  // 2. Active upward momentum: 3 this week, 1 last week
  const activeApps = [
    { id: 1, applied_at: new Date(now - 1 * dayMs).toISOString() },
    { id: 2, applied_at: new Date(now - 2 * dayMs).toISOString() },
    { id: 3, applied_at: new Date(now - 3 * dayMs).toISOString() },
    { id: 4, applied_at: new Date(now - 8 * dayMs).toISOString() }
  ];
  const activeResult = computeMomentumScore([], activeApps);
  assert.equal(activeResult.velocity, 3);
  assert.equal(activeResult.trend, 'up');
  assert.equal(activeResult.daysSinceLastApp, 1);
  assert.equal(activeResult.stalled, false);

  // 3. Downward momentum: 1 this week, 3 last week
  const slowingApps = [
    { id: 1, applied_at: new Date(now - 2 * dayMs).toISOString() },
    { id: 2, applied_at: new Date(now - 8 * dayMs).toISOString() },
    { id: 3, applied_at: new Date(now - 9 * dayMs).toISOString() },
    { id: 4, applied_at: new Date(now - 10 * dayMs).toISOString() }
  ];
  const slowingResult = computeMomentumScore([], slowingApps);
  assert.equal(slowingResult.velocity, 1);
  assert.equal(slowingResult.trend, 'down');
  assert.equal(slowingResult.daysSinceLastApp, 2);
  assert.equal(slowingResult.stalled, false);

  // 4. Empty applications list
  const emptyResult = computeMomentumScore([], []);
  assert.equal(emptyResult.velocity, 0);
  assert.equal(emptyResult.trend, 'flat');
  assert.equal(emptyResult.daysSinceLastApp, null);
  assert.equal(emptyResult.stalled, false);
});

test('getFallbackLearningRoadmap: generates complete 4-week plan with preset or generic domains', () => {
  // Kubernetes domain preset
  const k8sPlan = getFallbackLearningRoadmap(['Kubernetes'], 'DevOps Engineer');
  assert.equal(k8sPlan.weeks.length, 4);
  assert.equal(k8sPlan.weeks[0].week, 1);
  assert.ok(k8sPlan.weeks[0].focus.includes('Pod Lifecycle') || k8sPlan.weeks[0].focus.includes('Week 1'));
  assert.ok(k8sPlan.weeks[0].resource.length > 5);
  assert.ok(k8sPlan.weeks[1].project.length > 10);
  assert.ok(k8sPlan.weeks[2].focus.includes('Week 3'));
  assert.ok(k8sPlan.weeks[3].project.includes('resume') || k8sPlan.weeks[3].project.includes('Architected') || k8sPlan.weeks[3].focus.includes('resume'));

  // Unknown skill generic fallback
  const genericPlan = getFallbackLearningRoadmap(['Elixir'], 'Backend Engineer');
  assert.equal(genericPlan.weeks.length, 4);
  assert.equal(genericPlan.weeks[0].week, 1);
  assert.ok(genericPlan.weeks[0].focus.includes('Elixir'));
  assert.ok(genericPlan.weeks[1].project.includes('Elixir'));
  assert.ok(genericPlan.weeks[2].project.includes('open-source'));
  assert.ok(genericPlan.weeks[3].project.includes('resume') || genericPlan.weeks[3].focus.includes('Resume'));
});

test('generateSkillGapRoadmap: falls back gracefully if AI returns unparseable content', async () => {
  const original = hybridLLM.generateChat;
  hybridLLM.generateChat = async () => 'Not valid JSON';
  try {
    const result = await generateSkillGapRoadmap({
      missingSkills: ['Docker'],
      targetRole: 'Site Reliability Engineer',
      currentSkills: ['Linux', 'Bash']
    });

    assert.ok(result);
    assert.equal(result.weeks.length, 4);
    assert.equal(result.weeks[0].week, 1);
    assert.ok(result.weeks[0].resource.includes('Docker'));
  } finally {
    hybridLLM.generateChat = original;
  }
});

test('generateSkillGapRoadmap: returns valid parsed AI roadmap when LLM responds with valid JSON', async () => {
  const original = hybridLLM.generateChat;
  hybridLLM.generateChat = async () => JSON.stringify({
    weeks: [
      { week: 1, focus: 'AI Week 1: Core Async Architecture', resource: 'Official Docs', project: 'Async Kata Sandbox' },
      { week: 2, focus: 'AI Week 2: Distributed Queue Prototype', resource: 'GitHub Examples', project: 'Build RabbitMQ worker' },
      { week: 3, focus: 'AI Week 3: Open-Source Bug Triage', resource: 'GitHub Issues', project: 'Submit patch to Celery' },
      { week: 4, focus: 'AI Week 4: Benchmark & Resume Polish', resource: 'Technical Writing Guide', project: 'Engineered high-throughput queue' }
    ]
  });
  try {
    const result = await generateSkillGapRoadmap({
      missingSkills: ['Rust'],
      targetRole: 'Systems Engineer'
    });
    assert.equal(result.weeks.length, 4);
    assert.equal(result.weeks[0].focus, 'AI Week 1: Core Async Architecture');
    assert.equal(result.weeks[1].project, 'Build RabbitMQ worker');
  } finally {
    hybridLLM.generateChat = original;
  }
});

test('SKILL_DOMAINS: contains 21 comprehensive curated engineering domains', () => {
  const expectedDomains = [
    'docker', 'kubernetes', 'react', 'typescript', 'python', 'aws',
    'kafka', 'terraform', 'go', 'rust', 'graphql', 'redis',
    'postgresql', 'nextjs', 'pytorch', 'system_design',
    'cybersecurity', 'data_engineering', 'embedded_c', 'mobile_development', 'qa_automation'
  ];

  for (const domain of expectedDomains) {
    assert.ok(SKILL_DOMAINS[domain], `Missing domain preset: ${domain}`);
    assert.ok(SKILL_DOMAINS[domain].w1.focus, `${domain} w1 missing focus`);
    assert.ok(SKILL_DOMAINS[domain].w1.resource, `${domain} w1 missing resource`);
    assert.ok(SKILL_DOMAINS[domain].w2.project, `${domain} w2 missing project`);
    assert.ok(SKILL_DOMAINS[domain].w3.project, `${domain} w3 missing project`);
    assert.ok(SKILL_DOMAINS[domain].w4.project, `${domain} w4 missing project`);
  }
});

test('getFallbackLearningRoadmap: accurately matches new engineering domain presets', () => {
  // 1. Kafka
  const kafkaPlan = getFallbackLearningRoadmap(['Kafka'], 'Backend Architect');
  assert.ok(kafkaPlan.weeks[0].focus.includes('Event-Driven Architecture') || kafkaPlan.weeks[0].resource.includes('Apache Kafka'));
  assert.ok(kafkaPlan.weeks[1].focus.includes('Event Stream') || kafkaPlan.weeks[1].project.includes('event pipeline'));

  // 2. Terraform
  const tfPlan = getFallbackLearningRoadmap(['Terraform'], 'DevOps Engineer');
  assert.ok(tfPlan.weeks[0].resource.includes('HashiCorp'));
  assert.ok(tfPlan.weeks[1].project.includes('Terraform modules'));

  // 3. Golang / Go
  const goPlan = getFallbackLearningRoadmap(['Golang'], 'Systems Engineer');
  assert.ok(goPlan.weeks[0].resource.includes('The Go Programming Language'));
  assert.ok(goPlan.weeks[1].project.includes('HTTP/2 REST microservice'));

  // 4. PostgreSQL
  const pgPlan = getFallbackLearningRoadmap(['PostgreSQL'], 'Database Engineer');
  assert.ok(pgPlan.weeks[0].resource.includes('PostgreSQL'));
  assert.ok(pgPlan.weeks[1].project.includes('PgBouncer'));

  // 5. System Design
  const sysPlan = getFallbackLearningRoadmap(['System Design'], 'Staff Engineer');
  assert.ok(sysPlan.weeks[0].resource.includes('Designing Data-Intensive Applications'));

  // 6. Cybersecurity
  const secPlan = getFallbackLearningRoadmap(['Cybersecurity'], 'AppSec Engineer');
  assert.ok(secPlan.weeks[0].focus.includes('STRIDE') || secPlan.weeks[0].resource.includes('OWASP'));
  assert.ok(secPlan.weeks[1].project.includes('OAuth2'));

  // 7. Data Engineering
  const dataPlan = getFallbackLearningRoadmap(['Data Engineering'], 'Data Platform Engineer');
  assert.ok(dataPlan.weeks[0].resource.includes('dbt') || dataPlan.weeks[0].focus.includes('Lakehouse'));
  assert.ok(dataPlan.weeks[1].project.includes('ELT pipeline'));

  // 8. Embedded Systems
  const embPlan = getFallbackLearningRoadmap(['Embedded Systems'], 'Firmware Engineer');
  assert.ok(embPlan.weeks[0].resource.includes('ARM Cortex-M') || embPlan.weeks[0].focus.includes('Embedded C'));
  assert.ok(embPlan.weeks[1].project.includes('FreeRTOS'));

  // 9. Mobile Engineering
  const mobPlan = getFallbackLearningRoadmap(['Mobile Development'], 'iOS Engineer');
  assert.ok(mobPlan.weeks[0].resource.includes('Apple Developer') || mobPlan.weeks[0].focus.includes('SwiftUI'));
  assert.ok(mobPlan.weeks[1].project.includes('offline-first'));

  // 10. QA Automation
  const qaPlan = getFallbackLearningRoadmap(['Playwright SDET'], 'QA Automation Engineer');
  assert.ok(qaPlan.weeks[0].resource.includes('Playwright'));
  assert.ok(qaPlan.weeks[1].project.includes('Page Object Model'));

  // 11. False positive guard: "Algorithms" or "Django" must NOT match Go
  const algoPlan = getFallbackLearningRoadmap(['Algorithms'], 'Engineer');
  assert.ok(!algoPlan.weeks[0].resource.includes('The Go Programming Language'));

  const djangoPlan = getFallbackLearningRoadmap(['Django'], 'Python Developer');
  assert.ok(!djangoPlan.weeks[0].resource.includes('The Go Programming Language'));
});

test('SKILL_RESOURCES: contains at least 50 curated skills with valid docs and courses', () => {
  const keys = Object.keys(SKILL_RESOURCES);
  assert.ok(keys.length >= 50, `Expected at least 50 skills, found ${keys.length}`);

  for (const key of keys) {
    const entry = SKILL_RESOURCES[key];
    assert.ok(entry.skill, `Skill name missing for key: ${key}`);
    assert.ok(entry.docs && entry.docs.title && entry.docs.url.startsWith('http'), `Invalid docs for ${key}`);
    assert.ok(entry.course && entry.course.title && entry.course.url.startsWith('http'), `Invalid course for ${key}`);
    if (entry.project) {
      assert.ok(entry.project.title && entry.project.url.startsWith('http'), `Invalid project for ${key}`);
    }
  }
});

test('getSkillResources: normalizes aliases and abbreviations accurately', () => {
  assert.equal(getSkillResources('k8s').skill, 'Kubernetes');
  assert.equal(getSkillResources('Kubernetes').skill, 'Kubernetes');
  assert.equal(getSkillResources('golang').skill, 'Go');
  assert.equal(getSkillResources('TS').skill, 'TypeScript');
  assert.equal(getSkillResources('react.js').skill, 'React');
  assert.equal(getSkillResources('Postgres').skill, 'PostgreSQL');
  assert.equal(getSkillResources('non-existent-xyz'), null);
});

test('getFreeLearningPlatforms: returns hardcoded links to MDN, freeCodeCamp, CS50, and YouTube per skill category', () => {
  // 1. Frontend skill (React) -> MDN search, FCC frontend libraries, CS50W Web, YouTube crash course
  const reactFree = getFreeLearningPlatforms('React');
  assert.equal(reactFree.category, 'Frontend');
  const mdnReact = reactFree.providers.find(p => p.id === 'mdn');
  assert.ok(mdnReact.url.includes('developer.mozilla.org'));
  const fccReact = reactFree.providers.find(p => p.id === 'fcc');
  assert.ok(fccReact.url.includes('freecodecamp.org'));
  const cs50React = reactFree.providers.find(p => p.id === 'cs50');
  assert.ok(cs50React.url.includes('cs50.harvard.edu/web'));
  const ytReact = reactFree.providers.find(p => p.id === 'yt');
  assert.ok(ytReact.url.includes('youtube.com'));

  // 2. Python / Backend skill -> CS50P Python, FCC backend/data, YouTube
  const pyFree = getFreeLearningPlatforms('Python');
  assert.equal(pyFree.category, 'Backend');
  const cs50Py = pyFree.providers.find(p => p.id === 'cs50');
  assert.ok(cs50Py.url.includes('cs50.harvard.edu/python'));

  // 3. AI / ML skill (PyTorch) -> CS50AI, FCC ML with Python, YouTube
  const aiFree = getFreeLearningPlatforms('PyTorch');
  assert.equal(aiFree.category, 'Data / AI');
  const cs50Ai = aiFree.providers.find(p => p.id === 'cs50');
  assert.ok(cs50Ai.url.includes('cs50.harvard.edu/ai'));

  // 4. Cloud / DevOps skill (Kubernetes) -> CS50x systems, FCC devops, YouTube
  const k8sFree = getFreeLearningPlatforms('Kubernetes');
  assert.equal(k8sFree.category, 'DevOps / Cloud');
  const fccK8s = k8sFree.providers.find(p => p.id === 'fcc');
  assert.ok(fccK8s.url.includes('devops'));

  // 5. Testing skill (Playwright) -> MDN testing, FCC QA, CS50W, YouTube
  const testFree = getFreeLearningPlatforms('Playwright');
  assert.equal(testFree.category, 'Testing & QA');
  const fccTest = testFree.providers.find(p => p.id === 'fcc');
  assert.ok(fccTest.url.includes('quality-assurance'));
});

test('resolveSkillLearningResources: provides complete resource bundle for both top-50 and arbitrary gap skills', () => {
  // Top 50 skill
  const k8sResolved = resolveSkillLearningResources('k8s');
  assert.equal(k8sResolved.skill, 'Kubernetes');
  assert.ok(k8sResolved.platforms.length >= 4);

  // Arbitrary gap skill (e.g. SvelteKit or Elixir)
  const arbitrary = resolveSkillLearningResources('SvelteKit');
  assert.equal(arbitrary.skill, 'SvelteKit');
  assert.ok(arbitrary.docs && arbitrary.docs.url);
  assert.ok(arbitrary.course && arbitrary.course.url);
  assert.ok(arbitrary.project && arbitrary.project.url);
  assert.ok(arbitrary.platforms.length >= 4);
  assert.ok(arbitrary.platforms.some(p => p.id === 'mdn'));
  assert.ok(arbitrary.platforms.some(p => p.id === 'fcc'));
  assert.ok(arbitrary.platforms.some(p => p.id === 'cs50'));
  assert.ok(arbitrary.platforms.some(p => p.id === 'yt'));
});


