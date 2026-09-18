/**
 * browser_storage_vault.js
 * =========================
 * Client-Side In-Browser Storage Vault using native IndexedDB and Web Crypto API.
 * Provides $0-server-cost, zero-download permanent local storage for SPrav Job AI.
 *
 * Capabilities:
 * - Native IndexedDB v2 with 7 object stores (jobs, knowledge_base, scope,
 *   history, settings, watchlist, resume_files).
 * - Persistent Storage Lock via navigator.storage.persist() to prevent eviction.
 * - AES-GCM encrypted settings store for API keys (Web Crypto API, zero deps).
 * - In-memory LRU cache for high-frequency reads (knowledge_base, scope).
 * - Storage quota monitoring via navigator.storage.estimate().
 * - Resume file store: saves raw PDF ArrayBuffer so users never re-upload.
 * - 1-Click Full Backup Export (.json) and 1-Click Restore (.json).
 * - Zero external library dependencies.
 */

import { safeJsonParse, sanitizeObject } from './security_guard.js';
import { detectCandidateDomain } from './tech_roles_taxonomy.js';
import { TOP_100_TECH_COMPANIES } from './top_tech_companies_catalog.js';

const DB_NAME = 'SPravJobAI_Vault';
const DB_VERSION = 3; // v3: adds contacts relationship CRM store, indexes for company, linked_job_id, next_followup_date

const STORES = {
  KNOWLEDGE_BASE: 'knowledge_base',
  JOBS: 'jobs',
  SCOPE: 'scope',
  HISTORY: 'application_history',
  SETTINGS: 'settings',
  WATCHLIST: 'watchlist',
  RESUME_FILES: 'resume_files',
  CONTACTS: 'contacts',
};

export const MAX_STORAGE_BUDGET_MB = 1024; // 1 GB Maximum Storage Budget Cap
export const MAX_STORAGE_BUDGET_BYTES = 1024 * 1024 * 1024; // 1,073,741,824 bytes
export const STORAGE_WARNING_THRESHOLD_BYTES = 900 * 1024 * 1024; // 900 MB

export const SEED_STARTER_PROJECTS = [
  {
    id: 'proj_starter_1',
    name: 'SPrav Job AI — Autonomous Career Platform',
    is_demo: true,
    demo_tag: 'Starter Template Demo',
    tech: 'React 19, WebGPU, TypeScript, IndexedDB, Web Workers',
    tech_stack: 'React 19, WebGPU, TypeScript, IndexedDB, Web Workers',
    url: '', // Starter template - candidate adds personal repo or live demo link
    description: 'Zero-download in-browser ATS resume compiler and career intelligence platform with on-device WebGPU inference.',
    bullets: [
      'Engineered client-side WebGPU LLM inference pipeline achieving <450ms token generation without backend server costs.',
      'Implemented AES-GCM 256-bit encrypted IndexedDB data vault with sub-5ms localized vector search caching.',
      'Built multi-template ATS resume compiler rendering 6 compliant PDF archetypes with zero server latency.'
    ],
    start_date: '2025',
    end_date: 'Present'
  },
  {
    id: 'proj_starter_2',
    name: 'Distributed Real-Time Event Engine',
    is_demo: true,
    demo_tag: 'Starter Template Demo',
    tech: 'Go, Apache Kafka, Redis, gRPC, Docker',
    tech_stack: 'Go, Apache Kafka, Redis, gRPC, Docker',
    url: '', // Starter template - candidate adds personal repo or live demo link
    description: 'High-throughput event ingestion framework processing distributed telemetry streams with fault-tolerant partitioning.',
    bullets: [
      'Architected event pipeline handling 1.8M events/min with sub-15ms p99 latency across clustered worker nodes.',
      'Designed raft consensus leader election with automated failover recovery, cutting unplanned partition downtime by 98%.'
    ],
    start_date: '2024',
    end_date: '2025'
  }
];

// ── In-Memory LRU Cache with TTL ──────────────────────────────────────────────
const MAX_CACHE_SIZE = 20;
const DEFAULT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes TTL
const _lruCache = new Map(); // key → { value, ts }

function _cacheGet(key, maxAgeMs = DEFAULT_CACHE_TTL_MS) {
  const entry = _lruCache.get(key);
  if (!entry) return undefined;
  // Check TTL expiration
  if (entry.ts && (Date.now() - entry.ts > maxAgeMs)) {
    _lruCache.delete(key);
    return undefined;
  }
  // Refresh recency
  _lruCache.delete(key);
  _lruCache.set(key, entry);
  return entry.value;
}

function _cacheSet(key, value) {
  if (_lruCache.size >= MAX_CACHE_SIZE) {
    // Evict oldest (first inserted)
    const oldest = _lruCache.keys().next().value;
    _lruCache.delete(oldest);
  }
  _lruCache.set(key, { value, ts: Date.now() });
}

function _cacheDelete(key) {
  _lruCache.delete(key);
}

function _cacheClear() {
  _lruCache.clear();
}

// ── Cross-Tab Broadcast Channel (Browser Native, Zero Deps) ───────────────────
let _vaultChannel = null;
try {
  if (typeof BroadcastChannel !== 'undefined') {
    _vaultChannel = new BroadcastChannel('sprav_vault_sync');
    if (typeof _vaultChannel.unref === 'function') {
      _vaultChannel.unref();
    }
  }
} catch {
  _vaultChannel = null;
}

const _syncListeners = new Set();

function _notifyVaultSync(store, data = null) {
  const payload = {
    type: 'VAULT_SYNC',
    store,
    data,
    timestamp: Date.now()
  };
  if (_vaultChannel) {
    try {
      _vaultChannel.postMessage(payload);
    } catch (e) {
      console.warn('[StorageVault] BroadcastChannel postMessage error:', e);
    }
  }
  for (const listener of _syncListeners) {
    try {
      listener(payload);
    } catch (err) {
      console.error('[StorageVault] Sync listener error:', err);
    }
  }
}

if (_vaultChannel) {
  _vaultChannel.onmessage = (event) => {
    if (event.data?.type === 'VAULT_SYNC') {
      _lruCache.clear();
      for (const listener of _syncListeners) {
        try {
          listener(event.data);
        } catch (err) {
          console.error('[StorageVault] Foreign sync listener error:', err);
        }
      }
    }
  };
}

// ── AES-GCM Encryption Helpers (Web Crypto API) ───────────────────────────────
export const VAULT_KEY_NAME = '__vault_crypto_key__';
export const VAULT_PASSPHRASE_META_KEY = '__vault_passphrase_meta__';
export const VAULT_CANARY_PLAINTEXT = 'SPRAV_VAULT_PASSPHRASE_VERIFIED';

export class VaultLockedError extends Error {
  constructor(message = 'Secure vault is locked with a master passphrase. Unlock in Settings to access API credentials.') {
    super(message);
    this.name = 'VaultLockedError';
    this.code = 'VAULT_LOCKED';
  }
}

let _cryptoKey = null; // cached in memory for the active session
let _isPassphraseProtected = null; // cached boolean or null if uninspected
let _isPassphraseUnlocked = false; // session unlock flag
let _inactivityTimer = null;
export const INACTIVITY_LOCK_MS = 30 * 60 * 1000; // 30 minutes

export function _resetInactivityLock() {
  if (typeof window === 'undefined') return;
  if (_inactivityTimer) clearTimeout(_inactivityTimer);
  if (_isPassphraseProtected && _isPassphraseUnlocked) {
    _inactivityTimer = setTimeout(() => {
      _cryptoKey = null;
      _isPassphraseUnlocked = false;
    }, INACTIVITY_LOCK_MS);
  }
}

// Lifecycle listeners: automatically purge in-memory keys on tab unload/pagehide
if (typeof window !== 'undefined') {
  const wipeMemoryKeys = () => {
    if (_isPassphraseProtected) {
      _cryptoKey = null;
      _isPassphraseUnlocked = false;
    }
  };
  window.addEventListener('pagehide', wipeMemoryKeys);
  window.addEventListener('beforeunload', wipeMemoryKeys);

  const activityEvents = ['mousedown', 'keydown', 'touchstart'];
  activityEvents.forEach(evt => {
    window.addEventListener(evt, () => _resetInactivityLock(), { passive: true });
  });
}

export const toB64 = (buf) => {
  const bytes = new Uint8Array(buf);
  let binary = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + chunkSize));
  }
  return btoa(binary);
};

/**
 * Generates or loads the AES-GCM encryption key used for sensitive settings.
 * If a master passphrase is set, expects the session key to be already derived and unlocked.
 * Otherwise, falls back to the self-stored device JWK.
 */
async function _getOrCreateCryptoKey(db) {
  if (_cryptoKey) return _cryptoKey;

  if (typeof crypto === 'undefined' || !crypto.subtle) {
    return null; // Web Crypto not available (e.g., Node test env)
  }

  // 1. Check if master passphrase protection is enabled
  try {
    const passphraseMeta = await new Promise((resolve) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).get(VAULT_PASSPHRASE_META_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });

    if (passphraseMeta && passphraseMeta.salt && passphraseMeta.canary) {
      _isPassphraseProtected = true;
      if (!_isPassphraseUnlocked || !_cryptoKey) {
        throw new VaultLockedError();
      }
      return _cryptoKey;
    }
  } catch (err) {
    if (err instanceof VaultLockedError) throw err;
  }

  _isPassphraseProtected = false;

  try {
    // 2. Try loading existing device key from raw settings store
    const existing = await new Promise((resolve) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).get(VAULT_KEY_NAME);
      req.onsuccess = () => resolve(req.result?.jwk ?? null);
      req.onerror = () => resolve(null);
    });

    if (existing) {
      _cryptoKey = await crypto.subtle.importKey(
        'jwk', existing,
        { name: 'AES-GCM', length: 256 },
        false, ['encrypt', 'decrypt']
      );
      return _cryptoKey;
    }

    // 3. Generate new auto-generated device key
    _cryptoKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, ['encrypt', 'decrypt']
    );

    // Export JWK and persist it
    const jwk = await crypto.subtle.exportKey('jwk', _cryptoKey);
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readwrite');
      const req = tx.objectStore(STORES.SETTINGS).put({ key: VAULT_KEY_NAME, jwk });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });

    return _cryptoKey;
  } catch (err) {
    if (err instanceof VaultLockedError) throw err;
    console.warn('[StorageVault] Crypto key init failed, falling back to plaintext:', err.message);
    return null;
  }
}

/**
 * Encrypts a string value using AES-GCM.
 * Returns a base64-encoded string: "<iv_base64>:<ciphertext_base64>"
 */
async function _encrypt(key, plaintext) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${toB64(iv)}:${toB64(ciphertext)}`;
}

function safeFromB64(b64) {
  try {
    return Uint8Array.from(atob(b64), c => c.charCodeAt(0));
  } catch {
    throw new Error('Invalid Base64 payload in encrypted stream');
  }
}

/**
 * Decrypts an AES-GCM encrypted string produced by _encrypt().
 */
async function _decrypt(key, encrypted) {
  const [ivB64, ciphertextB64] = encrypted.split(':');
  if (!ivB64 || !ciphertextB64) throw new Error('Invalid encrypted format');
  const iv = safeFromB64(ivB64);
  const ciphertext = safeFromB64(ciphertextB64);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

/**
 * Derives an AES-GCM 256-bit CryptoKey from a password and salt using PBKDF2 (SHA-256).
 * 
 * @param {string} password - Master user secret or passphrase
 * @param {Uint8Array} salt - Random cryptographic salt (at least 16 bytes)
 * @param {number} [iterations=100000] - PBKDF2 iteration count
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKeyFromPassword(password, salt, iterations = 100000) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    'PBKDF2',
    false,
    ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts plaintext with password-derived AES-GCM-256 key and a random 12-byte IV.
 * Returns "<salt_b64>:<iv_b64>:<ciphertext_b64>"
 */
export async function encryptWithPassword(password, plaintext) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKeyFromPassword(password, salt);
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded);
  return `${toB64(salt)}:${toB64(iv)}:${toB64(ciphertext)}`;
}

/**
 * Decrypts a password-encrypted payload produced by encryptWithPassword().
 */
export async function decryptWithPassword(password, encryptedPayload) {
  if (typeof crypto === 'undefined' || !crypto.subtle) {
    throw new Error('Web Crypto API is not available in this environment.');
  }
  const parts = String(encryptedPayload || '').split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted password payload format');
  const salt = safeFromB64(parts[0]);
  const iv = safeFromB64(parts[1]);
  const ciphertext = safeFromB64(parts[2]);
  const key = await deriveKeyFromPassword(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  return new TextDecoder().decode(decrypted);
}

export async function encryptAesGcm(key, plaintext) {
  return _encrypt(key, plaintext);
}

export async function decryptAesGcm(key, encrypted) {
  return _decrypt(key, encrypted);
}

/**
 * Calculates a follow-up deadline by adding business days (skipping Saturday and Sunday).
 * @param {Date|string|number} [appliedDate=new Date()]
 * @param {number} [businessDays=5]
 * @returns {string} ISO timestamp
 */
export function calculateFollowUpDueAt(appliedDate = new Date(), businessDays = 5) {
  const d = new Date(appliedDate || Date.now());
  if (isNaN(d.getTime())) {
    d.setTime(Date.now());
  }
  let added = 0;
  while (added < businessDays) {
    d.setDate(d.getDate() + 1);
    const day = d.getDay();
    if (day !== 0 && day !== 6) { // Skip Sunday (0) and Saturday (6)
      added++;
    }
  }
  return d.toISOString();
}

/**
 * Determines whether a job record qualifies for permanent IndexedDB vault persistence.
 * Raw discovered jobs (un-actioned listings) remain ephemeral in memory/session.
 * Only applied jobs, ready-to-apply jobs, staged dispatches, and saved/tailored jobs
 * are stored in the user's permanent browser database.
 * 
 * @param {Object} job
 * @returns {boolean}
 */
export function isPersistentJob(job) {
  if (!job || typeof job !== 'object') return false;
  const s = String(job.status || '').toLowerCase().trim();
  
  // 1. Applied status (Application History & Tracker pipeline)
  if (s === 'applied' || job.applied_at || job.is_applied === true || job.stage === 'applied') return true;
  
  // 2. Ready to apply, staged, and guided dispatch queues
  if (
    s === 'ready_to_apply' ||
    s === 'staged' ||
    s === 'matched' ||
    s === 'opened_for_manual_submit' ||
    s === 'approved_pending_send' ||
    s === 'manual_review' ||
    s === 'near_miss_review' ||
    s === 'submitted'
  ) return true;

  // 3. User explicitly saved, starred, bookmarked, or tailored
  if (
    job.is_saved === true ||
    job.saved === true ||
    job.starred === true ||
    job.bookmarked === true ||
    Boolean(job.custom_resume) ||
    Boolean(job.tailored_bullet_points) ||
    Boolean(job.prep_notes) ||
    Boolean(job.application_note) ||
    Boolean(job.notes)
  ) return true;

  return false;
}

/**
 * Evaluates whether a job record is considered "the best" (high-value asset)
 * and MUST be preserved during auto-pruning or garbage collection.
 * 
 * Protected jobs:
 * - Applied, Interviewing, Offered, Interview, Accepted jobs (sacred history)
 * - Saved, Starred, Bookmarked jobs
 * - Jobs with custom user work: tailored resumes, notes, tailored bullets, cover letters
 * - Active queued jobs (ready_to_apply, staged, approved_pending_send, opened_for_manual_submit)
 * - High match score jobs (fit_score >= 80 or match_score >= 80)
 * 
 * @param {Object} job
 * @returns {boolean}
 */
export function isProtectedJob(job) {
  if (!job || typeof job !== 'object') return false;
  const s = String(job.status || '').toLowerCase().trim();

  // 1. Applied & Interview pipeline (Sacred history)
  if (
    s === 'applied' ||
    s === 'interviewing' ||
    s === 'interview' ||
    s === 'offered' ||
    s === 'offer' ||
    s === 'accepted' ||
    Boolean(job.applied_at) ||
    job.is_applied === true ||
    job.stage === 'applied'
  ) {
    return true;
  }

  // 2. Ready to apply, staged, and guided dispatch queues
  if (
    s === 'ready_to_apply' ||
    s === 'staged' ||
    s === 'matched' ||
    s === 'approved_pending_send' ||
    s === 'opened_for_manual_submit' ||
    s === 'manual_review' ||
    s === 'near_miss_review' ||
    s === 'submitted'
  ) {
    return true;
  }

  // 3. User explicitly saved, starred, bookmarked, or tailored
  if (
    job.is_saved === true ||
    job.saved === true ||
    job.starred === true ||
    job.bookmarked === true ||
    Boolean(job.custom_resume) ||
    (Array.isArray(job.tailored_bullet_points) && job.tailored_bullet_points.length > 0) ||
    Boolean(job.prep_notes) ||
    Boolean(job.application_note) ||
    Boolean(job.notes) ||
    Boolean(job.cover_letter) ||
    Boolean(job.coverLetter)
  ) {
    return true;
  }

  // 4. High match score jobs (the best recommendations)
  const score = Number(job.fit_score ?? job.match_score ?? job.score ?? 0);
  if (score >= 80) {
    return true;
  }

  return false;
}

// ── Vault Class ───────────────────────────────────────────────────────────────
class BrowserStorageVault {
  constructor() {
    this.db = null;
    this.initPromise = null;
    this._sessionDiscoveryJobs = new Map();
  }

  /**
   * Initializes the IndexedDB instance (v2 schema).
   * @returns {Promise<IDBDatabase>}
   */
  async initDB() {
    if (this.db) return this.db;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        return reject(new Error('IndexedDB is not supported in this environment.'));
      }

      const request = window.indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        const oldVersion = event.oldVersion;

        // ── Knowledge Base Store ──
        if (!db.objectStoreNames.contains(STORES.KNOWLEDGE_BASE)) {
          db.createObjectStore(STORES.KNOWLEDGE_BASE, { keyPath: 'key' });
        }

        // ── Jobs Store ──
        if (!db.objectStoreNames.contains(STORES.JOBS)) {
          const jobStore = db.createObjectStore(STORES.JOBS, { keyPath: 'id' });
          jobStore.createIndex('status', 'status', { unique: false });
          jobStore.createIndex('portal', 'portal', { unique: false });
          jobStore.createIndex('score', 'match_score', { unique: false });
          jobStore.createIndex('created_at', 'created_at', { unique: false }); // v2: new
        } else if (oldVersion < 2) {
          // Migrate existing jobs store: add created_at index
          const jobStore = event.target.transaction.objectStore(STORES.JOBS);
          if (!jobStore.indexNames.contains('created_at')) {
            jobStore.createIndex('created_at', 'created_at', { unique: false });
          }
        }

        // ── Scope Store ──
        if (!db.objectStoreNames.contains(STORES.SCOPE)) {
          db.createObjectStore(STORES.SCOPE, { keyPath: 'key' });
        }

        // ── Application History Store ──
        if (!db.objectStoreNames.contains(STORES.HISTORY)) {
          const historyStore = db.createObjectStore(STORES.HISTORY, { keyPath: 'id', autoIncrement: true });
          historyStore.createIndex('applied_at', 'applied_at', { unique: false });
          historyStore.createIndex('company', 'company', { unique: false });
        }

        // ── Settings Store (encrypted sensitive keys live here) ──
        if (!db.objectStoreNames.contains(STORES.SETTINGS)) {
          db.createObjectStore(STORES.SETTINGS, { keyPath: 'key' });
        }

        // ── Watchlist Store (v2: proper store instead of flat settings key) ──
        if (!db.objectStoreNames.contains(STORES.WATCHLIST)) {
          const wlStore = db.createObjectStore(STORES.WATCHLIST, { keyPath: 'slug' });
          wlStore.createIndex('platform', 'platform', { unique: false });
          wlStore.createIndex('added_at', 'added_at', { unique: false });
        }

        // ── Resume Files Store (v2: stores raw PDF ArrayBuffer) ──
        if (!db.objectStoreNames.contains(STORES.RESUME_FILES)) {
          const rfStore = db.createObjectStore(STORES.RESUME_FILES, { keyPath: 'id' });
          rfStore.createIndex('uploaded_at', 'uploaded_at', { unique: false });
        }

        // ── Contacts Store (v3: recruiter & hiring manager relationship CRM) ──
        if (!db.objectStoreNames.contains(STORES.CONTACTS)) {
          const contactStore = db.createObjectStore(STORES.CONTACTS, { keyPath: 'id' });
          contactStore.createIndex('company', 'company', { unique: false });
          contactStore.createIndex('linked_job_id', 'linked_job_id', { unique: false });
          contactStore.createIndex('next_followup_date', 'next_followup_date', { unique: false });
          contactStore.createIndex('last_contacted_date', 'last_contacted_date', { unique: false });
        }
      };

      request.onsuccess = (event) => {
        this.db = event.target.result;
        this._autoRequestPersistence();
        // Defer legacy discovery cleanup to idle period so initial mount renders at 60fps
        const schedulePurge = () => {
          if (typeof window !== 'undefined' && window.requestIdleCallback) {
            window.requestIdleCallback(() => this.purgeLegacyDiscoveryJobs().catch(() => {}), { timeout: 8000 });
          } else {
            setTimeout(() => this.purgeLegacyDiscoveryJobs().catch(() => {}), 4000);
          }
        };
        schedulePurge();
        resolve(this.db);
      };

      request.onerror = (event) => {
        console.error('[StorageVault] IndexedDB open error:', event.target.error);
        this.initPromise = null;
        reject(event.target.error);
      };
    });

    return this.initPromise;
  }

  /**
   * One-time or background sweep that purges legacy un-actioned discovery listings
   * from IndexedDB STORES.JOBS, preserving applied and ready-to-apply jobs.
   */
  async purgeLegacyDiscoveryJobs() {
    try {
      if (typeof localStorage !== 'undefined' && localStorage.getItem('sprav_legacy_jobs_cleaned_v4') === 'true') {
        return 0;
      }

      const allJobs = await this.getAll(STORES.JOBS);
      if (!Array.isArray(allJobs) || allJobs.length === 0) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('sprav_legacy_jobs_cleaned_v4', 'true');
        return 0;
      }

      const unActioned = allJobs.filter(j => !isPersistentJob(j));
      if (unActioned.length === 0) {
        if (typeof localStorage !== 'undefined') localStorage.setItem('sprav_legacy_jobs_cleaned_v4', 'true');
        return 0;
      }

      const db = await this.initDB();
      const tx = db.transaction([STORES.JOBS], 'readwrite');
      const store = tx.objectStore(STORES.JOBS);
      for (const j of unActioned) {
        if (j && j.id) {
          _cacheDelete(`${STORES.JOBS}::${j.id}`);
          store.delete(j.id);
        }
      }
      await new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sprav_legacy_jobs_cleaned_v4', 'true');
      }
      console.info(`[StorageVault] Cleaned up ${unActioned.length} legacy un-actioned discovery listings from IndexedDB.`);
      return unActioned.length;
    } catch (err) {
      console.warn('[StorageVault] Legacy discovery purge skipped or failed:', err?.message);
      return 0;
    }
  }

  /**
   * Prompts browser to guarantee storage is never automatically purged.
   */
  async _autoRequestPersistence() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try {
        const isPersisted = await navigator.storage.persisted();
        if (!isPersisted) {
          const granted = await navigator.storage.persist();
          console.info(`[StorageVault] Storage persistence granted: ${granted}`);
        }
      } catch (err) {
        console.warn('[StorageVault] Could not request persistence:', err);
      }
    }
  }

  async isPersisted() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persisted) {
      try { return await navigator.storage.persisted(); } catch { return false; }
    }
    return false;
  }

  async requestPersistence() {
    if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
      try { return await navigator.storage.persist(); } catch { return false; }
    }
    return false;
  }

  // ── Storage Quota Monitor ─────────────────────────────────────────────────

  /**
   * Returns current storage usage and quota from navigator.storage.estimate().
   * @returns {Promise<{ used: string, available: string, usedBytes: number, quotaBytes: number, usedPercent: number, isPersisted: boolean }>}
   */
  async getStorageStats() {
    const stats = {
      used: '–', available: '–',
      usedBytes: 0, quotaBytes: 0,
      usedPercent: 0, isPersisted: false
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.storage) {
        const [estimate, persisted] = await Promise.all([
          navigator.storage.estimate(),
          navigator.storage.persisted ? navigator.storage.persisted() : Promise.resolve(false)
        ]);
        const usedBytes = estimate.usage || 0;
        const quotaBytes = estimate.quota || 0;
        const fmt = (b) => {
          if (b < 1024) return `${b} B`;
          if (b < 1024 ** 2) return `${(b / 1024).toFixed(1)} KB`;
          if (b < 1024 ** 3) return `${(b / 1024 ** 2).toFixed(1)} MB`;
          return `${(b / 1024 ** 3).toFixed(2)} GB`;
        };
        stats.usedBytes = usedBytes;
        stats.quotaBytes = quotaBytes;
        stats.used = fmt(usedBytes);
        stats.available = fmt(quotaBytes - usedBytes);
        stats.usedPercent = quotaBytes > 0 ? Math.round((usedBytes / quotaBytes) * 100) : 0;
        stats.isPersisted = persisted;
      }
    } catch (e) {
      console.warn('[StorageVault] Could not get storage estimate:', e);
    }

    return stats;
  }

  // ── Generic CRUD ──────────────────────────────────────────────────────────

  async setItem(storeName, key, value) {
    let actualStore = storeName;
    let actualKey = key;
    let actualValue = value;

    if (value === undefined) {
      actualStore = STORES.SETTINGS;
      actualKey = storeName;
      actualValue = key;
    } else if (!Object.values(STORES).includes(storeName)) {
      actualStore = STORES.SETTINGS;
      actualKey = `${storeName}_${key}`;
    }

    _cacheDelete(`${actualStore}::${actualKey}`);

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([actualStore], 'readwrite');
      const store = tx.objectStore(actualStore);
      const data = typeof actualValue === 'object' && actualValue !== null && !Array.isArray(actualValue)
        ? { ...actualValue, key: actualKey, updated_at: new Date().toISOString() }
        : { key: actualKey, value: actualValue, updated_at: new Date().toISOString() };

      const req = store.put(data);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getItem(storeName, key) {
    let actualStore = storeName;
    let actualKey = key;

    if (key === undefined) {
      actualStore = STORES.SETTINGS;
      actualKey = storeName;
    } else if (!Object.values(STORES).includes(storeName)) {
      actualStore = STORES.SETTINGS;
      actualKey = `${storeName}_${key}`;
    }

    const cacheKey = `${actualStore}::${actualKey}`;
    const cached = _cacheGet(cacheKey);
    if (cached !== undefined) return cached;

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([actualStore], 'readonly');
      const store = tx.objectStore(actualStore);
      const req = store.get(actualKey);
      req.onsuccess = () => {
        if (!req.result) { resolve(null); return; }
        const result = ('value' in req.result && Object.keys(req.result).length <= 3)
          ? req.result.value
          : req.result;
        _cacheSet(cacheKey, result);
        resolve(result);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async get(key) {
    if (!key) return null;
    if (key === 'candidate_profile') {
      const kb = await this.getKnowledgeBase();
      if (kb?.personal?.name || kb?.name) return kb;
      const settingsProfile = await this.getItem(STORES.SETTINGS, 'candidate_profile');
      if (settingsProfile) return settingsProfile;
      return kb || null;
    }
    return this.getItem(key);
  }

  async getAll(storeName) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });
  }

  async deleteItem(storeName, key) {
    _cacheDelete(`${storeName}::${key}`);
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.delete(key);
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clearStore(storeName) {
    // Evict all cache entries for this store
    for (const k of _lruCache.keys()) {
      if (k.startsWith(`${storeName}::`)) _lruCache.delete(k);
    }
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([storeName], 'readwrite');
      const store = tx.objectStore(storeName);
      const req = store.clear();
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async clear() {
    for (const storeName of Object.values(STORES)) {
      try { await this.clearStore(storeName); } catch {}
    }
    _lruCache.clear();
    return true;
  }

  // ── Encrypted Settings API (for API keys) ────────────────────────────────

  /**
   * Stores a sensitive value (e.g. API key) encrypted with AES-GCM.
   * Falls back to plaintext if Web Crypto is unavailable.
   * @param {string} key
   * @param {string} value
   */
  async setSecureItem(key, value) {
    const db = await this.initDB();
    const cryptoKey = await _getOrCreateCryptoKey(db);

    let storedValue = value;
    let encrypted = false;

    if (cryptoKey && value && typeof value === 'string') {
      try {
        storedValue = await _encrypt(cryptoKey, value);
        encrypted = true;
      } catch (e) {
        console.warn('[StorageVault] Encryption failed, storing plaintext:', e.message);
      }
    }

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readwrite');
      const req = tx.objectStore(STORES.SETTINGS).put({
        key,
        value: storedValue,
        encrypted,
        updated_at: new Date().toISOString()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves and decrypts a sensitive value stored with setSecureItem().
   * @param {string} key
   * @returns {Promise<string|null>}
   */
  async getSecureItem(key) {
    const db = await this.initDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).get(key);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;
    if (!record.encrypted) return record.value ?? null;

    try {
      const cryptoKey = await _getOrCreateCryptoKey(db);
      if (!cryptoKey) return record.value;
      return await _decrypt(cryptoKey, record.value);
    } catch (e) {
      if (e instanceof VaultLockedError) {
        throw e;
      }
      console.warn('[StorageVault] Decryption failed:', e.message);
      return null;
    }
  }

  // ── Master Passphrase Vault Management (Phase 3: Zero-Knowledge Hardening) ──

  /**
   * Checks whether the user has protected their API keys with a Master Passphrase.
   * @returns {Promise<boolean>}
   */
  async isVaultPassphraseProtected() {
    if (_isPassphraseProtected !== null && _isPassphraseProtected !== undefined) {
      return _isPassphraseProtected;
    }
    try {
      const db = await this.initDB();
      const meta = await new Promise((resolve) => {
        const tx = db.transaction([STORES.SETTINGS], 'readonly');
        const req = tx.objectStore(STORES.SETTINGS).get(VAULT_PASSPHRASE_META_KEY);
        req.onsuccess = () => resolve(req.result ?? null);
        req.onerror = () => resolve(null);
      });
      _isPassphraseProtected = Boolean(meta && meta.salt && meta.canary);
      return _isPassphraseProtected;
    } catch {
      return false;
    }
  }

  /**
   * Returns true if the vault is either not protected with a passphrase, or currently unlocked.
   * @returns {boolean}
   */
  isVaultUnlocked() {
    if (!_isPassphraseProtected) return true;
    return Boolean(_isPassphraseUnlocked && _cryptoKey);
  }

  /**
   * Unlocks the passphrase-protected vault using the user's master passphrase.
   * Validates the canary ciphertext before accepting the derived key.
   * @param {string} passphrase
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async unlockVault(passphrase) {
    if (!passphrase || typeof passphrase !== 'string') {
      return { success: false, error: 'Passphrase is required.' };
    }
    const db = await this.initDB();
    const meta = await new Promise((resolve) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).get(VAULT_PASSPHRASE_META_KEY);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => resolve(null);
    });

    if (!meta || !meta.salt || !meta.canary) {
      _isPassphraseProtected = false;
      _isPassphraseUnlocked = true;
      return { success: true, message: 'Vault is not passphrase-protected.' };
    }

    try {
      const salt = safeFromB64(meta.salt);
      const key = await deriveKeyFromPassword(passphrase, salt, meta.iterations || 100000);
      const decryptedCanary = await _decrypt(key, meta.canary);
      if (decryptedCanary !== VAULT_CANARY_PLAINTEXT) {
        return { success: false, error: 'Incorrect master passphrase.' };
      }
      _cryptoKey = key;
      _isPassphraseProtected = true;
      _isPassphraseUnlocked = true;
      _resetInactivityLock();
      return { success: true };
    } catch {
      return { success: false, error: 'Incorrect master passphrase.' };
    }
  }

  /**
   * Locks the vault immediately by purging the active CryptoKey from memory.
   * @returns {boolean}
   */
  lockVault() {
    if (_inactivityTimer) {
      clearTimeout(_inactivityTimer);
      _inactivityTimer = null;
    }
    _cryptoKey = null;
    _isPassphraseUnlocked = false;
    return true;
  }

  /**
   * Configures or updates the Master Passphrase for the vault.
   * Decrypts all existing encrypted settings records, derives a new key from the passphrase
   * and a fresh 16-byte cryptographic salt via PBKDF2, encrypts the verification canary,
   * re-encrypts all settings records, and securely removes the auto-generated JWK from IndexedDB.
   *
   * @param {string} passphrase
   * @param {string} [oldPassphrase]
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async setVaultPassphrase(passphrase, oldPassphrase = null) {
    if (!passphrase || typeof passphrase !== 'string' || passphrase.trim().length < 6) {
      return { success: false, error: 'Master passphrase must be at least 6 characters long.' };
    }

    const isProtected = await this.isVaultPassphraseProtected();
    if (isProtected && !this.isVaultUnlocked()) {
      if (!oldPassphrase) {
        return { success: false, error: 'Current passphrase is required to change passphrase.' };
      }
      const unlockRes = await this.unlockVault(oldPassphrase);
      if (!unlockRes.success) return unlockRes;
    }

    const db = await this.initDB();

    // 1. Decrypt all existing secure items using current active key
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const decryptedMap = new Map();
    for (const r of records) {
      if (r.encrypted && r.value && r.key !== VAULT_KEY_NAME && r.key !== VAULT_PASSPHRASE_META_KEY) {
        try {
          if (_cryptoKey) {
            const plain = await _decrypt(_cryptoKey, r.value);
            decryptedMap.set(r.key, plain);
          }
        } catch {
          console.warn('[StorageVault] Could not decrypt item during passphrase setup:', r.key);
        }
      }
    }

    // 2. Derive new AES-GCM-256 key from passphrase and new 16-byte random salt
    const salt = crypto.getRandomValues(new Uint8Array(16));
    const newKey = await deriveKeyFromPassword(passphrase, salt, 100000);

    // 3. Encrypt verification canary
    const canary = await _encrypt(newKey, VAULT_CANARY_PLAINTEXT);

    // 4. In write transaction: store meta, purge self-stored JWK, re-encrypt records
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      
      // Store passphrase metadata
      store.put({
        key: VAULT_PASSPHRASE_META_KEY,
        salt: toB64(salt),
        canary,
        iterations: 100000,
        updated_at: new Date().toISOString()
      });

      // Purge the self-stored auto-generated key!
      store.delete(VAULT_KEY_NAME);

      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    _cryptoKey = newKey;
    _isPassphraseProtected = true;
    _isPassphraseUnlocked = true;

    // 5. Re-encrypt all existing items with new passphrase key
    for (const [key, plainVal] of decryptedMap.entries()) {
      await this.setSecureItem(key, plainVal);
    }

    return { success: true };
  }

  /**
   * Clears the Master Passphrase, reverting the vault to the standard device-generated key.
   * @param {string} currentPassphrase
   * @returns {Promise<{success: boolean, error?: string}>}
   */
  async clearVaultPassphrase(currentPassphrase) {
    const isProtected = await this.isVaultPassphraseProtected();
    if (!isProtected) {
      return { success: true, message: 'Vault is not passphrase-protected.' };
    }
    if (!this.isVaultUnlocked()) {
      const unlockRes = await this.unlockVault(currentPassphrase);
      if (!unlockRes.success) return unlockRes;
    }

    const db = await this.initDB();

    // 1. Decrypt existing secure items with current passphrase key
    const records = await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readonly');
      const req = tx.objectStore(STORES.SETTINGS).getAll();
      req.onsuccess = () => resolve(req.result || []);
      req.onerror = () => reject(req.error);
    });

    const decryptedMap = new Map();
    for (const r of records) {
      if (r.encrypted && r.value && r.key !== VAULT_KEY_NAME && r.key !== VAULT_PASSPHRASE_META_KEY) {
        try {
          if (_cryptoKey) {
            const plain = await _decrypt(_cryptoKey, r.value);
            decryptedMap.set(r.key, plain);
          }
        } catch {
          console.warn('[StorageVault] Could not decrypt item during passphrase removal:', r.key);
        }
      }
    }

    // 2. Generate new auto-generated device key
    const newAutoKey = await crypto.subtle.generateKey(
      { name: 'AES-GCM', length: 256 },
      true, ['encrypt', 'decrypt']
    );
    const jwk = await crypto.subtle.exportKey('jwk', newAutoKey);

    // 3. In write transaction: delete passphrase meta, put new auto-generated JWK
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.SETTINGS], 'readwrite');
      const store = tx.objectStore(STORES.SETTINGS);
      store.delete(VAULT_PASSPHRASE_META_KEY);
      store.put({ key: VAULT_KEY_NAME, jwk });
      tx.oncomplete = () => resolve(true);
      tx.onerror = () => reject(tx.error);
    });

    _cryptoKey = newAutoKey;
    _isPassphraseProtected = false;
    _isPassphraseUnlocked = true;

    // 4. Re-encrypt all items with new auto device key
    for (const [key, plainVal] of decryptedMap.entries()) {
      await this.setSecureItem(key, plainVal);
    }

    return { success: true };
  }

  // ── Knowledge Base Helpers ────────────────────────────────────────────────

  async saveKnowledgeBase(kbData) {
    _cacheDelete(`${STORES.KNOWLEDGE_BASE}::profile`);
    // Delete old KB artifacts (stale vector embeddings, obsolete drafts) so only the new KB remains
    await this.purgeStaleKnowledgeBaseArtifacts();
    const res = await this.setItem(STORES.KNOWLEDGE_BASE, 'profile', kbData);
    try {
      const meta = await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta');
      const activeId = meta?.activePersonaId || 'persona_1';
      const persona = await this.getItem(STORES.KNOWLEDGE_BASE, activeId);
      
      const detected = detectCandidateDomain(kbData);
      const candTitle = kbData?.personal?.title || (Array.isArray(kbData?.target_roles) && kbData.target_roles[0]) || detected.primaryRole;

      if (persona) {
        persona.kb = kbData;
        persona.updated_at = new Date().toISOString();

        // If active persona is persona_1 and its role was generic or needs alignment with newly detected domain
        const isGenericRole = !persona.role || 
          persona.role.toLowerCase().includes('full stack') || 
          persona.role === 'Senior Full Stack Engineer';

        if (persona.id === 'persona_1' && (isGenericRole || (detected.confidence > 0 && !persona.role.toLowerCase().includes(detected.domain.replace('_', ' '))))) {
          if (candTitle) {
            persona.role = candTitle;
            persona.name = `Persona 1: ${candTitle.split('/')[0].trim()}`;
          }
          if (detected.canonicalRoles && detected.canonicalRoles.length > 0) {
            const mergedTitles = Array.from(new Set([
              ...(Array.isArray(persona.scope?.target_titles) ? persona.scope.target_titles : []),
              ...detected.canonicalRoles,
              candTitle
            ])).filter(Boolean);

            persona.scope = {
              ...persona.scope,
              target_titles: mergedTitles,
              target_roles: mergedTitles,
              roles: mergedTitles.map(r => ({ keyword: r, preference: 'apply' }))
            };
          }
        }
        await this.setItem(STORES.KNOWLEDGE_BASE, activeId, persona);
      }

      // Auto-align global criteria in STORES.SCOPE so initial discovery immediately uses candidate's true domain roles
      const currentScope = await this.getItem(STORES.SCOPE, 'criteria');
      if (detected.canonicalRoles && detected.canonicalRoles.length > 0) {
        if (!currentScope || (!currentScope.roles?.length && !currentScope.locations?.length)) {
          const newRoles = detected.canonicalRoles.map(r => ({ keyword: r, preference: 'apply' }));
          const existingRoles = Array.isArray(currentScope?.roles) ? currentScope.roles : [];
          const filteredOld = existingRoles.filter(r => {
            const kw = (typeof r === 'string' ? r : r.keyword || '').toLowerCase();
            return kw !== 'senior software engineer' && kw !== 'full stack engineer';
          });
          const updatedScope = {
            ...currentScope,
            roles: [...filteredOld, ...newRoles],
            target_roles: Array.from(new Set([
              ...(Array.isArray(currentScope?.target_roles) ? currentScope.target_roles : []),
              ...detected.canonicalRoles
            ])),
            target_titles: Array.from(new Set([
              ...(Array.isArray(currentScope?.target_titles) ? currentScope.target_titles : []),
              ...detected.canonicalRoles
            ])),
            updated_at: new Date().toISOString()
          };
          _cacheDelete(`${STORES.SCOPE}::criteria`);
          await this.setItem(STORES.SCOPE, 'criteria', updatedScope);
          _notifyVaultSync(STORES.SCOPE);
        }
      }
    } catch (err) {
      console.warn('[StorageVault] Auto-align persona on saveKnowledgeBase error:', err);
    }
    _notifyVaultSync(STORES.KNOWLEDGE_BASE);
    return res;
  }

  /**
   * Purges old/stale Knowledge Base remnants:
   * - Old vector embeddings (vec_*) and bundle (kb_vector_bundle) from previous KB versions
   * - Obsolete draft and previous profile backup keys
   * - Redundant secondary resume files (preserves active primary resume)
   * Ensures every time the user modifies the KB, the old one is deleted and only the new one is kept.
   */
  async purgeStaleKnowledgeBaseArtifacts() {
    try {
      const allKbRecords = await this.getAll(STORES.KNOWLEDGE_BASE);
      if (Array.isArray(allKbRecords)) {
        for (const record of allKbRecords) {
          const key = record.key || record.hash;
          if (!key) continue;
          const keyStr = String(key);
          if (
            keyStr.startsWith('vec_') ||
            keyStr === 'kb_vector_bundle' ||
            keyStr.startsWith('kb_old_') ||
            keyStr.startsWith('kb_draft_') ||
            keyStr.startsWith('profile_prev_') ||
            keyStr.startsWith('profile_backup_')
          ) {
            await this.deleteItem(STORES.KNOWLEDGE_BASE, key);
          }
        }
      }

      for (const k of _lruCache.keys()) {
        if (k.startsWith(`${STORES.KNOWLEDGE_BASE}::vec_`) || k === `${STORES.KNOWLEDGE_BASE}::kb_vector_bundle`) {
          _lruCache.delete(k);
        }
      }

      const allResumeFiles = await this.getAll(STORES.RESUME_FILES);
      if (Array.isArray(allResumeFiles) && allResumeFiles.length > 1) {
        for (const rf of allResumeFiles) {
          if (rf && rf.id && rf.id !== 'primary') {
            await this.deleteItem(STORES.RESUME_FILES, rf.id);
          }
        }
      }
    } catch (err) {
      console.warn('[StorageVault] purgeStaleKnowledgeBaseArtifacts error:', err);
    }
  }

  async getKnowledgeBase() {
    return this.getItem(STORES.KNOWLEDGE_BASE, 'profile');
  }

  async getCachedVector(hash) {
    if (!hash) return null;
    try {
      return await this.getItem(STORES.KNOWLEDGE_BASE, `vec_${hash}`);
    } catch {
      return null;
    }
  }

  async saveCachedVector(hash, vector, metadata = {}) {
    if (!hash || !vector) return false;
    try {
      return await this.setItem(STORES.KNOWLEDGE_BASE, `vec_${hash}`, {
        hash,
        vector,
        metadata,
        cached_at: Date.now()
      });
    } catch {
      return false;
    }
  }

  async getCachedVectorBundle() {
    try {
      return await this.getItem(STORES.KNOWLEDGE_BASE, 'kb_vector_bundle');
    } catch {
      return null;
    }
  }

  async saveCachedVectorBundle(bundle) {
    if (!bundle) return false;
    try {
      return await this.setItem(STORES.KNOWLEDGE_BASE, 'kb_vector_bundle', bundle);
    } catch {
      return false;
    }
  }

  // ── Multi-Persona Career Profiles (Phase 7.1) ─────────────────────────────

  /**
   * Retrieves all available career personas (up to 3).
   * Seeds default personas if not yet initialized.
   */
  async getPersonas() {
    try {
      const meta = await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta');
      if (meta && Array.isArray(meta.personas) && meta.personas.length > 0) {
        return meta.personas;
      }
    } catch {}

    return this._initializeDefaultPersonas();
  }

  /**
   * Retrieves the currently active persona ID (defaults to 'persona_1').
   */
  async getActivePersonaId() {
    try {
      const meta = await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta');
      if (meta && meta.activePersonaId) {
        return meta.activePersonaId;
      }
    } catch {}
    return 'persona_1';
  }

  /**
   * Retrieves the full active persona record.
   */
  async getActivePersona() {
    const activeId = await this.getActivePersonaId();
    const fullRecord = await this.getItem(STORES.KNOWLEDGE_BASE, activeId);
    if (fullRecord) return fullRecord;
    const personas = await this.getPersonas();
    return personas.find(p => p.id === activeId) || personas[0] || null;
  }

  /**
   * Seeds 3 distinct career personas based on candidate's existing data.
   */
  async _initializeDefaultPersonas() {
    let existingKb = null;
    let existingScope = null;
    try {
      existingKb = await this.getItem(STORES.KNOWLEDGE_BASE, 'profile');
      existingScope = await this.getItem(STORES.SCOPE, 'criteria');
    } catch {}

    const detected = detectCandidateDomain(existingKb);
    const primaryTitle = existingKb?.personal?.title || existingKb?.target_roles?.[0] || detected.primaryRole || 'Senior Full Stack Engineer';
    const primaryName = existingKb?.personal?.name || 'Candidate';

    const defaultProjects = (existingKb?.projects && existingKb.projects.length > 0)
      ? existingKb.projects
      : SEED_STARTER_PROJECTS;

    const p1Skills = (existingKb?.skills && Object.keys(existingKb.skills).length > 0)
      ? existingKb.skills
      : {
          full_stack_backend: ['React', 'Node.js', 'TypeScript', 'Next.js', 'PostgreSQL', 'GraphQL', 'REST APIs'],
          cloud_security: ['Docker', 'AWS', 'CI/CD Pipelines', 'Kubernetes', 'Redis', 'Microservices Architecture']
        };

    const initialTitles = detected.canonicalRoles && detected.canonicalRoles.length > 0
      ? detected.canonicalRoles
      : [primaryTitle, 'Full Stack Engineer', 'Senior Software Engineer'];

    const p1Scope = existingScope || {
      target_titles: initialTitles,
      target_roles: initialTitles,
      roles: initialTitles.map(r => ({ keyword: r, preference: 'apply' }))
    };

    const p1 = {
      id: 'persona_1',
      name: `Persona 1: ${primaryTitle.split('/')[0].trim() || 'Software Engineer'}`,
      role: primaryTitle,
      tagline: existingKb?.personal?.summary || 'End-to-end architectures, distributed systems, clean APIs & modern UI',
      kb: {
        ...existingKb,
        personal: {
          ...existingKb?.personal,
          name: primaryName,
          title: primaryTitle,
          summary: existingKb?.personal?.summary || 'Full-stack engineering leader specializing in resilient distributed systems, modern React architectures, and high-throughput cloud services.'
        },
        skills: p1Skills,
        projects: defaultProjects,
        work_history: existingKb?.work_history?.length ? existingKb.work_history : []
      },
      scope: p1Scope,
      custom_skills: p1Skills,
      custom_bullets: (existingKb?.work_history || []).flatMap(w => w.bullets || [])
    };

    const p2 = {
      id: 'persona_2',
      name: 'Persona 2: AI / ML Engineer',
      role: 'AI / Machine Learning Engineer',
      tagline: 'Autonomous agents, RAG systems, local WebGPU inference, vector databases & LLM orchestration',
      kb: {
        ...existingKb,
        personal: {
          ...existingKb?.personal,
          name: primaryName,
          title: 'Senior AI & Machine Learning Engineer',
          summary: 'Specializing in agentic workflows, low-latency hybrid RAG pipelines, and local on-device WebGPU inference models.'
        },
        skills: {
          ai_agentic_systems: ['LangGraph', 'Agentic RAG', 'Multi-Agent Frameworks', 'Prompt Engineering', 'Self-RAG'],
          retrieval_search: ['Hybrid Search (BM25 + Dense)', 'Semantic Caching', 'Cross-Encoder Re-ranking', 'Sentence-Transformers'],
          llms_vector_databases: ['Qdrant', 'Pinecone', 'vLLM', 'Ollama', 'pgvector', 'LoRA Fine-tuning'],
          ml_evaluation: ['PyTorch', 'Model Benchmarking', 'RAGAS', 'Pytest', 'Scikit-learn'],
          full_stack_backend: ['Python', 'FastAPI', 'React 18', 'TypeScript', 'PostgreSQL'],
          cloud_security: ['Docker', 'AWS', 'Kubernetes', 'CI/CD Automation']
        },
        projects: [
          {
            id: 'proj_ai_1',
            name: 'Agentic LangGraph Workflow Engine',
            tech: 'Python, PyTorch, LangGraph, Qdrant, FastAPI',
            tech_stack: 'Python, PyTorch, LangGraph, Qdrant, FastAPI',
            url: '',
            description: 'Multi-agent self-reflective evaluation pipeline with cycle breaking and grounded hallucination audits.',
            bullets: [
              'Built 4-node cyclic state graph with critic reflection loop, reducing hallucinated resume claims to 0.0%.',
              'Engineered reciprocal rank fusion (RRF) search merging BM25 keyword matching with dense embedding cosine similarity.'
            ],
            start_date: '2025',
            end_date: 'Present'
          }
        ],
        work_history: (existingKb?.work_history || []).map((job, idx) => {
          if (idx === 0) {
            return {
              ...job,
              title: job.title ? `${job.title} (AI/ML)` : 'Senior AI Engineer',
              bullets: [
                'Architected autonomous agentic search and hybrid vector retrieval pipeline, increasing retrieval precision by 34%.',
                'Engineered pure in-browser zero-server WebGPU LLM inference runtime, slashing cloud inference costs to $0.',
                ...(job.bullets || []).slice(0, 2)
              ]
            };
          }
          return job;
        })
      },
      scope: {
        ...existingScope,
        target_titles: ['AI Engineer', 'Machine Learning Engineer', 'Staff AI Systems Architect', 'LLM Application Engineer']
      },
      custom_skills: ['LangGraph', 'PyTorch', 'Vector DBs', 'RAGAS', 'WebGPU', 'FastAPI'],
      custom_bullets: []
    };

    const p3 = {
      id: 'persona_3',
      name: 'Persona 3: Engineering Manager',
      role: 'Engineering Manager & Tech Lead',
      tagline: 'Technical leadership, roadmap governance, team scaling, cross-functional delivery & architectural quality',
      kb: {
        ...existingKb,
        personal: {
          ...existingKb?.personal,
          name: primaryName,
          title: 'Engineering Manager & Tech Lead',
          summary: 'Engineering leader with a track record of scaling high-performing distributed teams, establishing agile excellence, and aligning technical milestones with product revenue.'
        },
        skills: {
          full_stack_backend: ['Technical Roadmapping', 'System Architecture', 'Agile / Scrum', 'Mentorship & Career Growth'],
          cloud_security: ['Team Scaling & Hiring', 'SOC 2 Governance', 'Budgeting & Headcount', 'DevOps Strategy']
        },
        projects: [
          {
            id: 'proj_lead_1',
            name: 'Enterprise Developer Platform & CI/CD Mesh',
            tech: 'Kubernetes, Terraform, Go, GitHub Actions, Prometheus',
            tech_stack: 'Kubernetes, Terraform, Go, GitHub Actions, Prometheus',
            url: '',
            description: 'Self-service cloud infrastructure orchestrator standardizing deployment velocity across 40+ engineering squads.',
            bullets: [
              'Architected GitOps pipeline reducing average release lead time from 14 days to 35 minutes across 120+ microservices.',
              'Standardized SLA metrics and telemetry dashboards, boosting multi-region service uptime to 99.99%.'
            ],
            start_date: '2024',
            end_date: '2025'
          }
        ],
        work_history: (existingKb?.work_history || []).map((job, idx) => {
          if (idx === 0) {
            return {
              ...job,
              title: job.title ? `Tech Lead / Manager - ${job.title}` : 'Engineering Lead',
              bullets: [
                'Led cross-functional team of 8 engineers delivering enterprise platform milestones 2 weeks ahead of schedule.',
                'Instituted structured code review, testing, and mentorship standards, reducing production defect rate by 42%.',
                ...(job.bullets || []).slice(0, 2)
              ]
            };
          }
          return job;
        })
      },
      scope: {
        ...existingScope,
        target_titles: ['Engineering Manager', 'Tech Lead', 'Director of Engineering', 'Software Engineering Lead']
      },
      custom_skills: ['Engineering Leadership', 'Agile / Scrum', 'System Design', 'Hiring', 'Roadmapping'],
      custom_bullets: []
    };

    const personas = [p1, p2, p3];
    const meta = {
      activePersonaId: 'persona_1',
      personas: personas.map(p => ({
        id: p.id,
        name: p.name,
        role: p.role,
        tagline: p.tagline,
        skillsCount: Object.values(p.kb?.skills || {}).flat().length,
        updated_at: new Date().toISOString()
      }))
    };

    try {
      await this.setItem(STORES.KNOWLEDGE_BASE, 'persona_1', p1);
      await this.setItem(STORES.KNOWLEDGE_BASE, 'persona_2', p2);
      await this.setItem(STORES.KNOWLEDGE_BASE, 'persona_3', p3);
      await this.setItem(STORES.KNOWLEDGE_BASE, 'personas_meta', meta);
    } catch (e) {
      console.warn('[StorageVault] Failed saving initial personas:', e);
    }

    return meta.personas;
  }

  /**
   * Switches the active persona, flushes current working state,
   * updates the global profile/criteria keys, and notifies all tabs.
   */
  async setActivePersona(personaId) {
    if (!personaId) return null;
    try {
      const meta = (await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta')) || { activePersonaId: 'persona_1', personas: [] };
      const currentActiveId = meta.activePersonaId || 'persona_1';

      // 1. Flush current working profile & scope into current active persona record
      if (currentActiveId !== personaId) {
        try {
          const currentKb = await this.getItem(STORES.KNOWLEDGE_BASE, 'profile');
          const currentScope = await this.getItem(STORES.SCOPE, 'criteria');
          const currentRecord = await this.getItem(STORES.KNOWLEDGE_BASE, currentActiveId);
          if (currentRecord) {
            currentRecord.kb = currentKb;
            currentRecord.scope = currentScope;
            currentRecord.updated_at = new Date().toISOString();
            await this.setItem(STORES.KNOWLEDGE_BASE, currentActiveId, currentRecord);
          }
        } catch (e) {
          console.warn('[StorageVault] Could not flush previous persona:', e);
        }
      }

      // 2. Fetch target persona record
      let targetPersona = await this.getItem(STORES.KNOWLEDGE_BASE, personaId);
      if (!targetPersona) {
        await this._initializeDefaultPersonas();
        targetPersona = await this.getItem(STORES.KNOWLEDGE_BASE, personaId);
      }

      if (targetPersona && targetPersona.kb) {
        // 3. Mirror target persona into standard 'profile' and 'criteria' keys
        _cacheDelete(`${STORES.KNOWLEDGE_BASE}::profile`);
        _cacheDelete(`${STORES.SCOPE}::criteria`);
        await this.setItem(STORES.KNOWLEDGE_BASE, 'profile', targetPersona.kb);
        if (targetPersona.scope) {
          await this.setItem(STORES.SCOPE, 'criteria', targetPersona.scope);
        }

        // 4. Update active persona pointer
        meta.activePersonaId = personaId;
        await this.setItem(STORES.KNOWLEDGE_BASE, 'personas_meta', meta);

        // 5. Broadcast sync to all active tabs
        _notifyVaultSync(STORES.KNOWLEDGE_BASE);
        _notifyVaultSync(STORES.SCOPE);

        if (typeof window !== 'undefined') {
          try {
            window.dispatchEvent(new CustomEvent('sprav_persona_changed', {
              detail: { personaId, persona: targetPersona, kb: targetPersona.kb }
            }));
          } catch {}
        }

        return targetPersona;
      }
    } catch (err) {
      console.error('[StorageVault] setActivePersona error:', err);
    }
    return null;
  }

  /**
   * Updates persona name, target role, tagline, or custom content.
   */
  async updatePersona(personaId, updates = {}) {
    if (!personaId) return null;
    try {
      let record = await this.getItem(STORES.KNOWLEDGE_BASE, personaId);
      if (!record) {
        await this._initializeDefaultPersonas();
        record = await this.getItem(STORES.KNOWLEDGE_BASE, personaId);
      }
      if (!record) return null;

      const updatedRecord = {
        ...record,
        ...updates,
        kb: updates.kb || record.kb,
        scope: updates.scope || record.scope,
        updated_at: new Date().toISOString()
      };

      await this.setItem(STORES.KNOWLEDGE_BASE, personaId, updatedRecord);

      // Update metadata list entry
      const meta = await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta');
      if (meta && Array.isArray(meta.personas)) {
        meta.personas = meta.personas.map(p => {
          if (p.id === personaId) {
            return {
              ...p,
              name: updates.name || p.name,
              role: updates.role || p.role,
              tagline: updates.tagline || p.tagline,
              skillsCount: Object.values(updatedRecord.kb?.skills || {}).flat().length,
              updated_at: updatedRecord.updated_at
            };
          }
          return p;
        });
        await this.setItem(STORES.KNOWLEDGE_BASE, 'personas_meta', meta);
      }

      // If active persona was modified, also update active profile/criteria
      const activeId = await this.getActivePersonaId();
      if (activeId === personaId) {
        if (updates.kb) {
          _cacheDelete(`${STORES.KNOWLEDGE_BASE}::profile`);
          await this.setItem(STORES.KNOWLEDGE_BASE, 'profile', updates.kb);
        }
        if (updates.scope) {
          _cacheDelete(`${STORES.SCOPE}::criteria`);
          await this.setItem(STORES.SCOPE, 'criteria', updates.scope);
        }
        _notifyVaultSync(STORES.KNOWLEDGE_BASE);
      }

      return updatedRecord;
    } catch (e) {
      console.error('[StorageVault] updatePersona error:', e);
      return null;
    }
  }

  // ── Scope Helpers ─────────────────────────────────────────────────────────

  async saveScope(scopeData) {
    _cacheDelete(`${STORES.SCOPE}::criteria`);
    const res = await this.setItem(STORES.SCOPE, 'criteria', scopeData);
    try {
      const meta = await this.getItem(STORES.KNOWLEDGE_BASE, 'personas_meta');
      const activeId = meta?.activePersonaId || 'persona_1';
      const persona = await this.getItem(STORES.KNOWLEDGE_BASE, activeId);
      if (persona) {
        persona.scope = scopeData;
        persona.updated_at = new Date().toISOString();
        await this.setItem(STORES.KNOWLEDGE_BASE, activeId, persona);
      }
    } catch {}
    _notifyVaultSync(STORES.SCOPE);
    return res;
  }

  async getScope() {
    return this.getItem(STORES.SCOPE, 'criteria');
  }

  // ── Jobs Helpers ──────────────────────────────────────────────────────────

  async saveJob(job) {
    if (!job) return false;
    const targetId = job.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const strId = String(targetId);
    const enriched = { ...job, id: targetId };

    // Ephemeral discovery listings stay strictly in memory session
    if (!isPersistentJob(enriched)) {
      this._sessionDiscoveryJobs.set(strId, enriched);
      _cacheDelete(`${STORES.JOBS}::${targetId}`);
      return true;
    }

    // Persistent records (Applied, Ready to Apply, Saved) are written to IndexedDB
    this._sessionDiscoveryJobs.delete(strId);
    _cacheDelete(`${STORES.JOBS}::${targetId}`);
    if (job.id) {
      _cacheDelete(`${STORES.JOBS}::${job.id}`);
      this._sessionDiscoveryJobs.delete(String(job.id));
    }
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.JOBS], 'readwrite');
      const store = tx.objectStore(STORES.JOBS);
      const now = new Date().toISOString();
      const req = store.put({
        ...enriched,
        created_at: enriched.created_at || now,
        updated_at: now
      });
      req.onsuccess = () => {
        _notifyVaultSync(STORES.JOBS, { id: targetId });
        this.pruneStorageIfNeeded().catch(() => {});
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  }

  async saveJobs(jobs) {
    if (!Array.isArray(jobs) || jobs.length === 0) return true;
    const persistentBatch = [];
    const now = new Date().toISOString();

    for (const raw of jobs) {
      if (!raw) continue;
      const targetId = raw.id || `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const strId = String(targetId);
      const d = raw.first_published_at || raw.posted_at || raw.published_at || raw.created_at;
      const job = {
        ...raw,
        id: targetId,
        _postTime: d ? (Date.parse(d) || 0) : 0,
        created_at: raw.created_at || now,
        updated_at: now
      };

      if (isPersistentJob(job)) {
        persistentBatch.push(job);
        this._sessionDiscoveryJobs.delete(strId);
        _cacheDelete(`${STORES.JOBS}::${targetId}`);
      } else {
        // Ephemeral in-memory only (zero disk footprint, instant sub-millisecond access)
        this._sessionDiscoveryJobs.set(strId, job);
      }
    }

    if (persistentBatch.length === 0) {
      return true;
    }

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.JOBS], 'readwrite');
      const store = tx.objectStore(STORES.JOBS);
      for (const job of persistentBatch) {
        _cacheDelete(`${STORES.JOBS}::${job.id}`);
        store.put(job);
      }
      tx.oncomplete = () => {
        _notifyVaultSync(STORES.JOBS);
        this.pruneStorageIfNeeded().catch(() => {});
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });
  }

  /**
   * Retrieves all permanently persisted jobs from the user's IndexedDB vault (Applied & Ready to Apply).
   * @returns {Promise<Array<Object>>}
   */
  async getPersistentJobs() {
    const list = await this.getAll(STORES.JOBS);
    return Array.isArray(list) ? list.filter(isPersistentJob) : [];
  }

  /**
   * Returns all active jobs: combines permanent vault jobs with active in-memory session jobs.
   * @param {Object} [options={}]
   * @param {boolean} [options.includeSession=true]
   * @returns {Promise<Array<Object>>}
   */
  async getJobs(options = { includeSession: true }) {
    const persistent = (await this.getAll(STORES.JOBS)) || [];
    const validPersistent = persistent.filter(isPersistentJob);

    if (!options?.includeSession || this._sessionDiscoveryJobs.size === 0) {
      return validPersistent;
    }

    // Merge session discovery pool with persistent vault (persistent supersedes session)
    const map = new Map();
    for (const j of this._sessionDiscoveryJobs.values()) {
      if (j && j.id) map.set(String(j.id), j);
    }
    for (const j of validPersistent) {
      if (j && j.id) map.set(String(j.id), j);
    }
    return Array.from(map.values());
  }

  /**
   * Returns current count of in-memory discovery jobs.
   * @returns {number}
   */
  getDiscoveryJobsCount() {
    return this._sessionDiscoveryJobs ? this._sessionDiscoveryJobs.size : 0;
  }

  /**
   * Returns only Ready to Apply / staged jobs from the persistent vault.
   * @returns {Promise<Array<Object>>}
   */
  async getReadyToApplyJobs() {
    const all = await this.getPersistentJobs();
    return all.filter(j => j.status !== 'applied');
  }

  /**
   * Marks a job as Ready to Apply (or saves it to the persistent vault).
   * Automatically promotes an ephemeral job to the permanent IndexedDB store.
   * @param {string|number} id
   * @param {Object} [jobData={}]
   * @returns {Promise<boolean>}
   */
  async markJobReadyToApply(id, jobData = {}) {
    if (!id) return false;
    const strId = String(id);
    let existing = null;
    try {
      existing = await this.getItem(STORES.JOBS, id);
    } catch {}
    if (!existing) {
      existing = this._sessionDiscoveryJobs.get(strId) || {};
    }

    const updated = {
      ...existing,
      ...jobData,
      id,
      status: 'ready_to_apply',
      is_saved: true,
      saved: true,
      ready_to_apply_at: new Date().toISOString()
    };
    return this.saveJob(updated);
  }

  /**
   * Unmarks a job from Ready to Apply status.
   * @param {string|number} id
   * @returns {Promise<boolean>}
   */
  async unmarkJobReadyToApply(id) {
    if (!id) return false;
    const strId = String(id);
    let existing = null;
    try {
      existing = await this.getItem(STORES.JOBS, id);
    } catch {}

    if (!existing) return true;
    if (existing.status === 'applied') return true; // Do not unmark applied jobs

    // Delete from persistent IndexedDB store
    await this.deleteJob(id);
    // Keep in session RAM if previously discovered
    existing.status = 'new';
    existing.is_saved = false;
    existing.saved = false;
    delete existing.ready_to_apply_at;
    this._sessionDiscoveryJobs.set(strId, existing);
    _notifyVaultSync(STORES.JOBS, { action: 'unmark_ready_to_apply', id });
    return true;
  }

  /**
   * Checks if a job is marked Ready to Apply or saved in the persistent vault.
   * @param {string|number} id
   * @returns {Promise<boolean>}
   */
  async isJobReadyToApply(id) {
    if (!id) return false;
    try {
      const job = await this.getItem(STORES.JOBS, id);
      if (!job) return false;
      return isPersistentJob(job) && job.status !== 'applied';
    } catch {
      return false;
    }
  }

  async deleteJob(id) {
    if (!id) return false;
    const strId = String(id);
    _cacheDelete(`${STORES.JOBS}::${id}`);
    _cacheDelete(`${STORES.JOBS}::${strId}`);
    this._sessionDiscoveryJobs.delete(strId);
    return this.deleteItem(STORES.JOBS, id);
  }

  /**
   * Reconciles the local jobs database against an active application scope,
   * removing out-of-scope jobs that violate location or role criteria.
   * Preserves already applied jobs for audit history.
   * @param {Object} scope - Active Application Scope
   * @param {Function} [filterFn] - Predicate (job, scope) => boolean (returns true to KEEP, false to PURGE)
   * @returns {Promise<{ purgedCount: number, remainingCount: number }>}
   */
  async pruneOutOfScopeJobs(scope, filterFn = null) {
    if (!scope) return { purgedCount: 0, remainingCount: 0 };
    const allJobs = (await this.getJobs()) || [];
    if (allJobs.length === 0) return { purgedCount: 0, remainingCount: 0 };

    const toDeleteIds = [];
    for (const job of allJobs) {
      if (!job) continue;
      // Preserve applied jobs
      if (job.status === 'applied') continue;

      let keep = true;
      if (typeof filterFn === 'function') {
        keep = Boolean(filterFn(job, scope));
      }
      if (!keep && job.id) {
        toDeleteIds.push(job.id);
      }
    }

    if (toDeleteIds.length > 0) {
      const db = await this.initDB();
      await new Promise((resolve, reject) => {
        const tx = db.transaction([STORES.JOBS], 'readwrite');
        const store = tx.objectStore(STORES.JOBS);
        for (const id of toDeleteIds) {
          _cacheDelete(`${STORES.JOBS}::${id}`);
          store.delete(id);
        }
        tx.oncomplete = () => {
          _notifyVaultSync(STORES.JOBS);
          resolve(true);
        };
        tx.onerror = () => reject(tx.error);
      });
    }

    return {
      purgedCount: toDeleteIds.length,
      remainingCount: allJobs.length - toDeleteIds.length
    };
  }

  // ── Watchlist Helpers (v2) ────────────────────────────────────────────────

  /**
   * Saves a watchlist entry (company portal).
   * @param {{ slug: string, name: string, url: string, platform: string }} entry
   */
  async saveWatchlistEntry(entry) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.WATCHLIST], 'readwrite');
      const req = tx.objectStore(STORES.WATCHLIST).put({
        ...entry,
        added_at: entry.added_at || new Date().toISOString()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  async getWatchlist() {
    return this.getAll(STORES.WATCHLIST);
  }

  async deleteWatchlistEntry(slug) {
    return this.deleteItem(STORES.WATCHLIST, slug);
  }

  /**
   * Pre-seeds the candidate's watchlist with the Curated Top 100 Tech Companies catalog
   * (100 verified Ashby and Greenhouse endpoints) if the watchlist is currently empty,
   * or when explicitly forced by the user.
   *
   * @param {{ force?: boolean }} [options={}]
   * @returns {Promise<{ seeded: number, total: number, catalog: Array }>}
   */
  async ensureCuratedWatchlistSeeded(options = {}) {
    const force = !!options?.force;
    const existing = await this.getWatchlist().catch(() => []);
    if (!force && Array.isArray(existing) && existing.length > 0) {
      return { seeded: 0, total: existing.length, catalog: TOP_100_TECH_COMPANIES };
    }

    const existingSlugs = new Set((existing || []).map(e => e?.slug?.toLowerCase()).filter(Boolean));
    const toSeed = force 
      ? TOP_100_TECH_COMPANIES 
      : TOP_100_TECH_COMPANIES.filter(c => !existingSlugs.has(c.slug.toLowerCase()));

    if (toSeed.length === 0) {
      return { seeded: 0, total: existing.length, catalog: TOP_100_TECH_COMPANIES };
    }

    const db = await this.initDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.WATCHLIST], 'readwrite');
      const store = tx.objectStore(STORES.WATCHLIST);
      const now = new Date().toISOString();
      for (const comp of toSeed) {
        store.put({
          slug: comp.slug,
          name: comp.name,
          company: comp.name,
          platform: comp.platform,
          careers_url: comp.careers_url,
          category: comp.category,
          tier: comp.tier || 1,
          description: comp.description || '',
          added_at: now
        });
      }
      tx.oncomplete = () => {
        _notifyVaultSync(STORES.WATCHLIST);
        resolve(true);
      };
      tx.onerror = () => reject(tx.error);
    });

    const updated = await this.getWatchlist().catch(() => []);
    return {
      seeded: toSeed.length,
      total: Array.isArray(updated) ? updated.length : toSeed.length,
      catalog: TOP_100_TECH_COMPANIES
    };
  }

  // ── Resume File Store (v2) ────────────────────────────────────────────────

  /**
   * Saves a user's resume file as an ArrayBuffer so they never re-upload.
   * @param {File} file - The File object from an <input type="file">
   * @param {string} [id='primary'] - Storage slot identifier
   */
  async saveResumeFile(file, id = 'primary') {
    const buffer = await file.arrayBuffer();
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.RESUME_FILES], 'readwrite');
      const req = tx.objectStore(STORES.RESUME_FILES).put({
        id,
        name: file.name,
        size: file.size,
        type: file.type,
        buffer,
        uploaded_at: new Date().toISOString()
      });
      req.onsuccess = () => resolve(true);
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves a stored resume file as a reconstructed File object.
   * @param {string} [id='primary']
   * @returns {Promise<File|null>}
   */
  async getResumeFile(id = 'primary') {
    const db = await this.initDB();
    const record = await new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.RESUME_FILES], 'readonly');
      const req = tx.objectStore(STORES.RESUME_FILES).get(id);
      req.onsuccess = () => resolve(req.result ?? null);
      req.onerror = () => reject(req.error);
    });

    if (!record) return null;

    return new File([record.buffer], record.name, {
      type: record.type,
      lastModified: new Date(record.uploaded_at).getTime()
    });
  }

  /**
   * Returns metadata about stored resume files (without the buffer).
   * @returns {Promise<Array<{ id, name, size, type, uploaded_at }>>}
   */
  async getResumeFilesMeta() {
    const all = await this.getAll(STORES.RESUME_FILES);
    return all.map(({ id, name, size, type, uploaded_at }) => ({ id, name, size, type, uploaded_at }));
  }

  // ── Application History Helpers ───────────────────────────────────────────

  async addHistoryRecord(record) {
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.HISTORY], 'readwrite');
      const store = tx.objectStore(STORES.HISTORY);
      const req = store.add({
        ...record,
        applied_at: record.applied_at || new Date().toISOString()
      });
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }

  async getHistory() {
    return this.getAll(STORES.HISTORY);
  }

  async getApplications() {
    try {
      const history = await this.getAll(STORES.HISTORY);
      if (history && history.length > 0) return history;
    } catch {}
    try {
      const jobs = await this.getAll(STORES.JOBS);
      return (jobs || []).filter(j => j.status === 'applied');
    } catch {
      return [];
    }
  }

  async updateApplication(app) {
    if (!app || !app.id) return false;
    const db = await this.initDB();
    try {
      const tx = db.transaction([STORES.HISTORY], 'readwrite');
      tx.objectStore(STORES.HISTORY).put(app);
    } catch {}
    try {
      await this.saveJob({ ...app, stage: app.stage || 'applied' });
    } catch {}
    return true;
  }

  // ── Contact Relationship CRM (Phase 1.4: Huntr & Teal Parity) ─────────────

  /**
   * Saves or updates a recruiter/hiring-manager contact.
   * @param {Object} contact
   * @returns {Promise<Object>} The saved contact record
   */
  async saveContact(contact) {
    if (!contact || typeof contact !== 'object') throw new Error('Contact must be an object');
    const targetId = contact.id || `contact_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    _cacheDelete(`${STORES.CONTACTS}::${targetId}`);
    if (contact.id) _cacheDelete(`${STORES.CONTACTS}::${contact.id}`);

    const now = new Date().toISOString();
    const contactRecord = {
      id: targetId,
      name: (contact.name || '').trim(),
      role: (contact.role || '').trim(),
      company: (contact.company || '').trim(),
      status: contact.status || 'to_contact',
      email: (contact.email || '').trim(),
      linkedin_url: (contact.linkedin_url || contact.linkedin || '').trim(),
      phone: (contact.phone || '').trim(),
      linked_job_id: contact.linked_job_id || null,
      linked_job_title: contact.linked_job_title || '',
      notes: contact.notes || '',
      is_verified: Boolean(contact.is_verified),
      bounce_risk: contact.bounce_risk || (contact.is_verified ? 'LOW' : 'HIGH'),
      verification_source: contact.verification_source || (contact.is_verified ? 'Verified' : 'Manual / Heuristic'),
      last_contacted_date: contact.last_contacted_date || null,
      next_followup_date: contact.next_followup_date || null,
      created_at: contact.created_at || now,
      updated_at: now
    };

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.CONTACTS], 'readwrite');
      const store = tx.objectStore(STORES.CONTACTS);
      const req = store.put(contactRecord);
      req.onsuccess = () => {
        _notifyVaultSync(STORES.CONTACTS, { id: targetId, action: 'save' });
        resolve(contactRecord);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Updates the outreach/interaction status of an existing contact.
   * @param {string} contactId
   * @param {'to_contact'|'contacted'|'replied'|'interviewing'|'not_interested'|'ghosted'} newStatus
   * @param {Object} [extraData]
   */
  async updateContactStatus(contactId, newStatus, extraData = {}) {
    if (!contactId || !newStatus) return null;
    const existing = await this.getContact(contactId);
    if (!existing) return null;
    const now = new Date().toISOString();
    const updated = {
      ...existing,
      ...extraData,
      status: newStatus,
      last_contacted_date: (newStatus === 'contacted' || newStatus === 'replied')
        ? (extraData.last_contacted_date || now.split('T')[0])
        : existing.last_contacted_date,
      updated_at: now
    };
    return await this.saveContact(updated);
  }

  /**
   * Retrieves all contacts from the vault, sorted by next_followup_date then updated_at.
   * @returns {Promise<Array>}
   */
  async getContacts() {
    try {
      const contacts = await this.getAll(STORES.CONTACTS);
      return (contacts || []).sort((a, b) => {
        if (a.next_followup_date && b.next_followup_date) {
          return new Date(a.next_followup_date) - new Date(b.next_followup_date);
        }
        if (a.next_followup_date) return -1;
        if (b.next_followup_date) return 1;
        return new Date(b.updated_at || 0) - new Date(a.updated_at || 0);
      });
    } catch {
      return [];
    }
  }

  /**
   * Retrieves a single contact by ID.
   * @param {string} contactId
   */
  async getContact(contactId) {
    if (!contactId) return null;
    try {
      return await this.getItem(STORES.CONTACTS, contactId);
    } catch {
      return null;
    }
  }

  /**
   * Retrieves all contacts linked to a specific job ID.
   * @param {string} jobId
   * @returns {Promise<Array>}
   */
  async getContactsForJob(jobId) {
    if (!jobId) return [];
    try {
      const all = await this.getContacts();
      return (all || []).filter(c => c.linked_job_id === jobId);
    } catch {
      return [];
    }
  }

  /**
   * Retrieves all contacts associated with a specific company.
   * @param {string} company
   * @returns {Promise<Array>}
   */
  async getContactsForCompany(company) {
    if (!company) return [];
    const target = company.toLowerCase().trim();
    try {
      const all = await this.getContacts();
      return (all || []).filter(c => (c.company || '').toLowerCase().trim() === target);
    } catch {
      return [];
    }
  }

  /**
   * Deletes a contact by ID.
   * @param {string} contactId
   */
  async deleteContact(contactId) {
    if (!contactId) return false;
    _cacheDelete(`${STORES.CONTACTS}::${contactId}`);
    try {
      const deleted = await this.deleteItem(STORES.CONTACTS, contactId);
      _notifyVaultSync(STORES.CONTACTS, { id: contactId, action: 'delete' });
      return deleted;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all contacts with follow-ups due today or overdue.
   * @returns {Promise<Array>}
   */
  async getDueContactFollowups() {
    try {
      const all = await this.getContacts();
      const todayStr = new Date().toISOString().split('T')[0];
      return (all || []).filter(c => {
        if (!c.next_followup_date) return false;
        const dueStr = c.next_followup_date.split('T')[0];
        return dueStr <= todayStr;
      });
    } catch {
      return [];
    }
  }

  /**
   * 1-Click Application Tracking: marks a job as applied across STORES.JOBS and STORES.HISTORY.
   * Atomically sets status to 'applied', stage to 'applied', records applied_at timestamp,
   * and logs an audit record into application_history.
   */
  async markJobApplied(jobId, jobData = {}) {
    if (!jobId) return { success: false, error: 'jobId is required' };
    const now = new Date().toISOString();

    let existing = null;
    try {
      existing = await this.getItem(STORES.JOBS, jobId);
    } catch {}

    const appliedAt = jobData.applied_at || existing?.applied_at || now;
    const computedDueAt = calculateFollowUpDueAt(appliedAt, 5);

    const updatedJob = {
      ...existing,
      ...jobData,
      id: jobId,
      status: 'applied',
      stage: (existing?.stage && existing.stage !== 'discovered') ? existing.stage : 'applied',
      applied_at: appliedAt,
      follow_up_due_at: jobData.follow_up_due_at || existing?.follow_up_due_at || computedDueAt,
      updated_at: now
    };

    try {
      await this.saveJob(updatedJob);
    } catch (e) {
      console.warn('[StorageVault] markJobApplied saveJob fallback:', e.message);
    }

    try {
      const historyRecord = {
        id: `hist_${jobId}_${Date.now()}`,
        job_id: jobId,
        title: updatedJob.title || updatedJob.role || 'Software Engineer',
        company: updatedJob.company || 'Company',
        location: updatedJob.location || 'Remote',
        action: 'applied',
        status: 'applied',
        stage: updatedJob.stage || 'applied',
        applied_at: updatedJob.applied_at,
        follow_up_due_at: updatedJob.follow_up_due_at,
        source: '1-click-tracker',
        notes: 'Marked as applied via 1-Click Tracker'
      };
      await this.addHistoryRecord(historyRecord);
    } catch (e) {
      console.warn('[StorageVault] markJobApplied history log warning:', e);
    }

    _notifyVaultSync(STORES.JOBS, { action: 'mark_applied', jobId });
    _notifyVaultSync(STORES.HISTORY, { action: 'mark_applied', jobId });

    return { success: true, job: updatedJob };
  }

  /**
   * Unmarks an applied job back to discovered status.
   */
  async unmarkJobApplied(jobId) {
    if (!jobId) return { success: false };
    const strId = String(jobId);
    const now = new Date().toISOString();
    let existing = null;
    try {
      existing = await this.getItem(STORES.JOBS, jobId);
    } catch {}

    if (existing) {
      const isSaved = Boolean(existing.is_saved || existing.saved || existing.starred);
      const updatedJob = {
        ...existing,
        status: isSaved ? 'ready_to_apply' : 'discovered',
        stage: isSaved ? 'ready_to_apply' : 'discovered',
        updated_at: now
      };
      delete updatedJob.applied_at;

      if (isSaved) {
        await this.saveJob(updatedJob);
      } else {
        // Remove from persistent vault, keep in ephemeral session if viewed
        await this.deleteJob(jobId);
        this._sessionDiscoveryJobs.set(strId, updatedJob);
      }
    }

    _notifyVaultSync(STORES.JOBS, { action: 'unmark_applied', jobId });
    return { success: true };
  }

  /**
   * Checks whether a job has been marked as applied in the vault.
   */
  async isJobApplied(jobId) {
    if (!jobId) return false;
    try {
      const job = await this.getItem(STORES.JOBS, jobId);
      return Boolean(job && (job.status === 'applied' || job.stage === 'applied' || job.applied_at));
    } catch {
      return false;
    }
  }

  /**
   * Saves a lightweight private application note for a job.
   */
  async saveJobNote(jobId, note = '') {
    if (!jobId) return false;
    try {
      let existing = await this.getItem(STORES.JOBS, jobId);
      if (existing) {
        existing.notes = note;
        existing.updated_at = new Date().toISOString();
        await this.saveJob(existing);
      } else {
        await this.saveJob({ id: jobId, notes: note });
      }
      _notifyVaultSync(STORES.JOBS, { action: 'save_note', jobId, note });
      return true;
    } catch (err) {
      console.warn('[StorageVault] saveJobNote error:', err);
      return false;
    }
  }

  /**
   * Toggles bookmark / saved status for a job in the vault.
   */
  async toggleJobSaved(jobOrId) {
    const jobId = typeof jobOrId === 'object' ? jobOrId.id : jobOrId;
    if (!jobId) return false;
    const strId = String(jobId);
    try {
      let existing = await this.getItem(STORES.JOBS, jobId);
      if (!existing) {
        existing = this._sessionDiscoveryJobs.get(strId) || (typeof jobOrId === 'object' ? jobOrId : null);
      }
      const isCurrentlySaved = Boolean(existing?.is_saved || existing?.saved || existing?.status === 'ready_to_apply');
      const nextSaved = !isCurrentlySaved;

      if (nextSaved) {
        const toSave = {
          ...existing,
          id: jobId,
          status: 'ready_to_apply',
          is_saved: true,
          saved: true,
          ready_to_apply_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        await this.saveJob(toSave);
      } else {
        // If un-saving and not applied, remove from IndexedDB and keep in session RAM
        if (existing?.status === 'applied') {
          existing.is_saved = false;
          existing.saved = false;
          await this.saveJob(existing);
        } else {
          await this.deleteJob(jobId);
          if (existing) {
            const demoted = {
              ...existing,
              status: 'discovered',
              is_saved: false,
              saved: false
            };
            delete demoted.ready_to_apply_at;
            this._sessionDiscoveryJobs.set(strId, demoted);
          }
        }
      }
      _notifyVaultSync(STORES.JOBS, { action: 'toggle_saved', jobId, isSaved: nextSaved });
      return nextSaved;
    } catch (err) {
      console.warn('[StorageVault] toggleJobSaved error:', err);
      return false;
    }
  }

  /**
   * Action-Driven Job Application CRM: Updates status lifecycle of an application.
   * Supported statuses: 'applied', 'follow_up_due', 'followed_up', 'interviewing', 'offer', 'rejected', 'archived'.
   * @param {string} appId - Job ID or History ID
   * @param {string} status - New status
   * @param {Object} [metadata] - Additional metadata (e.g. followed_up_at, follow_up_due_at)
   */
  async updateApplicationStatus(appId, status, metadata = {}) {
    if (!appId || !status) return false;
    const now = new Date().toISOString();
    const db = await this.initDB();

    try {
      // 1. Update in STORES.HISTORY
      const allHistory = await this.getAll(STORES.HISTORY);
      const matched = (allHistory || []).find(h => h.id === appId || h.job_id === appId);
      if (matched) {
        matched.status = status;
        matched.stage = status;
        matched.updated_at = now;
        if (metadata.followed_up_at) matched.followed_up_at = metadata.followed_up_at;
        if (metadata.follow_up_due_at) matched.follow_up_due_at = metadata.follow_up_due_at;
        if (status === 'followed_up') {
          matched.followed_up_at = metadata.followed_up_at || now;
          matched.follow_up_status = 'followed_up';
        }
        const tx = db.transaction([STORES.HISTORY], 'readwrite');
        tx.objectStore(STORES.HISTORY).put(matched);
      }
    } catch (e) {
      console.warn('[StorageVault] updateApplicationStatus history update warning:', e);
    }

    try {
      // 2. Also update in STORES.JOBS if job exists
      const job = await this.getItem(STORES.JOBS, appId);
      if (job) {
        job.status = status;
        job.stage = status;
        job.updated_at = now;
        if (metadata.followed_up_at) job.followed_up_at = metadata.followed_up_at;
        if (metadata.follow_up_due_at) job.follow_up_due_at = metadata.follow_up_due_at;
        if (status === 'followed_up') {
          job.followed_up_at = metadata.followed_up_at || now;
          job.follow_up_status = 'followed_up';
        }
        await this.saveJob(job);
      }
    } catch (e) {
      console.warn('[StorageVault] updateApplicationStatus jobs update warning:', e);
    }

    _notifyVaultSync(STORES.HISTORY, { action: 'update_status', appId, status });
    _notifyVaultSync(STORES.JOBS, { action: 'update_status', appId, status });
    return true;
  }

  /**
   * High-Volume Batch Action CRM: Updates status for multiple applications at once.
   * @param {string[]} appIds - Array of job IDs or history IDs
   * @param {string} status - Target status ('applied', 'followed_up', 'screening', 'archived', etc.)
   * @param {Object} [metadata] - Optional metadata (e.g. followed_up_at, notes)
   * @returns {Promise<{ success: boolean, updatedCount: number }>}
   */
  async batchUpdateApplicationStatus(appIds = [], status, metadata = {}) {
    if (!Array.isArray(appIds) || appIds.length === 0 || !status) {
      return { success: false, updatedCount: 0 };
    }
    let count = 0;
    for (const id of appIds) {
      try {
        const ok = await this.updateApplicationStatus(id, status, metadata);
        if (ok) count++;
      } catch (err) {
        console.warn(`[StorageVault] batchUpdateApplicationStatus failed for ${id}:`, err);
      }
    }
    return { success: count > 0, updatedCount: count };
  }

  /**
   * Calculates the number of applications that are overdue for follow-up (> 5 business days without follow-up).
   * @returns {Promise<number>}
   */
  async getOverdueFollowupsCount() {
    try {
      const apps = await this.getApplications();
      if (!Array.isArray(apps) || apps.length === 0) return 0;
      const now = Date.now();
      const fiveDaysMs = 5 * 24 * 60 * 60 * 1000;

      return apps.filter(app => {
        // Skip applications that have been closed or already followed up
        const status = (app.status || app.stage || '').toLowerCase();
        if (['followed_up', 'interviewing', 'screening', 'technical', 'interview', 'offer', 'rejected', 'archived'].includes(status)) {
          return false;
        }
        if (app.follow_up_status === 'followed_up') return false;

        // Check explicit due date or 5-day fallback
        if (app.follow_up_due_at) {
          return now > new Date(app.follow_up_due_at).getTime();
        }
        const appliedAt = app.applied_at ? new Date(app.applied_at).getTime() : 0;
        if (!appliedAt) return false;
        return (now - appliedAt) >= fiveDaysMs;
      }).length;
    } catch {
      return 0;
    }
  }

  // ── Resume Snapshots & Version Vault ──────────────────────────────────────

  /**
   * Saves a named snapshot of a tailored resume into permanent vault storage.
   */
  async saveResumeSnapshot(snapshotData = {}) {
    const now = new Date().toISOString();
    const id = snapshotData.id || `resume_snapshot_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    const snapshot = {
      id,
      name: String(snapshotData.name || '').trim() || `Resume Version (${new Date().toLocaleDateString()})`,
      targetJobTitle: snapshotData.targetJobTitle || 'General Software Engineering',
      templateId: snapshotData.templateId || 'ivy_classic',
      fontId: snapshotData.fontId || 'merriweather',
      colorId: snapshotData.colorId || 'charcoal',
      densityId: snapshotData.densityId || 'normal',
      data: snapshotData.data || {},
      tags: Array.isArray(snapshotData.tags) ? snapshotData.tags : [],
      created_at: snapshotData.created_at || now,
      updated_at: now
    };

    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.HISTORY], 'readwrite');
      const store = tx.objectStore(STORES.HISTORY);
      const req = store.put(snapshot);
      req.onsuccess = () => {
        _notifyVaultSync(STORES.HISTORY, { id, type: 'resume_snapshot' });
        resolve(snapshot);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves all saved resume snapshots sorted newest first.
   */
  async getResumeSnapshots() {
    try {
      const all = await this.getAll(STORES.HISTORY);
      return (all || [])
        .filter(item => item && (String(item.id).startsWith('resume_snapshot_') || item.templateId))
        .sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch {
      return [];
    }
  }

  /**
   * Deletes a resume snapshot by ID.
   */
  async deleteResumeSnapshot(snapshotId) {
    if (!snapshotId) return false;
    const db = await this.initDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.HISTORY], 'readwrite');
      const store = tx.objectStore(STORES.HISTORY);
      const req = store.delete(snapshotId);
      req.onsuccess = () => {
        _notifyVaultSync(STORES.HISTORY, { id: snapshotId, type: 'delete_snapshot' });
        resolve(true);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Restores a resume snapshot by ID.
   */
  async restoreResumeSnapshot(snapshotId) {
    if (!snapshotId) return null;
    return this.getItem(STORES.HISTORY, snapshotId);
  }


  // ── Cover Letter Memory Vault (Phase 7.2) ─────────────────────────────────

  /**
   * Automatically persists generated cover letters per job ID in IndexedDB.
   */
  async saveCoverLetter(jobId, coverLetterData = {}) {
    if (!jobId) return false;
    const targetId = `cover_letter_${jobId}`;
    _cacheDelete(`${STORES.HISTORY}::${targetId}`);
    const db = await this.initDB();

    const text = coverLetterData.full_text || coverLetterData.text || '';
    const paragraphs = coverLetterData.paragraphs || this._decomposeCoverLetter(text);

    const record = {
      id: targetId,
      job_id: jobId,
      company: coverLetterData.company || 'Company',
      title: coverLetterData.title || 'Engineering Role',
      full_text: text,
      paragraphs,
      fit_score: coverLetterData.fit_score || '4.5',
      created_at: coverLetterData.created_at || new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction([STORES.HISTORY], 'readwrite');
      const store = tx.objectStore(STORES.HISTORY);
      const req = store.put(record);
      req.onsuccess = () => {
        _notifyVaultSync(STORES.HISTORY, { id: targetId, type: 'cover_letter' });
        resolve(record);
      };
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieves a cover letter for a specific job ID.
   */
  async getCoverLetter(jobId) {
    if (!jobId) return null;
    const targetId = `cover_letter_${jobId}`;
    return this.getItem(STORES.HISTORY, targetId);
  }

  /**
   * Retrieves all persisted cover letters across applications, sorted newest first.
   */
  async getAllCoverLetters() {
    try {
      const allHistory = await this.getAll(STORES.HISTORY);
      return (allHistory || [])
        .filter(item => item && (String(item.id).startsWith('cover_letter_') || item.paragraphs))
        .sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
    } catch {
      return [];
    }
  }

  /**
   * Decomposes all past letters into categorized paragraphs (Hook, Technical Depth,
   * Company Alignment, Call to Action) tagged with company and ATS fit score.
   */
  async getPastCoverLetterParagraphs() {
    const letters = await this.getAllCoverLetters();
    const results = [];

    for (const letter of letters) {
      const p = letter.paragraphs || {};
      if (p.hook) {
        results.push({
          id: `${letter.job_id || letter.id}_hook`,
          section: 'hook',
          label: 'The Hook',
          text: p.hook,
          company: letter.company,
          title: letter.title,
          fit_score: letter.fit_score,
          job_id: letter.job_id
        });
      }
      if (p.technical_depth) {
        results.push({
          id: `${letter.job_id || letter.id}_tech`,
          section: 'technical_depth',
          label: 'Technical Depth & Metrics',
          text: p.technical_depth,
          company: letter.company,
          title: letter.title,
          fit_score: letter.fit_score,
          job_id: letter.job_id
        });
      }
      if (p.company_alignment) {
        results.push({
          id: `${letter.job_id || letter.id}_align`,
          section: 'company_alignment',
          label: 'Company Alignment & Mission',
          text: p.company_alignment,
          company: letter.company,
          title: letter.title,
          fit_score: letter.fit_score,
          job_id: letter.job_id
        });
      }
      if (p.call_to_action) {
        results.push({
          id: `${letter.job_id || letter.id}_cta`,
          section: 'call_to_action',
          label: 'Call to Action & Value Prop',
          text: p.call_to_action,
          company: letter.company,
          title: letter.title,
          fit_score: letter.fit_score,
          job_id: letter.job_id
        });
      }
    }

    if (results.length === 0) {
      return SEED_COVER_LETTER_PARAGRAPHS;
    }
    return results;
  }

  /**
   * Deconstructs raw 4-paragraph text into structured sections.
   */
  _decomposeCoverLetter(text) {
    if (!text || typeof text !== 'string') {
      return { hook: '', technical_depth: '', company_alignment: '', call_to_action: '' };
    }
    const blocks = text
      .split(/\n\s*\n/)
      .map(p => p.trim())
      .filter(p => p && !/^(subject:|dear|hi\s|to the hiring|hello)/i.test(p) && !/^(sincerely|best regards|best,|cheers|warmly)/i.test(p));

    return {
      hook: blocks[0] || text.slice(0, 240),
      technical_depth: blocks[1] || (blocks.length > 2 ? blocks[1] : ''),
      company_alignment: blocks[2] || (blocks.length > 3 ? blocks[2] : ''),
      call_to_action: blocks[3] || blocks[blocks.length - 1] || ''
    };
  }

  // ── AI Follow-up Draft Persistence (Bug 7) ──────────────────────────────────

  /**
   * Retrieves an AI-generated follow-up draft for a specific application/job ID.
   * Checks IndexedDB settings store, falling back to legacy localStorage if present.
   */
  async getFollowupDraft(appId) {
    if (!appId) return null;
    const key = `followup_${appId}`;
    try {
      const draft = await this.getItem(STORES.SETTINGS, key);
      if (draft) return draft;
    } catch {}

    // Fallback migration check from localStorage
    if (typeof localStorage !== 'undefined') {
      try {
        const rawMap = localStorage.getItem('sprav_ai_followups_cache');
        if (rawMap) {
          const parsed = JSON.parse(rawMap);
          if (parsed && parsed[appId]) {
            this.setItem(STORES.SETTINGS, key, parsed[appId]).catch(() => {});
            return parsed[appId];
          }
        }
        const legacy = localStorage.getItem(`sprav_ai_followup_${appId}`);
        if (legacy) {
          const parsed = JSON.parse(legacy);
          this.setItem(STORES.SETTINGS, key, parsed).catch(() => {});
          try { localStorage.removeItem(`sprav_ai_followup_${appId}`); } catch {}
          return parsed;
        }
      } catch {}
    }

    return null;
  }

  /**
   * Saves an AI-generated follow-up draft into IndexedDB.
   */
  async saveFollowupDraft(appId, draftData = {}) {
    if (!appId || !draftData) return false;
    const key = `followup_${appId}`;
    try {
      return await this.setItem(STORES.SETTINGS, key, {
        app_id: appId,
        ...draftData,
        updated_at: new Date().toISOString()
      });
    } catch {
      return false;
    }
  }

  /**
   * Retrieves all cached follow-up drafts for a list of application IDs.
   */
  async getAllFollowupDrafts(appIds = []) {
    const results = {};
    if (!Array.isArray(appIds) || appIds.length === 0) return results;
    await Promise.all(
      appIds.map(async (id) => {
        const draft = await this.getFollowupDraft(id);
        if (draft) results[id] = draft;
      })
    );
    return results;
  }

  /**
   * Removes a follow-up draft from IndexedDB.
   */
  async removeFollowupDraft(appId) {
    if (!appId) return false;
    try {
      return await this.deleteItem(STORES.SETTINGS, `followup_${appId}`);
    } catch {
      return false;
    }
  }

  // ── Interview Prep & Technical Screening Session Persistence ─────────────

  /**
   * Retrieves full recorded interview practice sessions (including questions, answers, STAR critiques).
   * @returns {Promise<Array>}
   */
  async getInterviewPracticeHistory() {
    try {
      const record = await this.getItem(STORES.SETTINGS, 'sprav_mock_practice_history');
      let history = null;
      if (record) {
        history = Array.isArray(record) ? record : record.value || record.history || null;
      }
      if (Array.isArray(history) && history.length > 0) {
        return history;
      }
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('sprav_mock_practice_history');
        if (local) {
          const parsed = JSON.parse(local);
          if (Array.isArray(parsed)) {
            // Migrate to IndexedDB in background
            this.setItem(STORES.SETTINGS, 'sprav_mock_practice_history', parsed).catch(() => {});
            return parsed;
          }
        }
      }
      return [];
    } catch {
      if (typeof localStorage !== 'undefined') {
        try {
          const local = localStorage.getItem('sprav_mock_practice_history');
          if (local) return JSON.parse(local);
        } catch {}
      }
      return [];
    }
  }

  /**
   * Saves the entire interview practice session history into IndexedDB.
   * @param {Array} history
   * @returns {Promise<boolean>}
   */
  async saveInterviewPracticeHistory(history = []) {
    if (!Array.isArray(history)) return false;
    try {
      const safeHistory = sanitizeObject(history.slice(0, 50));
      await this.setItem(STORES.SETTINGS, 'sprav_mock_practice_history', safeHistory);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('sprav_mock_practice_history', JSON.stringify(safeHistory));
        } catch {}
      }
      _notifyVaultSync('interview_history', safeHistory);
      return true;
    } catch (err) {
      console.warn('[StorageVault] Failed saving interview practice history:', err);
      return false;
    }
  }

  /**
   * Appends a new completed interview session to practice history.
   * @param {Object} sessionItem
   * @returns {Promise<Array>} updated history
   */
  async appendInterviewPracticeSession(sessionItem) {
    if (!sessionItem || typeof sessionItem !== 'object') return [];
    try {
      const current = await this.getInterviewPracticeHistory();
      const updated = [sessionItem, ...current.filter(s => s?.id !== sessionItem.id)].slice(0, 50);
      await this.saveInterviewPracticeHistory(updated);
      return updated;
    } catch (err) {
      console.warn('[StorageVault] Failed appending interview practice session:', err);
      return [];
    }
  }

  /**
   * Clears interview practice history from IndexedDB and localStorage.
   * @returns {Promise<boolean>}
   */
  async clearInterviewPracticeHistory() {
    try {
      await this.setItem(STORES.SETTINGS, 'sprav_mock_practice_history', []);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.removeItem('sprav_mock_practice_history');
        } catch {}
      }
      _notifyVaultSync('interview_history', []);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Retrieves persisted technical screening answers and evaluations.
   * @returns {Promise<Object>}
   */
  async getTechScreeningPracticeState() {
    try {
      const record = await this.getItem(STORES.SETTINGS, 'sprav_tech_screening_state');
      let state = null;
      if (record) {
        state = record.value || (typeof record === 'object' && !Array.isArray(record) ? record : null);
      }
      if (state && typeof state === 'object' && Object.keys(state).length > 0) {
        return state;
      }
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('sprav_tech_screening_state');
        if (local) {
          const parsed = JSON.parse(local);
          if (parsed && typeof parsed === 'object') {
            this.setItem(STORES.SETTINGS, 'sprav_tech_screening_state', parsed).catch(() => {});
            return parsed;
          }
        }
      }
      return {};
    } catch {
      if (typeof localStorage !== 'undefined') {
        try {
          const local = localStorage.getItem('sprav_tech_screening_state');
          if (local) return JSON.parse(local);
        } catch {}
      }
      return {};
    }
  }

  /**
   * Saves technical screening answers and evaluations state.
   * @param {Object} state
   * @returns {Promise<boolean>}
   */
  async saveTechScreeningPracticeState(state = {}) {
    if (!state || typeof state !== 'object') return false;
    try {
      const safeState = sanitizeObject(state);
      await this.setItem(STORES.SETTINGS, 'sprav_tech_screening_state', safeState);
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('sprav_tech_screening_state', JSON.stringify(safeState));
        } catch {}
      }
      _notifyVaultSync('tech_screening_state', safeState);
      return true;
    } catch (err) {
      console.warn('[StorageVault] Failed saving tech screening state:', err);
      return false;
    }
  }

  // ── Backup & Restore Safety Net ───────────────────────────────────────────

  /**
   * Generates a complete JSON backup file of all stores (except encrypted keys
   * and raw resume buffers which cannot be safely serialized) and triggers download.
   */
  async exportFullBackup() {
    const [kb, jobs, scope, history, settings, watchlist, contacts] = await Promise.all([
      this.getAll(STORES.KNOWLEDGE_BASE),
      this.getAll(STORES.JOBS),
      this.getAll(STORES.SCOPE),
      this.getAll(STORES.HISTORY),
      this.getAll(STORES.SETTINGS),
      this.getAll(STORES.WATCHLIST),
      this.getAll(STORES.CONTACTS).catch(() => []),
    ]);

    // Strip encrypted key records, crypto key material, and passphrase canary metadata from the unencrypted backup
    const safeSettings = settings.filter(s => s.key !== VAULT_KEY_NAME && !s.encrypted && s.key !== VAULT_PASSPHRASE_META_KEY);

    const backupPayload = {
      app: 'SPrav Job AI',
      version: '1.0.0',
      vault_version: DB_VERSION,
      export_timestamp: new Date().toISOString(),
      stores: {
        knowledge_base: kb,
        jobs: jobs,
        scope: scope,
        application_history: history,
        settings: safeSettings,
        watchlist: watchlist,
        contacts: contacts || [],
      }
    };

    const blob = new Blob([JSON.stringify(backupPayload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const dateStr = new Date().toISOString().split('T')[0];
    a.href = url;
    a.download = `sprav_job_ai_backup_${dateStr}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem('sprav_last_backup_at', new Date().toISOString());
      }
    } catch {}

    return {
      success: true,
      recordsCount: {
        kb: kb.length, jobs: jobs.length,
        history: history.length, watchlist: watchlist.length,
        contacts: (contacts || []).length
      }
    };
  }

  /**
   * Restores an exported JSON backup into the In-Browser Vault.
   * @param {string|object} backupContent
   */
  async importFullBackup(backupContent) {
    const safeReviver = (k, v) => (k === '__proto__' || k === 'constructor' || k === 'prototype' ? undefined : v);
    let data;
    if (typeof backupContent === 'string') {
      try {
        data = JSON.parse(backupContent, safeReviver);
      } catch (err) {
        throw new Error('Invalid JSON in backup file: ' + err.message);
      }
    } else if (backupContent && typeof backupContent === 'object') {
      data = JSON.parse(JSON.stringify(backupContent), safeReviver);
    } else {
      throw new Error('Invalid backup content payload.');
    }

    if (!data || !data.stores || typeof data.stores !== 'object') {
      throw new Error('Invalid backup file format. Missing stores data.');
    }

    const sanitizeRecord = (item) => {
      if (!item || typeof item !== 'object') return null;
      return sanitizeObject(item);
    };

    const db = await this.initDB();
    const storesToImport = [
      { name: STORES.KNOWLEDGE_BASE, records: Array.isArray(data.stores.knowledge_base) ? data.stores.knowledge_base : [] },
      { name: STORES.JOBS, records: Array.isArray(data.stores.jobs) ? data.stores.jobs : [] },
      { name: STORES.SCOPE, records: Array.isArray(data.stores.scope) ? data.stores.scope : [] },
      { name: STORES.HISTORY, records: Array.isArray(data.stores.application_history) ? data.stores.application_history : [] },
      { name: STORES.SETTINGS, records: Array.isArray(data.stores.settings) ? data.stores.settings : [] },
      { name: STORES.WATCHLIST, records: Array.isArray(data.stores.watchlist) ? data.stores.watchlist : [] },
      { name: STORES.CONTACTS, records: Array.isArray(data.stores.contacts) ? data.stores.contacts : [] },
    ];

    for (const { name, records } of storesToImport) {
      if (records.length > 0) {
        const tx = db.transaction([name], 'readwrite');
        const store = tx.objectStore(name);
        for (const rawItem of records) {
          const item = sanitizeRecord(rawItem);
          if (item) {
            store.put(item);
          }
        }
        await new Promise((res, rej) => {
          tx.oncomplete = () => res(true);
          tx.onerror = () => rej(tx.error);
        });
      }
    }

    // Invalidate entire cache after import
    _lruCache.clear();

    return {
      success: true,
      importedCounts: {
        jobs: data.stores.jobs?.length || 0,
        kb: data.stores.knowledge_base?.length || 0,
        history: data.stores.application_history?.length || 0,
        watchlist: data.stores.watchlist?.length || 0,
        contacts: data.stores.contacts?.length || 0,
      }
    };
  }

  /**
   * Subscribes to real-time cross-tab vault synchronization events.
   * @param {function} callback - Receives { type: 'VAULT_SYNC', store, timestamp }
   * @returns {function} unsubscribe
   */
  subscribeToVaultSync(callback) {
    _syncListeners.add(callback);
    return () => _syncListeners.delete(callback);
  }

  onSync(callback) {
    return this.subscribeToVaultSync(callback);
  }

  notifyVaultSync(store, data = null) {
    _notifyVaultSync(store, data);
  }

  /**
   * Prunes stale vault records to keep IndexedDB footprint lean and performant.
   * - Jobs: Deletes non-applied jobs older than maxAgeDays (preserves applied, interview, offer).
   * - Application History: Deletes application records older than 90 days.
   * - Vector Cache: Deletes cached embeddings older than 30 days.
   * 
   * @param {{ maxAgeDays?: number }} [options]
   * @returns {Promise<{ prunedJobs: number, prunedHistory: number, prunedVectors: number }>}
   */
  async pruneStaleVaultRecords({ maxAgeDays = 30 } = {}) {
    const stats = { prunedJobs: 0, prunedHistory: 0, prunedVectors: 0 };
    const now = Date.now();
    const jobThresholdMs = maxAgeDays * 24 * 60 * 60 * 1000;
    const historyThresholdMs = 90 * 24 * 60 * 60 * 1000;
    const vectorThresholdMs = 30 * 24 * 60 * 60 * 1000;

    try {
      // 1. Prune un-applied stale jobs (keeping all protected jobs safe)
      const jobs = await this.getAll(STORES.JOBS);
      if (Array.isArray(jobs)) {
        for (const job of jobs) {
          if (isProtectedJob(job)) continue;
          const jobTime = new Date(job.created_at || job.updated_at || 0).getTime();
          if (jobTime > 0 && (now - jobTime) > jobThresholdMs) {
            if (job.id) {
              await this.deleteItem(STORES.JOBS, job.id);
              stats.prunedJobs++;
            }
          }
        }
        if (stats.prunedJobs > 0) {
          _notifyVaultSync(STORES.JOBS);
        }
      }
    } catch (e) {
      console.warn('[StorageVault] Failed pruning jobs:', e);
    }

    try {
      // 2. Prune old application history (> 90 days)
      const history = await this.getAll(STORES.HISTORY);
      if (Array.isArray(history)) {
        for (const record of history) {
          if (!record) continue;
          // Guard: Never prune cover letters, resume snapshots, interview records, or custom templates
          const recId = String(record.id || '');
          if (recId.startsWith('cover_letter_') || recId.startsWith('resume_snapshot_') || recId.startsWith('interview_') || record.templateId) {
            continue;
          }
          const recordTime = new Date(record.applied_at || record.created_at || 0).getTime();
          if (recordTime > 0 && (now - recordTime) > historyThresholdMs) {
            if (record.id !== undefined) {
              await this.deleteItem(STORES.HISTORY, record.id);
              stats.prunedHistory++;
            }
          }
        }
        if (stats.prunedHistory > 0) {
          _notifyVaultSync(STORES.HISTORY);
        }
      }
    } catch (e) {
      console.warn('[StorageVault] Failed pruning history:', e);
    }

    try {
      // 3. Prune old cached vector embeddings (> 30 days) from knowledge_base store
      const kbRecords = await this.getAll(STORES.KNOWLEDGE_BASE);
      if (Array.isArray(kbRecords)) {
        for (const record of kbRecords) {
          const key = record.key || record.hash;
          if (key && String(key).startsWith('vec_')) {
            const cachedTime = record.cached_at || new Date(record.updated_at || 0).getTime();
            if (cachedTime > 0 && (now - cachedTime) > vectorThresholdMs) {
              await this.deleteItem(STORES.KNOWLEDGE_BASE, key);
              stats.prunedVectors++;
            }
          }
        }
      }
    } catch (e) {
      console.warn('[StorageVault] Failed pruning vector cache:', e);
    }

    return stats;
  }

  /**
   * "Keep the best and delete the useless":
   * Deletes useless (dismissed/rejected) and oldest unapplied discovery jobs.
   * NEVER deletes the Knowledge Base (profile, personas) — KB is strictly preserved.
   * NEVER deletes protected jobs (applied, interviewing, offered, saved/starred, notes, tailored, high-fit).
   * 
   * @param {Object} [options]
   * @param {number} [options.targetCount=500]
   * @param {number} [options.maxAgeDays]
   * @returns {Promise<{ prunedCount: number, protectedCount: number, remainingJobs: number }>}
   */
  async pruneOldestUselessJobs(options = {}) {
    const { targetCount = 500, maxAgeDays = null } = options;
    const allJobs = await this.getAll(STORES.JOBS);
    if (!Array.isArray(allJobs) || allJobs.length === 0) {
      return { prunedCount: 0, protectedCount: 0, remainingJobs: 0 };
    }

    const protectedJobs = [];
    const eligibleJobs = [];

    for (const job of allJobs) {
      if (isProtectedJob(job)) {
        protectedJobs.push(job);
      } else {
        eligibleJobs.push(job);
      }
    }

    if (eligibleJobs.length === 0) {
      return { prunedCount: 0, protectedCount: protectedJobs.length, remainingJobs: allJobs.length };
    }

    const isExplicitlyUseless = (j) => {
      const st = String(j.status || '').toLowerCase();
      return ['dismissed', 'rejected', 'expired', 'archived', 'hidden', 'skipped', 'not_interested'].includes(st);
    };

    const getJobTime = (j) => {
      const t = new Date(j.created_at || j.scraped_at || j.timestamp || 0).getTime();
      return isNaN(t) || t === 0 ? 0 : t;
    };

    // Rank: useless first, then oldest first
    eligibleJobs.sort((a, b) => {
      const aUseless = isExplicitlyUseless(a) ? 1 : 0;
      const bUseless = isExplicitlyUseless(b) ? 1 : 0;
      if (aUseless !== bUseless) {
        return bUseless - aUseless;
      }
      return getJobTime(a) - getJobTime(b);
    });

    const now = Date.now();
    const toDelete = [];

    for (const job of eligibleJobs) {
      if (toDelete.length >= targetCount) break;
      if (maxAgeDays) {
        const jobTime = getJobTime(job);
        if (jobTime > 0 && (now - jobTime) < maxAgeDays * 24 * 60 * 60 * 1000) {
          if (!isExplicitlyUseless(job)) continue;
        }
      }
      toDelete.push(job);
    }

    if (toDelete.length === 0) {
      return { prunedCount: 0, protectedCount: protectedJobs.length, remainingJobs: allJobs.length };
    }

    for (const j of toDelete) {
      if (j && j.id) {
        await this.deleteItem(STORES.JOBS, j.id);
      }
    }

    _notifyVaultSync(STORES.JOBS);
    console.info(`[StorageVault] Pruned ${toDelete.length} oldest/useless jobs. Protected: ${protectedJobs.length}.`);

    return {
      prunedCount: toDelete.length,
      protectedCount: protectedJobs.length,
      remainingJobs: allJobs.length - toDelete.length
    };
  }

  /**
   * Enforces the 1 GB maximum storage cap:
   * If storage usage exceeds or approaches the 1 GB limit (or if unapplied job count is excessive),
   * automatically prunes the oldest and useless listings while preserving applied jobs and the Knowledge Base.
   * 
   * @param {number} [maxBudgetBytes=MAX_STORAGE_BUDGET_BYTES]
   * @returns {Promise<{ pruned: number, reason: string }>}
   */
  async pruneStorageIfNeeded(maxBudgetBytes = MAX_STORAGE_BUDGET_BYTES) {
    try {
      let isOverBudget = false;

      if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        const usedBytes = est.usage || 0;
        if (usedBytes > maxBudgetBytes) {
          isOverBudget = true;
        }
      }

      const allJobs = await this.getAll(STORES.JOBS);
      if (!Array.isArray(allJobs) || allJobs.length === 0) {
        return { pruned: 0, reason: 'no_jobs' };
      }

      const unprotectedJobs = allJobs.filter(j => !isProtectedJob(j));
      if (unprotectedJobs.length === 0) {
        return { pruned: 0, reason: 'all_jobs_protected' };
      }

      // If storage exceeded 1 GB cap or if unapplied jobs accumulate beyond threshold (> 500)
      if (isOverBudget || unprotectedJobs.length > 500) {
        const res = await this.pruneOldestUselessJobs({
          targetCount: Math.min(unprotectedJobs.length, 250)
        });
        return { pruned: res.prunedCount, reason: isOverBudget ? 'storage_quota_exceeded' : 'excess_unapplied_jobs' };
      }

      return { pruned: 0, reason: 'within_budget' };
    } catch (err) {
      console.warn('[StorageVault] pruneStorageIfNeeded error:', err);
      return { pruned: 0, reason: 'error', error: err?.message };
    }
  }

  // ── Score Progression History Helpers ─────────────────────────────────────

  /**
   * Retrieves chronological resume score history scans.
   */
  async getScoreHistory() {
    try {
      const history = await this.getItem('sprav_score_history');
      if (Array.isArray(history)) return history;
      if (typeof localStorage !== 'undefined') {
        const local = localStorage.getItem('sprav_score_history');
        if (local) return JSON.parse(local);
      }
      return [];
    } catch {
      if (typeof localStorage !== 'undefined') {
        try {
          const local = localStorage.getItem('sprav_score_history');
          if (local) return JSON.parse(local);
        } catch {}
      }
      return [];
    }
  }

  /**
   * Appends an ATS diagnostic scan result to progression history.
   * Keeps the latest 30 scans to maintain lightweight storage.
   */
  async appendScoreHistory(record) {
    if (!record || typeof record.score !== 'number') return [];
    try {
      const current = await this.getScoreHistory();
      const newEntry = {
        id: record.id || `score_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
        score: Math.round(record.score),
        jobTitle: record.jobTitle || 'General Scan',
        company: record.company || 'Direct ATS Audit',
        targetAts: record.targetAts || null,
        dimensions: record.dimensions || {},
        timestamp: record.timestamp || new Date().toISOString()
      };
      const updated = [...current, newEntry].slice(-30);
      try {
        await this.setItem('sprav_score_history', updated);
      } catch {}
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem('sprav_score_history', JSON.stringify(updated));
        } catch {}
      }
      _notifyVaultSync('sprav_score_history', updated);
      return updated;
    } catch (err) {
      console.warn('[StorageVault] appendScoreHistory error:', err);
      return [];
    }
  }

  /**
   * Clears all recorded score history.
   */
  async clearScoreHistory() {
    try {
      try {
        await this.setItem('sprav_score_history', []);
      } catch {}
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('sprav_score_history');
      }
      _notifyVaultSync('sprav_score_history', []);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 1-Click Full Backup Export (.json)
   * Gathers all non-ephemeral records across IndexedDB stores into an air-gapped backup file.
   * @returns {Promise<string>} JSON string of complete vault backup
   */
  async exportFullVaultBackup() {
    const backup = {
      sprav_backup_version: 3,
      app: 'SPrav Job AI',
      exported_at: new Date().toISOString(),
      stores: {}
    };

    const targetStores = [
      STORES.KNOWLEDGE_BASE,
      STORES.JOBS,
      STORES.SCOPE,
      STORES.HISTORY,
      STORES.WATCHLIST,
      STORES.CONTACTS,
      STORES.SETTINGS
    ];

    for (const store of targetStores) {
      try {
        const items = await this.getAll(store);
        backup.stores[store] = sanitizeObject(items || []);
      } catch (err) {
        console.warn(`[StorageVault] Could not export store ${store}:`, err);
        backup.stores[store] = [];
      }
    }

    return JSON.stringify(backup, null, 2);
  }

  /**
   * 1-Click Full Backup Restore (.json)
   * Restores an exported backup with full prototype pollution shielding and validation.
   * @param {string} jsonString - Backup JSON string
   * @returns {Promise<{ success: boolean, restoredStores: string[], totalItems: number }>}
   */
  async restoreFullVaultBackup(jsonString) {
    const parsed = safeJsonParse(jsonString);
    if (!parsed || !parsed.sprav_backup_version || typeof parsed.stores !== 'object') {
      throw new Error('Invalid or corrupted SPrav backup JSON format');
    }

    const safeBackup = sanitizeObject(parsed);
    const restoredStores = [];
    let totalItems = 0;

    const db = await this.initDB();

    for (const [storeName, items] of Object.entries(safeBackup.stores)) {
      if (!Object.values(STORES).includes(storeName) || !Array.isArray(items)) {
        continue;
      }

      try {
        await this.clearStore(storeName);

        const tx = db.transaction([storeName], 'readwrite');
        const store = tx.objectStore(storeName);

        for (const item of items) {
          if (item && typeof item === 'object') {
            store.put(item);
            totalItems++;
          }
        }

        await new Promise((resolve, reject) => {
          tx.oncomplete = () => resolve();
          tx.onerror = () => reject(tx.error);
        });

        restoredStores.push(storeName);
      } catch (err) {
        console.warn(`[StorageVault] Failed to restore store ${storeName}:`, err);
      }
    }

    _lruCache.clear();
    _notifyVaultSync('ALL');
    return { success: true, restoredStores, totalItems };
  }

  /**
   * Permanently clears all records across all stores and resets the cache.
   */
  async clearAllData() {
    await Promise.all(Object.values(STORES).map(s => this.clearStore(s)));
    _lruCache.clear();
    _cryptoKey = null;
    _notifyVaultSync('ALL');
    return { success: true };
  }
}

export const storageVault = new BrowserStorageVault();
storageVault.calculateFollowUpDueAt = calculateFollowUpDueAt;

/**
 * Explicitly prompts the browser for persistent storage lock (survives disk pressure).
 * @returns {Promise<boolean>}
 */
export async function requestPersistentStorage() {
  if (typeof navigator !== 'undefined' && navigator.storage && navigator.storage.persist) {
    try {
      const isPersisted = await navigator.storage.persisted?.();
      if (!isPersisted) {
        const granted = await navigator.storage.persist();
        console.info(`[StorageVault] Persistent storage lock acquired: ${granted}`);
        return granted;
      }
      return true;
    } catch (err) {
      console.warn('[StorageVault] Persistent storage request failed:', err);
      return false;
    }
  }
  return false;
}

/**
 * Checks whether a vault backup checkpoint is overdue (> 7 days or never performed).
 * @param {string|number|null} lastBackupTimestamp
 * @returns {{ needsBackup: boolean, reason: string }}
 */
export function checkVaultCheckpoint(lastBackupTimestamp) {
  const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
  if (!lastBackupTimestamp) {
    return { needsBackup: true, reason: 'No safe vault backup has been recorded yet.' };
  }
  const lastTime = new Date(lastBackupTimestamp).getTime();
  if (isNaN(lastTime) || Date.now() - lastTime > SEVEN_DAYS_MS) {
    return { needsBackup: true, reason: 'Safe vault backup checkpoint is older than 7 days.' };
  }
  return { needsBackup: false, reason: 'Vault backup checkpoint is fresh.' };
}

storageVault.requestPersistentStorage = requestPersistentStorage;
storageVault.checkVaultCheckpoint = checkVaultCheckpoint;

export { STORES, DB_NAME, DB_VERSION, TOP_100_TECH_COMPANIES };

/**
 * Purely computed from vault data, no AI
 */
export function computeMomentumScore(jobs = [], applications = []) {
  const now = Date.now();
  const oneWeek = 7 * 24 * 3600000;
  
  const validApps = Array.isArray(applications)
    ? applications.filter(a => a && typeof a === 'object')
    : [];

  const sortedApps = [...validApps].sort((a, b) => {
    const timeA = a.applied_at ? new Date(a.applied_at).getTime() : 0;
    const timeB = b.applied_at ? new Date(b.applied_at).getTime() : 0;
    return (Number.isFinite(timeB) ? timeB : 0) - (Number.isFinite(timeA) ? timeA : 0);
  });

  const thisWeek = sortedApps.filter(a => {
    const time = a.applied_at ? new Date(a.applied_at).getTime() : NaN;
    return Number.isFinite(time) && (now - time) < oneWeek && (now - time) >= 0;
  }).length;

  const lastWeek = sortedApps.filter(a => {
    const time = a.applied_at ? new Date(a.applied_at).getTime() : NaN;
    if (!Number.isFinite(time)) return false;
    const age = now - time;
    return age >= oneWeek && age < 2 * oneWeek;
  }).length;

  const velocity = thisWeek;
  const trend = thisWeek > lastWeek ? 'up' : thisWeek < lastWeek ? 'down' : 'flat';
  const latestTime = sortedApps.length > 0 && sortedApps[0].applied_at
    ? new Date(sortedApps[0].applied_at).getTime()
    : NaN;
  const daysSinceLastApp = Number.isFinite(latestTime)
    ? Math.max(0, Math.floor((now - latestTime) / 86400000))
    : null;

  return { velocity, trend, daysSinceLastApp, stalled: daysSinceLastApp !== null && daysSinceLastApp > 3 };
}

export const SEED_COVER_LETTER_PARAGRAPHS = [
  {
    id: 'seed_hook_1',
    section: 'hook',
    label: 'The Hook',
    text: 'With verified production experience engineering high-throughput distributed systems and full-stack architectures, I am submitting my candidacy for the engineering role at your organization. Having engineered zero-cloud-cost WebGPU client architectures and event-driven backends handling millions of daily events, I am confident in taking end-to-end ownership of your upcoming roadmap.',
    company: 'Stripe',
    title: 'Senior Full Stack Engineer',
    fit_score: '4.9',
    job_id: 'seed_stripe'
  },
  {
    id: 'seed_tech_1',
    section: 'technical_depth',
    label: 'Technical Depth & Metrics',
    text: 'At my previous organization, I spearheaded the complete migration from a monolithic legacy backend to an asynchronous FastAPI and PostgreSQL service mesh, slashing p99 API response latencies from 420ms down to 68ms while reducing monthly AWS infrastructure spend by 38%. Furthermore, I implemented in-browser vector caching and zero-dependency local embeddings that eliminated server load across 120,000 active users.',
    company: 'Vercel',
    title: 'Platform Infrastructure Lead',
    fit_score: '5.0',
    job_id: 'seed_vercel'
  },
  {
    id: 'seed_align_1',
    section: 'company_alignment',
    label: 'Company Alignment & Mission',
    text: "I have followed your team's technical trajectory with admiration, especially your recent engineering releases prioritizing high-density developer velocity and resilient client-side execution. Your philosophy of eliminating operational bloat directly aligns with my personal commitment to robust, modular, and self-documenting codebases.",
    company: 'Linear',
    title: 'Full Stack Product Engineer',
    fit_score: '4.8',
    job_id: 'seed_linear'
  },
  {
    id: 'seed_cta_1',
    section: 'call_to_action',
    label: 'Call to Action & Value Prop',
    text: 'I welcome the opportunity to connect with your engineering team and demonstrate how my background in distributed systems, clean system design, and production reliability can deliver immediate measurable value to your product pipeline. Thank you for your consideration.',
    company: 'OpenAI',
    title: 'AI Systems Engineer',
    fit_score: '4.9',
    job_id: 'seed_openai'
  }
];
