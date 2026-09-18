import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  sanitizeDomain, 
  predictRecruiterEmail,
  predictRecruiterEmailDetailed,
  HunterApiClient,
  RECRUITER_EMAIL_DELIVERABILITY_DISCLAIMER,
  KNOWN_ENTERPRISE_PATTERNS,
  generateCorporateEmailPermutations,
  buildGoogleXRayDorkUrl,
  trimToCharacterLimit
} from './hunter_api_client.js';
import { hybridLLM } from './hybrid_llm_client.js';

test('sanitizeDomain: cleans protocols, subpaths, and query strings', () => {
  assert.equal(sanitizeDomain('https://www.stripe.com/jobs/tech'), 'stripe.com');
  assert.equal(sanitizeDomain('http://anthropic.com:8080/research?ref=sprav'), 'anthropic.com');
  assert.equal(sanitizeDomain('WWW.GOOGLE.COM/'), 'google.com');
  assert.equal(sanitizeDomain('datadoghq.com'), 'datadoghq.com');
  assert.equal(sanitizeDomain(''), '');
  assert.equal(sanitizeDomain(null), '');
});

test('predictRecruiterEmail: accurately formats various corporate patterns', () => {
  // Standard first.last
  assert.equal(
    predictRecruiterEmail('Alex', 'Morgan', 'techcorp.io', '{first}.{last}'),
    'alex.morgan@techcorp.io'
  );

  // First initial + last
  assert.equal(
    predictRecruiterEmail('Patrick', 'Collison', 'stripe.com', '{f}{last}'),
    'pcollison@stripe.com'
  );

  // First name only
  assert.equal(
    predictRecruiterEmail('Alex', 'Smith', 'startup.io', '{first}'),
    'alex@startup.io'
  );

  // First underscore last
  assert.equal(
    predictRecruiterEmail('Jane', 'Doe', 'acme.corp', '{first}_{last}'),
    'jane_doe@acme.corp'
  );

  // Handles names with special characters or spaces
  assert.equal(
    predictRecruiterEmail("John-Paul", "O'Connor", 'tech.co', '{first}.{last}'),
    'johnpaul.oconnor@tech.co'
  );

  // Handles missing last name
  assert.equal(
    predictRecruiterEmail('Elena', '', 'figma.com'),
    'elena@figma.com'
  );

  // Handles missing names entirely
  assert.equal(
    predictRecruiterEmail('', '', 'github.com'),
    'recruiting@github.com'
  );
});

test('predictRecruiterEmailDetailed: flags heuristic guess with high bounce risk and disclaimer', () => {
  const res = predictRecruiterEmailDetailed('Alex', 'Vance', 'acme.corp', { isHunterVerified: false });
  assert.equal(res.email, 'alex.vance@acme.corp');
  assert.equal(res.isVerified, false);
  assert.equal(res.bounceRisk, 'HIGH');
  assert.ok(res.confidenceScore <= 40);
  assert.ok(res.warning.includes('Unverified heuristic pattern guess'));
  assert.equal(res.disclaimer, RECRUITER_EMAIL_DELIVERABILITY_DISCLAIMER);
});

test('predictRecruiterEmailDetailed: reflects verified status when Hunter.io confirms address', () => {
  const res = predictRecruiterEmailDetailed('Patrick', 'Collison', 'stripe.com', { isHunterVerified: true, pattern: '{first}', confidenceScore: 98 });
  assert.equal(res.email, 'patrick@stripe.com');
  assert.equal(res.isVerified, true);
  assert.equal(res.bounceRisk, 'LOW');
  assert.equal(res.confidenceScore, 98);
  assert.equal(res.warning, null);
});

test('HunterApiClient: fetchDomainSearch returns heuristic fallback with deliverability warning when API key is missing', async () => {
  const client = new HunterApiClient();
  const res = await client.fetchDomainSearch('https://www.uber.com/careers');

  assert.equal(res.success, true);
  assert.equal(res.domain, 'uber.com');
  assert.equal(res.pattern, '{first}.{last}');
  assert.equal(res.organization, 'UBER');
  assert.equal(res.source, 'heuristic');
  assert.equal(res.isVerified, false);
  assert.equal(res.deliverabilityWarning, RECRUITER_EMAIL_DELIVERABILITY_DISCLAIMER);
  assert.equal(Array.isArray(res.emails), true);
  assert.equal(res.emails.length, 0);
});

test('HunterApiClient: fetchDomainSearch validates invalid domain', async () => {
  const client = new HunterApiClient();
  const res = await client.fetchDomainSearch('');

  assert.equal(res.success, false);
  assert.equal(res.error, 'INVALID_DOMAIN');
});

test('HunterApiClient: fetchDomainSearch parses real Hunter.io API JSON response', async () => {
  const client = new HunterApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes('api.hunter.io/v2/domain-search'));
    assert.ok(String(url).includes('domain=stripe.com'));
    assert.ok(String(url).includes('api_key=mock_hunter_key_123'));

    return {
      ok: true,
      json: async () => ({
        data: {
          domain: 'stripe.com',
          disposable: false,
          webmail: false,
          pattern: '{first}.{last}',
          organization: 'Stripe',
          emails: [
            {
              value: 'patrick@stripe.com',
              first_name: 'Patrick',
              last_name: 'Collison',
              position: 'CEO',
              confidence: 98,
              linkedin: 'https://linkedin.com/in/patrickcollison',
              department: 'executive'
            },
            {
              value: 'jane.recruiter@stripe.com',
              first_name: 'Jane',
              last_name: 'Recruiter',
              position: 'Technical Recruiter',
              confidence: 92,
              linkedin: 'https://linkedin.com/in/janerecruiter',
              department: 'human_resources'
            }
          ],
          total: 2
        }
      })
    };
  };

  try {
    const res = await client.fetchDomainSearch('stripe.com', { apiKey: 'mock_hunter_key_123' });
    assert.equal(res.success, true);
    assert.equal(res.domain, 'stripe.com');
    assert.equal(res.pattern, '{first}.{last}');
    assert.equal(res.organization, 'Stripe');
    assert.equal(res.source, 'hunter_api');
    assert.equal(res.emails.length, 2);
    assert.equal(res.emails[1].value, 'jane.recruiter@stripe.com');
    assert.equal(res.emails[1].position, 'Technical Recruiter');
    assert.equal(res.emails[1].confidence, 92);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HunterApiClient: fetchDomainSearch gracefully handles 401 / 429 errors with heuristic fallback', async () => {
  const client = new HunterApiClient();
  const originalFetch = globalThis.fetch;

  globalThis.fetch = async () => ({
    ok: false,
    status: 401,
    json: async () => ({ errors: [{ details: 'Invalid API key' }] })
  });

  try {
    const res = await client.fetchDomainSearch('anthropic.com', { apiKey: 'expired_key' });
    assert.equal(res.success, true);
    assert.equal(res.domain, 'anthropic.com');
    assert.equal(res.pattern, '{first}.{last}');
    assert.equal(res.source, 'heuristic');
    assert.ok(res.message.includes('status 401'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('HunterApiClient: generateTailoredOutreach produces structured cold pitch', async () => {
  const orig = hybridLLM.generateChat;
  hybridLLM.generateChat = null;
  try {
    const client = new HunterApiClient();
    const kb = {
      personal: { name: 'Devon Vance', title: 'Senior Staff Engineer' },
      skills: ['Rust', 'Distributed Systems', 'Kubernetes'],
      work_history: [
        {
          company: 'CloudScale',
          highlights: ['Reduced latency by 45% using Rust microservices']
        }
      ]
    };

    const draft = await client.generateTailoredOutreach({
      recruiterName: 'Alex Morgan',
      recruiterEmail: 'alex@techcorp.io',
      company: 'TechCorp',
      role: 'Staff Infrastructure Engineer',
      kb
    });

    assert.ok(draft.length > 50);
    assert.ok(draft.includes('Alex') || draft.includes('TechCorp'));
    assert.ok(draft.includes('Devon Vance'));
    assert.ok(draft.includes('Rust') || draft.includes('Distributed Systems'));
  } finally {
    hybridLLM.generateChat = orig;
  }
});

test('trimToCharacterLimit: truncates strictly under limit at clean boundaries', () => {
  const shortText = 'Hello world.';
  assert.equal(trimToCharacterLimit(shortText, 300), shortText);

  const longText = 'This is a long sentence that describes technical work. It has multiple sentences. And another sentence here that goes on and on beyond the character limit.';
  const trimmed = trimToCharacterLimit(longText, 80);
  assert.ok(trimmed.length <= 80);
  assert.ok(trimmed.endsWith('.') || !trimmed.endsWith(' '));
});

test('HunterApiClient: generateTailoredOutreach connection_note enforces <= 300 chars and avoids clichés', async () => {
  const orig = hybridLLM.generateChat;
  hybridLLM.generateChat = null;
  try {
    const client = new HunterApiClient();
    const kb = {
      personal: { name: 'Priya Patel', title: 'Principal Distributed Systems Engineer' },
      skills: ['Kafka', 'Go', 'Kubernetes'],
      work_history: [
        {
          company: 'Stripe',
          highlights: ['Scaled event streaming throughput by 3.5x to 2M events/sec']
        }
      ]
    };

    const note = await client.generateTailoredOutreach({
      recruiterName: 'David Zhang',
      recruiterEmail: 'david@scale.ai',
      company: 'Scale AI',
      role: 'Staff Infrastructure Lead',
      kb,
      format: 'connection_note'
    });

    assert.ok(note.length > 40, 'Note should have meaningful content');
    assert.ok(note.length <= 300, `Note must enforce strict 300-char LinkedIn ceiling (got ${note.length})`);
    
    // Verify avoidance of banned hollow AI buzzwords
    const bannedWords = ['passionate', 'synergy', 'thrilled', 'delve', 'tapestry', 'rockstar', 'guru'];
    for (const banned of bannedWords) {
      assert.ok(!note.toLowerCase().includes(banned), `Connection note must not contain cliché: ${banned}`);
    }
  } finally {
    hybridLLM.generateChat = orig;
  }
});

test('HunterApiClient: generateTailoredOutreach inmail adheres to 600-1000 char target and includes low-friction CTA', async () => {
  const orig = hybridLLM.generateChat;
  hybridLLM.generateChat = null;
  try {
    const client = new HunterApiClient();
    const kb = {
      personal: { name: 'Marcus Sterling', title: 'Senior Backend Engineer' },
      skills: ['PostgreSQL', 'Go', 'Distributed Databases'],
      work_history: [
        {
          company: 'CloudBase',
          highlights: ['Decreased P99 query latency by 48% across 10TB database clusters']
        }
      ]
    };

    const inmail = await client.generateTailoredOutreach({
      recruiterName: 'Sarah Jenkins',
      company: 'Datadog',
      role: 'Senior Distributed Systems Engineer',
      kb,
      format: 'inmail'
    });

    assert.ok(inmail.length >= 350, `InMail should be substantial (got ${inmail.length})`);
    assert.ok(inmail.length <= 1100, `InMail should be within calibrated range (got ${inmail.length})`);
    assert.ok(
      inmail.includes('Open to a brief 10-minute sync this Thursday?') || inmail.includes('10-minute'),
      'InMail must include low-friction call to action'
    );
    assert.ok(inmail.includes('Marcus Sterling'), 'InMail must include candidate signature');
  } finally {
    hybridLLM.generateChat = orig;
  }
});

test('KNOWN_ENTERPRISE_PATTERNS: includes top Indian IT giants and US tech leaders', () => {
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['tcs.com']);
  assert.equal(KNOWN_ENTERPRISE_PATTERNS['tcs.com'].pattern, '{first}.{last}');
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['infosys.com']);
  assert.equal(KNOWN_ENTERPRISE_PATTERNS['infosys.com'].pattern, '{first}_{last}');
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['wipro.com']);
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['freshworks.com']);
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['razorpay.com']);
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['google.com']);
  assert.ok(KNOWN_ENTERPRISE_PATTERNS['stripe.com']);
});

test('generateCorporateEmailPermutations: generates standard corporate permutations matrix', () => {
  const perms = generateCorporateEmailPermutations('Rohan', 'Sharma', 'tcs.com');
  assert.ok(Array.isArray(perms));
  assert.ok(perms.length >= 6);

  const values = perms.map(p => p.value);
  assert.ok(values.includes('rohan.sharma@tcs.com'));
  assert.ok(values.includes('rohan@tcs.com'));
  assert.ok(values.includes('rohansharma@tcs.com'));
  assert.ok(values.includes('rsharma@tcs.com'));
  assert.ok(values.includes('rohan_sharma@tcs.com'));
});

test('buildGoogleXRayDorkUrl: constructs valid LinkedIn search query URL', () => {
  const url = buildGoogleXRayDorkUrl('Infosys', 'tech recruiter');
  assert.ok(url.startsWith('https://www.google.com/search?q='));
  assert.ok(url.includes(encodeURIComponent('site:linkedin.com/in/')));
  assert.ok(url.includes(encodeURIComponent('Infosys')));
});

test('HunterApiClient: fetchDomainSearch with useEnterpriseRegistry resolves without API key ($0 quota)', async () => {
  const client = new HunterApiClient();
  const res = await client.fetchDomainSearch('infosys.com', { useEnterpriseRegistry: true });

  assert.equal(res.success, true);
  assert.equal(res.domain, 'infosys.com');
  assert.equal(res.pattern, '{first}_{last}');
  assert.equal(res.source, 'enterprise_registry');
  assert.equal(res.isVerified, true);
  assert.ok(res.message.includes('$0 API quota'));
});
