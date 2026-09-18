/**
 * client_data_bridge.js
 * =======================
 * Unified Dual-Mode Data Bridge.
 * Automatically adapts between:
 * 1. Desktop / Server Mode: Uses local/remote FastAPI backend (/api) with automatic sync.
 * 2. In-Browser Web Mode: Uses client-side IndexedDB Vault (storageVault) and browser_ats_scanner ($0 server cost).
 * 
 * Guarantees zero crashing and zero user blocking regardless of network or backend status.
 */

import apiClient from './api_client.js';
import { storageVault } from './browser_storage_vault.js';
import { browserAtsScanner } from './browser_ats_scanner.js';
import { safeOpenUrl } from './security_guard.js';
import { fetchDailyMirrorJobs } from './github_job_streamer.js';

const API_BASE = '/api';

/**
 * Guards against SPA catch-all 200 index.html responses on static deployments (Vercel/Netlify).
 * Returns true only if response has real JSON object/array data and is NOT an HTML document.
 */
export function isRealApiResponse(res) {
  if (!res || res.status !== 200 || !res.data) return false;
  if (typeof res.data !== 'object' || res.data === null) return false;
  const str = String(res.data);
  if (str.includes('<!DOCTYPE') || str.includes('<!doctype') || str.includes('<html')) return false;
  return true;
}

class ClientDataBridge {
  constructor() {
    this.isBackendAvailable = false;
    this.checkedOnce = false;
    this.mode = 'detecting'; // 'backend' | 'web_vault'
    this.listeners = new Set();
  }

  subscribe(listener) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  _notify() {
    for (const l of this.listeners) {
      try { l(this.mode, this.isBackendAvailable); } catch (e) {}
    }
  }

  /**
   * Probes backend connectivity with a 1500ms timeout.
   */
  async probeBackend() {
    try {
      const res = await apiClient.get(`${API_BASE}/setup-check`, { timeout: 1500 });
      const isHtml = typeof res.data === 'string' && (res.data.toLowerCase().includes('<!doctype') || res.data.toLowerCase().includes('<html'));
      this.isBackendAvailable = res.status === 200 && !isHtml && typeof res.data === 'object' && res.data !== null;
      this.mode = this.isBackendAvailable ? 'backend' : 'web_vault';
    } catch (e) {
      this.isBackendAvailable = false;
      this.mode = 'web_vault';
    } finally {
      this.checkedOnce = true;
      this._notify();
    }
    return this.isBackendAvailable;
  }

  isWebMode() {
    return this.mode === 'web_vault';
  }

  isWebVaultMode(token) {
    if (token === 'in-browser-vault-active') return true;
    if (this.mode === 'web_vault') return true;
    if (this.checkedOnce && !this.isBackendAvailable) return true;
    return false;
  }

  /**
   * Fetches metrics either from backend or aggregates from IndexedDB.
   * Enforces strict profile readiness gating: if candidate knowledge base
   * or target scope has not been calibrated, returns 0s to eliminate
   * synthetic "ghost metrics" (e.g. 151 Ready to Apply, unearned ATS fit).
   */
  async getMetrics() {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.get(`${API_BASE}/metrics`, { timeout: 3000 });
        if (res.data && typeof res.data === 'object' && typeof res.data.total === 'number') {
          return res.data;
        }
      } catch (e) {
        console.warn('[Bridge] Backend metrics failed, falling back to storage vault');
      }
    }

    // In-Browser Vault Aggregation
    const [jobs, history, scope, kb] = await Promise.all([
      storageVault.getJobs().catch(() => []),
      storageVault.getHistory().catch(() => []),
      storageVault.getScope().catch(() => null),
      storageVault.getKnowledgeBase().catch(() => null)
    ]);

    const hasKb = Boolean(
      kb?.personal?.name ||
      (Array.isArray(kb?.work_history) && kb.work_history.length > 0) ||
      (kb?.skills && Object.values(kb.skills).some(arr => Array.isArray(arr) && arr.length > 0))
    );

    const roles = (scope?.roles || []).filter(r => (typeof r === 'string' ? r : r?.keyword) && r?.preference !== 'exclude');
    const locs = (scope?.locations || []).filter(l => (typeof l === 'string' ? l : l?.label) && l?.preference !== 'exclude');
    const hasScope = roles.length > 0 || locs.length > 0;

    // Strict Cold-Start Gating: Candidate profile must be calibrated before showing matches
    if (!hasKb || !hasScope) {
      return {
        total: 0,
        applied: (history || []).length,
        interviews: 0,
        rejected: 0,
        new: 0,
        action_required: 0,
        avg_ats: 0,
        uncalibrated: true
      };
    }

    const isMatch = (j) => {
      if (!scope || typeof browserAtsScanner?.isJobMatchingScope !== 'function') return true;
      return browserAtsScanner.isJobMatchingScope(j, scope);
    };

    const validJobs = Array.isArray(jobs) ? jobs.filter(Boolean) : [];
    const scopedJobs = validJobs.filter(isMatch);

    let total = scopedJobs.length;
    let applied = (history || []).length;
    let action_required = 0;
    let newJobs = 0;
    let rejected = 0;
    let totalAts = 0;
    let scoredCount = 0;

    for (const j of scopedJobs) {
      const s = j.status;
      const ats = parseFloat(j.ats_match_score) || 0;
      if (ats > 0) {
        totalAts += ats;
        scoredCount++;
      }
      if (s === 'applied') applied++;
      else if (s === 'matched' || (['near_miss_review', 'ready_for_review', 'manual_review'].includes(s) && ats >= 65) || ats >= 80) action_required++;
      else if (s === 'new') newJobs++;
      else if (s === 'rejected') rejected++;
    }

    const avg_ats = scoredCount > 0 ? Math.round((totalAts / scoredCount) * 10) / 10 : 0;

    return {
      total,
      applied,
      interviews: 0,
      rejected,
      new: newJobs,
      action_required,
      avg_ats,
      uncalibrated: false
    };
  }

  /**
   * Fetches jobs list.
   */
  async getJobs(limit = 2000) {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.get(`${API_BASE}/jobs?limit=${limit}`, { timeout: 4000 });
        if (Array.isArray(res.data) && res.data.length > 0) {
          return res.data;
        }
      } catch (e) {
        console.warn('[Bridge] Backend jobs failed, falling back to storage vault');
      }
    }

    let vaultJobs = await storageVault.getJobs();
    if (!Array.isArray(vaultJobs) || vaultJobs.length === 0) {
      try {
        const cloudJobs = await fetchDailyMirrorJobs(null, { lite: true });
        if (Array.isArray(cloudJobs) && cloudJobs.length > 0) {
          // Ingest top high-signal jobs to keep the UI buttery smooth at 60fps
          const highSignal = cloudJobs.slice(0, 250);
          await storageVault.saveJobs(highSignal);
          vaultJobs = await storageVault.getJobs();
        }
      } catch (err) {
        console.warn('[Bridge] Auto-seeding from GitHub Cloud mirror failed:', err);
      }
    }

    return Array.isArray(vaultJobs) ? vaultJobs : [];
  }

  /**
   * Directly synchronizes verified tech jobs from the SPrav GitHub Cloud mirror into the local vault.
   * @param {Object} [options={ lite: true }]
   * @returns {Promise<number>} Count of newly ingested jobs
   */
  async syncCloudJobs(options = { lite: true }) {
    try {
      const cloudJobs = await fetchDailyMirrorJobs(null, options);
      if (Array.isArray(cloudJobs) && cloudJobs.length > 0) {
        // Ingest top high-signal jobs to keep the UI buttery smooth at 60fps
        const highSignal = cloudJobs.slice(0, 250);
        await storageVault.saveJobs(highSignal);
        return highSignal.length;
      }
      return 0;
    } catch (err) {
      console.error('[Bridge] Failed to sync GitHub Cloud jobs:', err);
      return 0;
    }
  }

  /**
   * Fetches candidate Knowledge Base.
   */
  async getKnowledgeBase() {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.get(`${API_BASE}/kb`, { timeout: 3000 });
        if (res.data && (res.data.work_history || res.data.skills)) {
          // Keep vault in sync
          storageVault.saveKnowledgeBase(res.data).catch(() => {});
          return res.data;
        }
      } catch (e) {
        console.warn('[Bridge] Backend KB fetch failed, using storage vault');
      }
    }

    return await storageVault.getKnowledgeBase();
  }

  /**
   * Saves candidate Knowledge Base.
   */
  async saveKnowledgeBase(kbData) {
    // Always save to In-Browser Vault first
    await storageVault.saveKnowledgeBase(kbData);

    if (this.isBackendAvailable) {
      try {
        await apiClient.post(`${API_BASE}/kb`, { kb_data: kbData }, { timeout: 5000 });
      } catch (e) {
        console.warn('[Bridge] Backend KB sync failed:', e);
      }
    }

    return true;
  }

  /**
   * Fetches Application Scope.
   */
  async getScope() {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.get(`${API_BASE}/scope`, { timeout: 3000 });
        const scope = res.data?.scope || res.data;
        if (scope && (scope.roles || scope.locations)) {
          storageVault.saveScope(scope).catch(() => {});
          return scope;
        }
      } catch (e) {
        console.warn('[Bridge] Backend Scope fetch failed, using storage vault');
      }
    }

    return await storageVault.getScope();
  }

  /**
   * Saves Application Scope.
   */
  async saveScope(scopeData) {
    await storageVault.saveScope(scopeData);

    if (this.isBackendAvailable) {
      try {
        await apiClient.post(`${API_BASE}/scope`, scopeData, { timeout: 5000 });
      } catch (e) {
        console.warn('[Bridge] Backend Scope sync failed:', e);
      }
    }

    return true;
  }

  /**
   * Gets Loop / Discovery Status.
   */
  async getLoopStatus() {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.get(`${API_BASE}/loop/status`, { timeout: 2000 });
        return res.data;
      } catch (e) {
        console.warn('[Bridge] Backend loop status failed');
      }
    }

    return browserAtsScanner.getStatus();
  }

  /**
   * Starts discovery loop.
   */
  async startLoop(options = {}) {
    if (this.isBackendAvailable) {
      try {
        const res = await apiClient.post(`${API_BASE}/loop/start`, {}, { timeout: 5000 });
        if (res.data?.status !== 'error') {
          return { success: true, mode: 'backend' };
        }
      } catch (e) {
        console.warn('[Bridge] Backend loop start failed, falling back to browser scanner');
      }
    }

    // In-browser scanner
    browserAtsScanner.startContinuousScan(options);
    return { success: true, mode: 'web_vault' };
  }

  /**
   * Stops discovery loop.
   */
  async stopLoop() {
    if (this.isBackendAvailable) {
      try {
        await apiClient.post(`${API_BASE}/loop/stop`, {}, { timeout: 3000 });
      } catch (e) {}
    }

    browserAtsScanner.stopContinuousScan();
    return { success: true };
  }

  /**
   * 1-Click Guided Dispatch / Open Application.
   */
  async dispatchJob(job) {
    if (!job || !job.url) return false;

    // Open target portal in new tab
    safeOpenUrl(job.url, '_blank');

    // Update job status in In-Browser Vault
    const updatedJob = {
      ...job,
      status: 'applied',
      applied_at: new Date().toISOString()
    };
    await storageVault.saveJob(updatedJob);

    // Record in application history
    await storageVault.addHistoryRecord({
      job_id: job.id,
      title: job.title,
      company: job.company,
      url: job.url,
      ats_match_score: job.ats_match_score,
      status: 'applied',
      applied_at: new Date().toISOString()
    });

    // Sync to backend if available
    if (this.isBackendAvailable) {
      try {
        await apiClient.post(`${API_BASE}/jobs/${job.id}/confirm-submitted`, {}, { timeout: 3000 });
      } catch (e) {}
    }

    return true;
  }
}

export const dataBridge = new ClientDataBridge();

export function isWebVaultMode(token) {
  return dataBridge.isWebVaultMode(token);
}

/**
 * Executes a network API request with automatic fallback to client vault data.
 * Crucially, if running in web vault mode (the zero-cost static deployment where
 * backend is not running), this completely BYPASSES apiClient, saving 2500ms of timeout latency.
 *
 * @param {string} apiPath - The endpoint relative or absolute URL (e.g. '/api/analytics/conversion')
 * @param {Function|any} vaultFallback - Async or sync function returning local vault data, or raw fallback data
 * @param {Object} [options] - Additional parameters: { method = 'GET', data, params, headers, timeout = 2500, token }
 * @returns {Promise<any>}
 */
export async function safeApiOrVault(apiPath, vaultFallback, options = {}) {
  const token = options.token || (typeof localStorage !== 'undefined' ? localStorage.getItem('token') : null);

  // Fast path: In web mode or when backend is verified unavailable, bypass Axios entirely
  if (dataBridge.isWebVaultMode(token) || dataBridge.isWebMode()) {
    return typeof vaultFallback === 'function' ? await vaultFallback() : vaultFallback;
  }

  try {
    const method = (options.method || 'GET').toLowerCase();
    const config = {
      timeout: options.timeout || 2500,
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {})
      },
      params: options.params
    };

    let res;
    if (method === 'get') {
      res = await apiClient.get(apiPath, config);
    } else if (method === 'post') {
      res = await apiClient.post(apiPath, options.data || {}, config);
    } else if (method === 'put') {
      res = await apiClient.put(apiPath, options.data || {}, config);
    } else if (method === 'delete') {
      res = await apiClient.delete(apiPath, config);
    } else {
      res = await apiClient(apiPath, { method, ...config, data: options.data });
    }

    if (isRealApiResponse(res)) {
      return res.data;
    }
  } catch (_err) {
    // Network error, timeout, or backend 4xx/5xx — fall back to local vault data
  }

  return typeof vaultFallback === 'function' ? await vaultFallback() : vaultFallback;
}
