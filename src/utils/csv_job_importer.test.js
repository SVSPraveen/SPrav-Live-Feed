import test from 'node:test';
import assert from 'node:assert/strict';
import {
  sanitizeFormulaInjection,
  sanitizeHtmlContent,
  sanitizeUrl,
  detectDelimiter,
  parseCsvTokens,
  mapHeadersToSchema,
  parseAndSanitizeJobCsv,
  generateSampleJobCsv,
  MAX_FILE_SIZE_BYTES
} from './csv_job_importer.js';

test('csv_job_importer: sanitizeFormulaInjection neutralizes spreadsheet trigger characters', () => {
  // Test =, +, -, @, \t, \r, %
  assert.equal(sanitizeFormulaInjection('=cmd|"/C calc"!A0'), '\'=cmd|"/C calc"!A0');
  assert.equal(sanitizeFormulaInjection('+12345'), '\'+12345');
  assert.equal(sanitizeFormulaInjection('-2+3'), '\'-2+3');
  assert.equal(sanitizeFormulaInjection('@SUM(A1:A10)'), '\'@SUM(A1:A10)');
  assert.equal(sanitizeFormulaInjection('\tTabPreceded'), '\'\tTabPreceded');
  assert.equal(sanitizeFormulaInjection('%SystemRoot%'), '\'%SystemRoot%');

  // Safe normal values remain unchanged
  assert.equal(sanitizeFormulaInjection('Senior Software Engineer'), 'Senior Software Engineer');
  assert.equal(sanitizeFormulaInjection('Google LLC'), 'Google LLC');
  assert.equal(sanitizeFormulaInjection('120k - 160k'), '120k - 160k');
});

test('csv_job_importer: sanitizeHtmlContent prevents stored XSS', () => {
  // Non-description fields: all HTML stripped
  assert.equal(
    sanitizeHtmlContent('<b>Staff Engineer</b><script>alert("XSS")</script>'),
    'Staff Engineer'
  );
  assert.equal(
    sanitizeHtmlContent('<a href="javascript:alert(1)" onclick="hack()">Malicious Link</a>'),
    'Malicious Link'
  );

  // Description field: keeps structure text, removes dangerous scripts and handlers
  const maliciousDesc = 'Great role! <script>evil()</script><iframe src="malicious.com"></iframe><div onerror="exploit()">Details</div>';
  const cleanDesc = sanitizeHtmlContent(maliciousDesc, true);
  assert.ok(!cleanDesc.includes('<script>'));
  assert.ok(!cleanDesc.includes('evil()'));
  assert.ok(!cleanDesc.includes('<iframe'));
  assert.ok(!cleanDesc.includes('onerror='));
  assert.ok(cleanDesc.includes('Great role!'));
});

test('csv_job_importer: sanitizeUrl permits only http and https protocols', () => {
  // Safe URLs
  assert.equal(sanitizeUrl('https://careers.google.com/jobs/123'), 'https://careers.google.com/jobs/123');
  assert.equal(sanitizeUrl('http://jobs.startup.io/apply'), 'http://jobs.startup.io/apply');
  assert.equal(sanitizeUrl('careers.airbnb.com/positions'), 'https://careers.airbnb.com/positions');

  // Block dangerous schemes
  assert.equal(sanitizeUrl('javascript:alert(document.domain)'), '');
  assert.equal(sanitizeUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.equal(sanitizeUrl('vbscript:msgbox("hello")'), '');
  assert.equal(sanitizeUrl('file:///etc/passwd'), '');
  assert.equal(sanitizeUrl(''), '');
});

test('csv_job_importer: detectDelimiter detects commas, tabs, and semicolons', () => {
  assert.equal(detectDelimiter('Title,Company,Location,URL'), ',');
  assert.equal(detectDelimiter('Title\tCompany\tLocation\tURL'), '\t');
  assert.equal(detectDelimiter('Title;Company;Location;Salary'), ';');
});

test('csv_job_importer: parseCsvTokens parses RFC 4180 quotes, commas, and newlines properly', () => {
  const csv = `Title,Company,Description\n"Frontend Architect","Stripe","Build modern, fast UI.\nMust know React and TypeScript."\n"Backend Lead","AWS","Cloud systems"`;
  const rows = parseCsvTokens(csv, ',');

  assert.equal(rows.length, 3);
  assert.deepEqual(rows[0], ['Title', 'Company', 'Description']);
  assert.equal(rows[1][0], 'Frontend Architect');
  assert.equal(rows[1][1], 'Stripe');
  assert.ok(rows[1][2].includes('Build modern, fast UI.'));
  assert.ok(rows[1][2].includes('Must know React and TypeScript.'));
  assert.equal(rows[2][0], 'Backend Lead');
});

test('csv_job_importer: parseCsvTokens handles escaped quotes ("")', () => {
  const csv = `Title,Company\n"Lead ""Full-Stack"" Engineer","OpenAI"`;
  const rows = parseCsvTokens(csv, ',');

  assert.equal(rows.length, 2);
  assert.equal(rows[1][0], 'Lead "Full-Stack" Engineer');
  assert.equal(rows[1][1], 'OpenAI');
});

test('csv_job_importer: mapHeadersToSchema maps diverse column aliases', () => {
  const customHeaders = ['Role Title', 'Organization', 'Geo', 'Apply Link', 'CTC', 'Tech Stack'];
  const mapping = mapHeadersToSchema(customHeaders);

  assert.equal(mapping.title, 0);
  assert.equal(mapping.company, 1);
  assert.equal(mapping.location, 2);
  assert.equal(mapping.url, 3);
  assert.equal(mapping.salary, 4);
  assert.equal(mapping.skills, 5);
});

test('csv_job_importer: parseAndSanitizeJobCsv normalizes listings and tracks telemetry', () => {
  const csv = `Job Title,Company,Location,URL,Description,Skills
"=CMD|'/C calc'!A0","Evil Corp","San Francisco","javascript:alert(1)","Great job! <script>steal()</script>","React, Node.js"
"Staff Engineer","Netflix","Los Gatos, CA","https://netflix.com/jobs/42","Lead streaming architectures","Distributed Systems, Go"`;

  const result = parseAndSanitizeJobCsv(csv);
  assert.ok(result.success);
  assert.equal(result.totalRowsParsed, 2);
  assert.equal(result.validJobs.length, 2);
  assert.equal(result.sanitizedFormulasCount, 1);
  assert.equal(result.sanitizedUrlsCount, 1);
  assert.equal(result.sanitizedXssCount, 1);

  const job1 = result.validJobs[0];
  assert.ok(job1.title.startsWith("'="), 'Formula injection should be neutralized with quote prefix');
  assert.equal(job1.url, '', 'Dangerous javascript: URL must be stripped');
  assert.ok(!job1.description.includes('<script>'), 'Script tags in description must be removed');

  const job2 = result.validJobs[1];
  assert.equal(job2.title, 'Staff Engineer');
  assert.equal(job2.company, 'Netflix');
  assert.equal(job2.url, 'https://netflix.com/jobs/42');
  assert.deepEqual(job2.matched_skills, ['Distributed Systems', 'Go']);
});

test('csv_job_importer: parseAndSanitizeJobCsv deduplicates against existing portal jobs', () => {
  const existingJobs = [
    { title: 'Senior Software Engineer', company: 'Google' }
  ];

  const csv = `Title,Company,Location\nSenior Software Engineer,Google,Mountain View\nStaff Engineer,Google,Sunnyvale`;

  const result = parseAndSanitizeJobCsv(csv, { existingJobs });
  assert.ok(result.success);
  assert.equal(result.validJobs.length, 1);
  assert.equal(result.validJobs[0].title, 'Staff Engineer');
  assert.equal(result.skippedCount, 1);
});

test('csv_job_importer: generateSampleJobCsv returns valid downloadable CSV', () => {
  const sample = generateSampleJobCsv();
  assert.ok(sample.length > 100);
  assert.ok(sample.includes('Title,Company,Location,URL'));

  const parsed = parseAndSanitizeJobCsv(sample);
  assert.ok(parsed.success);
  assert.equal(parsed.validJobs.length, 4);
  assert.equal(parsed.validJobs[0].company, 'Stripe');
});

test('csv_job_importer: handles empty or invalid input gracefully', () => {
  const emptyRes = parseAndSanitizeJobCsv('');
  assert.equal(emptyRes.success, false);
  assert.ok(emptyRes.warnings.some(w => w.includes('empty')));

  const singleLine = parseAndSanitizeJobCsv('Title,Company,Location');
  assert.equal(singleLine.success, false);
  assert.ok(singleLine.warnings.some(w => w.includes('at least one job record')));

  const missingHeaders = parseAndSanitizeJobCsv('Foo,Bar,Baz\n1,2,3');
  assert.equal(missingHeaders.success, false);
  assert.ok(missingHeaders.warnings.some(w => w.includes('missing identifiable')));
});

test('csv_job_importer: parses semicolon delimited CSV with CRLF', () => {
  const semiCsv = "Title;Company;Location;Salary\r\nPlatform Lead;Vercel;Remote;$180k\r\n";
  const res = parseAndSanitizeJobCsv(semiCsv);
  assert.ok(res.success);
  assert.equal(res.validJobs.length, 1);
  assert.equal(res.validJobs[0].title, 'Platform Lead');
  assert.equal(res.validJobs[0].company, 'Vercel');
  assert.equal(res.validJobs[0].salary, '$180k');
});

