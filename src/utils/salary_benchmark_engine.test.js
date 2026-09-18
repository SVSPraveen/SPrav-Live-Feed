import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  detectRoleCategory, 
  detectSeniority, 
  detectGeoTier, 
  extractSalaryRange, 
  benchmarkJobSalary,
  classifySeniorityAlignment,
  generateSalaryNegotiationScript,
  SALARY_ESTIMATE_DISCLAIMER,
  formatSalaryCurrency,
  parseSalaryInput,
  CURRENCY_CONFIG,
  GEO_DEFAULT_CURRENCY,
  updateCurrencyRates,
  getExchangeRateDisclaimer,
  getRatesStalenessWarning,
  SALARY_NEGOTIATION_FX_ADVISORY
} from './salary_benchmark_engine.js';

test('detectRoleCategory: classifies engineering archetypes accurately', () => {
  assert.equal(detectRoleCategory('Senior Frontend Engineer', 'React and CSS'), 'frontend_engineer');
  assert.equal(detectRoleCategory('Staff LLM Research Engineer', 'PyTorch and Transformers'), 'ai_ml_engineer');
  assert.equal(detectRoleCategory('Site Reliability Engineer', 'Kubernetes and Terraform'), 'devops_sre');
  assert.equal(detectRoleCategory('Engineering Manager', 'Lead 8 engineers'), 'engineering_manager');
  assert.equal(detectRoleCategory('Backend Go Engineer', 'Distributed systems'), 'software_engineer');
  assert.equal(detectRoleCategory('Lead Data Engineer', 'dbt, Snowflake, Spark'), 'data_engineer');
  assert.equal(detectRoleCategory('Security Engineer - AppSec', 'OWASP, SOC2, cryptography'), 'cybersecurity_engineer');
  assert.equal(detectRoleCategory('Staff iOS Engineer', 'Swift, SwiftUI, Android'), 'mobile_engineer');
  assert.equal(detectRoleCategory('Senior SDET', 'Playwright, Cypress, automation'), 'qa_sdet');
  assert.equal(detectRoleCategory('Embedded Firmware Engineer', 'RTOS, ARM, C/C++'), 'embedded_firmware');
  assert.equal(detectRoleCategory('Technical Product Manager', 'Roadmap, PRD, backlog'), 'product_manager');
});

test('detectSeniority: extracts seniority bands', () => {
  assert.equal(detectSeniority('Staff Software Engineer'), 'staff');
  assert.equal(detectSeniority('Senior Backend Developer'), 'senior');
  assert.equal(detectSeniority('Junior Frontend Developer'), 'entry');
  assert.equal(detectSeniority('Full Stack Engineer'), 'mid');
});

test('detectGeoTier: maps locations to market comp tiers', () => {
  assert.equal(detectGeoTier('San Francisco, CA'), 'us_tier1');
  assert.equal(detectGeoTier('New York, NY'), 'us_tier1');
  assert.equal(detectGeoTier('Bengaluru, India'), 'india');
  assert.equal(detectGeoTier('Berlin, Germany'), 'europe');
  assert.equal(detectGeoTier('Remote (US National)'), 'us_remote');
  assert.equal(detectGeoTier('Toronto, ON, Canada'), 'canada');
  assert.equal(detectGeoTier('London, UK'), 'uk');
  assert.equal(detectGeoTier('Singapore'), 'apac');
  assert.equal(detectGeoTier('Buenos Aires, Argentina'), 'latam');
});

test('extractSalaryRange: parses varied salary syntax', () => {
  const job1 = { salary: '$140,000 - $180,000 / year' };
  const res1 = extractSalaryRange(job1);
  assert.ok(res1);
  assert.equal(res1.min, 140000);
  assert.equal(res1.max, 180000);
  assert.equal(res1.median, 160000);

  const job2 = { salary: '$150k - $200k' };
  const res2 = extractSalaryRange(job2);
  assert.ok(res2);
  assert.equal(res2.min, 150000);
  assert.equal(res2.max, 200000);

  const job3 = { description: 'The expected base compensation is $160,000 per year.' };
  const res3 = extractSalaryRange(job3);
  assert.ok(res3);
  assert.equal(res3.median, 160000);
});

test('benchmarkJobSalary: flags above-market, at-market, and unlisted compensation', () => {
  // Above market case
  const highJob = {
    title: 'Senior Frontend Engineer',
    location: 'Remote, US',
    salary: '$240,000 - $280,000 / year'
  };
  const highBench = benchmarkJobSalary(highJob);
  assert.equal(highBench.hasSalary, true);
  assert.equal(highBench.tier, 'above_market');
  assert.match(highBench.badgeText, /Above Market/);

  // Unlisted case provides market estimate
  const unlistedJob = {
    title: 'Senior AI / ML Engineer',
    location: 'San Francisco, CA'
  };
  const unlistedBench = benchmarkJobSalary(unlistedJob);
  assert.equal(unlistedBench.hasSalary, false);
  assert.equal(unlistedBench.tier, 'unspecified_estimated');
  assert.match(unlistedBench.badgeText, /Informed Est/);
});

test('classifySeniorityAlignment: detects overqualification, underqualification, and alignment', () => {
  // Staff candidate applying to Entry level job
  const overqual = classifySeniorityAlignment('Junior Web Developer', 'React basics', 11);
  assert.equal(overqual.isAligned, false);
  assert.equal(overqual.status, 'overqualified');
  assert.match(overqual.warningMessage, /overqualified/i);

  // Entry candidate applying to Staff Architect job
  const underqual = classifySeniorityAlignment('Staff Distributed Systems Architect', 'Raft and Paxos', 1);
  assert.equal(underqual.isAligned, false);
  assert.equal(underqual.status, 'underqualified');
  assert.match(underqual.warningMessage, /high reach role/i);

  // Senior candidate applying to Senior role
  const aligned = classifySeniorityAlignment('Senior Backend Engineer', 'Python and Kafka', 7);
  assert.equal(aligned.isAligned, true);
  assert.equal(aligned.status, 'aligned');
  assert.equal(aligned.warningMessage, null);
});

test('generateSalaryNegotiationScript: calculates counter target and generates multi-channel scripts', () => {
  const result = generateSalaryNegotiationScript({
    offerAmount: 140000,
    roleTitle: 'Senior Software Engineer',
    jobLocation: 'San Francisco, CA',
    yoe: 6,
    candidateSkills: ['Go', 'Distributed Systems'],
    companyName: 'ScaleTech'
  });

  assert.ok(result.counterTarget > 140000);
  assert.ok(result.deltaFromOffer > 0);
  assert.ok(result.deltaPercent > 0);
  assert.ok(result.scripts.email.includes('ScaleTech'));
  assert.ok(result.scripts.email.includes('Senior Software Engineer'));
  assert.ok(result.scripts.email.includes('Go and Distributed Systems'));
  assert.ok(result.scripts.verbal.includes('targeting'));
  assert.ok(result.scripts.alternativeLevers.includes('signing bonus'));
  assert.equal(result.disclaimer, SALARY_ESTIMATE_DISCLAIMER);
});

test('SALARY_ESTIMATE_DISCLAIMER: adheres to ethical compensation estimate disclosures', () => {
  assert.equal(SALARY_ESTIMATE_DISCLAIMER, 'Informed market estimates based on 2024–2025 market aggregations. Verify with Levels.fyi for current figures.');
  const listedBench = benchmarkJobSalary({ title: 'Senior Software Engineer', salary: '$180,000 / yr' });
  assert.equal(listedBench.disclaimer, SALARY_ESTIMATE_DISCLAIMER);
  assert.match(listedBench.summary, /Informed market estimates based on 2024–2025 market aggregations/);

  const unlistedBench = benchmarkJobSalary({ title: 'Lead DevOps Engineer' });
  assert.equal(unlistedBench.disclaimer, SALARY_ESTIMATE_DISCLAIMER);
  assert.match(unlistedBench.summary, /Informed market estimates based on 2024–2025 market aggregations/);
});

test('Multi-Currency: formatSalaryCurrency accurately supports INR LPA, GBP, EUR, CAD, USD', () => {
  // USD
  assert.equal(formatSalaryCurrency(150000, 'USD'), '$150k');
  // INR LPA (150,000 USD * 95.51 = 14,326,500 INR = 143.3L)
  assert.equal(formatSalaryCurrency(150000, 'INR'), '₹143.3L');
  // 60,000 USD * 95.51 = 5,730,600 INR = 57.3L
  assert.equal(formatSalaryCurrency(60000, 'INR'), '₹57.3L');
  // GBP (100,000 USD * 0.74 = 74,000 GBP)
  assert.equal(formatSalaryCurrency(100000, 'GBP'), '£74k');
  // EUR (100,000 USD * 0.86 = 86,000 EUR)
  assert.equal(formatSalaryCurrency(100000, 'EUR'), '€86k');
  // CAD (100,000 USD * 1.38 = 138,000 CAD)
  assert.equal(formatSalaryCurrency(100000, 'CAD'), 'CA$138k');
});

test('Multi-Currency: updateCurrencyRates dynamically updates rates and disclaimer', () => {
  // Verify initial disclaimer
  const inrDisclaimer = getExchangeRateDisclaimer('INR');
  assert.match(inrDisclaimer, /95\.51/);

  // Update rates dynamically (e.g. simulated live fetch)
  updateCurrencyRates({ INR: 96.25, EUR: 0.88 }, { lastUpdated: '12 Sep 2026', source: 'Test Live Feed' });
  assert.equal(CURRENCY_CONFIG.INR.rateFromUsd, 96.25);
  assert.equal(formatSalaryCurrency(100000, 'INR'), '₹96.3L');

  const updatedDisclaimer = getExchangeRateDisclaimer('INR');
  assert.match(updatedDisclaimer, /96\.25/);
  assert.match(updatedDisclaimer, /12 Sep 2026/);

  // Restore 2026 baseline for other tests
  updateCurrencyRates({ INR: 95.51, EUR: 0.86 }, { lastUpdated: 'September 2026', lastSyncEpoch: null, source: 'Calibrated 2026 Baseline' });
});

test('Multi-Currency: getRatesStalenessWarning indicates baseline staleness when offline or stale', () => {
  // USD should never have a staleness warning
  assert.equal(getRatesStalenessWarning('USD'), null);

  // INR should return a clear notice when using static baseline without live sync
  const warning = getRatesStalenessWarning('INR');
  assert.ok(warning, 'Staleness warning must be present when using baseline rates');
  assert.match(warning, /baseline|stale/i);
});

test('SALARY_NEGOTIATION_FX_ADVISORY: provides transparent risk warning for overseas/remote offers', () => {
  assert.ok(SALARY_NEGOTIATION_FX_ADVISORY.includes('FX Advisory'));
  const script = generateSalaryNegotiationScript({ offerAmount: 120000, roleTitle: 'Engineer', jobLocation: 'Bengaluru, India' });
  assert.equal(script.fxAdvisory, SALARY_NEGOTIATION_FX_ADVISORY);
  assert.ok(script.fxRate >= 90);
});

test('Multi-Currency: parseSalaryInput parses varied INR Lakhs notation and standard suffixes', () => {
  assert.equal(parseSalaryInput('28 LPA', 'INR'), 2800000);
  assert.equal(parseSalaryInput('35.5L', 'INR'), 3550000);
  assert.equal(parseSalaryInput('₹25,00,000', 'INR'), 2500000);
  assert.equal(parseSalaryInput('45', 'INR'), 4500000); // <= 300 treated as LPA

  assert.equal(parseSalaryInput('£95k', 'GBP'), 95000);
  assert.equal(parseSalaryInput('€85,000', 'EUR'), 85000);
  assert.equal(parseSalaryInput('$180k', 'USD'), 180000);
});

test('Multi-Currency: benchmarkJobSalary defaults to local currency for international locations', () => {
  // Bengaluru, India role defaults to INR with LPA notation
  const indiaJob = {
    title: 'Senior Software Engineer',
    location: 'Bengaluru, India'
  };
  const indiaBench = benchmarkJobSalary(indiaJob);
  assert.equal(indiaBench.currency, 'INR');
  assert.equal(indiaBench.currencySymbol, '₹');
  assert.match(indiaBench.badgeText, /₹.*L/);
  assert.match(indiaBench.summary, /₹.*L/);

  // London, UK role defaults to GBP (£)
  const ukJob = {
    title: 'Staff Software Engineer',
    location: 'London, UK'
  };
  const ukBench = benchmarkJobSalary(ukJob);
  assert.equal(ukBench.currency, 'GBP');
  assert.equal(ukBench.currencySymbol, '£');
  assert.match(ukBench.badgeText, /£.*k/);
});

test('Multi-Currency: generateSalaryNegotiationScript formats scripts in native currency', () => {
  const indiaScript = generateSalaryNegotiationScript({
    offerAmount: 3500000,
    roleTitle: 'Senior Backend Engineer',
    jobLocation: 'Bengaluru, India',
    companyName: 'InnoTech India'
  });

  assert.equal(indiaScript.currency, 'INR');
  assert.equal(indiaScript.currencySymbol, '₹');
  assert.match(indiaScript.scripts.email, /₹/);
  assert.match(indiaScript.scripts.verbal, /₹/);
});

