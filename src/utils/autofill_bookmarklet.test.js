import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildCandidateAutofillPayload,
  detectAtsPlatform,
  sanitizeBookmarkletPayload,
  generateAutofillBookmarkletCode,
  executeAutofill
} from './autofill_bookmarklet.js';

const hadOriginalWindow = 'window' in globalThis;
const hadOriginalEvent = 'Event' in globalThis;

// Setup minimal browser mocks for Node test environment
if (!hadOriginalWindow) {
  globalThis.window = {
    HTMLInputElement: { prototype: { value: '' } },
    HTMLTextAreaElement: { prototype: { value: '' } }
  };
}
if (!hadOriginalEvent) {
  globalThis.Event = class Event {
    constructor(type, options) {
      this.type = type;
      this.bubbles = options?.bubbles ?? false;
    }
  };
}

/**
 * Creates a lightweight DOM mock element for testing selector queries and value setters.
 */
function createMockElement(tagName, attributes = {}) {
  const dispatchedEvents = [];
  const styles = {};

  const el = {
    tagName: tagName.toUpperCase(),
    type: attributes.type || (tagName === 'textarea' ? 'textarea' : tagName === 'select' ? 'select' : 'text'),
    value: attributes.value || '',
    name: attributes.name || '',
    id: attributes.id || '',
    placeholder: attributes.placeholder || '',
    checked: attributes.checked || false,
    disabled: false,
    options: attributes.options || [],
    selectedIndex: 0,
    style: {
      setProperty: (prop, val) => { styles[prop] = val; },
      border: '',
      boxShadow: '',
      borderColor: ''
    },
    getAttribute: (attr) => attributes[attr] || null,
    dispatchEvent: (ev) => { dispatchedEvents.push(ev.type); return true; },
    getDispatchedEvents: () => dispatchedEvents,
    getStyles: () => styles,
    closest: (selector) => null
  };

  return el;
}

function matchSelector(el, selector) {
  const s = selector.trim();
  // Comma-separated selectors
  if (s.includes(',')) {
    return s.split(',').some(part => matchSelector(el, part));
  }
  // Strip :not(...) pseudo-classes for element type check
  let baseSelector = s.replace(/:not\([^)]*\)/g, '').trim();

  // Tag name check
  const tagMatch = baseSelector.match(/^[a-zA-Z0-9_-]+/);
  if (tagMatch) {
    if (el.tagName.toLowerCase() !== tagMatch[0].toLowerCase()) return false;
  }

  // ID check
  const idMatch = baseSelector.match(/#([a-zA-Z0-9_-]+)/);
  if (idMatch) {
    if (el.id !== idMatch[1]) return false;
  }

  // Class check
  const classMatch = baseSelector.match(/\.([a-zA-Z0-9_-]+)/);
  if (classMatch) {
    const elClass = el.getAttribute('class') || '';
    if (!elClass.split(/\s+/).includes(classMatch[1])) return false;
  }

  // All attribute checks [attr=val], [attr*=val], [attr^=val], [attr]
  const attrRegex = /\[([a-zA-Z0-9_-]+)(?:([*^~|]?=)"([^"]*)")?\]/g;
  let attrMatch;
  let hasAttrChecks = false;
  while ((attrMatch = attrRegex.exec(baseSelector)) !== null) {
    hasAttrChecks = true;
    const attrName = attrMatch[1];
    const op = attrMatch[2];
    const expectedVal = attrMatch[3];

    let actualVal = attrName === 'id' ? el.id : (attrName === 'name' ? el.name : (attrName === 'placeholder' ? el.placeholder : el.getAttribute(attrName)));

    if (expectedVal === undefined) {
      // Just presence check
      if (actualVal == null) return false;
    } else {
      if (actualVal == null) return false;
      if (op === '*=' && !actualVal.includes(expectedVal)) return false;
      if (op === '^=' && !actualVal.startsWith(expectedVal)) return false;
      if (op === '=' && actualVal !== expectedVal) return false;
    }
  }

  return true;
}

function createMockContainer(elements = []) {
  return {
    querySelector: (selector) => {
      for (const el of elements) {
        if (matchSelector(el, selector)) return el;
      }
      return null;
    },
    querySelectorAll: (selector) => {
      return elements.filter(el => matchSelector(el, selector));
    }
  };
}

test('buildCandidateAutofillPayload: extracts and splits candidate profile correctly', () => {
  const mockKb = {
    name: 'Ada Lovelace',
    email: 'ada@computing.org',
    phone: '+1 555-0199',
    location: 'San Francisco, CA',
    linkedin: 'https://linkedin.com/in/adalovelace',
    github: 'https://github.com/adalovelace',
    portfolio: 'https://adalovelace.dev',
    work_history: [
      {
        company: 'Analytical Engines Inc',
        role: 'Staff Systems Architect',
        start_date: 'March 2021',
        end_date: 'Present',
        is_current: true,
        bullets: ['Architected computational flow pipelines', 'Reduced mechanical cycle latency by 45%']
      },
      {
        company: 'Punched Card Mechanics',
        role: 'Senior Engineer',
        start_date: 'June 2018',
        end_date: 'February 2021',
        bullets: ['Designed card feed verification firmware']
      }
    ],
    education: [
      { institution: 'Cambridge University', degree: 'B.S. Mathematics', start_year: '2014', end_year: '2018' }
    ],
    skills: ['Algorithms', 'Logic Design', 'Assembly']
  };

  const mockScope = {
    locations: ['Remote', 'San Francisco, CA'],
    target_salary: '$180,000'
  };

  const payload = buildCandidateAutofillPayload(mockKb, mockScope);

  assert.equal(payload.fullName, 'Ada Lovelace');
  assert.equal(payload.firstName, 'Ada');
  assert.equal(payload.lastName, 'Lovelace');
  assert.equal(payload.email, 'ada@computing.org');
  assert.equal(payload.phone, '+1 555-0199');
  assert.equal(payload.location, 'San Francisco, CA');
  assert.equal(payload.linkedin, 'https://linkedin.com/in/adalovelace');
  assert.equal(payload.github, 'https://github.com/adalovelace');
  assert.equal(payload.currentCompany, 'Analytical Engines Inc');
  assert.equal(payload.workAuth, 'Yes');
  assert.equal(payload.visaSponsorship, 'No');
  assert.equal(payload.salary, '$180,000');

  // Verify multi-entry work history and education
  assert.equal(payload.workHistory.length, 2);
  assert.equal(payload.workHistory[0].company, 'Analytical Engines Inc');
  assert.equal(payload.workHistory[0].title, 'Staff Systems Architect');
  assert.equal(payload.workHistory[0].isCurrent, true);
  assert.ok(payload.workHistory[0].description.includes('Architected computational flow pipelines'));
  assert.equal(payload.workHistory[1].company, 'Punched Card Mechanics');

  assert.equal(payload.education.length, 1);
  assert.equal(payload.education[0].school, 'Cambridge University');
  assert.equal(payload.education[0].degree, 'B.S. Mathematics');

  assert.ok(payload.yearsOfExperience >= 6, 'Years of experience calculated from history');
  assert.deepEqual(payload.skills, ['Algorithms', 'Logic Design', 'Assembly']);
});

test('buildCandidateAutofillPayload: handles overrides and empty fallbacks gracefully', () => {
  const payload = buildCandidateAutofillPayload({}, {}, {
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@navy.mil',
    salary: '$190,000',
    coverLetter: 'Dedicated engineer with compiler expertise.'
  });

  assert.equal(payload.firstName, 'Grace');
  assert.equal(payload.lastName, 'Hopper');
  assert.equal(payload.email, 'grace@navy.mil');
  assert.equal(payload.salary, '$190,000');
  assert.equal(payload.coverLetter, 'Dedicated engineer with compiler expertise.');
});

test('detectAtsPlatform: accurately identifies Workday, Greenhouse, Lever, and Ashby from DOM markers', () => {
  const wdEl = createMockElement('input', { 'data-automation-id': 'legalNameSection_firstName' });
  const wdContainer = createMockContainer([wdEl]);
  assert.equal(detectAtsPlatform(wdContainer), 'workday');

  const ghEl = createMockElement('form', { id: 'application_form' });
  const ghContainer = createMockContainer([ghEl]);
  assert.equal(detectAtsPlatform(ghContainer), 'greenhouse');

  const leverEl = createMockElement('form', { id: 'application-form' });
  const leverContainer = createMockContainer([leverEl]);
  assert.equal(detectAtsPlatform(leverContainer), 'lever');

  const ashbyEl = createMockElement('input', { name: '_systemfield_name' });
  const ashbyContainer = createMockContainer([ashbyEl]);
  assert.equal(detectAtsPlatform(ashbyContainer), 'ashby');

  const genericContainer = createMockContainer([createMockElement('input', { name: 'q' })]);
  assert.equal(detectAtsPlatform(genericContainer), 'generic');
});

test('generateAutofillBookmarkletCode: produces valid javascript: URI containing payload', () => {
  const payload = {
    firstName: 'Alan',
    lastName: 'Turing',
    email: 'alan@bletchley.org',
    linkedin: 'https://linkedin.com/in/alanturing',
    workHistory: [
      { company: 'Bletchley Park', title: 'Cryptanalyst Lead', description: 'Broke naval Enigma' }
    ]
  };

  const bookmarklet = generateAutofillBookmarkletCode(payload);

  assert.ok(bookmarklet.startsWith('javascript:'), 'Bookmarklet must start with javascript: scheme');
  assert.ok(bookmarklet.includes('Alan'), 'Bookmarklet code must encode candidate firstName');
  assert.ok(bookmarklet.includes('Turing'), 'Bookmarklet code must encode candidate lastName');
  assert.ok(bookmarklet.includes('Bletchley'), 'Bookmarklet code must encode workHistory');
  assert.ok(bookmarklet.includes('sprav-autofill-hud'), 'Bookmarklet must contain HUD element ID');
});

test('sanitizeBookmarkletPayload: strips salary, visa sponsorship, work auth, and notice period', () => {
  const sensitivePayload = {
    fullName: 'Ada Lovelace',
    email: 'ada@analytical.org',
    workAuth: 'Yes (Citizen)',
    visaSponsorship: 'No',
    noticePeriod: '2 weeks',
    salary: '$180,000 - $210,000',
    screeningAnswers: {
      workAuth: 'Yes',
      visaSponsorship: 'No',
      salary: '$180,000',
      noticePeriod: '2 weeks',
      yearsOfExperience: 8,
      relocation: 'Yes'
    }
  };

  const sanitized = sanitizeBookmarkletPayload(sensitivePayload);

  // Sensitive root fields must be stripped
  assert.equal(sanitized.salary, undefined);
  assert.equal(sanitized.visaSponsorship, undefined);
  assert.equal(sanitized.workAuth, undefined);
  assert.equal(sanitized.noticePeriod, undefined);

  // Sensitive screening answers must be stripped
  assert.equal(sanitized.screeningAnswers.salary, undefined);
  assert.equal(sanitized.screeningAnswers.visaSponsorship, undefined);
  assert.equal(sanitized.screeningAnswers.workAuth, undefined);
  assert.equal(sanitized.screeningAnswers.noticePeriod, undefined);

  // Non-sensitive fields must be preserved
  assert.equal(sanitized.fullName, 'Ada Lovelace');
  assert.equal(sanitized.email, 'ada@analytical.org');
  assert.equal(sanitized.screeningAnswers.yearsOfExperience, 8);
  assert.equal(sanitized.screeningAnswers.relocation, 'Yes');
});

test('generateAutofillBookmarkletCode: strips PII from generated javascript: URI to prevent cloud-sync leaks', () => {
  const sensitivePayload = {
    firstName: 'Grace',
    lastName: 'Hopper',
    email: 'grace@navy.mil',
    salary: '$195,000',
    visaSponsorship: 'Requires H1B Transfer',
    workAuth: 'Authorized with Visa',
    noticePeriod: 'Immediate 1 Month',
    screeningAnswers: {
      salary: '$195,000',
      visaSponsorship: 'Requires H1B Transfer'
    }
  };

  const bookmarklet = generateAutofillBookmarkletCode(sensitivePayload);

  // Professional identifiers must exist
  assert.ok(bookmarklet.includes('Grace'));
  assert.ok(bookmarklet.includes('Hopper'));
  assert.ok(bookmarklet.includes('grace%40navy.mil') || bookmarklet.includes('grace@navy.mil'));

  // Sensitive PII must NOT be baked into the encoded URI
  assert.ok(!bookmarklet.includes('$195,000'));
  assert.ok(!bookmarklet.includes('195%2C000'));
  assert.ok(!bookmarklet.includes('Requires%20H1B%20Transfer'));
  assert.ok(!bookmarklet.includes('Requires H1B Transfer'));
  assert.ok(!bookmarklet.includes('Immediate%201%20Month'));
  assert.ok(!bookmarklet.includes('Immediate 1 Month'));

  // Decoded bookmarklet JavaScript code must contain zero references to sensitive keys
  const decoded = decodeURIComponent(bookmarklet);
  assert.equal(decoded.includes('"salary"'), false);
  assert.equal(decoded.includes('p.salary'), false);
  assert.equal(decoded.includes('"visaSponsorship"'), false);
  assert.equal(decoded.includes('p.visaSponsorship'), false);
  assert.equal(decoded.includes('"workAuth"'), false);
  assert.equal(decoded.includes('p.workAuth'), false);
  assert.equal(decoded.includes('"noticePeriod"'), false);
  assert.equal(decoded.includes('p.noticePeriod'), false);
});

test('executeAutofill: populates Greenhouse form fields, employment rows, and dispatches input events', () => {
  const firstNameEl = createMockElement('input', { id: 'first_name', name: 'job_application[first_name]' });
  const lastNameEl = createMockElement('input', { id: 'last_name', name: 'job_application[last_name]' });
  const emailEl = createMockElement('input', { id: 'email', name: 'job_application[email]', type: 'email' });
  const phoneEl = createMockElement('input', { id: 'phone', name: 'job_application[phone]', type: 'tel' });
  const locationEl = createMockElement('input', { id: 'job_application_location', name: 'job_application[location]' });
  const linkedinEl = createMockElement('input', { name: 'job_application[answers][urls[LinkedIn]]' });
  const githubEl = createMockElement('input', { name: 'job_application[answers][urls[GitHub]]' });

  // Greenhouse employment history rows
  const ghEmployer1 = createMockElement('input', { name: 'job_application[employment][0][company_name]' });
  const ghTitle1 = createMockElement('input', { name: 'job_application[employment][0][job_title]' });
  const ghEmployer2 = createMockElement('input', { name: 'job_application[employment][1][company_name]' });
  const ghTitle2 = createMockElement('input', { name: 'job_application[employment][1][job_title]' });

  const container = createMockContainer([
    firstNameEl, lastNameEl, emailEl, phoneEl, locationEl, linkedinEl, githubEl,
    ghEmployer1, ghTitle1, ghEmployer2, ghTitle2
  ]);

  const payload = {
    firstName: 'Linus',
    lastName: 'Torvalds',
    email: 'linus@kernel.org',
    phone: '+1 503-555-0100',
    location: 'Portland, OR',
    linkedin: 'https://linkedin.com/in/linustorvalds',
    github: 'https://github.com/torvalds',
    workHistory: [
      { company: 'Linux Foundation', title: 'Chief Architect' },
      { company: 'Transmeta', title: 'Principal Software Engineer' }
    ]
  };

  const result = executeAutofill(container, payload);

  assert.ok(result.filledCount >= 9);
  assert.equal(firstNameEl.value, 'Linus');
  assert.equal(lastNameEl.value, 'Torvalds');
  assert.equal(emailEl.value, 'linus@kernel.org');
  assert.equal(phoneEl.value, '+1 503-555-0100');
  assert.equal(locationEl.value, 'Portland, OR');
  assert.equal(linkedinEl.value, 'https://linkedin.com/in/linustorvalds');
  assert.equal(githubEl.value, 'https://github.com/torvalds');

  // Verify Greenhouse work history injection
  assert.equal(ghEmployer1.value, 'Linux Foundation');
  assert.equal(ghTitle1.value, 'Chief Architect');
  assert.equal(ghEmployer2.value, 'Transmeta');
  assert.equal(ghTitle2.value, 'Principal Software Engineer');

  // Verify events
  assert.deepEqual(firstNameEl.getDispatchedEvents(), ['input', 'change', 'blur']);
  assert.deepEqual(emailEl.getDispatchedEvents(), ['input', 'change', 'blur']);
});

test('executeAutofill: populates Workday multi-entry work experience, education, and personal fields', () => {
  const fnEl = createMockElement('input', { 'data-automation-id': 'legalNameSection_firstName' });
  const lnEl = createMockElement('input', { 'data-automation-id': 'legalNameSection_lastName' });
  const phoneEl = createMockElement('input', { 'data-automation-id': 'phone-number' });
  const cityEl = createMockElement('input', { 'data-automation-id': 'addressSection_city' });

  // 2 Work Experience blocks in Workday
  const jobTitle1 = createMockElement('input', { 'data-automation-id': 'jobTitle' });
  const company1 = createMockElement('input', { 'data-automation-id': 'company' });
  const start1 = createMockElement('input', { 'data-automation-id': 'startDate' });
  const currCheck1 = createMockElement('input', { 'data-automation-id': 'currentlyWorkHere', type: 'checkbox' });
  const desc1 = createMockElement('textarea', { 'data-automation-id': 'description' });

  const jobTitle2 = createMockElement('input', { 'data-automation-id': 'jobTitle' });
  const company2 = createMockElement('input', { 'data-automation-id': 'company' });
  const start2 = createMockElement('input', { 'data-automation-id': 'startDate' });
  const end2 = createMockElement('input', { 'data-automation-id': 'endDate' });
  const desc2 = createMockElement('textarea', { 'data-automation-id': 'description' });

  // Workday Education
  const schoolEl = createMockElement('input', { 'data-automation-id': 'school' });
  const degreeEl = createMockElement('input', { 'data-automation-id': 'degree' });

  const container = createMockContainer([
    fnEl, lnEl, phoneEl, cityEl,
    jobTitle1, company1, start1, currCheck1, desc1,
    jobTitle2, company2, start2, end2, desc2,
    schoolEl, degreeEl
  ]);

  const payload = {
    firstName: 'Barbara',
    lastName: 'Liskov',
    phone: '+1 617-555-0188',
    location: 'Boston, MA',
    workHistory: [
      {
        company: 'MIT CSAIL',
        title: 'Institute Professor',
        startDate: '2008-01',
        isCurrent: true,
        description: 'Led research on distributed data types and consensus.'
      },
      {
        company: 'Laboratory for Computer Science',
        title: 'Associate Professor',
        startDate: '1990-09',
        endDate: '2007-12',
        isCurrent: false,
        description: 'Pioneered CLU and behavioral subtyping.'
      }
    ],
    education: [
      { school: 'Stanford University', degree: 'Ph.D. Computer Science' }
    ]
  };

  const result = executeAutofill(container, payload);

  assert.equal(result.platform, 'workday');
  assert.equal(fnEl.value, 'Barbara');
  assert.equal(lnEl.value, 'Liskov');
  assert.equal(phoneEl.value, '+1 617-555-0188');
  assert.equal(cityEl.value, 'Boston, MA');

  // Verify Workday Work Experience 1
  assert.equal(jobTitle1.value, 'Institute Professor');
  assert.equal(company1.value, 'MIT CSAIL');
  assert.equal(currCheck1.checked, true);
  assert.equal(desc1.value, 'Led research on distributed data types and consensus.');

  // Verify Workday Work Experience 2
  assert.equal(jobTitle2.value, 'Associate Professor');
  assert.equal(company2.value, 'Laboratory for Computer Science');
  assert.equal(desc2.value, 'Pioneered CLU and behavioral subtyping.');

  // Verify Workday Education
  assert.equal(schoolEl.value, 'Stanford University');
  assert.equal(degreeEl.value, 'Ph.D. Computer Science');
});

test('executeAutofill: populates Lever single-name field, org, URLs, and comments', () => {
  const nameEl = createMockElement('input', { name: 'name' });
  const emailEl = createMockElement('input', { name: 'email', type: 'email' });
  const phoneEl = createMockElement('input', { name: 'phone', type: 'tel' });
  const orgEl = createMockElement('input', { name: 'org' });
  const commentsEl = createMockElement('textarea', { name: 'comments' });

  const container = createMockContainer([nameEl, emailEl, phoneEl, orgEl, commentsEl]);

  const payload = {
    fullName: 'Guido van Rossum',
    email: 'guido@python.org',
    phone: '+1 650-555-0199',
    currentCompany: 'Python Software Foundation',
    coverLetter: 'Excited to contribute high-performance systems engineering.'
  };

  const result = executeAutofill(container, payload);

  assert.equal(result.filledCount, 5);
  assert.equal(nameEl.value, 'Guido van Rossum');
  assert.equal(emailEl.value, 'guido@python.org');
  assert.equal(orgEl.value, 'Python Software Foundation');
  assert.equal(commentsEl.value, 'Excited to contribute high-performance systems engineering.');
});

test('executeAutofill: populates Ashby system fields', () => {
  const nameEl = createMockElement('input', { name: '_systemfield_name' });
  const emailEl = createMockElement('input', { name: '_systemfield_email', type: 'email' });
  const phoneEl = createMockElement('input', { name: '_systemfield_phoneNumber', type: 'tel' });

  const container = createMockContainer([nameEl, emailEl, phoneEl]);

  const payload = {
    fullName: 'Margaret Hamilton',
    email: 'margaret@mit.edu',
    phone: '+1 617-555-0144'
  };

  const result = executeAutofill(container, payload);

  assert.equal(result.filledCount, 3);
  assert.equal(nameEl.value, 'Margaret Hamilton');
  assert.equal(emailEl.value, 'margaret@mit.edu');
  assert.equal(phoneEl.value, '+1 617-555-0144');
});

test('executeAutofill: populates screening question heuristics (years of experience, relocation, notice, salary)', () => {
  const workAuthSel = createMockElement('select', {
    name: 'work_authorization',
    options: [{ value: 'no', text: 'No' }, { value: 'yes', text: 'Yes, authorized' }]
  });
  const sponsorshipSel = createMockElement('select', {
    name: 'visa_sponsorship',
    options: [{ value: 'no', text: 'No sponsorship needed' }, { value: 'yes', text: 'Yes' }]
  });
  const noticeInput = createMockElement('input', { name: 'notice_period' });
  const salaryInput = createMockElement('input', { name: 'desired_salary' });
  const yearsExpInput = createMockElement('input', { name: 'total_years_of_experience' });
  const relocSel = createMockElement('select', {
    name: 'willing_to_relocate',
    options: [{ value: 'no', text: 'No' }, { value: 'yes', text: 'Yes' }]
  });

  const container = createMockContainer([
    workAuthSel, sponsorshipSel, noticeInput, salaryInput, yearsExpInput, relocSel
  ]);

  const payload = {
    workAuth: 'Yes',
    visaSponsorship: 'No',
    noticePeriod: '2 weeks',
    salary: '$160,000',
    yearsOfExperience: 8,
    relocation: 'Yes'
  };

  const result = executeAutofill(container, payload);

  assert.equal(workAuthSel.selectedIndex, 1);
  assert.equal(sponsorshipSel.selectedIndex, 0);
  assert.equal(noticeInput.value, '2 weeks');
  assert.equal(salaryInput.value, '$160,000');
  assert.equal(yearsExpInput.value, '8');
  assert.equal(relocSel.selectedIndex, 1);
  assert.equal(result.filledCount, 6);
});

test('executeAutofill: safely handles null or empty root nodes', () => {
  const res1 = executeAutofill(null, { firstName: 'Test' });
  assert.equal(res1.filledCount, 0);

  const res2 = executeAutofill({}, null);
  assert.equal(res2.filledCount, 0);
});

test('generateAutofillBookmarkletCode: neutralizes self-XSS payloads in candidate profile fields', () => {
  const maliciousPayload = {
    fullName: '<img onerror=alert(1)>',
    email: 'evil" autofocus onfocus=alert(2) x="',
    phone: '<script>alert(3)</script>',
    linkedin: 'javascript:alert(4)'
  };
  const code = generateAutofillBookmarkletCode(maliciousPayload);
  assert.ok(code.startsWith('javascript:'));
  const decoded = decodeURIComponent(code.slice('javascript:'.length));
  // Ensure </script> is escaped in serialized payload
  assert.ok(!decoded.includes('</script>'));
  // Ensure DOM uses textContent and safe tray buttons rather than injecting raw HTML
  assert.ok(decoded.includes('addCopyBtn'));
  assert.ok(decoded.includes('sprav-copy-tray'));
});

test.after(() => {
  if (!hadOriginalWindow) {
    delete globalThis.window;
  }
  if (!hadOriginalEvent) {
    delete globalThis.Event;
  }
});
