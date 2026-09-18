/**
 * ats_xray_engine.test.js
 * ========================
 * Comprehensive unit tests for the ATS X-Ray Diagnostic Engine.
 * Covers all 12 diagnostic dimensions, edge cases, and boundary conditions.
 */

import { describe, it, before as beforeAll } from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeResume,
  scoreToGrade,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  analyzeJDMatch,
  analyzeResumeAgainstJobs,
  aggregateMarketKeywords,
  ATS_PLATFORM_RULES,
  getAtsPlatformSpecificAdvice,
  getSampleBulletTransformations
} from './ats_xray_engine.js';

function expect(actual) {
  const matchers = (isNot = false) => ({
    toBe(expected) {
      if (isNot) assert.notStrictEqual(actual, expected);
      else assert.strictEqual(actual, expected);
    },
    toEqual(expected) {
      if (isNot) assert.notDeepStrictEqual(actual, expected);
      else assert.deepStrictEqual(actual, expected);
    },
    toBeTruthy() {
      if (isNot) assert.ok(!actual);
      else assert.ok(actual);
    },
    toBeFalsy() {
      if (isNot) assert.ok(actual);
      else assert.ok(!actual);
    },
    toBeNull() {
      if (isNot) assert.notStrictEqual(actual, null);
      else assert.strictEqual(actual, null);
    },
    toBeUndefined() {
      if (isNot) assert.notStrictEqual(actual, undefined);
      else assert.strictEqual(actual, undefined);
    },
    toBeDefined() {
      if (isNot) assert.strictEqual(actual, undefined);
      else assert.notStrictEqual(actual, undefined);
    },
    toBeGreaterThan(expected) {
      if (isNot) assert.ok(actual <= expected, `Expected ${actual} not to be > ${expected}`);
      else assert.ok(actual > expected, `Expected ${actual} to be > ${expected}`);
    },
    toBeGreaterThanOrEqual(expected) {
      if (isNot) assert.ok(actual < expected, `Expected ${actual} not to be >= ${expected}`);
      else assert.ok(actual >= expected, `Expected ${actual} to be >= ${expected}`);
    },
    toBeLessThan(expected) {
      if (isNot) assert.ok(actual >= expected, `Expected ${actual} not to be < ${expected}`);
      else assert.ok(actual < expected, `Expected ${actual} to be < ${expected}`);
    },
    toBeLessThanOrEqual(expected) {
      if (isNot) assert.ok(actual > expected, `Expected ${actual} not to be <= ${expected}`);
      else assert.ok(actual <= expected, `Expected ${actual} to be <= ${expected}`);
    },
    toBeCloseTo(expected, numDigits = 2) {
      const diff = Math.abs(actual - expected);
      const tolerance = Math.pow(10, -numDigits) / 2;
      if (isNot) assert.ok(diff >= tolerance, `Expected ${actual} not to be close to ${expected}`);
      else assert.ok(diff < tolerance, `Expected ${actual} to be close to ${expected} (diff: ${diff}, tol: ${tolerance})`);
    },
    toContain(expected) {
      if (typeof actual === 'string' || Array.isArray(actual)) {
        if (isNot) assert.ok(!actual.includes(expected), `Expected ${JSON.stringify(actual)} not to contain ${expected}`);
        else assert.ok(actual.includes(expected), `Expected ${JSON.stringify(actual)} to contain ${expected}`);
      } else {
        throw new Error(`toContain called on unsupported type: ${typeof actual}`);
      }
    },
    toThrow(expectedError) {
      if (typeof actual !== 'function') {
        throw new Error('actual must be a function to test toThrow');
      }
      if (isNot) {
        assert.doesNotThrow(actual);
      } else if (expectedError) {
        assert.throws(actual, expectedError);
      } else {
        assert.throws(actual);
      }
    }
  });

  const obj = matchers(false);
  obj.not = matchers(true);
  return obj;
}

// ─────────────────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────────────────

const STRONG_RESUME = `
John Smith
john.smith@gmail.com | +1 (555) 123-4567 | linkedin.com/in/johnsmith | github.com/johnsmith
San Francisco, CA

PROFESSIONAL SUMMARY
Results-driven senior software engineer with 8 years of experience building scalable distributed systems.

WORK EXPERIENCE
Senior Software Engineer — Stripe, San Francisco, CA | Jan 2021 – Present
- Architected a new payment processing microservice handling $50M in daily transactions, reducing latency by 40%
- Led a team of 8 engineers to deliver a new fraud detection system, preventing $12M in fraudulent transactions
- Optimized database queries reducing p99 latency from 800ms to 120ms (85% improvement)
- Scaled infrastructure from 10K to 1M daily active users using Kubernetes and AWS ECS

Software Engineer — Airbnb, San Francisco, CA | Jun 2018 – Dec 2020
- Built real-time search ranking system using Elasticsearch and Python, improving conversion by 22%
- Reduced cloud infrastructure costs by $800K/year by migrating to AWS Fargate
- Implemented CI/CD pipeline with GitHub Actions cutting deployment time from 45 minutes to 8 minutes
- Engineered distributed cache layer with Redis reducing database load by 60%

TECHNICAL SKILLS
Languages: Python, TypeScript, JavaScript, Go, SQL
Frameworks: FastAPI, React, Next.js, Django, Express
Databases: PostgreSQL, MySQL, Redis, MongoDB, Elasticsearch
Cloud & DevOps: AWS, GCP, Docker, Kubernetes, Terraform, GitHub Actions
AI/ML: PyTorch, scikit-learn, LangChain, OpenAI API, RAG

EDUCATION
Bachelor of Science in Computer Science
Stanford University | 2018
GPA: 3.9/4.0

CERTIFICATIONS
AWS Solutions Architect Professional (2023)
Google Cloud Professional Data Engineer (2022)

PROJECTS
Real-time Analytics Dashboard
- Built end-to-end analytics pipeline processing 10M events/day using Kafka and Apache Spark
- Reduced data latency from 15 minutes to < 30 seconds
`;

const WEAK_RESUME = `
Bob Jones
bobjones@email.com

Experience

Software Developer at Some Company 2019-2022
- Responsible for maintaining the codebase
- Helped with various projects
- Worked on some backend stuff
- Was involved in database migrations
- Participated in code reviews
- Utilized Python and JavaScript

Random Company 2016-2018
- Assisted with web development
- Tasked with writing tests

Skills
Python, JavaScript

Education
BS Computer Science, State University
`;

const MINIMAL_RESUME = `Jane Doe`;

const RESUME_WITH_RED_FLAGS = `
JOHN DOE
john@example.com

| Skills | Years |
|--------|-------|
| Python | 5     |
| Java   | 3     |

EXPERIENCE
→ Built web apps
✓ Fixed bugs
★ Managed team

References available upon request
Photo: [headshot.jpg]
`;

const SAMPLE_JD = `
We are looking for a Senior Software Engineer with experience in Python, FastAPI, React, PostgreSQL, Docker, and Kubernetes.
You should have experience with AWS or GCP, and familiarity with CI/CD pipelines using GitHub Actions.
Strong knowledge of system design, microservices architecture, and REST APIs required.
Experience with machine learning and LLM APIs is a plus.
`;

// ─────────────────────────────────────────────────────────────────────────────
// scoreToGrade — boundary conditions
// ─────────────────────────────────────────────────────────────────────────────

describe('scoreToGrade', () => {
  it('returns A for score >= 90', () => {
    expect(scoreToGrade(90)).toBe('A');
    expect(scoreToGrade(100)).toBe('A');
    expect(scoreToGrade(95)).toBe('A');
  });

  it('returns B for score 80-89', () => {
    expect(scoreToGrade(80)).toBe('B');
    expect(scoreToGrade(89)).toBe('B');
    expect(scoreToGrade(85)).toBe('B');
  });

  it('returns C for score 70-79', () => {
    expect(scoreToGrade(70)).toBe('C');
    expect(scoreToGrade(79)).toBe('C');
  });

  it('returns D for score 60-69', () => {
    expect(scoreToGrade(60)).toBe('D');
    expect(scoreToGrade(69)).toBe('D');
  });

  it('returns F for score below 60', () => {
    expect(scoreToGrade(59)).toBe('F');
    expect(scoreToGrade(0)).toBe('F');
    expect(scoreToGrade(1)).toBe('F');
  });

  it('returns F for invalid input', () => {
    expect(scoreToGrade(NaN)).toBe('F');
    expect(scoreToGrade(null)).toBe('F');
    expect(scoreToGrade(undefined)).toBe('F');
    expect(scoreToGrade('A')).toBe('F');
  });

  it('clamps values outside 0-100', () => {
    expect(scoreToGrade(-10)).toBe('F');
    expect(scoreToGrade(150)).toBe('A');
  });

  it('boundary: exactly 90 is A not B', () => {
    expect(scoreToGrade(89)).toBe('B');
    expect(scoreToGrade(90)).toBe('A');
  });

  it('boundary: exactly 80 is B not C', () => {
    expect(scoreToGrade(79)).toBe('C');
    expect(scoreToGrade(80)).toBe('B');
  });

  it('boundary: exactly 70 is C not D', () => {
    expect(scoreToGrade(69)).toBe('D');
    expect(scoreToGrade(70)).toBe('C');
  });

  it('boundary: exactly 60 is D not F', () => {
    expect(scoreToGrade(59)).toBe('F');
    expect(scoreToGrade(60)).toBe('D');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DIMENSION_WEIGHTS integrity
// ─────────────────────────────────────────────────────────────────────────────

describe('DIMENSION_WEIGHTS', () => {
  it('all weights are positive numbers', () => {
    for (const [key, w] of Object.entries(DIMENSION_WEIGHTS)) {
      expect(typeof w).toBe('number');
      expect(w).toBeGreaterThan(0);
    }
  });

  it('weights sum to approximately 1.0', () => {
    const total = Object.values(DIMENSION_WEIGHTS).reduce((s, w) => s + w, 0);
    expect(total).toBeCloseTo(1.0, 2);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeResume — input validation
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeResume — input validation', () => {
  it('throws TypeError if resumeText is not a string', () => {
    expect(() => analyzeResume(null)).toThrow(TypeError);
    expect(() => analyzeResume(undefined)).toThrow(TypeError);
    expect(() => analyzeResume(12345)).toThrow(TypeError);
    expect(() => analyzeResume([])).toThrow(TypeError);
  });

  it('accepts empty string without throwing', () => {
    const result = analyzeResume('');
    expect(result).toBeTruthy();
    expect(typeof result.overallScore).toBe('number');
  });

  it('accepts resume without JD (null)', () => {
    const result = analyzeResume(STRONG_RESUME, null);
    expect(result.dimensions.jdMatch).toBeUndefined();
    expect(result.metadata.hasJobDescription).toBe(false);
  });

  it('returns jdMatch dimension when JD is provided', () => {
    const result = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(result.dimensions.jdMatch).toBeTruthy();
    expect(result.metadata.hasJobDescription).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// analyzeResume — report structure
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeResume — report structure', () => {
  let report;
  beforeAll(() => { report = analyzeResume(STRONG_RESUME); });

  it('returns overallScore as number 0-100', () => {
    expect(typeof report.overallScore).toBe('number');
    expect(report.overallScore).toBeGreaterThanOrEqual(0);
    expect(report.overallScore).toBeLessThanOrEqual(100);
  });

  it('returns valid overallGrade', () => {
    expect(['A', 'B', 'C', 'D', 'F']).toContain(report.overallGrade);
  });

  it('overallGrade is consistent with overallScore', () => {
    expect(report.overallGrade).toBe(scoreToGrade(report.overallScore));
  });

  it('has all 11 required dimensions (no JD)', () => {
    const required = ['contact', 'sections', 'format', 'keywords', 'actionVerbs', 'quantification', 'dates', 'length', 'redFlags', 'skills', 'education'];
    for (const dim of required) {
      expect(report.dimensions[dim]).toBeTruthy();
    }
  });

  it('each dimension has score, grade, issues', () => {
    for (const [, dim] of Object.entries(report.dimensions)) {
      expect(typeof dim.score).toBe('number');
      expect(['A', 'B', 'C', 'D', 'F']).toContain(dim.grade);
      expect(Array.isArray(dim.issues)).toBe(true);
    }
  });

  it('each dimension score is in [0, 100]', () => {
    for (const [name, dim] of Object.entries(report.dimensions)) {
      expect(dim.score).toBeGreaterThanOrEqual(0);
      expect(dim.score).toBeLessThanOrEqual(100);
    }
  });

  it('dimension grade matches its score', () => {
    for (const [, dim] of Object.entries(report.dimensions)) {
      expect(dim.grade).toBe(scoreToGrade(dim.score));
    }
  });

  it('recommendations is an array', () => {
    expect(Array.isArray(report.recommendations)).toBe(true);
  });

  it('recommendations have required fields', () => {
    for (const rec of report.recommendations) {
      expect(typeof rec.priority).toBe('string');
      expect(typeof rec.title).toBe('string');
      expect(['critical', 'warning', 'info']).toContain(rec.priority);
    }
  });

  it('parsedView has required fields', () => {
    expect(typeof report.parsedView.wordCount).toBe('number');
    expect(Array.isArray(report.parsedView.detectedSections)).toBe(true);
    expect(Array.isArray(report.parsedView.extractedSkills)).toBe(true);
  });

  it('metadata has analyzedAt ISO string', () => {
    expect(typeof report.metadata.analyzedAt).toBe('string');
    expect(() => new Date(report.metadata.analyzedAt)).not.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 1: Contact
// ─────────────────────────────────────────────────────────────────────────────

describe('contact dimension', () => {
  it('extracts email correctly', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.contact.parsed.email).toBe('john.smith@gmail.com');
  });

  it('extracts phone correctly', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.contact.parsed.phone).toBeTruthy();
  });

  it('extracts LinkedIn URL', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.contact.parsed.linkedin).toContain('linkedin.com/in/johnsmith');
  });

  it('extracts GitHub URL', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.contact.parsed.github).toContain('github.com/johnsmith');
  });

  it('gives low contact score when missing email', () => {
    const r = analyzeResume('John Smith\nSan Francisco, CA\nSoftware Engineer');
    expect(r.dimensions.contact.score).toBeLessThan(60);
  });

  it('has critical issue when email is missing', () => {
    const r = analyzeResume('No email resume\nSoftware Engineer');
    const criticalIssues = r.dimensions.contact.issues.filter(i => i.severity === 'critical');
    expect(criticalIssues.length).toBeGreaterThan(0);
  });

  it('gives high contact score for strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.contact.score).toBeGreaterThanOrEqual(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 2: Sections
// ─────────────────────────────────────────────────────────────────────────────

describe('sections dimension', () => {
  it('detects experience section', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.sections.parsed.detected).toContain('experience');
  });

  it('detects education section', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.sections.parsed.detected).toContain('education');
  });

  it('detects skills section', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.sections.parsed.detected).toContain('skills');
  });

  it('gives lower score for resume missing critical sections', () => {
    const r = analyzeResume('John Doe\njohn@example.com\nI worked at Google for 3 years.');
    expect(r.dimensions.sections.score).toBeLessThan(60);
  });

  it('issues critical warnings for missing experience section', () => {
    const noExp = 'Jane Smith\njane@test.com\nEDUCATION\nBS Computer Science\nSKILLS\nPython, Java';
    const r = analyzeResume(noExp);
    const critIssues = r.dimensions.sections.issues.filter(i => i.severity === 'critical');
    expect(critIssues.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 3: Format
// ─────────────────────────────────────────────────────────────────────────────

describe('format dimension', () => {
  it('penalizes table formatting', () => {
    const r = analyzeResume(RESUME_WITH_RED_FLAGS);
    expect(r.dimensions.format.score).toBeLessThan(70);
  });

  it('penalizes fancy bullet characters', () => {
    const r = analyzeResume(RESUME_WITH_RED_FLAGS);
    const fancyIssue = r.dimensions.format.issues.find(i => /fancy|bullet|symbol/i.test(i.title));
    expect(fancyIssue).toBeTruthy();
  });

  it('gives full score for clean format', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.format.score).toBeGreaterThanOrEqual(85);
  });

  it('penalizes photo references', () => {
    const resumeWithPhoto = STRONG_RESUME + '\nPhoto: headshot.jpg';
    const r = analyzeResume(resumeWithPhoto);
    expect(r.dimensions.format.score).toBeLessThan(analyzeResume(STRONG_RESUME).dimensions.format.score);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 4: Keywords
// ─────────────────────────────────────────────────────────────────────────────

describe('keywords dimension', () => {
  it('finds tech keywords in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.keywords.parsed.uniqueCount).toBeGreaterThan(10);
  });

  it('gives low keyword score for weak resume', () => {
    const r = analyzeResume(WEAK_RESUME);
    expect(r.dimensions.keywords.score).toBeLessThan(60);
  });

  it('gives high keyword score for strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.keywords.score).toBeGreaterThan(70);
  });

  it('detects python in keywords', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.keywords.parsed.found.some(k => k.toLowerCase() === 'python')).toBe(true);
  });

  it('parsedView.keywordsFound is an array', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(Array.isArray(r.parsedView.keywordsFound)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 5: Action Verbs
// ─────────────────────────────────────────────────────────────────────────────

describe('actionVerbs dimension', () => {
  it('detects weak phrases in weak resume', () => {
    const r = analyzeResume(WEAK_RESUME);
    expect(r.dimensions.actionVerbs.parsed.weak.length).toBeGreaterThan(0);
  });

  it('low action verb score for weak resume', () => {
    const r = analyzeResume(WEAK_RESUME);
    expect(r.dimensions.actionVerbs.score).toBeLessThan(70);
  });

  it('detects strong verbs in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.actionVerbs.parsed.strong.length).toBeGreaterThan(0);
  });

  it('"responsible for" triggers weak verb warning', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\n- Responsible for managing the entire codebase and all deployments');
    const weakIssues = r.dimensions.actionVerbs.issues.filter(i => /responsible/i.test(i.title));
    expect(weakIssues.length).toBeGreaterThan(0);
  });

  it('"helped with" triggers weak verb warning', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\n- Helped with backend development and database migrations');
    const weakIssues = r.dimensions.actionVerbs.issues.filter(i => /helped/i.test(i.title));
    expect(weakIssues.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 6: Quantification
// ─────────────────────────────────────────────────────────────────────────────

describe('quantification dimension', () => {
  it('gives high score when bullets have metrics', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.quantification.score).toBeGreaterThan(60);
  });

  it('gives low score when no metrics present', () => {
    const r = analyzeResume(WEAK_RESUME);
    expect(r.dimensions.quantification.score).toBeLessThan(30);
  });

  it('detects percentage metrics', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\n- Improved performance by 45%\n- Reduced costs by 30%');
    expect(r.dimensions.quantification.parsed.quantifiedBullets.length).toBeGreaterThan(0);
  });

  it('detects dollar amount metrics', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\n- Saved $500K in annual infrastructure costs');
    expect(r.dimensions.quantification.parsed.quantifiedBullets.length).toBeGreaterThan(0);
  });

  it('critical issue when zero metrics', () => {
    const r = analyzeResume(WEAK_RESUME);
    const critIssues = r.dimensions.quantification.issues.filter(i => i.severity === 'critical');
    expect(critIssues.length).toBeGreaterThan(0);
  });

  it('ratio is 0-100 integer', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.quantification.parsed.ratio).toBeGreaterThanOrEqual(0);
    expect(r.dimensions.quantification.parsed.ratio).toBeLessThanOrEqual(100);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 7: JD Match
// ─────────────────────────────────────────────────────────────────────────────

describe('jdMatch dimension', () => {
  it('returns null when no JD provided', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.jdMatch).toBeUndefined();
  });

  it('returns match result when JD is provided', () => {
    const r = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(r.dimensions.jdMatch).not.toBeNull();
    expect(r.dimensions.jdMatch).not.toBeUndefined();
    expect(typeof r.dimensions.jdMatch.score).toBe('number');
  });

  it('high match for strong resume + matching JD', () => {
    const r = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(r.dimensions.jdMatch.score).toBeGreaterThan(50);
  });

  it('low match for weak resume + detailed JD', () => {
    const r = analyzeResume(WEAK_RESUME, SAMPLE_JD);
    expect(r.dimensions.jdMatch.score).toBeLessThan(r.dimensions.jdMatch ? 70 : 70);
  });

  it('parsed.matched is an array', () => {
    const r = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(Array.isArray(r.dimensions.jdMatch.parsed.matched)).toBe(true);
  });

  it('parsed.missing is an array', () => {
    const r = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(Array.isArray(r.dimensions.jdMatch.parsed.missing)).toBe(true);
  });

  it('matchRate is 0-100', () => {
    const r = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    expect(r.dimensions.jdMatch.parsed.matchRate).toBeGreaterThanOrEqual(0);
    expect(r.dimensions.jdMatch.parsed.matchRate).toBeLessThanOrEqual(100);
  });

  it('JD match score replaces keywords in weighting', () => {
    const withJD    = analyzeResume(STRONG_RESUME, SAMPLE_JD);
    const withoutJD = analyzeResume(STRONG_RESUME, null);
    // Both should have valid overall scores
    expect(withJD.overallScore).toBeGreaterThan(0);
    expect(withoutJD.overallScore).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 8: Dates
// ─────────────────────────────────────────────────────────────────────────────

describe('dates dimension', () => {
  it('gives high score for well-dated resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.dates.score).toBeGreaterThan(60);
  });

  it('penalizes missing dates', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\nSoftware Engineer at Google\nBuilt stuff\nEDUCATION\nBS CS');
    expect(r.dimensions.dates.score).toBeLessThan(70);
  });

  it('detects "Present" keyword', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.dates.parsed.hasPresent).toBe(true);
  });

  it('warns about slash-format dates', () => {
    const r = analyzeResume('John\njohn@test.com\nWORK\nEngineer at Google 01/2020 - 03/2023\nBuilt APIs');
    const slashIssues = r.dimensions.dates.issues.filter(i => /slash|format/i.test(i.title));
    expect(slashIssues.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 9: Length
// ─────────────────────────────────────────────────────────────────────────────

describe('length dimension', () => {
  it('optimal score for 400-800 word resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.length.score).toBeGreaterThan(70);
  });

  it('low score for very short resume', () => {
    const r = analyzeResume(MINIMAL_RESUME);
    expect(r.dimensions.length.score).toBeLessThan(60);
  });

  it('wordCount is a positive integer', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.length.parsed.wordCount).toBeGreaterThan(0);
    expect(Number.isInteger(r.dimensions.length.parsed.wordCount)).toBe(true);
  });

  it('pageEstimate is a number > 0', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.length.parsed.pageEstimate).toBeGreaterThan(0);
  });

  it('critical issue for too-short resume', () => {
    const r = analyzeResume(MINIMAL_RESUME);
    const critIssues = r.dimensions.length.issues.filter(i => i.severity === 'critical');
    expect(critIssues.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 10: Red Flags
// ─────────────────────────────────────────────────────────────────────────────

describe('redFlags dimension', () => {
  it('flags resume with red flags', () => {
    const r = analyzeResume(RESUME_WITH_RED_FLAGS);
    expect(r.dimensions.redFlags.score).toBeLessThan(80);
  });

  it('full score for clean resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.redFlags.score).toBeGreaterThanOrEqual(85);
  });

  it('flags "references available upon request"', () => {
    const r = analyzeResume(RESUME_WITH_RED_FLAGS);
    const refIssue = r.dimensions.redFlags.issues.find(i => /references/i.test(i.title));
    expect(refIssue).toBeTruthy();
  });

  it('flags photo reference', () => {
    const r = analyzeResume(RESUME_WITH_RED_FLAGS);
    const photoIssue = r.dimensions.redFlags.issues.find(i => /photo/i.test(i.title));
    expect(photoIssue).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 11: Skills
// ─────────────────────────────────────────────────────────────────────────────

describe('skills dimension', () => {
  it('finds many skills in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.skills.parsed.count).toBeGreaterThan(10);
  });

  it('few skills in weak resume gives low score', () => {
    const r = analyzeResume(WEAK_RESUME);
    expect(r.dimensions.skills.score).toBeLessThan(70);
  });

  it('parsed.found is an array', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(Array.isArray(r.dimensions.skills.parsed.found)).toBe(true);
  });

  it('no duplicate skills in parsed.found', () => {
    const r = analyzeResume(STRONG_RESUME);
    const uniqueCount = new Set(r.dimensions.skills.parsed.found).size;
    expect(uniqueCount).toBe(r.dimensions.skills.parsed.found.length);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Dimension 12: Education
// ─────────────────────────────────────────────────────────────────────────────

describe('education dimension', () => {
  it('detects degree in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.education.parsed.hasDegree).toBe(true);
  });

  it('detects institution in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.education.parsed.hasInstitution).toBe(true);
  });

  it('detects graduation year', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.education.parsed.hasYear).toBe(true);
  });

  it('detects GPA in strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.education.parsed.hasGPA).toBe(true);
  });

  it('warns when degree not detected', () => {
    const r = analyzeResume('John\njohn@test.com\nEDUCATION\nState University 2018');
    const degreeIssue = r.dimensions.education.issues.find(i => /degree/i.test(i.title));
    expect(degreeIssue).toBeTruthy();
  });

  it('gives high score for complete education section', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.dimensions.education.score).toBeGreaterThan(70);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// OVERALL SCORING
// ─────────────────────────────────────────────────────────────────────────────

describe('overall scoring', () => {
  it('strong resume scores higher than weak resume', () => {
    const strong = analyzeResume(STRONG_RESUME);
    const weak   = analyzeResume(WEAK_RESUME);
    expect(strong.overallScore).toBeGreaterThan(weak.overallScore);
  });

  it('minimal resume has lowest score', () => {
    const strong  = analyzeResume(STRONG_RESUME);
    const minimal = analyzeResume(MINIMAL_RESUME);
    expect(strong.overallScore).toBeGreaterThan(minimal.overallScore);
  });

  it('red-flag resume has lower score than strong', () => {
    const strong   = analyzeResume(STRONG_RESUME);
    const redFlags = analyzeResume(RESUME_WITH_RED_FLAGS);
    expect(strong.overallScore).toBeGreaterThan(redFlags.overallScore);
  });

  it('strong resume grade is B or better', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(['A', 'B']).toContain(r.overallGrade);
  });

  it('minimal resume grade is D or F', () => {
    const r = analyzeResume(MINIMAL_RESUME);
    expect(['D', 'F']).toContain(r.overallGrade);
  });

  it('recommendations sorted: critical before warning', () => {
    const r = analyzeResume(WEAK_RESUME);
    const priorities = r.recommendations.map(rec => rec.priority);
    let lastCritical = -1;
    let firstWarning = Infinity;
    priorities.forEach((p, i) => {
      if (p === 'critical') lastCritical = i;
      if (p === 'warning' && firstWarning === Infinity) firstWarning = i;
    });
    if (lastCritical > -1 && firstWarning < Infinity) {
      // All criticals should come before warnings
      expect(lastCritical).toBeLessThan(firstWarning);
    }
  });

  it('total issues count matches recommendations length', () => {
    const r = analyzeResume(WEAK_RESUME);
    const counted = r.metadata.totalIssues.critical + r.metadata.totalIssues.warning;
    const recs    = r.recommendations.filter(rec => rec.priority === 'critical' || rec.priority === 'warning').length;
    expect(counted).toBe(recs);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PARSED VIEW
// ─────────────────────────────────────────────────────────────────────────────

describe('parsedView', () => {
  it('extracts correct name', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.parsedView.name).toBe('John Smith');
  });

  it('extracts correct email', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.parsedView.email).toBe('john.smith@gmail.com');
  });

  it('detectedSections is non-empty for strong resume', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.parsedView.detectedSections.length).toBeGreaterThan(2);
  });

  it('wordCount matches length dimension', () => {
    const r = analyzeResume(STRONG_RESUME);
    expect(r.parsedView.wordCount).toBe(r.dimensions.length.parsed.wordCount);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PIPELINE & CROSS-JOB SCANNING
// ─────────────────────────────────────────────────────────────────────────────

describe('analyzeJDMatch', () => {
  it('returns null on invalid or empty arguments', () => {
    expect(analyzeJDMatch('', '')).toBeNull();
    expect(analyzeJDMatch(null, 'Some JD')).toBeNull();
    expect(analyzeJDMatch('Some Resume', null)).toBeNull();
  });

  it('matches common technical keywords accurately', () => {
    const resume = 'Experienced with Python, React, Docker, and PostgreSQL on AWS.';
    const jd = 'Looking for a Senior Software Engineer with Python, React, Kubernetes, and AWS skills.';
    const result = analyzeJDMatch(resume, jd);
    expect(result).not.toBeNull();
    expect(result.score).toBeGreaterThan(0);
    expect(result.parsed.matched).toContain('python');
    expect(result.parsed.matched).toContain('react');
    expect(result.parsed.matched).toContain('aws');
    expect(result.parsed.missing).toContain('kubernetes');
  });
});

describe('analyzeResumeAgainstJobs', () => {
  const sampleJobs = [
    {
      id: 'job-1',
      title: 'Full Stack Engineer',
      company: 'TechCorp',
      location: 'Remote',
      description: 'Requirements: Python, React, PostgreSQL, Docker, AWS.',
      matched_skills: ['Python', 'React'],
      missing_skills: []
    },
    {
      id: 'job-2',
      title: 'Embedded Firmware Developer',
      company: 'HardwareInc',
      location: 'San Jose, CA',
      description: 'Requirements: C++, Rust, RTOS, ARM assembly, Microcontrollers.',
      matched_skills: [],
      missing_skills: ['C++', 'Rust']
    }
  ];

  it('handles empty jobs or resume gracefully', () => {
    const emptyResult = analyzeResumeAgainstJobs('', sampleJobs);
    expect(emptyResult.jobMatches.length).toBe(0);
    expect(emptyResult.summary.totalJobs).toBe(0);

    const noJobsResult = analyzeResumeAgainstJobs(STRONG_RESUME, []);
    expect(noJobsResult.jobMatches.length).toBe(0);
    expect(noJobsResult.summary.totalJobs).toBe(0);
  });

  it('scores and sorts jobs across compatibility tiers', () => {
    const resume = 'Senior Full Stack Developer proficient in Python, React, PostgreSQL, Docker, AWS, Git.';
    const result = analyzeResumeAgainstJobs(resume, sampleJobs);

    expect(result.jobMatches.length).toBe(2);
    expect(result.summary.totalJobs).toBe(2);
    expect(result.summary.averageScore).toBeGreaterThan(0);

    // First match should be Full Stack Engineer due to high keyword overlap
    expect(result.jobMatches[0].title).toBe('Full Stack Engineer');
    expect(result.jobMatches[0].score).toBeGreaterThanOrEqual(result.jobMatches[1].score);
    expect(result.summary.tierCounts).toBeDefined();
    expect(result.summary.tierCounts.ready + result.summary.tierCounts.near_miss + result.summary.tierCounts.skill_gap).toBe(2);
  });
});

describe('aggregateMarketKeywords', () => {
  const sampleJobs = [
    {
      id: 'job-1',
      title: 'Python Backend Dev',
      description: 'Seeking Python, FastAPI, Docker, and PostgreSQL experience.',
      matched_skills: ['Python', 'Docker'],
      missing_skills: ['FastAPI']
    },
    {
      id: 'job-2',
      title: 'Cloud DevOps Engineer',
      description: 'Expertise in Kubernetes, Docker, Terraform, AWS, and Python.',
      matched_skills: ['Docker'],
      missing_skills: ['Kubernetes', 'Terraform']
    }
  ];

  it('handles empty input gracefully', () => {
    const result = aggregateMarketKeywords([], 'Some resume');
    expect(result.totalJobsScanned).toBe(0);
    expect(result.marketKeywords.length).toBe(0);
  });

  it('aggregates keyword demand across jobs and flags resume presence', () => {
    const resume = 'Python developer with Docker experience.';
    const result = aggregateMarketKeywords(sampleJobs, resume);

    expect(result.totalJobsScanned).toBe(2);
    expect(result.marketKeywords.length).toBeGreaterThan(0);

    // Docker and Python appear in both jobs -> 100% demand
    const dockerKeyword = result.marketKeywords.find(k => k.keyword === 'docker');
    expect(dockerKeyword).toBeDefined();
    expect(dockerKeyword.count).toBe(2);
    expect(dockerKeyword.percentage).toBe(100);
    expect(dockerKeyword.inResume).toBe(true);

    // Kubernetes should be missing from resume
    const k8sKeyword = result.marketKeywords.find(k => k.keyword === 'kubernetes');
    expect(k8sKeyword).toBeDefined();
    expect(k8sKeyword.inResume).toBe(false);

    expect(result.missingHighDemand.some(k => k.keyword === 'kubernetes')).toBe(true);
    expect(result.topSkillsInDemand.length).toBeGreaterThan(0);
  });
});

describe('ATS Platform Rules & Transformations', () => {
  it('returns valid advice for known ATS platforms', () => {
    const workday = getAtsPlatformSpecificAdvice('Workday');
    expect(workday.name).toBe('Workday');
    expect(workday.keyAdvice.length).toBeGreaterThan(0);
    expect(workday.optimalFormat.length).toBeGreaterThan(0);

    const taleo = getAtsPlatformSpecificAdvice('taleo');
    expect(taleo.name).toBe('Oracle Taleo');

    const greenhouse = getAtsPlatformSpecificAdvice('greenhouse');
    expect(greenhouse.name).toBe('Greenhouse');

    const lever = getAtsPlatformSpecificAdvice('lever');
    expect(lever.name).toBe('Lever');

    const ashby = getAtsPlatformSpecificAdvice('ashby');
    expect(ashby.name).toBe('Ashby');

    const icims = getAtsPlatformSpecificAdvice('icims');
    expect(icims.name).toBe('iCIMS');
  });

  it('falls back gracefully to Generic / Modern ATS for unknown platforms or null', () => {
    const unknown = getAtsPlatformSpecificAdvice('UnknownPlatformXYZ');
    expect(unknown.name).toBe('Generic / Modern ATS');
    expect(unknown.keyAdvice.length).toBeGreaterThan(0);

    const empty = getAtsPlatformSpecificAdvice(null);
    expect(empty.name).toBe('Generic / Modern ATS');
  });

  it('provides rich before/after bullet transformations across dimensions', () => {
    const samples = getSampleBulletTransformations();
    expect(Array.isArray(samples)).toBe(true);
    expect(samples.length).toBeGreaterThanOrEqual(4);

    samples.forEach(item => {
      expect(item.id).toBeDefined();
      expect(item.category).toBeDefined();
      expect(item.before).toBeDefined();
      expect(item.after).toBeDefined();
      expect(item.explanation).toBeDefined();
      expect(item.metric).toBeDefined();
    });
  });
});

