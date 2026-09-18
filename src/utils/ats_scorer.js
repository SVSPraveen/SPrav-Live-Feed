/**
 * ats_scorer.js
 * =============
 * Standalone Facade & Unified Evaluation Interface for ATS Diagnostic Scoring.
 * 
 * Provides 12-dimension rule evaluation, keyword frequency calculation,
 * and edge-case handling for zero-cost client-side ATS simulation.
 */

import {
  analyzeResume as _analyzeResume,
  analyzeResumeAgainstJobs,
  scoreToGrade,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  getAtsPlatformSpecificAdvice,
  getSampleBulletTransformations,
  generateRoadmapTo100,
  applySingleIssueFix,
  autoOptimizeResumeTo100
} from './ats_xray_engine.js';

export {
  scoreToGrade,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  analyzeResumeAgainstJobs,
  getAtsPlatformSpecificAdvice,
  getSampleBulletTransformations,
  generateRoadmapTo100,
  applySingleIssueFix,
  autoOptimizeResumeTo100
};

/**
 * Standard 12-dimension ATS resume analyzer.
 * Re-exported from ats_xray_engine.
 */
export const analyzeResume = _analyzeResume;

/**
 * Defensive ATS resume evaluator with robust edge-case handling.
 * Safely evaluates empty resumes, null/undefined inputs, and special character sets.
 * 
 * @param {string|null|undefined} resumeText - Candidate plain text resume
 * @param {string|null} [jobDescription] - Target job posting text for keyword and semantic matching
 * @param {object} [options] - Evaluation options (e.g. industry: 'tech')
 * @returns {object} Full ATS diagnostic report with scores, 12 dimensions, and recommendations
 */
export function scoreResume(resumeText, jobDescription = null, options = {}) {
  if (typeof resumeText !== 'string' || !resumeText.trim()) {
    return createEmptyAtsReport(jobDescription, options);
  }

  try {
    return _analyzeResume(resumeText, jobDescription, options);
  } catch (err) {
    console.warn('[AtsScorer] Evaluation error, returning fallback diagnostic:', err);
    return createEmptyAtsReport(jobDescription, options, err.message);
  }
}

/**
 * Generates an empty or fallback report with 0 score and Grade F.
 */
export function createEmptyAtsReport(jobDescription = null, options = {}, errorMessage = null) {
  const emptyDim = (name) => ({
    score: 0,
    grade: 'F',
    issues: [{ severity: 'critical', title: `Missing ${name} information`, fix: `Provide complete ${name} details in your resume.` }],
    parsed: {}
  });

  const dimensions = {
    contact: emptyDim('contact'),
    sections: emptyDim('sections'),
    format: emptyDim('formatting'),
    keywords: emptyDim('keywords'),
    actionVerbs: emptyDim('action verbs'),
    quantification: emptyDim('quantification metrics'),
    dates: emptyDim('chronological dates'),
    length: emptyDim('length'),
    redFlags: emptyDim('content quality'),
    skills: emptyDim('technical skills'),
    education: emptyDim('education credentials')
  };

  if (jobDescription) {
    dimensions.jdMatch = emptyDim('job description match');
  }

  return {
    overallScore: 0,
    overallGrade: 'F',
    dimensions,
    recommendations: [
      {
        priority: 'critical',
        dimension: 'content',
        title: errorMessage ? `Evaluation Error: ${errorMessage}` : 'Empty Resume Content',
        description: 'Provide full text resume with standard sections, contact info, and experience.',
        fix: 'Import a valid PDF resume or paste plain text into the editor.'
      }
    ],
    parsedView: {
      name: 'Not detected',
      email: 'Not detected',
      phone: 'Not detected',
      linkedin: 'Not detected',
      github: 'Not detected',
      location: 'Not detected',
      detectedSections: [],
      missingSections: ['summary', 'experience', 'education', 'skills'],
      extractedSkills: [],
      wordCount: 0,
      estimatedPages: 0,
      keywordsFound: [],
      strongVerbs: [],
      weakPhrases: [],
      quantifiedBullets: []
    },
    metadata: {
      analyzedAt: new Date().toISOString(),
      hasJobDescription: !!jobDescription,
      industry: options.industry || 'tech',
      totalIssues: { critical: 1, warning: 0 },
      isEmpty: true
    }
  };
}

/**
 * Calculates keyword match frequency and coverage percentage between resume and JD.
 */
export function calculateKeywordFrequency(resumeText = '', jobDescription = '') {
  if (!resumeText || !jobDescription) {
    return { matches: [], totalJdKeywords: 0, matchedCount: 0, matchPercentage: 0 };
  }

  const clean = (text) => text.toLowerCase().replace(/[^a-z0-9+#.\s]/g, ' ');
  const rTokens = new Set(clean(resumeText).split(/\s+/).filter(t => t.length > 2));
  const jdTokens = clean(jobDescription).split(/\s+/).filter(t => t.length > 2);

  // Group JD token frequencies
  const jdFreq = new Map();
  for (const token of jdTokens) {
    jdFreq.set(token, (jdFreq.get(token) || 0) + 1);
  }

  const matches = [];
  let matchedCount = 0;
  for (const [term, freq] of jdFreq.entries()) {
    const isMatched = rTokens.has(term);
    if (isMatched) matchedCount++;
    matches.push({
      term,
      jdFrequency: freq,
      matched: isMatched
    });
  }

  const totalJdKeywords = jdFreq.size;
  const matchPercentage = totalJdKeywords > 0 ? Math.round((matchedCount / totalJdKeywords) * 100) : 0;

  return {
    matches: matches.sort((a, b) => b.jdFrequency - a.jdFrequency),
    totalJdKeywords,
    matchedCount,
    matchPercentage
  };
}
