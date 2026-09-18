import test from 'node:test';
import assert from 'node:assert/strict';
import { detectWebGPUCapability, WEBGPU_MODELS, getOptimalModelPolicy } from './webgpu_detector.js';

test('detectWebGPUCapability: returns unsupported when navigator.gpu is missing', async () => {
  const result = await detectWebGPUCapability();
  assert.equal(result.supported, false);
  assert.equal(result.recommendedTier, 'none');
  assert.match(result.reason, /WebGPU is not supported/);
});

test('detectWebGPUCapability: handles adapter null and probe errors', async () => {
  // 1. Adapter null
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => null
    },
    configurable: true,
    writable: true
  });
  const resNull = await detectWebGPUCapability();
  assert.equal(resNull.supported, false);
  assert.match(resNull.reason, /adapter could not be initialized/);

  // 2. requestAdapter error
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => { throw new Error('Device lost'); }
    },
    configurable: true,
    writable: true
  });
  const resErr = await detectWebGPUCapability();
  assert.equal(resErr.supported, false);
  assert.match(resErr.reason, /Device lost/);

  delete navigator.gpu;
});

test('detectWebGPUCapability: detects Dedicated NVIDIA RTX GPU and assigns 7B tier', async () => {
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: {
          vendor: 'nvidia',
          architecture: 'ampere',
          description: 'NVIDIA GeForce RTX 3080'
        },
        limits: {
          maxBufferSize: 2 * 1024 * 1024 * 1024,
          maxStorageBufferBindingSize: 2 * 1024 * 1024 * 1024
        }
      })
    },
    configurable: true,
    writable: true
  });

  const res = await detectWebGPUCapability();
  assert.equal(res.supported, true);
  assert.equal(res.isDedicatedGPU, true);
  assert.equal(res.recommendedTier, '7b');
  assert.equal(res.recommendedModel, WEBGPU_MODELS.HIGH_TIER.id);
  assert.equal(res.vendor, 'nvidia');
  assert.equal(res.architecture, 'ampere');
  assert.equal(res.description, 'NVIDIA GeForce RTX 3080');

  delete navigator.gpu;
});

test('detectWebGPUCapability: detects Intel Integrated GPU and assigns 1.5B tier', async () => {
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: {
          vendor: 'intel',
          architecture: 'gen12',
          description: 'Intel Iris Xe Graphics'
        },
        limits: {
          maxBufferSize: 1024 * 1024 * 1024,
          maxStorageBufferBindingSize: 1024 * 1024 * 1024
        }
      })
    },
    configurable: true,
    writable: true
  });

  const res = await detectWebGPUCapability();
  assert.equal(res.supported, true);
  assert.equal(res.isDedicatedGPU, false);
  assert.equal(res.recommendedTier, '1.5b');
  assert.equal(res.recommendedModel, WEBGPU_MODELS.LIGHT_TIER.id);
  assert.equal(res.vendor, 'intel');

  delete navigator.gpu;
});

test('detectWebGPUCapability: handles missing info fields, limits fallback, and generic descriptions', async () => {
  // Adapter without info fields or limits (forces all || fallbacks to execute)
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: {},
        limits: {}
      })
    },
    configurable: true,
    writable: true
  });

  const res = await detectWebGPUCapability();
  assert.equal(res.supported, true);
  assert.equal(res.architecture, '');
  assert.equal(res.description, 'Generic WebGPU Adapter');
  assert.equal(res.maxBufferSizeMB, 0);
  assert.equal(res.isDedicatedGPU, false);
  assert.equal(res.recommendedTier, '1.5b');

  delete navigator.gpu;
});

test('detectWebGPUCapability: boundary test for 2048MB threshold on generic GPU', async () => {
  // 1. Exactly 2047 MB -> 1.5b
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: { vendor: 'generic' },
        limits: { maxBufferSize: 2047 * 1024 * 1024 }
      })
    },
    configurable: true,
    writable: true
  });
  const res2047 = await detectWebGPUCapability();
  assert.equal(res2047.recommendedTier, '1.5b');

  // 2. Exactly 2048 MB -> 7b
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: { vendor: 'generic' },
        limits: { maxBufferSize: 2048 * 1024 * 1024 }
      })
    },
    configurable: true,
    writable: true
  });
  const res2048 = await detectWebGPUCapability();
  assert.equal(res2048.recommendedTier, '7b');

  delete navigator.gpu;
});

test('detectWebGPUCapability: detects AMD Radeon and Apple Silicon', async () => {
  // 1. AMD Radeon
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: { vendor: 'amd', architecture: 'rdna2', description: 'AMD Radeon RX 6700 XT' },
        limits: { maxBufferSize: 2 * 1024 * 1024 * 1024 }
      })
    },
    configurable: true,
    writable: true
  });
  const resAmd = await detectWebGPUCapability();
  assert.equal(resAmd.isDedicatedGPU, true);
  assert.equal(resAmd.recommendedTier, '7b');

  // 2. Apple Silicon
  Object.defineProperty(navigator, 'gpu', {
    value: {
      requestAdapter: async () => ({
        info: { vendor: 'apple', architecture: 'm2', description: 'Apple M2 Pro' },
        limits: { maxBufferSize: 2 * 1024 * 1024 * 1024 }
      })
    },
    configurable: true,
    writable: true
  });
  const resApple = await detectWebGPUCapability();
  assert.equal(resApple.isDedicatedGPU, true);
  assert.equal(resApple.recommendedTier, '7b');

  delete navigator.gpu;
});

test('WEBGPU_MODELS configuration constants and byte calculations', () => {
  assert.equal(WEBGPU_MODELS.HIGH_TIER.id, 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC');
  assert.equal(WEBGPU_MODELS.LIGHT_TIER.id, 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC');
  assert.equal(WEBGPU_MODELS.HIGH_TIER.name, 'Qwen 2.5 Coder (7B High Accuracy)');
  assert.equal(WEBGPU_MODELS.HIGH_TIER.vramRequirement, '>= 6GB VRAM');
  assert.equal(WEBGPU_MODELS.HIGH_TIER.sizeFormatted, '~4.3 GB');
  assert.equal(WEBGPU_MODELS.HIGH_TIER.tokensPerSecEstimate, '50-70 t/s on RTX');

  assert.equal(WEBGPU_MODELS.LIGHT_TIER.name, 'Qwen 2.5 Coder (1.5B Ultra-Fast)');
  assert.equal(WEBGPU_MODELS.LIGHT_TIER.vramRequirement, '>= 2GB VRAM');
  assert.equal(WEBGPU_MODELS.LIGHT_TIER.sizeFormatted, '~1.1 GB');
  assert.equal(WEBGPU_MODELS.LIGHT_TIER.tokensPerSecEstimate, '90-140 t/s');

  assert.ok(WEBGPU_MODELS.HIGH_TIER.sizeBytes > 4 * 1000 * 1000 * 1000);
  assert.ok(WEBGPU_MODELS.LIGHT_TIER.sizeBytes > 1 * 1000 * 1000 * 1000);
  assert.ok(WEBGPU_MODELS.HIGH_TIER.sizeBytes > WEBGPU_MODELS.LIGHT_TIER.sizeBytes);
});

test('detectWebGPUCapability: isolated vendor detection and inferred vendor fallback', async () => {
  let capturedOptions = null;
  const setGpu = (adapter) => {
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async (opts) => {
          capturedOptions = opts;
          return adapter;
        }
      },
      configurable: true,
      writable: true
    });
  };

  try {
    // 1. Inferred NVIDIA from description keywords without vendor set
    setGpu({
      info: { vendor: '', description: 'GeForce GTX 1080' },
      limits: {}
    });
    const resGeforce = await detectWebGPUCapability();
    assert.equal(resGeforce.isDedicatedGPU, true);
    assert.equal(resGeforce.vendor, 'nvidia');
    assert.deepEqual(capturedOptions, { powerPreference: 'high-performance' });

    setGpu({
      info: { vendor: '', description: 'RTX 4090 Mobile' },
      limits: {}
    });
    const resRtx = await detectWebGPUCapability();
    assert.equal(resRtx.isDedicatedGPU, true);
    assert.equal(resRtx.vendor, 'nvidia');

    setGpu({
      info: { vendor: '', description: 'Nvidia Quadro P5000' },
      limits: {}
    });
    const resQuadro = await detectWebGPUCapability();
    assert.equal(resQuadro.isDedicatedGPU, true);
    assert.equal(resQuadro.vendor, 'nvidia');

    // 2. Inferred Apple Silicon from architecture or description
    setGpu({
      info: { vendor: '', architecture: 'apple-m3', description: 'M3 Max' },
      limits: {}
    });
    const resAppleArch = await detectWebGPUCapability();
    assert.equal(resAppleArch.isDedicatedGPU, true);
    assert.equal(resAppleArch.vendor, 'apple');

    setGpu({
      info: { vendor: '', architecture: '', description: 'Apple M1 GPU' },
      limits: {}
    });
    const resAppleDesc = await detectWebGPUCapability();
    assert.equal(resAppleDesc.isDedicatedGPU, true);
    assert.equal(resAppleDesc.vendor, 'apple');

    // 3. Inferred AMD Dedicated from Radeon keyword
    setGpu({
      info: { vendor: '', description: 'Radeon RX 6800' },
      limits: {}
    });
    const resRadeon = await detectWebGPUCapability();
    assert.equal(resRadeon.isDedicatedGPU, true);
    assert.equal(resRadeon.vendor, 'amd');

    // 4. AMD Integrated Graphics (must NOT be marked dedicated)
    setGpu({
      info: { vendor: 'amd', description: 'AMD Radeon Integrated Graphics' },
      limits: {}
    });
    const resAmdIntegrated = await detectWebGPUCapability();
    assert.equal(resAmdIntegrated.isDedicatedGPU, false);
    assert.equal(resAmdIntegrated.vendor, 'amd');

    // 5. Intel Arc (contains 'arc' so is NOT integrated, but vendor is intel)
    setGpu({
      info: { vendor: 'intel', description: 'Intel Arc A770' },
      limits: {}
    });
    const resIntelArc = await detectWebGPUCapability();
    assert.equal(resIntelArc.isDedicatedGPU, false); // neither nvidia, amd, nor apple
    assert.equal(resIntelArc.vendor, 'intel');

    // Intel Integrated with large VRAM (must still be dedicated: false)
    setGpu({
      info: { vendor: 'intel', description: 'Intel Iris Plus Graphics' },
      limits: { maxBufferSize: 4096 * 1024 * 1024 }
    });
    const resIntelInt = await detectWebGPUCapability();
    assert.equal(resIntelInt.isDedicatedGPU, false);
    assert.equal(resIntelInt.vendor, 'intel');

    // 6. Generic adapter without matching vendor infers 'unknown'
    setGpu({
      info: { vendor: '', description: 'Custom Accelerator' },
      limits: {}
    });
    const resUnknown = await detectWebGPUCapability();
    assert.equal(resUnknown.isDedicatedGPU, false);
    assert.equal(resUnknown.vendor, 'unknown');

    // 7. Non-Error exception throw
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => { throw 'String exception'; }
      },
      configurable: true,
      writable: true
    });
    const resStringThrow = await detectWebGPUCapability();
    assert.equal(resStringThrow.supported, false);
    assert.equal(resStringThrow.recommendedTier, 'none');
    assert.equal(resStringThrow.reason, 'WebGPU probe error: String exception');
    assert.deepEqual(resStringThrow.engineRanking, ['cloud', 'webgpu', 'ollama']);
  } finally {
    delete navigator.gpu;
  }
});

test('detectWebGPUCapability: dynamic engine ranking with Ollama models', async () => {
  try {
    // 1. Dedicated RTX GPU with installed Ollama model (e.g. Qwen) -> Ollama #1 on top
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          info: { vendor: 'nvidia', description: 'NVIDIA GeForce RTX 4080 (16GB VRAM)' },
          limits: { maxBufferSize: 2 * 1024 * 1024 * 1024 }
        })
      },
      configurable: true,
      writable: true
    });

    const resWithOllama = await detectWebGPUCapability({ 
      hasOllamaModel: true, 
      ollamaModelName: 'qwen2.5-coder:7b' 
    });
    assert.equal(resWithOllama.isDedicatedGPU, true);
    assert.equal(resWithOllama.hasOllamaModel, true);
    assert.equal(resWithOllama.ollamaModelName, 'qwen2.5-coder:7b');
    assert.deepEqual(resWithOllama.engineRanking, ['ollama', 'webgpu', 'cloud']);

    // 2. Dedicated RTX GPU without installed Ollama model -> WebGPU #1 on top
    const resWithoutOllama = await detectWebGPUCapability({ 
      hasOllamaModel: false 
    });
    assert.deepEqual(resWithoutOllama.engineRanking, ['webgpu', 'ollama', 'cloud']);

    // 3. Integrated Intel GPU (Shared memory) -> Cloud AI #1 on top
    Object.defineProperty(navigator, 'gpu', {
      value: {
        requestAdapter: async () => ({
          info: { vendor: 'intel', description: 'Intel Iris Xe Graphics' },
          limits: { maxBufferSize: 512 * 1024 * 1024 }
        })
      },
      configurable: true,
      writable: true
    });

    const resIntegrated = await detectWebGPUCapability();
    assert.deepEqual(resIntegrated.engineRanking, ['cloud', 'webgpu', 'ollama']);
  } finally {
    delete navigator.gpu;
  }
});

test('getOptimalModelPolicy: evaluates optimal model policy for VRAM >= 6GB, reasoning, and fallback', () => {
  // 1. GPU VRAM >= 6GB -> Automatically assign Qwen2.5-Coder-7B-Instruct as default
  const rtx4060 = {
    isDedicatedGPU: true,
    maxBufferSizeMB: 4096,
    systemMemoryGB: 16,
    hardwareTier: 'dedicated_high',
    canRunWebGPU7B: true,
    canRunOllama7B: true
  };
  const defaultPolicy = getOptimalModelPolicy(rtx4060, 'default');
  assert.equal(defaultPolicy.modelId, 'qwen2.5-coder:7b-instruct');
  assert.equal(defaultPolicy.tier, '7b');
  assert.match(defaultPolicy.reason, /GPU VRAM >= 6GB/);

  // 2. Deep Interview Prep -> Support DeepSeek-R1-Distill-Qwen-7B for chain-of-thought logic
  const interviewPolicy = getOptimalModelPolicy(rtx4060, 'interview');
  assert.equal(interviewPolicy.modelId, 'deepseek-r1:7b');
  assert.equal(interviewPolicy.tier, 'reasoning');
  assert.match(interviewPolicy.reason, /Chain-of-Thought/);

  const salaryPolicy = getOptimalModelPolicy(rtx4060, 'salary_negotiation');
  assert.equal(salaryPolicy.modelId, 'deepseek-r1:7b');
  assert.equal(salaryPolicy.tier, 'reasoning');

  // 3. Ultra-fast single-sentence outreach (< 280-char LinkedIn connection notes)
  const outreachPolicy = getOptimalModelPolicy(rtx4060, 'outreach');
  assert.equal(outreachPolicy.modelId, 'hf.co/SVSPraveen/SPrav-Career-3B-Instruct');
  assert.equal(outreachPolicy.tier, 'outreach');
  assert.match(outreachPolicy.reason, /280-character LinkedIn connection notes/);

  // 4. GPU VRAM < 6GB or CPU -> Fall back to sprav-career-3b or Qwen2.5-Coder-1.5B
  const lowVramLaptop = {
    isDedicatedGPU: false,
    hardwareTier: 'integrated_shared',
    maxBufferSizeMB: 512,
    systemMemoryGB: 8,
    canRunWebGPU7B: false,
    canRunOllama7B: false
  };
  const fallbackPolicy = getOptimalModelPolicy(lowVramLaptop, 'default');
  assert.equal(fallbackPolicy.modelId, 'hf.co/SVSPraveen/SPrav-Career-3B-Instruct');
  assert.equal(fallbackPolicy.tier, 'fallback');
  assert.equal(fallbackPolicy.fallbackModelId, 'qwen2.5-coder:1.5b');
  assert.match(fallbackPolicy.reason, /GPU VRAM < 6GB or CPU/);
});


