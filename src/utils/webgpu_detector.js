/**
 * WebGPU Hardware Detection & Capability Prober
 * Inspects navigator.gpu to determine whether the client device can run
 * in-browser quantized LLMs (Qwen 2.5 Coder 7B or 1.5B) via WebGPU.
 */

export const WEBGPU_MODELS = {
  SOVEREIGN_4B: {
    id: 'SPrav-Career-4B-Instruct-q4f16_1-MLC',
    name: 'SPrav Career 4B (Sovereign Career Model)',
    vramRequirement: '>= 3.5GB VRAM',
    sizeBytes: 2.3 * 1024 * 1024 * 1024,
    sizeFormatted: '~2.3 GB',
    tokensPerSecEstimate: '65-90 t/s on RTX'
  },
  HIGH_TIER: {
    id: 'Qwen2.5-Coder-7B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder (7B High Accuracy)',
    label: 'Qwen 2.5 Coder (7B Premier Unlimited)',
    tag: 'Champion Model',
    vramRequirement: '>= 6GB VRAM',
    sizeBytes: 4.3 * 1024 * 1024 * 1024,
    sizeFormatted: '~4.3 GB',
    tokensPerSecEstimate: '50-70 t/s on RTX'
  },
  REASONING_7B: {
    id: 'DeepSeek-R1-Distill-Qwen-7B-q4f16_1-MLC',
    name: 'DeepSeek-R1-Distill-Qwen (7B Reasoning CoT)',
    tag: 'Reasoning CoT',
    vramRequirement: '>= 6GB VRAM',
    sizeBytes: 4.3 * 1024 * 1024 * 1024,
    sizeFormatted: '~4.3 GB',
    tokensPerSecEstimate: '45-65 t/s on RTX'
  },
  BALANCED_TIER: {
    id: 'Qwen2.5-Coder-3B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder (3B Balanced Sweet Spot)',
    vramRequirement: '>= 3GB VRAM',
    sizeBytes: 1.9 * 1024 * 1024 * 1024,
    sizeFormatted: '~1.9 GB',
    tokensPerSecEstimate: '70-95 t/s'
  },
  LIGHT_TIER: {
    id: 'Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 Coder (1.5B Ultra-Fast)',
    vramRequirement: '>= 2GB VRAM',
    sizeBytes: 1.1 * 1024 * 1024 * 1024,
    sizeFormatted: '~1.1 GB',
    tokensPerSecEstimate: '90-140 t/s'
  }
};

/**
 * Probes the client browser and hardware for WebGPU readiness.
 * @returns {Promise<{
 *   supported: boolean,
 *   vendor?: string,
 *   architecture?: string,
 *   description?: string,
 *   isDedicatedGPU?: boolean,
 *   recommendedModel: string,
 *   recommendedTier: '7b' | '1.5b' | 'none',
 *   maxBufferSizeMB?: number,
 *   reason?: string
 * }>}
 */
export async function detectWebGPUCapability(options = {}) {
  const gpu = (typeof navigator !== 'undefined' && navigator.gpu) || (typeof window !== 'undefined' && window.navigator?.gpu);
  const systemMemoryGB = (typeof navigator !== 'undefined' && typeof navigator.deviceMemory === 'number') ? navigator.deviceMemory : 8;
  const cpuCores = (typeof navigator !== 'undefined' && typeof navigator.hardwareConcurrency === 'number') ? navigator.hardwareConcurrency : 4;

  if (!gpu) {
    return {
      supported: false,
      reason: 'WebGPU is not supported in this browser. Please use Chrome 113+, Edge 113+, or Brave.',
      recommendedModel: null,
      recommendedTier: 'none',
      systemMemoryGB,
      cpuCores,
      hardwareTier: 'pure_cpu_low_ram',
      canRunWebGPU7B: false,
      canRunWebGPU3B: false,
      canRunWebGPU15B: false,
      canRunOllama7B: systemMemoryGB >= 16,
      canRunOllamaHybrid: false,
      canRunOllamaLight: systemMemoryGB >= 8,
      webgpu7bDisabledReason: '[Cannot run on this system: WebGPU graphics acceleration not available]',
      ollama7bDisabledReason: systemMemoryGB < 16 ? '[Cannot run on this system: requires 16GB+ RAM, causes severe system freezing]' : null,
      engineRanking: ['cloud', 'webgpu', 'ollama']
    };
  }

  try {
    const adapter = await gpu.requestAdapter({
      powerPreference: 'high-performance'
    });

    if (!adapter) {
      return {
        supported: false,
        reason: 'WebGPU adapter could not be initialized (hardware acceleration may be disabled).',
        recommendedModel: null,
        recommendedTier: 'none',
        systemMemoryGB,
        cpuCores,
        hardwareTier: 'pure_cpu_low_ram',
        canRunWebGPU7B: false,
        canRunWebGPU3B: false,
        canRunWebGPU15B: false,
        canRunOllama7B: systemMemoryGB >= 16,
        canRunOllamaHybrid: false,
        canRunOllamaLight: systemMemoryGB >= 8,
        webgpu7bDisabledReason: '[Cannot run on this system: WebGPU adapter unavailable]',
        ollama7bDisabledReason: systemMemoryGB < 16 ? '[Cannot run on this system: requires 16GB+ RAM, causes severe system freezing]' : null,
        engineRanking: ['cloud', 'webgpu', 'ollama']
      };
    }

    // Inspect adapter info (handles Chrome, Edge, Safari vendor properties)
    const info = adapter.info || (adapter.requestAdapterInfo ? await adapter.requestAdapterInfo() : {});
    const vendor = (info.vendor || '').toLowerCase();
    const architecture = (info.architecture || '').toLowerCase();
    const description = info.description || `${vendor} ${architecture}`.trim() || 'Generic WebGPU Adapter';

    // Compute hardware buffer limits to infer VRAM capability
    const maxBufferSize = adapter.limits?.maxBufferSize || 0;
    const maxBufferSizeMB = Math.round(maxBufferSize / (1024 * 1024));

    // Detect if this is a dedicated high-performance GPU (NVIDIA, AMD Radeon, Apple Silicon M-series)
    const isNvidia = vendor.includes('nvidia') || description.toLowerCase().includes('nvidia') || description.toLowerCase().includes('geforce') || description.toLowerCase().includes('rtx');
    const isAmdDedicated = (vendor.includes('amd') || description.toLowerCase().includes('radeon')) && !description.toLowerCase().includes('integrated');
    const isAppleSilicon = vendor.includes('apple') || architecture.includes('apple') || description.toLowerCase().includes('apple');
    const isIntelIntegrated = vendor.includes('intel') && !description.toLowerCase().includes('arc');

    const isDedicatedGPU = (isNvidia || isAmdDedicated || isAppleSilicon) && !isIntelIntegrated;

    // Buffer threshold for 7B models: 7B quantized requires larger single allocations (typically >= 1GB buffer limit)
    const canHandle7B = isDedicatedGPU || maxBufferSizeMB >= 2048;

    const isHighVram = isDedicatedGPU && maxBufferSizeMB >= 2048;
    const isEntryDedicated = isDedicatedGPU && maxBufferSizeMB < 2048;
    const isSharedMemory = !isDedicatedGPU;

    // WebGPU safety flags
    const canRunWebGPU7B = isHighVram || (isDedicatedGPU && systemMemoryGB >= 16) || maxBufferSizeMB >= 2048;
    const canRunWebGPU15B = true;

    // Ollama safety flags:
    // - canRunOllama7B: requires dedicated GPU or 16GB+ system RAM
    // - canRunOllamaHybrid: entry dedicated GPU (4GB VRAM) + 8GB+ RAM
    const canRunOllama7B = isDedicatedGPU || systemMemoryGB >= 16;
    const canRunOllamaHybrid = isDedicatedGPU && systemMemoryGB >= 8;
    const canRunOllamaLight = systemMemoryGB >= 8;

    // Hardware classification & Best-at-first engine ranking
    let hardwareTier = 'integrated_shared';
    let engineRanking = ['cloud', 'webgpu', 'ollama'];

    if (isHighVram) {
      hardwareTier = 'dedicated_high';
      // If user has local Ollama with an existing installed model (e.g. Qwen),
      // rank Ollama #1 (0 GB download needed vs 4.3 GB for WebGPU).
      // Otherwise WebGPU 7B is #1.
      engineRanking = options?.hasOllamaModel 
        ? ['ollama', 'webgpu', 'cloud'] 
        : ['webgpu', 'ollama', 'cloud'];
    } else if (isEntryDedicated) {
      hardwareTier = 'dedicated_hybrid';
      engineRanking = ['ollama', 'webgpu', 'cloud']; // Ollama hybrid #1, WebGPU 1.5B #2, Cloud #3
    } else if (isSharedMemory) {
      hardwareTier = 'integrated_shared';
      engineRanking = ['cloud', 'webgpu', 'ollama']; // Cloud #1, WebGPU 1.5B #2, Ollama CPU #3
    }

    const recommendedTier = canHandle7B ? '7b' : '1.5b';
    const recommendedModel = canHandle7B 
      ? WEBGPU_MODELS.HIGH_TIER.id 
      : WEBGPU_MODELS.LIGHT_TIER.id;

    const webgpu7bDisabledReason = !canRunWebGPU7B 
      ? '[Cannot run on this system: requires 6GB+ dedicated VRAM, will crash browser tab]'
      : null;

    const ollama7bDisabledReason = !canRunOllama7B
      ? '[Cannot run on this system: requires 6GB+ VRAM or 16GB+ RAM, causes severe system freezing]'
      : null;

    return {
      supported: true,
      vendor: vendor || (isNvidia ? 'nvidia' : isAppleSilicon ? 'apple' : isAmdDedicated ? 'amd' : 'unknown'),
      architecture,
      description,
      isDedicatedGPU,
      maxBufferSizeMB,
      recommendedModel,
      recommendedTier,
      systemMemoryGB,
      cpuCores,
      hardwareTier,
      canRunWebGPU7B,
      canRunWebGPU3B: canRunWebGPU7B || isDedicatedGPU || systemMemoryGB >= 12 || maxBufferSizeMB >= 1024,
      canRunWebGPU15B,
      canRunOllama7B,
      canRunOllamaHybrid,
      canRunOllamaLight,
      webgpu7bDisabledReason,
      ollama7bDisabledReason,
      engineRanking,
      hasOllamaModel: Boolean(options?.hasOllamaModel),
      ollamaModelName: options?.ollamaModelName || null,
      reason: null
    };
  } catch (error) {
    return {
      supported: false,
      reason: `WebGPU probe error: ${error.message || error}`,
      recommendedModel: null,
      recommendedTier: 'none',
      systemMemoryGB,
      cpuCores,
      hardwareTier: 'pure_cpu_low_ram',
      canRunWebGPU7B: false,
      canRunWebGPU3B: false,
      canRunWebGPU15B: false,
      canRunOllama7B: systemMemoryGB >= 16,
      canRunOllamaHybrid: false,
      canRunOllamaLight: systemMemoryGB >= 8,
      webgpu7bDisabledReason: '[Cannot run on this system: WebGPU probe error]',
      ollama7bDisabledReason: null,
      engineRanking: ['cloud', 'webgpu', 'ollama']
    };
  }
}

/**
 * Evaluates the optimal model policy according to system VRAM, compute capabilities, and task type.
 * 
 * The Optimal Model Policy:
 * - GPU VRAM >= 6GB: Automatically assign Qwen2.5-Coder-7B-Instruct as default.
 * - Deep Interview Prep: Support DeepSeek-R1-Distill-Qwen-7B for chain-of-thought logic.
 * - GPU VRAM < 6GB or CPU: Fall back to sprav-career-3b or Qwen2.5-Coder-1.5B.
 * 
 * @param {object} hardware - Hardware report from detectWebGPUCapability
 * @param {string} taskType - Task identifier: 'interview' | 'reasoning' | 'salary_negotiation' | 'outreach' | 'default'
 * @returns {{ modelId: string, modelName: string, tier: string, fallbackModelId: string, reason: string }}
 */
export function getOptimalModelPolicy(hardware = {}, taskType = 'default') {
  const isHighVram = Boolean(
    hardware?.canRunWebGPU7B || 
    hardware?.canRunOllama7B || 
    hardware?.hardwareTier === 'dedicated_high' ||
    (hardware?.isDedicatedGPU && (hardware?.maxBufferSizeMB >= 2048 || hardware?.systemMemoryGB >= 16))
  );
  const isLowVramOrCpu = !hardware?.isDedicatedGPU || hardware?.hardwareTier === 'pure_cpu_low_ram' || hardware?.hardwareTier === 'integrated_shared' || (hardware?.maxBufferSizeMB && hardware?.maxBufferSizeMB < 2048);

  // 1. Deep Interview Prep / Reasoning: DeepSeek-R1-Distill-Qwen-7B
  if (taskType === 'interview' || taskType === 'reasoning' || taskType === 'salary_negotiation') {
    return {
      modelId: 'deepseek-r1:7b',
      modelName: 'DeepSeek-R1-Distill-Qwen-7B',
      tier: 'reasoning',
      fallbackModelId: isLowVramOrCpu ? 'qwen2.5-coder:1.5b' : 'qwen2.5-coder:7b-instruct',
      reason: 'Deep technical interview rounds and salary negotiation strategy require Chain-of-Thought (CoT) reasoning.'
    };
  }

  // 2. Ultra-fast single-sentence outreach (< 280-char LinkedIn connection notes)
  if (taskType === 'outreach' || taskType === 'connection_note') {
    return {
      modelId: 'hf.co/SVSPraveen/SPrav-Career-3B-Instruct',
      modelName: 'SPrav Career 3B (Outreach)',
      tier: 'outreach',
      fallbackModelId: 'qwen2.5-coder:1.5b',
      reason: 'Ultra-fast, single-sentence generation (< 280-character LinkedIn connection notes) runs efficiently on 3B weights.'
    };
  }

  // 3. GPU VRAM >= 6GB: Automatically assign Qwen2.5-Coder-7B-Instruct as default
  if (isHighVram) {
    return {
      modelId: 'qwen2.5-coder:7b-instruct',
      modelName: 'Qwen 2.5 Coder (7B Instruct)',
      tier: '7b',
      fallbackModelId: 'qwen2.5-coder:1.5b',
      reason: 'GPU VRAM >= 6GB: Automatically assign Qwen2.5-Coder-7B-Instruct as default for ATS analysis and 8K KV context.'
    };
  }

  // 4. GPU VRAM < 6GB or CPU: Fall back to sprav-career-3b or Qwen2.5-Coder-1.5B
  return {
    modelId: 'hf.co/SVSPraveen/SPrav-Career-3B-Instruct',
    modelName: 'SPrav Career 3B / Qwen 1.5B',
    tier: 'fallback',
    fallbackModelId: 'qwen2.5-coder:1.5b',
    reason: 'GPU VRAM < 6GB or CPU: Fall back to sprav-career-3b or Qwen2.5-Coder-1.5B to prevent Out-Of-Memory crashes.'
  };
}
