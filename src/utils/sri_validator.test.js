import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  computeSriHash,
  verifySubresourceIntegrity,
  fetchWithSri,
  loadCdnScriptWithSri,
  auditDomCdnSubresources,
  SubresourceIntegrityError,
  KNOWN_CDN_SRI_REGISTRY
} from './sri_validator.js';
import { SecurityAuditLog } from './security_guard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../..');

test('computeSriHash computes valid sha384 integrity format', async () => {
  const sampleScript = 'console.log("Hello SPrav Sovereign Client");';
  const sri = await computeSriHash(sampleScript, 'SHA-384');
  
  assert.ok(sri.startsWith('sha384-'), `SRI should start with sha384-: ${sri}`);
  assert.ok(sri.length > 20, 'SRI hash should be non-trivial');
});

test('computeSriHash supports SHA-256 and SHA-512', async () => {
  const sample = 'Sovereign career vault';
  const sha256 = await computeSriHash(sample, 'SHA-256');
  const sha512 = await computeSriHash(sample, 'SHA-512');
  
  assert.ok(sha256.startsWith('sha256-'));
  assert.ok(sha512.startsWith('sha512-'));
});

test('verifySubresourceIntegrity verifies matching data and rejects tampered data', async () => {
  const originalCode = 'export const VAULT_VERSION = 3;';
  const validSri = await computeSriHash(originalCode, 'SHA-384');
  
  const isMatch = await verifySubresourceIntegrity(originalCode, validSri);
  assert.equal(isMatch, true, 'Original code must match its SRI hash');

  const tamperedCode = 'export const VAULT_VERSION = 4; // injected modification';
  const isTamperedMatch = await verifySubresourceIntegrity(tamperedCode, validSri);
  assert.equal(isTamperedMatch, false, 'Tampered code must be rejected by SRI');
});

test('verifySubresourceIntegrity handles invalid inputs safely', async () => {
  assert.equal(await verifySubresourceIntegrity('code', ''), false);
  assert.equal(await verifySubresourceIntegrity('code', 'invalid-format'), false);
  assert.equal(await verifySubresourceIntegrity('code', 'unsupported-hash'), false);
  assert.equal(await verifySubresourceIntegrity('code', null), false);
});

test('fetchWithSri verifies authentic payload and logs SRI_VERIFIED event', async () => {
  SecurityAuditLog.clear();
  const sampleData = 'window.__CDN_TEST__ = "authentic_asset";';
  const validHash = await computeSriHash(sampleData, 'SHA-384');
  const testUrl = 'https://trusted-cdn.sprav.test/script.js';

  // Mock global fetch for this test
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode(sampleData).buffer
  });

  try {
    const resultBuffer = await fetchWithSri(testUrl, validHash);
    const decoded = new TextDecoder().decode(resultBuffer);
    assert.equal(decoded, sampleData);

    const events = SecurityAuditLog.getEvents();
    const verifiedEvent = events.find(e => e.type === 'SRI_VERIFIED');
    assert.ok(verifiedEvent, 'Should record SRI_VERIFIED in security audit log');
    assert.equal(verifiedEvent.details.url, testUrl);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('fetchWithSri rejects tampered CDN payload with SubresourceIntegrityError and logs SRI_VIOLATION', async () => {
  SecurityAuditLog.clear();
  const legitimateData = 'function secureOperation() { return true; }';
  const tamperedData = 'function secureOperation() { evilInjection(); return false; }';
  const expectedHash = await computeSriHash(legitimateData, 'SHA-384');
  const testUrl = 'https://compromised-cdn.test/lib.js';

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => ({
    ok: true,
    status: 200,
    arrayBuffer: async () => new TextEncoder().encode(tamperedData).buffer
  });

  try {
    await assert.rejects(
      async () => {
        await fetchWithSri(testUrl, expectedHash);
      },
      (err) => {
        assert.ok(err instanceof SubresourceIntegrityError);
        assert.equal(err.url, testUrl);
        assert.equal(err.expectedSri, expectedHash);
        return true;
      }
    );

    const events = SecurityAuditLog.getEvents();
    const violationEvent = events.find(e => e.type === 'SRI_VIOLATION');
    assert.ok(violationEvent, 'Should record SRI_VIOLATION in security audit log');
    assert.equal(violationEvent.details.status, 'BLOCKED');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('loadCdnScriptWithSri blocks non-HTTPS origins and logs security violation', () => {
  SecurityAuditLog.clear();
  assert.throws(() => {
    loadCdnScriptWithSri({ src: 'http://insecure-cdn.test/malicious.js' });
  }, /CDN scripts must be loaded over HTTPS/);

  const events = SecurityAuditLog.getEvents();
  assert.ok(events.some(e => e.type === 'INSECURE_CDN_SCHEME_BLOCKED'));
});

test('loadCdnScriptWithSri sets crossOrigin anonymous and data attributes', () => {
  const mockScript = {
    attributes: {},
    setAttribute(k, v) { this.attributes[k] = v; },
    getAttribute(k) { return this.attributes[k]; }
  };

  const mockDocument = {
    createElement(tag) {
      if (tag === 'script') return mockScript;
      return {};
    }
  };

  const mockContainer = {
    appendChild(el) {
      this.child = el;
      return el;
    }
  };

  const script = loadCdnScriptWithSri({
    src: 'https://giscus.app/client.js',
    container: mockContainer,
    documentRef: mockDocument,
    attributes: {
      'data-repo': 'SVSPraveen/SPrav-Live-Feed',
      'data-category': 'General'
    }
  });

  assert.equal(script.src, 'https://giscus.app/client.js');
  assert.equal(script.crossOrigin, 'anonymous');
  assert.equal(script.getAttribute('data-repo'), 'SVSPraveen/SPrav-Live-Feed');
  assert.equal(script.getAttribute('data-category'), 'General');
});

test('KNOWN_CDN_SRI_REGISTRY contains pinned registry entries', () => {
  assert.ok(KNOWN_CDN_SRI_REGISTRY instanceof Map);
  assert.ok(KNOWN_CDN_SRI_REGISTRY.has('https://giscus.app/client.js'));
});

test('CSP Configuration Verification across netlify.toml, vercel.json, public/_headers, and index.html', () => {
  // 1. netlify.toml
  const netlifyPath = path.resolve(ROOT_DIR, 'netlify.toml');
  const netlifyContent = fs.readFileSync(netlifyPath, 'utf8');
  assert.ok(netlifyContent.includes('Content-Security-Policy'), 'netlify.toml must declare Content-Security-Policy');
  assert.ok(netlifyContent.includes("script-src 'self'"), "netlify.toml must enforce script-src 'self'");
  assert.ok(!netlifyContent.includes("script-src 'self' 'unsafe-inline'"), "netlify.toml must NOT contain unsafe-inline in script-src");
  assert.ok(netlifyContent.includes("object-src 'none'"), "netlify.toml must enforce object-src 'none'");
  assert.ok(netlifyContent.includes("frame-ancestors 'none'"), "netlify.toml must enforce frame-ancestors 'none'");
  assert.ok(netlifyContent.includes("base-uri 'self'"), "netlify.toml must enforce base-uri 'self'");

  // 2. vercel.json
  const vercelPath = path.resolve(ROOT_DIR, 'vercel.json');
  const vercelContent = fs.readFileSync(vercelPath, 'utf8');
  assert.ok(vercelContent.includes('Content-Security-Policy'), 'vercel.json must declare Content-Security-Policy');
  assert.ok(vercelContent.includes("script-src 'self'"), "vercel.json must enforce script-src 'self'");
  assert.ok(!vercelContent.includes("script-src 'self' 'unsafe-inline'"), "vercel.json must NOT contain unsafe-inline in script-src");
  assert.ok(vercelContent.includes("object-src 'none'"), "vercel.json must enforce object-src 'none'");
  assert.ok(vercelContent.includes("frame-ancestors 'none'"), "vercel.json must enforce frame-ancestors 'none'");
  assert.ok(vercelContent.includes("base-uri 'self'"), "vercel.json must enforce base-uri 'self'");

  // 3. public/_headers
  const headersPath = path.resolve(ROOT_DIR, 'public/_headers');
  const headersContent = fs.readFileSync(headersPath, 'utf8');
  assert.ok(headersContent.includes('Content-Security-Policy:'), 'public/_headers must declare Content-Security-Policy');
  assert.ok(headersContent.includes("script-src 'self'"), "public/_headers must enforce script-src 'self'");
  assert.ok(!headersContent.includes("script-src 'self' 'unsafe-inline'"), "public/_headers must NOT contain unsafe-inline in script-src");

  // 4. index.html
  const indexPath = path.resolve(ROOT_DIR, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert.ok(indexContent.includes('http-equiv="Content-Security-Policy"'), 'index.html must declare Content-Security-Policy meta tag');
  assert.ok(indexContent.includes("script-src 'self'"), "index.html must enforce script-src 'self'");
  assert.ok(!indexContent.includes("script-src 'self' 'unsafe-inline'"), "index.html must NOT contain unsafe-inline in script-src");
  assert.ok(indexContent.includes("object-src 'none'"), "index.html must enforce object-src 'none'");
  assert.ok(indexContent.includes("base-uri 'self'"), "index.html must enforce base-uri 'self'");
});

test('auditDomCdnSubresources audits DOM elements and identifies secured vs unpinned resources', () => {
  SecurityAuditLog.clear();
  
  // Set up mock window and document
  const originalWindow = globalThis.window;
  const originalDoc = globalThis.document;

  const mockScripts = [
    {
      getAttribute(attr) {
        if (attr === 'src') return 'https://cdn.example.com/secured-lib.js';
        if (attr === 'integrity') return 'sha384-verifiedhash123';
        if (attr === 'crossorigin') return 'anonymous';
        return null;
      }
    },
    {
      getAttribute(attr) {
        if (attr === 'src') return 'https://cdn.example.com/unpinned-lib.js';
        return null;
      }
    },
    {
      getAttribute(attr) {
        if (attr === 'src') return '/local-script.js';
        return null;
      }
    }
  ];

  const mockLinks = [
    {
      getAttribute(attr) {
        if (attr === 'href') return 'https://fonts.googleapis.com/css2?family=Inter';
        if (attr === 'crossorigin') return 'anonymous';
        return null;
      }
    }
  ];

  globalThis.window = {
    location: { origin: 'https://app.sprav.ai', hostname: 'app.sprav.ai' }
  };

  globalThis.document = {
    querySelectorAll(selector) {
      if (selector === 'script[src]') return mockScripts;
      if (selector === 'link[rel="stylesheet"][href]') return mockLinks;
      return [];
    }
  };

  try {
    const report = auditDomCdnSubresources();
    assert.equal(report.totalCdn, 3);
    assert.equal(report.securedCount, 1);
    assert.equal(report.unpinnedCount, 2);
    assert.equal(report.isCompliant, false);

    const events = SecurityAuditLog.getEvents();
    assert.ok(events.some(e => e.type === 'SRI_VERIFIED_CDN_RESOURCE'));
    assert.ok(events.some(e => e.type === 'SRI_UNPINNED_CDN_RESOURCE'));
  } finally {
    globalThis.window = originalWindow;
    globalThis.document = originalDoc;
  }
});

