/**
 * linkedin_optimizer_engine.js
 * ==============================
 * Careerflow-Parity In-Browser LinkedIn Profile Optimizer & Scorer.
 * Evaluates Headline search indexing, 3-line About hook, quantifiable impact density,
 * keyword saturation, and generates 1-click tailored blueprints from candidate facts.
 *
 * Capabilities:
 * - 100% client-side, zero cloud server fees, zero telemetry.
 * - Exact character boundary heuristics (LinkedIn 220-char headline limit; 220-char About hook fold).
 * - Algorithmic cliché detector penalizing weak/passive phrases.
 * - Delimiter syntax checker (| • / — //).
 * - 3 Strategic Headline Blueprints (Authority Specialist, Metric Driver, Product Architect).
 * - 4-Beat About Section narrative generator.
 */

export const LINKEDIN_CLICHES = [
  { phrase: 'aspiring', penalty: 15, tip: 'Remove "aspiring". Recruiters search for active job titles, not aspiring status.' },
  { phrase: 'seeking opportunities', penalty: 15, tip: 'Replace "seeking opportunities" with your actual specialization and value proposition.' },
  { phrase: 'actively looking', penalty: 12, tip: 'Use the LinkedIn "Open to Work" badge setting instead of wasting headline character space.' },
  { phrase: 'open to work', penalty: 10, tip: 'Turn on the Open to Work profile badge; reserve headline space for high-value tech keywords.' },
  { phrase: 'hard worker', penalty: 10, tip: 'Replace "hard worker" with verifiable engineering impact or scale metrics.' },
  { phrase: 'self motivated', penalty: 8, tip: 'Replace generic soft traits like "self motivated" with your primary tech stack.' },
  { phrase: 'results driven', penalty: 8, tip: 'Show results with real numbers rather than claiming "results driven".' },
  { phrase: 'rockstar', penalty: 15, tip: 'Avoid jargon like "rockstar" or "ninja"; recruiters find it unprofessional.' },
  { phrase: 'ninja', penalty: 15, tip: 'Avoid "ninja"; specify your concrete engineering discipline instead.' },
  { phrase: 'guru', penalty: 15, tip: 'Avoid "guru"; state your specific technologies and seniority level.' },
  { phrase: 'passionate about', penalty: 6, tip: 'State what you build and deliver rather than "passionate about tech".' }
];

export const DELIMITER_REGEX = /[|•/—–]|(?:\s\/\/\s)/;

/**
 * Evaluates a LinkedIn Headline based on recruiter search visibility and conversion heuristics.
 * 
 * @param {string} headline
 * @param {string} [targetRole='']
 * @returns {object} Detailed score breakdown and recommendations
 */
export function scoreLinkedInHeadline(headline, targetRole = '') {
  const cleanHeadline = (headline || '').trim();
  const charCount = cleanHeadline.length;

  if (!cleanHeadline) {
    return {
      score: 0,
      grade: 'D',
      charCount: 0,
      charStatus: 'empty',
      issues: [{ type: 'error', message: 'Headline is empty. A strong headline is your #1 search traffic driver on LinkedIn.' }],
      strengths: [],
      suggestions: ['Add a role title, 2-3 core technologies, and an impact or scale metric.']
    };
  }

  let score = 50; // base score
  const issues = [];
  const strengths = [];
  const suggestions = [];

  // 1. Length Analysis (LinkedIn max 220 chars; optimal 100 - 210)
  let charStatus = 'optimal';
  if (charCount > 220) {
    charStatus = 'too_long';
    score -= 25;
    issues.push({ type: 'error', message: `Headline exceeds LinkedIn's 220-character limit (${charCount}/220). It will be truncated.` });
    suggestions.push(`Trim ${charCount - 220} characters so your full pitch is visible on desktop and mobile.`);
  } else if (charCount < 60) {
    charStatus = 'too_short';
    score -= 20;
    issues.push({ type: 'warning', message: `Headline is too short (${charCount}/220). You are missing valuable keyword indexing real estate.` });
    suggestions.push('Expand your headline to at least 100-140 characters by adding your primary frameworks and an impact metric.');
  } else if (charCount >= 100 && charCount <= 210) {
    charStatus = 'optimal';
    score += 20;
    strengths.push(`Optimal length (${charCount}/220 chars) — maximizes keyword impressions without mobile truncation.`);
  } else {
    charStatus = 'acceptable';
    score += 10;
    strengths.push(`Good character count (${charCount}/220 chars).`);
  }

  // 2. Delimiter & Visual Structure Check
  const hasDelimiter = DELIMITER_REGEX.test(cleanHeadline);
  if (hasDelimiter) {
    score += 15;
    strengths.push('Clean delimiter structure (| • /) allows recruiters to scan title, stack, and impact in under 2 seconds.');
  } else if (charCount > 70) {
    score -= 10;
    issues.push({ type: 'warning', message: 'No clear visual delimiters found. The headline reads as a run-on sentence.' });
    suggestions.push('Use pipe symbols (" | ") or bullets (" • ") to separate: Title | Tech Stack | Impact Metric.');
  }

  // 3. Cliché & Buzzword Detection
  const lowerHeadline = cleanHeadline.toLowerCase();
  let detectedClichePenalty = 0;
  for (const item of LINKEDIN_CLICHES) {
    if (lowerHeadline.includes(item.phrase)) {
      detectedClichePenalty += item.penalty;
      issues.push({ type: 'error', message: `Avoid cliché: "${item.phrase}". ${item.tip}` });
      suggestions.push(item.tip);
    }
  }
  score -= Math.min(detectedClichePenalty, 30);

  // 4. Target Role & Seniority Keywords
  const cleanTarget = (targetRole || '').toLowerCase().trim();
  if (cleanTarget) {
    const targetTokens = cleanTarget.split(/\s+/).filter(t => t.length > 2);
    const matchedTokens = targetTokens.filter(tok => lowerHeadline.includes(tok));
    if (matchedTokens.length > 0) {
      score += 10;
      strengths.push(`Directly matches target role query ("${matchedTokens.join(' ')}").`);
    } else {
      issues.push({ type: 'warning', message: `Does not contain key terms from your target role: "${targetRole}".` });
      suggestions.push(`Include "${targetRole}" or related keywords so recruiter Boolean searches find your profile.`);
    }
  }

  // 5. Impact, Scale & Metric Signals
  const metricRegex = /\b(?:\d+[%+]?|\$\d+[kmb]?|\d+[kmb]\+?|ex-[\w]+|scaling|distributed|zero-download|p99|high-availability|latency|throughput)\b/i;
  if (metricRegex.test(cleanHeadline)) {
    score += 15;
    strengths.push('Includes scale or metric proof points, creating immediate credibility for engineering managers.');
  } else {
    suggestions.push('Add an impact signal or scale metric (e.g. "10M+ RPS", "Ex-Stripe", "Reduced P99 Latency 40%").');
  }

  // Final Calibration
  const finalScore = Math.max(10, Math.min(100, Math.round(score)));
  let grade = 'D';
  if (finalScore >= 90) grade = 'S';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 60) grade = 'C';

  return {
    score: finalScore,
    grade,
    charCount,
    charStatus,
    issues,
    strengths,
    suggestions: [...new Set(suggestions)]
  };
}

/**
 * Evaluates the LinkedIn "About" section for recruiter engagement and the 3-line hook fold.
 * 
 * @param {string} aboutText
 * @param {string} [targetRole='']
 * @returns {object} Detailed score breakdown and recommendations
 */
export function scoreLinkedInAbout(aboutText, targetRole = '') {
  const cleanAbout = (aboutText || '').trim();
  const charCount = cleanAbout.length;

  if (!cleanAbout) {
    return {
      score: 0,
      grade: 'D',
      charCount: 0,
      hookGrade: 'weak',
      metricsCount: 0,
      hasSkillsIndex: false,
      hasCta: false,
      issues: [{ type: 'error', message: 'About section is empty. A compelling narrative increases recruiter InMail conversion by 3.8x.' }],
      strengths: [],
      suggestions: ['Draft a 4-beat summary: 3-line hook, key metrics, technical competencies, and an invitation to connect.']
    };
  }

  let score = 50;
  const issues = [];
  const strengths = [];
  const suggestions = [];

  // 1. Length & Depth Analysis
  if (charCount < 200) {
    score -= 15;
    issues.push({ type: 'warning', message: `About section is very brief (${charCount} chars). LinkedIn allows up to 2,600 characters.` });
    suggestions.push('Aim for 600 to 1,200 characters to provide sufficient technical depth and keyword indexing.');
  } else if (charCount >= 500 && charCount <= 1800) {
    score += 15;
    strengths.push(`Excellent narrative depth (${charCount} chars) provides strong context without overwhelming readers.`);
  }

  // 2. The Critical 3-Line Hook Analysis (first 220 characters before "...see more" fold)
  const hookText = cleanAbout.slice(0, 220);
  const hookLower = hookText.toLowerCase();
  let hookGrade = 'moderate';

  if (hookLower.startsWith('hi, my name is') || hookLower.startsWith('welcome to my profile') || hookLower.startsWith('i am a passionate')) {
    score -= 15;
    hookGrade = 'weak';
    issues.push({ type: 'error', message: 'Weak opening hook: Starts with conversational filler. The first 3 lines must deliver your core engineering value proposition.' });
    suggestions.push('Rewrite line 1 to state your primary domain authority and the scale of systems you engineer.');
  } else if (hookText.length >= 80 && (hookLower.includes('engineer') || hookLower.includes('architect') || hookLower.includes('systems') || hookLower.includes('building') || hookLower.includes('scale'))) {
    score += 15;
    hookGrade = 'strong';
    strengths.push('Strong 3-line hook before the "...see more" cutoff grabs recruiter attention immediately.');
  }

  // 3. Metric & Quantifiable Impact Density
  const metricMatches = cleanAbout.match(/\b(?:\d+[%+]|\$\d+[kmb]?|\d+[kmb]\b|\d+\s*(?:million|billion|users|requests|rps|nodes|engineers))\b/gi) || [];
  const metricsCount = metricMatches.length;
  if (metricsCount >= 3) {
    score += 15;
    strengths.push(`Rich metric density (${metricsCount} quantifiable figures found) provides objective engineering proof.`);
  } else if (metricsCount >= 1) {
    score += 5;
    strengths.push('Includes verifiable metrics. Adding 2 more numbers will strengthen your narrative.');
  } else {
    issues.push({ type: 'warning', message: 'Zero quantifiable metrics detected in your summary.' });
    suggestions.push('Include at least 2-3 quantifiable achievements (e.g. latency reduced by X%, system handled Y req/sec, Z active users).');
  }

  // 4. Core Tech Stack / Competencies Index Check
  const hasSkillsIndex = /(?:core skills|technical skills|technical competencies|core competencies|specialties|tech stack|technologies|proficiencies):/i.test(cleanAbout);
  if (hasSkillsIndex) {
    score += 10;
    strengths.push('Includes a structured "Core Skills / Tech Stack" index for high-probability recruiter search keyword matching.');
  } else {
    suggestions.push('Add a dedicated "Core Skills: React, TypeScript, Go, AWS, Docker" block near the bottom to rank in recruiter keyword queries.');
  }

  // 5. Readability & Paragraph Spacing Check (Penalize walls of text)
  const paragraphs = cleanAbout.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean);
  const hasWallOfText = paragraphs.some(p => p.length > 500);
  if (hasWallOfText) {
    score -= 10;
    issues.push({ type: 'warning', message: 'Contains large walls of text (>500 chars in a single paragraph) which recruiters skip.' });
    suggestions.push('Break long paragraphs into 2-3 line digestible blocks with generous white space.');
  } else if (paragraphs.length >= 3) {
    score += 5;
    strengths.push('Clean paragraph rhythm with ample white space ensures effortless mobile scanning.');
  }

  // 6. Call-to-Action (CTA) Check
  const ctaRegex = /(?:reach me at|contact me at|feel free to connect|open to discussing|let's connect|email:|[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})/i;
  const hasCta = ctaRegex.test(cleanAbout);
  if (hasCta) {
    score += 10;
    strengths.push('Includes an inviting Call-to-Action with contact accessibility for inbound opportunities.');
  } else {
    suggestions.push('Close with a welcoming invitation: "Always open to discussing distributed systems and platform roles. Reach me at..."');
  }

  // Final Calibration
  const finalScore = Math.max(10, Math.min(100, Math.round(score)));
  let grade = 'D';
  if (finalScore >= 90) grade = 'S';
  else if (finalScore >= 80) grade = 'A';
  else if (finalScore >= 70) grade = 'B';
  else if (finalScore >= 60) grade = 'C';

  return {
    score: finalScore,
    grade,
    charCount,
    hookGrade,
    metricsCount,
    hasSkillsIndex,
    hasCta,
    issues,
    strengths,
    suggestions: [...new Set(suggestions)]
  };
}

/**
 * Generates 3 strategic LinkedIn headline presets tailored from the candidate's Knowledge Base.
 * 
 * @param {object} candidateKb
 * @param {string} [targetRole='']
 * @returns {Array<object>} Array of 3 strategic headline blueprints
 */
export function generateHeadlinePresets(candidateKb, targetRole = '') {
  const name = candidateKb?.personal?.name || candidateKb?.name || '';
  const candidateTitle = targetRole || candidateKb?.personal?.title || candidateKb?.title || 'Software Engineer';
  
  // Extract skills
  const rawSkills = candidateKb?.skills;
  const skillsList = Array.isArray(rawSkills) 
    ? rawSkills 
    : Object.values(rawSkills || {}).flat().map(String);
  const topSkills = skillsList.filter(s => s.length > 2).slice(0, 4);
  const fallbackStack = topSkills.length >= 2 ? topSkills.slice(0, 3).join(' • ') : 'React • TypeScript • Cloud Architecture';

  // Extract notable work history facts & metrics
  const workHistory = candidateKb?.work_history || candidateKb?.experience || [];
  let notableMetric = '';
  let latestCompany = '';

  if (workHistory.length > 0) {
    const firstJob = workHistory[0];
    latestCompany = firstJob?.company || '';
    const bullets = Array.isArray(firstJob?.bullets) ? firstJob.bullets : [];
    for (const b of bullets) {
      const match = String(b).match(/(?:\d+[%+]|\$\d+[kmb]?|\d+[kmb]\+?|\d+\s*(?:million|users|requests|rps))/i);
      if (match) {
        notableMetric = match[0];
        break;
      }
    }
  }

  // Archetype 1: The Authority Specialist
  const h1 = `${candidateTitle} | ${fallbackStack} | Distributed Cloud & High-Availability Systems`;
  
  // Archetype 2: The Metric & Scale Driver
  const metricSnippet = notableMetric ? `Scaling Systems to ${notableMetric}` : 'Building Sub-50ms Low-Latency Applications';
  const h2 = `${candidateTitle} | ${topSkills.slice(0, 2).join(' & ') || 'Full-Stack Architecture'} | ${metricSnippet} • Zero-Downtime Releases`;

  // Archetype 3: The Product & Mission Architect
  const companySnippet = latestCompany ? `@ Ex-${latestCompany}` : '@ High-Growth Tech';
  const h3 = `${candidateTitle} ${companySnippet} | ${fallbackStack} | Crafting Resilient Systems & Modern Developer Tooling`;

  return [
    {
      id: 'authority_specialist',
      title: 'The Authority Specialist',
      headline: h1.slice(0, 218),
      rationale: 'Ranks top in recruiter Boolean title & skills searches. Demonstrates domain expertise with zero wasted characters.'
    },
    {
      id: 'metric_driver',
      title: 'The Metric & Scale Driver',
      headline: h2.slice(0, 218),
      rationale: 'Highlights quantifiable throughput or latency impact, proving you drive measurable business and engineering outcomes.'
    },
    {
      id: 'product_architect',
      title: 'The Product & Mission Architect',
      headline: h3.slice(0, 218),
      rationale: 'Emphasizes past pedigree and user-facing craft. Ideal for senior, staff, and founding engineering roles.'
    }
  ];
}

/**
 * Generates an authentic 4-beat LinkedIn About narrative tailored to the candidate's profile.
 * 
 * @param {object} candidateKb
 * @param {string} [targetRole='']
 * @returns {string} Formatted markdown/plain-text ready for LinkedIn About
 */
export function generateAboutNarrative(candidateKb, targetRole = '') {
  const name = candidateKb?.personal?.name || candidateKb?.name || 'Engineer';
  const title = targetRole || candidateKb?.personal?.title || candidateKb?.title || 'Software Engineer';
  const location = candidateKb?.personal?.location || candidateKb?.location || 'Remote / Worldwide';
  const email = candidateKb?.personal?.email || candidateKb?.email || '';

  const rawSkills = candidateKb?.skills;
  const skillsList = Array.isArray(rawSkills) 
    ? rawSkills 
    : Object.values(rawSkills || {}).flat().map(String);
  const topSkills = skillsList.slice(0, 8).join(', ') || 'TypeScript, React, Python, Go, Cloud Architecture, Docker, CI/CD';

  const workHistory = candidateKb?.work_history || candidateKb?.experience || [];
  let impactAchievement = 'architected and shipped resilient systems that handle critical production workloads with high uptime and low latency.';
  if (workHistory.length > 0 && Array.isArray(workHistory[0]?.bullets) && workHistory[0].bullets.length > 0) {
    impactAchievement = workHistory[0].bullets[0].replace(/^[•\-*]\s*/, '');
  }

  return `I am a ${title} based in ${location}, specializing in building high-throughput systems, resilient platforms, and user-first developer experiences.

Over the past several years, I have ${impactAchievement} My technical focus centers on distributed architecture, observable cloud infrastructure, and writing maintainable code that scales gracefully under load.

Core Technical Competencies:
• Languages & Frameworks: ${topSkills}
• Systems & Architecture: Distributed Systems, REST & gRPC APIs, Microservices, Event-Driven Architectures
• Cloud & Reliability: Docker, Kubernetes, CI/CD Pipelines, High-Availability Monitoring

I believe the best software balances rigorous engineering with pragmatic delivery. When approaching complex technical challenges, I prioritize clean architectural boundaries, automated testing, and observable metrics.

I'm always eager to exchange ideas with fellow engineers, founders, and hiring teams. Feel free to connect here on LinkedIn${email ? ` or reach out directly at ${email}` : ''}.`;
}
