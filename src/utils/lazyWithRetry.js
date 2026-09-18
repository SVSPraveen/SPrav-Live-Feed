import React from 'react';

/**
 * Helper to determine if an error is due to a stale or missing dynamic chunk
 * (typically caused by a new Vercel deployment while an existing browser session is active).
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const message = typeof error === 'string' 
    ? error 
    : (error.message || error.name || String(error));
  
  return (
    /failed to fetch dynamically imported module/i.test(message) ||
    /importing a module script failed/i.test(message) ||
    /error loading dynamically imported module/i.test(message) ||
    /loading chunk .* failed/i.test(message) ||
    /dynamically imported module/i.test(message) ||
    /networkerror when attempting to fetch resource/i.test(message)
  );
}

const CHUNK_RELOAD_LOCK_KEY = 'sprav_chunk_reload_timestamp';
const CHUNK_RELOAD_DEBOUNCE_MS = 15000; // 15 seconds loop guard

/**
 * Safely triggers a window reload if a chunk error occurred and we haven't
 * reloaded within the debounce interval.
 * Returns true if reload was initiated, false if suppressed by loop guard.
 */
export function triggerChunkReloadIfSafe() {
  try {
    const lastReload = window.sessionStorage?.getItem(CHUNK_RELOAD_LOCK_KEY);
    const now = Date.now();
    if (!lastReload || now - parseInt(lastReload, 10) > CHUNK_RELOAD_DEBOUNCE_MS) {
      window.sessionStorage?.setItem(CHUNK_RELOAD_LOCK_KEY, String(now));
      window.location.reload();
      return true;
    }
  } catch {
    // If sessionStorage is unavailable (e.g. strict privacy mode), do standard reload once
    window.location.reload();
    return true;
  }
  return false;
}

/**
 * Resilient React.lazy wrapper with automatic stale-chunk recovery.
 * If a dynamic import fails because the server deployed a new release with updated hashes,
 * this catches the error, forces a single clean browser reload, and yields a seamless update.
 */
export function lazyWithRetry(componentImport) {
  return React.lazy(async () => {
    try {
      return await componentImport();
    } catch (error) {
      if (isChunkLoadError(error)) {
        const reloaded = triggerChunkReloadIfSafe();
        if (reloaded) {
          // Return a hanging promise so React does not throw or flash error UI before reload takes effect
          return new Promise(() => {});
        }
      }
      throw error;
    }
  });
}

export default lazyWithRetry;
