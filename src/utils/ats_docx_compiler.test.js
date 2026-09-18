import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeDocxText,
  rgbToHex,
  compileAtsResumeDocx,
  generateAtsResumeDocxBlob,
  downloadAtsResumeDocx
} from './ats_docx_compiler.js';
import { Document } from 'docx';

test('sanitizeDocxText: normalizes typographic entities and strips control chars', () => {
  assert.equal(sanitizeDocxText('“Smart Quotes” & ‘Single’'), '"Smart Quotes" & \'Single\'');
  assert.equal(sanitizeDocxText('Range: 2022–2025—Present…'), 'Range: 2022-2025-Present...');
  assert.equal(sanitizeDocxText(null), '');
  assert.equal(sanitizeDocxText(undefined), '');
});

test('rgbToHex: accurately converts 0-1 and 0-255 RGB arrays to 6-char hex', () => {
  assert.equal(rgbToHex([0, 0, 0]), '000000');
  assert.equal(rgbToHex([1, 1, 1]), 'FFFFFF');
  assert.equal(rgbToHex([0.145, 0.388, 0.921]), '2563EB'); // #2563EB
  assert.equal(rgbToHex([15, 23, 42]), '0F172A');
  assert.equal(rgbToHex(null), '1E293B');
});

test('compileAtsResumeDocx: compiles valid Document with full profile sections', () => {
  const mockTailored = {
    candidate: {
      name: 'Alex Morgan',
      title: 'Senior Distributed Systems Architect',
      email: 'alex@example.com',
      phone: '+1 (555) 019-2834',
      location: 'San Francisco, CA',
      linkedin: 'https://linkedin.com/in/alexmorgan',
      github: 'https://github.com/alexmorgan',
      portfolio: 'https://alexmorgan.dev'
    },
    summary: 'Experienced infrastructure engineer specializing in high-throughput distributed systems and Kubernetes.',
    skills: ['Go', 'Rust', 'Kubernetes', 'Docker', 'Kafka'],
    matched_skills: ['Go', 'Kubernetes', 'Kafka'],
    other_skills: ['Rust', 'Docker'],
    work_history: [
      {
        role: 'Staff Infrastructure Engineer',
        company: 'Cloudflare',
        location: 'Austin, TX',
        start_date: '2023',
        end_date: 'Present',
        bullets: [
          'Architected edge telemetry engine processing 4.2M events/sec with sub-10ms p99 latency.',
          'Reduced compute spend by $1.8M/yr through automated memory pooling.'
        ]
      }
    ],
    projects: [
      {
        name: 'Distributed Raft Consensus Engine',
        tech_stack: 'Rust, gRPC, Tokio',
        url: 'https://github.com/alexmorgan/raft-engine',
        bullets: [
          'Implemented Raft consensus algorithm supporting dynamic cluster membership changes.'
        ]
      }
    ],
    education: [
      {
        degree: 'B.S. in Computer Science',
        institution: 'University of California, Berkeley',
        graduation_year: '2021',
        gpa: '3.92'
      }
    ],
    certifications: [
      {
        name: 'Certified Kubernetes Administrator (CKA)',
        issuer: 'Linux Foundation',
        date: '2024'
      }
    ]
  };

  const doc = compileAtsResumeDocx(mockTailored, {
    accentColorHex: '2563EB',
    fontFamily: 'Calibri'
  });

  assert.ok(doc instanceof Document);
  assert.ok(doc.documentWrapper);
});

test('generateAtsResumeDocxBlob: returns non-empty binary blob', async () => {
  const mockResume = {
    candidate: { name: 'Elena Rostova', email: 'elena@example.com' },
    skills: ['Python', 'PyTorch', 'FastAPI'],
    work_history: [
      {
        role: 'Machine Learning Engineer',
        company: 'Anthropic',
        bullets: ['Fine-tuned frontier models for automated tool calling.']
      }
    ]
  };

  const blob = await generateAtsResumeDocxBlob(mockResume);
  assert.ok(blob);
  assert.ok(blob.size > 1000);
  assert.equal(blob.type, 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
});

test('downloadAtsResumeDocx: triggers DOM download link and enforces .docx extension', async () => {
  const origURL = globalThis.URL;
  const origDoc = globalThis.document;

  let clicked = false;
  let appended = false;
  let removed = false;
  let createdElement = null;

  globalThis.URL = {
    createObjectURL: () => 'blob:http://localhost/mock-docx-uuid',
    revokeObjectURL: () => {}
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
      appendChild: () => { appended = true; },
      removeChild: () => { removed = true; }
    }
  };

  try {
    const mockData = {
      candidate: { name: 'Sarah Connor' },
      target_job: { company: 'Cyberdyne Systems' }
    };

    // 1. Default filename formatting
    const res1 = await downloadAtsResumeDocx(mockData);
    assert.equal(res1.success, true);
    assert.equal(res1.filename, 'Sarah_Connor_Cyberdyne_Systems_ATS_Resume.docx');
    assert.equal(clicked, true);
    assert.equal(appended, true);
    assert.equal(removed, true);
    assert.equal(createdElement.download, 'Sarah_Connor_Cyberdyne_Systems_ATS_Resume.docx');

    // 2. Custom filename with .pdf replaced with .docx
    clicked = false;
    const res2 = await downloadAtsResumeDocx(mockData, 'custom_candidate.pdf');
    assert.equal(res2.success, true);
    assert.equal(res2.filename, 'custom_candidate.docx');
    assert.equal(createdElement.download, 'custom_candidate.docx');

    // 3. Fallback when candidate is missing
    const res3 = await downloadAtsResumeDocx({});
    assert.equal(res3.success, true);
    assert.equal(res3.filename, 'Candidate_General_ATS_Resume.docx');

  } finally {
    globalThis.URL = origURL;
    globalThis.document = origDoc;
  }
});

test('handles empty and omitted optional sections gracefully', async () => {
  const emptyResume = {};
  const doc = compileAtsResumeDocx(emptyResume, {
    includeSummary: false,
    includeProjects: false
  });
  assert.ok(doc instanceof Document);

  const blob = await generateAtsResumeDocxBlob(emptyResume);
  assert.ok(blob.size > 500);
});
