import test from 'node:test';
import assert from 'node:assert/strict';
import { apiClient, apiRequest } from './api_client.js';

test('apiClient: handles successful GET request with JSON response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'GET');
    return {
      ok: true,
      status: 200,
      statusText: 'OK',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ status: 'healthy', version: '1.0.0' })
    };
  };

  try {
    const res = await apiClient.get('/api/system/readiness', { timeout: 2000 });
    assert.equal(res.status, 200);
    assert.equal(res.ok, true);
    assert.deepEqual(res.data, { status: 'healthy', version: '1.0.0' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient: serializes URL search params accurately', async () => {
  const originalFetch = globalThis.fetch;
  let targetUrl = '';
  globalThis.fetch = async (url) => {
    targetUrl = String(url);
    return {
      ok: true,
      status: 200,
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ count: 5 })
    };
  };

  try {
    await apiClient.get('/api/jobs', { params: { limit: 10, role: 'eng' } });
    assert.ok(targetUrl.includes('limit=10'));
    assert.ok(targetUrl.includes('role=eng'));
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient: handles POST request with JSON payload', async () => {
  const originalFetch = globalThis.fetch;
  let sentBody = '';
  let sentHeaders = {};
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'POST');
    sentBody = opts.body;
    sentHeaders = opts.headers;
    return {
      ok: true,
      status: 201,
      statusText: 'Created',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ success: true })
    };
  };

  try {
    const res = await apiClient.post('/api/action/sweep', { query: 'react' });
    assert.equal(res.status, 201);
    assert.equal(sentBody, JSON.stringify({ query: 'react' }));
    assert.equal(sentHeaders['Content-Type'], 'application/json');
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient: rejects on 4xx/5xx error and attaches err.response', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return {
      ok: false,
      status: 404,
      statusText: 'Not Found',
      headers: new Headers({ 'content-type': 'application/json' }),
      json: async () => ({ detail: 'Job not found' })
    };
  };

  try {
    await apiClient.get('/api/jobs/999');
    assert.fail('Expected apiClient to throw on 404');
  } catch (err) {
    assert.equal(err.status, 404);
    assert.ok(err.response);
    assert.equal(err.response.status, 404);
    assert.deepEqual(err.response.data, { detail: 'Job not found' });
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient: supports direct function invocation style', async () => {
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (url, opts) => {
    assert.equal(opts.method, 'DELETE');
    return {
      ok: true,
      status: 204,
      headers: new Headers(),
      text: async () => ''
    };
  };

  try {
    const res = await apiClient('/api/jobs/123', { method: 'DELETE' });
    assert.equal(res.status, 204);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('apiClient: blocks SSRF cloud metadata access attempts (OWASP A10)', async () => {
  await assert.rejects(
    async () => {
      await apiClient.get('http://169.254.169.254/latest/meta-data/');
    },
    { message: /cloud metadata or internal endpoint blocked/ }
  );

  await assert.rejects(
    async () => {
      await apiClient.get('http://metadata.google.internal/computeMetadata/v1/');
    },
    { message: /cloud metadata or internal endpoint blocked/ }
  );
});

test('apiClient: blocks unsafe protocol schemes (OWASP A03)', async () => {
  await assert.rejects(
    async () => {
      await apiClient.get('javascript:alert(1)');
    },
    { message: /unsafe scheme/ }
  );

  await assert.rejects(
    async () => {
      await apiClient.get('file:///etc/passwd');
    },
    { message: /unsafe scheme/ }
  );
});

