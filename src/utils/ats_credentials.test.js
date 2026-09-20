import test from 'node:test';
import assert from 'node:assert';
import {
  testAdzunaCredentials,
  testUsajobsCredentials,
  getAdzunaQuotaTelemetry
} from './ats_credentials.js';
import {
  testAdzunaCredentials as testAdzunaData,
  testUsajobsCredentials as testUsajobsData,
  getAdzunaQuotaTelemetry as getQuotaData
} from './ats_data_providers.js';

test('ats_credentials and ats_data_providers: validation and parity', async () => {
  assert.strictEqual(typeof testAdzunaCredentials, 'function');
  assert.strictEqual(typeof testUsajobsCredentials, 'function');
  assert.strictEqual(typeof getAdzunaQuotaTelemetry, 'function');

  // Parity re-exports
  assert.strictEqual(testAdzunaCredentials, testAdzunaData);
  assert.strictEqual(testUsajobsCredentials, testUsajobsData);
  assert.strictEqual(getAdzunaQuotaTelemetry, getQuotaData);

  // Missing credentials validation
  const adzunaRes = await testAdzunaCredentials('', '');
  assert.strictEqual(adzunaRes.ok, false);
  assert.ok(adzunaRes.error.includes('required'));

  const usajobsRes = await testUsajobsCredentials('', '');
  assert.strictEqual(usajobsRes.ok, false);
  assert.ok(usajobsRes.error.includes('required'));
});
