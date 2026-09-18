import test from 'node:test';
import assert from 'node:assert/strict';
import { hybridLLM, computeDeterministicAtsFit } from './hybrid_llm_client.js';
import { SAMPLING_PROFILES } from './webgpu_tasks.js';

test('hybridLLM: initial state and subscription lifecycle', () => {
  assert.equal(hybridLLM.isInitializing, false);
  const state = hybridLLM.getLoadingState();
  assert.equal(typeof state.isInitializing, 'boolean');
  assert.equal(state.isInitializing, false);
  assert.equal(typeof state.progress, 'number');

  let receivedUpdate = null;
  const unsubscribe = hybridLLM.subscribe((update) => {
    receivedUpdate = update;
  });

  hybridLLM._notify({ status: 'test_event', testVal: 123 });
  assert.deepEqual(receivedUpdate, { status: 'test_event', testVal: 123 });

  // Unsubscribe and verify no more events received
  unsubscribe();
  hybridLLM._notify({ status: 'test_event_2' });
  assert.equal(receivedUpdate.status, 'test_event');
});

test('hybridLLM: engine lifecycle isReady, getActiveModel, and cached init', async () => {
  assert.equal(hybridLLM.isReady(), false);
  assert.equal(hybridLLM.getActiveModel(), null);

  // When engine is null but activeModel matches, must NOT return null (must try to init)
  hybridLLM.engine = null;
  hybridLLM.activeModel = 'test-model-q4';
  try {
    await hybridLLM.initWebGPU('test-model-q4');
  } catch (e) {
    // Expected in Node test env without Worker
  }
  hybridLLM.activeModel = null;

  const mockEngine = { mock: true };
  hybridLLM.engine = mockEngine;
  hybridLLM.activeModel = 'test-model-q4';

  assert.equal(hybridLLM.isReady(), true);
  assert.equal(hybridLLM.getActiveModel(), 'test-model-q4');

  // Verify that initWebGPU returns existing instance when already loaded
  const existing = await hybridLLM.initWebGPU('test-model-q4');
  assert.strictEqual(existing, mockEngine);

  hybridLLM.engine = null;
  hybridLLM.activeModel = null;
});

test('hybridLLM: checkOllamaReachable handles online, 60s cache, and offline scenarios', async () => {
  const originalFetch = globalThis.fetch;

  // 1. Online scenario
  globalThis.fetch = async (url) => {
    if (url.includes(':11434')) {
      return { ok: true, json: async () => ({ models: [] }) };
    }
    return { ok: false };
  };
  const isOnline = await hybridLLM.checkOllamaReachable(true);
  assert.equal(isOnline, true);

  // 2. In-memory 60s cache verification: even if fetch throws, cached response is returned
  globalThis.fetch = async () => { throw new Error('Offline'); };
  const cachedOnline = await hybridLLM.checkOllamaReachable(false);
  assert.equal(cachedOnline, true);

  // 3. Offline / network error scenario with forceRefresh = true
  const isOffline = await hybridLLM.checkOllamaReachable(true);
  assert.equal(isOffline, false);

  globalThis.fetch = originalFetch;
});

test('hybridLLM: checkOllamaReachable prioritizes Qwen 2.5 Coder 3B and 1.5B variants when 7B is absent', async () => {
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    if (url.includes(':11434/api/tags')) {
      return {
        ok: true,
        clone: () => ({
          json: async () => ({
            models: [
              { name: 'llama3.1:8b' },
              { name: 'qwen2.5-coder:3b-instruct' },
              { name: 'mistral:latest' }
            ]
          })
        })
      };
    }
    return { ok: false };
  };

  const reachable = await hybridLLM.checkOllamaReachable(true);
  assert.equal(reachable, true);
  assert.equal(hybridLLM._cachedOllamaModel, 'qwen2.5-coder:3b-instruct');

  globalThis.fetch = originalFetch;
});

test('hybridLLM: analyzeAtsFit dispatches to WebGPU when engine is ready', async () => {
  const originalEngine = hybridLLM.engine;
  const originalModel = hybridLLM.activeModel;

  // Mock WebGPU engine
  hybridLLM.engine = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{
            message: {
              content: JSON.stringify({
                matching_skills: ['Python', 'Docker'],
                missing_skills: ['Kubernetes'],
                ats_score: 82,
                strategic_advice: 'Add Kubernetes projects to resume.'
              })
            }
          }]
        })
      }
    }
  };
  hybridLLM.activeModel = 'qwen2.5-coder-7b';

  const result = await hybridLLM.analyzeAtsFit({ skills: ['Python'] }, 'Job req: Docker, K8s');
  assert.equal(result.source, 'WebGPU (Local VRAM)');
  assert.equal(result.data.ats_score, 82);
  assert.deepEqual(result.data.matching_skills, ['Python', 'Docker']);

  hybridLLM.engine = originalEngine;
  hybridLLM.activeModel = originalModel;
});

test('hybridLLM: analyzeAtsFit falls back to Ollama and verifies stream false', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;

  hybridLLM.engine = null; // WebGPU not loaded

  globalThis.fetch = async (url, options) => {
    if (url.includes(':11434')) {
      const body = JSON.parse(options.body);
      if (body.stream !== false) {
        throw new Error('Mutation caught: stream must be false');
      }
      return {
        ok: true,
        json: async () => ({
          response: JSON.stringify({
            matching_skills: ['Python'],
            missing_skills: ['AWS'],
            ats_score: 70,
            strategic_advice: 'Highlight cloud experience.'
          })
        })
      };
    }
    return { ok: false };
  };

  const result = await hybridLLM.analyzeAtsFit({ skills: ['Python'] }, 'Job req: AWS');
  assert.equal(result.source, 'Localhost Ollama');
  assert.equal(result.data.ats_score, 70);

  hybridLLM.engine = originalEngine;
  globalThis.fetch = originalFetch;
});

test('hybridLLM: draftApplicationNote via WebGPU, Ollama stream check, and fallback', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;

  // 1. WebGPU path
  hybridLLM.engine = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'I engineered high throughput pipelines at scale.' } }]
        })
      }
    }
  };
  const note1 = await hybridLLM.draftApplicationNote('Senior Dev', 'Google', 'FastAPI');
  assert.equal(note1.source, 'WebGPU (Local VRAM)');
  assert.match(note1.text, /high throughput/);

  // 2. Ollama path with strict stream=false verification
  hybridLLM.engine = null;
  globalThis.fetch = async (url, options) => {
    if (url.includes(':11434')) {
      const body = JSON.parse(options.body);
      if (body.stream !== false) {
        throw new Error('Mutation caught: stream must be false');
      }
      return {
        ok: true,
        json: async () => ({ response: 'Led data platform architecture at Stripe.' })
      };
    }
    return { ok: false };
  };

  const note2 = await hybridLLM.draftApplicationNote('Data Architect', 'Stripe', 'Big Data');
  assert.equal(note2.source, 'Localhost Ollama');
  assert.match(note2.text, /Stripe/);

  // 3. Complete fallback
  globalThis.fetch = async () => { throw new Error('Offline'); };
  const note3 = await hybridLLM.draftApplicationNote('DevOps', 'Meta', 'K8s');
  assert.equal(note3.source, 'Template Fallback');
  assert.match(note3.text, /Meta/);

  hybridLLM.engine = originalEngine;
  globalThis.fetch = originalFetch;
});

test('hybridLLM: draftCoverLetter via WebGPU, Ollama, and fallback', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;

  // 1. WebGPU path
  hybridLLM.engine = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{ message: { content: 'Paragraph 1\n\nParagraph 2\n\nParagraph 3\n\nParagraph 4' } }]
        })
      }
    }
  };
  const letter1 = await hybridLLM.draftCoverLetter('Staff SRE', 'Netflix', 'Lead SRE', 'Chaos engineering');
  assert.equal(letter1.source, 'WebGPU (Local VRAM)');
  assert.match(letter1.text, /Paragraph 1/);

  // 2. Fallback path
  hybridLLM.engine = null;
  globalThis.fetch = async () => { throw new Error('Offline'); };
  const letter2 = await hybridLLM.draftCoverLetter('Staff SRE', 'Netflix', 'Lead SRE', 'Chaos engineering');
  assert.equal(letter2.source, 'Template Fallback');
  assert.match(letter2.text, /Netflix/);
  assert.match(letter2.text, /Lead SRE/);
  assert.equal(letter2.text.split('\n\n').length, 4);

  hybridLLM.engine = originalEngine;
  globalThis.fetch = originalFetch;
});

test('hybridLLM: optimizeBullet handles Ollama stream check and fallback', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;

  // WebGPU returns empty string => fallback to original bullet
  hybridLLM.engine = {
    chat: {
      completions: {
        create: async () => ({ choices: [{ message: { content: '' } }] })
      }
    }
  };
  const bulletFallback = 'Refactored backend pipeline.';
  const webgpuRes = await hybridLLM.optimizeBullet(bulletFallback, 'Go backend');
  assert.equal(webgpuRes.source, 'WebGPU (Local VRAM)');
  assert.equal(webgpuRes.bullet, bulletFallback);

  hybridLLM.engine = null;

  globalThis.fetch = async (url, options) => {
    if (url.includes(':11434')) {
      const body = JSON.parse(options.body);
      if (body.stream !== false) {
        throw new Error('Mutation caught: stream must be false');
      }
      return {
        ok: true,
        json: async () => ({ response: 'Architected distributed caching layer that slashed latency by 45%.' })
      };
    }
    return { ok: false };
  };

  const bullet1 = 'Engineered distributed caching layer reducing latency by 40%.';
  const res1 = await hybridLLM.optimizeBullet(bullet1, 'High throughput caching');
  assert.equal(res1.source, 'Localhost Ollama');
  assert.match(res1.bullet, /latency by 45%/);

  // 2. Offline fallback
  globalThis.fetch = async () => { throw new Error('Offline'); };
  const res2 = await hybridLLM.optimizeBullet(bullet1, 'High throughput caching');
  assert.equal(res2.source, 'Original');
  assert.equal(res2.bullet, bullet1);

  hybridLLM.engine = originalEngine;
  globalThis.fetch = originalFetch;
});

test('hybridLLM: backend engine tier 3 fallback and null handling', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;
  const originalKeys = hybridLLM.cloudKeys;

  hybridLLM.engine = null; // WebGPU offline
  hybridLLM.cloudKeys = {};

  try {
    globalThis.fetch = async (url, options) => {
      if (url.includes(':11434')) {
        throw new Error('Ollama offline');
      }
      if (url.includes('/api/llm/generate')) {
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            response: JSON.stringify({
              matching_skills: ['TypeScript', 'Node.js'],
              missing_skills: [],
              ats_score: 92,
              strategic_advice: 'Strong match.'
            })
          })
        };
      }
      return { ok: false };
    };

    const result = await hybridLLM.analyzeAtsFit({ skills: ['TypeScript'] }, 'Node role requiring Python, Go, and AWS');
    assert.equal(result.source, 'Backend Engine (Cloud/Local)');
    assert.equal(result.data.ats_score, 92);

    // Test callBackendLLM returns null on failure
    globalThis.fetch = async () => ({ ok: false, status: 500 });
    const failedBackend = await hybridLLM.callBackendLLM('Test prompt');
    assert.strictEqual(failedBackend, null);
  } finally {
    hybridLLM.engine = originalEngine;
    globalThis.fetch = originalFetch;
    hybridLLM.cloudKeys = originalKeys;
  }
});

test('hybridLLM: answerScreeningQuestion across WebGPU, Ollama stream check, backend, and heuristic', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;
  const originalKeys = hybridLLM.cloudKeys;
  hybridLLM.cloudKeys = {};

  try {
    // 1. WebGPU path
    hybridLLM.engine = {
      chat: {
        completions: {
          create: async () => ({
            choices: [{ message: { content: '$150,000 / year' } }]
          })
        }
      }
    };

    const ans1 = await hybridLLM.answerScreeningQuestion('What is your desired salary?', { salary: '$150,000' }, 'salary');
    assert.equal(ans1.source, 'WebGPU (Local VRAM)');
    assert.equal(ans1.answer, '$150,000 / year');

    // 2. Ollama path with stream=false check
    hybridLLM.engine = null;
    globalThis.fetch = async (url, options) => {
      if (url.includes(':11434')) {
        const body = JSON.parse(options.body);
        if (body.stream !== false) {
          throw new Error('Mutation caught: stream must be false');
        }
        return { ok: true, json: async () => ({ response: 'Authorized to work without sponsorship.' }) };
      }
      return { ok: false };
    };

    const ans2 = await hybridLLM.answerScreeningQuestion('Work authorization?', { visa: 'Citizen' }, 'sponsorship');
    assert.equal(ans2.source, 'Localhost Ollama');
    assert.match(ans2.answer, /sponsorship/);

    // 3. Backend Engine path
    globalThis.fetch = async (url) => {
      if (url.includes(':11434')) throw new Error('Offline');
      if (url.includes('/api/llm/generate')) {
        return { ok: true, json: async () => ({ response: 'Generated from cloud API.' }) };
      }
      return { ok: false };
    };

    const ans3 = await hybridLLM.answerScreeningQuestion('Experience with Go?', { skills: ['Go'] });
    assert.equal(ans3.source, 'Backend Engine (Cloud/Local)');
    assert.equal(ans3.answer, 'Generated from cloud API.');

    // 4. Heuristic Fallback path
    globalThis.fetch = async () => { throw new Error('Offline'); };
    const ans4 = await hybridLLM.answerScreeningQuestion('Why do you want to work here?', { fit: 'Strong technical match' }, 'fit');
    assert.equal(ans4.source, 'Profile Heuristic');
    assert.equal(ans4.answer, 'Strong technical match');

    const ansDefault = await hybridLLM.answerScreeningQuestion('Sponsorship?', {}, 'unknown');
    assert.equal(ansDefault.source, 'Profile Heuristic');
    assert.equal(ansDefault.answer, 'Authorized to work without sponsorship');
  } finally {
    hybridLLM.engine = originalEngine;
    globalThis.fetch = originalFetch;
    hybridLLM.cloudKeys = originalKeys;
  }
});

test('hybridLLM: unloadModel resets engine and activeModel cleanly', async () => {
  hybridLLM.engine = { unload: async () => {} };
  hybridLLM.activeModel = 'qwen2.5-coder-7b';

  await hybridLLM.unloadModel();
  assert.equal(hybridLLM.engine, null);
  assert.equal(hybridLLM.activeModel, null);
});

test('hybridLLM: analyzeAtsFit caches result in sessionStorage and serves subsequent calls instantly', async () => {
  const originalEngine = hybridLLM.engine;
  const originalSession = globalThis.sessionStorage;
  const originalKeys = hybridLLM.cloudKeys;
  hybridLLM.cloudKeys = {};

  try {
    // Polyfill sessionStorage for test
    const store = new Map();
    globalThis.sessionStorage = {
      getItem: (k) => store.get(k) || null,
      setItem: (k, v) => store.set(k, String(v)),
      removeItem: (k) => store.delete(k),
      clear: () => store.clear()
    };

    let modelCallCount = 0;
    hybridLLM.engine = {
      chat: {
        completions: {
          create: async () => {
            modelCallCount++;
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    matching_skills: ['Go', 'Docker'],
                    missing_skills: [],
                    ats_score: 95,
                    strategic_advice: 'Strong match'
                  })
                }
              }]
            };
          }
        }
      }
    };

    const profile = { personal: { name: 'Cache Tester' }, skills: ['Go'] };
    const jd = 'Looking for Go and Docker engineer';

    // First call computes via WebGPU and caches
    const first = await hybridLLM.analyzeAtsFit(profile, jd);
    assert.equal(first.source, 'WebGPU (Local VRAM)');
    assert.equal(modelCallCount, 1);

    // Second call with same profile & JD returns instantly from session cache
    const second = await hybridLLM.analyzeAtsFit(profile, jd);
    assert.equal(second.source, 'Session Cache (Instant)');
    assert.equal(second.data.ats_score, 95);
    assert.equal(modelCallCount, 1); // No new model inference needed!
  } finally {
    hybridLLM.engine = originalEngine;
    globalThis.sessionStorage = originalSession;
    hybridLLM.cloudKeys = originalKeys;
  }
});

test('hybridLLM: analyzeAtsFit enforces token budget cap on extra long JDs', async () => {
  const originalEngine = hybridLLM.engine;
  const originalKeys = hybridLLM.cloudKeys;
  hybridLLM.cloudKeys = {};
  let receivedPrompt = '';

  try {
    hybridLLM.engine = {
      chat: {
        completions: {
          create: async (payload) => {
            receivedPrompt = payload.messages.find(m => m.role === 'user')?.content || payload.messages[0].content;
            return {
              choices: [{
                message: {
                  content: JSON.stringify({
                    matching_skills: ['React'],
                    missing_skills: [],
                    ats_score: 80,
                    strategic_advice: 'Good'
                  })
                }
              }]
            };
          }
        }
      }
    };

    // Construct JD that exceeds 2500 characters
    const longJd = 'MUST HAVE: React, TypeScript, Node.js.\n' + 'A'.repeat(3000);
    await hybridLLM.analyzeAtsFit({ skills: ['React'] }, longJd);

    // Prompt must have truncated the JD to first 1500 chars and stayed well under budget (< 2800)
    assert.ok(receivedPrompt.length < 2800, `Expected prompt length < 2800, got ${receivedPrompt.length}`);
    assert.ok(receivedPrompt.includes('Missing Skill Gap:'));
  } finally {
    hybridLLM.engine = originalEngine;
    hybridLLM.cloudKeys = originalKeys;
  }
});

test('hybridLLM: generateChat streams chunks when onChunk callback is provided', async () => {
  const originalEngine = hybridLLM.engine;
  const chunksReceived = [];

  hybridLLM.engine = {
    chat: {
      completions: {
        create: async function* () {
          yield { choices: [{ delta: { content: 'Hello ' } }] };
          yield { choices: [{ delta: { content: 'from ' } }] };
          yield { choices: [{ delta: { content: 'WebGPU' } }] };
        }
      }
    }
  };

  const fullText = await hybridLLM.generateChat(
    [{ role: 'user', content: 'Say hello' }],
    'System prompt',
    (delta, accumulated) => {
      chunksReceived.push({ delta, accumulated });
    }
  );

  assert.equal(fullText, 'Hello from WebGPU');
  assert.equal(chunksReceived.length, 3);
  assert.equal(chunksReceived[2].accumulated, 'Hello from WebGPU');

  hybridLLM.engine = originalEngine;
});

test('hybridLLM: runAnalysisPipeline executes 3-node sequence and invokes step notifications', async () => {
  const originalEngine = hybridLLM.engine;
  const originalFetch = globalThis.fetch;
  const originalKeys = hybridLLM.cloudKeys;
  const stepsTracked = [];

  // Offline / Heuristic fallback execution
  hybridLLM.engine = null;
  hybridLLM.cloudKeys = {};
  globalThis.fetch = async () => { throw new Error('Offline'); };

  try {
    const result = await hybridLLM.runAnalysisPipeline(
      'Senior Distributed Systems Engineer. Requirements: 6+ years experience with Go, Kubernetes, and Kafka.',
      { skills: ['Go', 'Docker'] },
      (event) => {
        stepsTracked.push(event);
      }
    );

    assert.ok(result.node1_jd, 'Node 1 JD extractor output must exist');
    assert.equal(result.node1_jd.level, 'senior');
    assert.ok(result.node1_jd.must_have_skills.includes('go'));

    assert.ok(result.node2_gaps, 'Node 2 gap output must exist');
    assert.ok(result.node2_gaps.strengths.some(s => s.toLowerCase() === 'go'));
    assert.ok(result.node2_gaps.gaps.some(s => s.toLowerCase() === 'kubernetes' || s.toLowerCase() === 'kafka'));

    assert.ok(result.node3_action, 'Node 3 action output must exist');
    assert.match(result.node3_action, /quantified work bullet/i);

    // Verify step updates were fired for steps 1, 2, and 3
    const stepNums = stepsTracked.map(s => s.step);
    assert.ok(stepNums.includes(1));
    assert.ok(stepNums.includes(2));
    assert.ok(stepNums.includes(3));
  } finally {
    hybridLLM.engine = originalEngine;
    globalThis.fetch = originalFetch;
    hybridLLM.cloudKeys = originalKeys;
  }
});

test('hybridLLM: callWithSelfCorrection heals invalid JSON using automated reflection prompt', async () => {
  const originalEngine = hybridLLM.engine;

  hybridLLM.engine = {
    chat: {
      completions: {
        create: async () => ({
          choices: [{
            message: {
              content: '{"valid": true}'
            }
          }]
        })
      }
    }
  };

  const healed = await hybridLLM.callWithSelfCorrection(
    async () => 'Bad JSON output',
    (parsed) => parsed && parsed.valid === true,
    1
  );

  assert.ok(healed && healed.valid === true, 'Should successfully heal and validate JSON');

  hybridLLM.engine = originalEngine;
});

test('computeDeterministicAtsFit: computes accurate overlap and non-polluting missing skills', () => {
  const profile = {
    name: 'Morgan',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL']
  };
  const jd = 'Looking for a Senior React and TypeScript developer with experience in AWS and Docker microservices.';

  const result = computeDeterministicAtsFit(profile, jd);

  assert.ok(result.matching_skills.includes('React'));
  assert.ok(result.matching_skills.includes('TypeScript'));
  assert.ok(result.missing_skills.includes('AWS') || result.missing_skills.includes('Docker'));
  assert.ok(result.ats_score >= 40 && result.ats_score <= 90);
  assert.match(result.strategic_advice, /Matches detected in/);
});

test('hybridLLM: hasConfiguredCloudKey detects active keys correctly', async () => {
  const origKeys = hybridLLM.cloudKeys ? { ...hybridLLM.cloudKeys } : {};
  try {
    hybridLLM.cloudKeys = {};
    assert.equal(await hybridLLM.hasConfiguredCloudKey(), false);

    hybridLLM.setCloudCredential('groq', 'gsk_mock_valid_key');
    assert.equal(await hybridLLM.hasConfiguredCloudKey(), true);
  } finally {
    hybridLLM.cloudKeys = origKeys;
  }
});

test('hybridLLM: taskType essay routes to configured cloud provider', async () => {
  const origKeys = hybridLLM.cloudKeys ? { ...hybridLLM.cloudKeys } : {};
  const origCall = hybridLLM.callClientCloudLLM;

  try {
    hybridLLM.setCloudCredential('groq', 'gsk_test_key');
    let cloudCalled = false;
    hybridLLM.callClientCloudLLM = async () => {
      cloudCalled = true;
      return 'Authentic, concise pitch note crafted for target company.';
    };

    const noteRes = await hybridLLM.draftApplicationNote('Experienced Lead', 'Acme Corp', 'Node, AWS', { taskType: 'essay' });
    assert.equal(cloudCalled, true);
    assert.equal(noteRes.source, 'In-Browser Cloud LLM (BYOK)');
    assert.match(noteRes.text, /Authentic, concise pitch note/);
  } finally {
    hybridLLM.cloudKeys = origKeys;
    hybridLLM.callClientCloudLLM = origCall;
  }
});

test('hybridLLM: executeMicroChainPipeline executes 4 distinct stages (Extract → Validate → Compare → Suggest)', async () => {
  const stepsTracked = [];

  const result = await hybridLLM.executeMicroChainPipeline(
    'Staff Backend Architect. Requirements: 8+ years experience with Go, Kubernetes, Kafka, and System Design.',
    { skills: ['Go', 'System Design'] },
    (event) => {
      stepsTracked.push(event);
    }
  );

  // Assert 4-stage data structure
  assert.ok(result.extract, 'Stage 1 (Extract) output must exist');
  assert.equal(result.extract.level, 'staff');
  assert.ok(result.extract.must_have_skills.includes('go'));

  assert.ok(result.validate, 'Stage 2 (Validate) output must exist');
  assert.ok(Array.isArray(result.validate.must_have_skills));

  assert.ok(result.compare, 'Stage 3 (Compare) output must exist');
  assert.ok(result.compare.strengths.some(s => s.toLowerCase() === 'go'));
  assert.ok(result.compare.gaps.some(s => s.toLowerCase() === 'kubernetes' || s.toLowerCase() === 'kafka'));

  assert.ok(result.suggest, 'Stage 4 (Suggest) output must exist');
  assert.ok(result.suggest.action && result.suggest.action.length > 10);

  // Verify all 4 stage notifications were emitted with stage names
  const stages = stepsTracked.map(s => s.stage);
  assert.ok(stages.includes('EXTRACT'));
  assert.ok(stages.includes('VALIDATE'));
  assert.ok(stages.includes('COMPARE'));
  assert.ok(stages.includes('SUGGEST'));
});

test('hybridLLM: polishBulletMicroChain rewrites bullet with strong action verb and metric preservation', async () => {
  const origEngine = hybridLLM.engine;
  const origKeys = hybridLLM.cloudKeys ? { ...hybridLLM.cloudKeys } : {};
  hybridLLM.engine = null;
  hybridLLM.cloudKeys = {};
  try {
    const rawBullet = 'helped with backend APIs and improved latency by 35%';
    const polished = await hybridLLM.polishBulletMicroChain(rawBullet, 'FastAPI, Redis, Kafka');

    assert.ok(polished.length > 15);
    // Must not start with passive "helped with"
    assert.equal(/^(helped with|worked on|responsible for)/i.test(polished), false);
    // Must preserve the 35% metric
    assert.ok(polished.includes('35%'));
  } finally {
    hybridLLM.engine = origEngine;
    hybridLLM.cloudKeys = origKeys;
  }
});

test('hybridLLM: generateOutreachMicroChain crafts 3-sentence note referencing anchor skill without forbidden buzzwords', async () => {
  const origEngine = hybridLLM.engine;
  const origKeys = hybridLLM.cloudKeys ? { ...hybridLLM.cloudKeys } : {};
  hybridLLM.engine = null;
  hybridLLM.cloudKeys = {};
  try {
    const note = await hybridLLM.generateOutreachMicroChain(
      'Senior Distributed Systems Engineer',
      'Stripe',
      { skills: ['Kafka and Redis event streaming', 'Go'] }
    );

    assert.ok(note.length > 30);
    assert.ok(note.includes('Stripe'));
    // Must avoid forbidden buzzwords
    const forbidden = ['passionate', 'thrilled', 'dynamic', 'synergy', 'rockstar'];
    for (const word of forbidden) {
      assert.equal(note.toLowerCase().includes(word), false, `Outreach note must not contain "${word}"`);
    }
  } finally {
    hybridLLM.engine = origEngine;
    hybridLLM.cloudKeys = origKeys;
  }
});

test('hybridLLM: runReasoningThenFormatChain orchestrates Pass 1 unconstrained reasoning and Pass 2 XGrammar schema packing', async () => {
  const origGenerate = hybridLLM.generateChat;
  const calls = [];

  hybridLLM.generateChat = async (messages, systemPrompt, onChunk, options) => {
    calls.push({ messages, systemPrompt, options });
    if (calls.length === 1) {
      // Pass 1: returns analytical prose
      return 'The candidate has strong Kubernetes and Go experience, but lacks Apache Kafka streaming architecture required for senior event-driven scale.';
    }
    // Pass 2: returns schema-compliant JSON
    return JSON.stringify({
      score: 82,
      strengths: ['Kubernetes', 'Go'],
      gaps: ['Apache Kafka']
    });
  };

  try {
    const testSchema = {
      type: 'object',
      properties: {
        score: { type: 'number' },
        strengths: { type: 'array' },
        gaps: { type: 'array' }
      },
      required: ['score', 'strengths', 'gaps']
    };

    const result = await hybridLLM.runReasoningThenFormatChain({
      reasoningPrompt: 'Evaluate candidate fit for Senior Platform Engineer with Kafka requirements.',
      schema: testSchema
    });

    assert.equal(calls.length, 2, 'Must execute exactly two passes in sequence');
    
    // Pass 1 verification (Reasoning)
    assert.equal(calls[0].options.temperature, SAMPLING_PROFILES.REASONING.temperature, 'Pass 1 must sample at reasoning temperature');
    assert.equal(calls[0].options.schema, undefined, 'Pass 1 must not be schema constrained');
    assert.ok(result.rawReasoning.includes('Kafka'));

    // Pass 2 verification (Schema Packing)
    assert.equal(calls[1].options.temperature, 0.05, 'Pass 2 must sample at near-zero temperature');
    assert.deepEqual(calls[1].options.schema, testSchema, 'Pass 2 must enforce target schema');
    assert.equal(result.parsed.score, 82);
    assert.deepEqual(result.parsed.gaps, ['Apache Kafka']);
  } finally {
    hybridLLM.generateChat = origGenerate;
  }
});

test('hybridLLM: generateChat forwards XGrammar response_format to WebGPU engine', async () => {
  let capturedPayload = null;
  const mockWebGpuEngine = {
    chat: {
      completions: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            choices: [{ message: { content: '{"status":"ok"}' } }]
          };
        }
      }
    }
  };

  const origEngine = hybridLLM.engine;
  hybridLLM.engine = mockWebGpuEngine;

  try {
    const testSchema = { type: 'object', properties: { status: { type: 'string' } } };
    const res = await hybridLLM.generateChat(
      [{ role: 'user', content: 'Parse status' }],
      'System prompt',
      null,
      { schema: testSchema, temperature: 0.1 }
    );

    assert.ok(capturedPayload);
    assert.ok(capturedPayload.response_format);
    assert.equal(capturedPayload.response_format.type, 'json_object');
    assert.equal(capturedPayload.response_format.schema, JSON.stringify(testSchema));
    assert.equal(res, '{"status":"ok"}');
  } finally {
    hybridLLM.engine = origEngine;
  }
});

test('hybridLLM: executeMicroChainPipeline activates fast-path deterministic extraction on confident JDs', async () => {
  const steps = [];
  const testJd = 'Looking for a Senior Python and React Engineer with 5+ years of experience building scalable systems.';
  const candidateKb = { skills: ['Python', 'React', 'Docker'] };

  const result = await hybridLLM.executeMicroChainPipeline(testJd, candidateKb, (update) => {
    steps.push(update);
  });

  assert.ok(result);
  // Confident JD with Python, React and 5 years must yield level Senior and min years 5
  assert.equal(result.node1.seniorityLevel, 'Senior');
  assert.equal(result.node1.minimumYears, 5);
  assert.ok(result.node1.mustHaves.includes('python') || result.node1.mustHaves.includes('react') || result.node1.mustHaves.includes('Python') || result.node1.mustHaves.includes('React'));
  assert.equal(result.source, 'Deterministic Fast-Path Engine');
});

test('checkOllamaReachable: prioritizes Qwen 2.5 Coder 7B for ATS and sprav-outreach-qlora for outreach', async () => {
  const originalFetch = globalThis.fetch;
  try {
    globalThis.fetch = async (url) => {
      if (url.includes(':11434/api/tags')) {
        return {
          ok: true,
          clone: () => ({
            json: async () => ({
              models: [
                { name: 'llama3.1:8b' },
                { name: 'qwen2.5-coder:7b-instruct' },
                { name: 'sprav-outreach-qlora:latest' }
              ]
            })
          })
        };
      }
      return { ok: false };
    };

    const reachable = await hybridLLM.checkOllamaReachable(true);
    assert.equal(reachable, true);
    // General / ATS workhorse defaults to Qwen 2.5 Coder 7B on 8GB VRAM
    assert.equal(hybridLLM.getBestOllamaModel(), 'qwen2.5-coder:7b-instruct');
    // Specialized outreach task routes to sprav-outreach-qlora
    assert.equal(hybridLLM.getBestOllamaModel('outreach'), 'sprav-outreach-qlora:latest');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM: optimizeBullet forwards BULLET_REWRITE_SCHEMA to WebGPU engine and unpacks JSON', async () => {
  let capturedPayload = null;
  const mockWebGpuEngine = {
    chat: {
      completions: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            choices: [{ message: { content: JSON.stringify({ polished_bullet: 'Architected high-throughput Kafka pipeline cutting p99 latency by 45%.' }) } }]
          };
        }
      }
    }
  };

  const origEngine = hybridLLM.engine;
  hybridLLM.engine = mockWebGpuEngine;

  try {
    const res = await hybridLLM.optimizeBullet('Worked on Kafka pipeline to make it faster', 'Apache Kafka distributed streaming');
    assert.ok(capturedPayload);
    assert.ok(capturedPayload.response_format);
    assert.equal(capturedPayload.response_format.type, 'json_object');
    assert.ok(capturedPayload.response_format.schema.includes('polished_bullet'));
    assert.equal(res.bullet, 'Architected high-throughput Kafka pipeline cutting p99 latency by 45%.');
    assert.equal(res.source, 'WebGPU (Local VRAM)');
  } finally {
    hybridLLM.engine = origEngine;
  }
});

test('hybridLLM: answerScreeningQuestion forwards SCREENING_ANSWER_SCHEMA to WebGPU engine and unpacks JSON', async () => {
  let capturedPayload = null;
  const mockWebGpuEngine = {
    chat: {
      completions: {
        create: async (payload) => {
          capturedPayload = payload;
          return {
            choices: [{ message: { content: JSON.stringify({ answer: 'I have 6 years of production experience in Go and distributed systems.' }) } }]
          };
        }
      }
    }
  };

  const origEngine = hybridLLM.engine;
  hybridLLM.engine = mockWebGpuEngine;

  try {
    const res = await hybridLLM.answerScreeningQuestion('How many years of Go experience do you have?', { skills: ['Go'] }, 'experience');
    assert.ok(capturedPayload);
    assert.ok(capturedPayload.response_format);
    assert.equal(capturedPayload.response_format.type, 'json_object');
    assert.ok(capturedPayload.response_format.schema.includes('screening response'));
    assert.equal(res.answer, 'I have 6 years of production experience in Go and distributed systems.');
    assert.equal(res.source, 'WebGPU (Local VRAM)');
  } finally {
    hybridLLM.engine = origEngine;
  }
});

test('hybridLLM BYOK: setPreferredProvider and getPreferredProvider lifecycle', () => {
  hybridLLM.setPreferredProvider('deepseek');
  assert.equal(hybridLLM.getPreferredProvider(), 'deepseek');

  hybridLLM.setPreferredProvider('openrouter');
  assert.equal(hybridLLM.getPreferredProvider(), 'openrouter');

  hybridLLM.setPreferredProvider('auto');
  assert.equal(hybridLLM.getPreferredProvider(), 'auto');
});

test('hybridLLM BYOK: testCloudProviderLatency validates empty key', async () => {
  const res = await hybridLLM.testCloudProviderLatency('groq', '');
  assert.equal(res.success, false);
  assert.ok(res.error.includes('Empty API key'));
});

test('hybridLLM BYOK: testCloudProviderLatency handles unsupported provider', async () => {
  const res = await hybridLLM.testCloudProviderLatency('fake_service', 'key_123');
  assert.equal(res.success, false);
  assert.ok(res.error.includes('Unsupported provider'));
});

test('hybridLLM BYOK: testCloudProviderLatency performs real timing on mock fetch', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.deepseek.com')) {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'pong' } }] })
      };
    }
    return { ok: false, status: 401, text: async () => 'Unauthorized' };
  };

  try {
    const successRes = await hybridLLM.testCloudProviderLatency('deepseek', 'sk-valid-key');
    assert.equal(successRes.success, true);
    assert.equal(successRes.provider, 'deepseek');
    assert.ok(typeof successRes.latencyMs === 'number');

    const failRes = await hybridLLM.testCloudProviderLatency('openrouter', 'sk-invalid-key');
    assert.equal(failRes.success, false);
    assert.ok(failRes.error.includes('HTTP 401'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM BYOK: callClientCloudLLM routes to preferred provider and cascades', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];

  globalThis.fetch = async (url, opts) => {
    const urlStr = String(url);
    calls.push(urlStr);
    if (urlStr.includes('api.deepseek.com')) {
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'DeepSeek response for candidate' } }] })
      };
    }
    return { ok: false, status: 500, text: async () => 'Server error' };
  };

  try {
    hybridLLM.setCloudCredential('deepseek', 'sk-deepseek-key');
    hybridLLM.setPreferredProvider('deepseek');

    const reply = await hybridLLM.callClientCloudLLM('Analyze this resume');
    assert.equal(reply, 'DeepSeek response for candidate');
    assert.ok(calls.some(c => c.includes('api.deepseek.com')));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM generateChat: sends full multi-turn conversation history to cloud provider', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody = null;

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.deepseek.com')) {
      sentBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'I remember our previous messages.' } }] })
      };
    }
    return { ok: false, status: 500, text: async () => 'error' };
  };

  try {
    hybridLLM.setCloudCredential('deepseek', 'sk-deepseek-key');
    hybridLLM.setPreferredProvider('deepseek');

    const conversation = [
      { role: 'user', content: 'My name is Alice.' },
      { role: 'assistant', content: 'Nice to meet you, Alice!' },
      { role: 'user', content: 'What is my name?' }
    ];

    const reply = await hybridLLM.generateChat(conversation, 'You are Copilot.');
    assert.equal(reply, 'I remember our previous messages.');
    assert.ok(sentBody !== null);

    const promptSent = sentBody.messages.find(m => m.role === 'user')?.content || '';
    assert.ok(promptSent.includes('Conversation so far:'));
    assert.ok(promptSent.includes('user: My name is Alice.'));
    assert.ok(promptSent.includes('assistant: Nice to meet you, Alice!'));
    assert.ok(promptSent.includes('user: What is my name?'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM Groq: routes to openai/gpt-oss-120b by default', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody = null;

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.groq.com')) {
      sentBody = JSON.parse(opts.body);
      return {
        ok: true,
        json: async () => ({ choices: [{ message: { content: 'Groq GPT-OSS 120B response' } }] })
      };
    }
    return { ok: false, status: 500, text: async () => 'error' };
  };

  try {
    hybridLLM.setCloudCredential('groq', 'gsk_mock_key');
    hybridLLM.setPreferredProvider('groq');

    const reply = await hybridLLM.callClientCloudLLM('Optimize this code');
    assert.equal(reply, 'Groq GPT-OSS 120B response');
    assert.ok(sentBody !== null);
    assert.equal(sentBody.model, 'openai/gpt-oss-120b');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM Groq: falls back to low GPT (openai/gpt-oss-20b) and low Qwen (qwen-2.5-32b) when 120b fails', async () => {
  const originalFetch = globalThis.fetch;
  const attemptedModels = [];

  globalThis.fetch = async (url, opts) => {
    if (String(url).includes('api.groq.com')) {
      const body = JSON.parse(opts.body);
      attemptedModels.push(body.model);
      if (body.model === 'openai/gpt-oss-20b') {
        return {
          ok: true,
          json: async () => ({ choices: [{ message: { content: 'Groq GPT-OSS 20B fallback response' } }] })
        };
      }
      return { ok: false, status: 404, text: async () => 'Model decommissioned' };
    }
    return { ok: false, status: 500, text: async () => 'error' };
  };

  try {
    hybridLLM.setCloudCredential('groq', 'gsk_mock_key');
    hybridLLM.setPreferredProvider('groq');

    const reply = await hybridLLM.callClientCloudLLM('Generate summary');
    assert.equal(reply, 'Groq GPT-OSS 20B fallback response');
    assert.ok(attemptedModels.includes('openai/gpt-oss-120b'), 'Must attempt 120b first');
    assert.ok(attemptedModels.includes('openai/gpt-oss-20b'), 'Must fall back to low GPT model 20b');
    assert.ok(!attemptedModels.some(m => m.includes('llama')), 'Must not use decommissioned llama models');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM: getOptimalModelPolicy evaluates 3-tier model strategy', () => {
  // 1. High VRAM (>= 6GB) -> Qwen 2.5 Coder 7B Instruct default
  const rtxHardware = {
    isDedicatedGPU: true,
    maxBufferSizeMB: 4096,
    systemMemoryGB: 16,
    canRunWebGPU7B: true,
    canRunOllama7B: true
  };
  const policy7b = hybridLLM.getOptimalModelPolicy('default', rtxHardware);
  assert.equal(policy7b.modelId, 'qwen2.5-coder:7b-instruct');
  assert.equal(policy7b.tier, '7b');

  // 2. Reasoning / Interview -> DeepSeek R1 Distill Qwen 7B
  const policyInterview = hybridLLM.getOptimalModelPolicy('interview', rtxHardware);
  assert.equal(policyInterview.modelId, 'deepseek-r1:7b');
  assert.equal(policyInterview.tier, 'reasoning');

  // 3. Fallback for < 6GB or CPU -> sprav-career-3b / 1.5B
  const lowHardware = {
    isDedicatedGPU: false,
    hardwareTier: 'pure_cpu_low_ram',
    systemMemoryGB: 8
  };
  const policyFallback = hybridLLM.getOptimalModelPolicy('default', lowHardware);
  assert.equal(policyFallback.modelId, 'hf.co/SVSPraveen/SPrav-Career-3B-Instruct');
  assert.equal(policyFallback.tier, 'fallback');
});

test('hybridLLM BYOK: testCloudProviderLatency detects OpenAI browser CORS blockage', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url) => {
    if (url.includes('openai.com')) {
      throw new TypeError('Failed to fetch');
    }
    return { ok: true, json: async () => ({}) };
  };

  try {
    const result = await hybridLLM.testCloudProviderLatency('openai', 'sk-proj-test1234');
    assert.equal(result.success, false);
    assert.equal(result.reachable, false);
    assert.equal(result.isCorsBlocked, true);
    assert.match(result.error, /CORS Blocked/);
    assert.match(result.recommendation, /OpenRouter/);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('hybridLLM BYOK: _callProviderEndpoint dispatches sprav_llm_cors_blocked on OpenAI CORS', async () => {
  const originalFetch = globalThis.fetch;
  let eventDispatched = null;

  const originalDispatch = globalThis.dispatchEvent;
  const originalWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent: (e) => {
      eventDispatched = e;
      return true;
    }
  };

  globalThis.fetch = async (url) => {
    if (url.includes('openai.com')) {
      throw new TypeError('Failed to fetch');
    }
    return { ok: true, text: async () => JSON.stringify({ choices: [] }) };
  };

  try {
    let threwCors = false;
    try {
      await hybridLLM._callProviderEndpoint('openai', 'sk-proj-test1234', 'test prompt');
    } catch (err) {
      if (err.name === 'CORSBlockedError') threwCors = true;
    }
    assert.equal(threwCors, true);
    assert.ok(eventDispatched, 'sprav_llm_cors_blocked CustomEvent should be dispatched');
    assert.equal(eventDispatched.type, 'sprav_llm_cors_blocked');
    assert.equal(eventDispatched.detail.provider, 'openai');
    assert.equal(eventDispatched.detail.recommendedProvider, 'openrouter');
  } finally {
    globalThis.fetch = originalFetch;
    globalThis.dispatchEvent = originalDispatch;
    globalThis.window = originalWindow;
  }
});

test('hybridLLM BYOK: handles malformed JSON response safely without throwing uncaught SyntaxError', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: true,
      text: async () => '<html><body>502 Bad Gateway: Cloudflare Error</body></html>'
    };
  };

  try {
    const res = await hybridLLM._callProviderEndpoint('groq', 'gsk-test1234', 'test prompt');
    assert.equal(res, null, 'Malformed JSON response should resolve safely to null');
  } finally {
    globalThis.fetch = originalFetch;
  }
});





