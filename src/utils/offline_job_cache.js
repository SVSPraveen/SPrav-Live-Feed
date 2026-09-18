/**
 * Offline Job Cache & Resilient Action Sync Engine
 * =================================================
 * Enables seamless offline mobile job discovery, filtering, and queuing.
 * When the candidate is in flight, transit, or experiencing dropped connections:
 * 1. Serves instant mirrored jobs from offline cache.
 * 2. Queues bookmarking and application dispatches locally.
 * 3. Automatically flushes and synchronizes queue when network connectivity resumes.
 */

const CACHE_STORAGE_KEY = 'sprav_offline_jobs_mirror';
const QUEUE_STORAGE_KEY = 'sprav_offline_action_queue';

function safeParse(json, fallback) {
  try {
    return JSON.parse(json) || fallback;
  } catch {
    return fallback;
  }
}

export function isOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

/**
 * Persists live fetched jobs to local storage for offline retrieval.
 * @param {Array<Object>} jobs 
 * @returns {boolean}
 */
export function saveJobsToOfflineCache(jobs) {
  if (!Array.isArray(jobs) || jobs.length === 0) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const payload = {
      timestamp: Date.now(),
      count: jobs.length,
      jobs: jobs.slice(0, 150) // Cache top 150 relevant roles
    };
    localStorage.setItem(CACHE_STORAGE_KEY, JSON.stringify(payload));
    return true;
  } catch (err) {
    console.warn('[OfflineJobCache] Cache write warning:', err);
    return false;
  }
}

/**
 * Retrieves cached jobs for offline mobile browsing.
 * @returns {Array<Object>}
 */
export function getCachedJobs() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return [];
    const parsed = safeParse(raw, null);
    return Array.isArray(parsed?.jobs) ? parsed.jobs : [];
  } catch {
    return [];
  }
}

/**
 * Returns metadata about the cached offline jobs.
 */
export function getOfflineCacheMetadata() {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(CACHE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = safeParse(raw, null);
    if (!parsed || !parsed.timestamp) return null;
    const ageMinutes = Math.round((Date.now() - parsed.timestamp) / 60000);
    return {
      timestamp: parsed.timestamp,
      count: parsed.count || (parsed.jobs ? parsed.jobs.length : 0),
      ageMinutes,
      isFresh: ageMinutes < 1440 // fresh within 24h
    };
  } catch {
    return null;
  }
}

/**
 * Queues an action (e.g. 'save' or 'apply') while the device is offline.
 */
export function queueOfflineAction(action) {
  if (!action || !action.type) return false;
  try {
    if (typeof localStorage === 'undefined') return false;
    const queue = getOfflineActionQueue();
    const item = {
      ...action,
      id: action.id || `offline_act_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      timestamp: Date.now()
    };
    queue.push(item);
    localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queue));
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns all pending offline actions.
 */
export function getOfflineActionQueue() {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(QUEUE_STORAGE_KEY);
    return raw ? safeParse(raw, []) : [];
  } catch {
    return [];
  }
}

/**
 * Clears the offline action queue after successful synchronization.
 */
export function clearOfflineActionQueue() {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.removeItem(QUEUE_STORAGE_KEY);
  } catch {}
}

/**
 * Flushes pending offline actions once device regains connectivity.
 * @param {Function} [handler] Optional processor callback for each item
 */
export async function syncOfflineQueue(handler = null) {
  const queue = getOfflineActionQueue();
  if (queue.length === 0) return { count: 0, synced: [] };

  const synced = [];
  for (const item of queue) {
    try {
      if (typeof handler === 'function') {
        await handler(item);
      }
      synced.push(item);
    } catch (err) {
      console.warn('[OfflineJobCache] Item sync error:', item.id, err);
    }
  }

  clearOfflineActionQueue();

  if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
    try {
      window.dispatchEvent(new CustomEvent('sprav_offline_synced', {
        detail: { count: synced.length, synced }
      }));
    } catch {}
  }

  return { count: synced.length, synced };
}

/**
 * Attaches automatic sync listener to the 'online' event.
 */
export function setupAutoSyncListener(onSyncComplete = null) {
  if (typeof window === 'undefined') return () => {};

  const handleOnline = async () => {
    try {
      const res = await syncOfflineQueue();
      if (onSyncComplete && res.count > 0) {
        onSyncComplete(res);
      }
    } catch (err) {
      console.warn('[OfflineJobCache] Auto-sync warning:', err);
    }
  };

  window.addEventListener('online', handleOnline);
  return () => window.removeEventListener('online', handleOnline);
}
