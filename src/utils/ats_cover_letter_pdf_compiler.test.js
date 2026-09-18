import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getTextWidth,
  sanitizePdfText,
  escapePdfLiteral,
  wrapTextToLines,
  CoverLetterPdfDoc,
  compileCoverLetterPdf,
  createCoverLetterPdfBlob
} from './ats_cover_letter_pdf_compiler.js';

test('ats_cover_letter_pdf_compiler: text width and sanitization utilities', () => {
  assert.equal(getTextWidth('', 10), 0);
  assert.ok(getTextWidth('Hello World', 12) > 0);

  // Curly quotes and em-dashes sanitized to ASCII
  const raw = '“Hello” ‘World’ — test…';
  const clean = sanitizePdfText(raw);
  assert.ok(!clean.includes('“'));
  assert.ok(!clean.includes('”'));
  assert.ok(clean.includes('"Hello"'));
  assert.ok(clean.includes("'World'"));

  // PDF literal escaping
  const escaped = escapePdfLiteral('Test (nested) \\ backslash');
  assert.ok(escaped.includes('\\('));
  assert.ok(escaped.includes('\\)'));
  assert.ok(escaped.includes('\\\\'));
});

test('ats_cover_letter_pdf_compiler: wrapTextToLines wraps text cleanly within width', () => {
  const longText = 'Navigating the real-world trade-offs between delivery velocity and architectural stability is at the center of how I build. Scaling distributed systems requires disciplined observability.';
  const lines = wrapTextToLines(longText, 250, 10);
  assert.ok(lines.length >= 2, 'Should wrap into multiple lines');
  for (const line of lines) {
    assert.ok(getTextWidth(line, 10) <= 250, 'Every line must fit within max width');
  }
});

test('ats_cover_letter_pdf_compiler: compileCoverLetterPdf generates valid PDF 1.4 binary', () => {
  const sampleDoc = {
    candidateName: 'Alex Morgan',
    candidateTitle: 'Staff Distributed Systems Engineer',
    candidateEmail: 'alex.morgan@example.com',
    candidatePhone: '+1 (555) 234-5678',
    candidateLocation: 'San Francisco, CA',
    candidateLinkedin: 'linkedin.com/in/alexmorgan',
    candidateGithub: 'github.com/alexmorgan',
    date: 'September 12, 2026',
    recipientTitle: 'Engineering Leadership',
    recipientCompany: 'Stripe',
    recipientLocation: 'South San Francisco, CA',
    subject: 'Staff Infrastructure Engineer — Distributed Data Plane',
    salutation: 'Dear Stripe Engineering Team,',
    paragraphs: [
      'Scaling reliable platforms under strict low-latency constraints has been the primary focus of my systems work.',
      'In my recent work, I architected distributed streaming pipelines handling over 1.2M events per second with sub-50ms p99 latency.',
      'Stripe’s commitment to developer productivity and financial-grade reliability directly matches my engineering principles.',
      'I would welcome the opportunity to discuss your architectural priorities and how my background aligns with your roadmap.'
    ],
    signoff: 'Sincerely,'
  };

  const pdfBytes = compileCoverLetterPdf(sampleDoc, { theme: 'modern' });
  assert.ok(pdfBytes instanceof Uint8Array, 'Returns Uint8Array');
  assert.ok(pdfBytes.length > 500, 'PDF size should be non-trivial');

  const pdfString = new TextDecoder('latin1').decode(pdfBytes);
  assert.ok(pdfString.startsWith('%PDF-1.4'), 'Starts with %PDF-1.4 header');
  assert.ok(pdfString.includes('xref'), 'Contains xref table');
  assert.ok(pdfString.includes('trailer'), 'Contains trailer object');
  assert.ok(pdfString.includes('%%EOF'), 'Ends with %%EOF');
  assert.ok(pdfString.includes('/Type /Catalog'), 'Contains PDF catalog');
  assert.ok(pdfString.includes('/Type /Page'), 'Contains Page objects');
  assert.ok(pdfString.includes('Alex Morgan'), 'Includes candidate name');
  assert.ok(pdfString.includes('Stripe'), 'Includes recipient company');
});

test('ats_cover_letter_pdf_compiler: compiles classic and minimal themes without error', () => {
  const docData = {
    candidateName: 'Elena Rostova',
    candidateTitle: 'Lead Machine Learning Infrastructure Engineer',
    candidateEmail: 'elena@example.com',
    recipientCompany: 'Anthropic',
    paragraphs: [
      'Hardening high-throughput LLM inference clusters against real production failure modes requires measured discipline.',
      'I look forward to discussing your systems roadmap.'
    ]
  };

  const classicBytes = compileCoverLetterPdf(docData, { theme: 'classic' });
  assert.ok(classicBytes instanceof Uint8Array);
  const classicStr = new TextDecoder('latin1').decode(classicBytes);
  assert.ok(classicStr.includes('ELENA ROSTOVA'));

  const minimalBytes = compileCoverLetterPdf(docData, { theme: 'minimal' });
  assert.ok(minimalBytes instanceof Uint8Array);
  const minimalStr = new TextDecoder('latin1').decode(minimalBytes);
  assert.ok(minimalStr.includes('Elena Rostova'));
});

test('ats_cover_letter_pdf_compiler: handles empty or partial documents gracefully', () => {
  const emptyBytes = compileCoverLetterPdf({});
  assert.ok(emptyBytes instanceof Uint8Array);
  const emptyStr = new TextDecoder('latin1').decode(emptyBytes);
  assert.ok(emptyStr.startsWith('%PDF-1.4'));
  assert.ok(emptyStr.includes('%%EOF'));
});
