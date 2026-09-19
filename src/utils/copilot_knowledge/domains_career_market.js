/**
 * domains_career_market.js
 * Specialized knowledge domains 15 through 22:
 * 15. Location Scoping & Geo-Radius
 * 16. Assessment & OA Gateways
 * 17. Company Round Blueprints
 * 18. Salary Benchmarking & Voss Negotiation
 * 19. Recruiter Outreach & InMails
 * 20. Emerging 2025-2026 Tech Roles
 * 21. Career Strategy & Transitions
 * 22. Data Vault, Backup & Portability
 */

// ─── Domain 15: Location Scoping & Geo-Radius ────────────────────────────────
export const DOMAIN_15_LOCATION = [
  {
    id: 'faq_location_scoping_rules',
    category: 'location_scoping',
    title: 'How do I set up geographic location scoping in SPrav?',
    patterns: [
      /location (scoping|settings|filters)/i,
      /how to set location/i,
      /geo[- ]radius/i,
      /change country/i
    ],
    answer: `🗺️ **Setting Up Location Scoping:**

1. Navigate to **Application Scope** in the sidebar.
2. Select your primary target geographic market:
   - **United States & Canada:** (SF Bay Area, NYC, Seattle, Austin, Toronto, etc.)
   - **India Tech Hubs:** (Bengaluru, Hyderabad, Pune, NCR, Chennai)
   - **Europe & UK:** (London, Berlin, Amsterdam, Dublin)
   - **Remote Worldwide:** (Global remote contracts)
3. Set your **Max Commute Radius** (e.g. 25–50 miles) or enforce **100% Remote Only**.`,
    relatedQueries: ['How do I filter for true remote vs hybrid or return-to-office jobs?', 'Which global tech hubs and cities are supported in location scoping?'],
    contextTab: 'scope'
  },
  {
    id: 'faq_remote_job_filtering',
    category: 'location_scoping',
    title: 'How do I filter for true remote vs hybrid or return-to-office jobs?',
    patterns: [
      /true remote/i,
      /filter remote jobs/i,
      /hybrid vs remote/i,
      /return to office/i
    ],
    answer: `🏠 **True Remote Detection Engine:**

Many companies post "Remote" titles but conceal strict in-office mandates inside the job text:
- SPrav scans the full text for disqualifying terms: *"hybrid 3 days/week"*, *"must reside within 50 miles of HQ"*, *"temporary remote"*.
- When **Strict Remote** is toggled, SPrav automatically flags or eliminates misleading hybrid listings, saving you dozens of wasted applications!`,
    relatedQueries: ['How do I set up geographic location scoping in SPrav?', 'How does SPrav detect ghost jobs?'],
    contextTab: 'scope'
  },
  {
    id: 'faq_global_tech_cities',
    category: 'location_scoping',
    title: 'Which global tech hubs and cities are supported in location scoping?',
    patterns: [
      /supported cities/i,
      /which countries/i,
      /can i search jobs in (india|us|uk|europe|germany|canada)/i
    ],
    answer: `🌍 **Comprehensive Global Tech Hub Coverage:**

SPrav natively indexes and geo-normalizes listings across:
- **North America:** San Francisco, New York, Seattle, Austin, Boston, Chicago, Los Angeles, Toronto, Vancouver.
- **India:** Bengaluru (Bangalore), Hyderabad, Pune, Mumbai, Delhi NCR (Gurugram/Noida), Chennai.
- **Europe & UK:** London, Berlin, Amsterdam, Dublin, Paris, Stockholm, Munich, Zurich.
- **Asia-Pacific:** Singapore, Sydney, Melbourne, Tokyo.
All city names are normalized against regional aliases so you never miss jobs!`,
    relatedQueries: ['How do I set up geographic location scoping in SPrav?', 'What is role alias normalization and how does it prevent missing jobs?'],
    contextTab: 'scope'
  },
  {
    id: 'faq_seniority_boundary_filter',
    category: 'location_scoping',
    title: 'How do I restrict job search to specific seniority levels?',
    patterns: [
      /seniority (filter|level)/i,
      /entry[- ]level jobs/i,
      /staff engineer jobs/i,
      /exclude senior/i
    ],
    answer: `📶 **Seniority Boundary Filtering:**

In **Application Scope**, adjust the Seniority Tier sliders:
- **Junior / Early Career:** Intern, Associate, Junior, L3, Software Engineer I (0–2 years).
- **Mid-Level:** Software Engineer II, Full Stack Developer, L4 (2–5 years).
- **Senior:** Senior Engineer, Lead, Tech Lead, L5 (5–8 years).
- **Staff / Principal / Director:** Staff, Principal, Architect, Engineering Manager, Director (8+ years).

SPrav inspects both the title and the required experience years in the body text to eliminate roles outside your target band.`,
    relatedQueries: ['How do I set up geographic location scoping in SPrav?', 'What is role alias normalization and how does it prevent missing jobs?'],
    contextTab: 'scope'
  },
  {
    id: 'faq_role_alias_normalization',
    category: 'location_scoping',
    title: 'What is role alias normalization and how does it prevent missing jobs?',
    patterns: [
      /role alias/i,
      /job title normalization/i,
      /synonym matching/i
    ],
    answer: `🔄 **Intelligent Role Alias Normalization:**

Recruiters use hundreds of variations for identical technical roles:
- Searching for *"Frontend Engineer"* automatically matches *"UI Developer"*, *"React Engineer"*, *"Web Application Developer"*, and *"Client Platform Engineer"*.
- Searching for *"DevOps Engineer"* includes *"SRE"*, *"Platform Engineer"*, *"Cloud Systems Architect"*, and *"Infrastructure Engineer"*.
This expands your qualified discovery reach by over **350%** without cluttering your feed with irrelevant listings.`,
    relatedQueries: ['How do I set up geographic location scoping in SPrav?', 'How is the ATS rubric score calculated?'],
    contextTab: 'scope'
  }
];

// ─── Domain 16: Assessment & OA Gateways ─────────────────────────────────────
export const DOMAIN_16_ASSESSMENTS = [
  {
    id: 'faq_oa_gateway_tracker',
    category: 'assessment_gateways',
    title: 'How does the Online Assessment (OA) Gateway tracker work?',
    patterns: [
      /oa gateway/i,
      /online assessment tracker/i,
      /track hackerank/i,
      /codesignal test/i
    ],
    answer: `⏱️ **OA & Technical Assessment Tracker:**

When you advance to the assessment round:
1. In your **Application Tracker**, set stage to **OA / Assessment**.
2. Record the assessment platform (HackerRank, CodeSignal, Codility, Karat, Take-Home).
3. Set the expiration deadline date and time.
4. SPrav displays active countdown badges and alerts you 24 hours prior to deadline expiration so no invitation lapses!`,
    relatedQueries: ['How do deadline countdown timers prevent missed OA opportunities?', 'How should I prepare for HackerRank, CodeSignal, and LeetCode OAs?'],
    contextTab: 'tracker'
  },
  {
    id: 'faq_oa_countdown_timers',
    category: 'assessment_gateways',
    title: 'How do deadline countdown timers prevent missed OA opportunities?',
    patterns: [
      /countdown timer/i,
      /oa deadline/i,
      /assessment expiring/i
    ],
    answer: `⏰ **Proactive Deadline Management:**

Company OA links typically expire strictly 48 to 72 hours after dispatch:
- SPrav renders color-coded urgency indicators:
  - 🟢 **> 48h:** Scheduled & Preparing
  - 🟡 **< 24h:** Urgent Priority
  - 🔴 **< 6h:** Critical Expiration Alert
- Stay in control and never forfeit an invitation to FAANG or high-growth startups due to an overlooked email!`,
    relatedQueries: ['How does the Online Assessment (OA) Gateway tracker work?', 'How should I prepare for HackerRank, CodeSignal, and LeetCode OAs?'],
    contextTab: 'tracker'
  },
  {
    id: 'faq_hackerrank_codesignal_tips',
    category: 'assessment_gateways',
    title: 'How should I prepare for HackerRank, CodeSignal, and LeetCode OAs?',
    patterns: [
      /hackerrank tips/i,
      /codesignal preparation/i,
      /how to pass oa/i,
      /leetcode strategy/i
    ],
    answer: `💻 **Mastering Algorithmic Online Assessments:**

1. **CodeSignal General Coding Assessment (GCA):**
   - Question 1 & 2: Simple arrays/strings (solve in < 15 mins).
   - Question 3: Implementation/matrix simulation (focus on edge cases).
   - Question 4: Complex data structure / DP / HashMaps. Aim for a score of **800+** for top-tier tech firms.
2. **HackerRank & Codility Best Practices:**
   - Always run custom edge cases (empty array, negative numbers, large inputs of $N = 10^5$).
   - Watch out for $O(N^2)$ timeouts; optimize to $O(N \log N)$ or $O(N)$ using HashMaps or two pointers.`,
    relatedQueries: ['How does the Online Assessment (OA) Gateway tracker work?', 'How do I prepare for asynchronous AI video interviews like HireVue?'],
    contextTab: 'tracker'
  },
  {
    id: 'faq_hirevue_ai_video_prep',
    category: 'assessment_gateways',
    title: 'How do I prepare for asynchronous AI video interviews like HireVue?',
    patterns: [
      /hirevue/i,
      /ai video interview/i,
      /asynchronous interview/i,
      /video assessment/i
    ],
    answer: `📹 **Dominating HireVue & Automated Video Interviews:**

Automated video interview systems analyze your speech clarity, sentiment, and keyword density:
- **Direct Eye Contact:** Look directly into your webcam, not at your own video tile on screen.
- **Structured STAR Response:** Keep answers within 90–120 seconds using the Situation → Task → Action → Result format.
- **Incorporate Job Keywords:** Mention company core values and technical skills naturally during your spoken answers.`,
    relatedQueries: ['How do I structure a STAR story for behavioral interviews?', 'How should I prepare for HackerRank, CodeSignal, and LeetCode OAs?'],
    contextTab: 'stories'
  },
  {
    id: 'faq_psychometric_pymetrics_prep',
    category: 'assessment_gateways',
    title: 'How do game-based psychometric tests (e.g. Pymetrics) work and how do I pass them?',
    patterns: [
      /pymetrics/i,
      /psychometric test/i,
      /game[- ]based assessment/i
    ],
    answer: `🎲 **Cracking Game-Based Psychometric Tests:**

Companies like JPMorgan, BCG, and Unilever use Pymetrics mini-games to evaluate behavioral traits:
- **Balloons / Risk Tolerance:** Pump conservatively for steady points; don't gamble until popping.
- **Keypress / Attention:** Maintain steady, rhythmic pacing rather than erratic bursts.
- **Facial Emotion Recognition:** Select neutral or primary emotions; avoid second-guessing subtle micro-expressions.
- Consistency across all 12 mini-games matches the benchmark profile of top engineering performers.`,
    relatedQueries: ['How does the Online Assessment (OA) Gateway tracker work?', 'How do I prepare for asynchronous AI video interviews like HireVue?'],
    contextTab: 'tracker'
  }
];

// ─── Domain 17: Company Round Blueprints ─────────────────────────────────────
export const DOMAIN_17_BLUEPRINTS = [
  {
    id: 'faq_blueprint_google_pipeline',
    category: 'company_blueprints',
    title: "What is Google's engineering interview pipeline and rubric?",
    patterns: [
      /google('s)? interview/i,
      /google pipeline/i,
      /how to pass google/i,
      /google rubric/i,
      /google hiring committee/i
    ],
    answer: `🔍 **Google Engineering Interview Blueprint (L4/L5):**

Google's evaluation rubric is standardized across four pillars:
1. **General Cognitive Ability (GCA):** How you navigate ambiguity, clarify requirements, and structure unknown problems.
2. **Role-Related Knowledge (RRK):** Clean algorithmic problem-solving (Arrays, DP, Graphs) with explicit time/space complexity analysis.
3. **Googleyness & Leadership:** Intellectual humility, willingness to do the right thing, and unselfish team collaboration.
4. **Hiring Committee (HC):** Unlike other firms where the manager decides, Google uses an independent committee that reviews your packet blind without knowing you personally. High-signal STAR stories and clean code proofs are vital!`,
    relatedQueries: ["How do I ace Amazon's Bar Raiser and 16 Leadership Principles?", 'How is the Meta engineering interview structured?'],
    contextTab: 'stories'
  },
  {
    id: 'faq_blueprint_amazon_pipeline',
    category: 'company_blueprints',
    title: "How do I ace Amazon's Bar Raiser and 16 Leadership Principles?",
    patterns: [
      /amazon('s)? interview/i,
      /amazon bar raiser/i,
      /16 leadership principles/i,
      /amazon lp/i
    ],
    answer: `📦 **Amazon Bar Raiser & Leadership Principles (LP) Mastery:**

Every interview round at Amazon allocates **50% of the time to behavioral LPs** and 50% to technical execution:
- **The Bar Raiser:** An external interviewer from another team who holds veto power. They assess if you are better than 50% of current Amazonians at that level.
- **Top 5 Critical LPs:**
  1. *Customer Obsession* (Starting with the customer and working backwards).
  2. *Ownership* (Acting on behalf of the entire company, never saying "that's not my job").
  3. *Invent and Simplify* (De-complicating complex architectures).
  4. *Bias for Action* (Calculated risk-taking without analysis paralysis).
  5. *Deliver Results* (Overcoming roadblocks to push projects across the finish line).
- **Golden Rule:** Every answer MUST follow the STAR format with quantifiable business metrics!`,
    relatedQueries: ["What is Google's engineering interview pipeline and rubric?", 'How do I structure a STAR story for behavioral interviews?'],
    contextTab: 'stories'
  },
  {
    id: 'faq_blueprint_meta_pipeline',
    category: 'company_blueprints',
    title: 'How is the Meta engineering interview structured (Coding + System Design + Behavioral)?',
    patterns: [
      /meta('s)? interview/i,
      /facebook interview/i,
      /meta coding round/i,
      /meta system design/i
    ],
    answer: `♾️ **Meta Engineering Interview Architecture:**

Meta focuses intensely on coding speed, flawless syntax, and scalable system architecture:
- **Coding Rounds (2 x 45 min):** Expect to complete **two medium/hard LeetCode problems in 45 minutes**. Speed and zero-bug implementation are paramount.
- **System Design Round (System Design & Architecture):** Design large-scale distributed systems (e.g. Newsfeed, Typeahead Search, Video Live-Streaming). Focus on API design, data model, partitioning, and bottleneck mitigation.
- **Behavioral (Jedi Round):** Evaluates adaptability, conflict resolution, and handling constructive feedback.`,
    relatedQueries: ["What is Google's engineering interview pipeline and rubric?", "How do I ace Amazon's Bar Raiser and 16 Leadership Principles?"],
    contextTab: 'stories'
  },
  {
    id: 'faq_blueprint_tcs_infosys',
    category: 'company_blueprints',
    title: 'What is the interview pattern for Indian IT service giants (TCS, Infosys, Wipro, Cognizant)?',
    patterns: [
      /tcs (interview|nqt)/i,
      /infosys (interview|dse|sp)/i,
      /wipro/i,
      /cognizant/i,
      /indian it companies/i
    ],
    answer: `🏢 **Indian IT Services Interview Roadmap (TCS / Infosys / Wipro / HCL):**

1. **National Qualifier Tests (NQT / InfyTQ):**
   - Quantitative Aptitude, Logical Reasoning, and Verbal Ability.
   - Core Coding (2–3 problems on strings, arrays, sorting).
2. **Technical Interview:**
   - Deep dive into OOP concepts (Encapsulation, Polymorphism, Inheritance, Abstraction).
   - Relational Database fundamentals (SQL Joins, ACID properties, Normalization).
   - Final Year Academic Project explanation and role clarity.
3. **Managerial & HR Round:**
   - Communication clarity, willingness to relocate, shift flexibility, and bond agreements.`,
    relatedQueries: ['How do Indian tech unicorns (Swiggy, Zomato, Flipkart, Razorpay) interview engineers?', 'How should I explain a career gap or sabbatical on my resume?'],
    contextTab: 'stories'
  },
  {
    id: 'faq_blueprint_indian_unicorns',
    category: 'company_blueprints',
    title: 'How do Indian tech unicorns (Swiggy, Zomato, Flipkart, Razorpay) interview engineers?',
    patterns: [
      /indian unicorns/i,
      /swiggy/i,
      /zomato/i,
      /flipkart/i,
      /razorpay/i,
      /product companies india/i
    ],
    answer: `🦄 **Indian High-Growth Product & Unicorn Blueprint:**

Top product firms in India prioritize high-concurrency systems and deep practical engineering:
- **Machine Coding Round (90–120 min):** Clean, working, object-oriented code with unit tests (e.g. In-memory Key-Value store, Parking Lot, Splitwise clone, Ride-sharing pricing engine).
- **Data Structures & Algorithms:** Graphs, dynamic programming, and heaps.
- **Low-Level Design (LLD):** SOLID principles, design patterns (Factory, Observer, Strategy).
- **High-Level Design (HLD):** Caching strategies (Redis), message queues (Kafka), database sharding under peak Indian traffic surges (e.g. Big Billion Days, IPL matches).`,
    relatedQueries: ['What is the interview pattern for Indian IT service giants (TCS, Infosys, Wipro, Cognizant)?', "What is Google's engineering interview pipeline and rubric?"],
    contextTab: 'stories'
  }
];

// ─── Domain 18: Salary Benchmarking & Voss Negotiation ──────────────────────
export const DOMAIN_18_NEGOTIATION = [
  {
    id: 'faq_salary_benchmark_engine',
    category: 'salary_negotiation',
    title: "How does SPrav's salary benchmarking engine estimate market compensation?",
    patterns: [
      /salary benchmark/i,
      /how does sprav estimate salary/i,
      /market compensation/i,
      /pay band data/i
    ],
    answer: `💰 **Salary Benchmarking & Market Comp Engine:**

SPrav cross-references compensation bands against real-world verified tech offers:
- Evaluates your **Job Title**, **Target Location**, and **Seniority Tier**.
- Synthesizes 25th, 50th (median), 75th, and 90th percentile compensation curves.
- In **Salary Negotiation**, SPrav helps you identify where your offer sits on the market curve so you never leave money on the table!`,
    relatedQueries: ['What are the rules of Chris Voss style salary negotiation?', 'How do I calculate Total Compensation (TC)?'],
    contextTab: 'negotiation'
  },
  {
    id: 'faq_voss_negotiation_rules',
    category: 'salary_negotiation',
    title: 'What are the rules of Chris Voss style salary negotiation?',
    patterns: [
      /chris voss/i,
      /voss negotiation/i,
      /negotiation rules/i,
      /never split the difference/i
    ],
    answer: `🤝 **Chris Voss Negotiation Playbook for Tech Compensation:**

From *Never Split the Difference*, adapted specifically for software offers:
1. **Calibrated "How" & "What" Questions:** Instead of demanding more money, ask: *"How am I on-boarded successfully if the base compensation makes relocation unfeasible?"*
2. **Mirroring & Tactical Empathy:** Repeat the last 3 words of the recruiter's objection: *"Recruiter: We have a strict compensation cap." Candidate: "A strict compensation cap?"*
3. **Anchor with Non-Monetary Levers:** If base salary is fixed, negotiate signing bonuses, accelerated vesting, remote stipends, or extra equity.
4. **Never Be the First to Disclose Numbers:** When asked for your current salary, pivot: *"I'm focused on the value of this role, and based on market benchmarks, I'm targeting roles in the $X to $Y range."*`,
    relatedQueries: ['How do I frame a counter-offer email without sounding aggressive?', 'How do I evaluate equity, stock options (ISOs/NSOs), and RSUs?'],
    contextTab: 'negotiation'
  },
  {
    id: 'faq_counter_offer_framing',
    category: 'salary_negotiation',
    title: 'How do I frame a counter-offer email without sounding aggressive or risking the offer?',
    patterns: [
      /counter offer email/i,
      /how to ask for more money/i,
      /counter offer script/i,
      /will they rescind my offer/i
    ],
    answer: `✉️ **Professional High-Win Counter-Offer Script:**

*"Thank you so much for this exciting offer to join [Company] as [Role]! I am genuinely thrilled about the team's mission to build [Project].*

*I reviewed the compensation package closely. Given my proven track record in delivering [Key Metric / Specialty] and current competing conversations in this tier, I am looking for a total compensation of [Target TC] (or a base salary of [Target Base]) to make this an immediate, confident decision.*

*If we can reach this number, I am ready to sign and submit my acceptance today. Is there flexibility to make this adjustment?"*

Companies virtually **never rescind offers** for polite, well-reasoned counters grounded in excitement and market data!`,
    relatedQueries: ['What are the rules of Chris Voss style salary negotiation?', 'How do I calculate Total Compensation (TC)?'],
    contextTab: 'negotiation'
  },
  {
    id: 'faq_equity_rsu_evaluation',
    category: 'salary_negotiation',
    title: 'How do I evaluate equity, stock options (ISOs/NSOs), and RSUs in an offer?',
    patterns: [
      /evaluate equity/i,
      /rsu vs options/i,
      /iso vs nso/i,
      /stock options worth/i,
      /vesting schedule/i
    ],
    answer: `📈 **De-Coding Tech Equity Packages:**

- **Public Company RSUs (Restricted Stock Units):** Liquid as cash upon vesting. A standard 4-year vest with a 1-year cliff means you receive 25% after month 12, then quarterly installments.
- **Private Pre-IPO Options (ISOs / NSOs):** Right to purchase shares at the strike price.
  - *Calculation:* $(\text{Current Preferred Valuation} - \text{Strike Price}) \times \text{Total Shares}$.
  - *Risk Factor:* Unless a liquidation event occurs (IPO or acquisition), options are illiquid. Treat private equity as upside lottery tickets and anchor negotiations on base salary + cash bonuses!`,
    relatedQueries: ['How do I calculate Total Compensation (TC)?', 'What are the rules of Chris Voss style salary negotiation?'],
    contextTab: 'negotiation'
  },
  {
    id: 'faq_total_compensation_formula',
    category: 'salary_negotiation',
    title: 'How do I calculate Total Compensation (TC) including signing bonus and performance multipliers?',
    patterns: [
      /how to calculate tc/i,
      /total compensation formula/i,
      /what is tc/i,
      /annualized compensation/i
    ],
    answer: `🧮 **Year-1 Total Compensation (TC) Formula:**

$$\\text{Year 1 TC} = \\text{Base Salary} + \\text{Annual Target Bonus (\\%)} + (\\text{Total RSU Grant} / 4) + \\text{Year 1 Signing Bonus}$$

- **Base Salary:** Direct guaranteed cash flow.
- **Annual Bonus:** Often variable (8%–20%) tied to company and personal performance multipliers.
- **Signing Bonus:** Often paid in Year 1 to bridge the gap before equity cliffs vest.
Use SPrav's **Salary Negotiation** workspace to model multi-year scenarios and compare competing offers side-by-side!`,
    relatedQueries: ['What are the rules of Chris Voss style salary negotiation?', 'How do I frame a counter-offer email without sounding aggressive?'],
    contextTab: 'negotiation'
  }
];

// ─── Domain 19: Recruiter Outreach & InMails ────────────────────────────────
export const DOMAIN_19_OUTREACH = [
  {
    id: 'faq_recruiter_outreach_engine',
    category: 'recruiter_outreach',
    title: "How does SPrav's Recruiter Outreach Engine generate high-converting messages?",
    patterns: [
      /recruiter outreach/i,
      /outreach engine/i,
      /message recruiter/i,
      /linkedin outreach/i
    ],
    answer: `📬 **Recruiter Outreach Engine Overview:**

Cold applications often sit behind hundreds of applicants. SPrav crafts personalized, high-converting outreach messages tailored to:
- **Corporate Recruiters & Talent Partners:** Focus on quick qualifications, active job requisition ID, and immediate availability.
- **Hiring Managers & Engineering Leaders:** Focus on solving their immediate architectural pain points, referencing recent open-source work or tech stack synergy.
- **Peer Engineers (for Referrals):** Authentic, collegial messages asking for advice and team culture insights rather than begging for referrals!`,
    relatedQueries: ['What is the ideal 300-character LinkedIn connection note template?', 'How do I write a high-impact cold email directly to the Engineering Manager?'],
    contextTab: 'outreach'
  },
  {
    id: 'faq_connection_note_templates',
    category: 'recruiter_outreach',
    title: 'What is the ideal 300-character LinkedIn connection note template?',
    patterns: [
      /linkedin connection note/i,
      /300 character note/i,
      /connection request message/i
    ],
    answer: `🎯 **High-Converting 300-Character LinkedIn Connection Note:**

*"Hi [Recruiter Name], I noticed you're leading engineering hiring for [Team/Role] at [Company]. As a [Your Title] with hands-on experience scaling [Top Skill/Architecture], I recently applied via your portal (Req #[ID]). Would love to connect and share my portfolio!"*

**Why it works:** It is concise, references the exact requisition, highlights concrete value, and respects their reading time.`,
    relatedQueries: ["How does SPrav's Recruiter Outreach Engine generate high-converting messages?", 'How do I write a high-impact cold email directly to the Engineering Manager?'],
    contextTab: 'outreach'
  },
  {
    id: 'faq_cold_email_hiring_manager',
    category: 'recruiter_outreach',
    title: 'How do I write a high-impact cold email directly to the Engineering Manager?',
    patterns: [
      /cold email (hiring manager|manager)/i,
      /email engineering director/i,
      /how to cold email/i
    ],
    answer: `🚀 **Hiring Manager Cold Email Blueprint:**

**Subject:** *[Role Title] candidate - [Your Specialty] for [Company Team]*

*"Hi [Manager Name],*

*I came across your team's work on [Recent Feature or Tech Stack] and saw you're hiring a [Role Title].*

*Over the past [X] years at [Previous Company], I [Quantifiable Achievement: e.g. reduced API latency by 45% using Rust & Redis microservices]. I believe I can bring similar impact to your upcoming roadmap.*

*I've submitted my application through the portal, but wanted to share a 1-page summary of my recent work: [Link to Portfolio/GitHub]. Would you be open to a brief 10-minute chat this week?*

*Best regards,*
*[Your Name]"*`,
    relatedQueries: ['How do I find the verified corporate email of a hiring manager?', 'What is the optimal follow-up cadence after an interview or initial outreach?'],
    contextTab: 'outreach'
  },
  {
    id: 'faq_hunter_io_email_patterns',
    category: 'recruiter_outreach',
    title: 'How do I find the verified corporate email of a hiring manager?',
    patterns: [
      /find (manager|recruiter) email/i,
      /email pattern/i,
      /corporate email format/i
    ],
    answer: `🔍 **Locating Verified Corporate Emails:**

Most tech enterprises adhere to standardized domain email conventions:
- \`firstname.lastname@company.com\` (e.g. Google, Microsoft, Meta)
- \`firstinitiallastname@company.com\` (e.g. Amazon, Oracle)
- \`firstname@company.com\` (common in early/growth-stage startups)

You can verify addresses using free MX check tools or tools like Hunter.io / Anymail Finder. SPrav's **Recruiter Outreach** workspace lets you organize these contacts alongside your job cards!`,
    relatedQueries: ['How do I write a high-impact cold email directly to the Engineering Manager?', 'What is the optimal follow-up cadence after an interview or initial outreach?'],
    contextTab: 'outreach'
  },
  {
    id: 'faq_followup_cadence_timeline',
    category: 'recruiter_outreach',
    title: 'What is the optimal follow-up cadence after an interview or initial outreach?',
    patterns: [
      /follow[- ]up (cadence|timeline|email)/i,
      /when to follow up/i,
      /how many days after interview/i
    ],
    answer: `📅 **High-Signal Follow-Up Timeline:**

- **Post-Interview Thank You (Within 24 Hours):** Send a personalized note referencing a specific technical discussion or whiteboard debate from the interview.
- **First Check-In (Day 5 to 7):** If no status update has arrived by the agreed timeline, send a polite status inquiry.
- **Second Follow-Up (Day 12 to 14):** Mention an active timeline update (e.g. *"I am progressing into final rounds with another team, but [Company] remains my top choice"*).
- **Graceful Closure (Day 21):** A friendly note wishing them well and leaving the door open for future collaboration.`,
    relatedQueries: ["How does SPrav's Recruiter Outreach Engine generate high-converting messages?", 'How do I frame a counter-offer email without sounding aggressive?'],
    contextTab: 'outreach'
  }
];

// ─── Domain 20: Emerging 2025-2026 Tech Roles ───────────────────────────────
export const DOMAIN_20_EMERGING_ROLES = [
  {
    id: 'faq_role_prompt_llm_engineer',
    category: 'emerging_tech_roles',
    title: 'What skills and resume keywords are required for an AI / LLM Engineer in 2025-2026?',
    patterns: [
      /llm engineer/i,
      /ai engineer/i,
      /generative ai resume/i,
      /langchain rag vllm/i
    ],
    answer: `🤖 **Core Stack for AI / LLM Engineers (2025–2026):**

The AI Engineering market has matured beyond basic API calls to production systems engineering:
- **Architectures:** RAG (Retrieval-Augmented Generation), Hybrid Search (Dense Vectors + BM25), GraphRAG, Agentic Multi-Step Workflows.
- **Frameworks & Libraries:** LangChain, LlamaIndex, LiteLLM, vLLM, Ollama, Hugging Face Transformers.
- **Vector Databases:** Qdrant, Pinecone, Milvus, pgvector.
- **Evaluation & Guardrails:** Ragas, DeepEval, Guardrails AI, Prompt Injection Defense.
Highlighting low-latency inference, latency budget compliance, and hallucination reduction on your resume will immediately place you in the top 5% of applicants!`,
    relatedQueries: ['What are the must-have competencies for an MLOps / AI Platform Engineer?', 'What is modern Platform Engineering and how does it differ from DevOps?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_role_mlops_engineer',
    category: 'emerging_tech_roles',
    title: 'What are the must-have competencies for an MLOps / AI Platform Engineer?',
    patterns: [
      /mlops/i,
      /machine learning operations/i,
      /ai platform engineer/i
    ],
    answer: `⚙️ **Essential MLOps & AI Platform Competencies:**

- **Model Serving & Orchestration:** Triton Inference Server, vLLM, Ray Serve, Kubernetes (KServe).
- **Pipelines & Experiment Tracking:** Kubeflow, MLflow, Weights & Biases, Airflow.
- **Hardware Acceleration:** CUDA kernel profiling, TensorRT, multi-GPU distributed training (FSDP, DeepSpeed).
- **Data Engineering:** Feast (Feature Stores), Apache Spark, Kafka streaming data ingest.`,
    relatedQueries: ['What skills and resume keywords are required for an AI / LLM Engineer in 2025-2026?', 'What is modern Platform Engineering and how does it differ from DevOps?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_role_platform_engineer',
    category: 'emerging_tech_roles',
    title: 'What is modern Platform Engineering and how does it differ from DevOps?',
    patterns: [
      /platform engineering/i,
      /devops vs platform engineer/i,
      /internal developer platform/i,
      /idp/i
    ],
    answer: `🏗️ **Modern Platform Engineering Explained:**

While traditional DevOps focuses on CI/CD pipeline automation and infrastructure code:
- **Platform Engineering** designs an **Internal Developer Platform (IDP)** that treats software developers as customers.
- **Core Stacks:** Kubernetes, Crossplane, Terraform, Backstage (Spotify IDP), ArgoCD, OpenTelemetry.
- **Resume Proof:** Quantify how your internal platforms reduced developer onboarding time from weeks to hours and eliminated infrastructure ticket backlogs!`,
    relatedQueries: ['What are the must-have competencies for an MLOps / AI Platform Engineer?', 'What skills and resume keywords are required for an AI / LLM Engineer in 2025-2026?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_role_devrel_advocate',
    category: 'emerging_tech_roles',
    title: 'What is required to land a Developer Relations / Developer Advocate role?',
    patterns: [
      /devrel/i,
      /developer advocate/i,
      /developer relations/i
    ],
    answer: `🎙️ **Breaking Into Developer Relations (DevRel):**

DevRel bridges engineering, product, and developer community advocacy:
- **Technical Credibility:** Ability to build and open-source full demo applications and SDKs.
- **Content Portfolio:** High-traffic technical blog posts, conference talks, YouTube deep-dives, and documentation guides.
- **Community Leadership:** Active engagement in developer Discords, GitHub discussions, and Stack Overflow.`,
    relatedQueries: ['What skills and resume keywords are required for an AI / LLM Engineer in 2025-2026?', 'What is modern Platform Engineering and how does it differ from DevOps?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_role_quant_algo_developer',
    category: 'emerging_tech_roles',
    title: 'What do quantitative trading firms and hedge funds look for in algorithmic developers?',
    patterns: [
      /quant developer/i,
      /algorithmic developer/i,
      /hft/i,
      /hedge fund engineer/i
    ],
    answer: `💹 **Quantitative Trading & HFT Developer Hiring Rubric:**

Firms like Citadel, Jane Street, Two Sigma, and Jump Trading demand exceptional computing precision:
- **Low-Latency Systems:** Modern C++ (C++20/23), memory alignment, lock-free queues, cache locality, and kernel bypassing (Solarflare, DPDK).
- **Functional Programming:** OCaml (Jane Street), Haskell, or Python for quantitative research.
- **Mathematics & Probability:** Mental math, combinatorics, and deep understanding of network packet mechanics.`,
    relatedQueries: ["What is Google's engineering interview pipeline and rubric?", 'What skills and resume keywords are required for an AI / LLM Engineer in 2025-2026?'],
    contextTab: 'resume'
  }
];

// ─── Domain 21: Career Strategy & Transitions ───────────────────────────────
export const DOMAIN_21_STRATEGY = [
  {
    id: 'faq_career_gap_explanation',
    category: 'career_strategy',
    title: 'How should I explain a career gap or sabbatical on my resume and in interviews?',
    patterns: [
      /career gap/i,
      /sabbatical/i,
      /gap in resume/i,
      /employment gap/i
    ],
    answer: `🌱 **Framing Career Gaps with Confidence and Authority:**

Gaps are normal in modern engineering careers. The key is proactive framing:
- **On Your Resume:** Add a dedicated entry: *Career Break / Professional Development (Dates)*.
- **Highlight Growth:** List technical certifications, open-source contributions, independent app launches, or caregiving milestones.
- **Interview Response Script:** *"I took intentional time to focus on [family milestone / deep technical upskilling in distributed systems]. It recharged my energy, and I am excited to bring fresh focus and skills to this team."*
Address it concisely in 30 seconds and pivot immediately back to what you can build today!`,
    relatedQueries: ['What is the fastest strategy to recover after a tech layoff?', 'How can a candidate pivot from non-tech or QA/support into Software Engineering?'],
    contextTab: 'profile'
  },
  {
    id: 'faq_non_tech_to_tech_pivot',
    category: 'career_strategy',
    title: 'How can a candidate pivot from non-tech or QA/support into Software Engineering?',
    patterns: [
      /pivot (to|into) (tech|swe|engineering)/i,
      /career switch/i,
      /qa to dev/i,
      /non[- ]tech to tech/i
    ],
    answer: `🔄 **Engineering Career Pivot Roadmap:**

1. **Leverage Domain Expertise:** If you worked in Healthcare, Finance, or Logistics, target engineering roles at healthtech or fintech startups where your business domain knowledge is a major asset!
2. **Bridge Projects:** Build 2 high-complexity, production-deployed web apps with real users, CI/CD pipelines, and public GitHub code.
3. **Reframe Previous Experience:** Emphasize data analysis, process automation, scripting, and cross-functional leadership from your prior roles.`,
    relatedQueries: ['How should I explain a career gap or sabbatical on my resume?', 'What demonstrates senior-level scope and engineering ownership on a resume?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_junior_to_senior_promotion',
    category: 'career_strategy',
    title: 'What demonstrates senior-level scope and engineering ownership on a resume?',
    patterns: [
      /senior engineer resume/i,
      /how to sound senior/i,
      /junior to senior/i,
      /engineering ownership/i
    ],
    answer: `🧗 **Signals of Senior-Level Engineering Scope:**

Junior resumes describe tasks (*"Wrote unit tests and fixed bugs"*). Senior resumes describe ownership and systemic business impact:
- **Architectural Decision-Making:** *"Designed and migrated auth service to OAuth2/OIDC, reducing login failure rate by 99.8%."*
- **Mentorship & Team Multipliers:** *"Mentored 4 junior engineers and authored team-wide RFC standards for microservices."*
- **Cross-Functional Influence:** *"Partnered with Product and Security leads to deliver SOC2 compliance 2 months ahead of schedule."*`,
    relatedQueries: ['How can a candidate pivot from non-tech or QA/support into Software Engineering?', 'How does SPrav scan for anti-AI tell phrases?'],
    contextTab: 'resume'
  },
  {
    id: 'faq_layoff_recovery_strategy',
    category: 'career_strategy',
    title: 'What is the fastest, high-confidence strategy to recover after a tech layoff?',
    patterns: [
      /layoff/i,
      /laid off/i,
      /how to recover from layoff/i,
      /job search after layoff/i
    ],
    answer: `⚡ **Rapid Layoff Recovery Blueprint:**

1. **Disconnect Emotion from Identity:** Layoffs are corporate macroeconomic decisions, not a reflection of your engineering capability.
2. **Activate Warm Network in 48 Hours:** Post a transparent, gracious update on LinkedIn. Former colleagues are your highest-converting referral pipeline.
3. **Structured Daily Sprints with SPrav:**
   - 9 AM – 11 AM: Dispatch 5 high-fit tailored applications.
   - 11 AM – 1 PM: Technical problem solving / system design prep.
   - 2 PM – 4 PM: Direct recruiter & hiring manager outreach.
Maintain routine and velocity to secure multiple competing offers within 4 to 6 weeks!`,
    relatedQueries: ['How should I explain a career gap or sabbatical on my resume?', "How does SPrav's Recruiter Outreach Engine generate high-converting messages?"],
    contextTab: 'jobs'
  },
  {
    id: 'faq_visa_sponsorship_filter',
    category: 'career_strategy',
    title: 'How do I identify and target employers offering H-1B, STEM OPT, or Global Visa sponsorship?',
    patterns: [
      /visa sponsorship/i,
      /h[- ]?1b/i,
      /stem opt/i,
      /work authorization filter/i
    ],
    answer: `🛂 **Visa Sponsorship & International Candidate Strategy:**

- **Direct Ingestion:** SPrav highlights company historical H-1B filing data and scans job descriptions for negative phrases (*"No visa sponsorship provided"*, *"US Citizens or Green Card holders only"*).
- **E-Verify & STEM OPT:** Filter for enterprise tech employers verified in the official USCIS E-Verify database.
- **Global Remote Contracts:** Look for international companies hiring via Employer of Record (EOR) platforms like Deel or Remote.com.`,
    relatedQueries: ['How do I set up geographic location scoping in SPrav?', 'How does 1-Click Guided Dispatch work in SPrav?'],
    contextTab: 'scope'
  }
];

// ─── Domain 22: Data Vault, Backup & Portability ─────────────────────────────
export const DOMAIN_22_VAULT = [
  {
    id: 'faq_export_json_backup',
    category: 'data_vault',
    title: 'How do I export a complete encrypted backup of my SPrav vault?',
    patterns: [
      /export (backup|data|vault|json)/i,
      /backup my data/i,
      /download my applications/i,
      /data portability/i
    ],
    answer: `💾 **Exporting Your Complete SPrav Vault:**

1. Navigate to **Settings → Data & Backup** or **Data Vault**.
2. Click **Export Encrypted Backup (JSON)**.
3. A complete snapshot of your profile, STAR stories, application history, notes, and custom company watchlists is compiled into a single clean JSON archive.
4. Keep this file in your personal Google Drive or local storage for peace of mind!`,
    relatedQueries: ['How do I restore my saved jobs, applications, and profile from a JSON backup?', 'Can I selectively delete individual jobs, keys, or reset my entire workspace?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_restore_vault_backup',
    category: 'data_vault',
    title: 'How do I restore my saved jobs, applications, and profile from a JSON backup?',
    patterns: [
      /restore (backup|vault|data)/i,
      /import (backup|json)/i,
      /recover my data/i
    ],
    answer: `📥 **Restoring From an Existing Backup Archive:**

1. Open SPrav on any browser or newly formatted computer.
2. Go to **Settings → Data & Backup**.
3. Click **Import Backup** and select your \`.json\` export archive.
4. Enter your Master Passphrase if the archive was encrypted.
5. All applications, scores, and custom settings are restored into IndexedDB with zero loss!`,
    relatedQueries: ['How do I export a complete encrypted backup of my SPrav vault?', 'How does the Master Passphrase encryption work?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_selective_data_wipe',
    category: 'data_vault',
    title: 'Can I selectively delete individual jobs, keys, or reset my entire workspace?',
    patterns: [
      /delete data/i,
      /wipe data/i,
      /reset workspace/i,
      /clear indexeddb/i,
      /remove api keys/i
    ],
    answer: `🗑️ **Granular Data Deletion Controls:**

In accordance with strict privacy principles, you have full control over your data:
- **Delete Single Item:** Click the trash icon on any job card or STAR story to purge it from IndexedDB instantly.
- **Purge API Keys Only:** Click **Clear API Keys** in AI Engine settings to wipe keys while retaining your job tracking data.
- **Full Factory Reset:** Click **Wipe All Local Data** in Settings to clear all IndexedDB tables, caches, and local storage keys completely.`,
    relatedQueries: ['Is my personal and resume data safe in SPrav?', 'How do I export a complete encrypted backup of my SPrav vault?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_pwa_offline_installation',
    category: 'data_vault',
    title: 'How do I install SPrav Job AI as a native desktop or mobile app?',
    patterns: [
      /install pwa/i,
      /install as desktop app/i,
      /install on (phone|mobile|android|iphone)/i,
      /run as native app/i
    ],
    answer: `📱 **Native PWA Installation Guide:**

SPrav is a fully compliant Progressive Web App (PWA):
- **Desktop (Chrome / Edge):** Click the install icon (computer with down arrow) in your browser address bar, or select *Menu → Install SPrav Job AI*. It launches in a dedicated, borderless window!
- **iOS (Safari):** Tap the **Share** button at the bottom of the screen and choose **Add to Home Screen**.
- **Android (Chrome):** Tap the three-dot menu and select **Install App**.
Enjoy instant offline loading, hardware acceleration, and full app-like responsiveness!`,
    relatedQueries: ['Can I run SPrav 100% air-gapped with Ollama?', 'How do I synchronize my SPrav data between my laptop and mobile phone?'],
    contextTab: 'settings'
  },
  {
    id: 'faq_cross_device_sync',
    category: 'data_vault',
    title: 'How do I synchronize my SPrav data between my laptop and mobile phone?',
    patterns: [
      /sync between devices/i,
      /mobile sync/i,
      /laptop to phone/i,
      /cross device/i
    ],
    answer: `🔄 **Zero-Knowledge Cross-Device Synchronization:**

Because SPrav operates without centralized corporate databases:
1. **QR Code Pairing (Mobile Continuity):** Open **Mobile Continuity** in the sidebar. Scan the encrypted QR code with your mobile camera to transfer your active session state securely.
2. **Encrypted JSON Transfer:** Export your vault on desktop and import it into your mobile browser via iCloud / Google Drive.
3. Your data remains 100% private to your personal devices at all times!`,
    relatedQueries: ['How do I export a complete encrypted backup of my SPrav vault?', 'How do I install SPrav Job AI as a native desktop or mobile app?'],
    contextTab: 'settings'
  }
];
