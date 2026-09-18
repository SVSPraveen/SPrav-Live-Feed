/**
 * ats_docx_compiler.js
 * =====================
 * Pure Client-Side ATS-Compliant Microsoft Word (.docx) Resume Compiler.
 * Compiles single-column, recruiter-friendly OpenXML documents directly in-browser
 * using the lightweight 'docx' library ($0 server cost, zero external API dependencies).
 *
 * Designed specifically for enterprise ATS compatibility (Workday, Taleo, BrassRing,
 * iCIMS, Greenhouse, Ashby) and agency recruiters who require editable Word documents.
 *
 * ATS Optimization Guardrails:
 * - Strictly single-column linear text stream (no nested tables, text boxes, or floating frames)
 * - Standard native tab stops for clean right-aligned employment and education dates
 * - True bullet points (w:numPr / level: 0) reliably extracted by all resume parsers
 * - Standard 0.5"–0.6" margins (720-864 twips)
 * - Clean semantic typography (Calibri, Arial, Georgia) with theme accent color demarcation
 */

import {
  Document,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  Packer,
  BorderStyle,
  ExternalHyperlink,
  TabStopType,
  TabStopPosition
} from 'docx';

/**
 * Sanitizes raw text string for OpenXML safety.
 */
export function sanitizeDocxText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2022]/g, ' ')
    .trim();
}

/**
 * Converts RGB tuple ([0..1, 0..1, 0..1] or [0..255, 0..255, 0..255]) to 6-char hex string without '#'.
 */
export function rgbToHex(rgb) {
  if (!Array.isArray(rgb) || rgb.length < 3) return '1E293B';
  const isZeroToOne = rgb.every(v => typeof v === 'number' && v <= 1.0);
  const r = Math.min(255, Math.max(0, Math.round(isZeroToOne ? rgb[0] * 255 : rgb[0])));
  const g = Math.min(255, Math.max(0, Math.round(isZeroToOne ? rgb[1] * 255 : rgb[1])));
  const b = Math.min(255, Math.max(0, Math.round(isZeroToOne ? rgb[2] * 255 : rgb[2])));
  return [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('').toUpperCase();
}

/**
 * Compiles a structured tailored resume object into a docx.Document.
 *
 * @param {Object} tailoredData - Structured candidate profile and tailored sections
 * @param {Object} [options={}] - Layout and styling options
 * @returns {Document}
 */
export function compileAtsResumeDocx(tailoredData = {}, options = {}) {
  const candidate = tailoredData.candidate || tailoredData.profile || {};
  const font = options.fontFamily || 'Calibri';

  // Accent color resolving
  let accentHex = '1E293B';
  if (options.accentColorHex) {
    accentHex = options.accentColorHex.replace(/^#/, '').toUpperCase();
  } else if (Array.isArray(options.accentColorRgb)) {
    accentHex = rgbToHex(options.accentColorRgb);
  } else if (options.pdfVariant === 'modern' || options.templateId === 'modern') {
    accentHex = '2563EB';
  }

  const isCenteredHeader = options.pdfVariant === 'ivy' || options.templateId === 'ivy' || options.alignHeader === 'center';
  const headerAlignment = isCenteredHeader ? AlignmentType.CENTER : AlignmentType.LEFT;

  const children = [];

  // ─── 1. CANDIDATE NAME & TITLE ──────────────────────────────────────────────
  const candidateName = sanitizeDocxText(candidate.name || 'Candidate Name').toUpperCase();
  children.push(
    new Paragraph({
      alignment: headerAlignment,
      spacing: { before: 0, after: 60 },
      children: [
        new TextRun({
          text: candidateName,
          bold: true,
          size: 44, // 22 pt
          color: accentHex,
          font
        })
      ]
    })
  );

  // Candidate Subtitle / Headline
  const candidateTitle = sanitizeDocxText(candidate.title || candidate.target_role || candidate.headline || '');
  if (candidateTitle) {
    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { before: 0, after: 80 },
        children: [
          new TextRun({
            text: candidateTitle,
            bold: true,
            size: 22, // 11 pt
            color: '475569',
            font
          })
        ]
      })
    );
  }

  // Contact Bar
  const contactParts = [
    sanitizeDocxText(candidate.email || ''),
    sanitizeDocxText(candidate.phone || ''),
    sanitizeDocxText(candidate.location || ''),
    candidate.linkedin ? sanitizeDocxText(candidate.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/')) : '',
    candidate.github ? sanitizeDocxText(candidate.github.replace(/^https?:\/\/(www\.)?github\.com\//i, 'github.com/')) : '',
    candidate.portfolio ? sanitizeDocxText(candidate.portfolio.replace(/^https?:\/\/(www\.)?/i, '')) : ''
  ].filter(Boolean);

  if (contactParts.length > 0) {
    const contactRuns = [];
    contactParts.forEach((part, idx) => {
      contactRuns.push(
        new TextRun({
          text: part,
          size: 18, // 9 pt
          color: '334155',
          font
        })
      );
      if (idx < contactParts.length - 1) {
        contactRuns.push(
          new TextRun({
            text: '  •  ',
            size: 18,
            color: '94A3B8',
            font
          })
        );
      }
    });

    children.push(
      new Paragraph({
        alignment: headerAlignment,
        spacing: { before: 0, after: 180 },
        children: contactRuns
      })
    );
  }

  // ─── HELPER: SECTION HEADER ────────────────────────────────────────────────
  const addSectionHeader = (title) => {
    children.push(
      new Paragraph({
        spacing: { before: 200, after: 80 },
        border: {
          bottom: {
            color: accentHex,
            space: 4,
            style: BorderStyle.SINGLE,
            size: 6 // 0.75 pt rule
          }
        },
        children: [
          new TextRun({
            text: title.toUpperCase(),
            bold: true,
            size: 21, // 10.5 pt
            color: accentHex,
            font
          })
        ]
      })
    );
  };

  // ─── 2. PROFESSIONAL SUMMARY ───────────────────────────────────────────────
  const summaryText = sanitizeDocxText(tailoredData.summary || candidate.summary || '');
  if (summaryText && options.includeSummary !== false) {
    addSectionHeader('Professional Summary');
    children.push(
      new Paragraph({
        spacing: { before: 40, after: 120, line: 260 },
        children: [
          new TextRun({
            text: summaryText,
            size: 19, // 9.5 pt
            color: '1E293B',
            font
          })
        ]
      })
    );
  }

  // ─── 3. TECHNICAL SKILLS ──────────────────────────────────────────────────
  const skillsList = Array.isArray(tailoredData.skills) ? tailoredData.skills : (candidate.skills || []);
  const matchedSkills = Array.isArray(tailoredData.matched_skills) ? tailoredData.matched_skills : [];
  const otherSkills = Array.isArray(tailoredData.other_skills) ? tailoredData.other_skills : [];

  if (skillsList.length > 0 || matchedSkills.length > 0) {
    addSectionHeader('Technical Skills');

    if (matchedSkills.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 40, line: 240 },
          children: [
            new TextRun({
              text: 'Core / Matched Competencies: ',
              bold: true,
              size: 19,
              color: '0F172A',
              font
            }),
            new TextRun({
              text: matchedSkills.map(sanitizeDocxText).join(', '),
              size: 19,
              color: '334155',
              font
            })
          ]
        })
      );
    }

    if (otherSkills.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 80, line: 240 },
          children: [
            new TextRun({
              text: 'Technical Proficiencies: ',
              bold: true,
              size: 19,
              color: '0F172A',
              font
            }),
            new TextRun({
              text: otherSkills.slice(0, 25).map(sanitizeDocxText).join(', '),
              size: 19,
              color: '334155',
              font
            })
          ]
        })
      );
    } else if (matchedSkills.length === 0 && skillsList.length > 0) {
      children.push(
        new Paragraph({
          spacing: { before: 30, after: 80, line: 240 },
          children: [
            new TextRun({
              text: 'Key Competencies: ',
              bold: true,
              size: 19,
              color: '0F172A',
              font
            }),
            new TextRun({
              text: skillsList.map(s => (typeof s === 'string' ? s : s.name || '')).filter(Boolean).map(sanitizeDocxText).join(', '),
              size: 19,
              color: '334155',
              font
            })
          ]
        })
      );
    }
  }

  // ─── 4. PROFESSIONAL EXPERIENCE ───────────────────────────────────────────
  const workHistory = Array.isArray(tailoredData.work_history) ? tailoredData.work_history : (candidate.experience || []);
  if (workHistory.length > 0) {
    addSectionHeader('Professional Experience');

    for (const job of workHistory) {
      const role = sanitizeDocxText(job.role || job.title || 'Software Engineer');
      const company = sanitizeDocxText(job.company || 'Company');
      const location = job.location ? sanitizeDocxText(job.location) : '';
      const dates = sanitizeDocxText(
        [job.start_date, job.end_date].filter(Boolean).join(' - ') || job.dates || '2022 - Present'
      );

      // Line 1: Role (Bold) + Tab Right to Dates
      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 100, after: 20 },
          children: [
            new TextRun({
              text: role,
              bold: true,
              size: 20, // 10 pt
              color: '0F172A',
              font
            }),
            new TextRun({
              children: ['\t', dates],
              size: 18, // 9 pt
              color: '64748B',
              font
            })
          ]
        })
      );

      // Line 2: Company + Location
      const companySubline = company + (location ? ` | ${location}` : '');
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 50 },
          children: [
            new TextRun({
              text: companySubline,
              italics: true,
              size: 18, // 9 pt
              color: '475569',
              font
            })
          ]
        })
      );

      // Bullets
      const bullets = Array.isArray(job.bullets) ? job.bullets : [];
      for (const bullet of bullets) {
        const cleanBullet = sanitizeDocxText(bullet);
        if (!cleanBullet) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30, line: 240 },
            children: [
              new TextRun({
                text: cleanBullet,
                size: 18.5, // 9.25 pt
                color: '1E293B',
                font
              })
            ]
          })
        );
      }
    }
  }

  // ─── 5. KEY TECHNICAL PROJECTS ────────────────────────────────────────────
  const projects = Array.isArray(tailoredData.projects) ? tailoredData.projects : (candidate.projects || []);
  if (options.includeProjects !== false && projects.length > 0) {
    addSectionHeader('Key Technical Projects');

    for (const proj of projects.slice(0, 4)) {
      const projName = sanitizeDocxText(proj.name || 'Project');
      const rawTech = proj.tech_stack || proj.tech || '';
      const techStack = rawTech ? ` (${sanitizeDocxText(rawTech)})` : '';
      const projLinks = [proj.url, proj.github_url, proj.live_url].filter(Boolean)
        .map(u => u.replace(/^https?:\/\/(www\.)?/i, ''))
        .join('  ');

      const projectRuns = [
        new TextRun({
          text: projName,
          bold: true,
          size: 19.5,
          color: '0F172A',
          font
        })
      ];

      if (techStack) {
        projectRuns.push(
          new TextRun({
            text: techStack,
            size: 18,
            color: '64748B',
            font
          })
        );
      }

      if (projLinks) {
        projectRuns.push(
          new TextRun({
            children: ['\t', projLinks],
            size: 17,
            color: '475569',
            font
          })
        );
      }

      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 90, after: 40 },
          children: projectRuns
        })
      );

      const projBullets = Array.isArray(proj.bullets) && proj.bullets.length > 0
        ? proj.bullets
        : (proj.description || proj.tagline ? [proj.description || proj.tagline] : []);

      for (const bullet of projBullets) {
        const cleanBullet = sanitizeDocxText(bullet);
        if (!cleanBullet) continue;
        children.push(
          new Paragraph({
            bullet: { level: 0 },
            spacing: { before: 20, after: 30, line: 240 },
            children: [
              new TextRun({
                text: cleanBullet,
                size: 18.5,
                color: '1E293B',
                font
              })
            ]
          })
        );
      }
    }
  }

  // ─── 6. EDUCATION ─────────────────────────────────────────────────────────
  const educationList = Array.isArray(tailoredData.education) ? tailoredData.education : (candidate.education || []);
  if (educationList.length > 0) {
    addSectionHeader('Education');

    for (const edu of educationList) {
      const degree = sanitizeDocxText(
        [edu.degree, edu.field].filter(Boolean).join(' in ') || edu.degree || 'Degree'
      );
      const institution = sanitizeDocxText(edu.institution || edu.school || 'University');
      const location = edu.location ? sanitizeDocxText(edu.location) : '';
      const year = sanitizeDocxText(edu.graduation_year || edu.year || edu.dates || '');
      const details = [edu.gpa ? `GPA: ${edu.gpa}` : '', edu.honors].filter(Boolean).join(' | ');

      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          spacing: { before: 90, after: 20 },
          children: [
            new TextRun({
              text: degree,
              bold: true,
              size: 20,
              color: '0F172A',
              font
            }),
            new TextRun({
              children: ['\t', year],
              size: 18,
              color: '64748B',
              font
            })
          ]
        })
      );

      const instSubline = institution + (location ? ` | ${location}` : '') + (details ? `  (${details})` : '');
      children.push(
        new Paragraph({
          spacing: { before: 0, after: 50 },
          children: [
            new TextRun({
              text: instSubline,
              italics: true,
              size: 18,
              color: '475569',
              font
            })
          ]
        })
      );
    }
  }

  // ─── 7. CERTIFICATIONS ────────────────────────────────────────────────────
  const certs = Array.isArray(tailoredData.certifications) ? tailoredData.certifications : (candidate.certifications || []);
  if (certs.length > 0) {
    addSectionHeader('Certifications & Credentials');

    for (const cert of certs) {
      const certName = typeof cert === 'string' ? cert : cert.name || '';
      const issuer = typeof cert === 'object' && cert.issuer ? ` — ${cert.issuer}` : '';
      const date = typeof cert === 'object' && cert.date ? cert.date : '';

      children.push(
        new Paragraph({
          tabStops: [{ type: TabStopType.RIGHT, position: TabStopPosition.MAX }],
          bullet: { level: 0 },
          spacing: { before: 20, after: 30 },
          children: [
            new TextRun({
              text: sanitizeDocxText(certName) + (issuer ? sanitizeDocxText(issuer) : ''),
              size: 18.5,
              color: '1E293B',
              font
            }),
            ...(date ? [new TextRun({ children: ['\t', sanitizeDocxText(date)], size: 17, color: '64748B', font })] : [])
          ]
        })
      );
    }
  }

  // Build Document with standard 0.55" margins (792 twips)
  return new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 792,    // 0.55 in
              right: 792,
              bottom: 792,
              left: 792
            }
          }
        },
        children
      }
    ]
  });
}

/**
 * Generates an OpenXML Blob for the given tailored resume.
 *
 * @param {Object} tailoredData
 * @param {Object} [options={}]
 * @returns {Promise<Blob>}
 */
export async function generateAtsResumeDocxBlob(tailoredData, options = {}) {
  const doc = compileAtsResumeDocx(tailoredData, options);
  if (typeof Packer.toBlob === 'function') {
    return await Packer.toBlob(doc);
  }
  const buffer = await Packer.toBuffer(doc);
  return new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });
}

/**
 * Compiles and triggers an in-browser download of the tailored resume as a .docx file.
 *
 * @param {Object} tailoredData
 * @param {string} [filename]
 * @param {Object} [options={}]
 * @returns {Promise<{ success: boolean, filename: string, blob: Blob }>}
 */
export async function downloadAtsResumeDocx(tailoredData, filename, options = {}) {
  try {
    const candidate = tailoredData?.candidate || tailoredData?.profile || {};
    const safeName = (candidate.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
    const company = tailoredData?.target_job?.company || options?.company || 'General';
    const safeCompany = company.replace(/[^a-zA-Z0-9]/g, '_');

    let finalFilename = filename;
    if (!finalFilename) {
      finalFilename = `${safeName}_${safeCompany}_ATS_Resume.docx`;
    } else {
      finalFilename = finalFilename.replace(/\.pdf$/i, '');
      if (!finalFilename.toLowerCase().endsWith('.docx')) {
        finalFilename += '.docx';
      }
    }

    const blob = await generateAtsResumeDocxBlob(tailoredData, options);

    if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = finalFilename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    return { success: true, filename: finalFilename, blob };
  } catch (err) {
    console.error('Failed to download ATS Word (.docx) resume:', err);
    throw err;
  }
}
