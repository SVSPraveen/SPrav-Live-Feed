import test from 'node:test';
import assert from 'node:assert';
import {
  detectAtsPlatform,
  getAtsPlatform,
  ATS_PLATFORMS,
  GENERIC_ATS
} from './ats_platform_detector.js';

test('detectAtsPlatform: detects platform from URL and HTML snippet', () => {
  const ghPlatform = detectAtsPlatform('https://boards.greenhouse.io/stripe/jobs/12345');
  assert.strictEqual(ghPlatform.id, 'greenhouse');
  assert.strictEqual(ghPlatform.name, 'Greenhouse');

  const wdPlatform = detectAtsPlatform('https://nvidia.wd5.myworkdayjobs.com/en-US/NVIDIAJobs/job/123');
  assert.strictEqual(wdPlatform.id, 'workday');
  assert.strictEqual(wdPlatform.name, 'Workday');

  const genericPlatform = detectAtsPlatform('https://example.com/careers');
  assert.strictEqual(genericPlatform.id, 'generic_ats');

  assert.strictEqual(detectAtsPlatform(''), null);
});

test('getAtsPlatform: returns platform details or fallback', () => {
  const ashby = getAtsPlatform('ashby');
  assert.strictEqual(ashby.name, 'Ashby');

  const auto = getAtsPlatform('auto');
  assert.strictEqual(auto.id, 'workday');

  const unknown = getAtsPlatform('unknown_vendor_xyz');
  assert.strictEqual(unknown.id, 'generic_ats');
});
