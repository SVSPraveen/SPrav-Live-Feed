/**
 * domains_core.js
 * Specialized knowledge domains 1 through 5:
 *  1. Architecture & Platform Identity
 *  2. Privacy, Security & OWASP Defense
 *  3. Direct ATS Discovery & Ingestion
 *  4. Ghost Job & Spam Detection
 *  5. ATS Scoring & 5D Rubrics
 */

// ─── Domain 1: Architecture & Platform Identity ──────────────────────────────
export const DOMAIN_1_ARCHITECTURE = [
  {
    id: 'faq_creator_svs_praveen',
    category: 'architecture_identity',
    title: 'Who created SPrav Job AI and what is the mission?',
    patterns: [
      /who (created|made|built|engineered|founded|developed) sprav/i,
      /creator of sprav/i,
      /\b(svs praveen|praveen)\b/i,
      /who is the author/i,
      /about the founder/i
    ],
    answer: `⭐ **SPrav Job AI** was designed, architected, and engineered by **SVS Praveen**.

The platform is built as an autonomous, candidate-first career operating system that shifts hiring leverage back to candidates. Instead of selling user data or monetizing desperate job seekers, SPrav runs 100% locally in your browser with zero server dependencies, instant ATS rubric scoring, and zero-knowledge encryption.`,
    relatedQueries: ['What is the Anti-SaaS philosophy of SPrav?', 'How does SPrav work with zero backend servers?'],
    contextTab: 'about'
  },
  {
    id: 'faq_anti_saas_philosophy',
    category: 'architecture_identity',
    title: 'What is the Anti-SaaS philosophy of SPrav?',
    patterns: [
      /anti[- ]saas/i,
      /why (is it|free|no subscription)/i,
      /business model/i,
      /how does sprav make money/i,
      /no credit card required/i
    ],
    answer: `🛡️ **The Anti-SaaS Manifesto of SPrav Job AI:**

Most commercial job boards and "AI resume builders" exploit job seekers through recurring subscriptions, data harvesting, and sponsored job advertisements. SPrav is architected on three core principles:
1. **Zero Recurring Paywalls:** 100% free forever for all candidates.
2. **Zero Data Harvesting:** Your resume, contact details, and target roles are stored exclusively in your local browser vault.
3. **Direct-to-Source Pipelines:** Scans authentic employer ATS APIs (Greenhouse, Lever, Ashby, Workday) without middlemen.`,
    relatedQueries: ['Is my resume and personal data private?', 'How does SPrav work with zero backend servers?'],
    contextTab: 'about'
  },
  {
    id: 'faq_zero_server_design',
    category: 'architecture_identity',
    title: 'How does SPrav work with zero backend servers?',
    patterns: [
      /zero[- ]server/i,
      /how does (it|sprav) work (locally|offline|without server)/i,
      /client[- ]side architecture/i,
      /local[- ]first/i
    ],
    answer: `⚡ **Client-Side Autonomous Architecture:**

SPrav functions as a Progressive Web Application (PWA) running entirely on client devices:
- **IndexedDB Storage Vault:** Stores job postings, application histories, and knowledge base items locally in encrypted IndexedDB.
- **WebAssembly (WASM) Engine:** Rust-compiled kernel performs 5-dimension scoring and freshness decay calculations at microsecond speeds.
- **In-Browser WebGPU & BYOK:** Executes LLM inference directly on your graphics card via WebGPU, or sends direct, encrypted HTTPS requests to your personal AI keys.`,
    relatedQueries: ['Is my resume and personal data private?', 'What is WebGPU in-browser inference?'],
    contextTab: 'dashboard'
  },
  {
    id: 'faq_open_source_freedom',
    category: 'architecture_identity',
    title: 'Is SPrav Job AI free forever and open source?',
    patterns: [
      /is (it|sprav) free/i,
      /open source/i,
      /github repo/i,
      /license/i,
      /cost to use/i
    ],
    answer: `🌐 **100% Free Forever & Open Source:**

Yes. SPrav Job AI is fully free and open for the global tech community:
- **No Hidden Upgrades:** Every feature—from AI resume tailoring to 20+ company interview blueprints—is fully unlocked.
- **GitHub Repository:** Available on GitHub under [SVSPraveen/SPrav-WEB-Prv](https://github.com/SVSPraveen/SPrav-WEB-Prv).
- **Offline PWA Capable:** Can be installed directly as a standalone desktop or mobile application.`,
    relatedQueries: ['Who created SPrav Job AI and what is the mission?', 'What is the Anti-SaaS philosophy of SPrav?'],
    contextTab: 'about'
  },
  {
    id: 'faq_first_steps_onboarding',
    category: 'architecture_identity',
    title: 'What should I do first to set up my profile?',
    patterns: [
      /what should i do first/i,
      /how (do i|to) start/i,
      /getting started/i,
      /onboarding guide/i,
      /setup profile/i
    ],
    answer: `🚀 **Your 4-Step Quick Launch Guide:**

1. **Upload or Paste Resume:** Navigate to **Resume Studio** or **Knowledge Base** to ingest your experience and projects.
2. **Configure Target Scope:** Go to **Scope Setup** to set your primary job titles, target locations, and seniority bounds.
3. **Discover Verified Jobs:** Open **Find Jobs** to scan 500+ authentic employer boards filtered to your skills.
4. **Tailor & Apply:** Click **Tailor Resume** on any high-match posting to generate an ATS-optimized resume in under 60 seconds!`,
    relatedQueries: ['How is my ATS Match Score calculated?', 'How does the Resume Tailoring Engine work?'],
    contextTab: 'dashboard'
  }
];

// ─── Domain 2: Privacy, Security & OWASP ─────────────────────────────────────
export const DOMAIN_2_SECURITY = [
  {
    id: 'faq_privacy_data_safety',
    category: 'privacy_security',
    title: 'Is my resume and personal data private?',
    patterns: [
      /is (my|the) data private/i,
      /data privacy/i,
      /do you (store|sell|upload) my resume/i,
      /who can see my data/i,
      /where is my resume stored/i
    ],
    answer: `🔒 **Zero-Knowledge Data Privacy Guarantee:**

Your personal information never leaves your browser:
- **No Analytics Tracking:** Zero third-party trackers, no Meta pixels, and no user profiling.
- **Local Persistence:** Resumes, contact information, and job bookmarks are stored in your browser's IndexedDB.
- **Direct AI Calls:** If using BYOK cloud AI (Groq, Gemini, Anthropic), requests travel directly from your browser to the official provider endpoint without intermediary proxies.`,
    relatedQueries: ['How does the Master Passphrase encryption work?', 'Can I export my data or create backups?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_master_passphrase_aes',
    category: 'privacy_security',
    title: 'How does the Master Passphrase encryption work?',
    patterns: [
      /master passphrase/i,
      /how does encryption work/i,
      /aes[- ]gcm/i,
      /pbkdf2/i,
      /passphrase protection/i
    ],
    answer: `🛡️ **Zero-Knowledge Master Passphrase Architecture:**

In **Settings → Privacy & Security**, you can set a Master Passphrase:
- **Key Derivation:** Uses PBKDF2 with SHA-256 and **100,000 iterations** alongside a cryptographically random salt.
- **AES-GCM-256 Encryption:** All sensitive credentials (API keys, tokens) are encrypted with authenticated AES-GCM before writing to IndexedDB.
- **Volatile In-Memory Session:** Decrypted keys remain in browser RAM only while the session is active and are purged upon clicking **Lock Vault** or closing the tab.`,
    relatedQueries: ['Where is my data stored and can extensions see it?', 'How does SPrav defend against OWASP Top 10 vulnerabilities?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_indexeddb_security',
    category: 'privacy_security',
    title: 'Where is my data stored and can extensions see it?',
    patterns: [
      /indexeddb/i,
      /browser storage/i,
      /can (extensions|plugins) read my data/i,
      /clearing browser cache/i,
      /localStorage vs indexedDB/i
    ],
    answer: `💾 **Client-Side Storage Isolation:**

SPrav utilizes isolated IndexedDB databases:
- **Same-Origin Policy:** Only web pages originating from SPrav's domain can access your IndexedDB stores.
- **Extension Hardening:** To protect against rogue browser extensions that have "all sites" access, activating a **Master Passphrase** encrypts credentials so they cannot be read in plaintext.
- **Persistent Storage:** Uses the browser StorageManager API to request persistent quota, preventing eviction under low disk space.`,
    relatedQueries: ['How does the Master Passphrase encryption work?', 'Can I export my data or create backups?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_owasp_top_10_compliance',
    category: 'privacy_security',
    title: 'How does SPrav defend against OWASP Top 10 vulnerabilities?',
    patterns: [
      /owasp/i,
      /security audit/i,
      /xss/i,
      /ssrf/i,
      /prototype pollution/i
    ],
    answer: `🛡️ **Full OWASP Top 10 Defense Suite:**

SPrav enforces automated pre-commit security gates across all 10 OWASP vectors:
- **A02 Cryptographic Failures:** PBKDF2 + AES-GCM vault with warnings on unencrypted keys.
- **A03 Injection & XSS:** Strict HTML escaping, safe JSON parsers, and zero eval execution.
- **A04 Insecure Design:** Deep freeze on Object prototypes and input normalization.
- **A05 Misconfiguration:** Strict CSP headers (\`script-src 'self' 'wasm-unsafe-eval' blob:\`).
- **A10 SSRF:** Cloud metadata blocklist (IMDS 169.254.169.254) in HTTP clients.`,
    relatedQueries: ['What are Content Security Policy and Subresource Integrity in SPrav?', 'How does the Master Passphrase encryption work?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_csp_and_sri',
    category: 'privacy_security',
    title: 'What are Content Security Policy and Subresource Integrity in SPrav?',
    patterns: [
      /content security policy/i,
      /\bcsp\b/i,
      /\bsri\b/i,
      /subresource integrity/i,
      /tamper protection/i
    ],
    answer: `🔐 **CSP & SRI Cryptographic Guardrails:**

- **Content-Security-Policy (CSP):** Enforced across Netlify, Vercel, and HTML headers to block unauthorized script injection, inline eval hacks, and malicious iframe clickjacking.
- **Subresource Integrity (SRI):** Every external CDN script is audited against cryptographic SHA-384 checksums. If a CDN file is tampered with by even 1 bit, the browser refuses to execute it.`,
    relatedQueries: ['How does SPrav defend against OWASP Top 10 vulnerabilities?', 'Is my resume and personal data private?'],
    contextTab: 'settings'
  }
];

// ─── Domain 3: ATS Discovery & Ingestion ──────────────────────────────────────
export const DOMAIN_3_ATS_DISCOVERY = [
  {
    id: 'faq_direct_ats_boards',
    category: 'ats_discovery',
    title: 'Which ATS platforms does SPrav scan directly?',
    patterns: [
      /which ats/i,
      /greenhouse/i,
      /lever/i,
      /ashby/i,
      /workday/i,
      /what job boards/i,
      /supported ats/i
    ],
    answer: `🏢 **Direct ATS Board Compatibility:**

SPrav scans real-time hiring systems directly without scraping aggregators:
- **Greenhouse:** Full API ingestion via official boards API.
- **Ashby:** Direct JSON feed scanning for fast-growing high-tech startups.
- **Lever:** Direct posting ingestion with structured salary and requirement data.
- **Enterprise ATS:** Workday, SmartRecruiters, iCIMS, Personio, BambooHR, and Rippling.
- **Aggregators:** RemoteOK, Remotive, Jobicy, and Arbeitnow for global remote tech.`,
    relatedQueries: ['What is the daily jobs mirror feed and how often does it sync?', 'How does SPrav detect and flag ghost jobs?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_daily_jobs_mirror',
    category: 'ats_discovery',
    title: 'What is the daily jobs mirror feed and how often does it sync?',
    patterns: [
      /daily jobs mirror/i,
      /mirror feed/i,
      /how often (does it refresh|jobs update)/i,
      /live feed/i,
      /github pages mirror/i
    ],
    answer: `📡 **Autonomous Daily Jobs Mirror:**

SPrav maintains an automated GitHub Actions crawler on [SPrav-Live-Feed](https://github.com/SVSPraveen/SPrav-Live-Feed):
- **Sync Schedule:** Runs daily at 00:00 UTC, indexing 3,500+ verified tech roles.
- **Deduplication:** Uses cryptographic content-hashing to eliminate duplicates.
- **Gzip Compression:** Transmits lightweight chunked \`.json.gz\` payloads to your browser to conserve data and load in milliseconds.`,
    relatedQueries: ['Which ATS platforms does SPrav scan directly?', 'How does SPrav detect and flag ghost jobs?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_discovery_gateways',
    category: 'ats_discovery',
    title: 'What are Discovery Gateways and how do they bypass CORS?',
    patterns: [
      /discovery gateway/i,
      /\bgateway status\b/i,
      /cors block/i,
      /how does (it|browser) fetch jobs/i
    ],
    answer: `🌐 **Multi-Gateway Discovery Network:**

Browsers enforce Cross-Origin Resource Sharing (CORS) that typically blocks direct client calls to third-party endpoints. SPrav resolves this with a resilient multi-tier gateway network:
1. **GitHub Pages Mirror:** Static HTTPS mirror updated continuously.
2. **CORS-Free Direct APIs:** Greenhouse, Ashby, and Remotive public JSON endpoints.
3. **Companion Browser Extension:** Relays raw web queries when installed.`,
    relatedQueries: ['What is the daily jobs mirror feed and how often does it sync?', 'How does the Chrome / Browser Extension Companion work?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_custom_company_watchlist',
    category: 'ats_discovery',
    title: 'How do I add custom companies to my watchlist?',
    patterns: [
      /add (a )?company/i,
      /watchlist/i,
      /custom company/i,
      /track company/i,
      /how to monitor/i
    ],
    answer: `⭐ **Custom Company Watchlist:**

In **Find Jobs → Watchlist Manager**:
1. Enter any company name (e.g. *Stripe*, *Figma*, *Datadog*, *Swiggy*).
2. SPrav identifies their underlying ATS engine (Greenhouse token, Ashby slug, Lever board).
3. The scanner queries the company's authentic career portal directly whenever you refresh jobs!`,
    relatedQueries: ['Which ATS platforms does SPrav scan directly?', 'How is my ATS Match Score calculated?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_usajobs_adzuna_integration',
    category: 'ats_discovery',
    title: 'How do government (USAJOBS) and Adzuna feeds work?',
    patterns: [
      /usajobs/i,
      /adzuna/i,
      /government jobs/i,
      /federal jobs/i
    ],
    answer: `🏛️ **USAJOBS & Adzuna Enterprise Integration:**

In **Settings → Job Discovery**:
- **USAJOBS:** Connect your free federal developer key and email to scan 10,000+ US Government IT, Cyber, and Defense engineering positions.
- **Adzuna:** Ingest national and international tech openings across 16 countries with salary estimates and regional breakdown.`,
    relatedQueries: ['Which ATS platforms does SPrav scan directly?', 'What is the daily jobs mirror feed and how often does it sync?'],
    contextTab: 'settings'
  }
];

// ─── Domain 4: Ghost Job & Spam Detection ─────────────────────────────────────
export const DOMAIN_4_GHOST_JOBS = [
  {
    id: 'faq_ghost_job_definition',
    category: 'ghost_job_detection',
    title: 'What is a Ghost Job and why do companies post them?',
    patterns: [
      /what is a ghost job/i,
      /ghost job/i,
      /fake job/i,
      /why (do|are) companies post fake jobs/i,
      /hiring freeze listings/i
    ],
    answer: `👻 **Understanding Ghost Jobs in Tech:**

A **Ghost Job** is an active job listing that an employer has no immediate intention of filling. Companies post them to:
- Give investors an illusion of rapid company growth.
- Keep a passive pool of resumes ready for future turnover.
- Pacify overworked employees by pretending help is on the way.
SPrav automatically audits every role against 6 risk heuristics to save you dozens of wasted application hours.`,
    relatedQueries: ['How does SPrav detect and flag ghost jobs?', 'How does listing age affect ghost job probability?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_ghost_job_heuristics',
    category: 'ghost_job_detection',
    title: 'How does SPrav detect and flag ghost jobs?',
    patterns: [
      /how does (it|sprav) detect ghost jobs/i,
      /ghost job heuristics/i,
      /ghost score/i,
      /spam detection/i,
      /ghost shield/i
    ],
    answer: `🛡️ **The 6-Vector Ghost Job Detection Algorithm:**

1. **Age Velocity Decay:** Listings active >60 days without revision accumulate high risk.
2. **Perpetual Reposting:** Positions continuously reposted every 30 days are flagged.
3. **Generic Jargon Density:** High concentration of boilerplate buzzwords with vague technical requirements.
4. **Evergreen Title Detection:** Broad titles (*"Software Engineer"*) with zero team or product specifics.
5. **Hiring Freeze Correlation:** Cross-referenced against known industry layoffs and headcount freezes.
6. **Application Wall Check:** Unusually high ATS applicant counts (>1,000) with no recruiter triage.`,
    relatedQueries: ['What is a Ghost Job and why do companies post them?', 'Can I disable the Ghost Job filter if I want to see all jobs?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_stale_listing_filter',
    category: 'ghost_job_detection',
    title: 'How does listing age affect ghost job probability?',
    patterns: [
      /listing age/i,
      /stale (job|listing)/i,
      /how old (is too old|are jobs)/i,
      /45 days|60 days|90 days/i
    ],
    answer: `⏱️ **Listing Freshness & Response Curves:**

Recruiting data shows that **80% of successful hires occur within the first 14 days** of a posting going live.
- **0–7 Days:** Peak response window (3.8x higher callback rate).
- **8–21 Days:** Standard active screening window.
- **30+ Days:** High risk of internal hire, canceled budget, or ghost role. SPrav applies an exponential decay penalty to older postings.`,
    relatedQueries: ['How does SPrav detect and flag ghost jobs?', 'How is my ATS Match Score calculated?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_reposted_job_signals',
    category: 'ghost_job_detection',
    title: 'Why are continuously reposted jobs suspicious?',
    patterns: [
      /reposted job/i,
      /why is this job reposted/i,
      /continually posted/i
    ],
    answer: `🔄 **The Repost Trap:**

When a company reposts the same position 3 or more times over several months:
- It usually signifies unrealistic salary bands, broken interview calibration, or automated evergreen harvesting.
- SPrav tracks unique job fingerprint IDs across time to alert you: *"⚠️ Reposted 3x in 90 days — high ghost probability."*`,
    relatedQueries: ['What is a Ghost Job and why do companies post them?', 'How does SPrav detect and flag ghost jobs?'],
    contextTab: 'find_jobs'
  },
  {
    id: 'faq_disable_ghost_filter',
    category: 'ghost_job_detection',
    title: 'Can I disable the Ghost Job filter if I want to see all jobs?',
    patterns: [
      /turn off ghost/i,
      /disable ghost/i,
      /hide ghost filter/i,
      /show all jobs/i
    ],
    answer: `⚙️ **Customizing the Ghost Shield:**

Yes. In **Find Jobs**, toggle the **Ghost & Spam Shield** switch in the filter bar.
- When **ON** (default): Postings with a ghost score above 65% are filtered out.
- When **OFF**: All scraped postings are shown, with a warning badge displayed on high-risk roles.`,
    relatedQueries: ['How does SPrav detect and flag ghost jobs?', 'What is a Ghost Job and why do companies post them?'],
    contextTab: 'find_jobs'
  }
];

// ─── Domain 5: ATS Scoring & Rubrics ──────────────────────────────────────────
export const DOMAIN_5_ATS_SCORING = [
  {
    id: 'faq_ats_score_calculation',
    category: 'ats_scoring_rubric',
    title: 'How is my ATS Match Score calculated?',
    patterns: [
      /how is (the )?ats score (calculated|computed)/i,
      /ats score/i,
      /match score/i,
      /scoring formula/i,
      /how does matching work/i
    ],
    answer: `📊 **Deterministic ATS Scoring Formula:**

SPrav evaluates match scores using a multi-factor weighted rubric:
- **Hard Technical Keywords (40%):** Direct and semantic matches with mandatory tech stack requirements.
- **Experience Duration & Seniority (25%):** Years of verified experience calibrated against the job's minimum requirements.
- **Domain & Role Alignment (15%):** Alignment between your target title and the job's functional hierarchy.
- **Architecture & Tooling (10%):** Cloud platforms, CI/CD, databases, and architectural patterns.
- **Freshness Multiplier (10%):** Boost for roles posted within the last 72 hours.`,
    relatedQueries: ['What are the 5 dimensions of the ATS scoring rubric?', 'What is the difference between semantic match and keyword search?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_5_dimension_scoring',
    category: 'ats_scoring_rubric',
    title: 'What are the 5 dimensions of the ATS scoring rubric?',
    patterns: [
      /5 dimensions/i,
      /five dimensions/i,
      /rubric dimensions/i,
      /scoring breakdown/i
    ],
    answer: `🎯 **The 5 Scoring Dimensions in SPrav:**

1. **Core Skills Match:** Languages, frameworks, and foundational computer science fundamentals.
2. **Seniority Calibration:** YoE matching (Junior, Mid, Senior, Staff, Principal) to prevent over/under-qualification penalties.
3. **Engineering Scope:** Scale of systems previously handled (e.g. QPS, distributed data volume, team size).
4. **Cloud & Infrastructure:** AWS, GCP, Azure, Docker, Kubernetes, and IaC tooling.
5. **Education & Certifications:** Degree requirements, equivalencies, and specialized accreditations.`,
    relatedQueries: ['How is my ATS Match Score calculated?', 'How do I see missing skills and bridge the gap for a role?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_semantic_vs_keyword',
    category: 'ats_scoring_rubric',
    title: 'What is the difference between semantic match and keyword search?',
    patterns: [
      /semantic vs keyword/i,
      /semantic match/i,
      /keyword matching/i,
      /semantic graph/i
    ],
    answer: `🧠 **Semantic Graph vs. Naive Keywords:**

- **Naive Keyword Search:** Fails if the JD asks for *"PostgreSQL"* and your resume lists *"Relational Databases"* or *"RDS"*.
- **SPrav Semantic Graph:** Understands relationships (e.g. *React* implies *JSX*, *Virtual DOM*, *Component Architecture*; *FastAPI* implies *Python*, *RESTful APIs*, *Pydantic*). You receive full credit for equivalent technologies!`,
    relatedQueries: ['How is my ATS Match Score calculated?', 'How do I see missing skills and bridge the gap for a role?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_interview_callback_odds',
    category: 'ats_scoring_rubric',
    title: 'How does SPrav predict my interview callback probability?',
    patterns: [
      /interview (probability|odds|chance|likelihood)/i,
      /will i get (an )?interview/i,
      /callback rate/i
    ],
    answer: `📈 **Interview Callback Likelihood Modeling:**

SPrav translates your match score into historical callback tiers:
- **85%+ Match:** **Very High (35–50% callback)** — Priority target. Apply immediately with tailored note.
- **70–84% Match:** **Strong (15–25% callback)** — Solid opportunity; bridge 1–2 missing skills in cover letter.
- **55–69% Match:** **Moderate (5–10% callback)** — Requires networking or tailored STAR bullets.
- **<55% Match:** **Low (<3% callback)** — Major skill gap; consider upskilling before applying.`,
    relatedQueries: ['How is my ATS Match Score calculated?', 'What are the 5 dimensions of the ATS scoring rubric?'],
    contextTab: 'dashboard'
  },
  {
    id: 'faq_missing_skills_bridge',
    category: 'ats_scoring_rubric',
    title: 'How do I see missing skills and bridge the gap for a role?',
    patterns: [
      /missing skill/i,
      /skill gap/i,
      /how to bridge (the )?gap/i,
      /what skills am i missing/i
    ],
    answer: `🌉 **Skill Gap Heatmap & Bridge Roadmaps:**

When inspecting any job card or in **Resume Studio**:
1. Look at the **Skill Breakdown** pills.
2. Green pills indicate confirmed matches; Amber pills highlight **Missing Core Skills**.
3. Click on any missing skill to open the **Skill Gap Roadmap Modal**, which provides free tutorial links (MDN, CS50, freeCodeCamp) and a 4-week study plan!`,
    relatedQueries: ['What is the difference between semantic match and keyword search?', 'How is my ATS Match Score calculated?'],
    contextTab: 'ats_resume'
  }
];
