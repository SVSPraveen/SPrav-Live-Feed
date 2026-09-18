import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  saveJobsToOfflineCache, 
  getCachedJobs, 
  getOfflineCacheMetadata, 
  queueOfflineAction, 
  getOfflineActionQueue, 
  clearOfflineActionQueue, 
  syncOfflineQueue,
  isOffline
} from './offline_job_cache.js';

// Setup lightweight localStorage mock for Node test runner
const storageMap = new Map();
globalThis.localStorage = {
  getItem: (key) => storageMap.get(key) || null,
  setItem: (key, val) => storageMap.set(key, String(val)),
  removeItem: (key) => storageMap.delete(key),
  clear: () => storageMap.clear()
};

test('offline_job_cache: saves and retrieves jobs array with metadata', () => {
  storageMap.clear();

  const mockJobs = [
    { id: 'job-1', title: 'React Lead', company: 'Stripe', match_score: 95 },
    { id: 'job-2', title: 'Systems Engineer', company: 'Cloudflare', match_score: 88 }
  ];

  const saved = saveJobsToOfflineCache(mockJobs);
  assert.equal(saved, true);

  const cached = getCachedJobs();
  assert.equal(cached.length, 2);
  assert.equal(cached[0].title, 'React Lead');
  assert.equal(cached[1].company, 'Cloudflare');

  const meta = getOfflineCacheMetadata();
  assert.ok(meta);
  assert.equal(meta.count, 2);
  assert.equal(meta.isFresh, true);
});

test('offline_job_cache: queues and flushes offline candidate actions', async () => {
  storageMap.clear();

  assert.equal(getOfflineActionQueue().length, 0);

  queueOfflineAction({ type: 'save', jobId: 'job-1', title: 'React Lead' });
  queueOfflineAction({ type: 'apply', jobId: 'job-2', title: 'Systems Engineer' });

  const queue = getOfflineActionQueue();
  assert.equal(queue.length, 2);
  assert.equal(queue[0].type, 'save');
  assert.equal(queue[1].type, 'apply');

  const processed = [];
  const result = await syncOfflineQueue(async (item) => {
    processed.push(item);
  });

  assert.equal(result.count, 2);
  assert.equal(processed.length, 2);
  assert.equal(getOfflineActionQueue().length, 0, 'Queue should be cleared after sync');
});

test('offline_job_cache: handles empty inputs and invalid data safely', () => {
  storageMap.clear();
  assert.equal(saveJobsToOfflineCache([]), false);
  assert.equal(saveJobsToOfflineCache(null), false);
  assert.equal(queueOfflineAction(null), false);
  assert.equal(queueOfflineAction({}), false);
  assert.deepEqual(getCachedJobs(), []);
  assert.equal(getOfflineCacheMetadata(), null);
});

test('isOffline returns boolean based on navigator.onLine', () => {
  const originalNavigator = globalThis.navigator;
  try {
    const desc = Object.getOwnPropertyDescriptor(globalThis, 'navigator');
    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: false },
      configurable: true,
      writable: true
    });
    assert.equal(isOffline(), true);

    Object.defineProperty(globalThis, 'navigator', {
      value: { onLine: true },
      configurable: true,
      writable: true
    });
    assert.equal(isOffline(), false);
  } finally {
    globalThis.navigator = originalNavigator;
  }
});
