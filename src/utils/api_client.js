/**
 * api_client.js
 * =============
 * Ultra-lightweight (~0.5KB), zero-dependency native fetch HTTP client.
 * Provides a drop-in replacement for axios across browser and Node runtimes.
 *
 * Eliminates 50KB bundle weight while providing:
 * - Deterministic request timeouts via AbortController
 * - Automatic JSON serialization and parsing
 * - FormData support with correct content-type boundaries
 * - Consistent { status, data, headers, ok } response structure
 * - Rejection with err.response for 4xx/5xx responses
 */

import { isCloudMetadataUrl, isValidWebUrl, SecurityAuditLog } from './security_guard.js';

function buildUrlWithParams(url, params) {
  if (!params || typeof params !== 'object') return url;
  const searchParams = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null) {
      searchParams.append(key, String(value));
    }
  }
  const queryStr = searchParams.toString();
  if (!queryStr) return url;
  const separator = url.includes('?') ? '&' : '?';
  return `${url}${separator}${queryStr}`;
}

export async function apiRequest(urlOrConfig, optionalConfig = {}) {
  let url;
  let config;

  if (typeof urlOrConfig === 'string') {
    url = urlOrConfig;
    config = optionalConfig || {};
  } else if (urlOrConfig && typeof urlOrConfig === 'object') {
    url = urlOrConfig.url;
    config = urlOrConfig;
  } else {
    throw new Error('[apiClient] Invalid URL or request configuration');
  }

  const {
    method = 'GET',
    data,
    body,
    headers = {},
    params,
    timeout = 10000,
    signal: userSignal,
    ...fetchOpts
  } = config;

  const resolvedUrl = buildUrlWithParams(url, params);

  // OWASP A10 / SSRF & Dangerous Scheme Guardrail
  if (isCloudMetadataUrl(resolvedUrl)) {
    SecurityAuditLog.log('BLOCKED_SSRF_METADATA_ATTEMPT', { url: resolvedUrl.slice(0, 80) });
    throw new Error(`[apiClient] Security Violation: Request to cloud metadata or internal endpoint blocked: ${resolvedUrl}`);
  }

  if (!isValidWebUrl(resolvedUrl)) {
    SecurityAuditLog.log('BLOCKED_UNSAFE_PROTOCOL_REQUEST', { url: String(resolvedUrl).slice(0, 80) });
    throw new Error(`[apiClient] Security Violation: Blocked request with unsafe scheme: ${resolvedUrl}`);
  }
  const controller = new AbortController();
  let timerId = null;

  if (timeout > 0) {
    timerId = setTimeout(() => {
      controller.abort(new Error(`Request timeout after ${timeout}ms`));
    }, timeout);
  }

  // Handle external abort signal chaining
  if (userSignal) {
    if (userSignal.aborted) {
      controller.abort(userSignal.reason);
    } else {
      userSignal.addEventListener('abort', () => controller.abort(userSignal.reason), { once: true });
    }
  }

  const requestHeaders = { ...headers };
  const payload = data !== undefined ? data : body;
  const isFormData = typeof FormData !== 'undefined' && payload instanceof FormData;

  let requestBody = undefined;
  if (payload !== undefined && payload !== null) {
    if (isFormData || typeof payload === 'string') {
      requestBody = payload;
    } else {
      requestBody = JSON.stringify(payload);
      if (!requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
        requestHeaders['Content-Type'] = 'application/json';
      }
    }
  }

  try {
    const response = await fetch(resolvedUrl, {
      method: method.toUpperCase(),
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
      ...fetchOpts
    });

    const contentType = response.headers.get('content-type') || '';
    let responseData = null;

    if (contentType.includes('application/json')) {
      try {
        responseData = await response.json();
      } catch {
        responseData = null;
      }
    } else {
      try {
        responseData = await response.text();
      } catch {
        responseData = null;
      }
    }

    const result = {
      status: response.status,
      statusText: response.statusText,
      data: responseData,
      headers: response.headers,
      ok: response.ok,
      config
    };

    if (!response.ok) {
      const error = new Error(`Request failed with status code ${response.status}`);
      error.response = result;
      error.status = response.status;
      error.config = config;
      throw error;
    }

    return result;
  } finally {
    if (timerId) {
      clearTimeout(timerId);
    }
  }
}

export const apiClient = function (urlOrConfig, config) {
  return apiRequest(urlOrConfig, config);
};

apiClient.get = (url, config = {}) => apiRequest(url, { ...config, method: 'GET' });
apiClient.post = (url, data, config = {}) => apiRequest(url, { ...config, data, method: 'POST' });
apiClient.put = (url, data, config = {}) => apiRequest(url, { ...config, data, method: 'PUT' });
apiClient.delete = (url, config = {}) => apiRequest(url, { ...config, method: 'DELETE' });
apiClient.patch = (url, data, config = {}) => apiRequest(url, { ...config, data, method: 'PATCH' });
apiClient.request = (config = {}) => apiRequest(config);

export default apiClient;
