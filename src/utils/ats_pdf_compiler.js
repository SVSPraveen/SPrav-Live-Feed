/**
 * ats_pdf_compiler.js
 * ===================
 * Pure JavaScript Zero-Dependency ATS-Compliant PDF Resume Compiler.
 * Generates valid ISO 32000-1 / PDF 1.4 documents entirely in-browser.
 *
 * Three visual variants driven by the `options.pdfVariant` parameter:
 *   ivy    — Centered header, thin horizontal rule section dividers (classic)
 *   modern — Left-aligned header, thick accent bar section dividers
 *   dense  — Left-aligned header, double-rule dividers, tighter leading
 *
 * ATS compliance is preserved across all variants:
 *   - Single-column linear text stream (no tables, multi-column grids)
 *   - Standard Type 1 Helvetica + Helvetica-Bold (always selectable)
 *   - WinAnsiEncoding for reliable character extraction
 *   - 0.55" margins (40 pt) on all sides
 */

// ---------------------------------------------------------------------------
// CHARACTER METRICS (Helvetica normalized to 1000 units)
// ---------------------------------------------------------------------------
const HELVETICA_WIDTHS = {
  ' ': 278, '!': 278, '"': 355, '#': 556, '$': 556, '%': 889, '&': 667, "'": 191,
  '(': 333, ')': 333, '*': 389, '+': 584, ',': 278, '-': 333, '.': 278, '/': 278,
  '0': 556, '1': 556, '2': 556, '3': 556, '4': 556, '5': 556, '6': 556, '7': 556,
  '8': 556, '9': 556, ':': 278, ';': 278, '<': 584, '=': 584, '>': 584, '?': 556,
  '@': 1015, 'A': 667, 'B': 667, 'C': 722, 'D': 722, 'E': 667, 'F': 611, 'G': 778,
  'H': 722, 'I': 278, 'J': 500, 'K': 667, 'L': 556, 'M': 833, 'N': 722, 'O': 778,
  'P': 667, 'Q': 778, 'R': 722, 'S': 667, 'T': 611, 'U': 722, 'V': 667, 'W': 944,
  'X': 667, 'Y': 667, 'Z': 611, '[': 333, '\\': 278, ']': 333, '^': 469, '_': 556,
  '`': 333, 'a': 556, 'b': 556, 'c': 500, 'd': 556, 'e': 556, 'f': 278, 'g': 556,
  'h': 556, 'i': 222, 'j': 222, 'k': 500, 'l': 222, 'm': 833, 'n': 556, 'o': 556,
  'p': 556, 'q': 556, 'r': 333, 's': 500, 't': 278, 'u': 556, 'v': 500, 'w': 722,
  'x': 500, 'y': 500, 'z': 500, '{': 334, '|': 260, '}': 334, '~': 584,
  '•': 400,
};

export function getCharWidth(char) {
  return HELVETICA_WIDTHS[char] || 550;
}

export function getTextWidth(text, fontSize) {
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    units += getCharWidth(text[i]);
  }
  return (units / 1000) * fontSize;
}

// ---------------------------------------------------------------------------
// SANITIZE & ESCAPE FOR PDF STREAMS
// ---------------------------------------------------------------------------
export function sanitizePdfText(str) {
  if (!str) return '';
  return String(str)
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, '-')
    .replace(/\u2026/g, '...')
    .replace(/[^\x20-\x7E\u00A0-\u00FF\u2022]/g, ' ')
    .trim();
}

export function escapePdfLiteral(str) {
  if (!str) return '';
  return String(str).replace(/[\\()\u0080-\uFFFF]/g, (ch) => {
    if (ch === '\\') return '\\\\';
    if (ch === '(') return '\\(';
    if (ch === ')') return '\\)';
    if (ch === '\u2022') return '\\225';
    if (ch === '\u2013') return '\\226';
    if (ch === '\u2014') return '\\227';
    if (ch === '\u2018') return '\\221';
    if (ch === '\u2019') return '\\222';
    if (ch === '\u201C') return '\\223';
    if (ch === '\u201D') return '\\224';
    if (ch === '\u2026') return '...';
    const code = ch.charCodeAt(0);
    if (code >= 160 && code <= 255) {
      return '\\' + code.toString(8).padStart(3, '0');
    }
    return ' ';
  });
}

// ---------------------------------------------------------------------------
// TEXT WRAPPING
// ---------------------------------------------------------------------------
export function wrapTextToLines(text, maxWidth, fontSize) {
  const sanitized = sanitizePdfText(text);
  if (!sanitized) return [];
  const words = sanitized.split(/\s+/);
  const lines = [];
  let currentLine = '';
  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    if (getTextWidth(testLine, fontSize) <= maxWidth) {
      currentLine = testLine;
    } else {
      if (currentLine) lines.push(currentLine);
      currentLine = word;
    }
  }
  if (currentLine) lines.push(currentLine);
  return lines;
}

// ---------------------------------------------------------------------------
// PDF DOCUMENT BUILDER
// ---------------------------------------------------------------------------
export class SimplePdfDoc {
  constructor(margin = 40) {
    this.pageWidth = 612;
    this.pageHeight = 792;
    this.marginLeft = margin;
    this.marginRight = margin;
    this.marginTop = margin;
    this.marginBottom = margin;
    this.printableWidth = this.pageWidth - this.marginLeft - this.marginRight;
    this.pages = [];
    this.currentPageOps = [];
    this.currentY = this.pageHeight - this.marginTop;
  }

  startNewPage() {
    if (this.currentPageOps.length > 0) {
      this.pages.push(this.currentPageOps.join('\n'));
    }
    this.currentPageOps = [];
    this.currentY = this.pageHeight - this.marginTop;
  }

  ensureSpace(neededHeight) {
    if (this.currentY - neededHeight < this.marginBottom) {
      this.startNewPage();
    }
  }

  drawRect(x, y, w, h, r, g, b) {
    this.currentPageOps.push(
      `${r.toFixed(2)} ${g.toFixed(2)} ${b.toFixed(2)} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`,
      'f'
    );
  }

  drawLine(x1, y1, x2, y2, lineWidth, r, g, b) {
    this.currentPageOps.push(
      `${r} ${g} ${b} RG`,
      `${lineWidth} w`,
      `${x1.toFixed(2)} ${y1.toFixed(2)} m`,
      `${x2.toFixed(2)} ${y2.toFixed(2)} l`,
      'S'
    );
  }

  drawHorizontalRule(y, color = '0.8 0.8 0.8', lineWidth = 0.5) {
    let strokeColor = color;
    let width = lineWidth;
    if (typeof color === 'number' && typeof lineWidth === 'string') {
      strokeColor = lineWidth;
      width = color;
    } else if (typeof color === 'number' && arguments.length >= 5) {
      strokeColor = `${arguments[2]} ${arguments[3]} ${arguments[4]}`;
      width = arguments[1];
    }
    this.currentPageOps.push(
      `${strokeColor} RG`,
      `${width} w`,
      `${this.marginLeft} ${y.toFixed(2)} m`,
      `${this.pageWidth - this.marginRight} ${y.toFixed(2)} l`,
      'S'
    );
  }

  addSectionHeader(title, options = {}) {
    this.ensureSpace(34);
    this.currentY -= 10;
    const headerText = title.toUpperCase();
    const hSize = options.hSize || 9.5;
    this.addText(headerText, this.marginLeft, this.currentY, '/F2', hSize);
    this.currentY -= 3;
    this.drawHorizontalRule(this.currentY, options.ruleColor || '0.75 0.75 0.75', options.ruleWidth || 0.75);
    this.currentY -= 8;
  }

  addText(text, x, y, font = '/F1', size = 10, r = 0, g = 0, b = 0) {
    const safeText = escapePdfLiteral(sanitizePdfText(text));
    if (!safeText) return;
    let colorStr = '0 0 0';
    if (typeof r === 'string') {
      colorStr = r;
    } else {
      const fc = val => Number(Number(val).toFixed(3));
      colorStr = `${fc(r)} ${fc(g)} ${fc(b)}`;
    }
    this.currentPageOps.push(
      'BT',
      `${font} ${size} Tf`,
      `${colorStr} rg`,
      `${x.toFixed(2)} ${y.toFixed(2)} Td`,
      `(${safeText}) Tj`,
      'ET'
    );
  }

  build() {
    if (this.currentPageOps.length > 0 || this.pages.length === 0) {
      this.pages.push(this.currentPageOps.join('\n'));
    }
    const numPages = this.pages.length;
    const objects = [];
    const font1Id = numPages + 3;
    const font2Id = numPages + 4;
    const contentStartId = numPages + 5;

    objects.push('<< /Type /Catalog /Pages 2 0 R >>');
    const kids = [];
    for (let i = 0; i < numPages; i++) kids.push(`${i + 3} 0 R`);
    objects.push(`<< /Type /Pages /Kids [${kids.join(' ')}] /Count ${numPages} >>`);
    for (let i = 0; i < numPages; i++) {
      const contentId = contentStartId + i;
      objects.push(
        `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Resources << /Font << /F1 ${font1Id} 0 R /F2 ${font2Id} 0 R >> >> /Contents ${contentId} 0 R >>`
      );
    }
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>');
    objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>');
    for (let i = 0; i < numPages; i++) {
      const streamData = this.pages[i];
      const byteLen = new TextEncoder().encode(streamData).length;
      objects.push(`<< /Length ${byteLen} >>\nstream\n${streamData}\nendstream`);
    }

    let body = '%PDF-1.4\n%\xE2\xE3\xCF\xD3\n';
    const offsets = [];
    for (let i = 0; i < objects.length; i++) {
      offsets.push(new TextEncoder().encode(body).length);
      body += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
    }
    const xrefOffset = new TextEncoder().encode(body).length;
    body += `xref\n0 ${objects.length + 1}\n`;
    body += '0000000000 65535 f \n';
    for (let i = 0; i < offsets.length; i++) {
      body += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
    }
    body += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
    body += `startxref\n${xrefOffset}\n%%EOF\n`;
    return new TextEncoder().encode(body);
  }
}

// ---------------------------------------------------------------------------
// MAIN RESUME PDF GENERATOR
// ---------------------------------------------------------------------------
/**
 * @param {object} tailoredData - output of tailorResumeForJob()
 * @param {object} options
 *   options.accentColorRgb  - [r, g, b] 0-1 floats for accent color
 *   options.pdfVariant      - 'ivy' | 'modern' | 'dense'
 *   options.includeSummary  - boolean
 */
export function generateAtsResumePdf(tailoredData, options = {}) {
  // Resolve variant & colors
  const variant = options.pdfVariant || 'ivy';
  const isJakes = variant === 'jakes' || variant === 'harvard';
  const doc = new SimplePdfDoc(isJakes ? 36 : (options.margin || 40));
  const c = tailoredData.candidate || {};
  const pw = doc.printableWidth;
  const ml = doc.marginLeft;
  const mr = doc.marginRight;
  const pageW = doc.pageWidth;
  const accent = Array.isArray(options.accentColorRgb)
    ? options.accentColorRgb
    : [0.06, 0.09, 0.16];
  const [ar, ag, ab] = accent;
  // Lighter muted version for sub-text
  const mr2 = Math.min(1, ar + 0.3);
  const mg2 = Math.min(1, ag + 0.3);
  const mb2 = Math.min(1, ab + 0.3);
  // Very light for rule lines
  const lr = Math.min(1, ar + 0.65);
  const lg = Math.min(1, ag + 0.65);
  const lb = Math.min(1, ab + 0.65);

  // Leading based on variant
  const baseLeading = variant === 'dense' ? 10.2 : variant === 'executive' ? 12.0 : variant === 'latex' ? 11.0 : variant === 'modern' ? 11.2 : 11.5;
  const bulletLeading = variant === 'dense' ? 9.8 : variant === 'executive' ? 11.5 : variant === 'latex' ? 10.5 : 11.0;
  const baseSize = variant === 'dense' ? 8.8 : variant === 'executive' ? 9.2 : 9;
  const subSize = variant === 'dense' ? 8.4 : variant === 'executive' ? 8.8 : variant === 'latex' ? 8.5 : 8.8;

  // ─── 1. HEADER ─────────────────────────────────────────────────────────────
  const isCenter = variant === 'ivy' || variant === 'latex' || isJakes;
  const name = sanitizePdfText((c.name || 'Candidate Name').toUpperCase());
  const nameSize = variant === 'dense' ? 16 : variant === 'executive' ? 19 : variant === 'latex' ? 17 : 18;

  if (isCenter) {
    const nameWidth = getTextWidth(name, nameSize);
    const nameX = Math.max(ml, (pageW - nameWidth) / 2);
    doc.addText(name, nameX, doc.currentY, '/F2', nameSize, ar, ag, ab);
  } else {
    doc.addText(name, ml, doc.currentY, '/F2', nameSize, ar, ag, ab);
  }
  doc.currentY -= (variant === 'executive' ? 16 : 14);

  // Subtitle / title line (e.g. "AI/ML ENGINEER • AGENTIC SYSTEMS & RAG")
  if (c.title) {
    const subtitleText = sanitizePdfText(c.title.toUpperCase());
    const subtitleSize = variant === 'dense' ? 9 : variant === 'executive' ? 9.8 : 9.5;
    if (isCenter) {
      const sw = getTextWidth(subtitleText, subtitleSize);
      const sx = Math.max(ml, (pageW - sw) / 2);
      doc.addText(subtitleText, sx, doc.currentY, '/F1', subtitleSize, mr2, mg2, mb2);
    } else {
      doc.addText(subtitleText, ml, doc.currentY, '/F1', subtitleSize, mr2, mg2, mb2);
    }
    doc.currentY -= (variant === 'executive' ? 14 : 13);
  }

  // Contact line
  const contacts = [
    c.location,
    c.phone,
    c.email,
    c.linkedin ? c.linkedin.replace(/^https?:\/\/(www\.)?linkedin\.com\/in\//i, 'linkedin.com/in/') : '',
    c.github ? c.github.replace(/^https?:\/\/(www\.)?github\.com\//i, 'github.com/') : '',
    c.portfolio ? c.portfolio.replace(/^https?:\/\//i, '') : '',
    c.website && c.website !== c.portfolio
      ? c.website.replace(/^https?:\/\//i, '')
      : '',
  ].filter(Boolean);

  const contactLine = contacts.join('  |  ');
  const contactSize = variant === 'dense' ? 7.8 : variant === 'executive' ? 8.5 : 8.5;

  if (isCenter) {
    const cw = getTextWidth(contactLine, contactSize);
    const cx = Math.max(ml, (pageW - cw) / 2);
    doc.addText(contactLine, cx, doc.currentY, '/F1', contactSize, 0.3, 0.35, 0.42);
  } else {
    doc.addText(contactLine, ml, doc.currentY, '/F1', contactSize, 0.3, 0.35, 0.42);
  }
  doc.currentY -= 8;

  // Header rule under contact
  if (variant === 'modern') {
    // Thick colored bar
    doc.drawRect(ml, doc.currentY - 2, pw, 2.5, ar, ag, ab);
    doc.currentY -= 10;
  } else if (variant === 'dense') {
    // Thin rule
    doc.drawLine(ml, doc.currentY, pageW - mr, doc.currentY, 0.6, lr, lg, lb);
    doc.currentY -= 8;
  } else if (variant === 'latex') {
    // Academic formal rule
    doc.drawLine(ml, doc.currentY, pageW - mr, doc.currentY, 0.75, 0.25, 0.25, 0.25);
    doc.currentY -= 8;
  } else if (variant === 'creative') {
    // Accent band
    doc.drawRect(ml, doc.currentY - 2, pw, 2.0, ar, ag, ab);
    doc.currentY -= 10;
  } else if (variant === 'executive') {
    // Understated subtle hairline
    doc.drawLine(ml, doc.currentY, pageW - mr, doc.currentY, 0.4, 0.7, 0.7, 0.7);
    doc.currentY -= 10;
  }

  // ─── SECTION HEADER HELPER ─────────────────────────────────────────────────
  const addSectionHeader = (title) => {
    doc.ensureSpace(32);
    doc.currentY -= (variant === 'executive' ? 14 : 12);
    const headerText = title.toUpperCase();
    const hSize = variant === 'dense' ? 9 : variant === 'executive' ? 10.5 : 11;

    if (variant === 'modern') {
      // Thick colored left accent bar (3pt wide, full text height)
      doc.drawRect(ml, doc.currentY - 2, 3, hSize + 4, ar, ag, ab);
      doc.addText(headerText, ml + 8, doc.currentY, '/F2', hSize, ar, ag, ab);
      doc.currentY -= 8;
    } else if (variant === 'latex') {
      // Academic LaTeX style: sharp dark header with full width rule below
      doc.addText(headerText, ml, doc.currentY, '/F2', hSize, 0.1, 0.1, 0.1);
      doc.currentY -= 3;
      doc.drawHorizontalRule(doc.currentY, '0.3 0.3 0.3', 0.5);
      doc.currentY -= 7;
    } else if (variant === 'executive') {
      // Executive Minimalist: subtle primary color with short accent underline
      doc.addText(headerText, ml, doc.currentY, '/F2', hSize, ar, ag, ab);
      doc.currentY -= 3;
      doc.drawLine(ml, doc.currentY, ml + 45, doc.currentY, 1.5, ar, ag, ab);
      doc.currentY -= 7;
    } else if (variant === 'creative') {
      // Creative: accent tab left block
      doc.drawRect(ml, doc.currentY - 2, 4, hSize + 3, ar, ag, ab);
      doc.addText(headerText, ml + 9, doc.currentY, '/F2', hSize, ar, ag, ab);
      doc.currentY -= 8;
    } else if (isJakes) {
      // Jake's Resume / Harvard Standard: uppercase 11pt Bold with solid 0.5pt horizontal rule running edge-to-edge
      doc.addText(headerText, ml, doc.currentY, '/F2', 11, 0, 0, 0);
      doc.currentY -= 3;
      doc.drawHorizontalRule(doc.currentY, '0.2 0.2 0.2', 0.5);
      doc.currentY -= 8;
    } else if (variant === 'ivy') {
      doc.addText(headerText, ml, doc.currentY, '/F2', hSize, 0.12, 0.18, 0.28);
      doc.currentY -= 4;
      doc.drawHorizontalRule(doc.currentY, '0.75 0.8 0.85', 0.5);
      doc.currentY -= 8;
    } else {
      // dense: double rule effect (two close thin lines)
      doc.addText(headerText, ml, doc.currentY, '/F2', hSize, ar, ag, ab);
      doc.currentY -= 3;
      doc.drawLine(ml, doc.currentY, pageW - mr, doc.currentY, 1.0, lr, lg, lb);
      doc.drawLine(ml, doc.currentY - 2, pageW - mr, doc.currentY - 2, 0.4, lr, lg, lb);
      doc.currentY -= 8;
    }
  };

  // ─── 2. PROFESSIONAL SUMMARY ───────────────────────────────────────────────
  if (tailoredData.summary && options.includeSummary !== false) {
    addSectionHeader('Professional Summary');
    const summaryLines = wrapTextToLines(tailoredData.summary, pw, baseSize);
    for (const line of summaryLines) {
      doc.ensureSpace(12);
      doc.addText(line, ml, doc.currentY, '/F1', baseSize, 0.18, 0.22, 0.28);
      doc.currentY -= baseLeading;
    }
  }

  // ─── 3. TECHNICAL SKILLS ──────────────────────────────────────────────────
  if (Array.isArray(tailoredData.skills) && tailoredData.skills.length > 0) {
    addSectionHeader('Technical Skills');
    const matched = tailoredData.matched_skills || [];
    const others = tailoredData.other_skills || [];

    const skillRows = [];
    if (matched.length > 0) {
      skillRows.push({ label: 'Core / Matched Competencies: ', value: matched.join(', ') });
    }
    if (others.length > 0) {
      skillRows.push({ label: 'Technical Proficiencies: ', value: others.slice(0, 20).join(', ') });
    }
    if (skillRows.length === 0) {
      skillRows.push({ label: 'Skills: ', value: tailoredData.skills.join(', ') });
    }

    for (const row of skillRows) {
      const labelWidth = getTextWidth(row.label, baseSize);
      const allLines = wrapTextToLines(row.label + row.value, pw, baseSize);
      for (let i = 0; i < allLines.length; i++) {
        doc.ensureSpace(12);
        if (i === 0) {
          doc.addText(row.label, ml, doc.currentY, '/F2', baseSize, 0.12, 0.16, 0.23);
          const valueText = allLines[i].startsWith(row.label)
            ? allLines[i].slice(row.label.length)
            : allLines[i];
          if (valueText) {
            doc.addText(valueText, ml + labelWidth, doc.currentY, '/F1', baseSize, 0.2, 0.25, 0.32);
          }
        } else {
          doc.addText(allLines[i], ml, doc.currentY, '/F1', baseSize, 0.2, 0.25, 0.32);
        }
        doc.currentY -= baseLeading;
      }
    }
  }

  // ─── 4. PROFESSIONAL EXPERIENCE ───────────────────────────────────────────
  if (Array.isArray(tailoredData.work_history) && tailoredData.work_history.length > 0) {
    addSectionHeader('Professional Experience');
    for (const job of tailoredData.work_history) {
      doc.ensureSpace(28);
      const role = sanitizePdfText(job.role || 'Software Engineer');
      const company = sanitizePdfText(job.company || 'Company');
      const location = job.location ? sanitizePdfText(job.location) : '';
      const dates = sanitizePdfText(
        [job.start_date, job.end_date].filter(Boolean).join(' - ') || job.dates || '2022 - Present'
      );

      // Role (bold) + Dates (right-aligned)
      doc.addText(role, ml, doc.currentY, '/F2', 10, 0.08, 0.12, 0.2);
      const datesW = getTextWidth(dates, 9);
      doc.addText(dates, pageW - mr - datesW, doc.currentY, '/F1', 9, 0.35, 0.4, 0.48);
      doc.currentY -= 11;

      // Company + location sub-line
      if (isJakes) {
        doc.addText(company, ml, doc.currentY, '/F1', 9, 0.25, 0.3, 0.38);
        if (location) {
          const locW = getTextWidth(location, 9);
          doc.addText(location, pageW - mr - locW, doc.currentY, '/F1', 9, 0.35, 0.4, 0.48);
        }
      } else {
        const companyLine = company + (location ? ` | ${location}` : '');
        doc.addText(companyLine, ml, doc.currentY, '/F1', 9, 0.25, 0.3, 0.38);
      }
      doc.currentY -= 11;

      // Bullets
      const bullets = Array.isArray(job.bullets) ? job.bullets : [];
      for (const bullet of bullets) {
        const bulletLines = wrapTextToLines(bullet, pw - 14, 8.8);
        for (let i = 0; i < bulletLines.length; i++) {
          doc.ensureSpace(11);
          if (i === 0) {
            doc.addText('•', ml + 2, doc.currentY, '/F1', 9, 0.3, 0.35, 0.45);
            doc.addText(bulletLines[i], ml + 12, doc.currentY, '/F1', 8.8, 0.18, 0.22, 0.28);
          } else {
            doc.addText(bulletLines[i], ml + 12, doc.currentY, '/F1', 8.8, 0.18, 0.22, 0.28);
          }
          doc.currentY -= 10.5;
        }
      }
      doc.currentY -= 4;
    }
  }

  // ─── 5. KEY TECHNICAL PROJECTS ────────────────────────────────────────────
  if (options.includeProjects !== false && Array.isArray(tailoredData.projects) && tailoredData.projects.length > 0) {
    addSectionHeader('Key Technical Projects');
    for (const proj of tailoredData.projects.slice(0, 3)) {
      doc.ensureSpace(24);
      const projName = sanitizePdfText(proj.name || 'Project');
      const rawTech = proj.tech_stack || proj.tech || '';
      const techStack = rawTech ? sanitizePdfText(`(${rawTech})`) : '';
      const projLinks = [proj.url, proj.github_url, proj.live_url].filter(Boolean)
        .map(u => u.replace(/^https?:\/\/(www\.)?/i, ''))
        .join('  ');

      doc.addText(projName, ml, doc.currentY, '/F2', 9.5, 0.08, 0.12, 0.2);
      if (techStack) {
        const nameW = getTextWidth(projName, 9.5);
        doc.addText(techStack, ml + nameW, doc.currentY, '/F1', 8.5, 0.35, 0.4, 0.48);
      }
      if (projLinks) {
        const linksW = getTextWidth(projLinks, subSize - 0.5);
        doc.addText(projLinks, pageW - mr - linksW, doc.currentY, '/F1', subSize - 0.5, 0.38, 0.44, 0.52);
      }
      doc.currentY -= 11;

      const bullets = Array.isArray(proj.bullets) && proj.bullets.length > 0
        ? proj.bullets
        : (proj.description || proj.tagline ? [proj.description || proj.tagline] : []);
      for (const bullet of bullets) {
        const bulletLines = wrapTextToLines(bullet, pw - 14, 8.8);
        for (let i = 0; i < bulletLines.length; i++) {
          doc.ensureSpace(11);
          if (i === 0) {
            doc.addText('•', ml + 2, doc.currentY, '/F1', 9, 0.3, 0.35, 0.45);
            doc.addText(bulletLines[i], ml + 12, doc.currentY, '/F1', 8.8, 0.18, 0.22, 0.28);
          } else {
            doc.addText(bulletLines[i], ml + 12, doc.currentY, '/F1', 8.8, 0.18, 0.22, 0.28);
          }
          doc.currentY -= 10.5;
        }
      }
      doc.currentY -= 3;
    }
  }

  // ─── 6. EDUCATION ─────────────────────────────────────────────────────────
  if (Array.isArray(tailoredData.education) && tailoredData.education.length > 0) {
    addSectionHeader('Education');
    for (const edu of tailoredData.education) {
      doc.ensureSpace(20);
      const degreeStr = sanitizePdfText(
        [edu.degree, edu.field_of_study].filter(Boolean).join(' in ') || 'Degree'
      );
      const rawYear = edu.graduation_year || edu.year;
      const year = rawYear ? sanitizePdfText(String(rawYear)) : '';
      const school = sanitizePdfText(edu.institution || edu.school || 'University');

      doc.addText(degreeStr, ml, doc.currentY, '/F2', 9.5, 0.08, 0.12, 0.2);
      if (year) {
        const yw = getTextWidth(year, 9);
        doc.addText(year, pageW - mr - yw, doc.currentY, '/F1', 9, 0.35, 0.4, 0.48);
      }
      doc.currentY -= 10.5;

      if (isJakes) {
        doc.addText(school, ml, doc.currentY, '/F1', 8.8, 0.25, 0.3, 0.38);
        const eduRight = [edu.location, edu.gpa ? `GPA: ${edu.gpa}` : null].filter(Boolean).join(' | ');
        if (eduRight) {
          const ew = getTextWidth(eduRight, 8.8);
          doc.addText(eduRight, pageW - mr - ew, doc.currentY, '/F1', 8.8, 0.35, 0.4, 0.48);
        }
      } else {
        const schoolLine = school + (edu.gpa ? ` | GPA: ${edu.gpa}` : '');
        doc.addText(schoolLine, ml, doc.currentY, '/F1', 8.8, 0.25, 0.3, 0.38);
      }
      doc.currentY -= 12;
    }
  }

  // ─── 7. CERTIFICATIONS ────────────────────────────────────────────────────
  if (Array.isArray(tailoredData.certifications) && tailoredData.certifications.length > 0) {
    addSectionHeader('Certifications & Credentials');
    const certNames = tailoredData.certifications
      .map(c => (typeof c === 'object' && c !== null ? c.name : c))
      .filter(Boolean);

    if (variant === 'dense' || variant === 'modern') {
      for (const certName of certNames) {
        const certLines = wrapTextToLines(certName, pw - 14, baseSize - 0.2);
        for (let i = 0; i < certLines.length; i++) {
          doc.ensureSpace(bulletLeading);
          if (i === 0) {
            doc.addText('*', ml + 2, doc.currentY, '/F2', baseSize - 0.5, mr2, mg2, mb2);
            doc.addText(certLines[i], ml + 12, doc.currentY, '/F1', baseSize - 0.2, 0.18, 0.22, 0.3);
          } else {
            doc.addText(certLines[i], ml + 12, doc.currentY, '/F1', baseSize - 0.2, 0.18, 0.22, 0.3);
          }
          doc.currentY -= bulletLeading;
        }
      }
    } else {
      const certList = certNames.join('  •  ');
      const certLines = wrapTextToLines(certList, pw, 8.8);
      for (const line of certLines) {
        doc.ensureSpace(11);
        doc.addText(line, ml, doc.currentY, '/F1', 8.8, 0.18, 0.22, 0.28);
        doc.currentY -= 10.5;
      }
    }
  }

  return doc.build();
}

// ---------------------------------------------------------------------------
// DOWNLOAD TRIGGER
// ---------------------------------------------------------------------------
export function downloadAtsResumePdf(tailoredData, filename, options = {}) {
  try {
    const pdfBytes = generateAtsResumePdf(tailoredData, options);
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const safeName = (tailoredData.candidate?.name || 'Candidate').replace(/[^a-zA-Z0-9]/g, '_');
    const company = (tailoredData.target_job?.company || 'General').replace(/[^a-zA-Z0-9]/g, '_');
    const finalFilename = filename || `${safeName}_${company}_ATS_Resume.pdf`;

    // 1. Native OS Save Dialog when supported (Chrome/Edge desktop - user chooses Desktop/Downloads/custom folder)
    if (typeof window !== 'undefined' && typeof window.showSaveFilePicker === 'function' && options.useAnchorDownload !== true) {
      return (async () => {
        try {
          const handle = await window.showSaveFilePicker({
            suggestedName: finalFilename,
            types: [{
              description: 'PDF Document (*.pdf)',
              accept: { 'application/pdf': ['.pdf'] }
            }]
          });
          const writable = await handle.createWritable();
          await writable.write(blob);
          await writable.close();
          return true;
        } catch (pickerErr) {
          if (pickerErr.name === 'AbortError') {
            // User intentionally cancelled the OS Save dialog
            return false;
          }
          console.warn('showSaveFilePicker failed or was blocked, falling back to standard download:', pickerErr);
          // Fallback to standard anchor download
          return triggerAnchorDownload(blob, finalFilename);
        }
      })();
    }

    // 2. Standard Browser Anchor Download fallback
    return triggerAnchorDownload(blob, finalFilename);
  } catch (err) {
    console.error('Failed to download ATS PDF resume:', err);
    throw err;
  }
}

function triggerAnchorDownload(blob, finalFilename) {
  if (typeof document === 'undefined' || !document.body || typeof document.createElement !== 'function') {
    // Gracefully handle Node.js / headless execution without a DOM document
    return true;
  }
  const url = (typeof URL !== 'undefined' && typeof URL.createObjectURL === 'function')
    ? URL.createObjectURL(blob)
    : '';
  const a = document.createElement('a');
  a.href = url;
  a.download = finalFilename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  if (url && typeof URL !== 'undefined' && typeof URL.revokeObjectURL === 'function') {
    URL.revokeObjectURL(url);
  }
  return true;
}

// ---------------------------------------------------------------------------
// PLAIN TEXT EXPORT (for ATS copy-paste fields)
// ---------------------------------------------------------------------------
export function compileAtsPlainText(tailoredData, options = {}) {
  const c = tailoredData.candidate || {};
  const sections = [];

  const headerLines = [
    (c.name || 'Candidate Name').toUpperCase(),
    c.title ? c.title.toUpperCase() : null,
    [c.location, c.phone, c.email].filter(Boolean).join(' | '),
    [c.linkedin, c.github, c.portfolio, c.website].filter(Boolean).join(' | '),
  ].filter(Boolean);
  sections.push(headerLines.join('\n'));

  if (tailoredData.summary && options.includeSummary !== false) {
    sections.push('PROFESSIONAL SUMMARY\n' + '='.repeat(20) + '\n' + tailoredData.summary);
  }

  if (Array.isArray(tailoredData.skills) && tailoredData.skills.length > 0) {
    const skillLines = ['TECHNICAL SKILLS\n' + '='.repeat(16)];
    if (tailoredData.matched_skills?.length > 0) {
      skillLines.push(`Core Matched Competencies: ${tailoredData.matched_skills.join(', ')}`);
    }
    if (tailoredData.other_skills?.length > 0) {
      skillLines.push(`Technical Proficiencies: ${tailoredData.other_skills.join(', ')}`);
    }
    if (skillLines.length === 1) {
      skillLines.push(tailoredData.skills.join(', '));
    }
    sections.push(skillLines.join('\n'));
  }

  if (Array.isArray(tailoredData.work_history) && tailoredData.work_history.length > 0) {
    const expLines = ['PROFESSIONAL EXPERIENCE\n' + '='.repeat(23)];
    for (const job of tailoredData.work_history) {
      const dates = [job.start_date, job.end_date].filter(Boolean).join(' - ') || job.dates || '';
      expLines.push(`\n${job.role || 'Role'} | ${job.company || 'Company'} (${dates})`);
      if (job.location) expLines.push(`Location: ${job.location}`);
      if (Array.isArray(job.bullets)) {
        for (const b of job.bullets) expLines.push(`* ${b}`);
      }
    }
    sections.push(expLines.join('\n'));
  }

  if (options.includeProjects !== false && Array.isArray(tailoredData.projects) && tailoredData.projects.length > 0) {
    const projLines = ['KEY TECHNICAL PROJECTS\n' + '='.repeat(22)];
    for (const p of tailoredData.projects) {
      const tech = p.tech_stack || p.tech || '';
      const url = [p.url, p.github_url, p.live_url].filter(Boolean)
        .map(u => u.replace(/^https?:\/\/(www\.)?/i, ''))[0] || '';
      const techStr = tech ? ` [${tech}]` : '';
      const urlStr = url ? ` (${url})` : '';
      projLines.push(`\n${p.name}${techStr}${urlStr}`);
      const bullets = Array.isArray(p.bullets) && p.bullets.length > 0
        ? p.bullets
        : (p.description || p.tagline ? [p.description || p.tagline] : []);
      for (const b of bullets) projLines.push(`* ${b}`);
    }
    sections.push(projLines.join('\n'));
  }

  if (Array.isArray(tailoredData.education) && tailoredData.education.length > 0) {
    const eduLines = ['EDUCATION\n' + '='.repeat(9)];
    for (const edu of tailoredData.education) {
      const degree = [edu.degree, edu.field_of_study].filter(Boolean).join(' in ');
      const rawYear = edu.graduation_year || edu.year;
      const yearStr = rawYear ? ` (${rawYear})` : '';
      eduLines.push(`${degree} - ${edu.institution || 'University'}${yearStr}`);
    }
    sections.push(eduLines.join('\n'));
  }

  if (Array.isArray(tailoredData.certifications) && tailoredData.certifications.length > 0) {
    const certLines = ['CERTIFICATIONS & CREDENTIALS\n' + '='.repeat(28)];
    for (const cert of tailoredData.certifications) {
      const name = typeof cert === 'object' && cert !== null ? cert.name : cert;
      if (name) certLines.push(`* ${name}`);
    }
    if (certLines.length > 1) sections.push(certLines.join('\n'));
  }

  return sections.join('\n\n');
}
