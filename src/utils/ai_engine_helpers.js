/**
 * AI Engine Helpers
 * =================
 * Utilities to detect whether a user has configured an AI engine or API key,
 * and provide the 4 canonical choices: Groq (Free), Gemini (Free), WebGPU, BYOK.
 */

export function isAiConfigured() {
  try {
    if (typeof localStorage === 'undefined') return false;

    // Check for explicit local WebGPU preference
    const pref = localStorage.getItem('sprav_engine_preference');
    if (pref === 'webgpu') return true;

    // Check for granted hardware permission (local engine allowed)
    if (localStorage.getItem('sprav_hardware_permission') === 'granted') return true;

    // Check for any stored API keys
    const hasKey = Boolean(
      localStorage.getItem('sprav_groq_key') ||
      localStorage.getItem('sprav_gemini_key') ||
      localStorage.getItem('sprav_openai_key') ||
      localStorage.getItem('sprav_anthropic_key') ||
      localStorage.getItem('sprav_deepseek_key') ||
      localStorage.getItem('sprav_openrouter_key')
    );

    return hasKey;
  } catch {
    return false;
  }
}

export function saveAiEngineConfig({ engine, provider, key }) {
  try {
    if (typeof localStorage === 'undefined') return;

    if (engine === 'webgpu') {
      localStorage.setItem('sprav_engine_preference', 'webgpu');
      localStorage.setItem('sprav_hardware_permission', 'granted');
      window.dispatchEvent(new CustomEvent('sprav_engine_changed', { detail: { engine: 'webgpu' } }));
      return;
    }

    // Cloud / BYOK engines
    localStorage.setItem('sprav_engine_preference', 'cloud');
    if (provider) {
      localStorage.setItem('sprav_cloud_provider', provider);
    }

    if (key) {
      const cleanKey = key.trim();
      if (provider === 'groq') localStorage.setItem('sprav_groq_key', cleanKey);
      else if (provider === 'gemini') localStorage.setItem('sprav_gemini_key', cleanKey);
      else if (provider === 'openai') localStorage.setItem('sprav_openai_key', cleanKey);
      else if (provider === 'anthropic') localStorage.setItem('sprav_anthropic_key', cleanKey);
      else if (provider === 'deepseek') localStorage.setItem('sprav_deepseek_key', cleanKey);
      else if (provider === 'openrouter') localStorage.setItem('sprav_openrouter_key', cleanKey);
      else localStorage.setItem(`sprav_${provider}_key`, cleanKey);
    }

    window.dispatchEvent(new CustomEvent('sprav_engine_changed', { detail: { engine: 'cloud', provider } }));
  } catch (err) {
    console.warn('[AI Engine Config] Error saving engine config:', err);
  }
}
