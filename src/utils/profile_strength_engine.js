/**
 * profile_strength_engine.js
 * ===========================
 * Comprehensive 0-100 Profile Strength Engine for SPrav Job AI.
 * Combines 3 foundational pillars:
 *  1. Resume Completeness (40%) - Personal info, work history bullets, skills taxonomy, education/projects
 *  2. ATS Readiness (30%) - Master resume parsed, ATS single-column active, ATS X-Ray scanned
 *  3. Scope Configuration (30%) - Target roles, target hubs/work mode, compensation floor & seniority
 */

export function computeProfileStrengthScore(kb = {}, scope = {}, extra = {}) {
  // ── 1. RESUME COMPLETENESS (40 points) ───────────────────────────────────
  let resumeScore = 0;
  const resumeDetails = [];

  // 1a. Personal info & contact details (up to 10 pts)
  const personal = kb?.personal || {};
  const hasName = Boolean(personal.name || kb?.name);
  const hasEmail = Boolean(personal.email || kb?.email);
  const hasPhone = Boolean(personal.phone || kb?.phone);
  const hasLinks = Boolean(personal.linkedin || personal.github || personal.portfolio || kb?.linkedin || kb?.github);

  let personalPoints = 0;
  if (hasName) personalPoints += 3;
  if (hasEmail) personalPoints += 3;
  if (hasPhone) personalPoints += 2;
  if (hasLinks) personalPoints += 2;
  resumeScore += personalPoints;
  resumeDetails.push({
    id: 'personal',
    label: 'Contact Info & Links',
    earned: personalPoints,
    max: 10,
    isComplete: personalPoints >= 8,
    actionTab: 'onboarding',
    tip: 'Add phone, email, and LinkedIn profile to unlock complete employer autofill.'
  });

  // 1b. Work history with quantified achievements/bullets (up to 15 pts)
  const workHistory = Array.isArray(kb?.work_history) ? kb.work_history : [];
  let workPoints = 0;
  if (workHistory.length >= 1) {
    workPoints += 7; // at least 1 work experience entry
    const hasBullets = workHistory.some(w => (Array.isArray(w.bullets) && w.bullets.length > 0) || (Array.isArray(w.highlights) && w.highlights.length > 0) || (typeof w.description === 'string' && w.description.length > 50));
    if (hasBullets) workPoints += 5;
    if (workHistory.length >= 2) workPoints += 3;
  }
  resumeScore += Math.min(15, workPoints);
  resumeDetails.push({
    id: 'work_history',
    label: 'Work Experience & Bullets',
    earned: Math.min(15, workPoints),
    max: 15,
    isComplete: workPoints >= 12,
    actionTab: 'onboarding',
    tip: 'Include measurable metric-driven bullets in your work history.'
  });

  // 1c. Skills taxonomy (up to 10 pts)
  let skillsCount = 0;
  if (Array.isArray(kb?.skills)) {
    skillsCount = kb.skills.length;
  } else if (kb?.skills && typeof kb.skills === 'object') {
    skillsCount = Object.values(kb.skills).flat().filter(Boolean).length;
  }
  let skillPoints = 0;
  if (skillsCount >= 10) skillPoints = 10;
  else if (skillsCount >= 5) skillPoints = 7;
  else if (skillsCount >= 1) skillPoints = 4;

  resumeScore += skillPoints;
  resumeDetails.push({
    id: 'skills',
    label: 'Skills Taxonomy',
    earned: skillPoints,
    max: 10,
    isComplete: skillPoints === 10,
    actionTab: 'onboarding',
    tip: 'Add at least 8-10 technical and domain skills to maximize ATS match percentage.'
  });

  // 1d. Education & Projects (up to 5 pts)
  const education = Array.isArray(kb?.education) ? kb.education : [];
  const projects = Array.isArray(kb?.projects) ? kb.projects : [];
  let eduPoints = 0;
  if (education.length > 0) eduPoints += 3;
  if (projects.length > 0) eduPoints += 2;

  resumeScore += Math.min(5, eduPoints);
  resumeDetails.push({
    id: 'education_projects',
    label: 'Education & Projects',
    earned: Math.min(5, eduPoints),
    max: 5,
    isComplete: eduPoints >= 3,
    actionTab: 'onboarding',
    tip: 'Add university degree or key portfolio projects.'
  });

  // ── 2. ATS READINESS (30 points) ─────────────────────────────────────────
  let atsScore = 0;
  const atsDetails = [];

  // 2a. Master resume parsed & ATS compliant template active (up to 15 pts)
  const hasMasterResume = Boolean(
    extra?.masterResumeUploaded ||
    extra?.hasMasterResume ||
    (kb && (kb.raw_text || (kb.work_history && kb.work_history.length > 0)))
  );
  const templateActive = true; // SPrav defaults to Harvard/Standard Single-Column ATS
  const templatePoints = hasMasterResume ? 15 : 5;
  atsScore += templatePoints;
  atsDetails.push({
    id: 'ats_template',
    label: 'ATS-Compliant Resume Template',
    earned: templatePoints,
    max: 15,
    isComplete: templatePoints === 15,
    actionTab: 'resume',
    tip: 'Upload master resume PDF to verify single-column ATS parser compliance.'
  });

  // 2b. ATS X-Ray diagnostic scanned / benchmark history (up to 15 pts)
  const hasXrayScanned = Boolean(
    extra?.atsScanned ||
    (extra?.scoreHistory && extra.scoreHistory.length > 0) ||
    (typeof window !== 'undefined' && (
      localStorage.getItem('sprav_ats_xray_scanned') === 'true' ||
      localStorage.getItem('sprav_score_history')
    ))
  );
  const xrayPoints = hasXrayScanned ? 15 : 0;
  atsScore += xrayPoints;
  atsDetails.push({
    id: 'ats_xray',
    label: 'ATS X-Ray Benchmark Scan',
    earned: xrayPoints,
    max: 15,
    isComplete: xrayPoints === 15,
    actionTab: 'xray',
    tip: 'Run ATS X-Ray diagnostic on a target role to surface parser keyword diffs.'
  });

  // ── 3. SCOPE CONFIGURATION (30 points) ───────────────────────────────────
  let scopeScore = 0;
  const scopeDetails = [];

  // 3a. Target roles defined (up to 15 pts)
  const roles = (scope?.roles || []).filter(r => (typeof r === 'string' ? r : r.keyword) && r.preference !== 'exclude');
  let rolePoints = 0;
  if (roles.length >= 3) rolePoints = 15;
  else if (roles.length >= 1) rolePoints = 10;
  scopeScore += rolePoints;
  scopeDetails.push({
    id: 'roles',
    label: 'Target Job Titles',
    earned: rolePoints,
    max: 15,
    isComplete: rolePoints >= 10,
    actionTab: 'scope',
    tip: 'Define at least 1-3 target role keywords (e.g., Senior Full Stack Engineer).'
  });

  // 3b. Locations & work mode set (up to 10 pts)
  const locations = (scope?.locations || []).filter(l => (typeof l === 'string' ? l : l.label) && l.preference !== 'exclude');
  const workMode = scope?.work_mode && scope.work_mode !== 'any';
  let locPoints = 0;
  if (locations.length >= 1 || workMode) {
    locPoints = locations.length >= 1 && workMode ? 10 : 7;
  }
  scopeScore += locPoints;
  scopeDetails.push({
    id: 'locations_mode',
    label: 'Target Hubs & Work Mode',
    earned: locPoints,
    max: 10,
    isComplete: locPoints >= 7,
    actionTab: 'scope',
    tip: 'Choose target metropolitan hubs or set Remote/Hybrid preference.'
  });

  // 3c. Compensation floor & seniority (up to 5 pts)
  const hasSalary = Boolean(scope?.target_salary?.minimum || scope?.min_salary || scope?.target_salary);
  const hasSeniority = Boolean(scope?.experience_level && scope.experience_level !== 'any');
  let compPoints = 0;
  if (hasSalary || hasSeniority) {
    compPoints = hasSalary && hasSeniority ? 5 : 3;
  }
  scopeScore += compPoints;
  scopeDetails.push({
    id: 'comp_seniority',
    label: 'Compensation & Seniority',
    earned: compPoints,
    max: 5,
    isComplete: compPoints >= 3,
    actionTab: 'scope',
    tip: 'Set minimum salary floor and seniority level to filter out lowball roles.'
  });

  // ── TOTAL SCORE (0-100) ──────────────────────────────────────────────────
  const total = Math.min(100, Math.max(0, resumeScore + atsScore + scopeScore));

  // Tier designation
  let tier = 'Needs Setup';
  let tierColor = '#f87171';
  let tierBg = 'rgba(239, 68, 68, 0.15)';
  let tierBorder = 'rgba(239, 68, 68, 0.35)';

  if (total >= 90) {
    tier = 'Elite ATS Ready';
    tierColor = '#34d399';
    tierBg = 'rgba(16, 185, 129, 0.15)';
    tierBorder = 'rgba(16, 185, 129, 0.35)';
  } else if (total >= 75) {
    tier = 'Interview Competitive';
    tierColor = '#38bdf8';
    tierBg = 'rgba(56, 189, 248, 0.15)';
    tierBorder = 'rgba(56, 189, 248, 0.35)';
  } else if (total >= 50) {
    tier = 'Calibrating';
    tierColor = '#fbbf24';
    tierBg = 'rgba(245, 158, 11, 0.15)';
    tierBorder = 'rgba(245, 158, 11, 0.35)';
  }

  // Find lowest sub-score for targeted recommended next action
  const allBreakdown = [...resumeDetails, ...atsDetails, ...scopeDetails];
  const nextIncomplete = allBreakdown.find(item => !item.isComplete);

  return {
    total,
    resumeScore, // max 40
    atsScore,    // max 30
    scopeScore,  // max 30
    tier,
    tierColor,
    tierBg,
    tierBorder,
    resumeDetails,
    atsDetails,
    scopeDetails,
    nextAction: nextIncomplete ? {
      label: nextIncomplete.label,
      tip: nextIncomplete.tip,
      actionTab: nextIncomplete.actionTab
    } : null
  };
}
