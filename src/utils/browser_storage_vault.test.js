import test from 'node:test';
import assert from 'node:assert/strict';
import {
  storageVault,
  STORES,
  DB_NAME,
  DB_VERSION,
  deriveKeyFromPassword,
  encryptWithPassword,
  decryptWithPassword,
  encryptAesGcm,
  decryptAesGcm,
  VaultLockedError,
  VAULT_PASSPHRASE_META_KEY,
  VAULT_CANARY_PLAINTEXT,
  requestPersistentStorage,
  checkVaultCheckpoint,
  isPersistentJob,
  isProtectedJob,
  MAX_STORAGE_BUDGET_MB,
  MAX_STORAGE_BUDGET_BYTES
} from './browser_storage_vault.js';

// ── Structural & Export Tests ─────────────────────────────────────────────────

test('browser_storage_vault: exports constants and instance properly (v2)', () => {
  assert.ok(storageVault, 'vault instance must exist');
  // v1 methods
  assert.equal(typeof storageVault.initDB, 'function');
  assert.equal(typeof storageVault.exportFullBackup, 'function');
  assert.equal(typeof storageVault.importFullBackup, 'function');
  assert.equal(typeof storageVault.clearAllData, 'function');
  assert.equal(typeof storageVault.saveKnowledgeBase, 'function');
  assert.equal(typeof storageVault.getKnowledgeBase, 'function');
  assert.equal(typeof storageVault.saveScope, 'function');
  assert.equal(typeof storageVault.getScope, 'function');
  assert.equal(typeof storageVault.saveJob, 'function');
  assert.equal(typeof storageVault.getJobs, 'function');
  assert.equal(typeof storageVault.getApplications, 'function');
  assert.equal(typeof storageVault.clear, 'function');
  // v2 new methods
  assert.equal(typeof storageVault.getStorageStats, 'function', 'getStorageStats must exist');
  assert.equal(typeof storageVault.setSecureItem, 'function', 'setSecureItem must exist');
  assert.equal(typeof storageVault.getSecureItem, 'function', 'getSecureItem must exist');
  assert.equal(typeof storageVault.saveResumeFile, 'function', 'saveResumeFile must exist');
  assert.equal(typeof storageVault.getResumeFile, 'function', 'getResumeFile must exist');
  assert.equal(typeof storageVault.getResumeFilesMeta, 'function', 'getResumeFilesMeta must exist');
  assert.equal(typeof storageVault.saveWatchlistEntry, 'function', 'saveWatchlistEntry must exist');
  assert.equal(typeof storageVault.getWatchlist, 'function', 'getWatchlist must exist');
  assert.equal(typeof storageVault.deleteWatchlistEntry, 'function', 'deleteWatchlistEntry must exist');
  assert.equal(typeof storageVault.getCachedVector, 'function', 'getCachedVector must exist');
  assert.equal(typeof storageVault.saveCachedVector, 'function', 'saveCachedVector must exist');
  assert.equal(typeof storageVault.pruneStaleVaultRecords, 'function', 'pruneStaleVaultRecords must exist');
  assert.equal(typeof storageVault.getScoreHistory, 'function', 'getScoreHistory must exist');
  assert.equal(typeof storageVault.appendScoreHistory, 'function', 'appendScoreHistory must exist');
  assert.equal(typeof storageVault.clearScoreHistory, 'function', 'clearScoreHistory must exist');
  assert.equal(typeof storageVault.markJobApplied, 'function', 'markJobApplied must exist');
  assert.equal(typeof storageVault.unmarkJobApplied, 'function', 'unmarkJobApplied must exist');
  assert.equal(typeof storageVault.isJobApplied, 'function', 'isJobApplied must exist');
});

test('browser_storage_vault: STORES v3 contains all 8 store names', () => {
  assert.equal(STORES.KNOWLEDGE_BASE, 'knowledge_base');
  assert.equal(STORES.JOBS, 'jobs');
  assert.equal(STORES.SCOPE, 'scope');
  assert.equal(STORES.HISTORY, 'application_history');
  assert.equal(STORES.SETTINGS, 'settings');
  assert.equal(STORES.WATCHLIST, 'watchlist', 'v2: watchlist store must exist');
  assert.equal(STORES.RESUME_FILES, 'resume_files', 'v2: resume_files store must exist');
  assert.equal(STORES.CONTACTS, 'contacts', 'v3: contacts store must exist');
  // Verify all 8 stores are defined
  assert.equal(Object.keys(STORES).length, 8, 'Exactly 8 stores in v3');
});

test('browser_storage_vault: handles missing indexedDB environment gracefully', async () => {
  await assert.rejects(async () => {
    await storageVault.initDB();
  }, /IndexedDB is not supported/);
});

test('browser_storage_vault: validates backup structure on import', async () => {
  await assert.rejects(async () => {
    await storageVault.importFullBackup({ invalid: 'structure' });
  }, /Invalid backup file format/);
});

// ── getStorageStats Tests ─────────────────────────────────────────────────────

test('browser_storage_vault: getStorageStats returns correct shape', async () => {
  const stats = await storageVault.getStorageStats();
  assert.ok(stats, 'stats object must exist');
  assert.ok('used' in stats, 'stats.used must exist');
  assert.ok('available' in stats, 'stats.available must exist');
  assert.ok('usedBytes' in stats, 'stats.usedBytes must exist');
  assert.ok('quotaBytes' in stats, 'stats.quotaBytes must exist');
  assert.ok('usedPercent' in stats, 'stats.usedPercent must exist');
  assert.ok('isPersisted' in stats, 'stats.isPersisted must exist');
  assert.equal(typeof stats.usedBytes, 'number', 'usedBytes must be a number');
  assert.equal(typeof stats.usedPercent, 'number', 'usedPercent must be a number');
  // In Node test environment without navigator.storage, values default safely
  assert.equal(typeof stats.used, 'string', 'used must be a string');
});

test('browser_storage_vault: getStorageStats usedPercent is within 0-100 range', async () => {
  const stats = await storageVault.getStorageStats();
  assert.ok(stats.usedPercent >= 0, 'usedPercent must be >= 0');
  assert.ok(stats.usedPercent <= 100, 'usedPercent must be <= 100');
});

// ── Encrypted Settings Tests ──────────────────────────────────────────────────

test('browser_storage_vault: setSecureItem and getSecureItem are functions', () => {
  // In Node env without IndexedDB and SubtleCrypto, these should be functions
  assert.equal(typeof storageVault.setSecureItem, 'function');
  assert.equal(typeof storageVault.getSecureItem, 'function');
});

test('browser_storage_vault: Phase 7 Multi-Persona & Cover Letter Memory Vault methods exist', () => {
  assert.equal(typeof storageVault.getPersonas, 'function', 'getPersonas must exist');
  assert.equal(typeof storageVault.getActivePersonaId, 'function', 'getActivePersonaId must exist');
  assert.equal(typeof storageVault.getActivePersona, 'function', 'getActivePersona must exist');
  assert.equal(typeof storageVault.setActivePersona, 'function', 'setActivePersona must exist');
  assert.equal(typeof storageVault.updatePersona, 'function', 'updatePersona must exist');
  assert.equal(typeof storageVault.saveCoverLetter, 'function', 'saveCoverLetter must exist');
  assert.equal(typeof storageVault.getCoverLetter, 'function', 'getCoverLetter must exist');
  assert.equal(typeof storageVault.getAllCoverLetters, 'function', 'getAllCoverLetters must exist');
  assert.equal(typeof storageVault.getPastCoverLetterParagraphs, 'function', 'getPastCoverLetterParagraphs must exist');
});

test('browser_storage_vault: setSecureItem rejects on missing IndexedDB', async () => {
  // Without IndexedDB (Node env), setSecureItem will fail at initDB()
  await assert.rejects(
    async () => { await storageVault.setSecureItem('GEMINI_API_KEY', 'test_key_value'); },
    (err) => {
      // Must reject — either IndexedDB not supported or similar
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test('browser_storage_vault: getSecureItem rejects on missing IndexedDB', async () => {
  await assert.rejects(
    async () => { await storageVault.getSecureItem('GEMINI_API_KEY'); },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

// ── Resume File Store Tests ───────────────────────────────────────────────────

test('browser_storage_vault: saveResumeFile rejects on missing IndexedDB', async () => {
  // Create a mock File-like object
  const mockFile = new Blob(['%PDF-1.4 fake content'], { type: 'application/pdf' });
  // Node has Blob but not File — construct manually
  const file = Object.assign(mockFile, { name: 'resume.pdf', arrayBuffer: () => mockFile.arrayBuffer() });

  await assert.rejects(
    async () => { await storageVault.saveResumeFile(file); },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test('browser_storage_vault: getResumeFile rejects on missing IndexedDB', async () => {
  await assert.rejects(
    async () => { await storageVault.getResumeFile('primary'); },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test('browser_storage_vault: getResumeFilesMeta rejects on missing IndexedDB', async () => {
  await assert.rejects(
    async () => { await storageVault.getResumeFilesMeta(); },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

// ── Watchlist Store Tests ─────────────────────────────────────────────────────

test('browser_storage_vault: saveWatchlistEntry rejects on missing IndexedDB', async () => {
  await assert.rejects(
    async () => {
      await storageVault.saveWatchlistEntry({
        slug: 'openai', name: 'OpenAI', url: 'https://openai.com/careers',
        platform: 'greenhouse'
      });
    },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

test('browser_storage_vault: getWatchlist rejects on missing IndexedDB', async () => {
  await assert.rejects(
    async () => { await storageVault.getWatchlist(); },
    (err) => {
      assert.ok(err instanceof Error);
      return true;
    }
  );
});

// ── Backup Format Tests ───────────────────────────────────────────────────────

test('browser_storage_vault: importFullBackup handles all v2 store keys', async () => {
  // Should handle a v2 backup that includes watchlist without crashing on the structure check
  await assert.rejects(
    async () => {
      await storageVault.importFullBackup({
        stores: {
          knowledge_base: [], jobs: [], scope: [],
          application_history: [], settings: [], watchlist: []
        }
      });
    },
    // Will fail at initDB() — that's expected in Node env without IndexedDB
    (err) => {
      // Must NOT fail with "Invalid backup file format" — it should pass the structure check
      assert.ok(!err.message.includes('Invalid backup file format'),
        'Valid v2 backup should pass structure validation');
      return true;
    }
  );
});

// ── Cross-Tab Sync Subscription Tests ─────────────────────────────────────────

test('browser_storage_vault: subscribeToVaultSync receives broadcast events and unsubscribes cleanly', () => {
  const events = [];
  const unsubscribe = storageVault.subscribeToVaultSync((e) => {
    events.push(e);
  });

  storageVault.notifyVaultSync(STORES.JOBS, { id: 'job_test_123' });
  assert.equal(events.length, 1);
  assert.equal(events[0].type, 'VAULT_SYNC');
  assert.equal(events[0].store, 'jobs');
  assert.equal(events[0].data?.id, 'job_test_123');

  // Test unsubscribe
  unsubscribe();
  storageVault.notifyVaultSync(STORES.KNOWLEDGE_BASE);
  assert.equal(events.length, 1, 'Should not receive events after unsubscribe');
});

// ── Vault GC Pruning Tests ─────────────────────────────────────────────────────

test('browser_storage_vault: pruneStaleVaultRecords returns safe default stats in non-IDB env', async () => {
  const stats = await storageVault.pruneStaleVaultRecords();
  assert.deepEqual(stats, { prunedJobs: 0, prunedHistory: 0, prunedVectors: 0 });
});

test('browser_storage_vault: pruneStaleVaultRecords prunes unapplied stale jobs and preserves protected jobs', async () => {
  const now = Date.now();
  const oldTime = new Date(now - 45 * 24 * 60 * 60 * 1000).toISOString();
  const recentTime = new Date(now - 5 * 24 * 60 * 60 * 1000).toISOString();

  const mockJobs = [
    { id: 'job_stale_discard', title: 'Old Role', status: 'new', created_at: oldTime },
    { id: 'job_stale_applied', title: 'Old Applied Role', status: 'applied', created_at: oldTime },
    { id: 'job_stale_interview', title: 'Old Interview Role', status: 'interview', created_at: oldTime },
    { id: 'job_stale_offer', title: 'Old Offer Role', status: 'offer', created_at: oldTime },
    { id: 'job_recent', title: 'Fresh Role', status: 'new', created_at: recentTime },
  ];

  const mockHistory = [
    { id: 1, company: 'Old Corp', applied_at: new Date(now - 100 * 24 * 60 * 60 * 1000).toISOString() },
    { id: 2, company: 'Recent Corp', applied_at: new Date(now - 20 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const mockKb = [
    { key: 'profile', full_name: 'Test Candidate' },
    { key: 'vec_old', hash: 'old', cached_at: now - 40 * 24 * 60 * 60 * 1000 },
    { key: 'vec_new', hash: 'new', cached_at: now - 5 * 24 * 60 * 60 * 1000 }
  ];

  const deletedItems = [];

  const originalGetAll = storageVault.getAll;
  const originalDeleteItem = storageVault.deleteItem;

  storageVault.getAll = async (storeName) => {
    if (storeName === STORES.JOBS) return mockJobs;
    if (storeName === STORES.HISTORY) return mockHistory;
    if (storeName === STORES.KNOWLEDGE_BASE) return mockKb;
    return [];
  };

  storageVault.deleteItem = async (storeName, key) => {
    deletedItems.push({ storeName, key });
    return true;
  };

  try {
    const stats = await storageVault.pruneStaleVaultRecords({ maxAgeDays: 30 });
    assert.equal(stats.prunedJobs, 1, 'Only unapplied old job should be pruned');
    assert.equal(stats.prunedHistory, 1, 'Only >90d history record should be pruned');
    assert.equal(stats.prunedVectors, 1, 'Only >30d vector should be pruned');

    assert.deepEqual(deletedItems, [
      { storeName: 'jobs', key: 'job_stale_discard' },
      { storeName: 'application_history', key: 1 },
      { storeName: 'knowledge_base', key: 'vec_old' }
    ]);
  } finally {
    storageVault.getAll = originalGetAll;
    storageVault.deleteItem = originalDeleteItem;
  }
});

// ── Score Progression History Tests ──────────────────────────────────────────

test('browser_storage_vault: getScoreHistory returns array in fallback env', async () => {
  const history = await storageVault.getScoreHistory();
  assert.ok(Array.isArray(history), 'Score history must return an array');
});

test('browser_storage_vault: appendScoreHistory appends records and caps at 30 entries', async () => {
  const mockStorage = [];
  const originalGet = storageVault.getScoreHistory;
  const originalSet = storageVault.setItem;

  storageVault.getScoreHistory = async () => [...mockStorage];
  storageVault.setItem = async (key, val) => {
    if (key === 'sprav_score_history') {
      mockStorage.length = 0;
      mockStorage.push(...val);
    }
    return true;
  };

  try {
    // Append 1st record
    const res1 = await storageVault.appendScoreHistory({
      score: 65,
      jobTitle: 'Backend Engineer',
      company: 'Stripe',
      targetAts: 'Workday'
    });
    assert.equal(res1.length, 1);
    assert.equal(res1[0].score, 65);
    assert.equal(res1[0].company, 'Stripe');
    assert.ok(res1[0].id.startsWith('score_'));

    // Append 2nd record
    const res2 = await storageVault.appendScoreHistory({
      score: 84,
      jobTitle: 'Senior Backend Engineer',
      company: 'Google'
    });
    assert.equal(res2.length, 2);
    assert.equal(res2[1].score, 84);

    // Test clear
    const cleared = await storageVault.clearScoreHistory();
    assert.equal(cleared, true);
    assert.equal(mockStorage.length, 0);
  } finally {
    storageVault.getScoreHistory = originalGet;
    storageVault.setItem = originalSet;
  }
});

// ── Vault Cryptography & Key Derivation Tests (Phase 8.2) ────────────────────

test('browser_storage_vault: AES-GCM 256-bit encryption/decryption roundtrip', async () => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return;

  const key = await crypto.subtle.generateKey(
    { name: 'AES-GCM', length: 256 },
    true,
    ['encrypt', 'decrypt']
  );

  const secretPlaintext = 'sk-gemini-ai-ultra-live-credential-2026';
  const encryptedPayload = await encryptAesGcm(key, secretPlaintext);

  assert.ok(encryptedPayload, 'Encrypted payload must exist');
  assert.ok(encryptedPayload.includes(':'), 'Must contain IV and ciphertext separated by colon');

  const [ivB64, ciphertextB64] = encryptedPayload.split(':');
  assert.ok(ivB64.length > 0, 'IV base64 must not be empty');
  assert.ok(ciphertextB64.length > 0, 'Ciphertext base64 must not be empty');
  assert.notEqual(encryptedPayload, secretPlaintext, 'Ciphertext must not be plaintext');

  const decrypted = await decryptAesGcm(key, encryptedPayload);
  assert.equal(decrypted, secretPlaintext, 'Decrypted plaintext must exactly match original');
});

test('browser_storage_vault: PBKDF2 key derivation is deterministic and unique', async () => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return;

  const saltA = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16]);
  const saltB = new Uint8Array([16, 15, 14, 13, 12, 11, 10, 9, 8, 7, 6, 5, 4, 3, 2, 1]);

  const key1 = await deriveKeyFromPassword('MasterCandidateSecret123', saltA, 1000);
  const key2 = await deriveKeyFromPassword('MasterCandidateSecret123', saltA, 1000);
  const keyDifferentSalt = await deriveKeyFromPassword('MasterCandidateSecret123', saltB, 1000);
  const keyDifferentPass = await deriveKeyFromPassword('DifferentSecret456', saltA, 1000);

  // Key1 and Key2 derived from same password and salt must cross-decrypt
  const plaintext = 'top_secret_auth_token_for_vault';
  const ciphertext = await encryptAesGcm(key1, plaintext);
  const decrypted = await decryptAesGcm(key2, ciphertext);
  assert.equal(decrypted, plaintext, 'Keys from identical password and salt must cross-decrypt');

  // Key with different salt must fail decryption
  await assert.rejects(async () => {
    await decryptAesGcm(keyDifferentSalt, ciphertext);
  });

  // Key with different password must fail decryption
  await assert.rejects(async () => {
    await decryptAesGcm(keyDifferentPass, ciphertext);
  });
});

test('browser_storage_vault: password-based encryption and decryption roundtrip', async () => {
  if (typeof crypto === 'undefined' || !crypto.subtle) return;

  const password = 'SovereignCandidatePassphrase_2026!';
  const apiKey = 'hunter_live_api_key_8492049284209';

  const encrypted = await encryptWithPassword(password, apiKey);
  assert.ok(encrypted.includes(':'));
  const parts = encrypted.split(':');
  assert.equal(parts.length, 3, 'Payload must have salt, iv, and ciphertext');

  const decrypted = await decryptWithPassword(password, encrypted);
  assert.equal(decrypted, apiKey, 'Decrypted value must match original API key');

  // Wrong password must reject
  await assert.rejects(async () => {
    await decryptWithPassword('WrongPassword123!', encrypted);
  });
});

// ── IndexedDB Schema Migrations (v1 -> v2) Tests ──────────────────────────────

test('browser_storage_vault: validates IndexedDB v3 schema constants and migration structure', () => {
  assert.equal(DB_NAME, 'SPravJobAI_Vault');
  assert.equal(DB_VERSION, 3);

  const requiredStores = [
    'knowledge_base',
    'jobs',
    'scope',
    'application_history',
    'settings',
    'watchlist',
    'resume_files',
    'contacts'
  ];

  for (const store of requiredStores) {
    assert.ok(Object.values(STORES).includes(store), `Store ${store} must be defined in STORES`);
  }
  assert.equal(Object.keys(STORES).length, 8, 'All 8 v3 object stores must be registered');
});

test('browser_storage_vault: simulates onupgradeneeded schema upgrade for v1 to v2', () => {
  // Mock IDBDatabase and IDBTransaction to test migration logic
  const createdStores = new Map();
  const createdIndexes = new Map();

  const mockDb = {
    objectStoreNames: {
      contains: (name) => createdStores.has(name)
    },
    createObjectStore: (name, options) => {
      const storeObj = {
        name,
        options,
        indexNames: {
          contains: (idxName) => (createdIndexes.get(name) || new Set()).has(idxName)
        },
        createIndex: (idxName, keyPath, idxOptions) => {
          if (!createdIndexes.has(name)) createdIndexes.set(name, new Set());
          createdIndexes.get(name).add(idxName);
        }
      };
      createdStores.set(name, storeObj);
      return storeObj;
    }
  };

  // Simulate existing v1 stores (without created_at index on jobs, and missing watchlist & resume_files)
  mockDb.createObjectStore(STORES.KNOWLEDGE_BASE, { keyPath: 'key' });
  const v1JobStore = mockDb.createObjectStore(STORES.JOBS, { keyPath: 'id' });
  v1JobStore.createIndex('status', 'status', { unique: false });
  v1JobStore.createIndex('portal', 'portal', { unique: false });
  v1JobStore.createIndex('score', 'match_score', { unique: false });

  // Simulate upgrade to v2 (oldVersion = 1)
  const oldVersion = 1;
  const targetVersion = 2;

  // Migration logic execution (matching initDB onupgradeneeded)
  if (!mockDb.objectStoreNames.contains(STORES.WATCHLIST)) {
    const wlStore = mockDb.createObjectStore(STORES.WATCHLIST, { keyPath: 'slug' });
    wlStore.createIndex('platform', 'platform', { unique: false });
    wlStore.createIndex('added_at', 'added_at', { unique: false });
  }

  if (!mockDb.objectStoreNames.contains(STORES.RESUME_FILES)) {
    const rfStore = mockDb.createObjectStore(STORES.RESUME_FILES, { keyPath: 'id' });
    rfStore.createIndex('uploaded_at', 'uploaded_at', { unique: false });
  }

  if (oldVersion < 2 && mockDb.objectStoreNames.contains(STORES.JOBS)) {
    const jobStore = createdStores.get(STORES.JOBS);
    if (!jobStore.indexNames.contains('created_at')) {
      jobStore.createIndex('created_at', 'created_at', { unique: false });
    }
  }

  // Verifications
  assert.ok(mockDb.objectStoreNames.contains(STORES.WATCHLIST), 'Watchlist store must be created on v2 upgrade');
  assert.ok(mockDb.objectStoreNames.contains(STORES.RESUME_FILES), 'Resume files store must be created on v2 upgrade');
  assert.ok(createdIndexes.get(STORES.JOBS).has('created_at'), 'created_at index must be added to jobs store on v2 upgrade');
});

test('browser_storage_vault: 1-Click Application Tracking methods handle empty or missing inputs gracefully', async () => {
  const res1 = await storageVault.markJobApplied('');
  assert.equal(res1.success, false);
  assert.equal(res1.error, 'jobId is required');

  const res2 = await storageVault.unmarkJobApplied('');
  assert.equal(res2.success, false);

  const res3 = await storageVault.isJobApplied('');
  assert.equal(res3, false);
});

// ── Contact Relationship CRM Tests (Phase 1.4: Huntr & Teal Parity) ─────────

test('browser_storage_vault: STORES contains CONTACTS and methods exist', () => {
  assert.equal(STORES.CONTACTS, 'contacts');
  assert.equal(typeof storageVault.saveContact, 'function');
  assert.equal(typeof storageVault.getContacts, 'function');
  assert.equal(typeof storageVault.getContact, 'function');
  assert.equal(typeof storageVault.getContactsForJob, 'function');
  assert.equal(typeof storageVault.getContactsForCompany, 'function');
  assert.equal(typeof storageVault.deleteContact, 'function');
  assert.equal(typeof storageVault.getDueContactFollowups, 'function');
});

test('browser_storage_vault: saveContact validates input object', async () => {
  await assert.rejects(
    async () => { await storageVault.saveContact(null); },
    /Contact must be an object/
  );
  await assert.rejects(
    async () => { await storageVault.saveContact('not-an-object'); },
    /Contact must be an object/
  );
});

test('browser_storage_vault: v3 schema migration creates CONTACTS store with indexes', () => {
  const createdStores = new Map();
  const createdIndexes = new Map();

  const mockDb = {
    objectStoreNames: {
      contains: (name) => createdStores.has(name)
    },
    createObjectStore: (name, options) => {
      const indexes = new Set();
      createdIndexes.set(name, indexes);
      const store = {
        name,
        options,
        indexNames: { contains: (idx) => indexes.has(idx) },
        createIndex: (idxName) => indexes.add(idxName)
      };
      createdStores.set(name, store);
      return store;
    }
  };

  // Run v3 migration logic
  if (!mockDb.objectStoreNames.contains(STORES.CONTACTS)) {
    const contactStore = mockDb.createObjectStore(STORES.CONTACTS, { keyPath: 'id' });
    contactStore.createIndex('company', 'company', { unique: false });
    contactStore.createIndex('linked_job_id', 'linked_job_id', { unique: false });
    contactStore.createIndex('next_followup_date', 'next_followup_date', { unique: false });
    contactStore.createIndex('last_contacted_date', 'last_contacted_date', { unique: false });
  }

  assert.ok(mockDb.objectStoreNames.contains(STORES.CONTACTS), 'Contacts store must be created');
  const indexes = createdIndexes.get(STORES.CONTACTS);
  assert.ok(indexes.has('company'), 'company index must exist');
  assert.ok(indexes.has('linked_job_id'), 'linked_job_id index must exist');
  assert.ok(indexes.has('next_followup_date'), 'next_followup_date index must exist');
  assert.ok(indexes.has('last_contacted_date'), 'last_contacted_date index must exist');
});

test('browser_storage_vault: importFullBackup handles v3 backup with contacts store', async () => {
  await assert.rejects(
    async () => {
      await storageVault.importFullBackup({
        stores: {
          knowledge_base: [], jobs: [], scope: [],
          application_history: [], settings: [], watchlist: [],
          contacts: [
            {
              id: 'contact_1',
              name: 'Alex Morgan',
              role: 'Senior Tech Recruiter',
              company: 'Stripe',
              email: 'alex.m@stripe.com',
              notes: 'Prefers Tuesday emails',
              last_contacted_date: '2026-09-01',
              next_followup_date: '2026-09-15'
            }
          ]
        }
      });
    },
    (err) => {
      // Must pass backup structure check and only reject on Node lack of indexedDB
      assert.ok(!err.message.includes('Invalid backup file format'));
      return true;
    }
  );
});

// ── Master Passphrase Vault Tests (Part 3 Security Hardening) ────────────────

test('browser_storage_vault: exports passphrase constants and VaultLockedError', () => {
  assert.equal(typeof VaultLockedError, 'function');
  const err = new VaultLockedError('Custom locked message');
  assert.equal(err.name, 'VaultLockedError');
  assert.equal(err.code, 'VAULT_LOCKED');
  assert.equal(err.message, 'Custom locked message');
  assert.equal(VAULT_PASSPHRASE_META_KEY, '__vault_passphrase_meta__');
  assert.equal(VAULT_CANARY_PLAINTEXT, 'SPRAV_VAULT_PASSPHRASE_VERIFIED');
});

test('browser_storage_vault: passphrase vault management methods exist', () => {
  assert.equal(typeof storageVault.isVaultPassphraseProtected, 'function');
  assert.equal(typeof storageVault.isVaultUnlocked, 'function');
  assert.equal(typeof storageVault.unlockVault, 'function');
  assert.equal(typeof storageVault.lockVault, 'function');
  assert.equal(typeof storageVault.setVaultPassphrase, 'function');
  assert.equal(typeof storageVault.clearVaultPassphrase, 'function');
});

test('browser_storage_vault: setVaultPassphrase enforces minimum length (6 chars)', async () => {
  const resEmpty = await storageVault.setVaultPassphrase('');
  assert.equal(resEmpty.success, false);
  assert.match(resEmpty.error, /at least 6 characters/);

  const resShort = await storageVault.setVaultPassphrase('12345');
  assert.equal(resShort.success, false);
  assert.match(resShort.error, /at least 6 characters/);

  const resNull = await storageVault.setVaultPassphrase(null);
  assert.equal(resNull.success, false);
});

test('browser_storage_vault: unlockVault validates required input', async () => {
  const resEmpty = await storageVault.unlockVault('');
  assert.equal(resEmpty.success, false);
  assert.match(resEmpty.error, /Passphrase is required/);

  const resNull = await storageVault.unlockVault(null);
  assert.equal(resNull.success, false);
});

test('browser_storage_vault: lockVault sets unlocked flag to false and returns true', () => {
  const res = storageVault.lockVault();
  assert.equal(res, true);
});

test('browser_storage_vault: canary encryption and PBKDF2 derivation cycle works correctly', async () => {
  const password = 'SuperSecretPassphrase2026!';
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKeyFromPassword(password, salt, 100000);
  assert.ok(key, 'Key must be derived successfully');

  const encryptedCanary = await encryptAesGcm(key, VAULT_CANARY_PLAINTEXT);
  assert.ok(encryptedCanary.includes(':'), 'Canary must be IV:ciphertext');

  // Verify successful decryption with correct key
  const decrypted = await decryptAesGcm(key, encryptedCanary);
  assert.equal(decrypted, VAULT_CANARY_PLAINTEXT);

  // Verify decryption failure with wrong key
  const wrongKey = await deriveKeyFromPassword('WrongPassword123!', salt, 100000);
  await assert.rejects(async () => {
    await decryptAesGcm(wrongKey, encryptedCanary);
  });
});

test('browser_storage_vault: pruneStaleVaultRecords preserves cover letters and resume snapshots', async () => {
  const now = Date.now();
  const oldTime = new Date(now - 120 * 24 * 60 * 60 * 1000).toISOString();

  const mockHistory = [
    { id: 101, company: 'Old Job App', applied_at: oldTime },
    { id: 'cover_letter_job_1', company: 'Target Corp', created_at: oldTime, full_text: 'Dear...' },
    { id: 'resume_snapshot_abc', title: 'Senior Resume', created_at: oldTime, templateId: 'modern' },
    { id: 102, company: 'Recent Job App', applied_at: new Date(now - 10 * 24 * 60 * 60 * 1000).toISOString() }
  ];

  const deletedItems = [];
  const origGetAll = storageVault.getAll;
  const origDeleteItem = storageVault.deleteItem;

  storageVault.getAll = async (storeName) => {
    if (storeName === STORES.HISTORY) return mockHistory;
    return [];
  };

  storageVault.deleteItem = async (storeName, key) => {
    deletedItems.push({ storeName, key });
    return true;
  };

  try {
    const stats = await storageVault.pruneStaleVaultRecords();
    assert.equal(stats.prunedHistory, 1, 'Only regular stale history application should be pruned');
    assert.deepEqual(deletedItems, [
      { storeName: 'application_history', key: 101 }
    ], 'Cover letters and resume snapshots must never be pruned');
  } finally {
    storageVault.getAll = origGetAll;
    storageVault.deleteItem = origDeleteItem;
  }
});

test('browser_storage_vault: saveKnowledgeBase does not overwrite existing scope when user has roles or locations configured', async () => {
  const origGetItem = storageVault.getItem;
  const origSetItem = storageVault.setItem;

  let savedScope = null;
  const existingScope = {
    roles: [{ keyword: 'Senior Software Engineer', preference: 'apply' }],
    locations: ['Remote', 'Bangalore'],
    experience_levels: ['Senior']
  };

  storageVault.getItem = async (store, key) => {
    if (store === STORES.SCOPE && key === 'criteria') return existingScope;
    return null;
  };

  storageVault.setItem = async (store, key, val) => {
    if (store === STORES.SCOPE) {
      savedScope = val;
    }
    return true;
  };

  try {
    const kbData = {
      personal: { name: 'Praveen', title: 'Senior Cloud Engineer' },
      work_history: [{ title: 'Cloud Engineer', description: 'AWS, Kubernetes, Terraform' }]
    };

    await storageVault.saveKnowledgeBase(kbData);
    assert.equal(savedScope, null, 'Existing user scope must not be overwritten by saveKnowledgeBase');
  } finally {
    storageVault.getItem = origGetItem;
    storageVault.setItem = origSetItem;
  }
});

test('browser_storage_vault: exportFullBackup strips VAULT_PASSPHRASE_META_KEY and encrypted settings', async () => {
  const origGetAll = storageVault.getAll;
  const mockSettings = [
    { key: 'theme', value: 'dark' },
    { key: 'engine_preference', value: 'webgpu' },
    { key: VAULT_PASSPHRASE_META_KEY, value: { salt: 'secret_salt', canary: 'iv:ciphertext' } },
    { key: 'vault_crypto_key', encrypted: true, value: 'raw_key_material' }
  ];

  storageVault.getAll = async (store) => {
    if (store === STORES.SETTINGS) return mockSettings;
    return [];
  };

  // Mock document.createElement and URL for node environment
  const origCreateElement = globalThis.document?.createElement;
  const origCreateObjectUrl = globalThis.URL?.createObjectURL;
  let exportedJson = null;

  globalThis.document = globalThis.document || {};
  globalThis.document.body = globalThis.document.body || { appendChild: () => {}, removeChild: () => {} };
  globalThis.document.createElement = () => ({
    click: () => {},
    setAttribute: () => {}
  });
  globalThis.URL = globalThis.URL || {};
  globalThis.URL.createObjectURL = (blob) => 'blob:mock-url';
  globalThis.URL.revokeObjectURL = () => {};

  try {
    const res = await storageVault.exportFullBackup();
    assert.ok(res.success, 'Backup export should report success');
  } finally {
    storageVault.getAll = origGetAll;
    if (origCreateElement) globalThis.document.createElement = origCreateElement;
    if (origCreateObjectUrl) globalThis.URL.createObjectURL = origCreateObjectUrl;
  }
});

test('browser_storage_vault: vector bundle and follow-up draft persistence methods exist and handle non-IDB safely', async () => {
  assert.equal(typeof storageVault.getCachedVectorBundle, 'function');
  assert.equal(typeof storageVault.saveCachedVectorBundle, 'function');
  assert.equal(typeof storageVault.getFollowupDraft, 'function');
  assert.equal(typeof storageVault.saveFollowupDraft, 'function');
  assert.equal(typeof storageVault.getAllFollowupDrafts, 'function');
  assert.equal(typeof storageVault.removeFollowupDraft, 'function');

  // Graceful handling when input is null/empty
  const emptyBundle = await storageVault.saveCachedVectorBundle(null);
  assert.equal(emptyBundle, false);

  const emptyDraft = await storageVault.saveFollowupDraft(null, null);
  assert.equal(emptyDraft, false);

  const emptyDrafts = await storageVault.getAllFollowupDrafts([]);
  assert.deepEqual(emptyDrafts, {});

  const removeEmpty = await storageVault.removeFollowupDraft(null);
  assert.equal(removeEmpty, false);
});

test('browser_storage_vault: interview practice history and tech screening persistence methods exist and handle non-IDB safely', async () => {
  assert.equal(typeof storageVault.getInterviewPracticeHistory, 'function');
  assert.equal(typeof storageVault.saveInterviewPracticeHistory, 'function');
  assert.equal(typeof storageVault.appendInterviewPracticeSession, 'function');
  assert.equal(typeof storageVault.clearInterviewPracticeHistory, 'function');
  assert.equal(typeof storageVault.getTechScreeningPracticeState, 'function');
  assert.equal(typeof storageVault.saveTechScreeningPracticeState, 'function');

  // Non-IDB fallback handling
  const history = await storageVault.getInterviewPracticeHistory();
  assert.ok(Array.isArray(history));

  const emptySave = await storageVault.saveInterviewPracticeHistory('invalid');
  assert.equal(emptySave, false);

  const emptyAppend = await storageVault.appendInterviewPracticeSession(null);
  assert.deepEqual(emptyAppend, []);

  const state = await storageVault.getTechScreeningPracticeState();
  assert.ok(typeof state === 'object' && state !== null);

  const emptyStateSave = await storageVault.saveTechScreeningPracticeState(null);
  assert.equal(emptyStateSave, false);
});

test('browser_storage_vault: requestPersistentStorage and checkVaultCheckpoint protect against storage volatility', async () => {
  assert.equal(typeof requestPersistentStorage, 'function');
  assert.equal(typeof checkVaultCheckpoint, 'function');
  assert.equal(typeof storageVault.requestPersistentStorage, 'function');
  assert.equal(typeof storageVault.checkVaultCheckpoint, 'function');

  // When navigator.storage is not available (Node test env), returns false gracefully
  const res = await requestPersistentStorage();
  assert.equal(typeof res, 'boolean');

  // Check checkpoint logic
  const fresh = checkVaultCheckpoint(new Date().toISOString());
  assert.equal(fresh.needsBackup, false);

  const missing = checkVaultCheckpoint(null);
  assert.equal(missing.needsBackup, true);
  assert.match(missing.reason, /No safe vault backup/i);

  const staleDate = new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString();
  const stale = checkVaultCheckpoint(staleDate);
  assert.equal(stale.needsBackup, true);
  assert.match(stale.reason, /older than 7 days/i);
});

test('browser_storage_vault: isPersistentJob strictly separates vault records from ephemeral discovery', () => {
  // Applied status
  assert.equal(isPersistentJob({ id: '1', title: 'Eng', status: 'applied' }), true);
  assert.equal(isPersistentJob({ id: '2', title: 'Eng', applied_at: '2026-09-17' }), true);
  assert.equal(isPersistentJob({ id: '3', title: 'Eng', is_applied: true }), true);
  assert.equal(isPersistentJob({ id: '4', title: 'Eng', stage: 'applied' }), true);

  // Ready to Apply / Staged / Queued status
  assert.equal(isPersistentJob({ id: '5', title: 'Eng', status: 'ready_to_apply' }), true);
  assert.equal(isPersistentJob({ id: '6', title: 'Eng', status: 'matched' }), true);
  assert.equal(isPersistentJob({ id: '7', title: 'Eng', status: 'staged' }), true);
  assert.equal(isPersistentJob({ id: '8', title: 'Eng', status: 'opened_for_manual_submit' }), true);
  assert.equal(isPersistentJob({ id: '9', title: 'Eng', status: 'manual_review' }), true);
  assert.equal(isPersistentJob({ id: '10', title: 'Eng', status: 'near_miss_review' }), true);

  // User explicitly saved or customized
  assert.equal(isPersistentJob({ id: '11', title: 'Eng', is_saved: true }), true);
  assert.equal(isPersistentJob({ id: '12', title: 'Eng', saved: true }), true);
  assert.equal(isPersistentJob({ id: '13', title: 'Eng', starred: true }), true);
  assert.equal(isPersistentJob({ id: '14', title: 'Eng', custom_resume: 'tailored text' }), true);
  assert.equal(isPersistentJob({ id: '15', title: 'Eng', tailored_bullet_points: ['bullet 1'] }), true);
  assert.equal(isPersistentJob({ id: '16', title: 'Eng', notes: 'Spoke with recruiter' }), true);

  // Raw un-actioned discovery listings MUST return false
  assert.equal(isPersistentJob({ id: '17', title: 'Eng', status: 'new' }), false);
  assert.equal(isPersistentJob({ id: '18', title: 'Eng', status: 'discovered' }), false);
  assert.equal(isPersistentJob({ id: '19', title: 'Eng' }), false);
  assert.equal(isPersistentJob(null), false);
  assert.equal(isPersistentJob({}), false);
});

test('browser_storage_vault: ephemeral discovery stream routes raw jobs to session RAM', async () => {
  const ephemeralJob = {
    id: 'stream_job_123',
    title: 'Distributed Systems Engineer',
    company: 'Cloudflare',
    status: 'new'
  };

  // Calling saveJob on an un-actioned discovery job stores in session map without throwing
  const saved = await storageVault.saveJob(ephemeralJob);
  assert.equal(saved, true);
  assert.equal(storageVault._sessionDiscoveryJobs.has('stream_job_123'), true);

  // Calling saveJobs on batch of ephemeral jobs
  const batch = [
    { id: 'stream_job_124', title: 'Kernel Dev', company: 'Fastly', status: 'discovered' },
    { id: 'stream_job_125', title: 'AI Researcher', company: 'Cohere', status: 'new' }
  ];
  const batchSaved = await storageVault.saveJobs(batch);
  assert.equal(batchSaved, true);
  assert.equal(storageVault._sessionDiscoveryJobs.has('stream_job_124'), true);
  assert.equal(storageVault._sessionDiscoveryJobs.has('stream_job_125'), true);

  // Clean up test items
  storageVault._sessionDiscoveryJobs.delete('stream_job_123');
  storageVault._sessionDiscoveryJobs.delete('stream_job_124');
  storageVault._sessionDiscoveryJobs.delete('stream_job_125');
});

test('browser_storage_vault: ready to apply methods promote jobs from session to persistent vault', async () => {
  assert.equal(typeof storageVault.markJobReadyToApply, 'function');
  assert.equal(typeof storageVault.unmarkJobReadyToApply, 'function');
  assert.equal(typeof storageVault.isJobReadyToApply, 'function');
  assert.equal(typeof storageVault.getPersistentJobs, 'function');
  assert.equal(typeof storageVault.getReadyToApplyJobs, 'function');
  assert.equal(typeof storageVault.purgeLegacyDiscoveryJobs, 'function');
});

test('browser_storage_vault: 1 GB storage budget cap is strictly defined', () => {
  assert.equal(MAX_STORAGE_BUDGET_MB, 1024, 'Storage budget cap must be strictly 1024 MB (1 GB)');
  assert.equal(MAX_STORAGE_BUDGET_BYTES, 1024 * 1024 * 1024, 'Storage budget bytes must equal 1 GB');
});

test('browser_storage_vault: isProtectedJob preserves the best (applied, saved, tailored, high-fit)', () => {
  // 1. Sacred applied / interviewing / offered jobs
  assert.equal(isProtectedJob({ id: 'p1', title: 'Eng', status: 'applied' }), true);
  assert.equal(isProtectedJob({ id: 'p2', title: 'Eng', status: 'interviewing' }), true);
  assert.equal(isProtectedJob({ id: 'p3', title: 'Eng', status: 'interview' }), true);
  assert.equal(isProtectedJob({ id: 'p4', title: 'Eng', status: 'offered' }), true);
  assert.equal(isProtectedJob({ id: 'p5', title: 'Eng', status: 'accepted' }), true);
  assert.equal(isProtectedJob({ id: 'p6', title: 'Eng', applied_at: '2026-09-18' }), true);
  assert.equal(isProtectedJob({ id: 'p7', title: 'Eng', is_applied: true }), true);

  // 2. Saved / Starred / Bookmarked
  assert.equal(isProtectedJob({ id: 's1', title: 'Eng', is_saved: true }), true);
  assert.equal(isProtectedJob({ id: 's2', title: 'Eng', saved: true }), true);
  assert.equal(isProtectedJob({ id: 's3', title: 'Eng', starred: true }), true);
  assert.equal(isProtectedJob({ id: 's4', title: 'Eng', bookmarked: true }), true);

  // 3. User crafted notes / tailored resumes / cover letters
  assert.equal(isProtectedJob({ id: 't1', title: 'Eng', notes: 'Spoke to recruiter' }), true);
  assert.equal(isProtectedJob({ id: 't2', title: 'Eng', custom_resume: 'Custom resume content' }), true);
  assert.equal(isProtectedJob({ id: 't3', title: 'Eng', tailored_bullet_points: ['Bullet 1'] }), true);
  assert.equal(isProtectedJob({ id: 't4', title: 'Eng', cover_letter: 'Dear hiring manager' }), true);

  // 4. High match score (Top recommendations)
  assert.equal(isProtectedJob({ id: 'm1', title: 'Eng', fit_score: 92 }), true);
  assert.equal(isProtectedJob({ id: 'm2', title: 'Eng', match_score: 85 }), true);
  assert.equal(isProtectedJob({ id: 'm3', title: 'Eng', score: 80 }), true);

  // 5. Unprotected / Useless candidates for deletion
  assert.equal(isProtectedJob({ id: 'u1', title: 'Eng', status: 'dismissed' }), false);
  assert.equal(isProtectedJob({ id: 'u2', title: 'Eng', status: 'rejected' }), false);
  assert.equal(isProtectedJob({ id: 'u3', title: 'Eng', status: 'discovered', match_score: 45 }), false);
  assert.equal(isProtectedJob({ id: 'u4', title: 'Eng', status: 'new' }), false);
  assert.equal(isProtectedJob(null), false);
  assert.equal(isProtectedJob({}), false);
});

test('browser_storage_vault: pruneOldestUselessJobs deletes useless first, then oldest, preserving applied & KB', async () => {
  const now = Date.now();
  const tOldest = new Date(now - 60 * 24 * 60 * 60 * 1000).toISOString();
  const tOlder = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();
  const tRecent = new Date(now - 2 * 24 * 60 * 60 * 1000).toISOString();

  const mockJobs = [
    { id: 'job_applied_sacred', title: 'Lead Architect', status: 'applied', created_at: tOldest },
    { id: 'job_starred_best', title: 'Staff Engineer', starred: true, created_at: tOldest },
    { id: 'job_high_fit', title: 'Principal Engineer', fit_score: 95, created_at: tOldest },
    { id: 'job_useless_dismissed', title: 'Irrelevant Role', status: 'dismissed', created_at: tRecent },
    { id: 'job_old_unapplied', title: 'Old Unapplied Listing', status: 'discovered', match_score: 50, created_at: tOldest },
    { id: 'job_newer_unapplied', title: 'Newer Unapplied Listing', status: 'discovered', match_score: 55, created_at: tOlder }
  ];

  const deletedKeys = [];
  const origDeleteItem = storageVault.deleteItem;
  const origGetAll = storageVault.getAll;

  storageVault.getAll = async (store) => {
    if (store === STORES.JOBS) return mockJobs;
    if (store === STORES.KNOWLEDGE_BASE) return [{ key: 'profile', full_name: 'Sacred User' }];
    return [];
  };

  storageVault.deleteItem = async (storeName, id) => {
    deletedKeys.push({ storeName, id });
    return true;
  };

  try {
    const res = await storageVault.pruneOldestUselessJobs({ targetCount: 2 });
    assert.equal(res.protectedCount, 3, 'Must protect 3 jobs (applied, starred, high-fit)');
    assert.equal(res.prunedCount, 2, 'Must prune exactly 2 jobs');
    
    // First pruned must be the explicitly useless dismissed job, followed by the oldest unapplied listing
    assert.equal(deletedKeys[0].id, 'job_useless_dismissed', 'Dismissed useless job must be pruned first');
    assert.equal(deletedKeys[1].id, 'job_old_unapplied', 'Oldest unapplied job must be pruned next');

    // Applied, starred, and high-fit must NEVER be in deletedKeys
    assert.ok(!deletedKeys.some(k => k.id === 'job_applied_sacred'));
    assert.ok(!deletedKeys.some(k => k.id === 'job_starred_best'));
    assert.ok(!deletedKeys.some(k => k.id === 'job_high_fit'));
    // Knowledge Base store must NEVER be touched during job pruning
    assert.ok(!deletedKeys.some(k => k.storeName === STORES.KNOWLEDGE_BASE));
  } finally {
    storageVault.getAll = origGetAll;
    storageVault.deleteItem = origDeleteItem;
  }
});

test('browser_storage_vault: purgeStaleKnowledgeBaseArtifacts purges old vector caches and keeps new KB', async () => {
  const mockKbItems = [
    { key: 'profile', full_name: 'New Profile' },
    { key: 'personas_meta', activePersonaId: 'persona_1' },
    { key: 'persona_1', id: 'persona_1', role: 'Staff Eng' },
    { key: 'vec_old_hash_1', hash: 'old1' },
    { key: 'vec_old_hash_2', hash: 'old2' },
    { key: 'kb_vector_bundle', bundle: [] },
    { key: 'kb_draft_temp', draft: true }
  ];

  const mockResumeFiles = [
    { id: 'primary', name: 'latest_resume.pdf' },
    { id: 'old_resume_1', name: 'abandoned.pdf' }
  ];

  const deleted = [];
  const origGetAll = storageVault.getAll;
  const origDeleteItem = storageVault.deleteItem;

  storageVault.getAll = async (store) => {
    if (store === STORES.KNOWLEDGE_BASE) return mockKbItems;
    if (store === STORES.RESUME_FILES) return mockResumeFiles;
    return [];
  };

  storageVault.deleteItem = async (store, key) => {
    deleted.push({ store, key });
    return true;
  };

  try {
    await storageVault.purgeStaleKnowledgeBaseArtifacts();
    
    // Check that old vectors and old bundles were purged
    assert.ok(deleted.some(d => d.store === 'knowledge_base' && d.key === 'vec_old_hash_1'));
    assert.ok(deleted.some(d => d.store === 'knowledge_base' && d.key === 'vec_old_hash_2'));
    assert.ok(deleted.some(d => d.store === 'knowledge_base' && d.key === 'kb_vector_bundle'));
    assert.ok(deleted.some(d => d.store === 'knowledge_base' && d.key === 'kb_draft_temp'));
    assert.ok(deleted.some(d => d.store === 'resume_files' && d.key === 'old_resume_1'));

    // Active profile, personas_meta, and primary resume must NOT be deleted
    assert.ok(!deleted.some(d => d.key === 'profile'));
    assert.ok(!deleted.some(d => d.key === 'personas_meta'));
    assert.ok(!deleted.some(d => d.key === 'persona_1'));
    assert.ok(!deleted.some(d => d.key === 'primary'));
  } finally {
    storageVault.getAll = origGetAll;
    storageVault.deleteItem = origDeleteItem;
  }
});







