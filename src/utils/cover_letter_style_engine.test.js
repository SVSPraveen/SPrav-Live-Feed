import test from 'node:test';
import assert from 'node:assert/strict';
import {
  FORBIDDEN_AI_CLICHES,
  HUMAN_TRANSITION_MAP,
  HUMAN_OPENING_ARCHETYPES,
  humanizeAndSanitizeText,
  THEMATIC_BEATS,
  retrieveStyleAnchor,
  COVER_LETTER_TONES,
  buildThematicCoverLetterPrompt,
  buildThematicOutreachPrompt,
  generateThematicFallbackCoverLetter,
  analyzeWritingStyleMemory,
  formatCoverLetterDocument,
  formatCoverLetterAsMarkdown,
  formatCoverLetterAsPlainText,
  formatCoverLetterAsHtml,
  cleanCoverLetterParagraph
} from './cover_letter_style_engine.js';

test('cover_letter_style_engine: FORBIDDEN_AI_CLICHES lists critical corporate clichés', () => {
  assert.ok(FORBIDDEN_AI_CLICHES.includes('passionate'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('thrilled'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('synergy'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('delve'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('tapestry'));
});

test('retrieveStyleAnchor: selects correct exemplar archetype based on role and JD', () => {
  // 1. AI/ML -> Elena Rostova
  const aiAnchor = retrieveStyleAnchor('Staff AI Platform Engineer', 'PyTorch, CUDA kernel optimization, Slurm cluster');
  assert.equal(aiAnchor.exemplar.id, 'elena_rostova');
  assert.match(aiAnchor.styleAnchorSnippet, /Elena Rostova/);

  // 2. Frontend / Design Systems -> Marcus Chen
  const feAnchor = retrieveStyleAnchor('Senior Frontend Architect', 'React 19, Design Systems, WebGL, TypeScript');
  assert.equal(feAnchor.exemplar.id, 'marcus_chen');
  assert.match(aiAnchor.styleAnchorSnippet, /Triton|CUDA|Elena/);

  // 3. Distributed Systems / Backend (Default) -> SVS Praveen
  const backendAnchor = retrieveStyleAnchor('Senior Backend Engineer', 'Go, Apache Kafka, Raft consensus');
  assert.equal(backendAnchor.exemplar.id, 'alex_morgan');
  assert.match(backendAnchor.styleAnchorSnippet, /SVS Praveen/);
});

test('retrieveStyleAnchor: grounds narrative in behavioral STAR story bank', () => {
  const anchor = retrieveStyleAnchor('Infrastructure Lead', 'Incident response and handling production outages');
  assert.ok(anchor.starStory);
  assert.equal(anchor.starStory.competency, 'failure');
  assert.match(anchor.starStory.title, /Outage/i);
});

test('buildThematicCoverLetterPrompt: formats thematic beats, style anchor, and anti-cliché constraints', () => {
  const anchor = retrieveStyleAnchor('Staff Distributed Systems Engineer', 'Kafka and high-throughput pipelines');
  const prompt = buildThematicCoverLetterPrompt({
    candidateSummary: 'Staff engineer with 9 YOE building high-throughput payment rails.',
    companyName: 'Stripe',
    jobTitle: 'Staff Distributed Systems Engineer',
    jobRequirements: 'Scale event ingestion to 1M events/sec.',
    styleAnchor: anchor
  });

  assert.match(prompt, /Stripe/);
  assert.match(prompt, /Staff Distributed Systems Engineer/);
  assert.match(prompt, /4 THEMATIC BEATS/);
  assert.match(prompt, /Context & The Hook/);
  assert.match(prompt, /Technical Depth & Verified Metrics/);
  assert.match(prompt, /Problem Alignment & System Synergy/);
  assert.match(prompt, /Conversational Peer-to-Peer Close/);
  assert.match(prompt, /STYLE ANCHOR/);
  assert.match(prompt, /BAN ALL AI CLICHÉS/);
});

test('buildThematicCoverLetterPrompt: injects candidate persona title and career level into prompt opening', () => {
  const prompt = buildThematicCoverLetterPrompt({
    candidateSummary: 'Backend engineer specializing in distributed consensus.',
    companyName: 'Datadog',
    jobTitle: 'Senior Systems Engineer',
    jobRequirements: 'Distributed tracing at scale',
    candidateTitle: 'Distributed Systems Architect',
    careerLevel: 'Principal'
  });

  assert.match(prompt, /You are a Principal Distributed Systems Architect drafting an authentic/);
});

test('buildThematicOutreachPrompt: enforces 3-sentence constraint and low-friction call to action', () => {
  const prompt = buildThematicOutreachPrompt({
    recruiterName: 'Jordan Lee',
    company: 'Anthropic',
    role: 'AI Infrastructure Lead',
    topStrength: 'CUDA kernel acceleration and distributed training'
  });

  assert.match(prompt, /Jordan Lee/);
  assert.match(prompt, /Anthropic/);
  assert.match(prompt, /AI Infrastructure Lead/);
  assert.match(prompt, /Exactly 3 sentences/);
  assert.match(prompt, /under 65 words/);
  assert.match(prompt, /Zero corporate filler/);
});

test('generateThematicFallbackCoverLetter: produces 4 organic paragraphs without forbidden buzzwords', () => {
  const fallback = generateThematicFallbackCoverLetter({
    candidateSummary: 'Staff distributed systems engineer with 8 YOE in Rust and Kafka.',
    companyName: 'Datadog',
    jobTitle: 'Senior Infrastructure Engineer',
    jobRequirements: 'Real-time telemetry ingestion and time-series indexing.'
  });

  const paragraphs = fallback.split('\n\n').filter(Boolean);
  assert.equal(paragraphs.length, 4);

  // Verify none of the banned buzzwords appear in the fallback
  for (const word of FORBIDDEN_AI_CLICHES) {
    assert.equal(fallback.toLowerCase().includes(word.toLowerCase()), false, `Fallback should not contain "${word}"`);
  }

  assert.match(fallback, /Datadog/);
  assert.match(fallback, /Senior Infrastructure Engineer/);
});

test('generateThematicFallbackCoverLetter: produces 4 distinct architectural variants without repetition', () => {
  const params = {
    candidateSummary: 'Principal distributed systems engineer with 10 YOE in Go, Kafka, and Kubernetes.',
    companyName: 'Stripe',
    jobTitle: 'Staff Backend Infrastructure Engineer',
    jobRequirements: 'Scale high-throughput ledger rails with zero downtime.'
  };

  const variants = [0, 1, 2, 3].map(v => generateThematicFallbackCoverLetter({ ...params, variant: v }));

  // All 4 must be distinct strings
  const uniqueVariants = new Set(variants);
  assert.equal(uniqueVariants.size, 4, 'All 4 offline fallback variants must be distinct');

  for (const letter of variants) {
    const paragraphs = letter.split('\n\n').filter(Boolean);
    assert.equal(paragraphs.length, 4, 'Each variant must have exactly 4 organic paragraphs');
    assert.ok(letter.includes('Stripe'));
    assert.ok(letter.includes('Staff Backend Infrastructure Engineer'));
    for (const word of FORBIDDEN_AI_CLICHES) {
      assert.equal(letter.toLowerCase().includes(word.toLowerCase()), false);
    }
  }
});

test('analyzeWritingStyleMemory: synthesizes sample count and default Confident-Technical archetype', () => {
  // Baseline test with no letters and standard KB defaults:
  // 16 base exemplar anchors + 0 letters + 7 seed stories + 4 default bullets = 27 samples
  const defaultMemory = analyzeWritingStyleMemory([], null, []);
  assert.equal(defaultMemory.sampleCount, 27, 'Baseline memory should calibrate to 27 samples');
  assert.equal(defaultMemory.archetype, 'Confident-Technical');
  assert.ok(defaultMemory.traits.some(t => t.badge === 'Zero AI Clichés'));
  assert.ok(defaultMemory.traits.some(t => t.badge === 'High Burstiness'));
  assert.ok(defaultMemory.traits.some(t => t.badge === 'Peer-to-Peer'));
  assert.ok(defaultMemory.traits.some(t => t.badge === 'STAR Grounded'));
  assert.match(defaultMemory.summaryNarrative, /27 personal writing samples/);

  // Increments when user adds past letters
  const withLetters = analyzeWritingStyleMemory([
    { id: 'cl_1', paragraphs: { hook: 'First tailored hook' } },
    { id: 'cl_2', paragraphs: { hook: 'Second tailored hook' } }
  ], null, []);
  assert.equal(withLetters.sampleCount, 29);

  // Adapts archetype nuance based on candidate profile
  const mlProfile = analyzeWritingStyleMemory([], {
    personal: { title: 'Senior PyTorch & Deep Learning Engineer' },
    target_role: 'LLM Systems Architect',
    skills: ['PyTorch', 'CUDA', 'Triton', 'vLLM']
  });
  assert.equal(mlProfile.archetype, 'Confident-Technical (AI Systems)');

  const feProfile = analyzeWritingStyleMemory([], {
    personal: { title: 'Staff Frontend Engineer' },
    skills: ['React', 'TypeScript', 'Design Systems']
  });
  assert.equal(feProfile.archetype, 'Confident-Technical (Full-Stack)');
});

test('humanizer: FORBIDDEN_AI_CLICHES contains over 50 banned markers', () => {
  assert.ok(FORBIDDEN_AI_CLICHES.length >= 50, `Expected at least 50 banned clichés, found ${FORBIDDEN_AI_CLICHES.length}`);
  assert.ok(FORBIDDEN_AI_CLICHES.includes('delve'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('tapestry'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('spearheaded'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('passionate'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('synergy'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('testament'));
  assert.ok(FORBIDDEN_AI_CLICHES.includes('plethora'));
});

test('humanizer: humanizeAndSanitizeText strips AI preambles and code fences', () => {
  const rawWithPreamble = 'Certainly! Below is the cover letter you requested:\n\n```markdown\nIn my recent work at Scale...\n\n```';
  const cleaned = humanizeAndSanitizeText(rawWithPreamble);
  assert.equal(cleaned.includes('Certainly!'), false);
  assert.equal(cleaned.includes('Below is'), false);
  assert.equal(cleaned.includes('```'), false);
  assert.ok(cleaned.startsWith('In my recent work at Scale'));
});

test('humanizer: humanizeAndSanitizeText strips bracket tokens, salutations, and boilerplate sign-offs', () => {
  const textWithPlaceholders = `Dear Hiring Manager,

I am reaching out regarding the role at [Company Name]. My name is [Your Name] and you can reach me at [Phone].

In addition to this, I led the platform migration with zero downtime.

Sincerely,
[Your Name]`;

  const cleaned = humanizeAndSanitizeText(textWithPlaceholders);
  assert.equal(cleaned.includes('Dear Hiring Manager'), false);
  assert.equal(cleaned.includes('[Company Name]'), false);
  assert.equal(cleaned.includes('[Your Name]'), false);
  assert.equal(cleaned.includes('[Phone]'), false);
  assert.equal(cleaned.includes('Sincerely'), false);
  assert.ok(cleaned.includes('I led the platform migration with zero downtime.'));
});

test('humanizer: humanizeAndSanitizeText replaces robotic transitional markers with natural human bridges', () => {
  const textWithRoboticTransitions = `Moreover, our team doubled throughput.
Furthermore, we reduced memory leaks by 40%.
Consequently, system stability reached four nines.
In today's fast-paced environment, speed is essential.
Needless to say, automated testing caught every edge case.`;

  const cleaned = humanizeAndSanitizeText(textWithRoboticTransitions);
  assert.equal(/Moreover,/i.test(cleaned), false, 'Moreover should be replaced');
  assert.equal(/Furthermore,/i.test(cleaned), false, 'Furthermore should be replaced');
  assert.equal(/Consequently,/i.test(cleaned), false, 'Consequently should be replaced');
  assert.equal(/In today's fast-paced/i.test(cleaned), false, 'Cliché phrase should be replaced');
  assert.equal(/Needless to say,/i.test(cleaned), false, 'Needless to say should be replaced');

  // Verify human replacements were inserted
  assert.ok(cleaned.includes('Beyond that') || cleaned.includes('On top of that') || cleaned.includes('In practice'));
});

test('humanizer: humanizeAndSanitizeText removes banned AI buzzwords', () => {
  const buzzwordHeavy = 'I spearheaded a transformative initiative that served as a testament to our synergy. We delve into cutting-edge solutions seamlessly.';
  const cleaned = humanizeAndSanitizeText(buzzwordHeavy);

  assert.equal(/\bspearheaded\b/i.test(cleaned), false);
  assert.equal(/\btransformative\b/i.test(cleaned), false);
  assert.equal(/\btestament\b/i.test(cleaned), false);
  assert.equal(/\bsynergy\b/i.test(cleaned), false);
  assert.equal(/\bdelve\b/i.test(cleaned), false);
  assert.equal(/\bseamlessly\b/i.test(cleaned), false);
});

test('humanizer: generateThematicFallbackCoverLetter produces unique combinations across variants and seeds', () => {
  const letters = new Set();
  for (let i = 0; i < 10; i++) {
    const letter = generateThematicFallbackCoverLetter({
      candidateSummary: `Staff Systems Engineer variant ${i}`,
      companyName: `Company-${i}`,
      jobTitle: 'Principal SRE',
      jobRequirements: 'Distributed Consensus, Raft, eBPF',
      variant: i
    });
    letters.add(letter);
    assert.ok(letter.includes(`Company-${i}`));
    assert.equal(letter.split('\n\n').length, 4, 'Should have exactly 4 paragraphs');

    // Check zero banned AI buzzwords
    for (const badWord of ['passionate', 'thrilled', 'spearheaded', 'synergy', 'testament', 'delve']) {
      assert.equal(letter.toLowerCase().includes(badWord), false, `Fallback letter should not contain ${badWord}`);
    }
  }

  // Ensure procedural diversity (10 distinct letters generated)
  assert.equal(letters.size, 10, 'All 10 variants should be distinct');
});

test('humanizer: HUMAN_OPENING_ARCHETYPES provides 5 distinct hooks without generic templates', () => {
  assert.equal(HUMAN_OPENING_ARCHETYPES.length, 5);
  for (const hook of HUMAN_OPENING_ARCHETYPES) {
    const rendered = hook.build('Datadog', 'Observability Engineer', 'eBPF kernel tracing');
    assert.ok(rendered.includes('Datadog'));
    assert.equal(rendered.toLowerCase().includes('i am writing to apply'), false);
    assert.equal(rendered.toLowerCase().includes('passionate'), false);
  }
});

test('humanizer: buildThematicCoverLetterPrompt enforces Human Writing Protocol and burstiness', () => {
  const prompt = buildThematicCoverLetterPrompt({
    candidateSummary: 'Built real-time audio pipeline handling 100k streams',
    companyName: 'Spotify',
    jobTitle: 'Audio Infrastructure Lead',
    jobRequirements: 'C++, WebRTC, Low latency'
  });

  assert.ok(prompt.includes('THE HUMAN WRITING PROTOCOL'));
  assert.ok(prompt.includes('High Sentence Length Variation (Burstiness)'));
  assert.ok(prompt.includes('In-Media-Res Hook'));
  assert.ok(prompt.includes('Peer-to-Peer Tone'));
  assert.ok(prompt.includes('Strict Anti-Plagiarism'));
  assert.ok(prompt.includes('ABSOLUTELY FORBIDDEN WORDS/PHRASES'));
});

test('humanizer: buildThematicOutreachPrompt enforces 3-sentence constraint with zero buzzwords', () => {
  const prompt = buildThematicOutreachPrompt({
    recruiterName: 'Jordan',
    company: 'Anthropic',
    role: 'Compute Platform Engineer',
    topStrength: 'Slurm cluster GPU orchestration'
  });

  assert.ok(prompt.includes('Anthropic'));
  assert.ok(prompt.includes('Exactly 3 sentences'));
  assert.ok(prompt.includes('Strict anti-buzzword filter'));
});

test('COVER_LETTER_TONES: defines all 4 benchmark tones with salutations and directives', () => {
  assert.ok(COVER_LETTER_TONES.formal, 'Formal tone defined');
  assert.ok(COVER_LETTER_TONES.warm, 'Warm tone defined');
  assert.ok(COVER_LETTER_TONES.confident, 'Confident tone defined');
  assert.ok(COVER_LETTER_TONES.creative, 'Creative tone defined');

  assert.equal(typeof COVER_LETTER_TONES.formal.salutation, 'function');
  assert.match(COVER_LETTER_TONES.formal.salutation('Google'), /Google/);
  assert.equal(COVER_LETTER_TONES.formal.signoff, 'Sincerely,');

  assert.match(COVER_LETTER_TONES.warm.salutation('Slack'), /Slack/);
  assert.equal(COVER_LETTER_TONES.warm.signoff, 'Warm regards,');

  assert.match(COVER_LETTER_TONES.creative.signoff, /Cheers/);
});

test('buildThematicCoverLetterPrompt: incorporates selected tone profile', () => {
  const formalPrompt = buildThematicCoverLetterPrompt({
    candidateSummary: 'Backend engineer',
    companyName: 'Linear',
    jobTitle: 'Core Engineer',
    tone: 'formal'
  });
  assert.match(formalPrompt, /Formal Executive/);
  assert.match(formalPrompt, /executive gravitas/i);

  const creativePrompt = buildThematicCoverLetterPrompt({
    candidateSummary: 'Frontend engineer',
    companyName: 'Vercel',
    jobTitle: 'Design Engineer',
    tone: 'creative'
  });
  assert.match(creativePrompt, /Creative \/ Narrative/);
  assert.match(creativePrompt, /In-Media-Res Hook/);
});

test('generateThematicFallbackCoverLetter: yields distinct outputs per tone', () => {
  const formal = generateThematicFallbackCoverLetter({
    companyName: 'Apple',
    jobTitle: 'Kernel Engineer',
    tone: 'formal'
  });
  assert.match(formal, /submitting my qualifications/i);
  assert.match(formal, /architectural rigor/i);

  const warm = generateThematicFallbackCoverLetter({
    companyName: 'Apple',
    jobTitle: 'Kernel Engineer',
    tone: 'warm'
  });
  assert.match(warm, /mission-driven teams/i);
  assert.match(warm, /collaborative/i);

  const creative = generateThematicFallbackCoverLetter({
    companyName: 'Apple',
    jobTitle: 'Kernel Engineer',
    tone: 'creative'
  });
  assert.match(creative, /fail at the seams/i);
  assert.match(creative, /unconventional/i);
});

test('formatCoverLetterDocument: decomposes raw text and candidate metadata into structured document', () => {
  const raw = `Scaling distributed systems has defined my focus.

In my recent work, I improved p99 latency by 40%.

Stripe's infrastructure priorities align with my background.

I look forward to discussing your technical roadmap.`;

  const doc = formatCoverLetterDocument(
    raw,
    {
      personal: {
        name: 'Jordan Lee',
        title: 'Staff Platform Engineer',
        email: 'jordan@example.com',
        phone: '555-0199',
        location: 'Seattle, WA'
      }
    },
    {
      company: 'Stripe',
      title: 'Staff Infrastructure Engineer'
    },
    'formal'
  );

  assert.equal(doc.candidateName, 'Jordan Lee');
  assert.equal(doc.candidateTitle, 'Staff Platform Engineer');
  assert.equal(doc.recipientCompany, 'Stripe');
  assert.equal(doc.paragraphs.length, 4);
  assert.equal(doc.tone, 'formal');
  assert.match(doc.salutation, /Stripe/);
  assert.equal(doc.signoff, 'Sincerely,');
  assert.ok(doc.wordCount > 10);
});

test('clipboard exporters: generate valid Markdown, Plain Text, and HTML representations', () => {
  const sampleDoc = {
    candidateName: 'Morgan Smith',
    candidateTitle: 'Lead DevOps Specialist',
    candidateEmail: 'morgan@example.com',
    candidatePhone: '555-1234',
    candidateLocation: 'Austin, TX',
    candidateLinkedin: 'linkedin.com/in/morgansmith',
    candidateGithub: 'github.com/morgansmith',
    date: 'September 12, 2026',
    recipientTitle: 'Hiring Team',
    recipientCompany: 'Netflix',
    subject: 'Application for Lead Cloud Architect — Morgan Smith',
    salutation: 'Dear Netflix Hiring Team,',
    paragraphs: [
      'Automating cloud reliability is at the center of my technical focus.',
      'I look forward to discussing your infrastructure milestones.'
    ],
    signoff: 'Best regards,'
  };

  // 1. Markdown
  const md = formatCoverLetterAsMarkdown(sampleDoc);
  assert.match(md, /# Morgan Smith/);
  assert.match(md, /\*\*Lead DevOps Specialist\*\*/);
  assert.match(md, /Dear Netflix Hiring Team,/);

  // 2. Plain Text
  const text = formatCoverLetterAsPlainText(sampleDoc);
  assert.match(text, /Morgan Smith/);
  assert.match(text, /─{20,}/);
  assert.match(text, /Company: Netflix/);

  // 3. Rich HTML
  const html = formatCoverLetterAsHtml(sampleDoc);
  assert.match(html, /<h1[^>]*>Morgan Smith<\/h1>/);
  assert.match(html, /mailto:morgan@example\.com/);
  assert.match(html, /Netflix/);
  assert.match(html, /<p[^>]*>Automating cloud reliability/);
});

test('humanizeAndSanitizeText: removes salutation without consuming subsequent paragraph separation', () => {
  const input = "Dear Hiring Team,\n\nI am writing to express my enthusiasm for the Senior Backend Engineer role.\n\nOver the past five years, I designed distributed databases.";
  const sanitized = humanizeAndSanitizeText(input);
  assert.ok(!sanitized.includes('Dear Hiring Team'), 'Salutation must be stripped');
  assert.ok(sanitized.includes('\n\n'), 'Paragraph separation must be preserved');
  assert.ok(sanitized.startsWith('I am writing to express'), 'First paragraph text must start cleanly');
});

test('cleanCoverLetterParagraph: cleanly strips parenthetical prompt beat labels and bold markers', () => {
  const p1 = "**Paragraph 1 (Context & Hook):** Building high-throughput systems requires pragmatic architecture.";
  const p2 = "**Paragraph 2 (Technical Depth & Metrics):** At my previous role, I reduced latency by 42%.";
  const p3 = "**The Hook:** Distributed tracing was critical.";

  assert.equal(cleanCoverLetterParagraph(p1), 'Building high-throughput systems requires pragmatic architecture.');
  assert.equal(cleanCoverLetterParagraph(p2), 'At my previous role, I reduced latency by 42%.');
  assert.equal(cleanCoverLetterParagraph(p3), 'Distributed tracing was critical.');
});

test('generateThematicFallbackCoverLetter: creative tone replaces banned corporate word leverage with apply', () => {
  const letter = generateThematicFallbackCoverLetter({
    candidateSummary: 'Senior Systems Architect with 8 YOE in distributed systems.',
    companyName: 'Anthropic',
    jobTitle: 'Distributed Systems Architect',
    candidateKb: { skills: { full_stack_backend: ['Go', 'Kubernetes'] } },
    tone: 'creative'
  });

  assert.ok(!letter.toLowerCase().includes('leverage'), 'Creative fallback cover letter must not contain banned word leverage');
  assert.match(letter, /apply/i, 'Creative fallback cover letter must use apply');
});

test('formatCoverLetterAsHtml: escapes XSS payloads and strips javascript: URLs', () => {
  const xssDoc = {
    candidateName: '<script>alert("XSS")</script>John Doe',
    candidateTitle: '<b>Lead Engineer</b>',
    candidateEmail: 'john@example.com',
    candidateLinkedin: 'javascript:alert(1)',
    recipientTitle: '<img src=x onerror=alert(1)>Hiring Lead',
    recipientCompany: 'Acme Corp',
    paragraphs: ['<script>evil()</script>Normal paragraph text with <a href="#">link</a>']
  };

  const html = formatCoverLetterAsHtml(xssDoc);
  assert.ok(!html.includes('<script>'), 'Must not contain unescaped script tag');
  assert.ok(!html.includes('javascript:alert(1)'), 'Must not contain javascript: URL');
  assert.ok(!html.includes('<img src=x'), 'Must not contain unescaped img tag');
  assert.ok(html.includes('&lt;script&gt;alert'), 'Script must be escaped to &lt;script&gt;');
});


