/**
 * ats_cover_letter_pdf_compiler.js
 * =================================
 * Pure JavaScript Zero-Dependency ATS-Compliant Cover Letter PDF Compiler.
 * Generates publication-grade ISO 32000-1 / PDF 1.4 documents entirely in-browser.
 * 
 * Themes supported:
 *   modern  — Left-aligned letterhead, thick accent rule, contemporary spacing.
 *   classic — Centered executive letterhead, double horizontal dividers, formal margins.
 *   minimal — Clean typography, subtle dividers, generous whitespace.
 * 
 * 100% Client-Side • Zero Cloud Telemetry • Zero External Dependencies
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
  '•': 400
};

export function getCharWidth(char) {
  return HELVETICA_WIDTHS[char] || 550;
}

export function getTextWidth(text, fontSize) {
  if (!text) return 0;
  let units = 0;
  for (let i = 0; i < text.length; i++) {
    units += getCharWidth(text[i]);
  }
  return (units / 1000) * fontSize;
}

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
// COVER LETTER PDF BUILDER CLASS
// ---------------------------------------------------------------------------
export class CoverLetterPdfDoc {
  constructor(options = {}) {
    this.pageWidth = 612; // Standard US Letter (8.5 x 11 in)
    this.pageHeight = 792;
    this.theme = options.theme || 'modern'; // 'modern' | 'classic' | 'minimal'

    const marginPt = options.marginPt || (this.theme === 'classic' ? 50 : 45);
    this.marginLeft = marginPt;
    this.marginRight = marginPt;
    this.marginTop = marginPt;
    this.marginBottom = marginPt;
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
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n` +
      `${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re f`
    );
  }

  drawText(text, x, y, fontKey, fontSize, r = 0, g = 0, b = 0) {
    const sanitized = sanitizePdfText(text);
    if (!sanitized) return;
    const escaped = escapePdfLiteral(sanitized);
    this.currentPageOps.push(
      `BT\n` +
      `/${fontKey} ${fontSize} Tf\n` +
      `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg\n` +
      `1 0 0 1 ${x.toFixed(2)} ${y.toFixed(2)} Tm\n` +
      `(${escaped}) Tj\n` +
      `ET`
    );
  }

  drawCenteredText(text, y, fontKey, fontSize, r = 0, g = 0, b = 0) {
    const sanitized = sanitizePdfText(text);
    if (!sanitized) return;
    const width = getTextWidth(sanitized, fontSize);
    const x = this.marginLeft + (this.printableWidth - width) / 2;
    this.drawText(sanitized, Math.max(this.marginLeft, x), y, fontKey, fontSize, r, g, b);
  }

  writeWrappedParagraph(text, fontSize = 9.75, lineHeight = 14, r = 0.12, g = 0.14, b = 0.18, fontKey = 'F1') {
    const lines = wrapTextToLines(text, this.printableWidth, fontSize);
    for (const line of lines) {
      this.ensureSpace(lineHeight);
      this.drawText(line, this.marginLeft, this.currentY - fontSize, fontKey, fontSize, r, g, b);
      this.currentY -= lineHeight;
    }
  }

  buildPdfBytes() {
    if (this.currentPageOps.length > 0) {
      this.pages.push(this.currentPageOps.join('\n'));
      this.currentPageOps = [];
    }

    const objects = [];
    let objCounter = 1;

    // 1: Catalog
    const catalogObjNum = objCounter++;
    // 2: Pages
    const pagesObjNum = objCounter++;
    // 3: Font F1 (Helvetica)
    const f1ObjNum = objCounter++;
    // 4: Font F2 (Helvetica-Bold)
    const f2ObjNum = objCounter++;

    const pageObjNums = [];
    const contentObjNums = [];

    for (let i = 0; i < this.pages.length; i++) {
      pageObjNums.push(objCounter++);
      contentObjNums.push(objCounter++);
    }

    // Catalog
    objects[catalogObjNum] = `<< /Type /Catalog /Pages ${pagesObjNum} 0 R >>`;

    // Pages definition
    const kidsStr = pageObjNums.map(n => `${n} 0 R`).join(' ');
    objects[pagesObjNum] = `<< /Type /Pages /Kids [${kidsStr}] /Count ${pageObjNums.length} >>`;

    // Fonts
    objects[f1ObjNum] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>`;
    objects[f2ObjNum] = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>`;

    // Pages & Contents
    for (let i = 0; i < this.pages.length; i++) {
      const pageN = pageObjNums[i];
      const contentN = contentObjNums[i];
      const streamBytes = new TextEncoder().encode(this.pages[i]);

      objects[pageN] = `<< /Type /Page /Parent ${pagesObjNum} 0 R /MediaBox [0 0 ${this.pageWidth} ${this.pageHeight}] /Contents ${contentN} 0 R /Resources << /Font << /F1 ${f1ObjNum} 0 R /F2 ${f2ObjNum} 0 R >> >> >>`;
      objects[contentN] = `<< /Length ${streamBytes.length} >>\nstream\n${this.pages[i]}\nendstream`;
    }

    // Build PDF byte buffer with cross-reference table (xref)
    let pdfStr = `%PDF-1.4\n%\xE2\xE3\xCF\xD3\n`;
    const byteOffsets = [];

    for (let i = 1; i < objCounter; i++) {
      byteOffsets[i] = new TextEncoder().encode(pdfStr).length;
      pdfStr += `${i} 0 obj\n${objects[i]}\nendobj\n`;
    }

    const startXref = new TextEncoder().encode(pdfStr).length;
    pdfStr += `xref\n0 ${objCounter}\n`;
    pdfStr += `0000000000 65535 f \n`;

    for (let i = 1; i < objCounter; i++) {
      pdfStr += `${String(byteOffsets[i]).padStart(10, '0')} 00000 n \n`;
    }

    pdfStr += `trailer\n<< /Size ${objCounter} /Root ${catalogObjNum} 0 R >>\nstartxref\n${startXref}\n%%EOF\n`;
    return new TextEncoder().encode(pdfStr);
  }
}

// ---------------------------------------------------------------------------
// HIGH-LEVEL COMPILER FUNCTION
// ---------------------------------------------------------------------------
export function cleanParagraph(text = '') {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/^\*{0,2}(?:(?:Paragraph\s+\d+|In-Media-Res Hook|Context & (?:The )?Hook|Technical Depth & Verified Metrics|Problem Alignment & System(?: Synergy)?|Conversational Peer-to-Peer Close|The Hook|Closing|Sign-off)[\s:*–-]+)+/gi, '')
    .replace(/^\*\*([^*]+)\*\*:\s*/, '')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .trim();
}

/**
 * Compiles a structured cover letter document model into an ATS-compliant PDF.
 * 
 * @param {Object} docData - Document data from formatCoverLetterDocument
 * @param {string} docData.candidateName - Candidate full name
 * @param {string} [docData.candidateTitle] - Candidate professional title
 * @param {string} [docData.candidateEmail] - Candidate email
 * @param {string} [docData.candidatePhone] - Candidate phone
 * @param {string} [docData.candidateLocation] - Candidate location
 * @param {string} [docData.date] - Formatted date string
 * @param {string} [docData.recipientTitle] - Recipient title (e.g. Hiring Team)
 * @param {string} [docData.recipientCompany] - Target company name
 * @param {string} [docData.recipientLocation] - Target company location
 * @param {string} [docData.subject] - Subject line
 * @param {string} [docData.salutation] - Salutation (e.g. Dear Stripe Engineering Team,)
 * @param {Array<string>} docData.paragraphs - Body paragraphs
 * @param {string} [docData.signoff] - Sign-off closing (e.g. Sincerely,)
 * @param {Object} [options] - Compiler options: theme ('modern' | 'classic' | 'minimal')
 * @returns {Uint8Array} Pure binary PDF buffer
 */
export function compileCoverLetterPdf(docData = {}, options = {}) {
  const theme = options.theme || 'modern';
  const doc = new CoverLetterPdfDoc({ theme, ...options });

  const name = (docData.candidateName || 'Candidate Name').trim();
  const title = (docData.candidateTitle || 'Software Engineer').trim();
  const email = (docData.candidateEmail || '').trim();
  const phone = (docData.candidatePhone || '').trim();
  const loc = (docData.candidateLocation || '').trim();
  const linkedin = (docData.candidateLinkedin || '').trim();
  const github = (docData.candidateGithub || '').trim();

  const dateStr = (docData.date || new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  })).trim();

  const recipientCompany = (docData.recipientCompany || 'Engineering Team').trim();
  const recipientTitle = (docData.recipientTitle || `Hiring Team`).trim();
  const recipientLoc = (docData.recipientLocation || '').trim();

  const subject = (docData.subject || `Application for ${recipientCompany}`).trim();
  const salutation = (docData.salutation || `Dear ${recipientCompany} Hiring Team,`).trim();
  const signoff = (docData.signoff || 'Sincerely,').trim();

  // Normalize paragraphs
  let rawParagraphs = docData.paragraphs;
  if (!rawParagraphs || (Array.isArray(rawParagraphs) && rawParagraphs.length === 0)) {
    if (docData.text) {
      rawParagraphs = String(docData.text).split(/\n\s*\n/).filter(Boolean);
    } else {
      rawParagraphs = ['Thank you for considering my application.'];
    }
  } else if (typeof rawParagraphs === 'string') {
    rawParagraphs = rawParagraphs.split(/\n\s*\n/).filter(Boolean);
  }

  // ── 1. LETTERHEAD HEADER ──────────────────────────────────────────────────
  if (theme === 'classic') {
    // Centered classic letterhead
    doc.drawCenteredText(name.toUpperCase(), doc.currentY - 18, 'F2', 18, 0.08, 0.10, 0.14);
    doc.currentY -= 24;

    if (title) {
      doc.drawCenteredText(title, doc.currentY - 10, 'F1', 10, 0.30, 0.35, 0.42);
      doc.currentY -= 15;
    }

    const contactParts = [email, phone, loc, linkedin, github].filter(Boolean);
    if (contactParts.length > 0) {
      doc.drawCenteredText(contactParts.join('  •  '), doc.currentY - 8.5, 'F1', 8.5, 0.35, 0.40, 0.48);
      doc.currentY -= 14;
    }

    // Classic double divider rule
    doc.drawRect(doc.marginLeft, doc.currentY, doc.printableWidth, 1.2, 0.15, 0.20, 0.30);
    doc.drawRect(doc.marginLeft, doc.currentY - 3, doc.printableWidth, 0.5, 0.50, 0.55, 0.60);
    doc.currentY -= 16;
  } else if (theme === 'minimal') {
    // Minimalist Left-Aligned letterhead
    doc.drawText(name, doc.marginLeft, doc.currentY - 16, 'F2', 16, 0.10, 0.12, 0.15);
    doc.currentY -= 20;

    if (title) {
      doc.drawText(title, doc.marginLeft, doc.currentY - 9, 'F1', 9.5, 0.40, 0.45, 0.50);
      doc.currentY -= 14;
    }

    const contactParts = [email, phone, loc, linkedin, github].filter(Boolean);
    if (contactParts.length > 0) {
      doc.drawText(contactParts.join('  |  '), doc.marginLeft, doc.currentY - 8, 'F1', 8, 0.45, 0.50, 0.55);
      doc.currentY -= 13;
    }

    // Subtle 0.5pt divider rule
    doc.drawRect(doc.marginLeft, doc.currentY, doc.printableWidth, 0.6, 0.80, 0.83, 0.88);
    doc.currentY -= 16;
  } else {
    // Modern Executive letterhead
    doc.drawText(name, doc.marginLeft, doc.currentY - 20, 'F2', 20, 0.08, 0.11, 0.18);
    doc.currentY -= 26;

    if (title) {
      doc.drawText(title, doc.marginLeft, doc.currentY - 10, 'F2', 10, 0.25, 0.32, 0.70); // Accent indigo
      doc.currentY -= 15;
    }

    const contactParts = [email, phone, loc, linkedin, github].filter(Boolean);
    if (contactParts.length > 0) {
      doc.drawText(contactParts.join('   •   '), doc.marginLeft, doc.currentY - 8.5, 'F1', 8.5, 0.35, 0.40, 0.46);
      doc.currentY -= 13;
    }

    // Bold modern accent bar
    doc.drawRect(doc.marginLeft, doc.currentY, doc.printableWidth, 2.5, 0.25, 0.32, 0.70); // 6366f1 indigo
    doc.currentY -= 18;
  }

  // ── 2. DATE & RECIPIENT BLOCK ─────────────────────────────────────────────
  doc.ensureSpace(45);
  doc.drawText(dateStr, doc.marginLeft, doc.currentY - 9.5, 'F1', 9.5, 0.35, 0.40, 0.45);
  doc.currentY -= 18;

  doc.drawText(recipientTitle, doc.marginLeft, doc.currentY - 9.5, 'F2', 9.5, 0.12, 0.14, 0.18);
  doc.currentY -= 13;
  doc.drawText(recipientCompany, doc.marginLeft, doc.currentY - 9.5, 'F2', 9.5, 0.12, 0.14, 0.18);
  doc.currentY -= 13;
  if (recipientLoc) {
    doc.drawText(recipientLoc, doc.marginLeft, doc.currentY - 9, 'F1', 9, 0.40, 0.45, 0.50);
    doc.currentY -= 13;
  }
  doc.currentY -= 8;

  // ── 3. SUBJECT LINE ───────────────────────────────────────────────────────
  if (subject) {
    doc.ensureSpace(20);
    const subjectPrefix = 'RE: ';
    const fullSubject = `${subjectPrefix}${subject}`;
    doc.drawText(fullSubject, doc.marginLeft, doc.currentY - 10, 'F2', 10, 0.10, 0.13, 0.20);
    doc.currentY -= 18;
  }

  // ── 4. SALUTATION ─────────────────────────────────────────────────────────
  doc.ensureSpace(16);
  doc.drawText(salutation, doc.marginLeft, doc.currentY - 9.75, 'F2', 9.75, 0.12, 0.15, 0.20);
  doc.currentY -= 16;

  // ── 5. BODY PARAGRAPHS ────────────────────────────────────────────────────
  const fontSize = theme === 'classic' ? 10 : 9.5;
  const lineHeight = theme === 'classic' ? 14.5 : 14;
  const paragraphGap = 10;
  for (let i = 0; i < rawParagraphs.length; i++) {
    const para = cleanParagraph(rawParagraphs[i]);
    if (!para) continue;
    doc.writeWrappedParagraph(para, fontSize, lineHeight, 0.15, 0.18, 0.22, 'F1');
    doc.currentY -= paragraphGap;
  }

  // ── 6. EXECUTIVE SIGNOFF ──────────────────────────────────────────────────
  doc.ensureSpace(65);
  doc.currentY -= 4;
  doc.drawText(signoff, doc.marginLeft, doc.currentY - 9.5, 'F1', 9.5, 0.15, 0.18, 0.22);
  doc.currentY -= 36; // Leave elegant space for hand/digital signature

  doc.drawText(name, doc.marginLeft, doc.currentY - 10.5, 'F2', 10.5, 0.10, 0.12, 0.16);
  doc.currentY -= 14;
  if (title) {
    doc.drawText(title, doc.marginLeft, doc.currentY - 9, 'F1', 9, 0.40, 0.45, 0.50);
    doc.currentY -= 13;
  }
  if (email || phone) {
    const directContact = [email, phone].filter(Boolean).join(' • ');
    doc.drawText(directContact, doc.marginLeft, doc.currentY - 8.5, 'F1', 8.5, 0.45, 0.50, 0.55);
  }

  return doc.buildPdfBytes();
}

/**
 * Creates a Blob for in-browser viewing or printing.
 */
export function createCoverLetterPdfBlob(docData = {}, options = {}) {
  const pdfBytes = compileCoverLetterPdf(docData, options);
  return new Blob([pdfBytes], { type: 'application/pdf' });
}

/**
 * Direct browser download trigger.
 */
export function downloadCoverLetterPdf(docData = {}, options = {}, customFilename = null) {
  try {
    const blob = createCoverLetterPdfBlob(docData, options);
    const candidateSlug = (docData.candidateName || 'Candidate')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const companySlug = (docData.recipientCompany || 'TargetCompany')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const filename = customFilename || `${candidateSlug}_Cover_Letter_${companySlug}.pdf`;

    if (typeof window !== 'undefined') {
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
      return true;
    }
  } catch (err) {
    console.error('[ats_cover_letter_pdf_compiler] PDF download failed:', err);
  }
  return false;
}
