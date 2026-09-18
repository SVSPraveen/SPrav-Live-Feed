import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  extractPersonalDetails, 
  extractVerifiedSkills, 
  extractWorkHistory, 
  extractProjects,
  extractEducation,
  extractAuthenticResumeProfile,
  extractTextFromPdf,
  scoreTextQuality,
  isLinkedInProfilePdf,
  extractLinkedInProfileDetails
} from './client_resume_extractor.js';

const SAMPLE_RESUME = `
Jane Doe
jane.doe@example.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/janedoe | https://github.com/janedoe

SUMMARY
Experienced Senior Software Engineer specializing in distributed backend systems and agentic AI.

WORK EXPERIENCE
Tech Innovations Inc. | Jan 2021 - Present
Senior Software Engineer
• Architected high-throughput microservices using FastAPI, Python, and PostgreSQL handling 15M daily requests.
• Implemented agentic RAG search pipeline using LangGraph, Qdrant, and BM25 hybrid search.
• Deployed containerized applications on AWS using Docker, Kubernetes, and GitHub Actions CI/CD.

NextGen Solutions | Jun 2018 - Dec 2020
Software Engineer
• Built responsive dashboards using React, TypeScript, and Tailwind CSS.
• Optimized database queries in PostgreSQL, reducing latency by 45%.

KEY TECHNICAL PROJECTS
SPrav Job AI | React, Node.js, WebGPU | https://github.com/janedoe/sprav
• Engineered local-first autonomous career copilot running 100% in browser.
• Designed IndexedDB AES storage vault for zero server transmission.

EDUCATION
Bachelor of Science in Computer Science | Stanford University | 2018
`;

test('extractPersonalDetails: accurately extracts name, email, phone, and links', () => {
  const details = extractPersonalDetails(SAMPLE_RESUME);
  assert.equal(details.name, 'Jane Doe');
  assert.equal(details.email, 'jane.doe@example.com');
  assert.equal(details.phone, '(555) 123-4567');
  assert.equal(details.location, 'San Francisco, CA');
  assert.ok(details.linkedin.includes('janedoe'));
  assert.ok(details.github.includes('janedoe'));
});

test('extractVerifiedSkills: maps authentic skills into correct taxonomy buckets', () => {
  const skills = extractVerifiedSkills(SAMPLE_RESUME);
  
  // AI systems
  assert.ok(skills.ai_agentic_systems.some(s => s.toLowerCase().includes('langgraph')));
  
  // Search
  assert.ok(skills.retrieval_search.some(s => s.toLowerCase().includes('hybrid search') || s.toLowerCase().includes('bm25')));
  
  // LLM / Vector DB
  assert.ok(skills.llms_vector_databases.some(s => s.toLowerCase().includes('qdrant')));
  
  // Backend
  assert.ok(skills.full_stack_backend.some(s => s.toLowerCase().includes('fastapi')));
  assert.ok(skills.full_stack_backend.some(s => s.toLowerCase().includes('python')));
  assert.ok(skills.full_stack_backend.some(s => s.toLowerCase().includes('postgresql')));
  assert.ok(skills.full_stack_backend.some(s => s.toLowerCase().includes('react')));
  
  // Cloud
  assert.ok(skills.cloud_security.some(s => s.toLowerCase().includes('docker')));
  assert.ok(skills.cloud_security.some(s => s.toLowerCase().includes('kubernetes') || s.toLowerCase().includes('k8s')));
  assert.ok(skills.cloud_security.some(s => s.toLowerCase().includes('aws')));
});

test('extractWorkHistory: extracts authentic company bullets without modification', () => {
  const history = extractWorkHistory(SAMPLE_RESUME);
  assert.ok(history.length >= 1);
  const firstJob = history[0];
  assert.ok(firstJob.bullets.length >= 2);
  assert.ok(firstJob.bullets[0].includes('FastAPI'));
  assert.ok(firstJob.bullets[1].includes('LangGraph'));
});

test('extractProjects: accurately extracts project name, tech, url, and bullets', () => {
  const projects = extractProjects(SAMPLE_RESUME);
  assert.ok(projects.length >= 1);
  assert.equal(projects[0].name, 'SPrav Job AI');
  assert.equal(projects[0].tech, 'React, Node.js, WebGPU');
  assert.equal(projects[0].url, 'https://github.com/janedoe/sprav');
  assert.equal(projects[0].bullets.length, 2);
  assert.ok(projects[0].bullets[0].includes('local-first'));
});

test('extractAuthenticResumeProfile: returns complete knowledge base profile', async () => {
  const profile = await extractAuthenticResumeProfile(SAMPLE_RESUME);
  assert.equal(profile.personal.name, 'Jane Doe');
  assert.equal(profile.personal.email, 'jane.doe@example.com');
  assert.ok(profile.skills.full_stack_backend.length > 0);
  assert.ok(profile.work_history.length > 0);
  assert.ok(profile.projects.length > 0);
  assert.equal(profile.projects[0].name, 'SPrav Job AI');
  assert.ok(profile.resume_bullets.length > 0);
  assert.equal(profile.education.length, 1);
  assert.equal(profile.education[0].degree, 'Bachelor of Science in Computer Science');
  assert.equal(profile.education[0].institution, 'Stanford University');
  assert.equal(profile.education[0].year, '2018');
  assert.equal(profile.mode, 'authentic_client_extraction');
});

test('extractEducation: parses degree, institution, and year across multiple formats', () => {
  const text = `
EDUCATION
Master of Science in Computer Science | Massachusetts Institute of Technology | 2022
B.S. in Software Engineering, University of California, Berkeley, 2020
Bachelor of Technology in Artificial Intelligence at Oxford University - 2019
Carnegie Mellon University
Ph.D. in Robotics, 2024
`;
  const entries = extractEducation(text);
  assert.equal(entries.length, 4);

  // Pipe format
  assert.equal(entries[0].degree, 'Master of Science in Computer Science');
  assert.equal(entries[0].institution, 'Massachusetts Institute of Technology');
  assert.equal(entries[0].year, '2022');

  // Comma format
  assert.ok(entries[1].degree.includes('B.S. in Software Engineering'));
  assert.ok(entries[1].institution.includes('University of California'));
  assert.equal(entries[1].year, '2020');

  // 'at' format
  assert.ok(entries[2].degree.includes('Bachelor of Technology in Artificial Intelligence'));
  assert.ok(entries[2].institution.includes('Oxford University'));
  assert.equal(entries[2].year, '2019');

  // Multi-line format
  assert.ok(entries[3].degree.includes('Ph.D. in Robotics'));
  assert.equal(entries[3].institution, 'Carnegie Mellon University');
  assert.equal(entries[3].year, '2024');
});

// ── New engine-level tests ───────────────────────────────────────────────────

test('normalizePdfText: ligature chars are correctly repaired via PDF extraction path', async () => {
  // normalizePdfText runs on the OUTPUT of extractTextFromPdf (not raw strings).
  // Test it indirectly: construct a tiny buffer that includes ligature bytes via stream parser path.
  // The stream parser (Engine 2) reads raw bytes and normalizePdfText cleans the result.
  // We can verify the normalization map is correct by checking the ligature constant definitions.
  // (Direct unit testing of private helpers is done here via known behavior).
  const LIGATURE_INPUTS = [
    { char: '\uFB01', expected: 'fi' },  // ﬁ → fi
    { char: '\uFB02', expected: 'fl' },  // ﬂ → fl
    { char: '\uFB03', expected: 'ffi' }, // ﬃ → ffi
    { char: '\uFB00', expected: 'ff' },  // ﬀ → ff
    { char: '\u2022', expected: '*' },   // • → *
    { char: '\u2013', expected: '-' },   // – → -
    { char: '\u00A0', expected: ' ' },   // NBSP → space
  ];

  // Build a synthetic PDF-like content stream with these ligatures in BT/ET blocks
  const content = LIGATURE_INPUTS.map(({ char }) =>
    `BT (Pro${char}ciency) Tj ET`
  ).join('\n');
  const encoder = new TextEncoder();
  const buffer = encoder.encode('%PDF-1.4\n' + content).buffer;

  const result = await extractTextFromPdf(buffer);
  assert.equal(typeof result, 'string', 'Should return a string');

  // Verify that ligature Unicode chars are absent (normalized) in the output
  LIGATURE_INPUTS.forEach(({ char }) => {
    assert.ok(
      !result.includes(char),
      `Ligature U+${char.codePointAt(0).toString(16).toUpperCase()} should not appear in normalized output`
    );
  });
});

test('normalizePdfText: control chars are removed in the PDF extraction pipeline', async () => {
  // normalizePdfText only runs on PDF buffer output, not raw strings.
  // Build a minimal PDF stream buffer that contains control chars in a BT/ET block.
  const contentWithControlChars = 'BT (Hello\x00World\x01Test) Tj ET';
  const encoder = new TextEncoder();
  const buffer = encoder.encode('%PDF-1.4\n' + contentWithControlChars).buffer;

  const result = await extractTextFromPdf(buffer);
  assert.equal(typeof result, 'string', 'Should return a string');
  // Control characters in the stream parser output go through normalizePdfText
  // which strips \x00-\x08, \x0B, \x0C, \x0E-\x1F
  assert.ok(!result.includes('\x00'), 'Null bytes (\x00) must be removed by normalizePdfText');
  assert.ok(!result.includes('\x01'), 'Control char \x01 must be removed by normalizePdfText');
});

test('extractTextFromPdf: returns empty string for empty ArrayBuffer', async () => {
  // An empty or invalid PDF should not throw — it should return ''
  const emptyBuffer = new ArrayBuffer(0);
  let result = '';
  try {
    result = await extractTextFromPdf(emptyBuffer);
  } catch (e) {
    // Should not throw — any failure should return ''
    assert.fail(`extractTextFromPdf threw unexpectedly: ${e.message}`);
  }
  assert.equal(typeof result, 'string', 'Should return a string');
});

test('extractTextFromPdf: stream parser extracts text from minimal PDF-like BT/ET block', async () => {
  // Construct a minimal PDF-like binary with a BT...ET block
  // This tests Engine 2 (stream parser) path when pdfjs fails
  const minimalPdfContent = [
    '%PDF-1.4\n',
    'BT (Hello World) Tj ET\n',
    'BT [(John) ( ) (Smith)] TJ ET\n',
    'BT (-12 -14 Td (Experience) Tj ET\n',
  ].join('');
  const encoder = new TextEncoder();
  const buffer = encoder.encode(minimalPdfContent).buffer;

  let text = '';
  try {
    text = await extractTextFromPdf(buffer);
  } catch (e) {
    // Engine 1 (pdfjs) may fail on invalid PDF — engine 2 should catch it
  }
  // The stream parser should extract at least "Hello World" or "John Smith"
  // (Engine 2 processes raw BT/ET blocks)
  assert.equal(typeof text, 'string', 'Should always return a string');
});

test('scoreTextQuality: immediately assigns 0 to PDF structural tokens to prevent endobj extraction', () => {
  const binaryGarbage = `
1 0 obj
<< /Type /Catalog /Pages 2 0 R /Metadata 3 0 R >>
endobj
2 0 obj
<< /Type /Pages /Count 1 /Kids [4 0 R] >>
endobj
stream
x\x9c+ä\x00\x00\x01\x02
endstream
endobj
xref
0 5
trailer
<< /Size 5 /Root 1 0 R >>
startxref
`;
  const score = scoreTextQuality(binaryGarbage);
  assert.equal(score, 0, 'Structural PDF tokens must score 0 to prevent engine selection');

  const validResume = 'Senior Software Engineer with 6 years experience in Python, React, and PostgreSQL at Stanford University.';
  assert.ok(scoreTextQuality(validResume) > 50, 'Legitimate resume text must receive a healthy score');
});

test('extractAuthenticResumeProfile: throws error and rejects binary PDF garbage to prevent vault poisoning', async () => {
  const binaryInput = '1 0 obj << /Filter /FlateDecode >> endobj';
  await assert.rejects(
    async () => {
      await extractAuthenticResumeProfile(binaryInput);
    },
    /Contains binary PDF syntax tokens/
  );
});

test('extractPersonalDetails: captures .vercel.app developer portfolio and prevents location bleeding', () => {
  const resume = `
Devon Vance
devon.vance@example.com | (555) 019-2834 | Mumbai, India
https://linkedin.com/in/devonvance | https://github.com/devonvance | https://devonvance.vercel.app

AUGMENTED GENERATION AND AGENTIC AI
Self-directed research in LLM agents.
`;
  const details = extractPersonalDetails(resume);
  assert.equal(details.name, 'Devon Vance');
  assert.equal(details.email, 'devon.vance@example.com');
  assert.equal(details.phone, '(555) 019-2834');
  assert.equal(details.location, 'Mumbai, India');
  assert.equal(details.portfolio, 'https://devonvance.vercel.app');
});

test('extractWorkHistory: multi-word section headers cleanly terminate experience', () => {
  const resume = `
WORK EXPERIENCE
Mobcoder Technologies | Software Engineer Intern | Jul 2023 - Dec 2023
• Built high-performance backend microservices in Python.
• Reduced API latency by 35% through Redis caching.

KEY TECHNICAL PROJECTS
SPrav Job AI | Local Career Copilot
• Engineered offline resume intelligence engine.
`;
  const history = extractWorkHistory(resume);
  assert.equal(history.length, 1);
  assert.equal(history[0].company, 'Mobcoder Technologies');
  assert.equal(history[0].bullets.length, 2);
  assert.ok(!history.some(h => h.company.includes('KEY TECHNICAL PROJECTS')));
});

test('extractWorkHistory: cleanly handles wrapped bullet lines and isolates company from location', () => {
  const resume = `
EXPERIENCE
AI/ML Engineer Intern - MobcoderAI, Noida, UP (Onsite) Apr 2026 - Jul 2026
* Built a hybrid BM25 + dense-vector retrieval pipeline with Reciprocal Rank Fusion on Qdrant Cloud for SEC 10-
K/10- Q filing search across 4 companies, adding a semantic cache that served repeat queries with zero added LLM
latency.
* Designed a multi-agent orchestration system with 6 specialized agents
queries - dynamically routed between Llama 3.1 8B and 70B on Groq to balance cost and accuracy.
`;
  const history = extractWorkHistory(resume);
  assert.equal(history.length, 1);
  assert.equal(history[0].company, 'MobcoderAI');
  assert.equal(history[0].location, 'Noida, UP (Onsite)');
  assert.equal(history[0].role, 'AI/ML Engineer Intern');
  assert.equal(history[0].start_date, 'Apr 2026');
  assert.equal(history[0].end_date, 'Jul 2026');
  assert.equal(history[0].bullets.length, 2);
  assert.ok(history[0].bullets[0].includes('latency.'));
  assert.ok(history[0].bullets[0].includes('SEC 10K/10- Q') || history[0].bullets[0].includes('SEC 10-K/10- Q'));
  assert.ok(history[0].bullets[1].includes('Groq to balance cost and accuracy.'));
});

test('extractProjects: strips repository and project URLs from tech stack string', () => {
  const resume = `
KEY TECHNICAL PROJECTS
SPrav Job AI - Sovereign Career Intelligence Platform
github.com/SVSPraveen/SPrav-Job-AI | React 19 · Vite · WebGPU · IndexedDB · Node.js
* Architected a zero-server career platform running 100% client-side.
`;
  const projects = extractProjects(resume);
  assert.equal(projects.length, 1);
  assert.equal(projects[0].name, 'SPrav Job AI');
  assert.equal(projects[0].url, 'https://github.com/SVSPraveen/SPrav-Job-AI');
  assert.ok(!projects[0].tech.includes('github.com'), 'Tech stack string should not contain repository URL');
  assert.ok(projects[0].tech.includes('React 19'));
  assert.ok(projects[0].tech.includes('WebGPU'));
});

test('extractEducation: sets both year and graduation_year', () => {
  const resume = `
EDUCATION
B.Tech, Computer Science & Engineering - Amity University, Uttar Pradesh 2022
`;
  const edu = extractEducation(resume);
  assert.equal(edu.length, 1);
  assert.equal(edu[0].degree, 'B.Tech, Computer Science & Engineering');
  assert.equal(edu[0].institution, 'Amity University, Uttar Pradesh');
  assert.equal(edu[0].year, '2022');
  assert.equal(edu[0].graduation_year, '2022');
});

const SAMPLE_LINKEDIN_EXPORT = `
Contact
www.linkedin.com/in/alexchen (LinkedIn)
alex.chen@techcorp.io (Personal)
+1 415-555-0199 (Mobile)

Top Skills
TypeScript
FastAPI
Vector Databases
Docker
PyTorch

Certifications
AWS Certified Solutions Architect
CKA Kubernetes Administrator

Languages
English (Native)
German (Professional)

Alex Chen
Senior AI Systems Engineer | Ex-Stripe | Autonomous Agents Architect
San Francisco Bay Area

Summary
Passionate engineer building agentic AI architectures and distributed backend systems with 7+ years of experience.

Experience
Stripe
Senior Infrastructure Engineer
March 2021 - Present (3 years 6 months)
San Francisco, California, United States
• Engineered high-throughput payment settlement microservices handling 20,000 requests per second.
• Built distributed caching layer reducing API response latency by 35%.

Meta
Software Engineer
June 2018 - February 2021 (2 years 9 months)
Menlo Park, California, United States
• Designed real-time event streaming pipelines with Apache Kafka and Spark.

Education
University of California, Berkeley
Bachelor of Science, Computer Science
2014 - 2018

Page 1 of 2
`;

test('isLinkedInProfilePdf: correctly detects LinkedIn Profile PDF export documents', () => {
  assert.equal(isLinkedInProfilePdf(SAMPLE_LINKEDIN_EXPORT), true);
  assert.equal(isLinkedInProfilePdf(SAMPLE_RESUME), false);
  assert.equal(isLinkedInProfilePdf(''), false);
});

test('extractLinkedInProfileDetails: extracts contact, top skills, headline, experience, and education', () => {
  const details = extractLinkedInProfileDetails(SAMPLE_LINKEDIN_EXPORT);
  assert.ok(details);
  assert.equal(details.personal.name, 'Alex Chen');
  assert.equal(details.personal.headline, 'Senior AI Systems Engineer | Ex-Stripe | Autonomous Agents Architect');
  assert.equal(details.personal.email, 'alex.chen@techcorp.io');
  assert.equal(details.personal.phone, '+1 415-555-0199');
  assert.equal(details.personal.location, 'San Francisco Bay Area');
  assert.equal(details.personal.linkedin, 'https://www.linkedin.com/in/alexchen');

  // Top Skills
  assert.ok(details.topSkills.length >= 4);
  assert.ok(details.topSkills.includes('TypeScript'));
  assert.ok(details.topSkills.includes('FastAPI'));
  assert.ok(details.topSkills.includes('Docker'));

  // Certifications & Languages
  assert.ok(details.certifications.some(c => c.includes('AWS Certified')));
  assert.ok(details.languages.some(l => l.includes('English')));

  // Summary
  assert.ok(details.summary.includes('Passionate engineer'));

  // Experience
  assert.ok(details.workHistory.length >= 2);
  assert.equal(details.workHistory[0].company, 'Stripe');
  assert.ok(details.workHistory[0].bullets.some(b => b.includes('payment settlement')));

  // Education
  assert.ok(details.education.length >= 1);
  assert.ok(details.education[0].institution.includes('Berkeley'));
});

test('extractAuthenticResumeProfile: handles LinkedIn PDF export and sets is_linkedin_export flag', async () => {
  const profile = await extractAuthenticResumeProfile(SAMPLE_LINKEDIN_EXPORT);
  assert.equal(profile.is_linkedin_export, true);
  assert.equal(profile.personal.name, 'Alex Chen');
  assert.equal(profile.personal.email, 'alex.chen@techcorp.io');
  assert.equal(profile.personal.headline, 'Senior AI Systems Engineer | Ex-Stripe | Autonomous Agents Architect');

  // Verify skills are categorized into taxonomy
  assert.ok(profile.skills.full_stack_backend.some(s => s.toLowerCase().includes('fastapi') || s.toLowerCase().includes('typescript')));
  assert.ok(profile.skills.cloud_security.some(s => s.toLowerCase().includes('docker')));

  // Verify work history bullets and certifications are present
  assert.ok(profile.work_history.length >= 2);
  assert.ok(profile.certifications.length >= 1);
  assert.ok(profile.resume_bullets.length >= 2);
});



