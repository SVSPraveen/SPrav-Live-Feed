import { buildCandidateAutofillPayload } from './autofill_bookmarklet.js';

/**
 * SPrav Companion Browser Extension Utility
 * =========================================
 * Provides bridge functions for synchronizing candidate facts to the Chrome/Edge
 * extension, listening for captured jobs from external career boards, and verifying
 * extension packaging and manifest integrity.
 */

export const EXTENSION_METADATA = Object.freeze({
  name: 'SPrav Job AI — 1-Click Job Autofill & AI Copilot',
  version: '1.0.0',
  manifest_version: 3,
  description: 'Instant 1-click candidate profile autofill for Workday, Greenhouse, Lever, Ashby, and all major career portals with sovereign on-device privacy.',
  required_permissions: ['storage', 'activeTab', 'tabs'],
  supported_portals: [
    'myworkdayjobs.com',
    'greenhouse.io',
    'lever.co',
    'ashbyhq.com',
    'smartrecruiters.com',
    'icims.com'
  ]
});

/**
 * Validates a Manifest V3 JSON string or object against SPrav extension specifications.
 * @param {string|object} manifest - Manifest JSON string or parsed object
 * @returns {{ valid: boolean, errors: string[] }}
 */
export function validateExtensionManifest(manifest) {
  const errors = [];
  let parsed = manifest;

  if (typeof manifest === 'string') {
    try {
      parsed = JSON.parse(manifest);
    } catch (e) {
      return { valid: false, errors: [`Invalid JSON in manifest: ${e.message}`] };
    }
  }

  if (!parsed || typeof parsed !== 'object') {
    return { valid: false, errors: ['Manifest must be a non-null object'] };
  }

  if (parsed.manifest_version !== 3) {
    errors.push(`Expected manifest_version 3, found ${parsed.manifest_version}`);
  }

  if (parsed.version !== EXTENSION_METADATA.version) {
    errors.push(`Expected version ${EXTENSION_METADATA.version}, found ${parsed.version}`);
  }

  if (!parsed.name || !String(parsed.name).includes('SPrav Job AI')) {
    errors.push('Manifest name must include "SPrav Job AI"');
  }

  if (!parsed.description || typeof parsed.description !== 'string' || parsed.description.trim().length === 0) {
    errors.push('Manifest description must be a non-empty string');
  }

  if (!Array.isArray(parsed.permissions)) {
    errors.push('Manifest permissions must be an array');
  } else {
    for (const required of EXTENSION_METADATA.required_permissions) {
      if (!parsed.permissions.includes(required)) {
        errors.push(`Manifest permissions missing required capability: "${required}"`);
      }
    }
  }

  if (!Array.isArray(parsed.host_permissions)) {
    errors.push('Manifest host_permissions must be an array');
  } else {
    const hosts = parsed.host_permissions.join(' ');
    const hasBroadMatch = hosts.includes('*://*/*') || 
                          hosts.includes('https://*/*') || 
                          hosts.includes('<all_urls>') || 
                          hosts.includes('myworkdayjobs.com');
    if (!hasBroadMatch) {
      errors.push('Manifest host_permissions must include broad HTTPS matching for job portals');
    }
  }

  return {
    valid: errors.length === 0,
    errors
  };
}

/**
 * Validates file presence for all declared extension assets and scripts.
 * @param {object} manifest - Parsed manifest object
 * @param {Function} fileCheckerFn - Synchronous predicate (relativePath) => boolean
 * @returns {{ valid: boolean, missingFiles: string[] }}
 */
export function validateExtensionStructure(manifest, fileCheckerFn) {
  const missingFiles = [];
  if (typeof fileCheckerFn !== 'function') {
    return { valid: false, missingFiles: ['File checker function is required'] };
  }

  // Check icons
  if (manifest?.icons && typeof manifest.icons === 'object') {
    for (const [size, relPath] of Object.entries(manifest.icons)) {
      if (!fileCheckerFn(relPath)) {
        missingFiles.push(`Icon ${size}px missing at: ${relPath}`);
      }
    }
  }

  // Core extension scripts
  const coreFiles = ['content_script.js', 'copilot.css', 'popup.html', 'popup.js'];
  for (const file of coreFiles) {
    if (!fileCheckerFn(file)) {
      missingFiles.push(`Core extension file missing: ${file}`);
    }
  }

  return {
    valid: missingFiles.length === 0,
    missingFiles
  };
}

/**
 * Builds candidate profile sync payload enriched with extension protocol metadata.
 * @param {object} kb - Candidate Knowledge Base
 * @param {object} scope - Target application scope
 * @returns {object} Full candidate autofill payload
 */
export function buildExtensionSyncPayload(kb = {}, scope = {}) {
  const basePayload = buildCandidateAutofillPayload(kb, scope);
  return {
    ...basePayload,
    __protocol_version: '1.0.0',
    __sync_timestamp: new Date().toISOString()
  };
}

/**
 * Checks if the SPrav companion extension is active in the host environment.
 * @returns {boolean}
 */
export function isExtensionInstalled() {
  if (typeof window === 'undefined') return false;
  return Boolean(
    window.__SPRAV_EXTENSION_INSTALLED__ ||
    window.__SPRAV_EXTENSION_ACTIVE__ ||
    (typeof document !== 'undefined' && document.getElementById('sprav-extension-bridge'))
  );
}

/**
 * Dispatches candidate payload to the browser extension via postMessage.
 * @param {object} kb - Knowledge base
 * @param {object} scope - Target scope
 * @param {Window} [targetWindow=window]
 * @returns {boolean} Success status of dispatch
 */
export function syncProfileToExtension(kb, scope, targetWindow = typeof window !== 'undefined' ? window : null) {
  if (!targetWindow || typeof targetWindow.postMessage !== 'function') {
    return false;
  }
  const payload = buildExtensionSyncPayload(kb, scope);
  targetWindow.postMessage({
    type: 'SPRAV_PROFILE_SYNC',
    profile: payload
  }, '*');
  return true;
}

/**
 * Sanitizes and normalizes an incoming captured job object from the companion extension.
 * Eliminates prototype pollution and HTML injection.
 * @param {object} rawJob - Raw job payload
 * @returns {object} Sanitized job record
 */
export function sanitizeCapturedJob(rawJob) {
  if (!rawJob || typeof rawJob !== 'object') {
    return {
      id: `job_ext_${Date.now()}`,
      title: 'Captured Job',
      company: 'Unknown Company',
      created_at: new Date().toISOString()
    };
  }

  const cleanTitle = String(rawJob.title || 'Captured Job').slice(0, 200).replace(/<[^>]*>/g, '').trim();
  const cleanCompany = String(rawJob.company || 'Unknown Company').slice(0, 150).replace(/<[^>]*>/g, '').trim();

  const sanitized = {
    ...rawJob,
    title: cleanTitle,
    company: cleanCompany,
    id: rawJob.id || `job_ext_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    created_at: rawJob.created_at || new Date().toISOString(),
    source: rawJob.source || 'Companion Extension'
  };

  delete sanitized.__proto__;
  delete sanitized.constructor;
  delete sanitized.prototype;

  return sanitized;
}

/**
 * Registers a sanitized listener for captured jobs dispatched by the extension content script.
 * @param {Function} callback - Callback receiving sanitized job
 * @param {Window} [targetWindow=window]
 * @returns {Function} Unsubscribe cleanup function
 */
export function listenForCapturedJobs(callback, targetWindow = typeof window !== 'undefined' ? window : null) {
  if (!targetWindow || typeof targetWindow.addEventListener !== 'function') {
    return () => {};
  }

  const handler = (event) => {
    const windowOrigin = targetWindow?.location?.origin || (typeof window !== 'undefined' ? window.location?.origin : '');
    const isTrusted = (windowOrigin && event.origin === windowOrigin) || 
                      event.source === targetWindow ||
                      !event.origin;
    if (!isTrusted) {
      return;
    }

    if (event.data?.type === 'SPRAV_JOB_CAPTURED' && event.data?.job) {
      const sanitized = sanitizeCapturedJob(event.data.job);
      if (typeof callback === 'function') {
        callback(sanitized);
      }
    }
  };

  targetWindow.addEventListener('message', handler);
  return () => {
    targetWindow.removeEventListener('message', handler);
  };
}

/**
 * Triggers a download of the packaged extension ZIP archive.
 * @param {string} [downloadName='sprav-extension-v1.0.0.zip']
 */
export function triggerExtensionZipDownload(downloadName = 'sprav-extension-v1.0.0.zip') {
  if (typeof document === 'undefined') return;
  const link = document.createElement('a');
  link.href = '/sprav-extension.zip';
  link.download = downloadName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Builds direct, pre-filled deep-search URLs for major career portals.
 * Useful for bridging 0-result taxonomy searches to CORS/bot-blocked platforms
 * where the candidate can use the companion extension to ingest jobs in 1 click.
 *
 * @param {'linkedin'|'indeed'|'google'|'glassdoor'|'wellfound'} platform
 * @param {string} query - Job title or keywords
 * @param {string} [location=''] - Geographic location or city
 * @returns {string} Fully encoded URL
 */
export function buildJobSearchUrl(platform, query = '', location = '') {
  const cleanQ = String(query || '').trim();
  const cleanLoc = String(location || '').trim();

  switch (String(platform || '').toLowerCase()) {
    case 'linkedin': {
      const params = new URLSearchParams();
      if (cleanQ) params.set('keywords', cleanQ);
      if (cleanLoc) params.set('location', cleanLoc);
      params.set('f_TPR', 'r86400'); // Filter to past 24 hours for fresh roles
      return `https://www.linkedin.com/jobs/search/?${params.toString()}`;
    }
    case 'indeed': {
      const params = new URLSearchParams();
      if (cleanQ) params.set('q', cleanQ);
      if (cleanLoc) params.set('l', cleanLoc);
      params.set('fromage', '3'); // Fresh past 3 days
      return `https://www.indeed.com/jobs?${params.toString()}`;
    }
    case 'google': {
      const combined = [cleanQ, cleanLoc, 'jobs'].filter(Boolean).join(' ');
      return `https://www.google.com/search?q=${encodeURIComponent(combined)}&ibp=htl;jobs`;
    }
    case 'wellfound': {
      const params = new URLSearchParams();
      if (cleanQ) params.set('role', cleanQ);
      if (cleanLoc) params.set('location', cleanLoc);
      return `https://wellfound.com/jobs?${params.toString()}`;
    }
    default: {
      const combined = [cleanQ, cleanLoc].filter(Boolean).join(' ');
      return `https://www.google.com/search?q=${encodeURIComponent(combined + ' career openings')}`;
    }
  }
}

/**
 * Fetches an ATS API endpoint via the companion extension's CORS-free service worker.
 * Allows querying Greenhouse, Ashby, Lever, and Workday CXS boards directly with zero proxy servers.
 *
 * @param {string} url - The target ATS board endpoint URL
 * @param {number|{ method?: string, headers?: Record<string,string>, body?: any }} [optionsOrTimeout=8000]
 * @param {number} [maybeTimeout=8000] - Request deadline if options object was provided
 * @returns {Promise<{ ok: boolean, data?: any, rawText?: string, status?: number, error?: string }>}
 */
export function fetchAtsViaExtension(url, optionsOrTimeout = 8000, maybeTimeout = 8000) {
  if (typeof window === 'undefined' || !isExtensionInstalled()) {
    return Promise.resolve({ ok: false, error: 'Companion extension not active' });
  }

  const options = typeof optionsOrTimeout === 'object' && optionsOrTimeout !== null ? optionsOrTimeout : {};
  const timeoutMs = typeof optionsOrTimeout === 'number' ? optionsOrTimeout : (typeof maybeTimeout === 'number' ? maybeTimeout : 8000);
  const method = options.method || 'GET';
  const headers = options.headers || null;
  const body = options.body || null;

  return new Promise((resolve) => {
    const reqId = `req_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    let timer = null;

    const handler = (event) => {
      if (event.data?.type === 'SPRAV_EXT_FETCH_ATS_RESPONSE' && event.data?.reqId === reqId) {
        if (timer) clearTimeout(timer);
        window.removeEventListener('message', handler);
        resolve({
          ok: Boolean(event.data.ok),
          data: event.data.data,
          rawText: event.data.rawText,
          status: event.data.status,
          error: event.data.error
        });
      }
    };

    window.addEventListener('message', handler);

    timer = setTimeout(() => {
      window.removeEventListener('message', handler);
      resolve({ ok: false, error: `Extension ATS fetch timed out after ${timeoutMs}ms` });
    }, timeoutMs);

    window.postMessage({
      type: 'SPRAV_EXT_FETCH_ATS',
      reqId,
      url,
      method,
      headers,
      body
    }, '*');
  });
}



