/**
 * byok_providers_catalog.js
 * =========================
 * Centralized registry of supported BYOK (Bring Your Own Key) AI providers.
 * Contains direct API key creation URLs, free tier details, expected key prefixes,
 * and step-by-step guidance cards for getting keys with zero friction.
 */

export const BYOK_PROVIDERS = {
  groq: {
    id: 'groq',
    name: 'Groq Cloud',
    heroBadge: '100% Free • No CC Required',
    speedBadge: 'Ultra-Fast (~500 tok/sec)',
    model: 'Llama 3.3 70B & Qwen 2.5 32B (Groq LPU)',
    cost: '$0.00 — Free Developer Tier',
    keyUrl: 'https://console.groq.com/keys',
    keyUrlLabel: 'console.groq.com/keys',
    headlineDomain: 'groq.com',
    keyPrefix: 'gsk_',
    placeholder: 'Paste gsk_... Groq API Key',
    color: '#f59e0b',
    isHeroFree: true,
    setupTimeMinutes: 2,
    tagline: 'World-record LPU inference speed with zero credit card required.',
    steps: [
      {
        step: 1,
        title: 'Open Groq Console',
        desc: 'Go to console.groq.com/keys. No credit card or billing details are ever requested.',
        link: 'https://console.groq.com/keys',
        linkLabel: 'Open console.groq.com ↗'
      },
      {
        step: 2,
        title: 'Sign In / Up',
        desc: 'Sign in with your Google or GitHub account in one click.'
      },
      {
        step: 3,
        title: 'Create API Key',
        desc: 'Click "Create API Key", name it "SPrav AI", and copy the gsk_... key string.'
      },
      {
        step: 4,
        title: 'Paste & Activate',
        desc: 'Paste the key into SPrav and click "Save Key". Instant, blazing-fast AI inference is ready!'
      }
    ]
  },
  gemini: {
    id: 'gemini',
    name: 'Google Gemini',
    heroBadge: 'Free Tier • 15 RPM',
    speedBadge: 'Gemini 2.0 Flash',
    model: 'Gemini 2.0 Flash & Gemini 1.5 Flash',
    cost: '$0.00 — 15 requests/min free',
    keyUrl: 'https://aistudio.google.com/app/apikey',
    keyUrlLabel: 'aistudio.google.com/app/apikey',
    headlineDomain: 'aistudio.google.com',
    keyPrefix: '',
    placeholder: 'Paste Gemini API Key',
    color: '#818cf8',
    isHeroFree: true,
    setupTimeMinutes: 2,
    tagline: 'Deep reasoning, massive token window, and generous free developer quotas.',
    steps: [
      {
        step: 1,
        title: 'Open Google AI Studio',
        desc: 'Go to aistudio.google.com/app/apikey with any standard Google account.',
        link: 'https://aistudio.google.com/app/apikey',
        linkLabel: 'Open aistudio.google.com ↗'
      },
      {
        step: 2,
        title: 'Accept Terms',
        desc: 'Accept the developer terms. No cloud billing or credit card setup required for free tier.'
      },
      {
        step: 3,
        title: 'Create API Key',
        desc: 'Click "Create API key" in a new or existing project, then copy the AIzaSy... token.'
      },
      {
        step: 4,
        title: 'Paste & Save',
        desc: 'Paste your key in SPrav. Gemini 2.0 Flash will handle high-speed ATS resume analysis.'
      }
    ]
  },
  openrouter: {
    id: 'openrouter',
    name: 'OpenRouter',
    heroBadge: 'Universal Gateway',
    speedBadge: 'Multi-Model Switcher',
    model: 'Qwen 2.5 Coder 32B / Llama 3.3 70B / DeepSeek-V3',
    cost: 'Free tier available for open-source models',
    keyUrl: 'https://openrouter.ai/keys',
    keyUrlLabel: 'openrouter.ai/keys',
    keyPrefix: 'sk-or-v1-',
    placeholder: 'Paste sk-or-v1-... OpenRouter Key',
    color: '#38bdf8',
    isHeroFree: false,
    setupTimeMinutes: 2,
    tagline: 'One key to access hundreds of open-source and proprietary models.',
    steps: [
      {
        step: 1,
        title: 'Open OpenRouter',
        desc: 'Go to openrouter.ai/keys and log in via Google or GitHub.',
        link: 'https://openrouter.ai/keys',
        linkLabel: 'Open openrouter.ai ↗'
      },
      {
        step: 2,
        title: 'Create API Key',
        desc: 'Click "Create Key", label it "SPrav", and optionally set a $0 credit limit to use only free open-source models (Qwen 2.5 Coder, Llama 3.3 70B, Mistral Small).'
      },
      {
        step: 3,
        title: 'Copy & Paste',
        desc: 'Copy the sk-or-v1-... secret key and paste it below.'
      }
    ]
  },
  deepseek: {
    id: 'deepseek',
    name: 'DeepSeek (Direct)',
    heroBadge: 'Open-Weights 552B MoE',
    speedBadge: 'DeepSeek-V3',
    model: 'DeepSeek-V3 & DeepSeek-R1',
    cost: 'Ultra-low cost (~$0.14 / 1M tokens)',
    keyUrl: 'https://platform.deepseek.com/api_keys',
    keyUrlLabel: 'platform.deepseek.com/api_keys',
    keyPrefix: 'sk-',
    placeholder: 'Paste sk-... DeepSeek Key',
    color: '#0284c7',
    isHeroFree: false,
    setupTimeMinutes: 3,
    tagline: 'World-class reasoning and coding intelligence directly from DeepSeek.',
    steps: [
      {
        step: 1,
        title: 'Open DeepSeek Platform',
        desc: 'Go to platform.deepseek.com/api_keys.',
        link: 'https://platform.deepseek.com/api_keys',
        linkLabel: 'Open platform.deepseek.com ↗'
      },
      {
        step: 2,
        title: 'Sign In / Register',
        desc: 'Log in with your phone or email credentials.'
      },
      {
        step: 3,
        title: 'Generate API Key',
        desc: 'Click "Create API key", label it, and copy the sk-... secret key.'
      },
      {
        step: 4,
        title: 'Save in SPrav',
        desc: 'Paste below to activate direct DeepSeek-V3 and DeepSeek-R1 inference.'
      }
    ]
  },
  mistral: {
    id: 'mistral',
    name: 'Mistral AI',
    heroBadge: 'European Enterprise',
    speedBadge: 'Mistral Small & Large',
    model: 'Mistral Small Latest',
    cost: 'Free experimentation credits',
    keyUrl: 'https://console.mistral.ai/api-keys',
    keyUrlLabel: 'console.mistral.ai/api-keys',
    keyPrefix: '',
    placeholder: 'Paste Mistral API Key',
    color: '#ea580c',
    isHeroFree: false,
    setupTimeMinutes: 2,
    tagline: 'High efficiency European language and reasoning models.',
    steps: [
      {
        step: 1,
        title: 'Open Mistral Console',
        desc: 'Go to console.mistral.ai/api-keys.',
        link: 'https://console.mistral.ai/api-keys',
        linkLabel: 'Open console.mistral.ai ↗'
      },
      {
        step: 2,
        title: 'Sign In',
        desc: 'Log in with GitHub, Google, or email.'
      },
      {
        step: 3,
        title: 'Generate Key',
        desc: 'Click "Create new key", copy the generated token, and paste it below.'
      }
    ]
  },
  openai: {
    id: 'openai',
    name: 'OpenAI (Direct)',
    heroBadge: 'Frontier Intelligence',
    speedBadge: 'GPT-4o Mini',
    model: 'GPT-4o Mini & GPT-4o',
    cost: 'Pay-as-you-go',
    keyUrl: 'https://platform.openai.com/api-keys',
    keyUrlLabel: 'platform.openai.com/api-keys',
    keyPrefix: 'sk-proj-',
    placeholder: 'Paste sk-proj-... OpenAI Key',
    color: '#10b981',
    isHeroFree: false,
    setupTimeMinutes: 2,
    tagline: 'Direct connection to OpenAI models (GPT-4o Mini, GPT-4o) with standard developer keys.',
    steps: [
      {
        step: 1,
        title: 'Open OpenAI Platform',
        desc: 'Go to platform.openai.com/api-keys.',
        link: 'https://platform.openai.com/api-keys',
        linkLabel: 'Open platform.openai.com ↗'
      },
      {
        step: 2,
        title: 'Create Key',
        desc: 'Click "Create new secret key", configure project permissions, and copy the sk-proj-... key.'
      },
      {
        step: 3,
        title: 'Save in SPrav',
        desc: 'Paste below. Your key is stored exclusively in client-side AES-GCM-256 storage.'
      }
    ]
  },
  anthropic: {
    id: 'anthropic',
    name: 'Anthropic Claude',
    heroBadge: 'Industry SOTA Reasoning',
    speedBadge: 'Claude 3.5 Sonnet',
    model: 'Claude 3.5 Sonnet & Claude 3.5 Haiku',
    cost: 'Pay-as-you-go developer tier',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    keyUrlLabel: 'console.anthropic.com/settings/keys',
    headlineDomain: 'anthropic.com',
    keyPrefix: 'sk-ant-',
    placeholder: 'Paste sk-ant-... Anthropic Key',
    color: '#d97706',
    isHeroFree: false,
    setupTimeMinutes: 2,
    tagline: 'World-record agentic reasoning, code migration, and anti-cliché resume generation.',
    steps: [
      {
        step: 1,
        title: 'Open Anthropic Console',
        desc: 'Navigate to console.anthropic.com/settings/keys.',
        link: 'https://console.anthropic.com/settings/keys',
        linkLabel: 'Open console.anthropic.com ↗'
      },
      {
        step: 2,
        title: 'Create API Key',
        desc: 'Click "Create Key", label it "SPrav AI", and copy the sk-ant-... key.'
      },
      {
        step: 3,
        title: 'Save in SPrav',
        desc: 'Paste below. Direct browser calls are secured via client-side AES-GCM-256.'
      }
    ]
  }
};

/**
 * Retrieves the guidance metadata for a specific provider.
 * Falls back to Groq if unrecognized.
 */
export function getProviderGuide(providerId) {
  if (!providerId) return BYOK_PROVIDERS.groq;
  const key = String(providerId).toLowerCase().trim();
  return BYOK_PROVIDERS[key] || null;
}

/**
 * Returns all configured provider guides as an array.
 */
export function getAllProviderGuides() {
  return Object.values(BYOK_PROVIDERS);
}
