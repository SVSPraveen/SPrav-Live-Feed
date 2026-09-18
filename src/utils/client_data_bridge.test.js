import test from 'node:test';
import assert from 'node:assert/strict';
import { safeApiOrVault, isRealApiResponse, dataBridge } from './client_data_bridge.js';
import { storageVault } from './browser_storage_vault.js';

test('isRealApiResponse: detects real API JSON vs SPA HTML fallbacks', () => {
  assert.equal(isRealApiResponse(null), false);
  assert.equal(isRealApiResponse({ status: 500 }), false);
  assert.equal(isRealApiResponse({ status: 200, data: '<!DOCTYPE html><html><body>Error</body></html>' }), false);
  assert.equal(isRealApiResponse({ status: 200, data: '<!doctype html>' }), false);
  assert.equal(isRealApiResponse({ status: 200, data: { success: true, count: 42 } }), true);
  assert.equal(isRealApiResponse({ status: 200, data: [{ id: 1 }, { id: 2 }] }), true);
});

test('safeApiOrVault: bypasses network completely in web vault mode (0ms delay)', async () => {
  // Ensure bridge is in web mode
  dataBridge.mode = 'web_vault';
  dataBridge.isBackendAvailable = false;
  dataBridge.checkedOnce = true;

  let fallbackCalled = false;
  const start = Date.now();

  const result = await safeApiOrVault(
    '/api/analytics/conversion',
    async () => {
      fallbackCalled = true;
      return { total: 15, source: 'vault' };
    },
    { token: 'in-browser-vault-active' }
  );

  const duration = Date.now() - start;

  assert.equal(fallbackCalled, true);
  assert.equal(result.total, 15);
  assert.equal(result.source, 'vault');
  // Must execute immediately without 2500ms timeout
  assert.ok(duration < 100, `Expected instant execution, took ${duration}ms`);
});

test('safeApiOrVault: accepts raw object as vaultFallback', async () => {
  dataBridge.mode = 'web_vault';
  const rawData = { jobs: [1, 2, 3] };
  const res = await safeApiOrVault('/api/jobs', rawData);
  assert.deepEqual(res, rawData);
});

test('safeApiOrVault: handles backend errors gracefully by falling back to vault', async () => {
  // Temporarily simulate backend mode
  dataBridge.mode = 'backend';
  dataBridge.isBackendAvailable = true;

  // Unreachable port / invalid path will reject Axios
  const res = await safeApiOrVault(
    'http://localhost:59999/api/unreachable-endpoint',
    () => ({ recovered: true }),
    { timeout: 50 }
  );

  assert.equal(res.recovered, true);

  // Restore web mode
  dataBridge.mode = 'web_vault';
  dataBridge.isBackendAvailable = false;
});

test('dataBridge.getMetrics: returns zeroed metrics (uncalibrated: true) when KB or Scope is missing', async () => {
  dataBridge.mode = 'web_vault';
  dataBridge.isBackendAvailable = false;

  // Mock storageVault with raw jobs but uncalibrated profile/scope
  const originalGetJobs = storageVault.getJobs;
  const originalGetHistory = storageVault.getHistory;
  const originalGetScope = storageVault.getScope;
  const originalGetKB = storageVault.getKnowledgeBase;

  try {
    storageVault.getJobs = async () => [
      { id: '1', title: 'React Engineer', company: 'Acme', ats_match_score: 85, status: 'matched' },
      { id: '2', title: 'Python Dev', company: 'Beta', ats_match_score: 75, status: 'new' }
    ];
    storageVault.getHistory = async () => [];
    storageVault.getScope = async () => null; // Missing scope
    storageVault.getKnowledgeBase = async () => null; // Missing KB

    const metrics = await dataBridge.getMetrics();
    assert.equal(metrics.uncalibrated, true);
    assert.equal(metrics.total, 0, 'Must not report uncalibrated jobs in total');
    assert.equal(metrics.action_required, 0, 'Must not claim jobs are ready to apply without candidate calibration');
    assert.equal(metrics.applied, 0);
    assert.equal(metrics.avg_ats, 0);
  } finally {
    storageVault.getJobs = originalGetJobs;
    storageVault.getHistory = originalGetHistory;
    storageVault.getScope = originalGetScope;
    storageVault.getKnowledgeBase = originalGetKB;
  }
});

test('dataBridge.getMetrics: calculates genuine metrics when KB and Scope are calibrated', async () => {
  dataBridge.mode = 'web_vault';
  dataBridge.isBackendAvailable = false;

  const originalGetJobs = storageVault.getJobs;
  const originalGetHistory = storageVault.getHistory;
  const originalGetScope = storageVault.getScope;
  const originalGetKB = storageVault.getKnowledgeBase;

  try {
    storageVault.getJobs = async () => [
      { id: '1', title: 'Frontend Engineer', location: 'Remote', ats_match_score: 90, status: 'matched' },
      { id: '2', title: 'Frontend Engineer', location: 'Remote', ats_match_score: 80, status: 'new' }
    ];
    storageVault.getHistory = async () => [{ id: 'app_1', job_id: '99', company: 'Gamma' }];
    storageVault.getScope = async () => ({
      roles: [{ keyword: 'Frontend Engineer', preference: 'include' }],
      locations: [{ label: 'Remote', preference: 'include' }]
    });
    storageVault.getKnowledgeBase = async () => ({
      personal: { name: 'Alex Candidate' },
      skills: { technical: ['React', 'TypeScript'] },
      work_history: [{ title: 'Senior Developer' }]
    });

    const metrics = await dataBridge.getMetrics();
    assert.equal(metrics.uncalibrated, false);
    assert.ok(metrics.total >= 1, 'Calculates matched jobs for calibrated profile');
    assert.equal(metrics.applied, 1);
  } finally {
    storageVault.getJobs = originalGetJobs;
    storageVault.getHistory = originalGetHistory;
    storageVault.getScope = originalGetScope;
    storageVault.getKnowledgeBase = originalGetKB;
  }
});

