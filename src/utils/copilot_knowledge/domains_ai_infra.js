/**
 * domains_ai_infra.js
 * Specialized knowledge domains 10 through 14:
 * 10. In-Browser WebGPU AI & Local Inference
 * 11. Ollama Local Daemon
 * 12. BYOK Multi-Model Orchestration
 * 13. 1-Click Guided Dispatch
 * 14. Extension Companion & Autofill
 */

// ─── Domain 10: In-Browser WebGPU AI & Local Inference ───────────────────────
export const DOMAIN_10_WEBGPU_AI = [
  {
    id: 'faq_webgpu_inference',
    category: 'webgpu_local_ai',
    title: 'What is WebGPU in-browser inference?',
    patterns: [
      /what is webgpu/i,
      /webgpu inference/i,
      /browser ai/i,
      /web-llm/i,
      /run model in browser/i
    ],
    answer: `⚡ **Zero-Server WebGPU Inference Engine:**

WebGPU is a modern web standard that allows browser JavaScript to execute high-performance tensor operations directly on your physical GPU:
- **Zero Cloud Latency:** Prompts and token generation happen inside your browser tab without sending data over the Internet.
- **Air-Gapped Privacy:** Completely functional even when your device is in airplane mode or disconnected from Wi-Fi!`,
    relatedQueries: ['Which models run in WebGPU (1.5B vs 7B tiers)?', 'How much GPU VRAM is required for local WebGPU AI?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_webgpu_models_tiers',
    category: 'webgpu_local_ai',
    title: 'Which models run in WebGPU (1.5B vs 7B tiers)?',
    patterns: [
      /which models run in webgpu/i,
      /qwen/i,
      /llama 3\.2/i,
      /1\.5b vs 7b/i,
      /webgpu model list/i
    ],
    answer: `🧠 **Calibrated WebGPU Model Tiers:**

SPrav automatically selects the optimal 4-bit quantized model for your hardware:
- **Tier 1 (7B Models):** *Qwen 2.5 Coder 7B* or *Llama 3.1 8B* — Active when VRAM ≥ 6GB (NVIDIA RTX, Apple M-Series). Exceptional coding and resume reasoning.
- **Tier 2 (1.5B–3B Models):** *Llama 3.2 3B* or *Qwen 2.5 1.5B* — Active on integrated graphics (Intel Iris Xe, AMD Vega) for fast, lightweight processing.`,
    relatedQueries: ['What is WebGPU in-browser inference?', 'How much GPU VRAM is required for local WebGPU AI?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_vram_requirements_webgpu',
    category: 'webgpu_local_ai',
    title: 'How much GPU VRAM is required for local WebGPU AI?',
    patterns: [
      /how much vram/i,
      /vram requirements/i,
      /gpu memory/i,
      /hardware requirements/i
    ],
    answer: `🎮 **Hardware & VRAM Specifications:**

- **Dedicated GPUs (NVIDIA RTX 3060/4060+, Apple M1/M2/M3):** 6GB–16GB VRAM provides instant 7B model execution at 25–45 tokens/second.
- **Integrated Graphics (Intel Core Ultra, AMD Ryzen):** 2GB–4GB shared memory runs 1.5B–3B models smoothly at 15–25 tokens/second.
- **No Dedicated GPU?** Seamlessly switch to free cloud inference via **Groq** or **Google Gemini** with 0ms setup in Settings!`,
    relatedQueries: ['Which models run in WebGPU (1.5B vs 7B tiers)?', 'Why is WebGPU unsupported on my browser or device?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_webgpu_privacy_advantages',
    category: 'webgpu_local_ai',
    title: 'Why is local WebGPU safer than cloud AI?',
    patterns: [
      /why local ai/i,
      /privacy advantages of webgpu/i,
      /local vs cloud ai/i,
      /data leakage/i
    ],
    answer: `🔒 **Uncompromising Privacy with Local AI:**

When using cloud AI APIs, your resume text is transmitted across the public Internet to corporate servers. With WebGPU:
- **Zero Network Packets:** Not a single character leaves your device.
- **Immune to API Outages:** Continues running even during major cloud AI outages.
- **Zero Token Fees:** Unlimited resume rewrites and STAR simulations forever.`,
    relatedQueries: ['What is WebGPU in-browser inference?', 'How does the Master Passphrase encryption work?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_webgpu_troubleshooting',
    category: 'webgpu_local_ai',
    title: 'Why is WebGPU unsupported on my browser or device?',
    patterns: [
      /webgpu unsupported/i,
      /webgpu not working/i,
      /enable webgpu/i,
      /browser not supported/i
    ],
    answer: `🛠️ **Enabling WebGPU in Your Browser:**

- **Chrome / Edge (v113+):** Supported by default on Windows, macOS, and Linux. Ensure Hardware Acceleration is enabled in *Settings → System*.
- **Firefox:** Navigate to \`about:config\` and set \`dom.webgpu.enabled = true\`.
- **Safari (macOS Sonoma 14+):** Enable WebGPU under *Develop → Feature Flags*.
- **Mobile Devices:** If mobile WebGPU is restricted, connect a free **Groq** key for 500 tok/sec cloud performance!`,
    relatedQueries: ['What is WebGPU in-browser inference?', 'How do I set up a free API key with Groq?'],
    contextTab: 'settings'
  }
];

// ─── Domain 11: Ollama Local Daemon ──────────────────────────────────────────
export const DOMAIN_11_OLLAMA = [
  {
    id: 'faq_ollama_setup',
    category: 'ollama_local_daemon',
    title: 'How do I connect SPrav to Ollama running locally?',
    patterns: [
      /how (do I|to) (connect|setup|use|configure) ollama/i,
      /ollama (setup|connection|port|localhost)/i,
      /run ollama with sprav/i
    ],
    answer: `🦙 **Connecting Local Ollama to SPrav Job AI:**

1. **Install Ollama:** Download and install from [ollama.com](https://ollama.com).
2. **Start the Ollama Server with CORS:**
   Because SPrav runs in your browser, Ollama must allow browser origins. Start Ollama with the \`OLLAMA_ORIGINS\` environment variable:
   - **macOS / Linux:** \`OLLAMA_ORIGINS="*" ollama serve\`
   - **Windows PowerShell:** \`$env:OLLAMA_ORIGINS="*" ; ollama serve\`
3. **Pull Your Preferred Model:**
   \`ollama run deepseek-r1:8b\` or \`ollama run llama3.2\`
4. **Link in SPrav:** Open *Settings → AI Engine*, select **Ollama (Localhost:11434)**, and click **Test Connection**. All inference runs 100% offline on your device!`,
    relatedQueries: ['Why do I get a CORS or network error with Ollama at localhost:11434?', 'How do I run DeepSeek-R1 locally with Ollama?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_ollama_deepseek_r1',
    category: 'ollama_local_daemon',
    title: 'How do I run DeepSeek-R1 locally with Ollama?',
    patterns: [
      /deepseek[- ]r1/i,
      /run deepseek locally/i,
      /deepseek in ollama/i,
      /reasoning models local/i
    ],
    answer: `🧠 **Running DeepSeek-R1 Reasoning Models with Ollama:**

DeepSeek-R1 is available in distilled parameter weights for local execution:
- **8B Parameter Model (Recommended for 8GB–16GB RAM):**
  \`ollama run deepseek-r1:8b\`
- **14B Parameter Model (For 16GB–32GB RAM / Dedicated GPU):**
  \`ollama run deepseek-r1:14b\`
- **1.5B Parameter Model (Ultra-lightweight for laptops):**
  \`ollama run deepseek-r1:1.5b\`

In SPrav *Settings → AI Engine*, enter model tag \`deepseek-r1:8b\` under Ollama configuration. SPrav leverages its chain-of-thought reasoning tokens to uncover hidden rubric keywords and generate airtight ATS resume bullet points!`,
    relatedQueries: ['How do I connect SPrav to Ollama running locally?', 'What is the difference between Ollama and WebGPU in SPrav?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_ollama_port_proxy',
    category: 'ollama_local_daemon',
    title: 'Why do I get a CORS or network error with Ollama at localhost:11434?',
    patterns: [
      /ollama cors/i,
      /localhost:11434 (error|failed|refused)/i,
      /cannot connect to ollama/i,
      /network error ollama/i
    ],
    answer: `⚠️ **Resolving Ollama CORS / Browser Connection Errors:**

Web browsers block web apps from accessing local ports unless the local server grants Cross-Origin Resource Sharing (CORS) permissions:
- **Windows:** Set system environment variable \`OLLAMA_ORIGINS\` to \`*\` and restart the Ollama tray app or terminal.
- **macOS:** Run \`launchctl setenv OLLAMA_ORIGINS "*"\` or start via terminal \`OLLAMA_ORIGINS="*" ollama serve\`.
- **Linux systemd service:** Add \`Environment="OLLAMA_ORIGINS=*"\` to \`/etc/systemd/system/ollama.service\` and run \`sudo systemctl daemon-reload && sudo systemctl restart ollama\`.

Once restarted, refresh SPrav and test the connection in Settings!`,
    relatedQueries: ['How do I connect SPrav to Ollama running locally?', 'Can I run SPrav 100% air-gapped with Ollama?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_ollama_airgap',
    category: 'ollama_local_daemon',
    title: 'Can I run SPrav 100% air-gapped with Ollama?',
    patterns: [
      /air[- ]gapped/i,
      /completely offline/i,
      /no internet connection/i,
      /airplane mode/i
    ],
    answer: `✈️ **100% Air-Gapped Operation:**

**Yes!** SPrav Job AI is an offline-first Progressive Web App (PWA).
1. Install SPrav as a PWA or run the local Vite build.
2. Have your local Ollama daemon or WebGPU cache pre-downloaded.
3. You can disconnect your Wi-Fi or enter airplane mode. SPrav will calculate ATS scores, tailor resumes, simulate behavioral interview questions, and manage your pipeline completely offline.`,
    relatedQueries: ['How do I connect SPrav to Ollama running locally?', 'Why is local WebGPU safer than cloud AI?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_ollama_vs_webgpu',
    category: 'ollama_local_daemon',
    title: 'What is the difference between Ollama and WebGPU in SPrav?',
    patterns: [
      /ollama vs webgpu/i,
      /difference between ollama and webgpu/i,
      /which is better ollama or webgpu/i
    ],
    answer: `⚖️ **Ollama vs. In-Browser WebGPU:**

| Feature | Ollama (Local Daemon) | In-Browser WebGPU |
| :--- | :--- | :--- |
| **Execution** | Native C++ process outside browser | Directly in browser tab via WebGPU API |
| **Model Freedom** | Any GGUF model (Llama, DeepSeek, Mistral) | Curated web-quantized ONNX/WebLLM models |
| **Installation** | Requires installing Ollama app | 0 installation; downloads weights to cache |
| **Speed** | Highly optimized with GPU/CPU acceleration | High speed on modern GPUs, VRAM bounded |
| **Setup Barrier** | Requires terminal & CORS config | 1-click download in browser |

Choose **WebGPU** for instant convenience, or **Ollama** if you want larger 14B–32B models and native CPU/GPU performance.`,
    relatedQueries: ['How do I connect SPrav to Ollama running locally?', 'What is WebGPU in-browser inference?'],
    contextTab: 'settings'
  }
];

// ─── Domain 12: BYOK Multi-Model Orchestration ───────────────────────────────
export const DOMAIN_12_BYOK = [
  {
    id: 'faq_byok_groq_free',
    category: 'byok_orchestration',
    title: 'How do I get a 100% free Groq API key for ultra-fast inference?',
    patterns: [
      /how (to|do I) (get|use|setup) groq/i,
      /free groq (api key|key)/i,
      /groq speed/i,
      /fastest ai model/i
    ],
    answer: `⚡ **Setting Up Free Groq Cloud Acceleration (500+ Tokens/Sec):**

Groq provides the fastest LLM inference in the industry with generous free tier limits:
1. Visit [console.groq.com/keys](https://console.groq.com/keys) and sign in with Google or GitHub.
2. Click **Create API Key** and copy your key (starts with \`gsk_...\`).
3. In SPrav, open *Settings → AI Engine*, select **Groq**, paste your key, and pick \`llama-3.3-70b-versatile\` or \`mixtral-8x7b-32768\`.
4. Your key is stored exclusively in your local browser IndexedDB encrypted under your Master Passphrase.`,
    relatedQueries: ['How do I use Google Gemini 2.0 Flash in SPrav?', 'How does the Master Passphrase encryption work?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_byok_gemini_flash',
    category: 'byok_orchestration',
    title: 'How do I use Google Gemini 2.0 Flash in SPrav?',
    patterns: [
      /gemini 2\.0 flash/i,
      /google gemini api key/i,
      /setup gemini/i,
      /gemini free tier/i
    ],
    answer: `✨ **Google Gemini 2.0 Flash Integration:**

Gemini 2.0 Flash offers massive 1-million-token context windows and lightning-fast analysis:
1. Get a free API key at [aistudio.google.com](https://aistudio.google.com).
2. In SPrav *Settings → AI Engine*, select **Google Gemini**.
3. Enter your API key and set the model to \`gemini-2.0-flash\`.
4. Gemini Flash is ideal for reading 5-page enterprise job specifications and cross-referencing extensive GitHub project portfolios!`,
    relatedQueries: ['How do I get a 100% free Groq API key for ultra-fast inference?', 'Can I use OpenRouter to access hundreds of AI models?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_byok_openrouter_setup',
    category: 'byok_orchestration',
    title: 'Can I use OpenRouter to access hundreds of AI models?',
    patterns: [
      /openrouter/i,
      /access claude, gpt, deepseek/i,
      /unified api key/i,
      /how to use openrouter/i
    ],
    answer: `🌐 **Unified Multi-Model Gateway with OpenRouter:**

OpenRouter provides access to Claude 3.5 Sonnet, GPT-4o, DeepSeek-R1, and Qwen through a single API key:
1. Generate an API key at [openrouter.ai/keys](https://openrouter.ai/keys).
2. In SPrav *Settings → AI Engine*, choose **OpenRouter**.
3. Enter model identifiers like \`anthropic/claude-3.5-sonnet\` or \`deepseek/deepseek-r1\`.
4. SPrav configures custom headers (\`HTTP-Referer\` and \`X-Title\`) automatically for seamless browser routing.`,
    relatedQueries: ['How do I get a 100% free Groq API key for ultra-fast inference?', 'How do I configure OpenAI or Anthropic keys directly in the browser?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_byok_openai_cors',
    category: 'byok_orchestration',
    title: 'How do I configure OpenAI or Anthropic keys directly in the browser?',
    patterns: [
      /openai (cors|api key|gpt-4o)/i,
      /anthropic claude (key|cors)/i,
      /browser cors openai/i
    ],
    answer: `🔑 **OpenAI & Anthropic Browser Direct Key Usage:**

- **OpenAI (GPT-4o / GPT-4o-mini):** OpenAI natively supports direct client-side requests from browsers when providing a bearer key. Select **OpenAI** in Settings and input your \`sk-...\` key.
- **Anthropic Claude:** Anthropic's API enforces strict browser CORS protection by default. To use Claude in browser applications, connect through **OpenRouter** (\`anthropic/claude-3.5-sonnet\`), which bridges CORS transparently!`,
    relatedQueries: ['Can I use OpenRouter to access hundreds of AI models?', 'How does the Master Passphrase encryption work?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_byok_model_failover',
    category: 'byok_orchestration',
    title: 'How does SPrav handle multi-model fallback when an API quota is exhausted?',
    patterns: [
      /rate limit fallback/i,
      /quota exhausted/i,
      /multi-model orchestration/i,
      /what happens if groq fails/i
    ],
    answer: `🔄 **Dynamic Multi-Engine Failover Architecture:**

If your active provider triggers an HTTP 429 (Rate Limit Exceeded) or network failure:
1. **Primary Cloud Model:** (e.g. Groq Llama 3.3) attempts execution.
2. **Secondary Provider Fallback:** Seamlessly shifts to Gemini or configured secondary provider.
3. **Local Hybrid Fallback:** If cloud connections fail, SPrav falls back to local in-browser WebGPU or local Ollama, ensuring zero disruption during high-intensity application sprints!`,
    relatedQueries: ['How do I get a 100% free Groq API key for ultra-fast inference?', 'What is WebGPU in-browser inference?'],
    contextTab: 'settings'
  }
];

// ─── Domain 13: 1-Click Guided Dispatch ──────────────────────────────────────
export const DOMAIN_13_DISPATCH = [
  {
    id: 'faq_guided_dispatch_flow',
    category: 'guided_dispatch',
    title: 'How does 1-Click Guided Dispatch work in SPrav?',
    patterns: [
      /guided dispatch/i,
      /1[- ]click dispatch/i,
      /how does dispatch work/i,
      /apply with sprav/i
    ],
    answer: `🚀 **1-Click Guided Dispatch Workflow:**

Unlike dangerous auto-apply bots that spam job portals and get your IP banned:
1. Click **1-Click Dispatch** on any scored job card.
2. SPrav opens the official ATS application portal in an isolated tab.
3. SPrav automatically loads your tailored resume, generates custom recruiter screening notes, and stages your clipboard with bulletproof responses.
4. You retain complete human oversight for the final submit button, keeping your candidate profile 100% compliant and ban-free!`,
    relatedQueries: ['Why does SPrav use guided dispatch instead of dangerous auto-submit bots?', 'What are Autonomous Application Notes and how do they help?'],
    contextTab: 'jobs'
  },
  {
    id: 'faq_application_notes_gen',
    category: 'guided_dispatch',
    title: 'What are Autonomous Application Notes and how do they help?',
    patterns: [
      /application notes/i,
      /recruiter screening notes/i,
      /what are application notes/i,
      /why should we hire you note/i
    ],
    answer: `📝 **Autonomous Recruiter Screening Notes:**

When dispatching to ATS portals, recruiters frequently ask open text questions (e.g. *"Why are you interested in this role?"*, *"Describe your experience with distributed microservices"*).
- SPrav instantly synthesizes the job's high-weight rubric requirements with your validated STAR stories.
- A concise, punchy 3–4 sentence pitch is generated and copied to your clipboard ready for instant pasting.`,
    relatedQueries: ['How does 1-Click Guided Dispatch work in SPrav?', 'Can SPrav generate answers for common recruiter screening questions?'],
    contextTab: 'jobs'
  },
  {
    id: 'faq_screening_answers_auto',
    category: 'guided_dispatch',
    title: 'Can SPrav generate answers for common recruiter screening questions?',
    patterns: [
      /screening questions/i,
      /work authorization question/i,
      /salary expectation answer/i,
      /notice period answer/i
    ],
    answer: `📋 **Pre-Populated Screening Answers:**

SPrav maintains pre-formatted answers from your Master Profile:
- **Work Authorization:** Legal status formatted cleanly for US/UK/EU/India compliance.
- **Notice Period & Availability:** Clear wording for immediate, 15-day, or 30-day transitions.
- **Compensation Expectations:** Anchored strategically to avoid lowballing while remaining in the top 75th percentile of the posted salary band.`,
    relatedQueries: ['How does 1-Click Guided Dispatch work in SPrav?', 'What are the rules of Chris Voss style salary negotiation?'],
    contextTab: 'profile'
  },
  {
    id: 'faq_application_queue_triage',
    category: 'guided_dispatch',
    title: 'How do I triage and prioritize jobs in my application queue?',
    patterns: [
      /triage queue/i,
      /how to prioritize jobs/i,
      /application queue/i,
      /sort jobs to apply/i
    ],
    answer: `🎯 **Application Queue Triaging Strategy:**

1. **Rubric Fit ≥ 80%:** Prioritize these high-match roles first during peak morning recruiter hours (8 AM – 11 AM local time).
2. **Ghost Index ≤ 30%:** Ensure the role has high hiring velocity before spending time tailoring.
3. **Dispatch Staging:** Mark jobs as **Queue for Today** to trigger focused 1-hour application sprints.`,
    relatedQueries: ['How is the ATS rubric score calculated?', 'How does SPrav detect ghost jobs?'],
    contextTab: 'jobs'
  },
  {
    id: 'faq_batch_dispatch_safety',
    category: 'guided_dispatch',
    title: 'Why does SPrav use guided dispatch instead of dangerous auto-submit bots?',
    patterns: [
      /why not full auto(mate)?/i,
      /auto[- ]submit bot/i,
      /why guided dispatch/i,
      /bot ban risk/i
    ],
    answer: `🛡️ **Why Fully Automated Bots Harm Candidates:**

Platforms like Greenhouse, Lever, and Workday utilize Cloudflare Turnstile and Datadome bot protection:
- **Instant Shadowbans:** Headless browser bots submit duplicate form fields and unnatural mouse clicks, causing immediate silent rejection.
- **Broken Formatting:** Auto-fill bots fail on dynamic multi-step modal forms.
- **The SPrav Advantage:** SPrav accelerates every step (tailoring, answering, pasting) while preserving authentic human interaction, resulting in a **9x higher interview callback rate**!`,
    relatedQueries: ['How does 1-Click Guided Dispatch work in SPrav?', 'What does the SPrav Chrome/Edge Extension Companion do?'],
    contextTab: 'jobs'
  }
];

// ─── Domain 14: Extension Companion & Autofill ───────────────────────────────
export const DOMAIN_14_EXTENSION = [
  {
    id: 'faq_extension_features',
    category: 'extension_companion',
    title: 'What does the SPrav Chrome/Edge Extension Companion do?',
    patterns: [
      /what does the extension do/i,
      /extension features/i,
      /browser extension/i,
      /chrome extension/i
    ],
    answer: `🧩 **SPrav Extension Companion (Manifest V3):**

The extension connects your local SPrav workspace directly with external web job boards:
- **Instant ATS DOM Autofill:** Detects candidate inputs on Greenhouse, Lever, Ashby, and Workday with 1-click filling.
- **Live Job Ingestion:** Clip any job directly from LinkedIn, Indeed, or company career pages into your SPrav pipeline.
- **Local Tab Synchronization:** Communicates with your SPrav web app tab via postMessage / BroadcastChannel with zero external server tracking.`,
    relatedQueries: ['How do I install the SPrav Extension Companion in Chrome or Brave?', 'How does the 1-Click SPrav Bookmarklet work without installing an extension?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_extension_install_unpacked',
    category: 'extension_companion',
    title: 'How do I install the SPrav Extension Companion in Chrome or Brave?',
    patterns: [
      /how to install extension/i,
      /load unpacked/i,
      /install companion/i,
      /setup chrome extension/i
    ],
    answer: `📦 **Installing the Extension (Developer Mode):**

1. Locate the \`sprav-extension\` directory in your SPrav repository.
2. Open Chrome, Edge, or Brave and navigate to \`chrome://extensions\`.
3. Toggle **Developer mode** in the top-right corner.
4. Click **Load unpacked** and select the \`sprav-extension\` directory.
5. Pin the SPrav icon to your toolbar for immediate 1-click ATS scraping and autofill!`,
    relatedQueries: ['What does the SPrav Chrome/Edge Extension Companion do?', 'How does the 1-Click SPrav Bookmarklet work without installing an extension?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_bookmarklet_usage',
    category: 'extension_companion',
    title: 'How does the 1-Click SPrav Bookmarklet work without installing an extension?',
    patterns: [
      /bookmarklet/i,
      /how to use bookmarklet/i,
      /no extension autofill/i
    ],
    answer: `🔖 **Zero-Install SPrav Bookmarklet:**

If you are on a restricted corporate or university laptop where installing browser extensions is prohibited:
1. Open SPrav *Settings → Extension Companion*.
2. Drag the **SPrav Ingest** button directly to your browser's Bookmarks bar.
3. When viewing any job description on LinkedIn, Indeed, or Greenhouse, click the bookmarklet. It instantly captures the job payload and imports it into your SPrav workspace!`,
    relatedQueries: ['What does the SPrav Chrome/Edge Extension Companion do?', 'How do I install the SPrav Extension Companion in Chrome or Brave?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_autofill_privacy',
    category: 'extension_companion',
    title: 'Is my personal data safe when using the SPrav autofill extension?',
    patterns: [
      /extension privacy/i,
      /is extension safe/i,
      /does extension track me/i
    ],
    answer: `🔒 **Extension Privacy Guarantee:**

- **Zero Remote Telemetry:** The extension contains no analytics, no external fetch calls, and no remote trackers.
- **Strict Domain Permissions:** Only activates on known ATS domains or when you explicitly click the action icon.
- **Data Boundary:** Your resume and profile never leave your local browser sandbox.`,
    relatedQueries: ['Is my personal and resume data safe in SPrav?', 'What does the SPrav Chrome/Edge Extension Companion do?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_extension_bridge_mode',
    category: 'extension_companion',
    title: 'How does Extension Bridge Mode communicate with the web app?',
    patterns: [
      /bridge mode/i,
      /extension communication/i,
      /how web app connects to extension/i
    ],
    answer: `🌉 **Extension Bridge Communication Architecture:**

SPrav leverages the standard \`window.postMessage\` protocol secured with an origin verification token:
1. The SPrav web app announces its session nonce.
2. The extension companion verifies that the caller matches the verified local host or authorized domain.
3. Structured JSON payloads (job title, description, company, salary) are transmitted directly across the DOM boundary with microsecond latency.`,
    relatedQueries: ['What does the SPrav Chrome/Edge Extension Companion do?', 'How do I install the SPrav Extension Companion in Chrome or Brave?'],
    contextTab: 'settings'
  }
];
