/**
 * domains_resume.js
 * Specialized knowledge domains 6 through 9:
 *  6. AI-Powered Resume Tailoring
 *  7. Anti-AI Tell Scanner & Recruiter Signals
 *  8. STAR Story Bank & Behavioral Mastery
 *  9. ATS Document Compilers (DOCX & PDF)
 */

// ─── Domain 6: AI-Powered Resume Tailoring ──────────────────────────────────
export const DOMAIN_6_RESUME_TAILORING = [
  {
    id: 'faq_resume_tailoring_engine',
    category: 'resume_tailoring',
    title: 'How does the Resume Tailoring Engine work?',
    patterns: [
      /how does (the )?resume tailoring (work|engine work)/i,
      /tailor my resume/i,
      /customize resume for job/i,
      /resume optimization/i
    ],
    answer: `📝 **Intelligent 60-Second Resume Tailoring:**

In **Resume Studio** or directly from any job card:
1. **Requirement Extraction:** The engine extracts hard technical qualifications, architecture requirements, and required YoE from the target JD.
2. **Context Matching:** Queries your local **Knowledge Base** to locate your authentic projects, languages, and STAR bullets matching those requirements.
3. **Targeted Realignment:** Re-sequences bullet points and highlights matching tech stacks at the top of each role.`,
    relatedQueries: ['Does SPrav invent or hallucinate metrics or skills?', 'How do I optimize individual bullet points for an ATS?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_zero_fabrication_contract',
    category: 'resume_tailoring',
    title: 'Does SPrav invent or hallucinate metrics or skills?',
    patterns: [
      /does (it|sprav) (invent|fabricate|hallucinate|lie|make up)/i,
      /zero[- ]fabrication/i,
      /fake experience/i,
      /anti[- ]hallucination/i
    ],
    answer: `🛡️ **Strict Zero-Fabrication Contract:**

**SPrav will NEVER fabricate or hallucinate career experience.**
- **Anti-Hallucination Guard:** If a job requires a skill you do not possess (e.g. *Rust* or *Kubernetes*), SPrav will never inject it into your past work history.
- **Metric Integrity:** Existing performance metrics (*"reduced latency by 45%"*) are preserved verbatim. SPrav will never invent arbitrary percentages or dollar values.
- **Career Integrity:** Tailoring is strictly about highlighting your authentic matching experience, not lying.`,
    relatedQueries: ['How does the Resume Tailoring Engine work?', 'Which buzzwords are strictly forbidden in tailored resumes?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_bullet_optimization',
    category: 'resume_tailoring',
    title: 'How do I optimize individual bullet points for an ATS?',
    patterns: [
      /optimize (bullet|bullet point)/i,
      /how to write (a )?bullet/i,
      /bullet optimizer/i,
      /bullet points/i
    ],
    answer: `⚡ **Google 'X-Y-Z' Bullet Formulation:**

In **Resume Studio → Bullet Optimizer**:
SPrav refactors passive bullet points into the proven Google standard:
*"Accomplished [X], as measured by [Y], by doing [Z]"*
- **Weak:** *"Helped improve database queries for the team."*
- **Optimized:** *"Optimized PostgreSQL read replicas using composite indexing and Redis caching, reducing tail p99 query latency by 38%."*`,
    relatedQueries: ['Which buzzwords are strictly forbidden in tailored resumes?', 'How does the STAR method work?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_one_job_sprint',
    category: 'resume_tailoring',
    title: 'What is a 1-Job Sprint in Resume Studio?',
    patterns: [
      /1[- ]job sprint/i,
      /one job sprint/i,
      /sprint modal/i,
      /fast tailoring/i
    ],
    answer: `⏱️ **The 1-Job Sprint Workflow:**

The **1-Job Sprint** modal is designed for speed when applying to high-priority listings:
1. Paste a raw Job Description or select a discovered job.
2. The sprint runs instant 5-dimension rubric scoring in under 5 seconds.
3. Automatically outputs an ATS-optimized DOCX resume, a tailored cover letter, and customized screening question answers ready for immediate submission!`,
    relatedQueries: ['How does the Resume Tailoring Engine work?', 'How does SPrav generate 4-paragraph tailored cover letters?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_tailored_cover_letter',
    category: 'resume_tailoring',
    title: 'How does SPrav generate 4-paragraph tailored cover letters?',
    patterns: [
      /cover letter/i,
      /how does (sprav write|it write) cover letter/i,
      /cover letter architecture/i
    ],
    answer: `📄 **The 4-Paragraph Executive Architecture:**

SPrav cover letters reject generic templates and follow a high-impact structure:
1. **The Hook:** Specific reason for excitement about the company's product, referencing recent engineering achievements.
2. **The Hard Proof:** Detailed case study connecting your past technical projects to their core JD problem.
3. **The Cultural & Domain Value:** Your collaborative engineering philosophy, mentoring, or architecture practices.
4. **The Call to Action:** Confident, proactive closing suggesting a specific technical discussion.`,
    relatedQueries: ['Does SPrav invent or hallucinate metrics or skills?', 'Which buzzwords are strictly forbidden in tailored resumes?'],
    contextTab: 'ats_resume'
  }
];

// ─── Domain 7: Anti-AI Buzzwords & Recruiter Signal ──────────────────────────
export const DOMAIN_7_ANTI_AI_TELLS = [
  {
    id: 'faq_anti_ai_tell_scanner',
    category: 'anti_ai_buzzwords',
    title: 'What is the Anti-AI Tell Scanner and why does it matter?',
    patterns: [
      /anti[- ]ai tell/i,
      /ai tell scanner/i,
      /ai buzzwords/i,
      /why avoid ai words/i
    ],
    answer: `🔍 **The Anti-AI Tell Scanner:**

Recruiters read thousands of resumes and immediately flag ChatGPT cliches. The **Anti-AI Tell Scanner**:
- Audits your resume for 45+ dead giveaways (*"spearheaded"*, *"testament to"*, *"tapestry"*, *"in summary"*, *"dynamic"*).
- Calculates an **AI Cliche Density Score**.
- Replaces generic AI filler with concrete technical verbs (*"profiled"*, *"architected"*, *"provisioned"*, *"sharded"*).`,
    relatedQueries: ['Which buzzwords are strictly forbidden in tailored resumes?', 'Can recruiters detect AI-generated resumes?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_forbidden_buzzwords',
    category: 'anti_ai_buzzwords',
    title: 'Which buzzwords are strictly forbidden in tailored resumes?',
    patterns: [
      /forbidden buzzwords/i,
      /banned words/i,
      /buzzword list/i,
      /words to avoid/i
    ],
    answer: `🚫 **Top Banned AI & Recruiter Cliches:**

- **Fluff Adjectives:** *"Passionate"*, *"results-driven"*, *"detail-oriented"*, *"dynamic"*, *"visionary"*.
- **Vague Corporate Jargon:** *"Synergy"*, *"spearheaded"*, *"orchestrated"*, *"leverage"*, *"paradigm"*.
- **Passive Phrases:** *"Responsible for"*, *"assisted with"*, *"worked on"*, *"participated in"*.
Replace these with verifiable engineering actions and quantitative outcomes!`,
    relatedQueries: ['What is the Anti-AI Tell Scanner and why does it matter?', 'How should engineering achievements be phrased?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_action_verbs_metric',
    category: 'anti_ai_buzzwords',
    title: 'How should engineering achievements be phrased?',
    patterns: [
      /action verbs/i,
      /how to phrase achievements/i,
      /strong verbs/i,
      /engineering verbs/i
    ],
    answer: `💪 **Authoritative Engineering Action Verbs:**

Organize bullets around concrete system lifecycle phases:
- **Architecture:** *Designed, decoupled, modularized, partitioned, unified.*
- **Performance:** *Profiled, benchmarked, cached, sharded, optimized.*
- **Reliability:** *Hardened, audited, instrumented, automated, remediated.*
- **Delivery:** *Shipped, provisioned, deployed, migrated, continuous-integrated.*`,
    relatedQueries: ['Which buzzwords are strictly forbidden in tailored resumes?', 'What is the STAR method and how does SPrav use it?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_recruiter_ai_detection',
    category: 'anti_ai_buzzwords',
    title: 'Can recruiters detect AI-generated resumes?',
    patterns: [
      /can recruiters detect ai/i,
      /ai detector/i,
      /turnitin/i,
      /gptzero/i,
      /will i get disqualified for ai/i
    ],
    answer: `🤖 **The Reality of AI Detection in Recruiting:**

Recruiters don't run resumes through automated AI detectors—they simply read the first 3 bullets. If they spot generic tone, overly formal vocabulary, and empty claims without specific architectural details, they reject the resume. SPrav protects you by enforcing authentic project specifics and zero filler.`,
    relatedQueries: ['What is the Anti-AI Tell Scanner and why does it matter?', 'Which buzzwords are strictly forbidden in tailored resumes?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_cliche_replacement_tips',
    category: 'anti_ai_buzzwords',
    title: "How do I replace clichés like 'responsible for' or 'helped'?",
    patterns: [
      /responsible for/i,
      /how to replace helped/i,
      /cliche replacement/i
    ],
    answer: `🔄 **Instant Cliche Transformations:**

- *"Responsible for building APIs"* → **"Engineered 14 RESTful and gRPC microservices handling 5,000 req/sec in Go and Docker."**
- *"Helped team with CI/CD"* → **"Configured GitHub Actions deployment pipelines, reducing build times from 25 min to 4 min."**
- *"Worked on the frontend"* → **"Developed responsive client views in React & TypeScript, boosting mobile checkout conversion by 18%."**`,
    relatedQueries: ['How should engineering achievements be phrased?', 'How do I optimize individual bullet points for an ATS?'],
    contextTab: 'ats_resume'
  }
];

// ─── Domain 8: STAR Story Bank & Behavioral Mastery ──────────────────────────
export const DOMAIN_8_STAR_STORIES = [
  {
    id: 'faq_star_story_framework',
    category: 'star_story_method',
    title: 'What is the STAR method and how does SPrav use it?',
    patterns: [
      /star method/i,
      /star framework/i,
      /what is star/i,
      /situation task action result/i
    ],
    answer: `⭐ **The STAR Behavioral Architecture:**

The gold standard for behavioral and technical leadership interviews:
- **Situation (20%):** The business context, scale, and specific obstacle.
- **Task (10%):** Your specific ownership and responsibilities.
- **Action (50%):** The technical decisions, tradeoffs, and execution steps you personally drove.
- **Result (20%):** Quantifiable metrics, business impact, and key engineering lessons.`,
    relatedQueries: ['What is the STAR Story Bank in Knowledge Base?', 'How do I map STAR stories to Amazon Leadership Principles?'],
    contextTab: 'profile'
  },
  {
    id: 'faq_star_story_bank',
    category: 'star_story_method',
    title: 'What is the STAR Story Bank in Knowledge Base?',
    patterns: [
      /star story bank/i,
      /story bank/i,
      /behavioral stories/i,
      /saved stories/i
    ],
    answer: `📚 **Your Personal STAR Story Bank:**

In **Profile / Knowledge Base → STAR Story Bank**:
- Store your core career anecdotes structured into Situation, Task, Action, and Result.
- Tag stories with competencies (*Leadership, System Design, Conflict Resolution, Latency Optimization*).
- Copilot automatically retrieves matching stories when you prepare for company interview rounds!`,
    relatedQueries: ['What is the STAR method and how does SPrav use it?', 'How do I map STAR stories to Amazon Leadership Principles?'],
    contextTab: 'profile'
  },
  {
    id: 'faq_amazon_leadership_principles',
    category: 'star_story_method',
    title: 'How do I map STAR stories to Amazon Leadership Principles?',
    patterns: [
      /amazon leadership principles/i,
      /lp questions/i,
      /customer obsession/i,
      /bias for action/i,
      /bar raiser/i
    ],
    answer: `📦 **Amazon Leadership Principle Alignment:**

SPrav maps your STAR stories to Amazon's 16 Leadership Principles:
- **Customer Obsession:** Stories where you solved root user pain points or fixed broken production UX.
- **Ownership:** When you stepped up to resolve unassigned technical debt or systemic blockers.
- **Bias for Action:** Executing two-way door decisions under high ambiguity without waiting for committee approval.
- **Dive Deep:** Root cause post-mortems and debugging memory leaks or distributed system race conditions.`,
    relatedQueries: ['What is the STAR Story Bank in Knowledge Base?', 'How do I rehearse behavioral interview questions with my stories?'],
    contextTab: 'gateway'
  },
  {
    id: 'faq_quantifiable_metrics_star',
    category: 'star_story_method',
    title: "How do I quantify my results if I don't know exact numbers?",
    patterns: [
      /how to quantify/i,
      /no exact numbers/i,
      /metric estimation/i,
      /quantifying results/i
    ],
    answer: `📐 **Honest Metric Framing Framework:**

If your company didn't track analytics, use relative orders of magnitude:
- **Time/Velocity:** *"Reduced manual deploy steps from 8 manual stages to 1 automated command."*
- **Scale:** *"Deployed across 12 services supporting 50+ internal developers daily."*
- **Error Reduction:** *"Eliminated customer-facing null pointer crashes during peak holiday traffic."*`,
    relatedQueries: ['What is the STAR method and how does SPrav use it?', 'How do I optimize individual bullet points for an ATS?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_star_behavioral_interview_prep',
    category: 'star_story_method',
    title: 'How do I rehearse behavioral interview questions with my stories?',
    patterns: [
      /rehearse behavioral/i,
      /behavioral prep/i,
      /mock behavioral/i,
      /interview prep questions/i
    ],
    answer: `🎙️ **AI Behavioral Simulation & Evaluation:**

In **Interview Workspace**:
1. Select any company pipeline (e.g. *Amazon*, *Stripe*, *Google*).
2. Choose a competency or let SPrav generate realistic questions based on your target role.
3. Record or type your answer: SPrav evaluates your response on STAR structure, filler words, and technical depth!`,
    relatedQueries: ['What is the STAR Story Bank in Knowledge Base?', 'How do I map STAR stories to Amazon Leadership Principles?'],
    contextTab: 'interview'
  }
];

// ─── Domain 9: ATS Document Compilers ─────────────────────────────────────────
export const DOMAIN_9_ATS_COMPILERS = [
  {
    id: 'faq_ats_docx_compiler',
    category: 'ats_compilers',
    title: 'How does the ATS DOCX XML generator work?',
    patterns: [
      /docx compiler/i,
      /how does (sprav generate|it generate) docx/i,
      /word document/i,
      /native docx/i
    ],
    answer: `📑 **Native ATS DOCX Binary Compiler:**

SPrav features an in-browser DOCX compiler:
- **Zero Third-Party Cloud Services:** Compiles raw OpenXML (\`document.xml\`, \`styles.xml\`, \`numbering.xml\`) directly in browser memory.
- **Single-Column Semantic Structure:** Pure paragraphs and standard heading styles that parse cleanly into Greenhouse, Workday, and Taleo with 100% field accuracy.`,
    relatedQueries: ['Are SPrav PDFs guaranteed to be readable by ATS parsers?', 'Why are 2-column or graphic-heavy resumes rejected by ATS?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_ats_pdf_compiler',
    category: 'ats_compilers',
    title: 'Are SPrav PDFs guaranteed to be readable by ATS parsers?',
    patterns: [
      /ats pdf/i,
      /are pdfs readable/i,
      /pdf parser/i,
      /pdf vs docx/i
    ],
    answer: `📜 **ATS-Safe Vector PDF Engine:**

Yes. SPrav's PDF compiler guarantees total parseability:
- **Embedded Text Stream:** Avoids scanned image renders; every character is encoded with standard UTF-8 text vectors.
- **Linear Reading Order:** No floating text boxes or overlapping layers that confuse optical character scanners.
- **Copy-Paste Verifiability:** You can highlight and copy any text from the generated PDF cleanly.`,
    relatedQueries: ['How does the ATS DOCX XML generator work?', 'Why are 2-column or graphic-heavy resumes rejected by ATS?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_two_column_resume_trap',
    category: 'ats_compilers',
    title: 'Why are 2-column or graphic-heavy resumes rejected by ATS?',
    patterns: [
      /2 column/i,
      /two column resume/i,
      /canva resume/i,
      /graphic resume/i,
      /why single column/i
    ],
    answer: `⚠️ **The Multi-Column Parsing Trap:**

Standard ATS parsers (Workday, iCIMS, Taleo) read left-to-right across the page:
- When encountering two columns, parsers often interleave text horizontally across both columns, jumbling dates, titles, and company names into gibberish.
- Skill rating bars (*"Python: 4/5 stars"*) are unparseable by computers.
- **SPrav's Rule:** Always use clean, single-column chronological formats for guaranteed parsing.`,
    relatedQueries: ['Are SPrav PDFs guaranteed to be readable by ATS parsers?', 'Which fonts are safe for ATS resumes?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_font_selection_ats',
    category: 'ats_compilers',
    title: 'Which fonts are safe for ATS resumes?',
    patterns: [
      /safe fonts/i,
      /ats fonts/i,
      /which font to use/i,
      /inter vs arial/i
    ],
    answer: `🔤 **Universal ATS-Safe Typography:**

Use standard web-safe fonts universally supported by all operating systems and parsers:
- **Sans-Serif:** *Inter*, *Arial*, *Calibri*, *Helvetica*, *Roboto*.
- **Serif:** *Georgia*, *Times New Roman*, *Garamond*.
Avoid custom script fonts, icon glyphs as bullet points, or un-embedded third-party fonts.`,
    relatedQueries: ['How does the ATS DOCX XML generator work?', 'Why are 2-column or graphic-heavy resumes rejected by ATS?'],
    contextTab: 'ats_resume'
  },
  {
    id: 'faq_download_resume_formats',
    category: 'ats_compilers',
    title: 'Can I download both DOCX and PDF formats?',
    patterns: [
      /download formats/i,
      /export format/i,
      /download docx/i,
      /download pdf/i
    ],
    answer: `📥 **Dual-Format 1-Click Export:**

In **Resume Studio**:
- Click **Export DOCX** for an editable Microsoft Word document preferred by traditional corporate recruiting agencies.
- Click **Export PDF** for a beautifully formatted vector document ideal for direct web application uploads and recruiter emails.`,
    relatedQueries: ['How does the ATS DOCX XML generator work?', 'Are SPrav PDFs guaranteed to be readable by ATS parsers?'],
    contextTab: 'ats_resume'
  }
];
