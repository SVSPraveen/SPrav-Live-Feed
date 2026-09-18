/**
 * autofill_bookmarklet.js
 * =======================
 * Universal 1-Click Auto-Fill Bookmarklet & In-Browser Form Filler ($0).
 * 
 * Capabilities:
 * 1. Generates a self-contained, zero-permission JavaScript bookmarklet.
 * 2. Explicit DOM field-mapping engines for:
 *    - Workday (*.myworkdayjobs.com, *.workday.com)
 *    - Greenhouse (boards.greenhouse.io, grnh.se)
 *    - Lever (jobs.lever.co)
 *    - Ashby (jobs.ashbyhq.com)
 *    - SmartRecruiters (smartrecruiters.com)
 *    - Workable (apply.workable.com)
 *    - Generic career & employer forms (heuristic regex mapping)
 * 3. Injects complete multi-role work history, education, and custom screening answers.
 * 4. Dispatches synthetic React/Vue/Angular input events to bypass virtual DOM change listeners.
 * 5. Injects an in-page floating status HUD and highlights filled fields in emerald green.
 * 6. Runs 100% client-side with zero tracking, zero external network requests, and zero server fees.
 * 
 * Security Architecture & Threat Model:
 * =====================================
 * - Execution Boundary: Bookmarklets execute directly in the DOM and JavaScript context of the
 *   active host page. Any script on the target page shares this global execution environment.
 * - Zero Credential Exposure: The bookmarklet payload NEVER contains API keys (Groq, Gemini,
 *   OpenAI, Anthropic), auth tokens, or passwords. Only sanitized, candidate-approved public
 *   contact details and career facts are included.
 * - IIFE Isolation: The bookmarklet code is packaged in an immediately-invoked function expression
 *   `javascript:(function(){ 'use strict'; ... })()` to prevent polluting the host window object.
 * - Zero Network Egress: The bookmarklet does not send telemetry, pingbacks, or exfiltrate data
 *   to any server. It operates purely via local DOM mutation and prototype event dispatching.
 * - Origin Advisory: Candidates should only trigger bookmarklets on authentic employer and ATS
 *   domains (Greenhouse, Lever, Workday, Ashby, SmartRecruiters, etc.).
 * - Isolated World Alternative: Candidates requiring true execution isolation should use the SPrav
 *   Companion WebExtension, which runs in a dedicated browser Isolated World.
 */

function extractYear(str) {
  if (!str) return '';
  const m = String(str).match(/\b(19\d\d|20\d\d)\b/);
  return m ? m[1] : '';
}

function extractMonth(str) {
  if (!str) return '';
  const s = String(str).toLowerCase();
  const months = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  for (let i = 0; i < months.length; i++) {
    if (s.includes(months[i]) || s.includes(months[i].slice(0, 3))) {
      const num = i + 1;
      return num < 10 ? `0${num}` : String(num);
    }
  }
  const m = s.match(/\b(0[1-9]|1[0-2])\b/);
  return m ? m[1] : '';
}

/**
 * Builds a normalized candidate profile payload from stored Knowledge Base and Scope data.
 */
export function buildCandidateAutofillPayload(kb = {}, scope = {}, customOverrides = {}) {
  const fullName = (
    customOverrides.fullName || 
    kb.name || 
    kb.candidate_name || 
    kb.personal?.name ||
    ''
  ).trim();

  let firstName = customOverrides.firstName || '';
  let lastName = customOverrides.lastName || '';
  if (!firstName && fullName) {
    const parts = fullName.split(/\s+/);
    firstName = parts[0] || '';
    lastName = parts.slice(1).join(' ') || '';
  }

  // Extract primary contact info
  const contact = kb.contact_info || kb.personal || {};
  const email = customOverrides.email || kb.email || contact.email || '';
  const phone = customOverrides.phone || kb.phone || contact.phone || '';
  
  // Extract primary location
  let location = customOverrides.location || kb.location || contact.location || '';
  if (!location && Array.isArray(scope.locations) && scope.locations.length > 0) {
    location = scope.locations[0];
  }

  // URLs
  const linkedin = customOverrides.linkedin || kb.linkedin || contact.linkedin || '';
  const github = customOverrides.github || kb.github || contact.github || '';
  const portfolio = customOverrides.portfolio || kb.portfolio || kb.website || contact.portfolio || contact.website || '';
  const twitter = customOverrides.twitter || kb.twitter || contact.twitter || '';

  // Work history facts (Multi-entry array + Primary summary)
  const rawWorkHistory = Array.isArray(kb.work_history) && kb.work_history.length > 0
    ? kb.work_history
    : (Array.isArray(customOverrides.workHistory) ? customOverrides.workHistory : []);

  const workHistory = rawWorkHistory.map(item => {
    const company = (item.company || item.organization || '').trim();
    const title = (item.role || item.title || '').trim();
    const loc = (item.location || '').trim();
    const startDate = (item.start_date || item.startDate || '').trim();
    const isCurrent = Boolean(item.is_current || /present|current/i.test(item.end_date || item.endDate || ''));
    const endDate = isCurrent ? 'Present' : (item.end_date || item.endDate || '').trim();
    const bullets = Array.isArray(item.bullets) ? item.bullets : [];
    const description = bullets.length > 0
      ? bullets.map(b => b.startsWith('•') || b.startsWith('-') ? b : `• ${b}`).join('\n')
      : (item.description || item.summary || '').trim();

    return {
      company,
      title,
      location: loc,
      startDate,
      endDate,
      isCurrent,
      description,
      bullets,
      startMonth: extractMonth(startDate),
      startYear: extractYear(startDate),
      endMonth: isCurrent ? '' : extractMonth(endDate),
      endYear: isCurrent ? '' : extractYear(endDate)
    };
  });

  let currentCompany = customOverrides.currentCompany || '';
  let currentTitle = customOverrides.currentTitle || '';
  if (!currentCompany && workHistory.length > 0) {
    currentCompany = workHistory[0].company;
    currentTitle = workHistory[0].title;
  }

  // Education facts (Multi-entry array + Primary summary)
  const rawEducation = Array.isArray(kb.education) && kb.education.length > 0
    ? kb.education
    : (Array.isArray(customOverrides.education) ? customOverrides.education : []);

  const education = rawEducation.map(item => ({
    school: (item.institution || item.school || '').trim(),
    degree: (item.degree || '').trim(),
    discipline: (item.field_of_study || item.major || item.discipline || '').trim(),
    startYear: extractYear(item.start_year || item.startDate || ''),
    endYear: extractYear(item.end_year || item.endDate || '')
  }));

  let school = customOverrides.school || '';
  let degree = customOverrides.degree || '';
  let discipline = customOverrides.discipline || '';
  if (education.length > 0) {
    school = school || education[0].school;
    degree = degree || education[0].degree;
    discipline = discipline || education[0].discipline;
  }

  // Skills
  const skills = Array.isArray(kb.skills)
    ? kb.skills
    : (kb.skills && typeof kb.skills === 'object'
        ? Object.values(kb.skills).flat().filter(Boolean)
        : (Array.isArray(customOverrides.skills) ? customOverrides.skills : []));

  // Cumulative Years of Experience Calculation
  let yearsOfExperience = customOverrides.yearsOfExperience;
  if (!yearsOfExperience) {
    if (workHistory.length > 0) {
      const parsedYears = workHistory.map(w => {
        const s = parseInt(w.startYear, 10);
        const e = w.isCurrent ? new Date().getFullYear() : parseInt(w.endYear, 10);
        return (!isNaN(s) && !isNaN(e) && e >= s) ? (e - s + 1) : 1;
      });
      yearsOfExperience = Math.min(30, Math.max(1, parsedYears.reduce((a, b) => a + b, 0)));
    } else {
      yearsOfExperience = 5;
    }
  }

  // Screening standard defaults
  const workAuth = customOverrides.workAuth ?? 'Yes';
  const visaSponsorship = customOverrides.visaSponsorship ?? 'No';
  const noticePeriod = customOverrides.noticePeriod || 'Immediate / 2 weeks';
  const salary = customOverrides.salary || scope.target_salary || '$120,000 - $160,000';
  const relocation = customOverrides.relocation || 'Yes / Remote';
  const coverLetter = customOverrides.coverLetter || '';

  return {
    fullName,
    firstName,
    lastName,
    email,
    phone,
    location,
    linkedin,
    github,
    portfolio,
    twitter,
    currentCompany,
    currentTitle,
    workHistory,
    education,
    school,
    degree,
    discipline,
    skills,
    yearsOfExperience,
    workAuth,
    visaSponsorship,
    noticePeriod,
    salary,
    relocation,
    coverLetter,
    screeningAnswers: {
      workAuth,
      visaSponsorship,
      noticePeriod,
      salary,
      yearsOfExperience,
      relocation,
      ...customOverrides.screeningAnswers
    }
  };
}

/**
 * Detects the target ATS platform from DOM features and URL hostname.
 * @param {Document|HTMLElement} rootNode
 * @returns {'workday'|'greenhouse'|'lever'|'ashby'|'generic'}
 */
export function detectAtsPlatform(rootNode) {
  if (!rootNode) return 'generic';
  try {
    const url = (typeof window !== 'undefined' && window.location ? window.location.href : '').toLowerCase();
    const host = (typeof window !== 'undefined' && window.location ? window.location.hostname : '').toLowerCase();

    if (host.includes('myworkdayjobs.com') || host.includes('workday.com') || url.includes('myworkdayjobs.com') || (rootNode.querySelector && rootNode.querySelector('[data-automation-id]'))) {
      return 'workday';
    }
    if (host.includes('greenhouse.io') || url.includes('greenhouse.io') || (rootNode.querySelector && rootNode.querySelector('#application_form, form[action*="greenhouse"], input[name*="job_application"]'))) {
      return 'greenhouse';
    }
    if (host.includes('lever.co') || url.includes('lever.co') || (rootNode.querySelector && rootNode.querySelector('.application-form, #application-form, input[name*="urls[LinkedIn]"]'))) {
      return 'lever';
    }
    if (host.includes('ashbyhq.com') || url.includes('ashbyhq.com') || (rootNode.querySelector && rootNode.querySelector('input[name^="_systemfield_"], [data-qa*="ashby"], [data-qa="name-input"]'))) {
      return 'ashby';
    }
  } catch {}
  return 'generic';
}

/**
 * Pure DOM form filling logic.
 * Usable inside the bookmarklet or directly within our in-browser simulator.
 * 
 * @param {Document|HTMLElement} rootNode The root element or document to search.
 * @param {Object} payload Candidate profile payload.
 * @returns {{ filledCount: number, filledFields: string[], platform: string }}
 */
export function executeAutofill(rootNode, payload) {
  // Support both (rootNode, payload) and (payload, rootNode)
  let actualRoot = rootNode;
  let actualPayload = payload;
  if (rootNode && !rootNode.querySelector && (rootNode.firstName || rootNode.fullName || rootNode.email)) {
    actualPayload = rootNode;
    actualRoot = (payload && payload.querySelector) ? payload : (typeof document !== 'undefined' ? document : null);
  } else if (!actualRoot && typeof document !== 'undefined') {
    actualRoot = document;
  }

  if (!actualRoot || !actualPayload) return { filledCount: 0, filledFields: [], platform: 'unknown' };

  let filledCount = 0;
  const filledFields = [];
  const platform = detectAtsPlatform(actualRoot);

  const setNativeValue = (el, val) => {
    if (!el || val == null || val === '') return false;

    try {
      const isTextArea = el.tagName === 'TEXTAREA';
      const prototype = isTextArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
      const descriptor = Object.getOwnPropertyDescriptor(prototype, 'value');

      if (descriptor && descriptor.set) {
        descriptor.set.call(el, val);
      } else {
        el.value = val;
      }

      // React 16+ controlled input tracker bypass: ensures synthetic onChange triggers
      if (el._valueTracker) {
        el._valueTracker.setValue('');
      }

      // Complete event dispatch lifecycle for React, Vue, Angular reactive models
      el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
      el.dispatchEvent(new Event('blur', { bubbles: true }));

      // Visual feedback highlight
      el.style.setProperty('border', '2px solid #10b981', 'important');
      el.style.setProperty('box-shadow', '0 0 10px rgba(16, 185, 129, 0.4)', 'important');
      el.style.setProperty('transition', 'all 0.3s ease', 'important');
      return true;
    } catch {
      el.value = val;
      return true;
    }
  };

  const setSelectValue = (sel, targetValue) => {
    if (!sel || !targetValue) return false;
    try {
      const options = Array.from(sel.options);
      const valLower = String(targetValue).toLowerCase().trim();

      // Find exact or substring match in text or value
      let matchedIndex = options.findIndex(opt => 
        opt.value.toLowerCase().trim() === valLower || 
        opt.text.toLowerCase().trim() === valLower
      );

      if (matchedIndex === -1) {
        matchedIndex = options.findIndex(opt => 
          opt.text.toLowerCase().includes(valLower) || 
          opt.value.toLowerCase().includes(valLower)
        );
      }

      if (matchedIndex !== -1) {
        sel.selectedIndex = matchedIndex;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        sel.style.setProperty('border', '2px solid #10b981', 'important');
        return true;
      }
    } catch {}
    return false;
  };

  const setCheckbox = (checkboxEl, checked = true) => {
    if (!checkboxEl) return false;
    try {
      checkboxEl.checked = checked;
      checkboxEl.dispatchEvent(new Event('change', { bubbles: true }));
      checkboxEl.dispatchEvent(new Event('click', { bubbles: true }));
      checkboxEl.style.setProperty('border', '2px solid #10b981', 'important');
      return true;
    } catch {}
    return false;
  };

  // Helper to test multiple selector queries
  const query = (selectors) => {
    for (const sel of selectors) {
      try {
        const el = actualRoot.querySelector(sel);
        if (el && !el.disabled && el.type !== 'hidden') return el;
      } catch {}
    }
    return null;
  };

  const queryAll = (selector) => {
    try {
      return Array.from(actualRoot.querySelectorAll(selector)).filter(el => !el.disabled && el.type !== 'hidden');
    } catch {
      return [];
    }
  };

  // 1. First Name
  if (actualPayload.firstName) {
    const el = query([
      '#first_name',
      'input[name*="first_name"]',
      'input[name="firstName"]',
      'input[data-ui="firstname"]',
      'input[autocomplete="given-name"]',
      'input#candidate_first_name',
      'input[data-automation-id="legalNameSection_firstName"]',
      'input[data-automation-id="firstName"]'
    ]);
    if (el && setNativeValue(el, actualPayload.firstName)) {
      filledCount++;
      filledFields.push('First Name');
    }
  }

  // 2. Last Name
  if (actualPayload.lastName) {
    const el = query([
      '#last_name',
      'input[name*="last_name"]',
      'input[name="lastName"]',
      'input[data-ui="lastname"]',
      'input[autocomplete="family-name"]',
      'input#candidate_last_name',
      'input[data-automation-id="legalNameSection_lastName"]',
      'input[data-automation-id="lastName"]'
    ]);
    if (el && setNativeValue(el, actualPayload.lastName)) {
      filledCount++;
      filledFields.push('Last Name');
    }
  }

  // 3. Full Name (for forms with single name input like Lever & Ashby)
  if (actualPayload.fullName) {
    const el = query([
      'input[name="name"]',
      'input[name="_systemfield_name"]',
      'input[name="applicant_name"]',
      'input[data-qa="name-input"]',
      '#name',
      '#candidate_name',
      'input[data-automation-id="fullName"]'
    ]);
    if (el && !filledFields.includes('First Name')) {
      if (setNativeValue(el, actualPayload.fullName)) {
        filledCount++;
        filledFields.push('Full Name');
      }
    }
  }

  // 4. Email
  if (actualPayload.email) {
    const el = query([
      '#email',
      'input[type="email"]',
      'input[name*="email"]',
      'input[name="_systemfield_email"]',
      'input[autocomplete="email"]',
      'input[data-ui="email"]',
      'input[data-qa="email-input"]',
      '#candidate_email',
      'input[data-automation-id="email"]',
      'input[data-automation-id="primaryEmail"]'
    ]);
    if (el && setNativeValue(el, actualPayload.email)) {
      filledCount++;
      filledFields.push('Email');
    }
  }

  // 5. Phone
  if (actualPayload.phone) {
    const el = query([
      '#phone',
      'input[type="tel"]',
      'input[name*="phone"]',
      'input[name="_systemfield_phoneNumber"]',
      'input[name="phoneNumber"]',
      'input[autocomplete="tel"]',
      'input[data-ui="phone"]',
      'input[data-qa="phone-input"]',
      '#candidate_phone',
      'input[data-automation-id="phone-number"]',
      'input[data-automation-id="phoneNumber"]'
    ]);
    if (el && setNativeValue(el, actualPayload.phone)) {
      filledCount++;
      filledFields.push('Phone Number');
    }

    // Workday phone device type dropdown
    const phoneDeviceSel = query(['select[data-automation-id="phone-device-type"]']);
    if (phoneDeviceSel) {
      setSelectValue(phoneDeviceSel, 'Mobile');
    }
  }

  // 6. Location / City / Address
  if (actualPayload.location) {
    const el = query([
      '#job_application_location',
      'input[name*="location"]',
      'input[name*="city"]',
      'input[name="_systemfield_location"]',
      'input[data-qa="location-input"]',
      'input[placeholder*="City"]',
      '#candidate_location',
      'input[data-automation-id="addressSection_city"]',
      'input[data-automation-id="location"]'
    ]);
    if (el && setNativeValue(el, actualPayload.location)) {
      filledCount++;
      filledFields.push('Location');
    }
  }

  // 7. LinkedIn URL
  if (actualPayload.linkedin) {
    const el = query([
      'input[name*="urls[LinkedIn]"]',
      'input[name*="linkedin"]',
      'input[name*="LinkedIn"]',
      'input[id*="linkedin"]',
      'input[placeholder*="linkedin.com"]',
      'input[aria-label*="LinkedIn"]',
      'input[data-automation-id*="linkedin"]'
    ]);
    if (el && setNativeValue(el, actualPayload.linkedin)) {
      filledCount++;
      filledFields.push('LinkedIn Profile');
    }
  }

  // 8. GitHub URL
  if (actualPayload.github) {
    const el = query([
      'input[name*="urls[GitHub]"]',
      'input[name*="github"]',
      'input[name*="GitHub"]',
      'input[id*="github"]',
      'input[placeholder*="github.com"]',
      'input[aria-label*="GitHub"]',
      'input[data-automation-id*="github"]'
    ]);
    if (el && setNativeValue(el, actualPayload.github)) {
      filledCount++;
      filledFields.push('GitHub Profile');
    }
  }

  // 9. Portfolio / Website
  if (actualPayload.portfolio) {
    const el = query([
      'input[name*="urls[Portfolio]"]',
      'input[name*="portfolio"]',
      'input[name*="website"]',
      'input[name="webAddress"]',
      'input[id*="portfolio"]',
      'input[placeholder*="portfolio"]',
      'input[aria-label*="Portfolio"]',
      'input[data-automation-id*="website"]'
    ]);
    if (el && setNativeValue(el, actualPayload.portfolio)) {
      filledCount++;
      filledFields.push('Portfolio Website');
    }
  }

  // 10. Twitter / X
  if (actualPayload.twitter) {
    const el = query([
      'input[name*="urls[Twitter]"]',
      'input[name*="twitter"]',
      'input[placeholder*="twitter.com"]'
    ]);
    if (el && setNativeValue(el, actualPayload.twitter)) {
      filledCount++;
      filledFields.push('Twitter / X');
    }
  }

  // 11. Current Company / Org
  if (actualPayload.currentCompany) {
    const el = query([
      'input[name="org"]',
      'input[name*="company"]',
      'input[name*="current_company"]',
      '#current_company',
      'input[data-automation-id="currentCompany"]'
    ]);
    if (el && setNativeValue(el, actualPayload.currentCompany)) {
      filledCount++;
      filledFields.push('Current Company');
    }
  }

  // 12. Cover Letter / Pitch / Comments
  if (actualPayload.coverLetter) {
    const el = query([
      'textarea[name="comments"]',
      'textarea[name*="cover_letter"]',
      'textarea[name*="coverLetter"]',
      'textarea#cover_letter_text',
      'textarea#additional_info',
      'textarea[placeholder*="cover letter"]',
      'textarea[placeholder*="additional information"]',
      'textarea[data-automation-id*="coverLetter"]'
    ]);
    if (el && setNativeValue(el, actualPayload.coverLetter)) {
      filledCount++;
      filledFields.push('Tailored Pitch / Cover Note');
    }
  }

  // 13. Work History & Experience Multi-Entry Injection
  const workHistoryList = Array.isArray(actualPayload.workHistory) ? actualPayload.workHistory : [];
  if (workHistoryList.length > 0) {
    // Strategy A: Workday Experience Blocks (repeated data-automation-id fields)
    const wdJobTitles = queryAll('input[data-automation-id*="jobTitle"], input[data-automation-id="jobTitle"]');
    const wdCompanies = queryAll('input[data-automation-id*="company"], input[data-automation-id="company"]');
    const wdLocations = queryAll('input[data-automation-id*="location"], input[data-automation-id="location"]');
    const wdStartDates = queryAll('input[data-automation-id*="startDate"], input[data-automation-id="startDate"]');
    const wdEndDates = queryAll('input[data-automation-id*="endDate"], input[data-automation-id="endDate"]');
    const wdCurrentChecks = queryAll('input[data-automation-id*="currentlyWorkHere"], input[data-automation-id="currentlyWorkHere"]');
    const wdDescriptions = queryAll('textarea[data-automation-id*="description"], textarea[data-automation-id="jobDescription"]');

    if (wdJobTitles.length > 0) {
      for (let i = 0; i < Math.min(wdJobTitles.length, workHistoryList.length); i++) {
        const job = workHistoryList[i];
        if (wdJobTitles[i] && setNativeValue(wdJobTitles[i], job.title)) {
          filledCount++;
          filledFields.push(`Work History ${i + 1} Title`);
        }
        if (wdCompanies[i] && setNativeValue(wdCompanies[i], job.company)) {
          filledCount++;
          filledFields.push(`Work History ${i + 1} Company`);
        }
        if (wdLocations[i] && job.location) {
          setNativeValue(wdLocations[i], job.location);
          filledCount++;
        }
        if (wdStartDates[i]) {
          const sDate = job.startDate || (job.startMonth && job.startYear ? `${job.startMonth}/${job.startYear}` : job.startYear);
          if (sDate && setNativeValue(wdStartDates[i], sDate)) filledCount++;
        }
        if (wdCurrentChecks[i] && job.isCurrent) {
          setCheckbox(wdCurrentChecks[i], true);
          filledCount++;
        } else if (wdEndDates[i] && !job.isCurrent) {
          const eDate = job.endDate || (job.endMonth && job.endYear ? `${job.endMonth}/${job.endYear}` : job.endYear);
          if (eDate && setNativeValue(wdEndDates[i], eDate)) filledCount++;
        }
        if (wdDescriptions[i] && job.description && setNativeValue(wdDescriptions[i], job.description)) {
          filledCount++;
          filledFields.push(`Work History ${i + 1} Bullets`);
        }
      }
    }

    // Strategy B: Greenhouse Employment History Repeated Rows
    const ghCompanies = queryAll('input[name*="employment"][name*="company"], input[name*="employer"], input[name*="company_name"], input[id*="employment_company"]');
    const ghTitles = queryAll('input[name*="employment"][name*="title"], input[name*="job_title"], input[id*="employment_title"]');
    const ghStartDates = queryAll('input[name*="employment"][name*="start_date"], input[id*="employment_start_date"]');
    const ghEndDates = queryAll('input[name*="employment"][name*="end_date"], input[id*="employment_end_date"]');
    const ghSummaries = queryAll('textarea[name*="employment"][name*="description"], textarea[name*="employment_summary"], textarea[id*="employment_description"]');

    if (ghCompanies.length > 0) {
      for (let i = 0; i < Math.min(ghCompanies.length, workHistoryList.length); i++) {
        const job = workHistoryList[i];
        if (ghCompanies[i] && setNativeValue(ghCompanies[i], job.company)) {
          filledCount++;
          filledFields.push(`Greenhouse Employer ${i + 1}`);
        }
        if (ghTitles[i] && setNativeValue(ghTitles[i], job.title)) {
          filledCount++;
        }
        if (ghStartDates[i] && setNativeValue(ghStartDates[i], job.startDate || job.startYear)) {
          filledCount++;
        }
        if (ghEndDates[i] && setNativeValue(ghEndDates[i], job.endDate || job.endYear)) {
          filledCount++;
        }
        if (ghSummaries[i] && job.description && setNativeValue(ghSummaries[i], job.description)) {
          filledCount++;
        }
      }
    }

    // Strategy C: Ashby / Lever Structured Experience Fields
    const ashbyTitles = queryAll('[data-qa*="experience-title"], input[name*="experience_title"], input[name*="job_title"]:not([data-automation-id])');
    const ashbyCompanies = queryAll('[data-qa*="experience-company"], input[name*="experience_company"], input[name*="employer"]:not([name*="employment"])');
    if (ashbyTitles.length > 0 && ghTitles.length === 0 && wdJobTitles.length === 0) {
      for (let i = 0; i < Math.min(ashbyTitles.length, workHistoryList.length); i++) {
        const job = workHistoryList[i];
        if (ashbyTitles[i] && setNativeValue(ashbyTitles[i], job.title)) filledCount++;
        if (ashbyCompanies[i] && setNativeValue(ashbyCompanies[i], job.company)) filledCount++;
      }
    }
  }

  // 14. Education Multi-Entry Injection
  const educationList = Array.isArray(actualPayload.education) ? actualPayload.education : [];
  if (educationList.length > 0) {
    // Workday Education
    const wdSchools = queryAll('input[data-automation-id*="school"]');
    const wdDegrees = queryAll('input[data-automation-id*="degree"]');
    const wdFieldsOfStudy = queryAll('input[data-automation-id*="fieldOfStudy"]');
    if (wdSchools.length > 0) {
      for (let i = 0; i < Math.min(wdSchools.length, educationList.length); i++) {
        const edu = educationList[i];
        if (wdSchools[i] && setNativeValue(wdSchools[i], edu.school)) { filledCount++; filledFields.push(`Education ${i + 1} School`); }
        if (wdDegrees[i] && edu.degree && setNativeValue(wdDegrees[i], edu.degree)) filledCount++;
        if (wdFieldsOfStudy[i] && edu.discipline && setNativeValue(wdFieldsOfStudy[i], edu.discipline)) filledCount++;
      }
    }

    // Greenhouse / Standard Education
    const eduSchool = query(['#school', 'input[name*="school"]', 'input[name*="education"][name*="school"]', 'input[data-qa*="school"]']);
    if (eduSchool && educationList[0]?.school) {
      if (setNativeValue(eduSchool, educationList[0].school)) { filledCount++; filledFields.push('Education School'); }
    }
    const eduDegree = query(['#degree', 'input[name*="degree"]', 'input[name*="education"][name*="degree"]']);
    if (eduDegree && educationList[0]?.degree) {
      if (setNativeValue(eduDegree, educationList[0].degree)) { filledCount++; filledFields.push('Education Degree'); }
    }
    const eduDiscipline = query(['#discipline', 'input[name*="discipline"]', 'input[name*="major"]']);
    if (eduDiscipline && educationList[0]?.discipline) {
      if (setNativeValue(eduDiscipline, educationList[0].discipline)) { filledCount++; filledFields.push('Education Discipline'); }
    }
  }

  // 15. Heuristic Scan for Unmatched Form Inputs (Screening Questions, Work Auth, etc.)
  const allInputs = Array.from(actualRoot.querySelectorAll('input:not([type="hidden"]):not([type="submit"]):not([type="button"]), select, textarea'));

  for (const input of allInputs) {
    // Skip inputs we already filled
    if (input.style && input.style.borderColor === 'rgb(16, 185, 129)') continue;

    // Get element label or context text
    let labelText = '';
    if (input.id) {
      const label = actualRoot.querySelector(`label[for="${input.id}"]`);
      if (label) labelText = label.textContent || '';
    }
    if (!labelText && input.closest) {
      const parentLabel = input.closest('label');
      if (parentLabel) labelText = parentLabel.textContent || '';
    }
    const fullDescriptor = `${input.name || ''} ${input.id || ''} ${input.placeholder || ''} ${input.getAttribute('aria-label') || ''} ${labelText}`.toLowerCase();

    // Work Authorization Question
    if (/authorized.*work|legally.*authorized|work.*authorization|eligible.*work/i.test(fullDescriptor)) {
      if (input.tagName === 'SELECT') {
        if (setSelectValue(input, actualPayload.workAuth || 'Yes')) {
          filledCount++;
          filledFields.push('Work Authorization');
        }
      } else if (input.type === 'radio') {
        if (/yes|authorized/i.test(input.value || input.id || fullDescriptor)) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          filledFields.push('Work Authorization (Radio)');
        }
      } else if (input.tagName === 'INPUT' && input.type === 'text') {
        if (setNativeValue(input, actualPayload.workAuth || 'Yes')) {
          filledCount++;
          filledFields.push('Work Authorization');
        }
      }
    }

    // Visa Sponsorship Question
    if (/require.*sponsorship|visa.*sponsorship|future.*sponsorship/i.test(fullDescriptor)) {
      if (input.tagName === 'SELECT') {
        if (setSelectValue(input, actualPayload.visaSponsorship || 'No')) {
          filledCount++;
          filledFields.push('Visa Sponsorship');
        }
      } else if (input.type === 'radio') {
        if (/no|never/i.test(input.value || input.id || fullDescriptor)) {
          input.checked = true;
          input.dispatchEvent(new Event('change', { bubbles: true }));
          filledCount++;
          filledFields.push('Visa Sponsorship (Radio)');
        }
      } else if (input.tagName === 'INPUT' && input.type === 'text') {
        if (setNativeValue(input, actualPayload.visaSponsorship || 'No')) {
          filledCount++;
          filledFields.push('Visa Sponsorship');
        }
      }
    }

    // Notice Period / Earliest Start Date
    if (/notice.*period|start.*date|availability|how.*soon/i.test(fullDescriptor)) {
      if (input.tagName === 'SELECT') {
        if (setSelectValue(input, actualPayload.noticePeriod || '2 weeks')) {
          filledCount++;
          filledFields.push('Notice Period');
        }
      } else if (input.tagName === 'INPUT') {
        if (setNativeValue(input, actualPayload.noticePeriod || 'Immediate / 2 weeks')) {
          filledCount++;
          filledFields.push('Notice Period');
        }
      }
    }

    // Salary Expectations
    if (/salary|compensation|expected.*rate|desired.*salary/i.test(fullDescriptor) && actualPayload.salary) {
      if (input.tagName === 'INPUT') {
        if (setNativeValue(input, actualPayload.salary)) {
          filledCount++;
          filledFields.push('Salary Expectations');
        }
      }
    }

    // Years of Experience
    if (/years.*of.*experience|how.*many.*years|total.*experience/i.test(fullDescriptor) && actualPayload.yearsOfExperience) {
      if (input.tagName === 'INPUT') {
        if (setNativeValue(input, String(actualPayload.yearsOfExperience))) {
          filledCount++;
          filledFields.push('Years of Experience');
        }
      } else if (input.tagName === 'SELECT') {
        if (setSelectValue(input, String(actualPayload.yearsOfExperience))) {
          filledCount++;
          filledFields.push('Years of Experience');
        }
      }
    }

    // Relocation
    if (/relocat|willing.*to.*move/i.test(fullDescriptor) && actualPayload.relocation) {
      if (input.tagName === 'SELECT') {
        if (setSelectValue(input, 'Yes')) {
          filledCount++;
          filledFields.push('Relocation');
        }
      } else if (input.type === 'radio' && /yes/i.test(input.value || input.id || fullDescriptor)) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        filledCount++;
      }
    }

    // Voluntary Self-Identification (EEO - Decline to identify default)
    if (/gender|race|ethnicity|veteran|disability/i.test(fullDescriptor) && input.tagName === 'SELECT') {
      const declOpt = Array.from(input.options).find(o => /decline|choose not|prefer not/i.test(o.text || o.value));
      if (declOpt && !input.value) {
        setSelectValue(input, declOpt.value);
        filledCount++;
      }
    }
  }

  return { filledCount, filledFields, platform };
}

/**
 * Strips sensitive PII and confidential compensation/visa data from the bookmarklet payload.
 * Prevents salary expectations, visa sponsorship, work authorization status, and notice periods
 * from being serialized into the executable javascript: URI, which can leak via browser cloud
 * bookmark sync (Chrome Sync, Apple iCloud Keychain/Safari, Microsoft Edge Sync).
 *
 * These sensitive fields are preserved strictly for local-memory injection via the Companion Extension.
 *
 * @param {Object} payload Normalized candidate profile payload.
 * @returns {Object} Sanitized profile payload safe for bookmarklet URI encoding.
 */
export function sanitizeBookmarkletPayload(payload = {}) {
  if (!payload || typeof payload !== 'object') return {};

  const sanitized = { ...payload };

  // Strip sensitive financial, immigration, and notice-period fields and all known aliases
  const sensitiveKeys = [
    'salary', 'target_salary', 'targetSalary', 'desiredSalary', 'desired_salary',
    'expectedSalary', 'expected_salary', 'currentSalary', 'current_salary', 'compensation',
    'visaSponsorship', 'visa_sponsorship', 'visa', 'requireSponsorship', 'require_sponsorship',
    'workAuth', 'work_auth', 'workAuthorization', 'work_authorization', 'legallyAuthorized',
    'noticePeriod', 'notice_period', 'notice', 'availability', 'startDate', 'start_date'
  ];

  for (const key of sensitiveKeys) {
    delete sanitized[key];
  }

  // Clean screeningAnswers nested object if present
  if (sanitized.screeningAnswers && typeof sanitized.screeningAnswers === 'object') {
    const cleanedScreening = { ...sanitized.screeningAnswers };
    for (const key of sensitiveKeys) {
      delete cleanedScreening[key];
    }
    sanitized.screeningAnswers = cleanedScreening;
  }

  return sanitized;
}

/**
 * Compiles the candidate profile into an executable, zero-dependency bookmarklet URL:
 * javascript:(function(){...})()
 * 
 * Automatically strips sensitive salary, visa, and notice-period fields to prevent
 * cloud bookmark sync leakage across browser accounts.
 * 
 * @param {Object} payload Normalized candidate profile payload.
 * @returns {string} Fully encoded javascript: URI.
 */
export function generateAutofillBookmarkletCode(payload = {}) {
  // Strip sensitive PII to prevent cloud-bookmark-sync data leakage
  const safePayload = sanitizeBookmarkletPayload(payload);
  const payloadJson = JSON.stringify(safePayload).replace(/<\/script>/gi, '<\\/script>');

  // Raw client-side execution script
  const scriptBody = `(function(){
    var p = ${payloadJson};
    var filled = 0;
    var list = [];

    function setVal(el, val) {
      if (!el || val == null || val === '') return false;
      try {
        var isArea = el.tagName === 'TEXTAREA';
        var proto = isArea ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype;
        var desc = Object.getOwnPropertyDescriptor(proto, 'value');
        if (desc && desc.set) {
          desc.set.call(el, val);
        } else {
          el.value = val;
        }
        if (el._valueTracker) {
          el._valueTracker.setValue('');
        }
        el.dispatchEvent(new Event('focus', { bubbles: true }));
        el.dispatchEvent(new Event('input', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('change', { bubbles: true, cancelable: true }));
        el.dispatchEvent(new Event('blur', { bubbles: true }));
        try {
          el.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));
        } catch(ke){}
        el.style.setProperty('border', '2px solid #10b981', 'important');
        el.style.setProperty('box-shadow', '0 0 10px rgba(16, 185, 129, 0.4)', 'important');
        return true;
      } catch(e) {
        el.value = val;
        return true;
      }
    }

    function setSel(sel, val) {
      if (!sel || !val) return false;
      try {
        var opts = Array.prototype.slice.call(sel.options);
        var vl = String(val).toLowerCase().trim();
        var idx = -1;
        for (var i = 0; i < opts.length; i++) {
          if (opts[i].value.toLowerCase().trim() === vl || opts[i].text.toLowerCase().trim() === vl) {
            idx = i; break;
          }
        }
        if (idx === -1) {
          for (var j = 0; j < opts.length; j++) {
            if (opts[j].text.toLowerCase().indexOf(vl) !== -1 || opts[j].value.toLowerCase().indexOf(vl) !== -1) {
              idx = j; break;
            }
          }
        }
        if (idx !== -1) {
          sel.selectedIndex = idx;
          sel.dispatchEvent(new Event('change', { bubbles: true }));
          sel.style.setProperty('border', '2px solid #10b981', 'important');
          return true;
        }
      } catch(e){}
      return false;
    }

    function q(sels) {
      for (var i = 0; i < sels.length; i++) {
        try {
          var el = document.querySelector(sels[i]);
          if (el && !el.disabled && el.type !== 'hidden') return el;
        } catch(e){}
      }
      return null;
    }

    function qAll(sel) {
      try {
        var all = document.querySelectorAll(sel);
        var res = [];
        for (var i = 0; i < all.length; i++) {
          if (!all[i].disabled && all[i].type !== 'hidden') res.push(all[i]);
        }
        return res;
      } catch(e) { return []; }
    }

    // 1. First Name
    if (p.firstName) {
      var fn = q(['#first_name', 'input[name*="first_name"]', 'input[name="firstName"]', 'input[data-ui="firstname"]', 'input[autocomplete="given-name"]', 'input[data-automation-id*="firstName"]']);
      if (fn && setVal(fn, p.firstName)) { filled++; list.push('First Name'); }
    }

    // 2. Last Name
    if (p.lastName) {
      var ln = q(['#last_name', 'input[name*="last_name"]', 'input[name="lastName"]', 'input[data-ui="lastname"]', 'input[autocomplete="family-name"]', 'input[data-automation-id*="lastName"]']);
      if (ln && setVal(ln, p.lastName)) { filled++; list.push('Last Name'); }
    }

    // 3. Full Name (for Lever / Ashby single field)
    if (p.fullName && list.indexOf('First Name') === -1) {
      var nameEl = q(['input[name="name"]', 'input[name="_systemfield_name"]', 'input[name="applicant_name"]', '#name', '#candidate_name']);
      if (nameEl && setVal(nameEl, p.fullName)) { filled++; list.push('Full Name'); }
    }

    // 4. Email
    if (p.email) {
      var em = q(['#email', 'input[type="email"]', 'input[name*="email"]', 'input[name="_systemfield_email"]', 'input[autocomplete="email"]', 'input[data-ui="email"]', 'input[data-automation-id*="email"]']);
      if (em && setVal(em, p.email)) { filled++; list.push('Email'); }
    }

    // 5. Phone
    if (p.phone) {
      var ph = q(['#phone', 'input[type="tel"]', 'input[name*="phone"]', 'input[name="_systemfield_phoneNumber"]', 'input[name="phoneNumber"]', 'input[autocomplete="tel"]', 'input[data-ui="phone"]', 'input[data-automation-id*="phone"]']);
      if (ph && setVal(ph, p.phone)) { filled++; list.push('Phone'); }
    }

    // 6. Location
    if (p.location) {
      var loc = q(['#job_application_location', 'input[name*="location"]', 'input[name*="city"]', 'input[name="_systemfield_location"]', 'input[placeholder*="City"]', 'input[data-automation-id*="city"]']);
      if (loc && setVal(loc, p.location)) { filled++; list.push('Location'); }
    }

    // 7. URLs: LinkedIn, GitHub, Portfolio
    if (p.linkedin) {
      var li = q(['input[name*="urls[LinkedIn]"]', 'input[name*="linkedin"]', 'input[name*="LinkedIn"]', 'input[id*="linkedin"]', 'input[placeholder*="linkedin.com"]', 'input[data-automation-id*="linkedin"]']);
      if (li && setVal(li, p.linkedin)) { filled++; list.push('LinkedIn'); }
    }
    if (p.github) {
      var gh = q(['input[name*="urls[GitHub]"]', 'input[name*="github"]', 'input[name*="GitHub"]', 'input[id*="github"]', 'input[placeholder*="github.com"]', 'input[data-automation-id*="github"]']);
      if (gh && setVal(gh, p.github)) { filled++; list.push('GitHub'); }
    }
    if (p.portfolio) {
      var pf = q(['input[name*="urls[Portfolio]"]', 'input[name*="portfolio"]', 'input[name*="website"]', 'input[name="webAddress"]', 'input[placeholder*="portfolio"]', 'input[data-automation-id*="website"]']);
      if (pf && setVal(pf, p.portfolio)) { filled++; list.push('Portfolio'); }
    }

    // 8. Work History Multi-Entry (Workday & Greenhouse & Ashby)
    var wList = Array.isArray(p.workHistory) ? p.workHistory : [];
    if (wList.length > 0) {
      var wdTitles = qAll('input[data-automation-id*="jobTitle"]');
      var wdCompanies = qAll('input[data-automation-id*="company"]');
      var wdDesc = qAll('textarea[data-automation-id*="description"]');
      if (wdTitles.length > 0) {
        for (var wi = 0; wi < Math.min(wdTitles.length, wList.length); wi++) {
          if (setVal(wdTitles[wi], wList[wi].title)) filled++;
          if (wdCompanies[wi] && setVal(wdCompanies[wi], wList[wi].company)) filled++;
          if (wdDesc[wi] && wList[wi].description && setVal(wdDesc[wi], wList[wi].description)) filled++;
        }
      }

      var ghCompanies = qAll('input[name*="employment"][name*="company"], input[name*="employer"], input[name*="company_name"]');
      var ghTitles = qAll('input[name*="employment"][name*="title"], input[name*="job_title"]');
      if (ghCompanies.length > 0 && wdCompanies.length === 0) {
        for (var gi = 0; gi < Math.min(ghCompanies.length, wList.length); gi++) {
          if (setVal(ghCompanies[gi], wList[gi].company)) filled++;
          if (ghTitles[gi] && setVal(ghTitles[gi], wList[gi].title)) filled++;
        }
      }
    } else if (p.currentCompany) {
      var co = q(['input[name="org"]', 'input[name*="company"]', 'input[name*="current_company"]']);
      if (co && setVal(co, p.currentCompany)) { filled++; list.push('Company'); }
    }

    // 9. Cover Letter / Pitch
    if (p.coverLetter) {
      var cl = q(['textarea[name="comments"]', 'textarea[name*="cover_letter"]', 'textarea[name*="coverLetter"]', 'textarea#cover_letter_text', 'textarea#additional_info']);
      if (cl && setVal(cl, p.coverLetter)) { filled++; list.push('Pitch / Note'); }
    }

    // 10. Screening heuristics
    var inputs = document.querySelectorAll('input:not([type="hidden"]), select, textarea');
    for (var k = 0; k < inputs.length; k++) {
      var inp = inputs[k];
      if (inp.style && inp.style.borderColor === 'rgb(16, 185, 129)') continue;
      var lbl = '';
      if (inp.id) {
        var lEl = document.querySelector('label[for="' + inp.id + '"]');
        if (lEl) lbl = lEl.textContent || '';
      }
      var desc = ((inp.name || '') + ' ' + (inp.id || '') + ' ' + (inp.placeholder || '') + ' ' + lbl).toLowerCase();

      if (/years.*of.*experience/i.test(desc) && inp.tagName === 'INPUT' && p.yearsOfExperience) {
        if (setVal(inp, String(p.yearsOfExperience))) { filled++; list.push('Years Exp'); }
      }
    }

    // In-Page Interactive Co-Pilot Dock (Simplify Parity with Quick Copy)
    var oldHud = document.getElementById('sprav-autofill-hud');
    if (oldHud && oldHud.parentNode) oldHud.parentNode.removeChild(oldHud);

    var hud = document.createElement('div');
    hud.id = 'sprav-autofill-hud';
    hud.style.cssText = 'position:fixed;bottom:20px;right:20px;z-index:9999999;background:linear-gradient(135deg,#0f172a 0%,#1e1b4b 100%);color:#fff;border:1px solid rgba(56,189,248,0.5);box-shadow:0 12px 35px rgba(0,0,0,0.6),0 0 15px rgba(56,189,248,0.25);border-radius:14px;padding:12px 16px;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,sans-serif;font-size:12px;line-height:1.4;max-width:340px;user-select:none;transition:all 0.3s ease;';

    var esc = function(s){
      return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
    };

    var html = '<div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:6px;border-bottom:1px solid rgba(255,255,255,0.1);padding-bottom:6px;">' +
      '<div style="display:flex;align-items:center;gap:6px;font-weight:800;color:#38bdf8;font-size:13px;">' +
      '<span>⚡ SPrav Co-Pilot Assist</span>' +
      '</div>' +
      '<button id="sprav-hud-close" style="background:transparent;border:none;color:#94a3b8;cursor:pointer;font-size:14px;padding:0 4px;">✕</button>' +
      '</div>' +
      '<div id="sprav-hud-status" style="color:#e2e8f0;margin-bottom:8px;font-size:12px;"></div>' +
      '<div style="background:rgba(0,0,0,0.3);padding:6px 8px;border-radius:8px;margin-bottom:6px;">' +
      '<div style="font-size:10px;color:#94a3b8;text-transform:uppercase;font-weight:700;margin-bottom:4px;">📋 1-Click Quick-Copy Tray</div>' +
      '<div id="sprav-copy-tray" style="display:flex;flex-wrap:wrap;gap:2px;"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:#64748b;display:flex;align-items:center;justify-content:space-between;">' +
      '<span>🛡️ Zero Telemetry • 100% Private</span>' +
      '</div>';
    
    hud.innerHTML = html;

    var statusEl = hud.querySelector('#sprav-hud-status');
    if (statusEl) {
      if (filled > 0) {
        statusEl.innerHTML = '<strong style="color:#34d399;">✓ ' + Number(filled) + ' fields</strong> filled with React/Angular event bypass.';
      } else {
        statusEl.textContent = 'Form analyzed. Use Quick-Copy below for custom inputs:';
      }
    }

    var closeBtn = hud.querySelector('#sprav-hud-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        var h = document.getElementById('sprav-autofill-hud');
        if (h && h.parentNode) h.parentNode.removeChild(h);
      };
    }

    var tray = hud.querySelector('#sprav-copy-tray');
    if (tray) {
      var addCopyBtn = function(label, text) {
        if (!text) return;
        var btn = document.createElement('button');
        btn.style.cssText = 'background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);color:#38bdf8;padding:3px 8px;border-radius:5px;font-size:11px;cursor:pointer;font-weight:600;margin:2px;';
        btn.textContent = label;
        btn.title = 'Copy ' + label;
        btn.onclick = function() {
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(String(text)).then(function() {
              btn.textContent = '✓ Copied';
              setTimeout(function() { btn.textContent = label; }, 2000);
            }).catch(function() {
              btn.textContent = '✓ Copied';
              setTimeout(function() { btn.textContent = label; }, 2000);
            });
          }
        };
        tray.appendChild(btn);
      };

      addCopyBtn('Name', p.fullName);
      addCopyBtn('Email', p.email);
      addCopyBtn('Phone', p.phone);
      addCopyBtn('LinkedIn', p.linkedin);
      addCopyBtn('GitHub', p.github);
      if (p.coverLetter) addCopyBtn('Cover Letter', p.coverLetter);
    }

    document.body.appendChild(hud);
  })();`;

  return `javascript:${encodeURIComponent(scriptBody)}`;
}
