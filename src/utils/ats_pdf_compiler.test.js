import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  generateAtsResumePdf, 
  wrapTextToLines, 
  sanitizePdfText, 
  compileAtsPlainText,
  downloadAtsResumePdf,
  getCharWidth,
  getTextWidth,
  escapePdfLiteral,
  SimplePdfDoc
} from './ats_pdf_compiler.js';

test('wrapTextToLines & sanitizePdfText: handles special characters, quotes, and word boundaries', () => {
  const dirty = 'Special: (Parentheses) \\Backslash\\ and \u201Ccurly quotes\u201D and \u2014 em dash and \u2022 bullet';
  const clean = sanitizePdfText(dirty);
  assert.equal(clean, 'Special: (Parentheses) \\Backslash\\ and "curly quotes" and - em dash and • bullet');

  const longText = 'FirstWord SecondWord ThirdWord FourthWord FifthWord';
  // Wrapped at tight width
  const lines = wrapTextToLines(longText, 100, 10);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(' '), longText);

  // Empty string wrap
  assert.deepEqual(wrapTextToLines('', 100, 10), []);
});

test('generateAtsResumePdf: comprehensive binary and stream inspection with all sections', () => {
  const mockTailored = {
    candidate: {
      name: 'Jane Doe',
      email: 'jane@example.com',
      phone: '+1 234 567 8900',
      location: 'New York, NY',
      linkedin: 'https://www.linkedin.com/in/janedoe',
      github: 'https://github.com/janedoe',
      portfolio: 'https://janedoe.dev'
    },
    summary: 'Experienced Senior Staff Engineer specializing in high-scale distributed applications.',
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
    matched_skills: ['React', 'TypeScript'],
    other_skills: ['Node.js', 'PostgreSQL', 'Docker'],
    work_history: [
      {
        company: 'Stripe',
        role: 'Senior Staff Engineer',
        start_date: '2021',
        end_date: 'Present',
        location: 'Remote',
        bullets: [
          'Engineered global payment ingestion services handling $2B+ in annual volume.',
          'Reduced API p99 latency from 140ms to 28ms using in-memory semantic caching.'
        ]
      }
    ],
    projects: [
      {
        name: 'SPrav AI Engine',
        tech_stack: 'WebGPU, React, Vite',
        bullets: [
          'Built pure in-browser career intelligence platform with zero cloud costs.',
          'Orchestrated multi-threaded SIMD matrix multiplication pipelines across diverse browser architectures and mobile devices, optimizing execution efficiency by over 300% without external runtime dependencies.'
        ]
      },
      {
        name: 'Solo Project No Stack',
        bullets: ['Minimal bullet']
      },
      { name: 'Project Three' },
      { name: 'Project Four Should Be Sliced Out' }
    ],
    education: [
      {
        institution: 'University of California, Berkeley',
        degree: 'B.S.',
        field_of_study: 'Computer Science',
        graduation_year: '2020',
        gpa: '3.9'
      },
      {
        institution: 'Stanford University',
        degree: 'M.S.'
      }
    ],
    certifications: [
      { name: 'AWS Certified Solutions Architect' },
      'CKA',
      null
    ]
  };

  const pdfBytes = generateAtsResumePdf(mockTailored);
  assert.ok(pdfBytes instanceof Uint8Array);
  assert.ok(pdfBytes.length > 1000);

  const pdfStr = new TextDecoder('utf-8').decode(pdfBytes);

  // Structure & Header
  assert.ok(pdfStr.startsWith('%PDF-1.4'));
  assert.ok(pdfStr.includes('%%EOF'));
  assert.ok(pdfStr.includes('xref\n0 '));
  assert.ok(pdfStr.includes('/Type /Catalog'));
  assert.ok(pdfStr.includes('/Type /Pages'));
  assert.ok(pdfStr.includes('/BaseFont /Helvetica'));
  assert.ok(pdfStr.includes('/BaseFont /Helvetica-Bold'));

  // Exact Stream Operator blocks: Font, Size, Color, Text
  assert.ok(pdfStr.includes('/F2 18 Tf\n0.06 0.09 0.16 rg\n260.99 752.00 Td\n(JANE DOE) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 8.5 Tf\n0.3 0.35 0.42 rg'));
  assert.ok(pdfStr.includes('New York, NY  |  +1 234 567 8900  |  jane@example.com  |  linkedin.com/in/janedoe  |  github.com/janedoe  |  janedoe.dev'));
  
  // Section Headers and Horizontal Rules
  assert.ok(pdfStr.includes('/F2 11 Tf\n0.12 0.18 0.28 rg\n40.00 718.00 Td\n(PROFESSIONAL SUMMARY) Tj\nET'));
  assert.ok(pdfStr.includes('0.75 0.8 0.85 RG\n0.5 w\n40 714.00 m\n572 714.00 l\nS'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.18 0.22 0.28 rg\n40.00 706.00 Td\n(Experienced Senior Staff Engineer'));

  // Skills
  assert.ok(pdfStr.includes('/F2 9 Tf\n0.12 0.16 0.23 rg\n40.00 670.50 Td\n(Core / Matched Competencies:) Tj\nET'));
  assert.ok(pdfStr.includes('(React, TypeScript) Tj'));
  assert.ok(pdfStr.includes('/F2 9 Tf\n0.12 0.16 0.23 rg\n40.00 659.00 Td\n(Technical Proficiencies:) Tj\nET'));
  assert.ok(pdfStr.includes('(Node.js, PostgreSQL, Docker) Tj'));

  // Experience
  assert.ok(pdfStr.includes('(PROFESSIONAL EXPERIENCE) Tj'));
  assert.ok(pdfStr.includes('/F2 10 Tf\n0.08 0.12 0.2 rg\n40.00 623.50 Td\n(Senior Staff Engineer) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.35 0.4 0.48 rg\n512.97 623.50 Td\n(2021 - Present) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.25 0.3 0.38 rg\n40.00 612.50 Td\n(Stripe | Remote) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.3 0.35 0.45 rg\n42.00 601.50 Td\n(\\225) Tj\nET'));
  assert.ok(pdfStr.includes('Engineered global payment ingestion services'));

  // Projects - First bullet with bullet char + text, wrapped second bullet with line 1 and continuation line 2
  assert.ok(pdfStr.includes('(KEY TECHNICAL PROJECTS) Tj'));
  assert.ok(pdfStr.includes('/F2 9.5 Tf\n0.08 0.12 0.2 rg\n40.00 552.50 Td\n(SPrav AI Engine) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 8.5 Tf\n0.35 0.4 0.48 rg\n109.70 552.50 Td\n(\\(WebGPU, React, Vite\\)) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.3 0.35 0.45 rg\n42.00 531.00 Td\n(\\225) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 8.8 Tf\n0.18 0.22 0.28 rg\n52.00 531.00 Td\n(Orchestrated multi-threaded SIMD matrix multiplication pipelines'));
  assert.ok(pdfStr.includes('/F1 8.8 Tf\n0.18 0.22 0.28 rg\n52.00 520.50 Td\n(optimizing execution efficiency by over 300% without external runtime dependencies.) Tj\nET'));
  assert.ok(pdfStr.includes('(Solo Project No Stack) Tj\nET\nBT\n/F1 9 Tf'));
  assert.ok(pdfStr.includes('(Project Three) Tj'));
  // Slicing: Project 4 beyond limit 3 must not be rendered
  assert.ok(!pdfStr.includes('Project Four Should Be Sliced Out'));

  // Education with GPA and graduation year alignment, and missing year fallback
  assert.ok(pdfStr.includes('(EDUCATION) Tj'));
  assert.ok(pdfStr.includes('/F2 9.5 Tf\n0.08 0.12 0.2 rg\n40.00 444.50 Td\n(B.S. in Computer Science) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 9 Tf\n0.35 0.4 0.48 rg\n551.98 444.50 Td\n(2020) Tj\nET'));
  assert.ok(pdfStr.includes('/F1 8.8 Tf\n0.25 0.3 0.38 rg\n40.00 434.00 Td\n(University of California, Berkeley | GPA: 3.9) Tj\nET'));
  assert.ok(pdfStr.includes('(M.S.) Tj\nET\nBT\n/F1 8.8 Tf\n0.25 0.3 0.38 rg\n40.00 411.50 Td\n(Stanford University) Tj'));

  // Certifications with bullet separator
  assert.ok(pdfStr.includes('(CERTIFICATIONS & CREDENTIALS) Tj'));
  assert.ok(pdfStr.includes('/F1 8.8 Tf\n0.18 0.22 0.28 rg\n40.00 375.50 Td\n(AWS Certified Solutions Architect \\225 CKA) Tj\nET'));
});

test('generateAtsResumePdf: fallback branches and options handling', () => {
  // 1. includeSummary: false
  const noSummaryData = {
    candidate: { name: 'Bob' },
    summary: 'Skip this summary',
    skills: ['C++', 'Rust'],
    work_history: [
      { start_date: '2020', end_date: '2021', bullets: [] } // missing role & company
    ],
    projects: [
      { bullets: [] } // missing name & tech stack
    ],
    education: [
      {} // missing degree, field, institution, year, gpa
    ]
  };

  const pdfBytes = generateAtsResumePdf(noSummaryData, { includeSummary: false });
  const pdfStr = new TextDecoder('latin1').decode(pdfBytes);

  assert.ok(!pdfStr.includes('(PROFESSIONAL SUMMARY) Tj'));
  assert.ok(pdfStr.includes('(Skills:) Tj'));
  assert.ok(pdfStr.includes('(C++, Rust) Tj'));
  assert.ok(pdfStr.includes('(Software Engineer) Tj'));
  assert.ok(pdfStr.includes('(Company) Tj'));
  assert.ok(pdfStr.includes('(Project) Tj'));
  assert.ok(pdfStr.includes('(Degree) Tj'));
  assert.ok(pdfStr.includes('(University) Tj'));

  // 2. Candidate contact link variants with http:// and without www
  const contactVariant = {
    candidate: {
      name: 'Link Dev',
      linkedin: 'http://linkedin.com/in/linkdev',
      github: 'http://github.com/linkdev',
      portfolio: 'http://linkdev.me'
    }
  };
  const linkBytes = generateAtsResumePdf(contactVariant);
  const linkStr = new TextDecoder('utf-8').decode(linkBytes);
  assert.ok(linkStr.includes('linkedin.com/in/linkdev'));
  assert.ok(linkStr.includes('github.com/linkdev'));
  assert.ok(linkStr.includes('linkdev.me'));

  // 3. Very long contact line clamped to marginLeft (40.00)
  const longContactProfile = {
    candidate: {
      name: 'Long Dev',
      location: 'Very Long Location Area in Metropolis City, State, Country, PostalCode',
      phone: '+1 234 567 8901 ext 99999',
      email: 'extraordinarily.long.user.address.for.testing.coordinate.clamping@corporate-enterprise-domain.com',
      linkedin: 'https://linkedin.com/in/extraordinarily-long-profile-slug-testing-clamping',
      github: 'https://github.com/extraordinarily-long-organization-account-name',
      portfolio: 'https://extraordinarily-long-domain-name-portfolio-website.io'
    }
  };
  const clampedPdf = new TextDecoder('utf-8').decode(generateAtsResumePdf(longContactProfile));
  assert.ok(clampedPdf.includes('40.00 738.00 Td'));
});

test('generateAtsResumePdf: auto-paginates long resumes across multiple pages', () => {
  const longResume = {
    candidate: { name: 'Prolific Engineer', email: 'prolific@example.com' },
    work_history: [
      {
        company: 'MegaCorp',
        role: 'Principal Engineer',
        bullets: Array.from({ length: 60 }, (_, i) => `Executed strategic initiative number ${i + 1} with high business impact, cutting infrastructure latency by 45% and optimizing database indexing across distributed sharded Postgres clusters.`)
      }
    ]
  };

  const pdfBytes = generateAtsResumePdf(longResume);
  const pdfStr = new TextDecoder('latin1').decode(pdfBytes);
  assert.ok(pdfStr.includes('/Count 2') || pdfStr.includes('/Count 3'));
});

test('compileAtsPlainText: exact structured plain text compilation with all sections', () => {
  const completeProfile = {
    candidate: {
      name: 'John Smith',
      location: 'Austin, TX',
      phone: '+1 555 123 4567',
      email: 'john@example.com',
      linkedin: 'linkedin.com/in/john',
      github: 'github.com/john',
      portfolio: 'johnsmith.dev'
    },
    summary: 'Senior Data Scientist with 8+ years scaling production ML.',
    skills: ['Python', 'SQL', 'Docker', 'Redis'],
    matched_skills: ['Python', 'SQL'],
    other_skills: ['Docker', 'Redis'],
    work_history: [
      {
        role: 'Lead Data Scientist',
        company: 'Acme Corp',
        start_date: '2022',
        end_date: 'Present',
        location: 'Austin, TX',
        bullets: [
          'Engineered real-time recommendation system.',
          'Reduced churn by 18%.'
        ]
      }
    ],
    projects: [
      {
        name: 'OpenAI Evaluator',
        tech_stack: 'Python, FastAPI',
        bullets: ['Benchmarked latency across 10 LLMs.']
      }
    ],
    education: [
      {
        degree: 'M.S.',
        field_of_study: 'Computer Science',
        institution: 'University of Texas',
        graduation_year: '2021'
      }
    ]
  };

  const plain = compileAtsPlainText(completeProfile);

  const expected = [
    'JOHN SMITH',
    'Austin, TX | +1 555 123 4567 | john@example.com',
    'linkedin.com/in/john | github.com/john | johnsmith.dev',
    '',
    'PROFESSIONAL SUMMARY',
    '====================',
    'Senior Data Scientist with 8+ years scaling production ML.',
    '',
    'TECHNICAL SKILLS',
    '================',
    'Core Matched Competencies: Python, SQL',
    'Technical Proficiencies: Docker, Redis',
    '',
    'PROFESSIONAL EXPERIENCE',
    '=======================',
    '',
    'Lead Data Scientist | Acme Corp (2022 - Present)',
    'Location: Austin, TX',
    '* Engineered real-time recommendation system.',
    '* Reduced churn by 18%.',
    '',
    'KEY TECHNICAL PROJECTS',
    '======================',
    '',
    'OpenAI Evaluator [Python, FastAPI]',
    '* Benchmarked latency across 10 LLMs.',
    '',
    'EDUCATION',
    '=========',
    'M.S. in Computer Science - University of Texas (2021)'
  ].join('\n');

  assert.equal(plain, expected);
});

test('compileAtsPlainText: fallback paths for missing optional fields', () => {
  // 1. Missing candidate details & single flat skills array
  const minimal = {
    candidate: {},
    skills: ['JavaScript', 'HTML']
  };
  const resMin = compileAtsPlainText(minimal);
  assert.ok(resMin.includes('CANDIDATE NAME'));
  assert.ok(resMin.includes('TECHNICAL SKILLS\n================\nJavaScript, HTML'));

  // 2. Education with degree only, missing institution
  const eduOnly = {
    education: [{ degree: 'B.A.', graduation_year: '2020' }]
  };
  const resEdu = compileAtsPlainText(eduOnly);
  assert.ok(resEdu.includes('B.A. - University (2020)'));

  // 3. Work history missing role and company
  const workMinimal = {
    work_history: [{ bullets: ['Single task'] }]
  };
  const resWork = compileAtsPlainText(workMinimal);
  assert.ok(resWork.includes('Role | Company ()'));
  assert.ok(resWork.includes('* Single task'));

  // 4. Project without tech stack and without bullets
  const projMinimal = {
    projects: [{ name: 'Solo Project' }]
  };
  const resProj = compileAtsPlainText(projMinimal);
  assert.equal(resProj, 'CANDIDATE NAME\n\nKEY TECHNICAL PROJECTS\n======================\n\nSolo Project');
});

test('getCharWidth and getTextWidth: font metrics calculation and fallback boundaries', () => {
  // Known mapped characters
  assert.equal(getCharWidth(' '), 278);
  assert.equal(getCharWidth('!'), 278);
  assert.equal(getCharWidth('#'), 556);
  assert.equal(getCharWidth('•'), 400);

  // Unmapped fallback character
  assert.equal(getCharWidth('€'), 550);
  assert.equal(getCharWidth('\uFFFF'), 550);

  // getTextWidth calculations
  assert.equal(getTextWidth('', 10), 0);
  assert.ok(Math.abs(getTextWidth(' ', 10) - 2.78) < 1e-6);
  assert.ok(Math.abs(getTextWidth('!', 10) - 2.78) < 1e-6);
  assert.equal(getTextWidth('##', 12), ((556 + 556) / 1000) * 12);
});

test('sanitizePdfText and escapePdfLiteral: exhaustive character substitution', () => {
  // Falsy / empty values
  assert.equal(sanitizePdfText(null), '');
  assert.equal(sanitizePdfText(undefined), '');
  assert.equal(sanitizePdfText(''), '');

  // Typographic conversions
  assert.equal(sanitizePdfText('‘hello’'), "'hello'");
  assert.equal(sanitizePdfText('“world”'), '"world"');
  assert.equal(sanitizePdfText('en–dash and em—dash'), 'en-dash and em-dash');
  assert.equal(sanitizePdfText('loading…'), 'loading...');
  assert.equal(sanitizePdfText('• bullet item'), '• bullet item');
  assert.equal(sanitizePdfText('emoji \uD83D\uDE80 rocket'), 'emoji    rocket');

  // escapePdfLiteral
  assert.equal(escapePdfLiteral('plain'), 'plain');
  assert.equal(escapePdfLiteral('path\\to\\file'), 'path\\\\to\\\\file');
  assert.equal(escapePdfLiteral('func(arg)'), 'func\\(arg\\)');
  assert.equal(escapePdfLiteral('\\()'), '\\\\\\(\\)');
});

test('wrapTextToLines: whitespace normalization, boundary fitting, and overflow', () => {
  assert.deepEqual(wrapTextToLines(null, 100, 10), []);
  assert.deepEqual(wrapTextToLines(undefined, 100, 10), []);
  assert.deepEqual(wrapTextToLines('', 100, 10), []);

  // Multiple internal whitespace should normalize
  const words = wrapTextToLines('word1    word2    word3', 1000, 10);
  assert.deepEqual(words, ['word1 word2 word3']);

  // Precise line break triggers
  const text = 'Alpha Beta Gamma Delta Epsilon Zeta';
  const lines = wrapTextToLines(text, 60, 12);
  assert.ok(lines.length > 1);
  assert.equal(lines.join(' '), text);
});

test('SimplePdfDoc: low-level PDF operator generation and page flow', () => {
  const doc = new SimplePdfDoc();
  assert.equal(doc.pageWidth, 612);
  assert.equal(doc.pageHeight, 792);
  assert.equal(doc.marginLeft, 40);
  assert.equal(doc.marginRight, 40);
  assert.equal(doc.marginTop, 40);
  assert.equal(doc.marginBottom, 40);
  assert.equal(doc.printableWidth, 532);
  assert.equal(doc.currentY, 752);

  // Horizontal Rule
  doc.drawHorizontalRule(700, '0.5 0.5 0.5');
  assert.ok(doc.currentPageOps.includes('0.5 0.5 0.5 RG'));
  assert.ok(doc.currentPageOps.includes('0.5 w'));
  assert.ok(doc.currentPageOps.includes('40 700.00 m'));
  assert.ok(doc.currentPageOps.includes('572 700.00 l'));
  assert.ok(doc.currentPageOps.includes('S'));

  // Text Rendering
  doc.addText('Hello World', 50, 680, '/F1', 10, '0 0 0');
  assert.ok(doc.currentPageOps.includes('/F1 10 Tf'));
  assert.ok(doc.currentPageOps.includes('0 0 0 rg'));
  assert.ok(doc.currentPageOps.includes('50.00 680.00 Td'));
  assert.ok(doc.currentPageOps.includes('(Hello World) Tj'));

  // Section Header
  doc.addSectionHeader('Experience');
  assert.ok(doc.currentPageOps.includes('(EXPERIENCE) Tj'));

  // Trigger ensureSpace in addSectionHeader by lowering currentY (forces page 2)
  doc.currentY = 50;
  doc.addSectionHeader('Overflow Section');
  assert.equal(doc.pages.length, 1);
  assert.ok(doc.currentY > 700);
  doc.addText('Second Page Content', 40, 700, '/F1', 10, '0 0 0');

  // Build Uint8Array binary with multi-page verification
  const bytes = doc.build();
  assert.ok(bytes instanceof Uint8Array);
  const pdfContent = new TextDecoder().decode(bytes);
  assert.ok(pdfContent.startsWith('%PDF-1.4'));
  assert.ok(pdfContent.includes('<< /Type /Catalog /Pages 2 0 R >>'));
  assert.ok(pdfContent.includes('<< /Type /Pages /Kids [3 0 R 4 0 R] /Count 2 >>'));
  assert.ok(pdfContent.includes('/MediaBox [0 0 612 792]'));
  assert.ok(pdfContent.includes('/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 7 0 R'));
  assert.ok(pdfContent.includes('/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 8 0 R'));
  assert.ok(pdfContent.includes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>'));
  assert.ok(pdfContent.includes('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>'));
  assert.ok(pdfContent.includes('xref\n0 9\n'));
  assert.ok(pdfContent.includes('0000000000 65535 f \n'));
  assert.ok(pdfContent.includes('<< /Size 9 /Root 1 0 R >>'));
  assert.ok(pdfContent.includes('%%EOF'));

  // Empty document fallback (0 ops)
  const emptyDoc = new SimplePdfDoc();
  const emptyBytes = emptyDoc.build();
  const emptyPdf = new TextDecoder().decode(emptyBytes);
  assert.ok(emptyPdf.includes('/Count 1'));
  assert.ok(emptyPdf.includes('Kids [3 0 R]'));
});

test('downloadAtsResumePdf: triggers DOM link download, custom filename, and handles errors', () => {
  const origBlob = globalThis.Blob;
  const origURL = globalThis.URL;
  const origDoc = globalThis.document;

  try {
    let clicked = false;
    let appended = false;
    let removed = false;
    let revokedUrl = null;
    let createdElement = null;

    let createdBlob = null;
    globalThis.Blob = class {
      constructor(parts, opts) {
        this.parts = parts;
        this.type = opts?.type;
        createdBlob = this;
      }
    };

    globalThis.URL = {
      createObjectURL: () => 'blob:http://localhost/mock-uuid',
      revokeObjectURL: (u) => { revokedUrl = u; }
    };

    globalThis.document = {
      createElement: (tag) => {
        createdElement = {
          tagName: tag,
          href: '',
          download: '',
          click: () => { clicked = true; }
        };
        return createdElement;
      },
      body: {
        appendChild: (_el) => { appended = true; },
        removeChild: (_el) => { removed = true; }
      }
    };

    const mockTailored = {
      candidate: { name: 'John A. Doe' },
      target_job: { company: 'Google Inc.' }
    };

    // 1. Default filename with sanitization
    const res1 = downloadAtsResumePdf(mockTailored);
    assert.equal(res1, true);
    assert.equal(clicked, true);
    assert.equal(appended, true);
    assert.equal(removed, true);
    assert.equal(revokedUrl, 'blob:http://localhost/mock-uuid');
    assert.equal(createdElement.tagName, 'a');
    assert.equal(createdElement.href, 'blob:http://localhost/mock-uuid');
    assert.equal(createdElement.download, 'John_A__Doe_Google_Inc__ATS_Resume.pdf');
    assert.equal(createdBlob.parts.length, 1);
    assert.ok(createdBlob.parts[0] instanceof Uint8Array);
    assert.equal(createdBlob.type, 'application/pdf');

    // 2. Custom filename
    const res2 = downloadAtsResumePdf(mockTailored, 'custom_resume.pdf');
    assert.equal(res2, true);
    assert.equal(createdElement.download, 'custom_resume.pdf');

    // 3. Fallback when candidate and target_job are empty
    const res3 = downloadAtsResumePdf({});
    assert.equal(res3, true);
    assert.equal(createdElement.download, 'Candidate_General_ATS_Resume.pdf');

    // 4. Error propagation and console.error logging
    const origConsoleError = console.error;
    let loggedErrorMsg = null;
    console.error = (msg) => { loggedErrorMsg = msg; };
    try {
      globalThis.document.createElement = () => { throw new Error('DOM Append Error'); };
      assert.throws(() => downloadAtsResumePdf({}), /DOM Append Error/);
      assert.equal(loggedErrorMsg, 'Failed to download ATS PDF resume:');
    } finally {
      console.error = origConsoleError;
    }
  } finally {
    globalThis.Blob = origBlob;
    globalThis.URL = origURL;
    globalThis.document = origDoc;
  }
});

test('downloadAtsResumePdf: gracefully handles Node/headless environment when document.body is undefined', () => {
  const origDoc = globalThis.document;
  try {
    globalThis.document = undefined;
    const res = downloadAtsResumePdf({ candidate: { name: 'Node Candidate' } });
    assert.equal(res, true);
  } finally {
    globalThis.document = origDoc;
  }
});

test('compileAtsPlainText: deep coverage of certifications, empty arrays, and edge cases', () => {
  // 1. Certifications with mixed objects and strings
  const certProfile = {
    candidate: { name: 'Certified Pro', phone: '123' },
    certifications: [
      { name: 'AWS Certified' },
      'Kubernetes CKA',
      { name: '' },
      null
    ]
  };
  const certText = compileAtsPlainText(certProfile);
  assert.ok(certText.includes('CERTIFICATIONS & CREDENTIALS\n============================\n* AWS Certified\n* Kubernetes CKA'));

  // 2. Empty arrays for all sections - verify no headers rendered
  const emptySections = {
    candidate: { name: 'Bare Minimum' },
    skills: [],
    work_history: [],
    projects: [],
    education: [],
    certifications: []
  };
  const emptyText = compileAtsPlainText(emptySections);
  assert.equal(emptyText, 'BARE MINIMUM');

  // 3. Work history without location & projects without bullets
  const workNoLoc = {
    candidate: { name: 'Dev' },
    work_history: [
      { role: 'Engineer', company: 'Startup', start_date: '2020', end_date: '2021', bullets: null }
    ],
    projects: [
      { name: 'Side App', tech_stack: 'Svelte', bullets: null }
    ],
    education: [
      { degree: 'B.S.', institution: 'MIT' } // no graduation_year
    ]
  };
  const workText = compileAtsPlainText(workNoLoc);
  assert.ok(workText.includes('Engineer | Startup (2020 - 2021)'));
  assert.ok(!workText.includes('Location:'));
  assert.ok(workText.includes('Side App [Svelte]'));
  assert.ok(workText.includes('B.S. - MIT'));

  // 4. Skills variants: matched-only and other-only
  const matchedOnly = compileAtsPlainText({
    candidate: { name: 'A' },
    skills: ['A'],
    matched_skills: ['A'],
    other_skills: []
  });
  assert.ok(matchedOnly.includes('Core Matched Competencies: A'));
  assert.ok(!matchedOnly.includes('Technical Proficiencies:'));

  const otherOnly = compileAtsPlainText({
    candidate: { name: 'B' },
    skills: ['B'],
    matched_skills: [],
    other_skills: ['B']
  });
  assert.ok(!otherOnly.includes('Core Matched Competencies:'));
  assert.ok(otherOnly.includes('Technical Proficiencies: B'));

  // 5. Certifications array with only invalid/falsy items
  const certEmpty = compileAtsPlainText({
    candidate: { name: 'C' },
    certifications: [null, '', { name: '' }]
  });
  assert.ok(!certEmpty.includes('CERTIFICATIONS & CREDENTIALS'));
});

test('generateAtsResumePdf: multi-line wrapping in skills and work history with empty section checks', () => {
  // 1. Long skills wrapping beyond line 1 and slicing beyond 20 items
  const wrappingSkillsProfile = {
    candidate: { name: 'Wrapped Candidate' },
    skills: ['AWS', 'Kubernetes'],
    other_skills: [
      'Docker', 'PostgreSQL', 'Redis', 'Kafka', 'Elasticsearch',
      'GraphQL', 'gRPC', 'CI/CD', 'Terraform', 'Prometheus',
      'Grafana', 'Linux', 'Python', 'Go', 'Rust',
      'TypeScript', 'React', 'Next.js', 'Vite', 'TailwindCSS',
      'SkillTwentyOneShouldBeSliced', 'SkillTwentyTwoShouldBeSliced'
    ],
    work_history: [
      {
        company: 'Cloud Corp',
        role: 'Staff Architect',
        bullets: [
          'Architected and executed global infrastructure migration across distributed multi-region Kubernetes clusters, cutting inter-region networking latency by 45% and reducing infrastructure overhead across all tier-1 services.'
        ]
      }
    ]
  };

  const pdfBytes = generateAtsResumePdf(wrappingSkillsProfile);
  const pdfStr = new TextDecoder('utf-8').decode(pdfBytes);

  // Skills slicing and continuation line verification
  assert.ok(pdfStr.includes('(Technical Proficiencies:) Tj'));
  assert.ok(pdfStr.includes('TailwindCSS'));
  assert.ok(!pdfStr.includes('SkillTwentyOneShouldBeSliced'));
  assert.ok(!pdfStr.includes('SkillTwentyTwoShouldBeSliced'));

  // Work history fallback date and wrapped continuation line verification
  assert.ok(pdfStr.includes('(2022 - Present) Tj'));
  assert.ok(pdfStr.includes('Architected and executed global infrastructure migration across distributed'));
  assert.ok(pdfStr.includes('reducing infrastructure overhead across all tier-1 services.'));

  // 2. Completely empty sections omitted
  const completelyEmpty = {
    candidate: { name: 'Empty Sections Candidate' },
    skills: [],
    work_history: [],
    projects: [],
    education: [],
    certifications: []
  };

  const emptyBytes = generateAtsResumePdf(completelyEmpty);
  const emptyStr = new TextDecoder('utf-8').decode(emptyBytes);
  assert.ok(!emptyStr.includes('(TECHNICAL SKILLS) Tj'));
  assert.ok(!emptyStr.includes('(PROFESSIONAL EXPERIENCE) Tj'));
  assert.ok(!emptyStr.includes('(KEY TECHNICAL PROJECTS) Tj'));
  assert.ok(!emptyStr.includes('(EDUCATION) Tj'));
  assert.ok(!emptyStr.includes('(CERTIFICATIONS & CREDENTIALS) Tj'));
});

test('generateAtsResumePdf: encodes bullets as WinAnsi \\225 without â€¢ UTF-8 corruption', async () => {
  const sample = {
    candidate: { name: 'René Candidate', email: 'rene@example.com' },
    work_history: [{
      role: 'Staff Engineer',
      company: 'Acme Corp',
      bullets: ['Led migration of microservices architecture (50% throughput gain)']
    }],
    certifications: ['AWS Certified Architect', 'CKA Kubernetes']
  };

  const pdfBytes = generateAtsResumePdf(sample);
  const pdfStr = new TextDecoder('latin1').decode(pdfBytes);

  // Raw PDF stream must contain \225 for bullet glyph
  assert.ok(pdfStr.includes('\\225'));
  // Raw PDF stream must NOT contain multi-byte UTF-8 bytes for bullet (0xE2 0x80 0xA2)
  assert.ok(!pdfStr.includes('\xE2\x80\xA2'));
  // Accented character in uppercase name should be escaped as WinAnsi octal \311
  assert.ok(pdfStr.includes('REN\\311'));
  // Verifies WinAnsi bullet operator exists
  assert.ok(pdfStr.includes('(\\225) Tj'));
  // Verifies bullet content is properly emitted
  assert.ok(pdfStr.includes('Led migration of microservices architecture'));
});

test('generateAtsResumePdf: renders all 6 template variants with distinctive styling', () => {
  const sample = {
    candidate: {
      name: 'Taylor Engineer',
      title: 'Principal Systems Architect',
      email: 'taylor@example.com',
      location: 'Seattle, WA'
    },
    summary: 'Seasoned architect with deep expertise in distributed systems.',
    skills: ['Rust', 'Go', 'Kubernetes'],
    matched_skills: ['Rust', 'Go'],
    other_skills: ['Kubernetes'],
    work_history: [{
      role: 'Principal Architect',
      company: 'AWS Cloud',
      start_date: '2020',
      end_date: 'Present',
      bullets: ['Scaled high-availability infrastructure across 12 availability zones.']
    }],
    education: [{
      institution: 'Stanford University',
      degree: 'B.S.',
      field_of_study: 'Computer Science',
      graduation_year: '2018'
    }]
  };

  // 1. latex variant
  const latexBytes = generateAtsResumePdf(sample, { pdfVariant: 'latex' });
  const latexStr = new TextDecoder('utf-8').decode(latexBytes);
  assert.ok(latexStr.startsWith('%PDF-1.4'));
  assert.ok(latexStr.includes('/F2 17 Tf')); // LaTeX name size 17
  assert.ok(latexStr.includes('(TAYLOR ENGINEER) Tj'));

  // 2. executive variant
  const execBytes = generateAtsResumePdf(sample, { pdfVariant: 'executive' });
  const execStr = new TextDecoder('utf-8').decode(execBytes);
  assert.ok(execStr.startsWith('%PDF-1.4'));
  assert.ok(execStr.includes('/F2 19 Tf')); // Executive name size 19
  assert.ok(execStr.includes('(TAYLOR ENGINEER) Tj'));

  // 3. creative variant
  const creativeBytes = generateAtsResumePdf(sample, { pdfVariant: 'creative' });
  const creativeStr = new TextDecoder('utf-8').decode(creativeBytes);
  assert.ok(creativeStr.startsWith('%PDF-1.4'));
  assert.ok(creativeStr.includes('(TAYLOR ENGINEER) Tj'));

  // 4. modern variant
  const modernBytes = generateAtsResumePdf(sample, { pdfVariant: 'modern' });
  const modernStr = new TextDecoder('utf-8').decode(modernBytes);
  assert.ok(modernStr.includes('/F2 18 Tf'));
  assert.ok(modernStr.includes('re\nf')); // Accent rectangle bar

  // 5. dense variant
  const denseBytes = generateAtsResumePdf(sample, { pdfVariant: 'dense' });
  const denseStr = new TextDecoder('utf-8').decode(denseBytes);
  assert.ok(denseStr.includes('/F2 16 Tf')); // Dense name size 16

  // 6. jakes / harvard standard variant (strict 0.5" 36pt margins, right-aligned dates & location)
  const jakesBytes = generateAtsResumePdf(sample, { pdfVariant: 'jakes' });
  const jakesStr = new TextDecoder('utf-8').decode(jakesBytes);
  assert.ok(jakesStr.startsWith('%PDF-1.4'));
  assert.ok(jakesStr.includes('/F2 18 Tf')); // 18pt bold centered name
  assert.ok(jakesStr.includes('(TAYLOR ENGINEER) Tj'));
  assert.ok(jakesStr.includes('(2020 - Present) Tj')); // Right-aligned date
  assert.ok(jakesStr.includes('(AWS Cloud) Tj'));
  assert.ok(jakesStr.includes('(\\225) Tj')); // Standard WinAnsi bullet
  assert.ok(jakesStr.includes('(Languages & Core Competencies:) Tj')); // Jake's skills label
  assert.ok(jakesStr.includes('(Frameworks & Developer Tools:) Tj'));
  assert.ok(jakesStr.includes('(Stanford University) Tj')); // Jake's 2-tier education school
  assert.ok(jakesStr.includes('(B.S. in Computer Science) Tj')); // Jake's 2-tier degree sub-line
});

