/**
 * doc_term_glossary.js
 * ====================
 * Centralized glossary and doc mapping for in-feature contextual tooltips and help triggers.
 * Maps application concepts (Ghost Risk, ATS X-Ray, QLoRA Studio, etc.) to human-friendly
 * explanations, key algorithmic heuristics, and deep-link documentation section IDs.
 */

export const DOC_GLOSSARY = {
  ghost_risk: {
    key: 'ghost_risk',
    title: 'Freshness Filter',
    shortLabel: 'Freshness Filter',
    badge: 'Telemetry Radar',
    badgeColor: '#ef4444',
    icon: 'Target',
    sectionId: 'radar',
    summary: 'Detects zombie, fake, and inactive job postings through client-side heuristic telemetry before you waste time applying.',
    details: [
      'Posting Age: Listings open > 30 days accumulate escalating risk penalties.',
      'ATS Repost Velocity: Detects repetitive automated re-listings with zero candidate movement.',
      'Sovereign Ingestion: Cross-references live ATS endpoint status vs aggregator reposts.',
      'Recommendation: Green indicates active hiring momentum; Red indicates evergreen or frozen headcount.'
    ],
    proTip: '💡 If a job has a "High" Ghost Risk, prioritize reaching out to recruiters on LinkedIn rather than relying solely on the portal.'
  },

  ats_xray: {
    key: 'ats_xray',
    title: 'Resume Score Engine',
    shortLabel: 'Resume Score',
    badge: '12-Dim Simulator',
    badgeColor: '#38bdf8',
    icon: 'Activity',
    sectionId: 'scanner',
    secondarySectionId: 'compiler',
    summary: 'A reverse-parser simulator that audits your resume against exact enterprise ATS parser rules (Workday, Taleo, Greenhouse, Ashby, Lever).',
    details: [
      '12 Scoring Dimensions: Evaluates contact headers, date formats, bullet action verbs, hard skills, and section tags.',
      'Single-Column Verification: Confirms zero table or multi-column layout traps that choke legacy OCR engines.',
      'Missing Skill Gap Diffs: Highlights verbatim technical terms in the JD that are missing from your resume.',
      'Zero Hallucination: Audits your real Knowledge Base facts without fabricating metrics or false credentials.'
    ],
    proTip: '💡 Running an ATS X-Ray audit takes ~10 seconds and typically boosts candidate response rates from 3% to over 25%.'
  },

  qlora_studio: {
    key: 'qlora_studio',
    title: 'QLoRA Fine-Tuning Studio',
    shortLabel: 'QLoRA Studio',
    badge: 'Local AI Adaptation',
    badgeColor: '#a855f7',
    icon: 'Terminal',
    sectionId: 'byok',
    summary: 'Advanced developer toolkit for training custom 4-bit Quantized Low-Rank Adaptation (QLoRA) models tailored to your personal writing voice.',
    details: [
      'Dataset Generation: Automatically exports your approved resumes and outreach pitches as instruction-tuned JSONL.',
      '8GB VRAM Budget: Formatted with strict 1024-token sequence lengths for fine-tuning on consumer GPUs or free Google Colab.',
      'Zero-Server Local Inference: Compiled GGUF weights can be served locally via Ollama (localhost:11434) with zero cloud costs.',
      'Voice Consistency: Teaches the model your authentic cadence, terminology, and technical background.'
    ],
    proTip: '💡 Once trained, name your Ollama model "sprav-outreach-qlora" and SPrav will automatically detect and prioritize it for generation.'
  },

  knowledge_base: {
    key: 'knowledge_base',
    title: 'My Resume & Skills (Career Profile)',
    shortLabel: 'My Resume & Skills',
    badge: 'Ground Truth Vault',
    badgeColor: '#6366f1',
    icon: 'Database',
    sectionId: 'extractor',
    secondarySectionId: 'storage',
    summary: 'Your private, air-gapped career repository stored locally in IndexedDB. It acts as the single source of truth for all AI generation.',
    details: [
      'Zero-Cloud Extraction: Resume PDFs and DOCX files are parsed directly in the browser via WebAssembly.',
      'Structured Memory: Stores verified projects, metrics, certifications, and STAR behavioral stories.',
      'Persona Profiles: Support for up to 3 distinct career tracks (e.g. Frontend Architect, ML Engineer, DevOps Specialist).',
      'Anti-Hallucination Guardrail: AI models are strictly prohibited from generating achievements not grounded in your KB.'
    ],
    proTip: '💡 The more quantified metrics and STAR stories you log in your Knowledge Base, the higher your ATS match scores will be.'
  },

  direct_ats_scanner: {
    key: 'direct_ats_scanner',
    title: 'Direct ATS Ingestion Scanner',
    shortLabel: 'Direct ATS',
    badge: 'Open CORS',
    badgeColor: '#10b981',
    icon: 'Zap',
    sectionId: 'scanner',
    summary: 'Connects directly to employer application endpoints (Ashby, Greenhouse, Lever, Workday, BambooHR) without intermediary scrapers.',
    details: [
      '16 Ingestion Channels: Direct feed access across global tech employers, Indian enterprise boards, and tech hubs.',
      'Zero-Cost Architecture: Leverages open-CORS JSON APIs exposed by modern ATS platforms.',
      'Instant Freshness: Bypasses aggregators that delay postings by 24 to 72 hours.',
      'Clean Formatting: Extracts structured compensation, location tier, remote tags, and hiring team details.'
    ],
    proTip: '💡 Use the Direct ATS Scanner first thing in the morning to apply within the critical first 2 hours of a role being posted.'
  },

  vector_compiler: {
    key: 'vector_compiler',
    title: 'ATS Vector PDF Compiler',
    shortLabel: 'Vector Compiler',
    badge: 'Binary PDF Engine',
    badgeColor: '#f59e0b',
    icon: 'Code',
    sectionId: 'compiler',
    summary: 'A pure JavaScript binary compiler that generates clean, single-column ISO 32000-1 PDF documents in under 15ms.',
    details: [
      'Harvard Standard: Enforces standard margins, typography hierarchy, and clean text flow for 100% parser pass rates.',
      'Zero Cloud Roundtrip: Never sends your resume to an external PDF generation microservice.',
      'Precise Line Budgeting: Prevents awkward 1.2-page resumes by dynamically calibrating leading and padding.',
      'Embedded Metadata: Generates standards-compliant document properties and selectable vector text.'
    ],
    proTip: '💡 Recruiters prefer clean 1-page PDF resumes with standard headings like "Experience", "Skills", and "Education".'
  },

  sovereign_ai: {
    key: 'sovereign_ai',
    title: '100% Private Local Architecture',
    shortLabel: 'Private Local AI',
    badge: 'Zero Cloud PII',
    badgeColor: '#10b981',
    icon: 'Shield',
    sectionId: 'overview',
    secondarySectionId: 'byok',
    summary: 'An architecture engineered so candidate career data, resumes, notes, and API keys remain 100% on your local machine.',
    details: [
      'In-Browser WebGPU: Run models like Qwen 2.5 and SmolLM directly on your graphics card via browser WebGPU.',
      'Client BYOK: Directly call Groq, OpenAI, Anthropic, or local Ollama with your own API keys.',
      'AES-GCM-256 Vault: All stored keys and credentials are encrypted using browser Web Crypto APIs.',
      'No SaaS Middleman: No subscriptions, zero tracking, and zero candidate data harvesting.'
    ],
    proTip: '💡 Add a free Groq API key in Settings for instantaneous 300+ token/second cloud AI inference with zero fees.'
  },

  autofill_bookmarklet: {
    key: 'autofill_bookmarklet',
    title: '1-Click AutoFill Assistant',
    shortLabel: 'AutoFill',
    badge: 'Zero Extension Tool',
    badgeColor: '#ec4899',
    icon: 'Sparkles',
    sectionId: 'autofill',
    summary: 'A zero-install browser bookmarklet that maps your Knowledge Base details directly into external ATS application forms.',
    details: [
      'Universal Mapping: Automatically populates Name, Email, Phone, LinkedIn, GitHub, and Portfolio fields.',
      'Custom Question Injection: Pre-fills screening answers regarding authorization, notice period, and relocation.',
      'Works Everywhere: Compatible with Greenhouse, Lever, Ashby, Workday, Taleo, and Jobvite portals.',
      'Drag-and-Drop Setup: Simply drag the bookmarklet button to your browser bookmarks bar.'
    ],
    proTip: '💡 Pin the bookmarklet to your bookmarks toolbar for 1-click execution when navigating external job board application pages.'
  },

  mobile_continuity: {
    key: 'mobile_continuity',
    title: 'Air-Gapped P2P Mobile Sync',
    shortLabel: 'Mobile Sync',
    badge: 'QR Stream Handshake',
    badgeColor: '#6366f1',
    icon: 'Smartphone',
    sectionId: 'mobile',
    summary: 'Peer-to-peer device transfer mechanism that synchronizes your entire career vault to mobile without cloud servers or accounts.',
    details: [
      'Animated QR Stream: Chunks and encodes your encrypted vault into a high-density optical QR video stream.',
      'Air-Gapped Privacy: Requires no Wi-Fi pairing, Bluetooth connection, or intermediate cloud databases.',
      'Cross-Device Continuity: Review applications, practice interview questions, and check follow-ups on your phone.'
    ],
    proTip: '💡 Scan the animated QR code from your phone camera while on the Mobile Continuity page to sync your entire pipeline.'
  },

  pipeline_calendar: {
    key: 'pipeline_calendar',
    title: 'Pipeline Calendar & Reminders',
    shortLabel: 'Calendar & Push',
    badge: 'Zero Backend Alerts',
    badgeColor: '#38bdf8',
    icon: 'Calendar',
    sectionId: 'overview',
    summary: 'Interactive monthly/weekly interview calendar with native W3C browser push notification reminders and synthesized audio chimes.',
    details: [
      'Milestone Tracking: Maps screenings, technical loops, follow-up deadlines, and offer response due dates.',
      'Web Audio Dual-Tone Chime: Synthesizes gentle 587Hz ➔ 880Hz audio chimes without downloading sound files.',
      'Background Poller: Re-scans pipeline due dates every 15 minutes and immediately on tab re-focus.',
      '1-Click Scheduling: Attach interview dates directly to application cards in IndexedDB.'
    ],
    proTip: '💡 Enable browser push notifications in the Reminders modal to receive desktop alerts even when the browser tab is minimized.'
  },

  company_rounds: {
    key: 'company_rounds',
    title: 'Company Round Engine & Blueprints',
    shortLabel: 'Round Blueprints',
    badge: '53+ Blueprints',
    badgeColor: '#f59e0b',
    icon: 'BookMarked',
    sectionId: 'company-rounds',
    summary: 'Curated interview blueprint database revealing exact hiring loop stages for 53+ top global tech companies and tier-1 Indian firms.',
    details: [
      'Loop Stages: Breaks down OA, Technical Screen, System Design, Bar Raiser, and Executive Rounds.',
      'Archetype Calibration: Tailored expectations for FAANG, Startups, WITCH, and Unicorns.',
      'Prep Guidance: Concrete tips and common question themes asked by engineers at each specific employer.'
    ],
    proTip: '💡 Check the company blueprint before your technical interview to know whether system design or live coding is emphasized.'
  }
};

/**
 * Helper to retrieve a glossary entry by key safely.
 * @param {string} key
 * @returns {object|null}
 */
export function getDocGlossaryEntry(key) {
  if (!key) return null;
  const normalized = String(key).toLowerCase().trim().replace(/[- ]/g, '_');
  return DOC_GLOSSARY[normalized] || null;
}

/**
 * Returns all available glossary keys.
 * @returns {string[]}
 */
export function getAllGlossaryKeys() {
  return Object.keys(DOC_GLOSSARY);
}
