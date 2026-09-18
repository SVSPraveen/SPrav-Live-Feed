import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  AgenticWorkflowEngine, 
  estimateTokenCount, 
  enforceTokenBudget,
  stripJdPreamble,
  WORKFLOW_STEPS 
} from './agentic_workflow_engine.js';

test('estimateTokenCount calculates reasonable token count', () => {
  assert.equal(estimateTokenCount(''), 0);
  assert.equal(estimateTokenCount(null), 0);
  const text = 'This is a test sentence with eight words.';
  const tokens = estimateTokenCount(text);
  assert.ok(tokens > 5 && tokens < 20);
});

test('estimateTokenCount accurately models non-English scripts (Hindi, CJK, Arabic)', () => {
  // Hindi (Devanagari) text
  const hindi = 'मुझे सॉफ्टवेयर इंजीनियर की नौकरी चाहिए और मेरा अनुभव पांच साल का है।';
  const hindiTokens = estimateTokenCount(hindi);
  // Devanagari should not be undercounted by 3.8 divisor
  assert.ok(hindiTokens >= hindi.length * 0.9, `Expected Hindi tokens (${hindiTokens}) to reflect Indic density`);

  // Japanese / CJK text
  const cjk = 'フルスタックソフトウェアエンジニアの経験があります。マイクロサービスアーキテクチャの設計を行いました。';
  const cjkTokens = estimateTokenCount(cjk);
  assert.ok(cjkTokens >= cjk.length * 1.1, `Expected CJK tokens (${cjkTokens}) to reflect CJK character token density`);

  // Arabic text
  const arabic = 'مهندس برمجيات أول مع خبرة في الحوسبة السحابية';
  const arabicTokens = estimateTokenCount(arabic);
  assert.ok(arabicTokens >= arabic.length * 0.8, `Expected Arabic tokens (${arabicTokens}) to reflect RTL density`);
});

test('enforceTokenBudget truncates long text accurately', () => {
  const shortText = 'Short prompt';
  assert.equal(enforceTokenBudget(shortText, 50), shortText);

  const longText = 'Word '.repeat(500);
  const truncated = enforceTokenBudget(longText, 50);
  assert.ok(truncated.includes('[truncated for token budget]'));
  assert.ok(truncated.length < longText.length);
  assert.ok(estimateTokenCount(truncated) <= 60);
});

test('enforceTokenBudget safely truncates non-English and mixed scripts within budget', () => {
  const longHindi = 'हम उत्कृष्ट स्केलेबल और सुरक्षित वितरित सिस्टम बनाते हैं। '.repeat(50);
  const truncatedHindi = enforceTokenBudget(longHindi, 40);
  assert.ok(truncatedHindi.includes('[truncated for token budget]'));
  assert.ok(estimateTokenCount(truncatedHindi) <= 50, 'Truncated Hindi must strictly respect token ceiling');

  const longCjk = 'クラウドネイティブなマイクロサービスと分散データベースの設計開発。 '.repeat(50);
  const truncatedCjk = enforceTokenBudget(longCjk, 35);
  assert.ok(truncatedCjk.includes('[truncated for token budget]'));
  assert.ok(estimateTokenCount(truncatedCjk) <= 45, 'Truncated CJK must strictly respect token ceiling');
});

test('AgenticWorkflowEngine: groundTruthAuditNode accurately audits skills deterministically', async () => {
  const engine = new AgenticWorkflowEngine();
  const state = {
    jobDescription: 'Looking for React, TypeScript, and Kubernetes expert.',
    candidateProfile: {
      skills: {
        frontend: ['React', 'TypeScript'],
        cloud: ['Docker']
      }
    },
    requirements: {
      mustHaveSkills: ['React', 'TypeScript', 'Kubernetes'],
      goodToHaveSkills: ['Docker', 'AWS']
    }
  };

  const nextState = await engine.groundTruthAuditNode(state);
  assert.ok(nextState.analysis);
  assert.ok(nextState.analysis.matchedSkills.includes('React'));
  assert.ok(nextState.analysis.matchedSkills.includes('TypeScript'));
  assert.ok(nextState.analysis.matchedSkills.includes('Docker'));
  assert.ok(nextState.analysis.missingSkills.includes('Kubernetes'));
  assert.ok(nextState.analysis.missingSkills.includes('AWS'));
  assert.equal(nextState.analysis.atsScore, 60); // 3 matched out of 5 total = 60%
});

test('AgenticWorkflowEngine: criticReflectionNode reverts hallucinated metrics', async () => {
  const engine = new AgenticWorkflowEngine();
  const state = {
    tailoredBullets: [
      {
        original: 'Built React component for user settings.',
        tailored: 'Engineered React component, increasing throughput by 850% across 20 AWS clusters.' // Fabricated metrics & AWS
      },
      {
        original: 'Designed REST API endpoints using Express.',
        tailored: 'Architected scalable REST API endpoints using Express.' // Safe action verb enhancement
      }
    ]
  };

  const nextState = await engine.criticReflectionNode(state);
  assert.ok(nextState.criticAudit);
  assert.equal(nextState.tailoredBullets.length, 2);

  // First bullet should be reverted to original
  assert.equal(nextState.tailoredBullets[0].tailored, 'Built React component for user settings.');
  assert.ok(nextState.tailoredBullets[0].badge.includes('Reverted to Original Metric'));

  // Second bullet should be verified
  assert.equal(nextState.tailoredBullets[1].tailored, 'Architected scalable REST API endpoints using Express.');
  assert.equal(nextState.tailoredBullets[1].badge, 'Anti-Hallucination Verified');
});

test('AgenticWorkflowEngine: tailorSingleBullet runs micro-prompting and verifies output', async () => {
  const engine = new AgenticWorkflowEngine();
  const res = await engine.tailorSingleBullet(
    'Built React component for user profile management.',
    'Looking for senior React engineer to build high-performance components.'
  );

  assert.ok(res.bullet);
  assert.equal(typeof res.isClean, 'boolean');
  assert.ok(Array.isArray(res.warnings));
});

test('stripJdPreamble: strips company boilerplate while preserving substantive role requirements', () => {
  const jdWithBoilerplate = `About Us:
We are an innovative, fast-growing AI startup headquartered in San Francisco.
Our mission is to empower developers worldwide with modern tools.

### Responsibilities
- Architect scalable microservices in Node.js and Go
- Manage PostgreSQL databases and Redis caching layers
- Partner with product teams on high-throughput features

### Requirements
- 4+ years backend software engineering experience
- Strong background in Kubernetes and AWS`;

  const stripped = stripJdPreamble(jdWithBoilerplate);
  assert.ok(!stripped.includes('About Us:'));
  assert.ok(!stripped.includes('fast-growing AI startup'));
  assert.ok(stripped.startsWith('### Responsibilities'));
  assert.ok(stripped.includes('Architect scalable microservices'));
  assert.ok(stripped.includes('Requirements'));
});

test('stripJdPreamble: handles clean JDs without preamble safely', () => {
  const clean = 'Requirements:\n- 3+ years React experience\n- TypeScript proficiency';
  assert.equal(stripJdPreamble(clean), clean);
  assert.equal(stripJdPreamble(''), '');
  assert.equal(stripJdPreamble(null), '');
});

