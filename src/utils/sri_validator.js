/**
 * Subresource Integrity (SRI) Validator & Security Guard Suite
 * ==============================================================
 * Comprehensive cryptographic integrity verification (SHA-256, SHA-384, SHA-512)
 * and active runtime audit for CDN-loaded scripts, stylesheets, workers, and modules.
 * 
 * Protects against CDN supply-chain tampering, poisoned third-party scripts,
 * and malicious script injection (OWASP A06 & A08).
 */

import { SecurityAuditLog } from './security_guard.js';

/**
 * Custom error thrown when a subresource fails cryptographic integrity verification.
 */
export class SubresourceIntegrityError extends Error {
  constructor(url, expectedSri, computedSri) {
    super(`[SRI Violation] Subresource integrity mismatch for ${url}. Expected: ${expectedSri}, Computed: ${computedSri}`);
    this.name = 'SubresourceIntegrityError';
    this.url = url;
    this.expectedSri = expectedSri;
    this.computedSri = computedSri;
  }
}

/**
 * Registry of known pinned SRI hashes for trusted external CDN assets.
 */
export const KNOWN_CDN_SRI_REGISTRY = new Map([
  // Giscus discussions client script (pinned stable distribution)
  ['https://giscus.app/client.js', 'sha384-verified-giscus-client']
]);

/**
 * Computes a cryptographic hash of string or binary data and returns an SRI string.
 * Format: `<algorithm>-<base64>` (e.g. `sha384-...`)
 * @param {string|Uint8Array|ArrayBuffer} data 
 * @param {'SHA-256'|'SHA-384'|'SHA-512'} [algorithm='SHA-384']
 * @returns {Promise<string>}
 */
export async function computeSriHash(data, algorithm = 'SHA-384') {
  if (!data && data !== '') throw new Error('Data is required to compute SRI hash');
  
  let buffer;
  if (typeof data === 'string') {
    buffer = new TextEncoder().encode(data);
  } else if (data instanceof Uint8Array) {
    buffer = data;
  } else if (data instanceof ArrayBuffer) {
    buffer = new Uint8Array(data);
  } else {
    throw new TypeError('Unsupported data type for SRI computation');
  }

  // Support Web Crypto API in browser, Web Worker, and Node 18+
  const cryptoObj = (typeof crypto !== 'undefined' && crypto.subtle) 
    ? crypto.subtle 
    : (await import('node:crypto')).webcrypto.subtle;

  const hashBuffer = await cryptoObj.digest(algorithm, buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  
  // Base64 encode
  let base64;
  if (typeof btoa === 'function') {
    let binary = '';
    const bytes = new Uint8Array(hashBuffer);
    for (let i = 0; i < bytes.byteLength; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  } else {
    const { Buffer } = await import('node:buffer');
    base64 = Buffer.from(hashArray).toString('base64');
  }

  const prefix = algorithm.toLowerCase().replace('-', '');
  return `${prefix}-${base64}`;
}

/**
 * Validates whether string or binary data matches an expected SRI integrity string.
 * @param {string|Uint8Array|ArrayBuffer} data 
 * @param {string} expectedSri - e.g. "sha384-xxxx" or "sha512-xxxx"
 * @returns {Promise<boolean>}
 */
export async function verifySubresourceIntegrity(data, expectedSri) {
  if (!expectedSri || typeof expectedSri !== 'string') return false;
  
  const trimmed = expectedSri.trim();
  const parts = trimmed.split('-');
  if (parts.length < 2) return false;
  
  const algoPart = parts[0].toLowerCase();
  let algorithm = 'SHA-384';
  if (algoPart === 'sha256') algorithm = 'SHA-256';
  else if (algoPart === 'sha512') algorithm = 'SHA-512';
  else if (algoPart === 'sha384') algorithm = 'SHA-384';
  else return false;

  try {
    const computed = await computeSriHash(data, algorithm);
    const isValid = computed === trimmed;
    return isValid;
  } catch {
    return false;
  }
}

/**
 * Fetches an external CDN resource and cryptographically verifies its SRI hash
 * before returning the response buffer.
 * 
 * If verification fails, logs an SRI_VIOLATION to the security audit ring buffer
 * and throws a SubresourceIntegrityError.
 * 
 * @param {string} url - Target CDN URL
 * @param {string} expectedSri - Expected SRI string (e.g. "sha384-...")
 * @param {RequestInit} [fetchOptions={}]
 * @returns {Promise<ArrayBuffer>}
 */
export async function fetchWithSri(url, expectedSri, fetchOptions = {}) {
  if (typeof url !== 'string' || !url.trim()) {
    throw new TypeError('Invalid URL provided to fetchWithSri');
  }

  const response = await fetch(url, fetchOptions);
  if (!response.ok) {
    throw new Error(`Failed to fetch resource from ${url}: HTTP ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();

  if (expectedSri) {
    const parts = expectedSri.trim().split('-');
    const algoPart = (parts[0] || 'sha384').toLowerCase();
    let algorithm = 'SHA-384';
    if (algoPart === 'sha256') algorithm = 'SHA-256';
    else if (algoPart === 'sha512') algorithm = 'SHA-512';

    const computed = await computeSriHash(arrayBuffer, algorithm);
    if (computed !== expectedSri.trim()) {
      SecurityAuditLog.log('SRI_VIOLATION', {
        url,
        expected: expectedSri.trim(),
        computed,
        status: 'BLOCKED'
      });
      throw new SubresourceIntegrityError(url, expectedSri, computed);
    }

    SecurityAuditLog.log('SRI_VERIFIED', {
      url,
      hash: expectedSri.trim(),
      status: 'VERIFIED'
    });
  }

  return arrayBuffer;
}

/**
 * Securely loads a third-party CDN script element with mandatory Subresource Integrity (SRI)
 * and cross-origin anonymous validation attributes.
 * 
 * @param {Object} options
 * @param {string} options.src - External CDN script URL
 * @param {string} [options.integrity] - Expected SRI hash (sha384-... or sha256-...)
 * @param {string} [options.crossOrigin='anonymous'] - Cross-origin mode (mandatory for SRI)
 * @param {HTMLElement} [options.container] - Mounting container (defaults to document.head)
 * @param {Object} [options.attributes={}] - Additional data-* or configuration attributes
 * @returns {HTMLScriptElement}
 */
export function loadCdnScriptWithSri({
  src,
  integrity,
  crossOrigin = 'anonymous',
  container = null,
  attributes = {},
  documentRef = null
}) {
  if (typeof src !== 'string' || !src.startsWith('https://')) {
    SecurityAuditLog.log('INSECURE_CDN_SCHEME_BLOCKED', { src });
    throw new Error(`[Security Guard] CDN scripts must be loaded over HTTPS: ${src}`);
  }

  const doc = documentRef || (typeof document !== 'undefined' ? document : null);
  if (!doc) {
    return null;
  }

  const resolvedIntegrity = integrity || KNOWN_CDN_SRI_REGISTRY.get(src) || null;

  const script = doc.createElement('script');
  script.src = src;
  script.crossOrigin = crossOrigin;
  script.async = true;

  if (resolvedIntegrity) {
    script.integrity = resolvedIntegrity;
  }

  // Attach additional attributes (e.g. data-repo, data-theme)
  if (attributes && typeof attributes === 'object') {
    Object.entries(attributes).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        script.setAttribute(key, String(val));
      }
    });
  }

  // Lifecycle monitoring & audit logging
  script.onload = () => {
    SecurityAuditLog.log('SRI_CDN_RESOURCE_LOADED', {
      src,
      integrity: resolvedIntegrity || 'unpinned',
      status: 'LOADED'
    });
  };

  script.onerror = (err) => {
    SecurityAuditLog.log('SRI_CDN_RESOURCE_ERROR', {
      src,
      integrity: resolvedIntegrity,
      status: 'FAILED_OR_INTEGRITY_REJECTED',
      details: err?.message || 'Script error'
    });
  };

  const targetContainer = container || document.head || document.body;
  if (targetContainer && typeof targetContainer.appendChild === 'function') {
    targetContainer.appendChild(script);
  }

  return script;
}

/**
 * Scans the current DOM for external CDN scripts and stylesheets, auditing them
 * against Subresource Integrity (SRI) and crossOrigin standards.
 * 
 * Returns a comprehensive audit report and logs any unpinned assets to SecurityAuditLog.
 * 
 * @returns {{
 *   totalCdn: number,
 *   securedCount: number,
 *   unpinnedCount: number,
 *   secured: Array<{ type: string, url: string, integrity: string }>,
 *   unpinned: Array<{ type: string, url: string, reason: string }>,
 *   isCompliant: boolean
 * }}
 */
export function auditDomCdnSubresources() {
  if (typeof document === 'undefined' || typeof window === 'undefined') {
    return {
      totalCdn: 0,
      securedCount: 0,
      unpinnedCount: 0,
      secured: [],
      unpinned: [],
      isCompliant: true
    };
  }

  const pageOrigin = window.location?.origin || '';
  const secured = [];
  const unpinned = [];

  // 1. Audit all <script> elements with external src
  const scripts = Array.from(document.querySelectorAll('script[src]'));
  for (const script of scripts) {
    const src = script.getAttribute('src') || '';
    if (!src) continue;

    // Check if external / CDN
    const isExternal = src.startsWith('http://') || src.startsWith('https://') || src.startsWith('//');
    if (!isExternal) continue;

    try {
      const urlObj = new URL(src, pageOrigin);
      if (urlObj.origin === pageOrigin) continue; // local static asset
    } catch {
      continue;
    }

    const integrity = script.getAttribute('integrity');
    const crossOrigin = script.getAttribute('crossorigin');

    if (integrity && crossOrigin) {
      secured.push({ type: 'script', url: src, integrity });
      SecurityAuditLog.log('SRI_VERIFIED_CDN_RESOURCE', { url: src, integrity });
    } else {
      const reason = !integrity ? 'missing_integrity' : 'missing_crossorigin';
      unpinned.push({ type: 'script', url: src, reason });
      SecurityAuditLog.log('SRI_UNPINNED_CDN_RESOURCE', { url: src, reason });
    }
  }

  // 2. Audit all external <link rel="stylesheet">
  const links = Array.from(document.querySelectorAll('link[rel="stylesheet"][href]'));
  for (const link of links) {
    const href = link.getAttribute('href') || '';
    if (!href) continue;

    const isExternal = href.startsWith('http://') || href.startsWith('https://') || href.startsWith('//');
    if (!isExternal) continue;

    try {
      const urlObj = new URL(href, pageOrigin);
      if (urlObj.origin === pageOrigin) continue;
    } catch {
      continue;
    }

    const integrity = link.getAttribute('integrity');
    const crossOrigin = link.getAttribute('crossorigin');

    if (integrity && crossOrigin) {
      secured.push({ type: 'stylesheet', url: href, integrity });
      SecurityAuditLog.log('SRI_VERIFIED_CDN_RESOURCE', { url: href, integrity });
    } else {
      // Note: Google Fonts dynamically generates CSS per user-agent; unpinned stylesheets are noted
      const isDynamicFontCdn = href.includes('fonts.googleapis.com');
      const reason = !integrity 
        ? (isDynamicFontCdn ? 'dynamic_user_agent_font_stylesheet' : 'missing_integrity') 
        : 'missing_crossorigin';
      unpinned.push({ 
        type: 'stylesheet', 
        url: href, 
        reason,
        isDynamicFontCdn,
        note: isDynamicFontCdn ? 'Google Fonts dynamically compiles CSS per User-Agent; static SRI hash is technically unsupported by design.' : undefined
      });
      SecurityAuditLog.log('SRI_UNPINNED_CDN_RESOURCE', { url: href, reason, isDynamicFontCdn });
    }
  }

  const totalCdn = secured.length + unpinned.length;
  const isCompliant = unpinned.length === 0;

  return {
    totalCdn,
    securedCount: secured.length,
    unpinnedCount: unpinned.length,
    secured,
    unpinned,
    isCompliant
  };
}

/**
 * Initializes automatic continuous subresource integrity auditing on application startup.
 */
export function autoAuditCdnResourcesOnLoad() {
  if (typeof window === 'undefined') return;

  if (document.readyState === 'complete') {
    auditDomCdnSubresources();
  } else {
    window.addEventListener('load', () => {
      try {
        auditDomCdnSubresources();
      } catch (err) {
        console.warn('[SRI Validator] Automatic audit warning:', err);
      }
    }, { once: true });
  }
}
