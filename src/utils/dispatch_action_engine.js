/**
 * dispatch_action_engine.js
 * ==========================
 * Centralized, shared business logic for Guided Dispatch workflows.
 * Unifies resume tailoring, ATS PDF generation, screening question answering,
 * bookmarklet compilation, and application outcome recording.
 *
 * Eliminates code duplication between GuidedDispatch (workspace view)
 * and GuidedDispatchModal (contextual modal dialog).
 */

import { cleanJobDescription } from './cleanDescription.js';
import { tailorResumeForJob } from './resume_tailoring_engine.js';
import { downloadAtsResumePdf } from './ats_pdf_compiler.js';
import { buildCandidateAutofillPayload, generateAutofillBookmarkletCode } from './autofill_bookmarklet.js';
import { storageVault } from './browser_storage_vault.js';

/**
 * Tailors a candidate resume for a specific job and triggers ATS PDF download.
 * @param {Object} kb - Knowledge base object
 * @param {Object} job - Target job listing
 * @param {Object} options - Optional tailoring settings
 * @returns {Promise<Object>} Tailored resume object
 */
export async function downloadTailoredJobResumePdf(kb, job, options = {}) {
  if (!job) throw new Error('[dispatchActionEngine] No job provided for PDF generation');
  
  const rawDesc = job.description || job.snippet || '';
  const cleanJd = cleanJobDescription(rawDesc);
  
  const tailored = tailorResumeForJob(kb || {}, cleanJd, {
    targetRole: job.title || '',
    company: job.company || '',
    ...options
  });

  const candidateName = (tailored?.candidate?.name || kb?.name || 'Candidate')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const companyName = (job.company || 'Company')
    .replace(/[^a-zA-Z0-9]/g, '_');
  const fileName = `${candidateName}_${companyName}_ATS_Resume.pdf`;

  downloadAtsResumePdf(tailored || kb, {
    targetRole: job.title,
    company: job.company,
    filename: fileName,
    ...options
  });
  return tailored;
}

/**
 * Builds normalized candidate screening answers for ATS application forms.
 * @param {Object} kb - Knowledge base
 * @param {Object} scope - Application scope
 * @param {Object} overrides - Custom override answers
 * @returns {Array<Object>} Normalized list of answer items
 */
export function buildScreeningAnswerList(kb = {}, scope = {}, overrides = {}) {
  const candidatePayload = buildCandidateAutofillPayload(kb, scope);
  const workHistoryCount = (kb?.work_history || []).length;
  const calculatedYoe = kb?.years_experience !== undefined && kb?.years_experience !== null && kb?.years_experience !== ''
    ? Math.max(0, parseInt(kb.years_experience, 10) || 0)
    : (workHistoryCount > 0 ? workHistoryCount * 2 : 3);

  return [
    {
      id: 'work_auth',
      category: 'work_authorization',
      label: 'Work Authorization',
      question: 'Are you legally authorized to work without sponsorship?',
      value: overrides.workAuth || candidatePayload.workAuth || 'Yes, legally authorized to work without sponsorship.',
      hint: 'Standard legal authorization status'
    },
    {
      id: 'visa_sponsorship',
      category: 'visa_sponsorship',
      label: 'Visa Sponsorship',
      question: 'Will you now or in the future require employer visa sponsorship?',
      value: overrides.visaSponsorship || (candidatePayload.visaSponsorship === 'Yes' 
        ? 'Yes, will require visa sponsorship (H-1B, STEM OPT, or equivalent).' 
        : 'No, does not now or in future require employer visa sponsorship.'),
      hint: 'Immigration & work permit status'
    },
    {
      id: 'target_salary',
      category: 'salary_expectations',
      label: 'Target Compensation',
      question: 'Target compensation / base salary expectations?',
      value: overrides.salary || candidatePayload.salary || (scope?.target_salary?.minimum 
        ? `$${scope.target_salary.minimum.toLocaleString()} - $${(scope.target_salary.minimum * 1.2).toLocaleString()}` 
        : (typeof scope?.target_salary === 'string' ? scope.target_salary : 'Competitive and open to negotiation based on total package.')),
      hint: 'Derived from Application Scope settings'
    },
    {
      id: 'notice_period',
      category: 'start_date',
      label: 'Notice Period / Earliest Start',
      question: 'Earliest available start date / notice period?',
      value: overrides.noticePeriod || candidatePayload.noticePeriod || '2 Weeks Notice / Immediate Availability',
      hint: 'Availability to commence work'
    },
    {
      id: 'years_experience',
      category: 'years_experience',
      label: 'Total Relevant Experience',
      question: 'Total relevant years of engineering experience?',
      value: overrides.yearsOfExperience || (candidatePayload.yearsOfExperience 
        ? `${candidatePayload.yearsOfExperience} Years`
        : `${calculatedYoe}+ Years of software engineering experience`),
      hint: 'Derived from work history longevity'
    },
    {
      id: 'linkedin',
      category: 'social_links',
      label: 'LinkedIn Profile URL',
      question: 'LinkedIn Profile Link',
      value: overrides.linkedin || candidatePayload.linkedin || 'https://www.linkedin.com',
      hint: 'Direct profile link'
    },
    {
      id: 'github',
      category: 'portfolio_links',
      label: 'GitHub / Portfolio URL',
      question: 'Portfolio / GitHub Link',
      value: overrides.github || candidatePayload.github || candidatePayload.portfolio || 'https://github.com',
      hint: 'Code portfolio & open-source projects'
    }
  ];
}

/**
 * Builds the complete autofill bookmarklet javascript: string for a job.
 * @param {Object} kb - Knowledge base
 * @param {Object} scope - Scope
 * @param {Object} customFields - Custom answer overrides
 * @returns {string} Executable bookmarklet code
 */
export function buildJobAutofillBookmarkletCode(kb, scope, customFields = {}) {
  const payload = buildCandidateAutofillPayload(kb || {}, scope || {}, customFields);
  return generateAutofillBookmarkletCode(payload);
}

/**
 * Safely toggles or sets job applied state in storageVault.
 * @param {Object} job - Target job
 * @param {boolean} markApplied - Desired state
 * @returns {Promise<boolean>} Resulting applied state
 */
export async function syncJobApplicationStatus(job, markApplied) {
  if (!job || !job.id) return false;
  if (markApplied) {
    if (storageVault?.markJobApplied) {
      await storageVault.markJobApplied(job.id, job);
    }
    return true;
  } else {
    if (storageVault?.unmarkJobApplied) {
      await storageVault.unmarkJobApplied(job.id);
    }
    return false;
  }
}
