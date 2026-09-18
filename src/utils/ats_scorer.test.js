import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  scoreResume,
  analyzeResume,
  scoreToGrade,
  calculateKeywordFrequency,
  createEmptyAtsReport,
  DIMENSION_WEIGHTS,
  GRADE_THRESHOLDS,
  generateRoadmapTo100,
  applySingleIssueFix,
  autoOptimizeResumeTo100
} from './ats_scorer.js';

describe('ats_scorer: 12-Dimension ATS Diagnostic Scorer', () => {
  const realisticTechResume = `
Alex Morgan
alex.morgan@techmail.io | +1 (555) 987-6543 | linkedin.com/in/alexmorgan | github.com/alexmorgan
Seattle, WA

PROFESSIONAL SUMMARY
Senior Full Stack Architect with 8+ years of engineering experience architecting fault-tolerant microservices, high-throughput distributed systems, and real-time data pipelines. Spearheaded cloud modernization initiatives delivering 45% latency reductions and $1.2M annual AWS infrastructure savings.

TECHNICAL SKILLS
Languages: TypeScript, Python, JavaScript, Go, SQL, Bash
Frameworks: React, Next.js, Node.js, FastAPI, Express, Tailwind CSS
Databases: PostgreSQL, Redis, MongoDB, Elasticsearch
Cloud & DevOps: AWS (ECS, S3, RDS, Lambda), Docker, Kubernetes, Terraform, GitHub Actions
Architecture: Microservices, Event-Driven Architecture, GraphQL, REST APIs, CI/CD, Zero-Trust

WORK EXPERIENCE
Lead Systems Architect | CloudScale Technologies | Seattle, WA
Jan 2021 – Present
- Architected and deployed event-driven distributed microservices using Python, FastAPI, and Kafka, handling 50,000+ requests per second.
- Reduced p99 API response times by 48% by implementing Redis multi-tier caching and optimizing PostgreSQL indexing strategies.
- Spearheaded zero-downtime cloud migration of core monolith to AWS containerized ECS clusters with Terraform, cutting infrastructure overhead by $1.2M annually.
- Mentored a high-performing team of 8 senior and mid-level engineers in test automation, code review standards, and CI/CD pipelines.

Senior Full Stack Engineer | NexaDigital Corp | San Francisco, CA
Jun 2017 – Dec 2020
- Developed scalable customer-facing web applications using React, Next.js, and TypeScript, boosting daily active user retention by 34%.
- Engineered 15+ secure RESTful microservices with Node.js and Express, supporting 2.5M registered global users with 99.98% uptime.
- Automated end-to-end integration testing using GitHub Actions and Docker, reducing deployment cycle times from 3 hours to 8 minutes.
- Integrated Stripe billing and OAuth2 authentication protocols with strict zero-trust security compliance.

EDUCATION
Bachelor of Science in Computer Science
University of Washington | 2013 – 2017
Graduated Magna Cum Laude | GPA: 3.86 / 4.0
`;

  const sampleJobDescription = `
Nimbus Cloud is hiring a Senior Full Stack Architect in Seattle, WA.
Requirements:
- 5+ years of experience with TypeScript, Python, and Go.
- Proven experience with React, Next.js, FastAPI, and PostgreSQL.
- Strong knowledge of AWS, Docker, Kubernetes, Terraform, and CI/CD pipelines.
- Deep understanding of distributed microservices, Redis caching, and Kafka streaming.
- Bachelor's degree in Computer Science or equivalent practical experience.
`;

  describe('12 Diagnostic Dimensions Evaluation', () => {
    it('accurately evaluates all 12 dimensions on a high-quality technical resume', () => {
      const report = scoreResume(realisticTechResume, sampleJobDescription, { industry: 'tech' });
      assert.ok(report);
      assert.strictEqual(typeof report.overallScore, 'number');
      assert.ok(report.overallScore >= 75);
      assert.ok(['A', 'B'].includes(report.overallGrade));

      const dims = report.dimensions;
      assert.ok('contact' in dims);
      assert.ok('sections' in dims);
      assert.ok('format' in dims);
      assert.ok('keywords' in dims);
      assert.ok('actionVerbs' in dims);
      assert.ok('quantification' in dims);
      assert.ok('dates' in dims);
      assert.ok('length' in dims);
      assert.ok('redFlags' in dims);
      assert.ok('skills' in dims);
      assert.ok('education' in dims);
      assert.ok('jdMatch' in dims);

      // Dimension 1: Contact
      assert.ok(dims.contact.score >= 80);
      assert.strictEqual(report.parsedView.email, 'alex.morgan@techmail.io');
      assert.ok(report.parsedView.linkedin.includes('linkedin.com/in/alexmorgan'));

      // Dimension 2: Sections
      assert.ok(dims.sections.score >= 80);
      assert.ok(report.parsedView.detectedSections.includes('experience'));
      assert.ok(report.parsedView.detectedSections.includes('skills'));
      assert.ok(report.parsedView.detectedSections.includes('education'));

      // Dimension 4: Keywords & Dimension 10: Skills
      assert.ok(dims.skills.score >= 75);
      assert.ok(report.parsedView.extractedSkills.length > 5);

      // Dimension 5: Action Verbs
      assert.ok(dims.actionVerbs.score >= 75);
      assert.ok(report.parsedView.strongVerbs.length > 3);

      // Dimension 6: Quantification
      assert.ok(dims.quantification.score >= 60);
      assert.ok(report.parsedView.quantifiedBullets.length > 2);

      // Dimension 12: Job Description Match
      assert.ok(dims.jdMatch.score >= 70);
    });

    it('identifies missing critical sections and flags appropriate warnings', () => {
      const incompleteResume = `
Jane Doe
jane@doe.com
Summary: Developer who likes coding.
`;
      const report = scoreResume(incompleteResume);
      assert.ok(report.overallScore < 60);
      assert.ok(['D', 'F'].includes(report.overallGrade));
      assert.ok(report.dimensions.sections.parsed.missing.includes('experience'));
      assert.ok(report.dimensions.sections.parsed.missing.includes('education'));
      assert.ok(report.dimensions.sections.parsed.missing.includes('skills'));
    });

    it('detects passive verbs and weak phrases', () => {
      const passiveResume = `
John Smith | john@smith.com
WORK EXPERIENCE
Developer
- Was responsible for making buttons.
- Helped with the website and worked on bugs.
- Tasked with database maintenance.
- Participated in weekly meetings.
`;
      const report = scoreResume(passiveResume);
      assert.ok(report.dimensions.actionVerbs.parsed.weak.length >= 3);
      assert.ok(report.recommendations.some(r => r.dimension === 'actionVerbs'));
    });
  });

  describe('Keyword Frequency & Job Description Matching', () => {
    it('calculates keyword frequency distribution accurately', () => {
      const rText = 'Expert in Python, TypeScript, React, Docker, and PostgreSQL.';
      const jdText = 'Looking for Python and React developer with PostgreSQL and Kubernetes experience. Python is required.';
      const freq = calculateKeywordFrequency(rText, jdText);

      assert.ok(freq.totalJdKeywords > 0);
      assert.ok(freq.matchedCount > 0);
      assert.ok(freq.matchPercentage > 0);
      assert.ok(freq.matchPercentage <= 100);

      // 'python' is in both
      const pythonMatch = freq.matches.find(m => m.term === 'python');
      assert.ok(pythonMatch);
      assert.strictEqual(pythonMatch.matched, true);
      assert.strictEqual(pythonMatch.jdFrequency, 2);

      // 'kubernetes' is in JD but not resume
      const k8sMatch = freq.matches.find(m => m.term === 'kubernetes');
      assert.ok(k8sMatch);
      assert.strictEqual(k8sMatch.matched, false);
    });

    it('handles empty inputs for keyword frequency calculation safely', () => {
      assert.deepStrictEqual(calculateKeywordFrequency('', ''), {
        matches: [],
        totalJdKeywords: 0,
        matchedCount: 0,
        matchPercentage: 0
      });
      assert.deepStrictEqual(calculateKeywordFrequency(null, undefined), {
        matches: [],
        totalJdKeywords: 0,
        matchedCount: 0,
        matchPercentage: 0
      });
    });
  });

  describe('Edge Cases & Defensive Fault Tolerance', () => {
    it('handles empty string gracefully and returns safe Grade F report', () => {
      const report = scoreResume('');
      assert.strictEqual(report.overallScore, 0);
      assert.strictEqual(report.overallGrade, 'F');
      assert.strictEqual(report.metadata.isEmpty, true);
      assert.ok(report.recommendations.length > 0);
    });

    it('handles null and undefined input gracefully without throwing', () => {
      const reportNull = scoreResume(null);
      assert.strictEqual(reportNull.overallScore, 0);
      assert.strictEqual(reportNull.overallGrade, 'F');

      const reportUndef = scoreResume(undefined);
      assert.strictEqual(reportUndef.overallScore, 0);
      assert.strictEqual(reportUndef.overallGrade, 'F');
    });

    it('handles whitespace-only strings safely', () => {
      const report = scoreResume('     \n\t   \n  ');
      assert.strictEqual(report.overallScore, 0);
      assert.strictEqual(report.overallGrade, 'F');
    });

    it('handles special characters, code injection snippets, and emojis safely', () => {
      const specialText = `
🚀 Tech Lead 💻 | <script>alert("xss")</script> | dev@test.org
Special characters: & < > " ' / \\ % $ # @ ! * ( ) _ + = ~ \` { } [ ] : ; ? , .
Experience:
• Engineered 200+ microservices in C++ & C# with 99.999% uptime ⚡
`;
      const report = scoreResume(specialText);
      assert.ok(report);
      assert.strictEqual(typeof report.overallScore, 'number');
      assert.ok(report.overallScore >= 0);
      assert.ok(report.overallScore <= 100);
    });

    it('handles very large text inputs (>50,000 characters) without hanging', () => {
      const longResume = realisticTechResume.repeat(30);
      assert.ok(longResume.length > 50000);

      const startTime = Date.now();
      const report = scoreResume(longResume);
      const elapsed = Date.now() - startTime;

      assert.ok(report);
      assert.ok(elapsed < 1500); // Sub-second or near sub-second performance
      assert.ok(report.overallScore > 0);
    });
  });

  describe('Scoring Mathematics & Grade Thresholds', () => {
    it('verifies dimension weights sum to exactly 1.0', () => {
      const sum = Object.values(DIMENSION_WEIGHTS).reduce((acc, w) => acc + w, 0);
      assert.ok(Math.abs(sum - 1.0) < 0.001);
    });

    it('correctly maps scores to letter grades according to GRADE_THRESHOLDS', () => {
      assert.strictEqual(scoreToGrade(95), 'A');
      assert.strictEqual(scoreToGrade(90), 'A');
      assert.strictEqual(scoreToGrade(85), 'B');
      assert.strictEqual(scoreToGrade(80), 'B');
      assert.strictEqual(scoreToGrade(75), 'C');
      assert.strictEqual(scoreToGrade(70), 'C');
      assert.strictEqual(scoreToGrade(65), 'D');
      assert.strictEqual(scoreToGrade(60), 'D');
      assert.strictEqual(scoreToGrade(55), 'F');
      assert.strictEqual(scoreToGrade(0), 'F');
    });
  });

  describe('Roadmap to 100% & 1-Click Fix Engine', () => {
    const unoptimizedResume = `
Jane Doe
Seattle, WA

SUMMARY
Software engineer with experience in databases and web apps.

EXPERIENCE
Software Engineer at Example Corp
Jan 2021 - Present
★ responsible for backend microservices and databases
★ helped with React frontend features
★ worked on deployment scripts

EDUCATION
University of Washington
Jan 2017 - Dec 2020
`;

    const targetJD = `
Senior Software Engineer (Full Stack)
Requirements:
- Strong experience with Python, TypeScript, Docker, Kubernetes, AWS, PostgreSQL, Redis, Microservices
- Track record of leading distributed systems architecture and optimizing latency
- Experience collaborating with cross-functional teams
`;

    it('generates a structured roadmap to 100% with concrete points gains', () => {
      const report = scoreResume(unoptimizedResume, targetJD);
      const roadmap = generateRoadmapTo100(report, unoptimizedResume, targetJD);

      assert.ok(roadmap);
      assert.strictEqual(roadmap.targetScore, 100);
      assert.ok(roadmap.steps.length > 0);
      assert.ok(roadmap.steps[0].pointsGain > 0);
      assert.ok(roadmap.steps[0].whyItMatters);
      assert.ok(roadmap.steps[0].beforeAfter);
      assert.ok(roadmap.steps.some(s => s.category === 'Target JD Match'));
    });

    it('applies a single issue fix accurately to resume text', () => {
      const issue = {
        actionType: 'clean_formatting',
        dimension: 'format'
      };
      const cleaned = applySingleIssueFix('★ Built services\n→ Scaled DB', issue);
      assert.ok(!cleaned.includes('★'));
      assert.ok(!cleaned.includes('→'));
      assert.ok(cleaned.includes('- Built services'));

      const verbIssue = {
        actionType: 'replace_text',
        targetText: 'responsible for',
        replacementText: 'Led'
      };
      const verbFixed = applySingleIssueFix('- responsible for microservices', verbIssue);
      assert.ok(verbFixed.includes('Led microservices'));
      assert.ok(!verbFixed.includes('responsible for'));
    });

    it('automatically optimizes resume to high ATS compatibility in one pass', () => {
      const initialReport = scoreResume(unoptimizedResume, targetJD);
      const result = autoOptimizeResumeTo100(unoptimizedResume, initialReport, targetJD);

      assert.ok(result.optimizedText);
      assert.ok(result.changesApplied.length > 0);
      assert.ok(result.newScore >= initialReport.overallScore);
      assert.ok(!result.optimizedText.includes('★'));
      assert.ok(!result.optimizedText.includes('responsible for'));
      assert.ok(result.optimizedText.includes('TECHNICAL SKILLS'));
    });
  });
});

