import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  ATS_PLATFORMS,
  GENERIC_ATS,
  detectAtsPlatform,
  checkTemplateCompatibility,
  getTemplateCompatibilityScore,
  getAtsPlatform
} from './ats_fingerprint_engine.js';

describe('ats_fingerprint_engine', () => {
  it('detects Workday via canonical and subdomain URLs', () => {
    const res1 = detectAtsPlatform('https://nvidia.myworkdayjobs.com/en-US/NVIDIAExternalCareerSite/job/123');
    assert.ok(res1);
    assert.strictEqual(res1.id, 'workday');
    assert.strictEqual(res1.detectedVia, 'url_pattern');
    assert.strictEqual(res1.parserEngine, 'Sovren / Textkernel');
    assert.strictEqual(res1.maxColumns, 1);

    const res2 = detectAtsPlatform('https://target.wd5.myworkdayjobs.com/targetcareers/job/456');
    assert.ok(res2);
    assert.strictEqual(res2.id, 'workday');
  });

  it('detects Greenhouse via boards URL and query parameters', () => {
    const res1 = detectAtsPlatform('https://boards.greenhouse.io/stripe/jobs/567890');
    assert.ok(res1);
    assert.strictEqual(res1.id, 'greenhouse');
    assert.strictEqual(res1.detectedVia, 'url_pattern');
    assert.strictEqual(res1.parserEngine, 'Greenhouse Native Semantic Tokenizer');

    const res2 = detectAtsPlatform('https://example.com/careers?gh_jid=123456');
    assert.strictEqual(res2.id, 'greenhouse');

    const res3 = detectAtsPlatform('https://example.com/apply?grnhse_jid=987654');
    assert.strictEqual(res3.id, 'greenhouse');
  });

  it('detects Lever via jobs.lever.co URL', () => {
    const res = detectAtsPlatform('https://jobs.lever.co/figma/abc-123-xyz');
    assert.ok(res);
    assert.strictEqual(res.id, 'lever');
    assert.strictEqual(res.detectedVia, 'url_pattern');
    assert.strictEqual(res.parserEngine, 'Lever Plain-Text Normalizer');
  });

  it('detects Ashby via jobs.ashbyhq.com URL', () => {
    const res = detectAtsPlatform('https://jobs.ashbyhq.com/anthropic/e71b2');
    assert.ok(res);
    assert.strictEqual(res.id, 'ashby');
    assert.strictEqual(res.detectedVia, 'url_pattern');
    assert.strictEqual(res.parserEngine, 'Ashby LLM-Augmented Structured Extractor');
  });

  it('detects iCIMS via icims.com and jobs-*.icims.com URLs', () => {
    const res1 = detectAtsPlatform('https://careers-amazon.icims.com/jobs/9988/job');
    assert.ok(res1);
    assert.strictEqual(res1.id, 'icims');
    assert.strictEqual(res1.detectedVia, 'url_pattern');
    assert.strictEqual(res1.parserEngine, 'iCIMS Chronological Parser');

    const res2 = detectAtsPlatform('https://jobs-homedepot.icims.com/jobs/1122/job');
    assert.strictEqual(res2.id, 'icims');
  });

  it('detects Oracle Taleo via taleo.net and oraclecloud URLs', () => {
    const res1 = detectAtsPlatform('https://boeing.taleo.net/careersection/jobdetail.ftl');
    assert.ok(res1);
    assert.strictEqual(res1.id, 'taleo');
    assert.strictEqual(res1.detectedVia, 'url_pattern');
    assert.strictEqual(res1.parserEngine, 'Oracle Legacy Text Parser');

    const res2 = detectAtsPlatform('https://eeho.oraclecloud.com/candidate/job/303');
    assert.strictEqual(res2.id, 'taleo');
  });

  it('detects SmartRecruiters via smartrecruiters.com URLs', () => {
    const res1 = detectAtsPlatform('https://smartrecruiters.com/Square/7439997');
    assert.ok(res1);
    assert.strictEqual(res1.id, 'smartrecruiters');
    assert.strictEqual(res1.detectedVia, 'url_pattern');
    assert.strictEqual(res1.parserEngine, 'SmartRecruiters Structured JSON-LD Parser');

    const res2 = detectAtsPlatform('https://careers.smartrecruiters.com/Visa/123');
    assert.strictEqual(res2.id, 'smartrecruiters');
  });

  it('detects platforms via HTML DOM signatures', () => {
    const domWorkday = '<div class="workday-applicant-profile"><div id="wd-job-details">Description</div></div>';
    assert.strictEqual(detectAtsPlatform('', domWorkday).id, 'workday');

    const domGreenhouse = '<div id="app_body" class="greenhouse-job">Apply Now</div>';
    assert.strictEqual(detectAtsPlatform('', domGreenhouse).id, 'greenhouse');

    const domLever = '<div class="lever-jobs-embed"><section class="lever-job">Title</section></div>';
    assert.strictEqual(detectAtsPlatform('', domLever).id, 'lever');

    const domAshby = '<div class="__ashby"><div class="ashby-job-posting">Engineering</div></div>';
    assert.strictEqual(detectAtsPlatform('', domAshby).id, 'ashby');

    const domIcims = '<iframe class="icims-embed"></iframe><div id="iCIMS_Content">Profile</div>';
    assert.strictEqual(detectAtsPlatform('', domIcims).id, 'icims');

    const domTaleo = '<form action="/taleo/submit" method="POST"></form>';
    assert.strictEqual(detectAtsPlatform('', domTaleo).id, 'taleo');

    const domSmartRecruiters = '<div class="smartrecruiters-job-spec">Requirements</div>';
    assert.strictEqual(detectAtsPlatform('', domSmartRecruiters).id, 'smartrecruiters');
  });

  it('detects platforms via explicit source hint', () => {
    const resWorkday = detectAtsPlatform('', '', 'Workday');
    assert.strictEqual(resWorkday.id, 'workday');
    assert.strictEqual(resWorkday.detectedVia, 'source_hint');

    const resGreenhouse = detectAtsPlatform('', '', 'Greenhouse');
    assert.strictEqual(resGreenhouse.id, 'greenhouse');

    const resTaleo = detectAtsPlatform('', '', 'Oracle Taleo');
    assert.strictEqual(resTaleo.id, 'taleo');
  });

  it('detects platforms via keyword or source hint', () => {
    const res = detectAtsPlatform('', '', 'smartrecruiters');
    assert.strictEqual(res.id, 'smartrecruiters');
    assert.strictEqual(res.detectedVia, 'source_hint');
  });

  it('returns generic_ats fallback for unrecognized job URL', () => {
    const res = detectAtsPlatform('https://some-stealth-startup.io/careers/senior-eng');
    assert.ok(res);
    assert.strictEqual(res.id, 'generic_ats');
    assert.strictEqual(res.detectedVia, 'default_fallback');
    assert.strictEqual(res.name, 'Universal Standard ATS');
    assert.strictEqual(res.parserEngine, 'Standard Chronological Parser');
  });

  it('returns null when no arguments or only empty strings are passed', () => {
    assert.strictEqual(detectAtsPlatform(), null);
    assert.strictEqual(detectAtsPlatform('', ''), null);
    assert.strictEqual(detectAtsPlatform('   ', '  ', ' '), null);
  });

  it('verifies checkTemplateCompatibility correctly flags single-column ATS vs multi-column templates', () => {
    const workday = detectAtsPlatform('https://adobe.myworkdayjobs.com/careers');
    const taleo = detectAtsPlatform('https://boeing.taleo.net');
    const icims = detectAtsPlatform('https://careers.icims.com');
    const smartrecruiters = detectAtsPlatform('https://smartrecruiters.com');
    const greenhouse = detectAtsPlatform('https://boards.greenhouse.io');

    // Creative Two-Column with Workday (Critical mismatch)
    const workdayCheck = checkTemplateCompatibility(workday, 'creative_sidebar');
    assert.strictEqual(workdayCheck.isCompatible, false);
    assert.strictEqual(workdayCheck.level, 'critical');
    assert.ok(workdayCheck.reason.includes('Workday'));
    assert.ok(workdayCheck.reason.includes('Sovren / Textkernel'));
    assert.ok(workdayCheck.recommendation);

    // Creative Two-Column with Taleo (Critical mismatch)
    const taleoCheck = checkTemplateCompatibility(taleo, 'creative_sidebar');
    assert.strictEqual(taleoCheck.isCompatible, false);
    assert.strictEqual(taleoCheck.level, 'critical');

    // Creative Two-Column with iCIMS (Critical mismatch)
    const icimsCheck = checkTemplateCompatibility(icims, 'creative_sidebar');
    assert.strictEqual(icimsCheck.isCompatible, false);
    assert.strictEqual(icimsCheck.level, 'critical');

    // Creative Two-Column with SmartRecruiters (Critical mismatch)
    const smartCheck = checkTemplateCompatibility(smartrecruiters, 'creative_sidebar');
    assert.strictEqual(smartCheck.isCompatible, false);
    assert.strictEqual(smartCheck.level, 'critical');

    // Creative Two-Column with Greenhouse (Modern engine, warning level)
    const ghCheck = checkTemplateCompatibility(greenhouse, 'creative_sidebar');
    assert.strictEqual(ghCheck.isCompatible, true);
    assert.strictEqual(ghCheck.level, 'warning');

    // ATS-Safe single-column templates with Workday (Safe)
    const ivyCheck = checkTemplateCompatibility(workday, 'ivy_classic');
    assert.strictEqual(ivyCheck.isCompatible, true);
    assert.strictEqual(ivyCheck.level, 'safe');
    assert.strictEqual(ivyCheck.recommendation, null);

    const modernCheck = checkTemplateCompatibility(workday, 'modern_tech');
    assert.strictEqual(modernCheck.isCompatible, true);
    assert.strictEqual(modernCheck.level, 'safe');

    const denseCheck = checkTemplateCompatibility(taleo, 'high_density');
    assert.strictEqual(denseCheck.isCompatible, true);
    assert.strictEqual(denseCheck.level, 'safe');

    const latexCheck = checkTemplateCompatibility(workday, 'overleaf_latex');
    assert.strictEqual(latexCheck.isCompatible, true);
    assert.strictEqual(latexCheck.level, 'safe');

    const execCheck = checkTemplateCompatibility(workday, 'executive_minimal');
    assert.strictEqual(execCheck.isCompatible, true);
    assert.strictEqual(execCheck.level, 'safe');
  });

  it('verifies getAtsPlatform lookup and default fallback', () => {
    const workday = getAtsPlatform('workday');
    assert.strictEqual(workday.id, 'workday');
    assert.strictEqual(workday.name, 'Workday');

    const taleo = getAtsPlatform('Oracle Taleo');
    assert.strictEqual(taleo.id, 'taleo');

    const fallback = getAtsPlatform('NonExistentATS');
    assert.strictEqual(fallback.id, 'generic_ats');

    const autoFallback = getAtsPlatform('auto');
    assert.strictEqual(autoFallback.id, 'workday');
  });

  it('validates schema completeness for all ATS platforms in database', () => {
    const requiredKeys = ['workday', 'greenhouse', 'lever', 'ashby', 'icims', 'taleo', 'smartrecruiters'];
    for (const key of requiredKeys) {
      const p = ATS_PLATFORMS[key];
      assert.ok(p, `Platform ${key} must exist in ATS_PLATFORMS`);
      assert.ok(typeof p.name === 'string' && p.name.length > 0);
      assert.ok(typeof p.parserEngine === 'string' && p.parserEngine.length > 0);
      assert.ok(Array.isArray(p.urlPatterns) && p.urlPatterns.length > 0);
      assert.ok(Array.isArray(p.domPatterns) && p.domPatterns.length > 0);
      assert.ok(Array.isArray(p.strictRules) && p.strictRules.length > 0);
      assert.ok(Array.isArray(p.riskFactors) && p.riskFactors.length > 0);
      assert.ok(typeof p.compatibilityScore === 'number' && p.compatibilityScore >= 80);
    }
    assert.ok(GENERIC_ATS.strictRules.length > 0);
    assert.ok(GENERIC_ATS.riskFactors.length > 0);
  });

  it('evaluates getTemplateCompatibilityScore showing Passes Greenhouse / Fails Workday for creative template', () => {
    // Creative Two-Column: passes Greenhouse, fails Workday
    const creativeScore = getTemplateCompatibilityScore('creative_sidebar');
    assert.strictEqual(creativeScore.score, 65);
    assert.strictEqual(creativeScore.status, 'warning');
    assert.strictEqual(creativeScore.passesGreenhouse, true);
    assert.strictEqual(creativeScore.passesWorkday, false);
    assert.strictEqual(creativeScore.summaryText, 'Passes Greenhouse / Fails Workday');
    assert.strictEqual(creativeScore.badgeLabel, 'Passes Greenhouse / Fails Workday');

    // Single-column templates: passes both Greenhouse and Workday (100% ATS safe)
    const singleColumnTemplates = ['ivy_classic', 'modern_tech', 'high_density', 'overleaf_latex', 'executive_minimal'];
    for (const tplId of singleColumnTemplates) {
      const score = getTemplateCompatibilityScore(tplId);
      assert.strictEqual(score.score, 100);
      assert.strictEqual(score.status, 'safe');
      assert.strictEqual(score.passesGreenhouse, true);
      assert.strictEqual(score.passesWorkday, true);
      assert.strictEqual(score.badgeLabel, 'Passes Greenhouse & Workday');
      assert.ok(score.summaryText.includes('Passes Greenhouse & Workday'));
    }
  });
});

