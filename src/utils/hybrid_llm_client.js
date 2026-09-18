import { 
  calculateDeterministicAtsFit,
  buildMicroAtsAdvicePrompt,
  buildApplicationNotePrompt, 
  buildBulletOptimizerPrompt,
  buildScreeningAnswerPrompt,
  parseAndSanitizeJSON,
  buildMicroExtractPrompt,
  buildMicroComparePrompt,
  buildMicroActionPrompt,
  buildMicroBulletPrompt,
  buildMicroOutreachPrompt,
  verifyBulletAntiHallucination,
  SAMPLING_PROFILES,
  classifyRequirementsDeterministically,
  estimateTokenCount
} from './webgpu_tasks.js';
import {
  JD_COMPETENCY_SCHEMA,
  ATS_AUDIT_SCHEMA,
  MICRO_ACTION_SCHEMA,
  BULLET_REWRITE_SCHEMA,
  SCREENING_ANSWER_SCHEMA
} from './structured_schemas.js';
import { WEBGPU_MODELS, getOptimalModelPolicy } from './webgpu_detector.js';
import { storageVault } from './browser_storage_vault.js';
import { safeJsonParse, sanitizeObject } from './security_guard.js';
import { findRelevantStarStories } from './star_story_bank.js';
import {
  retrieveStyleAnchor,
  buildThematicCoverLetterPrompt,
  generateThematicFallbackCoverLetter,
  humanizeAndSanitizeText
} from './cover_letter_style_engine.js';
import { 
  byokRateLimiter, 
  ByokRateLimitError, 
  ByokRunawayLoopError 
} from './byok_rate_limiter.js';

/**
 * Offline rule-based fallback: Computes non-polluting deterministic ATS fit score
 * based on candidate skill overlap and job description technical requirements.
 */

/**
 * Safely parses response JSON body using safeJsonParse (OWASP A08) to prevent uncaught
 * SyntaxError on malformed, partial, or HTML error payloads and sanitize prototype pollution.
 * Supports standard Fetch Response objects as well as lightweight test mocks.
 * 
 * @param {Response|Object} res - Fetch response instance or mock
 * @param {*} [fallback=null] - Fallback value on parse failure
 * @returns {Promise<any>} Parsed and sanitized object
 */
async function parseResponseJson(res, fallback = null) {
  if (!res) return fallback;
  try {
    if (typeof res.text === 'function') {
      const text = await res.text();
      return safeJsonParse(text, fallback);
    }
    if (typeof res.json === 'function') {
      const data = await res.json();
      return typeof data === 'string' ? safeJsonParse(data, fallback) : (sanitizeObject ? sanitizeObject(data) : data);
    }
    if (typeof res === 'string') {
      return safeJsonParse(res, fallback);
    }
    return fallback;
  } catch {
    return fallback;
  }
}

export function computeDeterministicAtsFit(candidateProfile, jobDescription) {
  const jdText = (typeof jobDescription === 'string' ? jobDescription : JSON.stringify(jobDescription || '')).toLowerCase();

  // Extract candidate skills
  let candidateSkills = [];
  if (Array.isArray(candidateProfile?.skills)) {
    candidateSkills = candidateProfile.skills.map(s => String(s).trim()).filter(Boolean);
  } else if (typeof candidateProfile === 'string') {
    candidateSkills = candidateProfile.split(/[,;\n]+/).map(s => s.trim()).filter(Boolean);
  } else if (candidateProfile && typeof candidateProfile === 'object') {
    const allVals = [
      ...(Array.isArray(candidateProfile.skills) ? candidateProfile.skills : []),
      candidateProfile.title,
      candidateProfile.personal?.title
    ].filter(Boolean);
    candidateSkills = allVals.map(s => String(s).trim()).filter(Boolean);
  }

  // Deduplicate
  const uniqueCandidateSkills = [];
  const seenLower = new Set();
  for (const s of candidateSkills) {
    const low = s.toLowerCase();
    if (!seenLower.has(low)) {
      seenLower.add(low);
      uniqueCandidateSkills.push(s);
    }
  }

  const matchingSkills = [];
  const candidateMissingSkills = [];

  for (const skill of uniqueCandidateSkills) {
    const lowSkill = skill.toLowerCase();
    const escaped = lowSkill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(^|[^a-z0-9#+.-])${escaped}([^a-z0-9#+.-]|$)`, 'i');
    if (regex.test(jdText) || jdText.includes(lowSkill)) {
      matchingSkills.push(skill);
    } else {
      candidateMissingSkills.push(skill);
    }
  }

  // Detect in-demand technologies present in JD that candidate lacks
  const COMMON_TECH_KEYWORDS = [
    'React', 'Node.js', 'Python', 'TypeScript', 'JavaScript', 'AWS', 'Docker',
    'Kubernetes', 'GraphQL', 'SQL', 'PostgreSQL', 'MongoDB', 'Redis', 'CI/CD',
    'Git', 'REST', 'Microservices', 'Tailwind', 'Next.js', 'Vue', 'Go', 'Rust',
    'Java', 'C#', '.NET', 'GCP', 'Azure', 'Linux', 'Terraform', 'Kafka'
  ];

  const jdMissingTech = [];
  for (const kw of COMMON_TECH_KEYWORDS) {
    const lowKw = kw.toLowerCase();
    if (jdText.includes(lowKw) && !seenLower.has(lowKw)) {
      jdMissingTech.push(kw);
    }
  }

  const missingList = jdMissingTech.length > 0 ? jdMissingTech.slice(0, 5) : candidateMissingSkills.slice(0, 3);
  if (missingList.length === 0) {
    missingList.push('Run local WebGPU or Ollama for full AI analysis');
  }

  const totalRelevant = matchingSkills.length + Math.max(1, jdMissingTech.length);
  const ratio = matchingSkills.length / totalRelevant;
  const computedScore = Math.min(92, Math.max(35, Math.round(35 + ratio * 57)));

  const advice = matchingSkills.length > 0
    ? `Matches detected in ${matchingSkills.slice(0, 3).join(', ')}. Highlight direct experience with these in your bullet points.`
    : 'Enable WebGPU or add a free Groq/Gemini key in Settings for full real-time neural ATS scoring.';

  return {
    matching_skills: matchingSkills.slice(0, 6),
    missing_skills: missingList,
    ats_score: computedScore,
    strategic_advice: advice
  };
}

class HybridLLMClient {
  constructor() {
    this.engine = null;
    this.worker = null;
    this.activeModel = null;
    this.isInitializing = false;
    this.initProgress = 0;
    this.initStatusText = '';
    this.cloudKeys = {};
    this.cloudProvider = 'groq'; // 'groq' | 'gemini'
    this.listeners = new Set();
    this._ollamaReachabilityCache = null; // { reachable: boolean, timestamp: number }
    this.rateLimiter = byokRateLimiter;
  }

  /**
   * Subscribes to progress and state updates.
   * @param {function} listener
   * @returns {function} unsubscribe
   */
  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify(data) {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('[Hybrid LLM] Listener error:', e);
      }
    }
  }

  /**
   * Initializes the in-browser WebGPU engine inside a background worker.
   * @param {string} modelId - Model ID (default: Qwen 2.5 Coder 7B)
   * @param {function} onProgress - Progress callback receiving { progress: 0-1, text: string }
   */
  async initWebGPU(modelId = WEBGPU_MODELS.HIGH_TIER.id, onProgress = null) {
    if (this.engine && this.activeModel === modelId) {
      return this.engine;
    }

    if (this.isInitializing) {
      console.warn('[Hybrid LLM] Initialization already in progress.');
      return;
    }

    this.isInitializing = true;
    this._notify({ status: 'initializing', progress: 0, text: 'Preparing WebWorker...' });

    try {
      // Terminate any existing worker
      if (this.worker) {
        this.worker.terminate();
        this.worker = null;
        this.engine = null;
      }

      this.worker = new Worker(new URL('./webgpu_worker.js', import.meta.url), {
        type: 'module'
      });

      const { CreateWebWorkerMLCEngine } = await import('@mlc-ai/web-llm');
      const engineConfig = {
        context_window_size: 8192,
        initProgressCallback: (report) => {
          this.initProgress = report.progress || 0;
          this.initStatusText = report.text || 'Loading weights...';
          const update = {
            status: 'downloading',
            progress: this.initProgress,
            text: this.initStatusText
          };
          if (onProgress) {
            onProgress(update);
          }
          this._notify(update);
        }
      };

      try {
        this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, engineConfig);
      } catch (allocErr) {
        // If 7B fails to allocate VRAM on WebGPU (<8GB VRAM or system contention), gracefully try 3B Sweet Spot
        if (modelId === WEBGPU_MODELS.HIGH_TIER.id) {
          console.warn('[Hybrid LLM] 7B VRAM allocation failed, falling back to 3B Sweet Spot:', allocErr);
          this._notify({ status: 'fallback', text: '7B VRAM ceiling reached; loading 3B Balanced model...' });
          try {
            modelId = WEBGPU_MODELS.BALANCED_TIER.id;
            this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, engineConfig);
          } catch (balancedErr) {
            console.warn('[Hybrid LLM] 3B VRAM allocation failed, falling back to 1.5B Fast model:', balancedErr);
            this._notify({ status: 'fallback', text: '3B memory limit reached; loading 1.5B Fast model...' });
            modelId = WEBGPU_MODELS.LIGHT_TIER.id;
            this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, engineConfig);
          }
        } else if (modelId === WEBGPU_MODELS.BALANCED_TIER.id) {
          console.warn('[Hybrid LLM] 3B VRAM allocation failed, falling back to 1.5B Fast model:', allocErr);
          this._notify({ status: 'fallback', text: '3B memory limit reached; loading 1.5B Fast model...' });
          modelId = WEBGPU_MODELS.LIGHT_TIER.id;
          this.engine = await CreateWebWorkerMLCEngine(this.worker, modelId, engineConfig);
        } else {
          throw allocErr;
        }
      }

      this.activeModel = modelId;
      if (import.meta?.env?.DEV) {
        console.log(`[Hybrid LLM] WebGPU engine successfully loaded: ${modelId}`);
      }
      this._notify({ status: 'ready', model: modelId });
      return this.engine;
    } catch (err) {
      console.error('[Hybrid LLM] WebGPU initialization failed:', err);
      this.engine = null;
      this.activeModel = null;
      this._notify({ status: 'error', error: err.message || err });
      throw err;
    } finally {
      this.isInitializing = false;
    }
  }

  cancelWebGPUInit() {
    if (this.worker) {
      try {
        this.worker.terminate();
      } catch (e) {
        console.warn('[Hybrid LLM] Failed to terminate worker cleanly:', e);
      }
      this.worker = null;
      this.engine = null;
    }
    this.isInitializing = false;
    this.initProgress = 0;
    this.initStatusText = '';
    this._notify({ status: 'cancelled', text: 'WebGPU initialization cancelled' });
  }

  /**
   * Estimates prompt tokens and checks against the context window limit.
   * Prevents silent truncation on long resumes and job descriptions.
   *
   * @param {string|Array<{role: string, content: string}>} promptOrMessages
   * @param {number} maxTokens - Context window limit (default 8192)
   * @returns {{ tokenCount: number, withinBudget: boolean, percentUsed: number, warning: string|null }}
   */
  checkContextBudget(promptOrMessages, maxTokens = 8192) {
    let rawText = '';
    if (typeof promptOrMessages === 'string') {
      rawText = promptOrMessages;
    } else if (Array.isArray(promptOrMessages)) {
      rawText = promptOrMessages.map(m => m?.content || '').join('\n');
    }
    const tokenCount = estimateTokenCount(rawText);
    const withinBudget = tokenCount <= maxTokens;
    const percentUsed = Math.min(100, Math.round((tokenCount / maxTokens) * 100));
    let warning = null;
    if (tokenCount > maxTokens) {
      warning = `Prompt exceeds ${maxTokens} tokens (estimated ${tokenCount} tokens, ~${percentUsed}%). Content may be truncated.`;
    } else if (tokenCount > maxTokens * 0.85) {
      warning = `High token usage: ${tokenCount}/${maxTokens} tokens (~${percentUsed}% of context window).`;
    }
    return { tokenCount, withinBudget, percentUsed, warning };
  }

  isReady() {
    return !!this.engine;
  }

  getActiveModel() {
    return this.activeModel;
  }

  getLoadingState() {
    return {
      isInitializing: this.isInitializing,
      progress: this.initProgress,
      text: this.initStatusText
    };
  }

  /**
   * Returns the Ollama base URL. On localhost:5173 (Vite dev), routes through the
   * /api/ollama proxy to bypass browser CORS/403 blocks. On Vercel/production,
   * falls back to direct localhost:11434 (which will be blocked by HTTPS → HTTP
   * mixed-content rules — see EngineSwitchModal diagnostic for guidance).
   */
  _getOllamaBaseUrl() {
    if (typeof window !== 'undefined') {
      try {
        const customEndpoint = localStorage.getItem('sprav_ollama_endpoint');
        if (customEndpoint && typeof customEndpoint === 'string' && customEndpoint.trim()) {
          return customEndpoint.trim().replace(/\/+$/, '');
        }
      } catch (_) {}

      const hostname = window.location?.hostname || '';
      const isLocal = hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]' || hostname.endsWith('.local');

      // Any local dev/preview port (5173, 3000, 4173, 8080, etc.) routes through same-origin Vite proxy
      if (isLocal) {
        return '/api/ollama';
      }

      // On HTTPS deployments, calling http://localhost:11434 directly is blocked by browser mixed-content policy
      if (window.location?.protocol === 'https:') {
        return '/api/ollama';
      }
    }

    return 'http://localhost:11434';
  }

  /**
   * Probes whether local Ollama is reachable on localhost:11434 and discovers active models.
   * Caches reachability in memory for 60 seconds to avoid redundant localhost pings.
   * @param {boolean} forceRefresh - Optional flag to bypass 60s cache
   */
  async checkOllamaReachable(forceRefresh = false) {
    if (!forceRefresh && this._ollamaReachabilityCache) {
      const age = Date.now() - this._ollamaReachabilityCache.timestamp;
      if (age < 60000) {
        return this._ollamaReachabilityCache.reachable;
      }
    }

    const ollamaBase = this._getOllamaBaseUrl();
    try {
      const res = await fetch(`${ollamaBase}/api/tags`, { 
        method: 'GET',
        signal: typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function' 
          ? AbortSignal.timeout(4000) 
          : undefined 
      });
      if (res.ok) {
        try {
          const resTarget = typeof res.clone === 'function' ? res.clone() : res;
          const data = (await parseResponseJson(resTarget, {})) || {};
          const available = data.models || [];
          this._cachedOllamaModels = available;
          this._hasInstalledOllamaModel = available.length > 0;
          this._cachedOllamaModel = null;

          const priority = [
            'qwen2.5-coder:7b-instruct',
            'qwen2.5-coder:7b',
            'deepseek-r1:7b',
            'deepseek-r1:8b',
            'deepseek-r1-distill-qwen:7b',
            'sprav-career-3b',
            'hf.co/SVSPraveen/SPrav-Career-3B-Instruct',
            'sprav-outreach-qlora',
            'sprav-outreach-lora',
            'sprav-cover-letter-qlora',
            'sprav-qlora',
            'qwen2.5-coder:3b-instruct',
            'qwen2.5-coder:3b',
            'qwen2.5-coder:1.5b-instruct',
            'qwen2.5-coder:1.5b',
            'qwen2.5:7b-instruct',
            'qwen2.5:7b',
            'qwen2.5:3b',
            'qwen2.5:1.5b',
            'qwen2.5:latest',
            'qwen3-coder:latest',
            'mistral:latest'
          ];
          for (const cand of priority) {
            const match = available.find(m => m.name === cand || m.name.startsWith(cand));
            if (match) {
              this._cachedOllamaModel = match.name;
              break;
            }
          }
          if (!this._cachedOllamaModel && available[0]) {
            this._cachedOllamaModel = available[0].name;
          }
        } catch {
          this._cachedOllamaModels = [];
          this._hasInstalledOllamaModel = false;
          this._cachedOllamaModel = null;
        }
        this._ollamaReachabilityCache = { reachable: true, timestamp: Date.now() };
        return true;
      }
      this._cachedOllamaModels = [];
      this._hasInstalledOllamaModel = false;
      this._cachedOllamaModel = null;
      this._ollamaReachabilityCache = { reachable: false, timestamp: Date.now() };
      return false;
    } catch {
      this._cachedOllamaModels = [];
      this._hasInstalledOllamaModel = false;
      this._cachedOllamaModel = null;
      this._ollamaReachabilityCache = { reachable: false, timestamp: Date.now() };
      return false;
    }
  }

  /**
   * Returns true if Ollama is running and has at least one installed model ready.
   */
  hasInstalledOllamaModel() {
    return Boolean(this._hasInstalledOllamaModel && this._cachedOllamaModel);
  }

  /**
   * Returns list of all installed models discovered on Ollama localhost:11434.
   */
  getInstalledOllamaModels() {
    return this._cachedOllamaModels || [];
  }

  /**
   * Returns the best detected Ollama model name, defaulting to qwen2.5-coder:7b-instruct.
   * Supports task-aware dynamic routing:
   * - 'reasoning' / 'interview' / 'salary_negotiation': Routes to DeepSeek-R1 if available.
   * - 'outreach' / 'connection_note': Routes to sprav-career-3b if available.
   * - Default / ATS / Code: Routes to Qwen 2.5 Coder 7B (optimal for 8GB VRAM).
   */
  getBestOllamaModel(taskType = null) {
    try {
      if (Array.isArray(this._cachedOllamaModels) && this._cachedOllamaModels.length > 0) {
        // 1. Task-aware routing: DeepSeek-R1 for complex reasoning & interview prep
        if (taskType === 'reasoning' || taskType === 'interview' || taskType === 'salary_negotiation') {
          const reasoningMatch = this._cachedOllamaModels.find(m => 
            m.name.includes('deepseek-r1') || m.name.includes('r1-distill')
          );
          if (reasoningMatch) return reasoningMatch.name;
        }

        // 2. Task-aware routing: sprav-career-3b for quick outreach
        if (taskType === 'outreach' || taskType === 'connection_note') {
          const outreachMatch = this._cachedOllamaModels.find(m => 
            m.name.includes('sprav-career') || m.name.includes('sprav-outreach')
          );
          if (outreachMatch) return outreachMatch.name;
        }

        // 3. Return primary cached model if discovered
        if (typeof this._cachedOllamaModel === 'string' && this._cachedOllamaModel.trim()) {
          return this._cachedOllamaModel.trim();
        }

        const first = this._cachedOllamaModels[0]?.name;
        if (typeof first === 'string' && first.trim()) {
          return first.trim();
        }
      }

      if (typeof this._cachedOllamaModel === 'string' && this._cachedOllamaModel.trim()) {
        return this._cachedOllamaModel.trim();
      }
    } catch (err) {
      console.warn('[Hybrid LLM] getBestOllamaModel resolution error:', err);
    }
    return 'qwen2.5-coder:7b-instruct';
  }

  getOllamaModelName() {
    return this.getBestOllamaModel();
  }

  /**
   * Evaluates the optimal model policy according to system VRAM, compute capabilities, and task type.
   * - GPU VRAM >= 6GB: Automatically assign Qwen2.5-Coder-7B-Instruct as default.
   * - Deep Interview Prep: Support DeepSeek-R1-Distill-Qwen-7B for chain-of-thought logic.
   * - GPU VRAM < 6GB or CPU: Fall back to sprav-career-3b or Qwen2.5-Coder-1.5B.
   */
  getOptimalModelPolicy(taskType = 'default', hardware = null) {
    return getOptimalModelPolicy(hardware || this._detectedHardware || {}, taskType);
  }

  /**
   * Retrieves cloud API key from memory, AES-GCM Encrypted Vault, or legacy storage.
   */
  async getCloudCredential(service) {
    if (this.cloudKeys && this.cloudKeys[service]) return this.cloudKeys[service];

    // 1. Primary: Retrieve from AES-GCM encrypted IndexedDB storage vault
    try {
      const secureKey = await storageVault.getSecureItem('credential_' + service);
      if (secureKey) {
        if (!this.cloudKeys) this.cloudKeys = {};
        this.cloudKeys[service] = secureKey;
        // Purge legacy plaintext localStorage if still present
        if (typeof localStorage !== 'undefined') {
          localStorage.removeItem('sprav_' + service + '_key');
          localStorage.removeItem('sprav_' + service + '_token');
        }
        return secureKey;
      }
    } catch (e) {
      console.warn('[Hybrid LLM] Secure vault retrieval error:', e);
    }

    // 2. Migration fallback: check legacy localStorage and upgrade to AES-GCM vault
    if (typeof localStorage !== 'undefined') {
      const lsKey = localStorage.getItem('sprav_' + service + '_key') || 
                    localStorage.getItem('sprav_' + service + '_token');
      if (lsKey) {
        if (!this.cloudKeys) this.cloudKeys = {};
        this.cloudKeys[service] = lsKey;
        try {
          await storageVault.setSecureItem('credential_' + service, lsKey);
          localStorage.removeItem('sprav_' + service + '_key');
          localStorage.removeItem('sprav_' + service + '_token');
        } catch {}
        return lsKey;
      }
    }

    // 3. Migration fallback: check legacy unencrypted sprav_credentials record
    try {
      const stored = await storageVault.getItem('sprav_credentials');
      if (stored && stored[service]) {
        const val = stored[service]?.api_key || stored[service]?.token;
        const candidate = typeof val === 'string' ? val : (val && typeof val === 'object' ? (val.value || val.key || val.api_key) : null);
        if (candidate) {
          if (!this.cloudKeys) this.cloudKeys = {};
          this.cloudKeys[service] = candidate;
          try {
            await storageVault.setSecureItem('credential_' + service, candidate);
          } catch {}
          return candidate;
        }
      }
    } catch {}
    return null;
  }

  setCloudCredential(service, key) {
    if (!this.cloudKeys) this.cloudKeys = {};
    this.cloudKeys[service] = key;
  }

  async hasConfiguredCloudKey() {
    if (this.cloudKeys && Object.values(this.cloudKeys).some(k => typeof k === 'string' && k.trim().length > 0)) {
      return true;
    }
    if (typeof indexedDB === 'undefined' && typeof localStorage === 'undefined') {
      return false;
    }
    const providers = ['groq', 'gemini', 'anthropic', 'deepseek', 'openrouter', 'mistral', 'openai'];
    for (const p of providers) {
      try {
        const key = await this.getCloudCredential(p);
        if (key && typeof key === 'string' && key.trim().length > 0) return true;
      } catch {}
    }
    return false;
  }

  setPreferredProvider(provider) {
    this.cloudProvider = provider || 'auto';
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem('sprav_preferred_cloud_provider', this.cloudProvider);
    }
  }

  getPreferredProvider() {
    if (typeof localStorage !== 'undefined') {
      const saved = localStorage.getItem('sprav_preferred_cloud_provider');
      if (saved) return saved;
    }
    return this.cloudProvider || 'auto';
  }

  /**
   * Performs an isolated latency and health ping to any cloud provider.
   */
  async testCloudProviderLatency(service, key, model = null) {
    if (!key) return { success: false, error: 'Empty API key' };
    const startTime = Date.now();
    try {
      let res;
      if (service === 'gemini') {
        const targetModel = model || 'gemini-2.0-flash';
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
        });
        if (!res.ok && !model) {
          // Fallback to gemini-1.5-flash / gemini-1.5-pro
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
          });
          if (!res.ok) {
            res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ contents: [{ parts: [{ text: 'ping' }] }] })
            });
          }
        }
      } else if (service === 'anthropic') {
        const targetModel = model || 'claude-3-5-sonnet-20241022';
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok && !model) {
          res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'x-api-key': key,
              'anthropic-version': '2023-06-01',
              'anthropic-dangerous-direct-browser-access': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-5-haiku-20241022',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5
            })
          });
        }
      } else if (service === 'openrouter') {
        const targetModel = model || 'qwen/qwen-2.5-coder-32b-instruct';
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://sprav-job-ai.local',
            'X-Title': 'SPrav Job AI'
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
      } else if (service === 'deepseek') {
        res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model || 'deepseek-chat',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok && !model) {
          res = await fetch('https://api.deepseek.com/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: 'deepseek-reasoner',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5
            })
          });
        }
      } else if (service === 'mistral') {
        res = await fetch('https://api.mistral.ai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model || 'mistral-small-latest',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
      } else if (service === 'groq') {
        const targetModel = model || 'openai/gpt-oss-120b';
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: targetModel,
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok && !model) {
          // Fallback to low GPT model (openai/gpt-oss-20b) or low Qwen model (qwen-2.5-32b)
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: 'openai/gpt-oss-20b',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5
            })
          });
          if (!res.ok) {
            res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${key}`
              },
              body: JSON.stringify({
                model: 'qwen-2.5-32b',
                messages: [{ role: 'user', content: 'ping' }],
                max_tokens: 5
              })
            });
            if (!res.ok) {
              res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${key}`
                },
                body: JSON.stringify({
                  model: 'gpt-oss-120b',
                  messages: [{ role: 'user', content: 'ping' }],
                  max_tokens: 5
                })
              });
            }
          }
        }
      } else if (service === 'openai') {
        res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`
          },
          body: JSON.stringify({
            model: model || 'gpt-4o-mini',
            messages: [{ role: 'user', content: 'ping' }],
            max_tokens: 5
          })
        });
        if (!res.ok && !model) {
          res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${key}`
            },
            body: JSON.stringify({
              model: 'gpt-4o',
              messages: [{ role: 'user', content: 'ping' }],
              max_tokens: 5
            })
          });
        }
      } else {
        return { success: false, reachable: false, error: `Unsupported provider: ${service}` };
      }

      const latencyMs = Date.now() - startTime;
      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        return { success: false, reachable: false, latencyMs, error: `HTTP ${res.status}: ${errText.slice(0, 100)}` };
      }
      return { success: true, reachable: true, latencyMs, provider: service };
    } catch (err) {
      const latencyMs = Date.now() - startTime;
      const isCors = service === 'openai' && (
        err instanceof TypeError || 
        err?.name === 'TypeError' ||
        err?.name === 'CORSBlockedError' ||
        (typeof err?.message === 'string' && (err.message.includes('fetch') || err.message.includes('CORS') || err.message.includes('NetworkError')))
      );
      if (isCors) {
        return {
          success: false,
          reachable: false,
          latencyMs,
          isCorsBlocked: true,
          error: 'CORS Blocked: OpenAI does not allow direct browser calls. Use OpenRouter instead.',
          recommendation: 'OpenRouter (openrouter.ai) proxies OpenAI models safely for browser applications.'
        };
      }
      return { success: false, reachable: false, latencyMs, error: err.message || 'Connection failed' };
    }
  }

  /**
   * Executes a prompt against a single specific provider.
   */
  async _callProviderEndpoint(service, key, prompt, system = null, options = {}) {
    // Acquire rate limit permit & runaway loop check
    if (this.rateLimiter) {
      await this.rateLimiter.acquire(service);
    }

    const messages = [];
    if (system) messages.push({ role: 'system', content: system });
    messages.push({ role: 'user', content: prompt });

    const temperature = typeof options?.temperature === 'number' ? options.temperature : 0.2;
    const frequencyPenalty = typeof options?.frequency_penalty === 'number' ? options.frequency_penalty : undefined;
    const presencePenalty = typeof options?.presence_penalty === 'number' ? options.presence_penalty : undefined;
    const isJsonRequested = !!(options?.schema || options?.json || options?.response_format);

    if (service === 'groq') {
      const targetModel = options?.model || 'openai/gpt-oss-120b';
      const payload = { model: targetModel, messages, temperature };
      if (frequencyPenalty !== undefined) payload.frequency_penalty = frequencyPenalty;
      if (presencePenalty !== undefined) payload.presence_penalty = presencePenalty;
      if (isJsonRequested) payload.response_format = { type: 'json_object' };
      let res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok && !options?.model) {
        // Fallback to low GPT model (openai/gpt-oss-20b) or low Qwen model (qwen-2.5-32b)
        payload.model = 'openai/gpt-oss-20b';
        res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok) {
          payload.model = 'qwen-2.5-32b';
          res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify(payload)
          });
          if (!res.ok) {
            payload.model = 'gpt-oss-120b';
            res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
              body: JSON.stringify(payload)
            });
          }
        }
      }
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.choices?.[0]?.message?.content || null;
      }
    }

    if (service === 'anthropic') {
      const targetModel = options?.model || 'claude-3-5-sonnet-20241022';
      const payload = {
        model: targetModel,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: options?.max_tokens || 2048,
        temperature
      };
      if (system) payload.system = system;
      let res = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': key,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok && !options?.model) {
        payload.model = 'claude-3-5-haiku-20241022';
        res = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': key,
            'anthropic-version': '2023-06-01',
            'anthropic-dangerous-direct-browser-access': 'true'
          },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.content?.[0]?.text || null;
      }
    }

    if (service === 'gemini') {
      const textPayload = system ? `${system}\n\n${prompt}` : prompt;
      const generationConfig = { temperature };
      if (frequencyPenalty !== undefined) generationConfig.frequencyPenalty = frequencyPenalty;
      if (presencePenalty !== undefined) generationConfig.presencePenalty = presencePenalty;
      if (isJsonRequested) {
        generationConfig.responseMimeType = 'application/json';
        if (options?.schema) {
          generationConfig.responseSchema = options.schema;
        }
      }
      const targetModel = options?.model || 'gemini-2.0-flash';
      let res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${targetModel}:generateContent?key=${key}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contents: [{ parts: [{ text: textPayload }] }], generationConfig })
      });
      if (!res.ok && !options?.model) {
        // Graceful fallback to gemini-1.5-flash, then gemini-1.5-pro on quota/rate-limit errors
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${key}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: [{ parts: [{ text: textPayload }] }], generationConfig })
        });
        if (!res.ok) {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-pro:generateContent?key=${key}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: [{ text: textPayload }] }], generationConfig })
          });
        }
      }
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.candidates?.[0]?.content?.parts?.[0]?.text || null;
      }
    }

    if (service === 'deepseek') {
      const targetModel = options?.model || 'deepseek-chat';
      const payload = { model: targetModel, messages, temperature };
      if (frequencyPenalty !== undefined) payload.frequency_penalty = frequencyPenalty;
      if (isJsonRequested) payload.response_format = { type: 'json_object' };
      let res = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(payload)
      });
      if (!res.ok && !options?.model) {
        payload.model = 'deepseek-reasoner';
        res = await fetch('https://api.deepseek.com/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.choices?.[0]?.message?.content || null;
      }
    }

    if (service === 'openrouter') {
      const targetModel = options?.model || 'qwen/qwen-2.5-coder-32b-instruct';
      const payload = { model: targetModel, messages, temperature };
      if (frequencyPenalty !== undefined) payload.frequency_penalty = frequencyPenalty;
      if (isJsonRequested) payload.response_format = { type: 'json_object' };
      let res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
          'HTTP-Referer': 'https://sprav-job-ai.local',
          'X-Title': 'SPrav Job AI'
        },
        body: JSON.stringify(payload)
      });
      if (!res.ok && !options?.model) {
        // Fallback to meta-llama/llama-3.3-70b-instruct on OpenRouter
        payload.model = 'meta-llama/llama-3.3-70b-instruct';
        res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${key}`,
            'HTTP-Referer': 'https://sprav-job-ai.local',
            'X-Title': 'SPrav Job AI'
          },
          body: JSON.stringify(payload)
        });
      }
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.choices?.[0]?.message?.content || null;
      }
    }

    if (service === 'mistral') {
      const payload = { model: 'mistral-small-latest', messages, temperature };
      if (isJsonRequested) payload.response_format = { type: 'json_object' };
      const res = await fetch('https://api.mistral.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.choices?.[0]?.message?.content || null;
      }
    }

    if (service === 'openai') {
      // OpenAI's standard chat completions endpoint does NOT send Access-Control-Allow-Origin
      // headers, so direct browser fetches will always be CORS-blocked. Detect this specifically
      // and surface an actionable message instead of silently falling through.
      try {
        const targetModel = options?.model || 'gpt-4o-mini';
        const payload = { model: targetModel, messages, temperature };
        if (frequencyPenalty !== undefined) payload.frequency_penalty = frequencyPenalty;
        if (presencePenalty !== undefined) payload.presence_penalty = presencePenalty;
        if (isJsonRequested) payload.response_format = { type: 'json_object' };
        let res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
          body: JSON.stringify(payload)
        });
        if (!res.ok && !options?.model) {
          payload.model = 'gpt-4o';
          res = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
            body: JSON.stringify(payload)
          });
        }
        if (res.ok) {
          const json = await parseResponseJson(res);
          return json?.choices?.[0]?.message?.content || null;
        }
        // Non-2xx but got a response (e.g. 401 invalid key) — return null to let failover handle it
        return null;
      } catch (corsErr) {
        // TypeError with no response typically means CORS preflight or network-level block
        if (corsErr instanceof TypeError) {
          const msg = '[Hybrid LLM] OpenAI Direct is CORS-blocked by the browser — ' +
            'OpenAI does not send Access-Control-Allow-Origin headers on their chat completions endpoint. ' +
            'Use OpenRouter (openrouter.ai) with an OpenAI model instead (e.g. openai/gpt-4o-mini or openai/gpt-4o).';
          console.warn(msg);

          if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
            try {
              window.dispatchEvent(new CustomEvent('sprav_llm_cors_blocked', {
                detail: {
                  provider: 'openai',
                  message: msg,
                  friendlyTitle: 'OpenAI Direct Blocked by Browser CORS',
                  description: 'OpenAI does not permit direct browser-to-API requests without a proxy. Please configure OpenRouter to use OpenAI models without CORS issues.',
                  recommendedProvider: 'openrouter'
                }
              }));
            } catch {}
          }

          // Throw a named error so _callProviderEndpointWithRetry skips the retry
          const e = new Error(msg);
          e.name = 'CORSBlockedError';
          throw e;
        }
        throw corsErr;
      }
    }

    return null;
  }

  /**
   * Invokes a cloud provider endpoint with one automatic retry after 1.5s
   * to gracefully overcome transient 429/503 rate limits and dropped connections.
   */
  async _callProviderEndpointWithRetry(service, key, prompt, system, options = {}) {
    const isTest = typeof process !== 'undefined' && (process.env?.NODE_ENV === 'test' || process.env?.VITEST);
    const backoffMs = isTest ? 10 : 1500;

    try {
      const res = await this._callProviderEndpoint(service, key, prompt, system, options);
      if (res) return res;
    } catch (e) {
      console.warn(`[Hybrid LLM] Initial attempt for ${service} failed:`, e);
      if (e?.name === 'CORSBlockedError' || e?.name === 'ByokRateLimitError' || e?.name === 'ByokRunawayLoopError') {
        return null;
      }
    }

    // Wait 1.5s (or 10ms in test runner) and retry once
    await new Promise(resolve => setTimeout(resolve, backoffMs));
    try {
      return await this._callProviderEndpoint(service, key, prompt, system, options);
    } catch (retryErr) {
      console.warn(`[Hybrid LLM] Retry for ${service} failed:`, retryErr);
      return null;
    }
  }

  /**
   * Direct in-browser call to client-configured cloud LLMs.
   * Dispatches according to preferred provider or cascades across all active BYOK keys.
   */
  async callClientCloudLLM(prompt, system = null, options = {}) {
    const preferred = this.getPreferredProvider();
    const allProviders = ['groq', 'gemini', 'anthropic', 'deepseek', 'openrouter', 'mistral', 'openai'];

    // 1. If preferred provider is explicitly specified, try it first
    if (preferred && preferred !== 'auto') {
      const key = await this.getCloudCredential(preferred);
      if (key) {
        try {
          const res = await this._callProviderEndpointWithRetry(preferred, key, prompt, system, options);
          if (res) return res;
        } catch (e) {
          console.warn(`[Hybrid LLM] Preferred provider (${preferred}) failed:`, e);
        }
      }
    }

    // 2. Cascade across all configured providers
    for (const service of allProviders) {
      if (service === preferred) continue; // already tried
      const key = await this.getCloudCredential(service);
      if (key) {
        try {
          const res = await this._callProviderEndpointWithRetry(service, key, prompt, system, options);
          if (res) return res;
        } catch (e) {
          console.warn(`[Hybrid LLM] Cloud provider (${service}) failed:`, e);
        }
      }
    }

    return null;
  }

  /**
   * Conversational completion for Copilot and interactive chat.
   */
  async generateChat(messages, systemPrompt = 'You are SPrav Copilot, a helpful AI career assistant.', onChunk = null, options = {}) {
    if (typeof onChunk === 'object' && onChunk !== null && Object.keys(options || {}).length === 0) {
      options = onChunk;
      onChunk = null;
    }
    const taskType = options?.taskType || 'chat';
    const temperature = typeof options?.temperature === 'number' ? options.temperature : 0.3;
    const frequencyPenalty = typeof options?.frequency_penalty === 'number' ? options.frequency_penalty : 0.0;
    const presencePenalty = typeof options?.presence_penalty === 'number' ? options.presence_penalty : 0.0;

    // Prefer client cloud BYOK for essay tasks if API key is configured
    if (taskType === 'essay' && await this.hasConfiguredCloudKey()) {
      const lastUserMsg = Array.isArray(messages)
        ? messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
        : String(messages);
      const recentHistory = Array.isArray(messages) ? messages.slice(-6) : [];
      const historyText = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
      const cloudPrompt = recentHistory.length > 1
        ? `Conversation so far:\n${historyText}`
        : lastUserMsg;
      const cloudRes = await this.callClientCloudLLM(cloudPrompt, systemPrompt, options);
      if (cloudRes) {
        const trimmed = cloudRes.trim();
        if (typeof onChunk === 'function') onChunk(trimmed, trimmed);
        return trimmed;
      }
    }

    // 1. Try in-browser WebGPU
    if (this.isReady()) {
      try {
        const chatMessages = [
          { role: 'system', content: systemPrompt },
          ...(Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }])
        ];
        const webGpuPayload = {
          messages: chatMessages,
          temperature
        };
        if (frequencyPenalty > 0) webGpuPayload.frequency_penalty = frequencyPenalty;
        if (presencePenalty > 0) webGpuPayload.presence_penalty = presencePenalty;
        if (options?.schema) {
          webGpuPayload.response_format = {
            type: 'json_object',
            schema: typeof options.schema === 'string' ? options.schema : JSON.stringify(options.schema)
          };
        } else if (options?.response_format) {
          webGpuPayload.response_format = options.response_format;
        } else if (options?.json) {
          webGpuPayload.response_format = { type: 'json_object' };
        }

        if (onChunk && typeof onChunk === 'function') {
          const stream = await this.engine.chat.completions.create({
            ...webGpuPayload,
            stream: true
          });
          let accumulated = '';
          for await (const chunk of stream) {
            const delta = chunk.choices?.[0]?.delta?.content || '';
            if (delta) {
              accumulated += delta;
              onChunk(delta, accumulated);
            }
          }
          if (accumulated) return accumulated.trim();
        } else {
          const response = await this.engine.chat.completions.create(webGpuPayload);
          const content = response.choices?.[0]?.message?.content;
          if (content) return content.trim();
        }
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU chat failed:', e);
      }
    }

    // 2. Try Localhost Ollama Bridge (uses local GPU with zero re-downloads)
    const enginePref = typeof localStorage !== 'undefined' ? localStorage.getItem('sprav_engine_preference') : null;
    const isLocalPreferred = !enginePref || enginePref === 'ollama' || enginePref === 'local';

    if (isLocalPreferred) {
      try {
        const isReachable = await this.checkOllamaReachable();
        if (isReachable) {
          const targetModel = this.getBestOllamaModel(taskType);
          const ollamaMessages = [
            { role: 'system', content: systemPrompt },
            ...(Array.isArray(messages) ? messages : [{ role: 'user', content: String(messages) }])
          ];
          const ollamaOptions = {
            temperature,
            ...(options?.repeat_penalty ? { repeat_penalty: options.repeat_penalty } : frequencyPenalty > 0 ? { repeat_penalty: 1.15 } : {})
          };
          const ollamaFormat = options?.schema ? options.schema : (options?.json || options?.response_format ? 'json' : undefined);

          if (onChunk && typeof onChunk === 'function' && typeof fetch !== 'undefined') {
            const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: targetModel,
                messages: ollamaMessages,
                stream: true,
                options: ollamaOptions,
                ...(ollamaFormat ? { format: ollamaFormat } : {})
              })
            });
            if (ollamaRes.ok && ollamaRes.body) {
              const reader = ollamaRes.body.getReader();
              const decoder = new TextDecoder();
              let accumulated = '';
              let done = false;
              while (!done) {
                const { value, done: readerDone } = await reader.read();
                done = readerDone;
                if (value) {
                  const chunkStr = decoder.decode(value, { stream: true });
                  const lines = chunkStr.split('\n').filter(Boolean);
                  for (const line of lines) {
                    try {
                      const json = safeJsonParse(line, null);
                      const delta = json?.message?.content || '';
                      if (delta) {
                        accumulated += delta;
                        onChunk(delta, accumulated);
                      }
                    } catch {}
                  }
                }
              }
              if (accumulated) return accumulated.trim();
            }
          } else {
            const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/chat`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                model: targetModel,
                messages: ollamaMessages,
                stream: false,
                options: ollamaOptions,
                ...(ollamaFormat ? { format: ollamaFormat } : {})
              })
            });
            if (ollamaRes.ok) {
              const data = await parseResponseJson(ollamaRes);
              if (data.message?.content) {
                if (typeof onChunk === 'function') onChunk(data.message.content, data.message.content);
                return data.message.content.trim();
              }
            }
          }
        }
      } catch (e) {
        console.warn('[Hybrid LLM] Direct Ollama chat attempt failed:', e);
      }
    }

    // 3. Try client-direct cloud LLM — send full conversation (last 6 messages for token budget)
    const lastUserMsg = Array.isArray(messages)
      ? messages.filter(m => m.role === 'user').slice(-1)[0]?.content || ''
      : String(messages);

    const recentHistory = Array.isArray(messages) ? messages.slice(-6) : [];
    const historyText = recentHistory.map(m => `${m.role}: ${m.content}`).join('\n');
    const cloudPrompt = recentHistory.length > 1
      ? `Conversation so far:\n${historyText}`
      : lastUserMsg;

    const cloudRes = await this.callClientCloudLLM(cloudPrompt, systemPrompt, options);
    if (cloudRes) {
      const trimmed = cloudRes.trim();
      if (onChunk) onChunk(trimmed, trimmed);
      return trimmed;
    }

    // 4. Try backend LLM
    const backendRes = await this.callBackendLLM(lastUserMsg, 'copilot', systemPrompt);
    if (backendRes) {
      const trimmed = backendRes.trim();
      if (onChunk) onChunk(trimmed, trimmed);
      return trimmed;
    }

    return null;
  }

  /**
   * Tier 3 Fallback: Dispatches request to the backend SPrav LLM Engine
   */
  async callBackendLLM(prompt, useCase = 'default', system = null) {
    try {
      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('sprav_token') : null;
      const apiBase = typeof window !== 'undefined' && window.location && window.location.origin
        ? window.location.origin
        : 'http://localhost:8000';
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }
      const res = await fetch(`${apiBase}/api/llm/generate`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ prompt, use_case: useCase, system })
      });
      if (res.ok) {
        const json = await parseResponseJson(res);
        return json?.response || null;
      }
    } catch (e) {
      console.warn('[Hybrid LLM] Backend LLM bridge failed:', e);
    }
    return null;
  }

  /**
   * General-purpose single-turn query across all available engines:
   * 1. In-browser WebGPU
   * 2. Localhost Ollama Bridge
   * 3. Client Cloud BYOK (Groq, Gemini, DeepSeek, etc.)
   * 4. Backend Engine Fallback
   */
  async queryModel(prompt, systemPrompt = null, options = {}) {
    // 1. Try local WebGPU if active
    if (this.isReady()) {
      try {
        const messages = [];
        if (systemPrompt) messages.push({ role: 'system', content: systemPrompt });
        messages.push({ role: 'user', content: prompt });
        const res = await this.engine.chat.completions.create({
          messages,
          temperature: typeof options?.temperature === 'number' ? options.temperature : 0.2,
          max_tokens: options?.max_tokens || 800
        });
        const content = res.choices?.[0]?.message?.content;
        if (content) return content;
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU queryModel failed, falling back:', e);
      }
    }

    // 2. Try Localhost Ollama Bridge
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          system: systemPrompt || undefined,
          prompt,
          stream: false,
          options: { temperature: typeof options?.temperature === 'number' ? options.temperature : 0.2 }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        if (json?.response) return json.response;
      }
    } catch {}

    // 3. Try In-Browser Client Cloud LLM (BYOK)
    try {
      const cloudRes = await this.callClientCloudLLM(prompt, systemPrompt, options);
      if (cloudRes) return cloudRes;
    } catch {}

    // 4. Try Backend LLM fallback
    try {
      const backendRes = await this.callBackendLLM(prompt, 'general', systemPrompt);
      if (backendRes) return backendRes;
    } catch {}

    return null;
  }

  /**
   * Deterministic cache key for candidate profile + JD combination.
   */
  _getAtsCacheKey(candidateProfile, jobDescription) {
    try {
      const skills = candidateProfile?.skills;
      const skillsStr = Array.isArray(skills) ? skills.sort().join(',') : JSON.stringify(skills || '');
      const title = candidateProfile?.personal?.title || candidateProfile?.title || '';
      const name = candidateProfile?.personal?.name || candidateProfile?.name || '';
      const jdSnippet = String(jobDescription || '').slice(0, 300).trim();
      let hash = 0x811c9dc5;
      const str = `${name}:${title}:${skillsStr}:::${jdSnippet}`;
      for (let i = 0; i < str.length; i++) {
        hash ^= str.charCodeAt(i);
        hash = Math.imul(hash, 0x01000193);
      }
      return `sprav_ats_cache_${(hash >>> 0).toString(36)}`;
    } catch {
      return null;
    }
  }

  _saveAtsCache(cacheKey, data) {
    if (cacheKey && data && typeof sessionStorage !== 'undefined') {
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(data));
      } catch {}
    }
  }

  /**
   * Primary dispatch: Runs ATS analysis via Deterministic Math + Micro-Agent Advice (<100 tokens).
   * WebGPU -> Local Ollama -> Client Cloud -> Deterministic Heuristics.
   * Completely eliminates 7B arithmetic hallucinations and KV-cache OOM on 8GB VRAM.
   */
  async analyzeAtsFit(candidateProfile, jobDescription) {
    // 1. Prompt Caching: Check sessionStorage for exact candidate + JD combination
    const cacheKey = this._getAtsCacheKey(candidateProfile, jobDescription);
    if (cacheKey && typeof sessionStorage !== 'undefined') {
      try {
        const cached = sessionStorage.getItem(cacheKey);
        if (cached) {
          const parsedCached = safeJsonParse(cached, null);
          if (parsedCached && typeof parsedCached.ats_score === 'number') {
            return {
              source: 'Session Cache (Instant)',
              model: 'Cached',
              data: parsedCached
            };
          }
        }
      } catch {}
    }

    // 2. Deterministic Fact-Checking & Scoring (0 tokens, 0ms, 100% mathematical accuracy)
    let safeJd = typeof jobDescription === 'string' ? jobDescription : JSON.stringify(jobDescription || '');
    if (safeJd.length > 2500) {
      safeJd = safeJd.slice(0, 2500);
    }
    const baseFit = calculateDeterministicAtsFit(candidateProfile, safeJd);

    // If candidate has no missing skills, return deterministic result immediately
    if (!baseFit.missing_skills || baseFit.missing_skills.length === 0) {
      this._saveAtsCache(cacheKey, baseFit);
      return {
        source: 'Deterministic Exact Engine',
        model: 'Deterministic',
        data: baseFit
      };
    }

    // 3. Surgical Micro-Prompt (<80 tokens) for gap-closure advice
    const topMissing = baseFit.missing_skills[0];
    const roleTitle = candidateProfile?.personal?.title || candidateProfile?.title || 'Software Engineer';
    const { systemPrompt, userPrompt } = buildMicroAtsAdvicePrompt(topMissing, roleTitle);

    // Tier 1. Try WebGPU in browser with surgical micro-prompt
    if (this.isReady()) {
      try {
        const response = await this.engine.chat.completions.create({
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.2,
          max_tokens: 60
        });
        const content = (response.choices[0]?.message?.content || '').trim().replace(/^["']|["']$/g, '');
        const parsed = parseAndSanitizeJSON(content, null);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.ats_score === 'number') baseFit.ats_score = parsed.ats_score;
          if (parsed.strategic_advice) baseFit.strategic_advice = parsed.strategic_advice;
          if (Array.isArray(parsed.matching_skills)) baseFit.matching_skills = parsed.matching_skills;
          if (Array.isArray(parsed.missing_skills)) baseFit.missing_skills = parsed.missing_skills;
        }
        if (content && content.length > 10 && !content.startsWith('{')) {
          baseFit.strategic_advice = content;
        }
        this._saveAtsCache(cacheKey, baseFit);
        return {
          source: 'WebGPU (Local VRAM)',
          model: this.activeModel,
          data: baseFit
        };
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU micro-prompt execution failed, attempting fallback:', e);
      }
    }

    // Tier 2. Try Localhost Ollama Bridge with surgical micro-prompt
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          system: systemPrompt,
          prompt: userPrompt,
          stream: false,
          options: { temperature: 0.2, num_predict: 60 }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        const raw = (json?.response || '').trim().replace(/^["']|["']$/g, '');
        const parsed = parseAndSanitizeJSON(raw, null);
        if (parsed && typeof parsed === 'object') {
          if (typeof parsed.ats_score === 'number') baseFit.ats_score = parsed.ats_score;
          if (parsed.strategic_advice) baseFit.strategic_advice = parsed.strategic_advice;
          if (Array.isArray(parsed.matching_skills)) baseFit.matching_skills = parsed.matching_skills;
          if (Array.isArray(parsed.missing_skills)) baseFit.missing_skills = parsed.missing_skills;
        }
        if (raw && raw.length > 10 && !raw.startsWith('{')) {
          baseFit.strategic_advice = raw;
        }
        this._saveAtsCache(cacheKey, baseFit);
        return {
          source: 'Localhost Ollama',
          model: this.getOllamaModelName(),
          data: baseFit
        };
      }
    } catch (e) {
      console.warn('[Hybrid LLM] Localhost Ollama bridge failed:', e);
    }

    // Tier 3. Try In-Browser Client Cloud LLM (Groq / Gemini with BYOK)
    try {
      const directCloudRes = await this.callClientCloudLLM(userPrompt, systemPrompt);
      if (directCloudRes && typeof directCloudRes === 'string' && directCloudRes.trim().length > 10) {
        const parsed = parseAndSanitizeJSON(directCloudRes, null);
        if (parsed && typeof parsed === 'object' && parsed.strategic_advice) {
          baseFit.strategic_advice = parsed.strategic_advice;
        } else {
          baseFit.strategic_advice = directCloudRes.trim().replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').replace(/^["']|["']$/g, '').trim();
        }
        this._saveAtsCache(cacheKey, baseFit);
        return {
          source: 'In-Browser Cloud LLM (BYOK)',
          model: this.getPreferredProvider(),
          data: baseFit
        };
      }
    } catch {}

    // Tier 3.5. Try Backend LLM Proxy (Cloud/Local) if running with backend
    try {
      const backendRes = await this.callBackendLLM(userPrompt, 'ats_analysis', systemPrompt);
      if (backendRes && typeof backendRes === 'string' && backendRes.trim().length > 0) {
        const parsedBackend = parseAndSanitizeJSON(backendRes, null);
        if (parsedBackend && typeof parsedBackend.ats_score === 'number') {
          this._saveAtsCache(cacheKey, parsedBackend);
          return {
            source: 'Backend Engine (Cloud/Local)',
            model: 'Backend LLM Proxy',
            data: parsedBackend
          };
        } else if (backendRes.trim().length > 10) {
          baseFit.strategic_advice = backendRes.trim().replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').replace(/^["']|["']$/g, '').trim();
          this._saveAtsCache(cacheKey, baseFit);
          return {
            source: 'Backend Engine (Cloud/Local)',
            model: 'Backend LLM Proxy',
            data: baseFit
          };
        }
      }
    } catch {}

    // Tier 4. Offline Fallback (Deterministic Rule-Based)
    this._saveAtsCache(cacheKey, baseFit);
    return {
      source: 'Offline Fallback (Deterministic)',
      model: 'Rule-Based',
      data: baseFit
    };
  }

  /**
   * Drafts a targeted 3-sentence application note.
   */
  async draftApplicationNote(candidateSummary, companyName, keyRequirements, options = {}) {
    const taskType = options?.taskType || 'essay';
    const targetTitle = options?.jobTitle || '';
    const prompt = buildApplicationNotePrompt(candidateSummary, companyName, keyRequirements);

    if (taskType === 'essay' && await this.hasConfiguredCloudKey()) {
      const directNote = await this.callClientCloudLLM(prompt, 'You write concise, authentic, 3-sentence application notes with no forbidden buzzwords.');
      if (directNote) {
        return {
          source: 'In-Browser Cloud LLM (BYOK)',
          text: humanizeAndSanitizeText(directNote.trim(), { companyName, jobTitle: targetTitle })
        };
      }
    }

    if (this.isReady()) {
      try {
        const response = await this.engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          max_tokens: 300
        });
        return {
          source: 'WebGPU (Local VRAM)',
          text: humanizeAndSanitizeText(response.choices[0]?.message?.content?.trim() || '', { companyName, jobTitle: targetTitle })
        };
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU note drafting failed:', e);
      }
    }

    // Localhost Ollama Fallback
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          prompt: prompt,
          stream: false,
          options: { temperature: 0.3 }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        return {
          source: 'Localhost Ollama',
          text: humanizeAndSanitizeText(json?.response?.trim() || '', { companyName, jobTitle: targetTitle })
        };
      }
    } catch {
      // Fallback
    }

    // In-Browser Client Cloud LLM Fallback (Groq / Gemini with BYOK)
    const directNote = await this.callClientCloudLLM(prompt, 'You write concise, authentic, 3-sentence application notes with no forbidden buzzwords.');
    if (directNote) {
      return {
        source: 'In-Browser Cloud LLM (BYOK)',
        text: humanizeAndSanitizeText(directNote.trim(), { companyName, jobTitle: targetTitle })
      };
    }

    // Backend SPrav Engine Fallback
    const backendNote = await this.callBackendLLM(prompt, 'application_note');
    if (backendNote) {
      return {
        source: 'Backend Engine (Cloud/Local)',
        text: humanizeAndSanitizeText(backendNote.trim(), { companyName, jobTitle: targetTitle })
      };
    }

    const cleanReqs = String(keyRequirements || '').replace(/[\]["]/g, '').trim();
    const reqSnippet = cleanReqs ? ` around ${cleanReqs.split(/[,;\n]+/).slice(0, 2).map(s => s.trim()).join(' and ')}` : '';
    const safeComp = companyName || 'your team';
    const noteText = `I noticed ${safeComp}'s technical priorities${reqSnippet} align directly with systems I have designed and delivered in production. I focus on concrete operational metrics, clean architecture, and rapid execution. Happy to discuss how this experience can accelerate your current deliverables.`;

    return {
      source: 'Template Fallback',
      text: humanizeAndSanitizeText(noteText, { companyName, jobTitle: targetTitle })
    };
  }

  /**
   * Drafts an authentic, publication-grade executive cover letter structured around Thematic Beats.
   * Leverages retrieval-grounded style anchors and STAR story bank with elevated creative temperature.
   */
  async draftCoverLetter(candidateSummary, companyName, jobTitle, jobRequirements, options = {}) {
    const taskType = options?.taskType || 'essay';
    const temperature = typeof options?.temperature === 'number' ? options.temperature : SAMPLING_PROFILES.COVER_LETTER.temperature;
    const frequencyPenalty = typeof options?.frequency_penalty === 'number' ? options.frequency_penalty : SAMPLING_PROFILES.COVER_LETTER.frequency_penalty;
    const presencePenalty = typeof options?.presence_penalty === 'number' ? options.presence_penalty : SAMPLING_PROFILES.COVER_LETTER.presence_penalty;

    // Resolve candidate Knowledge Base to pull persona (career level and title)
    const kb = options?.candidateKb || options?.kb || (storageVault.getKnowledgeBase ? await storageVault.getKnowledgeBase().catch(() => null) : null) || {};
    const candidateTitle = kb?.personal?.title || kb?.title || kb?.personal?.headline || kb?.headline || 'Engineer';
    const careerLevel = kb?.career_level || kb?.personal?.career_level || kb?.seniority || kb?.experience_level || 'Experienced';
    const personaSystemPrompt = `You are an authentic ${careerLevel} ${candidateTitle} drafting an executive, publication-grade technical cover letter. Write in first person with genuine technical conviction and zero corporate clichés.

Target Reference Output (Few-Shot Exemplar):
"Engineering high-throughput data pipelines taught me that developer velocity depends on low-latency infrastructure. At my previous team, I redesigned our event processing architecture, cutting p99 latency by 45% while scaling throughput across our distributed mesh. Your team's standard of high reliability and operational efficiency matches my technical focus. I welcome the opportunity to discuss how my systems background can support your roadmap."`;

    const tone = options?.tone || 'confident';

    // Retrieve style anchor from exemplar resumes & STAR story bank
    const styleAnchor = retrieveStyleAnchor(jobTitle, jobRequirements, kb, options?.starStories);
    const prompt = buildThematicCoverLetterPrompt({
      candidateSummary,
      companyName,
      jobTitle,
      jobRequirements,
      styleAnchor,
      candidateTitle,
      careerLevel,
      tone
    });

    const generationOptions = {
      taskType,
      temperature,
      frequency_penalty: frequencyPenalty,
      presence_penalty: presencePenalty
    };

    if (taskType === 'essay' && await this.hasConfiguredCloudKey()) {
      const directCover = await this.callClientCloudLLM(
        prompt,
        personaSystemPrompt,
        generationOptions
      );
      if (directCover) {
        return {
          source: 'In-Browser Cloud LLM (BYOK)',
          text: humanizeAndSanitizeText(directCover.trim(), { companyName, jobTitle })
        };
      }
    }

    if (this.isReady()) {
      try {
        const response = await this.engine.chat.completions.create({
          messages: [
            { role: 'system', content: personaSystemPrompt },
            { role: 'user', content: prompt }
          ],
          temperature,
          frequency_penalty: frequencyPenalty,
          presence_penalty: presencePenalty,
          max_tokens: 650
        });
        return {
          source: 'WebGPU (Local VRAM)',
          text: humanizeAndSanitizeText(response.choices[0]?.message?.content?.trim() || '', { companyName, jobTitle })
        };
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU cover letter drafting failed:', e);
      }
    }

    // Localhost Ollama Fallback
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          prompt: prompt,
          stream: false,
          options: { temperature, repeat_penalty: 1.15 }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        return {
          source: 'Localhost Ollama',
          text: humanizeAndSanitizeText(json?.response?.trim() || '', { companyName, jobTitle })
        };
      }
    } catch {
      // Fallback
    }

    // In-Browser Client Cloud LLM Fallback (Groq / Gemini with BYOK)
    const directNote = await this.callClientCloudLLM(
      prompt,
      'You write authentic, thematic cover letters with strict anti-buzzword rules.',
      generationOptions
    );
    if (directNote) {
      return {
        source: 'In-Browser Cloud LLM (BYOK)',
        text: humanizeAndSanitizeText(directNote.trim(), { companyName, jobTitle })
      };
    }

    // Backend SPrav Engine Fallback
    const backendNote = await this.callBackendLLM(prompt, 'cover_letter');
    if (backendNote) {
      return {
        source: 'Backend Engine (Cloud/Local)',
        text: humanizeAndSanitizeText(backendNote.trim(), { companyName, jobTitle })
      };
    }

    return {
      source: 'Template Fallback',
      text: generateThematicFallbackCoverLetter({
        candidateSummary,
        companyName,
        jobTitle,
        jobRequirements,
        candidateKb: kb,
        tone
      })
    };
  }

  /**
   * Refines a candidate's resume bullet point for a specific job using surgical micro-prompts (<250 tokens)
   * grounded in deterministic skill detection and verified candidate STAR accomplishments.
   */
  async optimizeBullet(candidateBullet, targetJD, options = {}) {
    let starOutcome = options.starOutcome || null;
    let targetSkill = options.targetSkill || null;

    // Grounding: If starOutcome is not provided, look for candidate STAR stories to anchor real metrics
    if (!starOutcome) {
      try {
        const kb = options.candidateKb || options.kb || (storageVault.getKnowledgeBase ? await storageVault.getKnowledgeBase().catch(() => null) : null);
        const starStories = options.starStories || kb?.star_stories || [];
        if (Array.isArray(starStories) && starStories.length > 0) {
          const relevant = findRelevantStarStories(`${candidateBullet} ${targetJD}`, starStories, { topK: 1 });
          if (relevant && relevant[0]?.story?.result) {
            starOutcome = relevant[0].story.result;
          }
        }
      } catch {}
    }

    const promptOptions = {
      ...options,
      targetSkill,
      starOutcome
    };

    const prompt = buildBulletOptimizerPrompt(candidateBullet, targetJD, promptOptions);

    if (this.isReady()) {
      try {
        const response = await this.engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: SAMPLING_PROFILES.BULLET_OPTIMIZATION.temperature,
          frequency_penalty: SAMPLING_PROFILES.BULLET_OPTIMIZATION.frequency_penalty,
          max_tokens: 200,
          response_format: {
            type: 'json_object',
            schema: JSON.stringify(BULLET_REWRITE_SCHEMA)
          }
        });
        const rawContent = response.choices[0]?.message?.content?.trim();
        let polished = candidateBullet;
        if (rawContent) {
          const parsed = parseAndSanitizeJSON(rawContent, null);
          polished = parsed?.polished_bullet || parsed?.bullet || rawContent.replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
        }
        const audit = verifyBulletAntiHallucination(candidateBullet, polished);
        return {
          source: 'WebGPU (Local VRAM)',
          bullet: polished || candidateBullet,
          audit
        };
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU bullet optimization failed:', e);
      }
    }

    // Localhost Ollama Fallback
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          prompt: prompt,
          stream: false,
          format: BULLET_REWRITE_SCHEMA,
          options: {
            temperature: SAMPLING_PROFILES.BULLET_OPTIMIZATION.temperature,
            repeat_penalty: 1.15
          }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        const resText = json?.response?.trim();
        let polished = candidateBullet;
        if (resText) {
          const parsed = parseAndSanitizeJSON(resText, null);
          polished = parsed?.polished_bullet || parsed?.bullet || resText.replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
        }
        const audit = verifyBulletAntiHallucination(candidateBullet, polished);
        return {
          source: 'Localhost Ollama',
          bullet: polished || candidateBullet,
          audit
        };
      }
    } catch {
      // Fallback
    }

    // In-Browser Client Cloud LLM Fallback (Groq / Gemini with BYOK)
    const directBullet = await this.callClientCloudLLM(prompt, 'Refine this resume bullet point to align with the job description. Return only the single refined bullet.');
    if (directBullet) {
      const parsed = parseAndSanitizeJSON(directBullet, null);
      const cleanDirect = (parsed?.polished_bullet || parsed?.bullet || directBullet).trim().replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').replace(/^["']|["']$/g, '').trim();
      const audit = verifyBulletAntiHallucination(candidateBullet, cleanDirect);
      return {
        source: 'In-Browser Cloud LLM (BYOK)',
        bullet: cleanDirect,
        audit
      };
    }

    // Backend SPrav Engine Fallback
    const backendBullet = await this.callBackendLLM(prompt, 'bullet');
    if (backendBullet) {
      let polished = backendBullet.trim().replace(/^["']|["']$/g, '');
      const parsed = parseAndSanitizeJSON(backendBullet, null);
      if (parsed?.polished_bullet || parsed?.bullet) {
        polished = parsed.polished_bullet || parsed.bullet;
      } else {
        polished = backendBullet.replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
      }
      const audit = verifyBulletAntiHallucination(candidateBullet, polished);
      return {
        source: 'Backend Engine (Cloud/Local)',
        bullet: polished,
        audit
      };
    }

    return {
      source: 'Original',
      bullet: candidateBullet,
      audit: { isClean: true, warnings: [], metricsPreserved: true }
    };
  }

  /**
   * Answers screening question: WebGPU -> Localhost Ollama -> Client Cloud -> Backend Engine -> Heuristic
   */
  async answerScreeningQuestion(question, candidateProfile, archetype = 'custom') {
    const prompt = buildScreeningAnswerPrompt(question, candidateProfile, archetype);

    if (this.isReady()) {
      try {
        const response = await this.engine.chat.completions.create({
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.1,
          max_tokens: 250,
          response_format: {
            type: 'json_object',
            schema: JSON.stringify(SCREENING_ANSWER_SCHEMA)
          }
        });
        const raw = response.choices[0]?.message?.content?.trim() || '';
        const parsed = parseAndSanitizeJSON(raw, null);
        const finalAns = (parsed?.answer || raw).replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
        return {
          source: 'WebGPU (Local VRAM)',
          answer: finalAns
        };
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU screening question answering failed:', e);
      }
    }

    // Localhost Ollama Fallback
    try {
      const ollamaRes = await fetch(`${this._getOllamaBaseUrl()}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.getOllamaModelName(),
          prompt: prompt,
          stream: false,
          format: SCREENING_ANSWER_SCHEMA,
          options: { temperature: 0.1 }
        })
      });
      if (ollamaRes.ok) {
        const json = await parseResponseJson(ollamaRes);
        const raw = json?.response?.trim() || '';
        const parsed = parseAndSanitizeJSON(raw, null);
        const finalAns = (parsed?.answer || raw).replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
        return {
          source: 'Localhost Ollama',
          answer: finalAns
        };
      }
    } catch {
      // Fallback
    }

    // In-Browser Client Cloud LLM Fallback (Groq / Gemini with BYOK)
    const directScreening = await this.callClientCloudLLM(prompt, 'Answer this screening question truthfully based only on the candidate profile. Return only the direct answer.');
    if (directScreening) {
      const parsed = parseAndSanitizeJSON(directScreening, null);
      const finalAns = (parsed?.answer || directScreening).trim().replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
      return {
        source: 'In-Browser Cloud LLM (BYOK)',
        answer: finalAns
      };
    }

    // Backend SPrav Engine Fallback
    const backendAnswer = await this.callBackendLLM(prompt, 'screening');
    if (backendAnswer) {
      const parsed = parseAndSanitizeJSON(backendAnswer, null);
      const finalAns = (parsed?.answer || backendAnswer).trim().replace(/^```(?:json)?\s*\n?/gim, '').replace(/\n?```\s*$/gim, '').trim();
      return {
        source: 'Backend Engine (Cloud/Local)',
        answer: finalAns
      };
    }

    return {
      source: 'Profile Heuristic',
      answer: candidateProfile && typeof candidateProfile === 'object' && candidateProfile[archetype]
        ? String(candidateProfile[archetype])
        : 'Authorized to work without sponsorship'
    };
  }

  /**
   * Two-Pass Reasoning & Schema Packing Micro-Chain:
   * Pass 1: Reasoning in free prose at reasoning profile (temperature ~0.6).
   *         Allows the 7B model full cognitive headroom for nuance, trade-offs, and depth.
   * Pass 2: Schema packaging at schema packing profile (temperature ~0.05) with XGrammar schema constraint.
   *         Guarantees 100% valid JSON conforming to the requested schema.
   *
   * @param {Object} params
   * @param {string} params.reasoningPrompt - Unconstrained analytical prompt
   * @param {string} [params.reasoningSystem] - System instructions for analytical pass
   * @param {Object} params.schema - JSON Schema for the second-pass packaging
   * @param {string} [params.formatSystem] - System instructions for schema packaging
   * @param {Object} [params.options] - Custom options and overrides
   * @returns {Promise<{ rawReasoning: string, rawFormatted: string, parsed: Object|null }>}
   */
  async runReasoningThenFormatChain({
    reasoningPrompt,
    reasoningSystem = 'You are a principal technical career strategist. Think deeply, analyze trade-offs, and produce a thorough, factual reasoning assessment in plain prose. Strictly avoid synthetic catchphrases (e.g. "28ms p99 latency", "idempotent replay across 6 product teams"). Ground all analysis in candidate facts.',
    schema,
    formatSystem = 'You are a strict data formatting engine. Package the analysis into valid JSON conforming strictly to the requested schema. Output ONLY valid JSON. Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.',
    options = {}
  }) {
    const reasoningSampling = {
      ...SAMPLING_PROFILES.REASONING,
      taskType: options?.taskType || 'reasoning',
      ...options?.reasoningOptions
    };

    const rawReasoning = await this.generateChat(
      [{ role: 'user', content: reasoningPrompt }],
      reasoningSystem,
      null,
      reasoningSampling
    ) || '';

    const packagingPrompt = `Context & Instructions:\n${reasoningPrompt.slice(0, 1000)}\n\nDetailed Analysis:\n${rawReasoning}\n\nTask: Package the above analytical findings into the required JSON schema structure. Output ONLY valid JSON.`;

    const packingSampling = {
      ...SAMPLING_PROFILES.SCHEMA_PACKING,
      schema,
      ...options?.packingOptions
    };

    const rawFormatted = await this.generateChat(
      [{ role: 'user', content: packagingPrompt }],
      formatSystem,
      null,
      packingSampling
    ) || '';

    const parsed = parseAndSanitizeJSON(rawFormatted, null);
    return {
      rawReasoning,
      rawFormatted,
      parsed
    };
  }

  /**
   * Compact 4-Stage Sequential Micro-Chain Architecture (Extract → Validate → Compare → Suggest)
   * Engineered specifically for 7B and edge models that fail on monolithic prompts.
   *
   * Stage 1 (Extract): Fast-path deterministic regex classification first; LLM + XGrammar for ambiguous JDs.
   * Stage 2 (Validate): Deterministically cleanses, bounds, and normalizes schema to prevent hallucinations.
   * Stage 3 (Compare): Cross-references validated requirements against candidate verified profile facts.
   * Stage 4 (Suggest): Generates ONE 35-word tactical micro-move (0 buzzwords, plain text).
   */
  async executeMicroChainPipeline(jobDescription = '', candidateKb = {}, onStepUpdate = null) {
    const notify = (step, stage, status, data) => {
      if (typeof onStepUpdate === 'function') {
        try {
          const payload = {
            step,
            stage,
            status,
            data,
            node: `node${step}`
          };
          payload.toString = () => `node${step}`;
          payload.valueOf = () => step;
          onStepUpdate(payload);
        } catch {}
      }
    };

    const cleanJd = typeof jobDescription === 'string' ? jobDescription.slice(0, 1800) : '';
    const candidateSkills = Array.isArray(candidateKb?.skills)
      ? candidateKb.skills
      : typeof candidateKb?.skills === 'object'
        ? Object.values(candidateKb.skills || {}).flat()
        : [];

    let node1_jd = null;
    let node2_gaps = null;
    let node3_action = '';
    let source = 'Offline Pipeline Engine';

    // ── STAGE 1: EXTRACT (JD Requirements) ──────────────────────────────────
    notify(1, 'EXTRACT', 'running', { message: 'Stage 1 [Extract]: Extracting must-have technical competencies & seniority...' });
    
    // Fast-path: Check deterministic regex classification first
    const deterministicExtraction = classifyRequirementsDeterministically(cleanJd);
    if (deterministicExtraction?.isConfident && deterministicExtraction.result?.must_have_skills?.length >= 2) {
      node1_jd = {
        must_have_skills: deterministicExtraction.result.must_have_skills.map(s => s.toLowerCase()),
        minimum_years: deterministicExtraction.result.minimum_years,
        level: deterministicExtraction.result.level
      };
      source = 'Deterministic Fast-Path Engine';
    } else {
      const extractPrompt = buildMicroExtractPrompt(cleanJd);
      try {
        const n1Raw = await this.generateChat(
          [{ role: 'user', content: extractPrompt }],
          'You are a technical JD parser. Output ONLY valid JSON matching the schema with must_have_skills, minimum_years, and level. Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.',
          null,
          { ...SAMPLING_PROFILES.EXTRACTION, schema: JD_COMPETENCY_SCHEMA }
        );
        if (n1Raw) {
          node1_jd = parseAndSanitizeJSON(n1Raw, null);
          if (node1_jd && Array.isArray(node1_jd.must_have_skills)) {
            source = 'AI Micro-Chain (XGrammar Constrained)';
          }
        }
      } catch (e) {
        console.warn('[Hybrid LLM] Micro-Chain Stage 1 (Extract) failed:', e);
      }
    }

    // ── STAGE 2: VALIDATE (Sanitize & Enforce Bounds) ─────────────────────────
    notify(2, 'VALIDATE', 'running', { message: 'Stage 2 [Validate]: Cleansing requirements and bounding schema...' });
    
    // Deterministic validation & fallback
    const lowerJd = cleanJd.toLowerCase();
    const commonTech = ['python', 'javascript', 'typescript', 'react', 'node.js', 'go', 'rust', 'docker', 'kubernetes', 'aws', 'sql', 'postgresql', 'fastapi', 'kafka', 'redis', 'graphql', 'system design'];
    const matchedTech = commonTech.filter(t => lowerJd.includes(t));
    const yoeMatch = lowerJd.match(/(\d+)\+?\s*years?/);
    const fallbackYoe = yoeMatch ? parseInt(yoeMatch[1], 10) : (lowerJd.includes('senior') ? 5 : lowerJd.includes('lead') || lowerJd.includes('staff') ? 8 : 2);
    const fallbackLevel = fallbackYoe >= 8 || lowerJd.includes('staff') || lowerJd.includes('principal')
      ? 'staff'
      : fallbackYoe >= 5 || lowerJd.includes('senior')
        ? 'senior'
        : fallbackYoe >= 2
          ? 'mid'
          : 'entry';

    if (!node1_jd || !Array.isArray(node1_jd.must_have_skills) || node1_jd.must_have_skills.length === 0) {
      node1_jd = {
        must_have_skills: matchedTech.length > 0 ? matchedTech : ['Software Engineering', 'System Design'],
        minimum_years: fallbackYoe,
        level: fallbackLevel
      };
    } else {
      // Validate extracted fields: bound array length to max 12 items, strip generic noise words
      const noiseWords = new Set(['communication', 'team player', 'motivated', 'hard worker', 'detail-oriented', 'passion', 'attitude']);
      node1_jd.must_have_skills = node1_jd.must_have_skills
        .map(s => String(s).trim())
        .filter(s => s.length > 1 && !noiseWords.has(s.toLowerCase()))
        .slice(0, 12);
      
      if (node1_jd.must_have_skills.length === 0) {
        node1_jd.must_have_skills = matchedTech.length > 0 ? matchedTech : ['Software Engineering', 'System Design'];
      }
      if (typeof node1_jd.minimum_years !== 'number' || isNaN(node1_jd.minimum_years)) {
        node1_jd.minimum_years = fallbackYoe;
      }
      if (!['entry', 'mid', 'senior', 'staff'].includes(node1_jd.level)) {
        node1_jd.level = fallbackLevel;
      }
    }
    notify(2, 'VALIDATE', 'complete', node1_jd);

    // ── STAGE 3: COMPARE (Profile Cross-Reference) ───────────────────────────
    notify(3, 'COMPARE', 'running', { message: 'Stage 3 [Compare]: Cross-referencing candidate verified skills against requirements...' });
    const comparePrompt = buildMicroComparePrompt(node1_jd, candidateSkills);

    try {
      const n2Raw = await this.generateChat(
        [{ role: 'user', content: comparePrompt }],
        'You are an ATS rubric auditor. Output ONLY valid JSON matching the schema with gaps, strengths, and recommendation_priority. Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.',
        null,
        { ...SAMPLING_PROFILES.SCORING, schema: ATS_AUDIT_SCHEMA }
      );
      if (n2Raw) {
        node2_gaps = parseAndSanitizeJSON(n2Raw, null);
      }
    } catch (e) {
      console.warn('[Hybrid LLM] Micro-Chain Stage 3 (Compare) failed:', e);
    }

    if (!node2_gaps || !Array.isArray(node2_gaps.gaps)) {
      // Heuristic Fallback for Stage 3
      const candidateSet = new Set(candidateSkills.map(s => String(s).toLowerCase().trim()));
      const strengths = [];
      const gaps = [];
      for (const skill of node1_jd.must_have_skills) {
        if (candidateSet.has(skill.toLowerCase().trim())) {
          strengths.push(skill);
        } else {
          gaps.push(skill);
        }
      }
      node2_gaps = {
        gaps,
        strengths,
        recommendation_priority: gaps.length > 2 ? 'skill' : 'bullet'
      };
    }
    notify(3, 'COMPARE', 'complete', node2_gaps);

    // ── STAGE 4: SUGGEST (10-Minute Tactical Micro-Move) ──────────────────────
    notify(4, 'SUGGEST', 'running', { message: 'Stage 4 [Suggest]: Synthesizing high-leverage 10-minute tactical micro-action...' });
    const topGap = node2_gaps.gaps?.[0] || 'domain alignment';
    const actionPrompt = buildMicroActionPrompt(topGap, node1_jd.level);

    try {
      const n3Raw = await this.generateChat(
        [{ role: 'user', content: actionPrompt }],
        'You are an executive career coach. Return ONE tactical micro-action.',
        null,
        { ...SAMPLING_PROFILES.EXTRACTION, schema: MICRO_ACTION_SCHEMA }
      );
      if (n3Raw && n3Raw.length > 10) {
        const parsedAction = parseAndSanitizeJSON(n3Raw, null);
        if (parsedAction?.recommended_action) {
          node3_action = parsedAction.recommended_action;
        } else if (!n3Raw.trim().startsWith('{')) {
          node3_action = n3Raw.trim();
        }
      }
    } catch (e) {
      console.warn('[Hybrid LLM] Micro-Chain Stage 4 (Suggest) failed:', e);
    }

    if (!node3_action) {
      node3_action = `Add a quantified work bullet showcasing hands-on deployment of ${topGap} to satisfy the primary qualification for this ${node1_jd.level} role.`;
    }
    notify(4, 'SUGGEST', 'complete', { action: node3_action });

    const node1 = {
      seniorityLevel: node1_jd.level ? (node1_jd.level.charAt(0).toUpperCase() + node1_jd.level.slice(1)) : 'Senior',
      mustHaves: node1_jd.must_have_skills || [],
      minimumYears: node1_jd.minimum_years || 0
    };

    const node2 = {
      strengths: node2_gaps.strengths || [],
      criticalGaps: node2_gaps.gaps || [],
      recommendationPriority: node2_gaps.recommendation_priority || 'bullet'
    };

    const node3 = {
      tenMinuteAction: node3_action
    };

    return {
      extract: node1_jd,
      validate: node1_jd,
      compare: node2_gaps,
      suggest: { action: node3_action },
      // Direct UI node bindings for JobDetailsModal and inspection panels
      node1,
      node2,
      node3,
      // Backwards-compatible aliases
      node1_jd,
      node2_gaps,
      node3_action,
      source
    };
  }

  /**
   * Backwards-compatible entrypoint for runAnalysisPipeline
   */
  async runAnalysisPipeline(jobDescription = '', candidateKb = {}, onStepUpdate = null) {
    return this.executeMicroChainPipeline(jobDescription, candidateKb, onStepUpdate);
  }

  /**
   * Micro-Chain Resume Bullet Optimizer:
   * 1. Extract: Parses candidate bullet & identifies target skill deterministically
   * 2. Validate: Anti-hallucination metric anchor check
   * 3. Compare: Match with target JD keyword & verified STAR outcome
   * 4. Suggest: Single rewritten bullet starting with strong past-tense verb (<25 words)
   */
  async polishBulletMicroChain(candidateBullet = '', targetJdSnippet = '', options = {}) {
    if (!candidateBullet || typeof candidateBullet !== 'string') return '';
    const cleanBullet = candidateBullet.trim();
    if (!cleanBullet) return '';

    // Fast-path: When WebGPU engine is ready, dispatch through optimizeBullet with surgical micro-prompting
    if (this.isReady()) {
      try {
        const optRes = await this.optimizeBullet(cleanBullet, targetJdSnippet, options);
        if (optRes?.bullet && optRes.bullet !== cleanBullet) {
          return optRes.bullet;
        }
      } catch (e) {
        console.warn('[Hybrid LLM] WebGPU micro-chain optimizeBullet failed, falling back:', e);
      }
    }

    const prompt = buildMicroBulletPrompt(cleanBullet, targetJdSnippet);
    try {
      const raw = await this.generateChat(
        [{ role: 'user', content: prompt }],
        'You are an elite resume editor. Rewrite the bullet in under 25 words with a strong past-tense verb and real metrics from the candidate. Never hallucinate fake metrics or synthetic catchphrases like "28ms p99 latency" or "6 product teams". Return ONLY the bullet.',
        null,
        { taskType: 'code' }
      );
      if (raw && raw.trim().length > 10) {
        let cleaned = raw.trim().replace(/^["']|["']$/g, '');
        // Extract prose if LLM returned structured JSON
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
          try {
            const parsed = safeJsonParse(cleaned, null);
            if (parsed?.polished_bullet || parsed?.bullet) {
              cleaned = parsed.polished_bullet || parsed.bullet;
            }
          } catch {}
        }
        if (!cleaned.startsWith('{') && !cleaned.startsWith('[')) {
          // Verify anti-hallucination: preserve existing metrics from original bullet
          const verdict = verifyBulletAntiHallucination(cleanBullet, cleaned);
          if (verdict.isClean || verdict.metricsPreserved) {
            return cleaned;
          }
        }
      }
    } catch (e) {
      console.warn('[Hybrid LLM] polishBulletMicroChain AI failed, using rule-based polish:', e);
    }

    // Rule-based deterministic polish fallback
    const verbs = ['Architected', 'Engineered', 'Spearheaded', 'Optimized', 'Deployed'];
    const selectedVerb = verbs[Math.abs(cleanBullet.length) % verbs.length];
    const stripped = cleanBullet.replace(/^(?:helped with|worked on|responsible for|participated in|assisted with)\s+/i, '');
    const capitalized = stripped.charAt(0).toUpperCase() + stripped.slice(1);
    return `${selectedVerb} ${capitalized.charAt(0).toLowerCase() + capitalized.slice(1)}`;
  }

  /**
   * Micro-Chain Recruiter Outreach Generator:
   * 1. Extract: Role challenge & company
   * 2. Validate: Anchor candidate metric from KB
   * 3. Compare: Map candidate capability to company challenge
   * 4. Suggest: 3-sentence direct outreach note (<60 words, 0 buzzwords)
   */
  async generateOutreachMicroChain(targetRole = '', company = '', candidateKb = {}) {
    const safeRole = targetRole || 'Software Engineer';
    const safeCompany = company || 'your team';
    
    // Find candidate anchor strength from KB
    const skills = Array.isArray(candidateKb?.skills)
      ? candidateKb.skills
      : Object.values(candidateKb?.skills || {}).flat();
    const topStrength = skills[0] || 'distributed systems architecture';

    const prompt = buildMicroOutreachPrompt(safeCompany, safeRole, topStrength);
    try {
      const raw = await this.generateChat(
        [{ role: 'user', content: prompt }],
        'You are a senior tech candidate writing a direct, authentic note to an engineering hiring manager. 0 buzzwords. Never fabricate synthetic statistics like "28ms p99 latency" or "idempotent replay".',
        null,
        {
          taskType: 'outreach',
          temperature: SAMPLING_PROFILES.OUTREACH.temperature,
          frequency_penalty: SAMPLING_PROFILES.OUTREACH.frequency_penalty,
          presence_penalty: SAMPLING_PROFILES.OUTREACH.presence_penalty
        }
      );
      if (raw && raw.trim().length > 20) {
        const cleaned = raw.trim().replace(/^["']|["']$/g, '');
        if (cleaned.startsWith('{') || cleaned.startsWith('[')) {
          console.warn('[Hybrid LLM] generateOutreachMicroChain received raw JSON — falling back to deterministic template.');
        } else {
          return humanizeAndSanitizeText(cleaned, { companyName: safeCompany, jobTitle: safeRole });
        }
      }
    } catch (e) {
      console.warn('[Hybrid LLM] generateOutreachMicroChain AI failed, using deterministic template:', e);
    }

    return humanizeAndSanitizeText(
      `I came across the ${safeRole} role at ${safeCompany} and wanted to reach out directly. My engineering background centers on ${topStrength}, where I recently delivered systems that improved performance and scale. I would welcome 10 minutes to discuss how my technical approach aligns with your team's roadmap.`,
      { companyName: safeCompany, jobTitle: safeRole }
    );
  }

  /**
   * Executes a generator function that produces JSON, validating against validatorFn.
   * If validation fails, triggers an automated repair prompt.
   */
  async callWithSelfCorrection(generatorFn, validatorFn, maxRetries = 1) {
    let result = await generatorFn();
    let isValid = false;
    let errorMsg = '';

    try {
      isValid = Boolean(validatorFn(result));
    } catch (err) {
      isValid = false;
      errorMsg = err.message || String(err);
    }

    if (isValid) return result;

    if (maxRetries > 0) {
      try {
        const repairPrompt = `Your previous output failed validation: ${errorMsg || 'Invalid schema or unparseable JSON'}.
Previous raw output:
${typeof result === 'string' ? result.slice(0, 500) : JSON.stringify(result).slice(0, 500)}

Please correct it and output ONLY a valid JSON object matching the required schema. No markdown code fences.`;
        const repairResponse = await this.generateChat(
          [{ role: 'user', content: repairPrompt }],
          'You are a strict JSON schema repair agent. Return only valid JSON. Respond with ONLY the requested JSON. Do not add explanation text before or after the JSON.'
        );
        const parsed = parseAndSanitizeJSON(repairResponse, null);
        if (parsed && validatorFn(parsed)) {
          return parsed;
        }
      } catch (repairErr) {
        console.warn('[Hybrid LLM] Self-correction attempt failed:', repairErr);
      }
    }

    return result;
  }


  /**
   * Unloads the active model from VRAM and terminates the Web Worker.
   */
  unloadModel() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.engine = null;
    this.activeModel = null;
    if (import.meta?.env?.DEV) {
      console.log('[Hybrid LLM] Model unloaded from VRAM.');
    }
  }

  /**
   * Purges cached weights from the browser's IndexedDB / Cache API.
   */
  async clearCache(modelId = WEBGPU_MODELS.HIGH_TIER.id) {
    this.unloadModel();
    const { deleteModelAllInfoInCache } = await import('@mlc-ai/web-llm');
    await deleteModelAllInfoInCache(modelId);
    if (import.meta?.env?.DEV) {
      console.log(`[Hybrid LLM] Cache cleared for ${modelId}.`);
    }
  }

  /**
   * Returns telemetry status from the BYOK rate limiter shield.
   */
  getRateLimitStatus(service = null) {
    return this.rateLimiter ? this.rateLimiter.getStatus(service) : null;
  }

  /**
   * Resets rate-limiting sliding windows and un-trips circuit breakers.
   */
  resetRateLimits(service = null) {
    if (this.rateLimiter) {
      this.rateLimiter.reset(service);
    }
  }
}

// Export singleton instance
export const hybridLLM = new HybridLLMClient();

// Named helper exports for ergonomic functional usage
export function getBestOllamaModel() {
  return hybridLLM.getBestOllamaModel();
}

export function checkOllamaReachable(forceRefresh = false) {
  return hybridLLM.checkOllamaReachable(forceRefresh);
}

export function checkContextBudget(promptOrMessages, maxTokens = 8192) {
  return hybridLLM.checkContextBudget(promptOrMessages, maxTokens);
}

export { byokRateLimiter, ByokRateLimitError, ByokRunawayLoopError };


