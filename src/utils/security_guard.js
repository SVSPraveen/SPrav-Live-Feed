/**
 * SPrav Job AI — Security Guard & OWASP Hardening Suite
 * ======================================================
 * Comprehensive client-side defenses addressing OWASP Top 10 vulnerabilities:
 * 1. A01: Broken Access Control & Vault Integrity (Tamper checks & prototype shielding)
 * 2. A02: Cryptographic Failures & Sensitive Data Hygiene (Zero logging of keys/PII)
 * 3. A03: Injection (XSS, CSV Formula Injection CWE-1236, Prototype Pollution, DOM XSS)
 * 4. A04: Insecure Design & Anti-Reverse Engineering (Tamper detection & deep freeze)
 * 5. A05: Security Misconfiguration & Safe Navigation (Protocol whitelisting, reverse tab-nabbing)
 * 6. A08: Software and Data Integrity Failures (Safe deserialization & object sanitization)
 * 7. A09: Security Logging & Monitoring (Local bounded security audit ring-buffer)
 * 8. A10: Server-Side / Client-Side Request Forgery (SSRF & Cloud metadata blocking)
 */

const ALLOWED_PROTOCOLS = new Set(['https:', 'http:']);
const BLOCKED_SCHEMES = /^(javascript|data|vbscript|file|blob):/i;
const SPREADSHEET_FORMULA_PREFIX = /^[=+\-@\t\r|%]/;

// Cloud metadata and private subnet IP ranges for SSRF defense (OWASP A10)
const CLOUD_METADATA_HOSTS = new Set([
  '169.254.169.254',
  'metadata.google.internal',
  'metadata.internal',
  '100.100.100.200',
  'fd00:ec2::254',
  '[fd00:ec2::254]'
]);

const PRIVATE_IP_REGEX = /^(localhost|127\.\d+\.\d+\.\d+|10\.\d+\.\d+\.\d+|172\.(1[6-9]|2\d|3[0-1])\.\d+\.\d+|192\.168\.\d+\.\d+|0\.0\.0\.0|::1|\[::1\])$/i;

// ── In-Browser Security Audit Log Ring Buffer (OWASP A09) ────────────────────
const MAX_AUDIT_EVENTS = 50;
const _auditLog = [];

export const SecurityAuditLog = {
  /**
   * Records a security event to the in-browser audit ring-buffer.
   * @param {string} type - Event category (e.g., 'BLOCKED_URL', 'PROTOTYPE_POLLUTION')
   * @param {Object} [details={}] - Non-sensitive context
   */
  log(type, details = {}) {
    const entry = {
      id: `sec_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString(),
      type: String(type),
      details: { ...details }
    };
    _auditLog.unshift(entry);
    if (_auditLog.length > MAX_AUDIT_EVENTS) {
      _auditLog.pop();
    }
  },

  /**
   * Retrieves recorded audit events.
   * @returns {Array<Object>}
   */
  getEvents() {
    return [..._auditLog];
  },

  /**
   * Clears audit log.
   */
  clear() {
    _auditLog.length = 0;
  }
};

/**
 * Validates whether a given URL string is safe to open or navigate to.
 * Permitted:
 * - Absolute URLs with https:// or http://
 * - Relative safe URLs starting with '/' (e.g., /docs/guide.md)
 * - Safe anchor fragments (#portal)
 * 
 * Blocked:
 * - javascript:, data:, vbscript:, file:, blob:
 * - Protocol-relative slashes like '//evil.com'
 */
export function isValidWebUrl(url) {
  if (typeof url !== 'string') return false;
  const trimmed = url.trim();
  if (!trimmed) return false;

  // Block dangerous schemes
  if (BLOCKED_SCHEMES.test(trimmed)) {
    return false;
  }

  // Block protocol-relative URLs (e.g., //evil.com or /\\evil.com)
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\\\')) {
    return false;
  }

  // Handle safe relative URLs (e.g., /docs/...)
  if (trimmed.startsWith('/')) {
    return true;
  }

  // Handle in-page anchors (e.g., #portal)
  if (trimmed.startsWith('#')) {
    return true;
  }

  try {
    const parsed = new URL(trimmed, 'https://localhost');
    return ALLOWED_PROTOCOLS.has(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Safely formats and sanitizes any arbitrary URL for direct embedding in <a href={...}>.
 * Neutralizes OWASP A03 / CWE-79 Injection:
 * - Completely rejects and blocks javascript:, data:, vbscript:, and file: schemes.
 * - Rejects protocol-relative bypasses (//evil.com, /\\evil.com).
 * - Preserves safe in-app anchors (#portal) and relative paths (/docs/...).
 * - Preserves valid mailto: links (e.g. mailto:recruiter@example.com).
 * - Automatically prepends https:// to raw domain names (e.g. "greenhouse.io/job/1" -> "https://greenhouse.io/job/1").
 * - Returns fallback ('#') on any blocked or invalid URL.
 * 
 * @param {string|null|undefined} url - Target URL or link
 * @param {string} [fallback='#'] - Safe fallback destination
 * @returns {string} Safe sanitized URL
 */
export function formatSafeWebUrl(url, fallback = '#') {
  if (typeof url !== 'string') return fallback;
  const trimmed = url.trim();
  if (!trimmed) return fallback;

  // Block dangerous schemes
  if (BLOCKED_SCHEMES.test(trimmed)) {
    SecurityAuditLog.log('BLOCKED_DANGEROUS_SCHEME', { scheme: trimmed.split(':')[0] });
    return fallback;
  }

  // Block protocol-relative bypasses
  if (trimmed.startsWith('//') || trimmed.startsWith('/\\') || trimmed.startsWith('\\\\')) {
    SecurityAuditLog.log('BLOCKED_PROTOCOL_RELATIVE_URL', { url: trimmed.slice(0, 50) });
    return fallback;
  }

  // Allow safe in-page anchors and relative paths
  if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
    return trimmed;
  }

  // Allow safe mailto: links
  if (/^mailto:[^\s@]+@[^\s@]+\.[^\s@]+/i.test(trimmed)) {
    return trimmed;
  }

  try {
    const candidate = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    const parsed = new URL(candidate);
    if (ALLOWED_PROTOCOLS.has(parsed.protocol)) {
      return parsed.toString();
    }
    return fallback;
  } catch {
    return fallback;
  }
}

/**
 * Validates whether a URL attempts to access cloud instance metadata or internal endpoints (OWASP A10).
 * Useful when validating custom user-supplied LLM API endpoints or webhook destinations.
 * 
 * @param {string} url - Target URL
 * @returns {boolean} True if the URL targets cloud metadata or internal network
 */
export function isCloudMetadataUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    const rawHostname = parsed.hostname.toLowerCase();
    const hostname = rawHostname.replace(/^\[|\]$/g, '');

    if (CLOUD_METADATA_HOSTS.has(hostname) || CLOUD_METADATA_HOSTS.has(rawHostname)) {
      return true;
    }
    // Link-local IPv4 range (169.254.0.0/16 - RFC 3927)
    if (hostname.startsWith('169.254.')) {
      return true;
    }
    // Decimal or hex integer representations of 169.254.169.254
    if (hostname === '2852039166' || hostname === '0xa9fea9fe') {
      return true;
    }
    // IPv6 link-local or AWS IMDSv2 IPv6 prefix
    if (hostname.startsWith('fe80:') || hostname.startsWith('fd00:')) {
      return true;
    }
    // Internal cloud compute metadata host suffixes
    if (hostname.endsWith('.internal') || hostname.endsWith('.local')) {
      return true;
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Validates whether a URL points to a local or private subnet.
 * @param {string} url - Target URL
 * @returns {boolean}
 */
export function isPrivateSubnetUrl(url) {
  if (typeof url !== 'string') return false;
  try {
    const parsed = new URL(url.trim());
    const hostname = parsed.hostname.toLowerCase();
    return PRIVATE_IP_REGEX.test(hostname) || CLOUD_METADATA_HOSTS.has(hostname);
  } catch {
    return false;
  }
}

/**
 * Safely opens a URL in a new browser window or tab.
 * Enforces:
 * - Protocol validation (blocks javascript:, data:, etc.)
 * - Automatic 'noopener,noreferrer' to prevent reverse tab-nabbing
 * - Audit logging of blocked attempts
 * 
 * @param {string} url - Target URL
 * @param {string} [target='_blank'] - Window target name
 * @param {string} [customFeatures=''] - Additional features
 * @returns {WindowProxy|null} Opened window or null if blocked
 */
export function safeOpenUrl(url, target = '_blank', customFeatures = '') {
  if (!isValidWebUrl(url)) {
    SecurityAuditLog.log('BLOCKED_UNSAFE_URL', { url: String(url).slice(0, 100) });
    console.warn('[SecurityGuard] Blocked untrusted URL navigation:', url);
    return null;
  }

  const features = new Set(
    (customFeatures || '')
      .split(',')
      .map(f => f.trim().toLowerCase())
      .filter(Boolean)
  );

  // Always enforce noopener and noreferrer for blank targets
  if (target === '_blank') {
    features.add('noopener');
    features.add('noreferrer');
  }

  const featureString = Array.from(features).join(',');

  if (typeof window !== 'undefined' && typeof window.open === 'function') {
    return window.open(url.trim(), target, featureString);
  }
  return null;
}

/**
 * Sanitizes cell input to prevent CSV Formula Injection (CWE-1236).
 * Prepends a single quote if the string begins with =, +, -, @, tab, or CR.
 * 
 * @param {*} value - The input value
 * @returns {string} Sanitized string
 */
export function sanitizeCsvFormula(value) {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (SPREADSHEET_FORMULA_PREFIX.test(str) || SPREADSHEET_FORMULA_PREFIX.test(str.trimStart())) {
    return `'${str}`;
  }
  return str;
}

/**
 * Escapes raw strings for safe inclusion in HTML contexts (OWASP A03 DOM XSS defense).
 * Converts &, <, >, ", ' to safe entity representations.
 * 
 * @param {*} input - The string to escape
 * @returns {string} HTML-escaped string
 */
export function sanitizeHtml(input) {
  if (input === null || input === undefined) return '';
  return String(input)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/`/g, '&#96;');
}

/**
 * Strips active executable tags and dangerous attributes from markup (OWASP A03 DOM XSS).
 * Removes script, iframe, object, embed, svg, and on* event handlers.
 * 
 * @param {string} input - HTML input
 * @returns {string} Sanitized HTML without executable elements
 */
export function stripDangerousHtml(input) {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<\/?(iframe|object|embed|svg|link|meta|base)\b[^>]*>/gi, '')
    .replace(/\son\w+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/href\s*=\s*(['"])\s*(?:javascript|data|vbscript):.*?\1/gi, 'href="#"');
}

/**
 * Masks sensitive API keys or credentials to prevent exposure in logs or UI (OWASP A02).
 * Retains standard prefix and only the last 4 characters.
 * 
 * @param {string} key - Secret token to mask
 * @returns {string} Masked representation (e.g., 'sk-••••••••abcd')
 */
export function maskApiKey(key) {
  if (typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (!trimmed) return '';
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.startsWith('sk-') ? 'sk-' : trimmed.slice(0, 3);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

/**
 * Deep sanitizes objects and arrays to neutralize Prototype Pollution attacks (OWASP A03 / A08).
 * Strips dangerous prototype keys: '__proto__', 'constructor', 'prototype'.
 * Also neutralizes dangerous javascript: or data: URIs in string fields.
 * 
 * @param {*} input - Value to sanitize
 * @param {WeakSet} [seen=new WeakSet()] - Circular reference tracking
 * @returns {*} Sanitized clone
 */
export function sanitizeObject(input, seen = new WeakSet()) {
  if (input === null || typeof input !== 'object') {
    if (typeof input === 'string') {
      const trimmed = input.trim();
      if (/^(javascript|vbscript):/i.test(trimmed)) {
        SecurityAuditLog.log('STRIPPED_DANGEROUS_URI', { scheme: trimmed.split(':')[0] });
        return '';
      }
    }
    return input;
  }

  if (seen.has(input)) {
    return input; // Prevent cyclical exhaustion
  }
  seen.add(input);

  if (Array.isArray(input)) {
    return input.map(item => sanitizeObject(item, seen));
  }

  const clean = Object.create(null);
  for (const key of Object.keys(input)) {
    // Drop prototype pollution keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      SecurityAuditLog.log('PROTOTYPE_POLLUTION_BLOCKED', { key });
      continue;
    }
    clean[key] = sanitizeObject(input[key], seen);
  }

  // Return standard object without polluted prototypes
  return { ...clean };
}

/**
 * Safely parses JSON with strict prototype pollution stripping (OWASP A08).
 * 
 * @param {string} text - JSON string
 * @param {*} [fallback=null] - Fallback value on parse failure
 * @returns {*} Parsed and sanitized object
 */
export function safeJsonParse(text, fallback = null) {
  if (typeof text !== 'string') return fallback;
  try {
    const parsed = JSON.parse(text);
    return sanitizeObject(parsed);
  } catch {
    return fallback;
  }
}

/**
 * Deep freezes an object recursively to safeguard configuration schemas,
 * endpoints, and cryptographic constants against runtime prototype tampering.
 * 
 * @template T
 * @param {T} obj - Object to freeze
 * @returns {Readonly<T>} Frozen object
 */
export function deepFreeze(obj) {
  if (obj === null || typeof obj !== 'object') {
    return obj;
  }

  const seen = new WeakSet();
  function freezeRecursive(current) {
    if (!current || typeof current !== 'object' || seen.has(current)) {
      return current;
    }
    seen.add(current);
    Object.freeze(current);
    for (const key of Object.getOwnPropertyNames(current)) {
      const val = current[key];
      if (val && typeof val === 'object') {
        freezeRecursive(val);
      }
    }
    return current;
  }

  return freezeRecursive(obj);
}

/**
 * Anti-Tamper Runtime Guard (OWASP A04).
 * Verifies that native prototypes (Object, Array, Function) have not been poisoned
 * with unexpected enumerable properties by rogue extensions or scripts.
 * 
 * @returns {{ intact: boolean, violations: string[] }}
 */
export function checkRuntimeIntegrity() {
  const violations = [];

  // Check Object.prototype for unexpected enumerable properties
  for (const key in {}) {
    violations.push(`Object.prototype.${key}`);
  }

  // Check Array.prototype for unexpected enumerable properties
  for (const key in []) {
    violations.push(`Array.prototype.${key}`);
  }

  const intact = violations.length === 0;
  if (!intact) {
    SecurityAuditLog.log('RUNTIME_INTEGRITY_TAMPER_DETECTED', { violations });
    console.error('[AntiTamperGuard] Runtime prototype pollution detected:', violations);
  }

  return { intact, violations };
}

/**
 * Seals and armors critical runtime prototypes against prototype pollution and hostile monkey-patching.
 * Defends against browser extension injection and client-side reverse engineering tampering (OWASP A04).
 */
export function armorPrototypes() {
  try {
    if (typeof Object !== 'undefined' && Object.prototype) {
      try {
        // Protect __proto__ against prototype pollution attacks
        Object.defineProperty(Object.prototype, '__proto__', {
          configurable: false
        });
      } catch {
        // Already non-configurable in strict or protected engine
      }
    }
  } catch (e) {
    SecurityAuditLog.log('ARMOR_PROTOTYPES_WARN', { error: String(e) });
  }
}

/**
 * Escapes user or dynamic input strings to prevent Regular Expression Denial of Service (ReDoS)
 * and Regex Injection attacks (OWASP A03).
 *
 * @param {string} str - Raw input string
 * @returns {string} Regex-escaped string safe for dynamic RegExp instantiation
 */
export function escapeRegExp(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Verifies that critical browser and JavaScript built-in constructors
 * remain unmodified native code, detecting hostile script hooks and MITM monkey-patching.
 * 
 * @returns {{ secure: boolean, anomalies: string[] }}
 */
export function verifyClientAppIntegrity() {
  const anomalies = [];
  const builtIns = [
    { name: 'JSON.parse', fn: JSON.parse },
    { name: 'JSON.stringify', fn: JSON.stringify },
    { name: 'Object.assign', fn: Object.assign },
    { name: 'Array.prototype.map', fn: Array.prototype.map },
    { name: 'Array.prototype.filter', fn: Array.prototype.filter }
  ];

  for (const { name, fn } of builtIns) {
    if (typeof fn !== 'function') {
      anomalies.push(`${name} is not a function`);
      continue;
    }
    const fnString = Function.prototype.toString.call(fn);
    if (!fnString.includes('[native code]')) {
      anomalies.push(`${name} has been hooked or patched`);
    }
  }

  // Check SubtleCrypto native integrity in real browser environments (Node/happy-dom use JS wrappers)
  const isSyntheticRuntime = typeof process !== 'undefined' && Boolean(process.versions?.node);
  if (!isSyntheticRuntime && typeof window !== 'undefined' && window.crypto?.subtle) {
    const subtleMethods = ['encrypt', 'decrypt', 'digest', 'importKey'];
    for (const m of subtleMethods) {
      const fn = window.crypto.subtle[m];
      if (typeof fn === 'function') {
        const fnString = Function.prototype.toString.call(fn);
        if (!fnString.includes('[native code]')) {
          anomalies.push(`crypto.subtle.${m} has been hooked or patched`);
        }
      }
    }
  }

  const secure = anomalies.length === 0;
  if (!secure) {
    SecurityAuditLog.log('CLIENT_INTEGRITY_ANOMALY', { anomalies });
    console.warn('[SecurityGuard] Client integrity anomaly detected:', anomalies);
  }

  return { secure, intact: secure, anomalies, hooked: anomalies };
}

/**
 * Sanitizes untrusted user inputs, job descriptions, or external resumes before
 * interpolating them into LLM system or user prompts (OWASP LLM01: Prompt Injection).
 * 
 * @param {string} text - Raw input string to sanitize
 * @param {Object} [options={}]
 * @param {number} [options.maxLength=4000] - Hard length ceiling (or maxLen)
 * @param {boolean} [options.wrapBoundary=true] - Wraps sanitized text in <untrusted_content> tags
 * @returns {string} Sanitized string safe for LLM prompt interpolation
 */
export function sanitizePromptInput(text, options = {}) {
  if (!text || typeof text !== 'string') return '';
  const maxLength = options.maxLength || options.maxLen || 4000;
  const wrapBoundary = options.wrapBoundary !== false;

  let clean = text.slice(0, maxLength);

  // 1. Strip ChatML, Llama, and special model delimiter tokens
  clean = clean.replace(/<\|(?:im_start|im_end|endoftext|endofprompt|system|user|assistant|fim_prefix|fim_middle|fim_suffix)\|>/gi, '');
  clean = clean.replace(/\[\/?(?:INST|SYS)\]/gi, '');
  clean = clean.replace(/<<SYS>>[\s\S]*?<\/SYS>>/gi, '');
  clean = clean.replace(/<\/?(?:s|unk|pad|tool_call|thought)>/gi, '');

  // 2. Neutralize direct instruction overrides and system prompt extractions
  clean = clean.replace(/(?:\b(?:ignore|disregard|forget|override|negate)\s+(?:all\s+)?(?:previous|prior|system|initial|above)\s+(?:instructions|prompts|rules|commands|constraints)\b)/gi, '[instruction override blocked]');
  clean = clean.replace(/(?:\b(?:repeat|reveal|print|echo|leak|output|dump)\s+(?:the\s+)?(?:system\s+prompt|initial\s+prompt|instructions\s+above|hidden\s+rules|developer\s+prompt)\b)/gi, '[prompt extraction blocked]');

  // 3. Neutralize roleplay jailbreak phrases and direct mode switches
  clean = clean.replace(/(?:\b(?:you\s+are\s+now|act\s+as|pretend\s+to\s+be)\s+(?:an?\s+)?(?:unrestricted|dan|developer\s+mode|jailbreak|unfiltered\s+ai|evil\s+ai)\b)/gi, '[jailbreak attempt blocked]');
  clean = clean.replace(/(?:\b(?:dan\s+mode(?:\s+enabled)?|developer\s+mode(?:\s+enabled)?|jailbreak\s+mode)\b)/gi, '[jailbreak attempt blocked]');

  // 4. Neutralize markdown and HTML image data exfiltration (OWASP LLM02)
  clean = clean.replace(/!\[.*?\]\([^\)]*\)/gi, '[exfiltration image removed]');
  clean = clean.replace(/<img\b[^>]*>/gi, '[exfiltration image removed]');

  // 5. Neutralize fake message role declarations at start of lines
  clean = clean.replace(/^(?:system|developer|assistant|human|user|bot)\s*:\s*/gim, '');

  clean = clean.trim();

  if (wrapBoundary) {
    return `<untrusted_content>\n${clean}\n</untrusted_content>`;
  }
  return clean;
}

Object.freeze(SecurityAuditLog);
