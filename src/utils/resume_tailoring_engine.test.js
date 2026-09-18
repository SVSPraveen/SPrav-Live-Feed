import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  extractJobKeywords, 
  normalizeCandidateSkills, 
  auditBulletStrength,
  tailorResumeForJob,
  tailorResumeForJobAsync
} from './resume_tailoring_engine.js';

test('extractJobKeywords: extracts keywords accurately from job text', () => {
  const job = {
    title: 'Senior Full Stack Engineer',
    description: 'Looking for a specialist in React, TypeScript, Node.js, Docker, and PostgreSQL.',
    requirements: 'Experience with AWS and Kubernetes is a plus.'
  };
  const keywords = extractJobKeywords(job);
  assert.ok(keywords.includes('react'));
  assert.ok(keywords.includes('typescript'));
  assert.ok(keywords.includes('node.js'));
  assert.ok(keywords.includes('docker'));
  assert.ok(keywords.includes('postgresql'));
  assert.ok(keywords.includes('aws'));
  assert.ok(keywords.includes('kubernetes'));
});

test('normalizeCandidateSkills: extracts flat list from diverse shapes', () => {
  assert.deepEqual(normalizeCandidateSkills(null), []);
  assert.deepEqual(normalizeCandidateSkills(['React', 'Node.js']), ['React', 'Node.js']);
  
  const categorized = {
    frontend: ['React', 'CSS'],
    backend: ['Node.js', 'Python']
  };
  const normalized = normalizeCandidateSkills(categorized);
  assert.ok(normalized.includes('React'));
  assert.ok(normalized.includes('Python'));
});

test('tailorResumeForJob: correctly formats and tailors projects section', () => {
  const kb = {
    personal: {
      name: 'Dev Explorer',
      email: 'dev@example.com',
      phone: '555-0199',
      location: 'New York, NY'
    },
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    work_history: [
      {
        company: 'Cloud Corp',
        role: 'Software Engineer',
        bullets: [
          'Built internal tooling saving 20 hours per week for 50 engineers.',
          'Maintained legacy system.'
        ]
      }
    ],
    projects: [
      {
        name: 'SPrav Job AI',
        tech: 'React, Node.js, WebGPU',
        url: 'https://github.com/example/sprav',
        bullets: [
          'Engineered client-side WebGPU copilot boosting user retention by 35%.',
          'Configured Docker deployment pipeline.'
        ]
      },
      {
        name: 'QuickNotes',
        tech_stack: 'Python, SQLite',
        description: 'Lightweight offline notebook app for local thoughts.',
        bullets: []
      }
    ]
  };

  const targetJob = {
    title: 'Frontend React Engineer',
    description: 'We are seeking an expert in React, WebGPU, and modern frontend tools.'
  };

  const tailored = tailorResumeForJob(kb, targetJob);

  assert.equal(tailored.candidate.name, 'Dev Explorer');
  assert.ok(tailored.projects.length === 2);

  // Project 1
  const p1 = tailored.projects[0];
  assert.equal(p1.name, 'SPrav Job AI');
  assert.equal(p1.tech, 'React, Node.js, WebGPU');
  assert.equal(p1.tech_stack, 'React, Node.js, WebGPU');
  assert.equal(p1.url, 'https://github.com/example/sprav');
  assert.ok(p1.bullets.length === 2);
  // React / WebGPU bullet should be prioritized first due to job keyword relevance
  assert.ok(p1.bullets[0].includes('WebGPU'));

  // Project 2 (no bullets, uses description)
  const p2 = tailored.projects[1];
  assert.equal(p2.name, 'QuickNotes');
  assert.equal(p2.tech, 'Python, SQLite');
  assert.equal(p2.description, 'Lightweight offline notebook app for local thoughts.');

  // Optimization diagnosis assertions
  assert.ok(Array.isArray(tailored.suggested_optimizations));
  assert.ok(Array.isArray(tailored.work_history[0].suggested_optimization_indices));
  assert.equal(typeof tailored.work_history[0].bullets[0], 'string');
});

test('tailorResumeForJobAsync: contextually rewrites bullets while preserving numbers and returning diffs', async () => {
  const kb = {
    personal: { name: 'Dev Explorer', email: 'dev@example.com' },
    skills: ['Python', 'FastAPI', 'Redis'],
    work_history: [
      {
        company: 'Cloud Corp',
        role: 'Backend Engineer',
        bullets: [
          'helped with backend APIs and improved latency by 35%',
          'maintained legacy databases'
        ]
      }
    ]
  };

  const targetJob = {
    title: 'Senior Distributed Systems Engineer',
    company: 'Fintech Inc',
    description: 'Looking for a FastAPI and Redis caching engineer.'
  };

  const result = await tailorResumeForJobAsync(kb, targetJob, { aiRewrite: true, maxAiRewrites: 2 });
  assert.equal(result.candidate.name, 'Dev Explorer');
  assert.ok(Array.isArray(result.diffs));
  assert.ok(result.diffs.length > 0);

  const firstDiff = result.diffs[0];
  assert.equal(firstDiff.company, 'Cloud Corp');
  assert.equal(firstDiff.original, 'helped with backend APIs and improved latency by 35%');
  assert.ok(firstDiff.rewritten.includes('35%'), 'Must preserve the 35% metric');
  assert.ok(firstDiff.preservedMetrics.includes('35%'));
  assert.equal(firstDiff.status, 'applied');
  assert.equal(result.work_history[0].bullets[0], firstDiff.rewritten);
});

test('tailorResumeForJob: eliminates substring bug (Java does not match JavaScript, K8s matches Kubernetes)', () => {
  const kb = {
    personal: { name: 'Alex Specialist', email: 'alex@example.com' },
    skills: ['Java', 'K8s', 'Python'],
    work_history: []
  };

  const targetJob = {
    title: 'Frontend JavaScript & Kubernetes Platform Engineer',
    description: 'We need JavaScript, TypeScript, and Kubernetes specialists.'
  };

  const tailored = tailorResumeForJob(kb, targetJob);

  // "Java" must NOT be matched to "JavaScript"
  assert.ok(!tailored.matched_skills.includes('Java'), 'Java must not match JavaScript');
  assert.ok(tailored.other_skills.includes('Java'), 'Java should remain in other_skills');

  // "K8s" MUST be matched to "Kubernetes" via canonical synonym resolution
  assert.ok(tailored.matched_skills.includes('K8s'), 'K8s must match Kubernetes via synonym mapping');
});

test('extractJobKeywords: extracts keywords across Embedded/IoT, Cyber, QA, and Blockchain', () => {
  const embeddedJob = {
    title: 'Senior Firmware Engineer',
    description: 'Developing RTOS applications on STM32 microcontrollers using BLE, I2C, SPI, and CAN bus.'
  };
  const embeddedKws = extractJobKeywords(embeddedJob);
  assert.ok(embeddedKws.includes('firmware'));
  assert.ok(embeddedKws.includes('rtos'));
  assert.ok(embeddedKws.includes('stm32'));
  assert.ok(embeddedKws.includes('ble'));
  assert.ok(embeddedKws.includes('can bus'));

  const cyberJob = {
    title: 'Information Security Engineer',
    description: 'Focus on SIEM, SOC operations, Penetration Testing, OWASP Top 10, and Zero Trust architectures.'
  };
  const cyberKws = extractJobKeywords(cyberJob);
  assert.ok(cyberKws.includes('siem'));
  assert.ok(cyberKws.includes('soc'));
  assert.ok(cyberKws.includes('penetration testing'));
  assert.ok(cyberKws.includes('owasp'));
  assert.ok(cyberKws.includes('zero trust'));

  const qaJob = {
    title: 'Lead SDET & QA Automation Engineer',
    description: 'Build test automation frameworks with Playwright, Selenium, and Cucumber BDD.'
  };
  const qaKws = extractJobKeywords(qaJob);
  assert.ok(qaKws.includes('qa'));
  assert.ok(qaKws.includes('sdet'));
  assert.ok(qaKws.includes('test automation'));
  assert.ok(qaKws.includes('playwright'));
  assert.ok(qaKws.includes('selenium'));
  assert.ok(qaKws.includes('cucumber'));

  const web3Job = {
    title: 'Web3 Core Developer',
    description: 'Building Solidity smart contracts for Ethereum and EVM layer 2 rollups with Hardhat.'
  };
  const web3Kws = extractJobKeywords(web3Job);
  assert.ok(web3Kws.includes('web3'));
  assert.ok(web3Kws.includes('solidity'));
  assert.ok(web3Kws.includes('ethereum'));
  assert.ok(web3Kws.includes('smart contracts'));
  assert.ok(web3Kws.includes('hardhat'));
});

test('auditBulletStrength: diagnoses passive verbs, missing metrics, and job keyword fit', () => {
  const weak1 = auditBulletStrength('Responsible for writing code and attending meetings.');
  assert.equal(weak1.isWeak, true);
  assert.equal(weak1.hasPassiveVerb, true);
  assert.equal(weak1.lacksMetrics, true);
  assert.ok(weak1.reasons.length >= 2);

  const weak2 = auditBulletStrength('Helped with database schema migrations.');
  assert.equal(weak2.isWeak, true);
  assert.equal(weak2.hasPassiveVerb, true);
  assert.equal(weak2.passiveVerb.toLowerCase(), 'helped with');

  const strong = auditBulletStrength('Architected real-time streaming pipeline reducing p99 latency by 45% for 1.2M daily active users.');
  assert.equal(strong.isWeak, false);
  assert.equal(strong.hasPassiveVerb, false);
  assert.equal(strong.lacksMetrics, false);
  assert.equal(strong.reasons.length, 0);
});

test('tailorResumeForJobAsync: supports project bullet rewrites with metric preservation', async () => {
  const kb = {
    personal: { name: 'Jordan Dev', email: 'jordan@example.com' },
    skills: ['Rust', 'PostgreSQL'],
    work_history: [],
    projects: [
      {
        name: 'SPrav Storage Engine',
        tech: 'Rust, RocksDB',
        bullets: [
          'helped with file storage indexing and cut disk usage by 40%'
        ]
      }
    ]
  };

  const targetJob = {
    title: 'Systems Infrastructure Engineer',
    description: 'Looking for a systems engineer with Rust and storage experience.'
  };

  const result = await tailorResumeForJobAsync(kb, targetJob, { aiRewrite: true, maxAiRewrites: 2 });
  assert.ok(result.projects.length > 0);
  assert.ok(result.diffs.length > 0);

  const projDiff = result.diffs.find(d => d.type === 'project');
  assert.ok(projDiff, 'Should have recorded a project diff');
  assert.equal(projDiff.projectName, 'SPrav Storage Engine');
  assert.ok(projDiff.rewritten.includes('40%'), 'Must preserve the 40% metric');
  assert.equal(result.projects[0].bullets[0], projDiff.rewritten);
});


