/**
 * one_job_sprint_engine.js
 * ========================
 * Client-side orchestration engine for the "1-Job Sprint" 5-in-1 workflow:
 * 1. Select Job
 * 2. Tailor Resume
 * 3. Generate Cover Letter
 * 4. Write Outreach Email
 * 5. Schedule Follow-up
 *
 * Provides pure utility functions for follow-up cadence calculation,
 * standard RFC 5545 iCalendar (.ics) generation, outreach variants formatting,
 * and unified sprint kit packaging.
 */

/**
 * Calculates a 3-tier follow-up cadence based on the application date:
 * - Day 3: Polite confirmation of receipt & check-in
 * - Day 7: Value-add project/code milestone sharing
 * - Day 14: Final requisition loop & status check
 *
 * @param {string|Date} [baseDate=new Date()] - Date when applied
 * @returns {Array<Object>} Array of 3 follow-up milestones
 */
export function calculateFollowupCadence(baseDate = new Date()) {
  const dateObj = baseDate instanceof Date ? new Date(baseDate.getTime()) : new Date(baseDate);
  const validDate = isNaN(dateObj.getTime()) ? new Date() : dateObj;

  const addDays = (d, days) => {
    const res = new Date(d.getTime());
    res.setDate(res.getDate() + days);
    return res;
  };

  const formatDateLabel = (d) => {
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatIsoDate = (d) => d.toISOString().split('T')[0];

  const day3 = addDays(validDate, 3);
  const day7 = addDays(validDate, 7);
  const day14 = addDays(validDate, 14);

  return [
    {
      step: 1,
      dayOffset: 3,
      date: day3,
      dateString: formatIsoDate(day3),
      dateDisplay: formatDateLabel(day3),
      title: 'Day 3: Friendly Application Verification',
      badge: 'Touchpoint 1',
      objective: 'Verify application was received and express targeted enthusiasm.',
      recommendedChannel: 'Email / Direct InMail',
      suggestedScript: 'Hi {contactName}, confirming my application for {role} at {company} went through smoothly. With depth in {primarySkill}, I would love to connect briefly!'
    },
    {
      step: 2,
      dayOffset: 7,
      date: day7,
      dateString: formatIsoDate(day7),
      dateDisplay: formatDateLabel(day7),
      title: 'Day 7: Value-Add Project Milestone',
      badge: 'Touchpoint 2',
      objective: 'Share a relevant technical project, live repo, or architecture milestone.',
      recommendedChannel: 'Email / LinkedIn Note',
      suggestedScript: 'Hi {contactName}, following up on my {role} application. Recently published architecture work on {primarySkill} that directly addresses {company}\'s engineering focus. Happy to share notes.'
    },
    {
      step: 3,
      dayOffset: 14,
      date: day14,
      dateString: formatIsoDate(day14),
      dateDisplay: formatDateLabel(day14),
      title: 'Day 14: Final Requisition Loop Check',
      badge: 'Touchpoint 3',
      objective: 'Polite status check before closing the active outreach loop.',
      recommendedChannel: 'Email Reply',
      suggestedScript: 'Hi {contactName}, checking in one last time on the {role} position. Still enthusiastic about {company}\'s mission. If another candidate was selected, wishing your team the best!'
    }
  ];
}

/**
 * Generates an RFC 5545 compliant iCalendar (.ics) string containing
 * reminders for all 3 follow-up milestones.
 *
 * @param {Object} job - Target job requisition
 * @param {Array<Object>} cadence - Cadence milestones from calculateFollowupCadence
 * @returns {string} Valid .ics file content
 */
export function generateFollowupIcs(job = {}, cadence = []) {
  const safeRole = (job.title || 'Role').replace(/[\r\n,;\\]+/g, ' ').trim();
  const safeCompany = (job.company || 'Company').replace(/[\r\n,;\\]+/g, ' ').trim();
  const now = new Date();
  const dtstamp = now.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';

  const formatIcsDate = (d) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}${month}${day}`;
  };

  const milestones = Array.isArray(cadence) && cadence.length > 0
    ? cadence
    : calculateFollowupCadence(now);

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//SPrav Job AI//1-Job Sprint Follow-up Reminders//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH'
  ];

  milestones.forEach((m, idx) => {
    const eventDate = m.date instanceof Date ? m.date : new Date(m.dateString || m.date);
    const dateStr = formatIcsDate(eventDate);
    const uid = `sprav-${job.id || 'job'}-sprint-${m.dayOffset}-${idx}-${Date.now()}@sprav.ai`;
    const summary = `SPrav Follow-up: ${safeRole} at ${safeCompany} (${m.badge})`;
    const safeUrl = (job.url || 'N/A').replace(/[\r\n]/g, '').trim();
    const safeTitle = (m.title || '').replace(/[\r\n]/g, ' ').trim();
    const safeObjective = (m.objective || '').replace(/[\r\n]/g, ' ').trim();
    const safeChannel = (m.recommendedChannel || '').replace(/[\r\n]/g, ' ').trim();
    const description = `${safeTitle}\\nObjective: ${safeObjective}\\nChannel: ${safeChannel}\\nRole URL: ${safeUrl}`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:${uid}`,
      `DTSTAMP:${dtstamp}`,
      `DTSTART;VALUE=DATE:${dateStr}`,
      `DTEND;VALUE=DATE:${dateStr}`,
      `SUMMARY:${summary}`,
      `DESCRIPTION:${description}`,
      'STATUS:CONFIRMED',
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:Follow-up Reminder',
      'TRIGGER:-PT9H', // 9:00 AM morning reminder
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

/**
 * Builds high-converting outreach variants for the job:
 * 1. LinkedIn Connection Note (strictly ≤ 300 characters)
 * 2. InMail / Direct Recruiter Pitch (concise 3-sentence)
 * 3. Cold Email Subject Line & Body
 *
 * @param {Object} job - Target job
 * @param {Object} candidateKb - Candidate knowledge base
 * @returns {Object} Structured outreach variants
 */
export function buildSprintOutreachVariants(job = {}, candidateKb = {}) {
  const safeRole = job.title || job.role || 'Software Engineer';
  const safeCompany = job.company || 'your team';
  const candidateName = candidateKb?.personal?.name || job.candidateName || 'Candidate';

  // Extract candidate top strength
  const rawSkills = candidateKb?.skills;
  const skillsList = Array.isArray(rawSkills)
    ? [...rawSkills]
    : Object.values(rawSkills || {}).flat();
  if (job.topSkill && !skillsList.includes(job.topSkill)) {
    skillsList.unshift(job.topSkill);
  }
  const primarySkill = skillsList[0] || 'software architecture';
  const secondarySkill = skillsList[1] || 'high-throughput systems';

  // 1. LinkedIn Connection Request Note (Hard limit: 300 chars)
  let linkedinNote = `Hi! I noticed the ${safeRole} role at ${safeCompany} and wanted to connect directly. My background centers on ${primarySkill}, where I recently engineered scalable production systems. Would love to stay in touch as your engineering team grows!`;
  if (linkedinNote.length > 298) {
    linkedinNote = `Hi! Following the ${safeRole} role at ${safeCompany}. My engineering background centers on ${primarySkill}. Would welcome connecting as your team expands!`;
  }
  if (linkedinNote.length > 298) {
    linkedinNote = linkedinNote.slice(0, 295) + '...';
  }

  // 2. 3-Sentence Recruiter InMail
  const inmailPitch = `I came across the ${safeRole} opening at ${safeCompany} and wanted to reach out directly. Over the past several years, my engineering focus has centered on ${primarySkill} and ${secondarySkill}, with a track record of improving system performance and reliability under scale. I would welcome 10 minutes to discuss how my technical approach aligns with your roadmap for this role.`;

  // 3. Cold Email Subject & Body
  const emailSubject = `${safeRole} — ${candidateName} (Focus on ${primarySkill})`;
  const emailBody = `Hi ${safeCompany} Engineering Team,\n\nI recently submitted my application for the ${safeRole} position and wanted to share a brief note directly.\n\nMy technical foundation is rooted in ${primarySkill} and ${secondarySkill}. In my recent projects, I have owned end-to-end service scalability and resilient architecture, focusing on measurable operational outcomes.\n\nI have followed ${safeCompany}'s technical trajectory and believe my experience with ${primarySkill} would allow me to contribute immediately to your deliverables.\n\nI have attached my tailored ATS resume and would welcome a brief conversation.\n\nBest regards,\n${candidateName}\n${candidateKb?.personal?.email || ''} | ${candidateKb?.personal?.phone || ''}`;

  return {
    linkedin: {
      label: 'LinkedIn Connection Note',
      charCount: linkedinNote.length,
      maxChars: 300,
      content: linkedinNote
    },
    inmail: {
      label: 'Recruiter InMail Pitch',
      content: inmailPitch
    },
    email: {
      label: 'Cold Email & Pitch',
      subject: emailSubject,
      content: emailBody
    }
  };
}

/**
 * Packages all 5 sprint assets into a clean, structured Markdown kit.
 *
 * @param {Object} sprintData - Combined data from all 5 sprint steps
 * @returns {string} Markdown text summary
 */
export function formatSprintMarkdownSummary(sprintData = {}) {
  const {
    job = {},
    tailoring = {},
    coverLetter = '',
    outreach = {},
    cadence = [],
    templateId = 'ivy_classic'
  } = sprintData;

  const safeRole = job.title || 'Role';
  const safeCompany = job.company || 'Company';
  const nowStr = new Date().toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });

  return `# SPrav 1-Job Sprint Application Kit
**Role:** ${safeRole}  
**Company:** ${safeCompany}  
**Requisition URL:** ${job.url || 'Direct'}  
**Completed On:** ${nowStr}  
**ATS Template:** ${templateId}  

---

## 1. Target Requisition Overview
- **Role Category / Title:** ${safeRole}
- **Company:** ${safeCompany}
- **Location:** ${job.location || 'Remote / Unspecified'}
- **Detected ATS Platform:** ${job.atsPlatform?.name || 'Universal Standard'}

---

## 2. ATS Resume Tailoring Alignment
- **Matched Job Keywords (${tailoring.matchedKeywords?.length || 0}):**  
  ${(tailoring.matchedKeywords || []).join(', ') || 'Aligned with candidate background'}
- **Missing / Gap Keywords (${tailoring.missingKeywords?.length || 0}):**  
  ${(tailoring.missingKeywords || []).join(', ') || 'None identified'}

---

## 3. Publication-Grade Cover Letter (4 Thematic Beats)
\`\`\`text
${coverLetter.trim()}
\`\`\`

---

## 4. Multi-Channel Outreach Pitch
### LinkedIn Connection Note (≤ 300 Characters)
${outreach.linkedin?.content || ''}

### InMail / Direct Message
${outreach.inmail?.content || ''}

### Cold Email
**Subject:** ${outreach.email?.subject || ''}  
\`\`\`text
${outreach.email?.content || ''}
\`\`\`

---

## 5. Scheduled Follow-up Cadence
${cadence.map(c => `- **${c.title} (${c.dateDisplay}):** ${c.objective}`).join('\n')}

---
*Generated client-side via SPrav Job AI 1-Job Sprint ($0 compute cost, 100% data private).*
`;
}
