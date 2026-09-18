import test from 'node:test';
import assert from 'node:assert/strict';
import {
  COMPANY_ROUND_EXPECTATIONS,
  COMPANY_CATEGORIES,
  COMPANY_ARCHETYPES,
  COMPANY_ALIASES,
  getCompanyRoundExpectations,
  searchCompanies
} from './company_round_engine.js';

test('company_round_engine: preserves all 20 original FAANG & Big Tech companies', () => {
  const original20 = [
    'Google', 'Meta', 'Amazon', 'Microsoft', 'Apple',
    'Netflix', 'Stripe', 'Databricks', 'Uber', 'Airbnb',
    'OpenAI', 'Anthropic', 'Goldman Sachs', 'Citadel',
    'Bloomberg', 'NVIDIA', 'Salesforce', 'Snowflake',
    'Palantir', 'LinkedIn'
  ];

  original20.forEach(company => {
    assert.ok(COMPANY_ROUND_EXPECTATIONS[company], `Expected ${company} to exist in database`);
    assert.ok(COMPANY_ROUND_EXPECTATIONS[company].rounds.length >= 3, `${company} should have at least 3 rounds`);
    assert.ok(COMPANY_ROUND_EXPECTATIONS[company].ats, `${company} should have an ATS field`);
    assert.ok(COMPANY_ROUND_EXPECTATIONS[company].rounds[0].prepTip, `${company} rounds should include prep tips`);
  });
});

test('company_round_engine: heavily covers Indian IT Giants (SIs)', () => {
  const indianGiants = [
    'Tata Consultancy Services (TCS)',
    'Infosys',
    'Wipro',
    'HCLTech',
    'Cognizant',
    'Tech Mahindra',
    'LTIMindtree',
    'Accenture'
  ];

  indianGiants.forEach(company => {
    const data = COMPANY_ROUND_EXPECTATIONS[company];
    assert.ok(data, `Expected ${company} to exist in Indian IT Giants`);
    assert.equal(data.category, 'india_giants');
    assert.equal(data.region, 'India');
    assert.ok(data.rounds.length >= 3);
    assert.ok(data.rounds.some(r => r.name.toLowerCase().includes('technical') || r.name.toLowerCase().includes('nqt') || r.name.toLowerCase().includes('assessment')));
  });
});

test('company_round_engine: heavily covers Indian Product Unicorns & SaaS Titans', () => {
  const indianUnicorns = [
    'Zoho',
    'Freshworks',
    'Swiggy',
    'Zomato',
    'Razorpay',
    'Flipkart',
    'CRED',
    'PhonePe',
    'Postman',
    'BrowserStack',
    'Zepto',
    'Meesho'
  ];

  indianUnicorns.forEach(company => {
    const data = COMPANY_ROUND_EXPECTATIONS[company];
    assert.ok(data, `Expected ${company} to exist in Indian Product Unicorns`);
    assert.equal(data.category, 'india_unicorns');
    assert.equal(data.region, 'India');
    assert.ok(data.rounds.length >= 3);
  });

  // Verify Zoho has signature 5-stage technical loop with Machine Coding
  const zoho = COMPANY_ROUND_EXPECTATIONS['Zoho'];
  assert.equal(zoho.rounds.length, 5);
  assert.ok(zoho.rounds.some(r => r.name.includes('Machine Coding')));

  // Verify Razorpay and Swiggy feature Low-Level Design (LLD)
  assert.ok(COMPANY_ROUND_EXPECTATIONS['Razorpay'].rounds.some(r => r.name.includes('LLD') || r.name.includes('Machine Coding')));
  assert.ok(COMPANY_ROUND_EXPECTATIONS['Swiggy'].rounds.some(r => r.name.includes('LLD') || r.name.includes('Machine Coding')));
});

test('company_round_engine: covers European & APAC Tech Leaders', () => {
  const euroApac = ['Spotify', 'Atlassian', 'Canva', 'Booking.com', 'Grab', 'Shopee'];

  euroApac.forEach(company => {
    const data = COMPANY_ROUND_EXPECTATIONS[company];
    assert.ok(data, `Expected ${company} to exist in European/APAC database`);
    assert.equal(data.category, 'europe_apac');
    assert.ok(data.rounds.length >= 3);
  });
});

test('company_round_engine: getCompanyRoundExpectations resolves aliases & abbreviations', () => {
  // TCS alias
  const tcs = getCompanyRoundExpectations('TCS');
  assert.equal(tcs.company, 'Tata Consultancy Services (TCS)');
  assert.equal(tcs.isVerifiedCompany, true);
  assert.ok(tcs.rounds.length >= 4);

  // HCL alias
  const hcl = getCompanyRoundExpectations('hcl');
  assert.equal(hcl.company, 'HCLTech');
  assert.equal(hcl.isVerifiedCompany, true);

  // Infy alias
  const infy = getCompanyRoundExpectations('infy');
  assert.equal(infy.company, 'Infosys');
  assert.equal(infy.isVerifiedCompany, true);

  // AMZN alias
  const amzn = getCompanyRoundExpectations('AMZN');
  assert.equal(amzn.company, 'Amazon');
  assert.equal(amzn.isVerifiedCompany, true);

  // FB alias
  const fb = getCompanyRoundExpectations('fb');
  assert.equal(fb.company, 'Meta');
  assert.equal(fb.isVerifiedCompany, true);
});

test('company_round_engine: getCompanyRoundExpectations infers archetypes for arbitrary companies', () => {
  // Consulting / IT Services
  const services = getCompanyRoundExpectations('Global Cloud Solutions & Consulting Services');
  assert.equal(services.isVerifiedCompany, false);
  assert.equal(services.archetype, 'enterprise_si_consulting');
  assert.ok(services.rounds.some(r => r.name.includes('Aptitude')));

  // FinTech / Banking
  const fintech = getCompanyRoundExpectations('Apex Digital Capital Bank');
  assert.equal(fintech.isVerifiedCompany, false);
  assert.equal(fintech.archetype, 'fintech_quant');
  assert.ok(fintech.rounds.some(r => r.name.includes('Financial Systems')));

  // AI DeepTech
  const ai = getCompanyRoundExpectations('Nexus Autonomous AI Neural Labs');
  assert.equal(ai.isVerifiedCompany, false);
  assert.equal(ai.archetype, 'ai_deeptech');
  assert.ok(ai.rounds.some(r => r.name.includes('ML Infrastructure')));

  // SaaS Platform
  const saas = getCompanyRoundExpectations('Enterprise Metrics Platform SaaS');
  assert.equal(saas.isVerifiedCompany, false);
  assert.equal(saas.archetype, 'saas_product');
  assert.ok(saas.rounds.some(r => r.name.includes('Multi-Tenancy')));

  // Product Startup / Unicorn
  const startup = getCompanyRoundExpectations('FlashDelivery Quick Commerce Tech');
  assert.equal(startup.isVerifiedCompany, false);
  assert.equal(startup.archetype, 'tech_product_unicorn');
  assert.ok(startup.rounds.some(r => r.name.includes('Machine Coding')));

  // Unclassified arbitrary fallback
  const generic = getCompanyRoundExpectations('Acme Worldwide');
  assert.equal(generic.isVerifiedCompany, false);
  assert.equal(generic.archetype, 'general_tech_standard');
  assert.equal(generic.rounds.length, 4);
});

test('company_round_engine: searchCompanies filters by query and category', () => {
  // Category filter
  const indianUnicorns = searchCompanies('', 'india_unicorns');
  assert.ok(indianUnicorns.length >= 10);
  assert.ok(indianUnicorns.some(c => c.name === 'Zoho'));
  assert.ok(indianUnicorns.some(c => c.name === 'Swiggy'));

  // Query filter
  const results = searchCompanies('payment');
  assert.ok(results.length >= 1);
  assert.ok(results.some(c => c.name === 'Razorpay' || c.name === 'Stripe' || c.name === 'Visa'));

  // ATS search
  const leverJobs = searchCompanies('Lever');
  assert.ok(leverJobs.length >= 3);
  assert.ok(leverJobs.some(c => c.name === 'Netflix' || c.name === 'Swiggy' || c.name === 'Spotify'));
});
