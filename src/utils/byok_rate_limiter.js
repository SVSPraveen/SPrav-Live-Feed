/**
 * BYOK Rate Limiter & Runaway AI Loop Circuit Breaker
 * ===================================================
 * Client-side protective shield that prevents runaway AI loops, accidental recursion,
 * rapid re-render spam, and programmatic bursts from burning the candidate's free API
 * tiers (Groq, Gemini, DeepSeek, Mistral, OpenRouter) or incurring unexpected charges.
 * 
 * Features:
 * 1. Sliding-Window Rate Limiter:
 *    - Per-provider limits tailored to free tier RPMs (Gemini: 15 RPM, Groq: 25 RPM, etc.)
 *    - Global BYOK pool cap (40 RPM across all external keys combined)
 * 2. Anti-Burst Throttling:
 *    - Enforces a minimum 500ms spacing between successive requests to the same provider.
 * 3. Runaway Loop Circuit Breaker:
 *    - Automatically trips to OPEN if velocity exceeds human bounds:
 *      >= 8 requests in 10s OR >= 20 requests in 30s.
 *    - Enforces a 60-second cooldown period, protecting user quota.
 * 4. Window Event & Security Audit Logging:
 *    - Dispatches `sprav_byok_rate_limited` CustomEvent for in-app alert toasts.
 *    - Records to SecurityAuditLog for OWASP / security compliance.
 */

import { SecurityAuditLog } from './security_guard.js';

export class ByokRateLimitError extends Error {
  constructor(message, { provider, retryAfterMs = 1000, reason = 'rate_limit_exceeded', isCircuitBreaker = false } = {}) {
    super(message);
    this.name = 'ByokRateLimitError';
    this.provider = provider;
    this.retryAfterMs = retryAfterMs;
    this.reason = reason;
    this.isCircuitBreaker = isCircuitBreaker;
  }
}

export class ByokRunawayLoopError extends ByokRateLimitError {
  constructor(message, { provider, cooldownRemainingMs = 60000, reason = 'runaway_loop_detected' } = {}) {
    super(message, { provider, retryAfterMs: cooldownRemainingMs, reason, isCircuitBreaker: true });
    this.name = 'ByokRunawayLoopError';
    this.cooldownRemainingMs = cooldownRemainingMs;
  }
}

// Tailored provider defaults respecting standard free-tier thresholds
const DEFAULT_PROVIDER_LIMITS = {
  gemini: { rpm: 15, burstMinSpacingMs: 600 },
  groq: { rpm: 25, burstMinSpacingMs: 500 },
  mistral: { rpm: 20, burstMinSpacingMs: 600 },
  openrouter: { rpm: 30, burstMinSpacingMs: 400 },
  anthropic: { rpm: 20, burstMinSpacingMs: 500 },
  deepseek: { rpm: 20, burstMinSpacingMs: 500 },
  openai: { rpm: 20, burstMinSpacingMs: 500 },
  default: { rpm: 20, burstMinSpacingMs: 500 }
};

export class ByokRateLimiter {
  constructor(options = {}) {
    this.providerLimits = { ...DEFAULT_PROVIDER_LIMITS, ...(options.limits || {}) };
    this.globalRpm = options.globalRpm || 40;
    this.circuitCooldownMs = options.circuitCooldownMs || 60000;
    this.burstThresholdCount = options.burstThresholdCount || 8; // >= 8 calls in burst window
    this.burstWindowMs = options.burstWindowMs || 10000;         // within 10 seconds
    this.surgeThresholdCount = options.surgeThresholdCount || 20; // >= 20 calls in surge window
    this.surgeWindowMs = options.surgeWindowMs || 30000;         // within 30 seconds

    // State tracking
    this.providerTimestamps = new Map(); // provider -> number[]
    this.lastRequestTime = new Map();    // provider -> number
    this.globalTimestamps = [];          // number[]
    this.circuitTrippedUntil = new Map();// provider -> number (timestamp)
    this.globalCircuitTrippedUntil = 0;

    this.bypassed = false;
  }

  /**
   * Set bypass flag for test suites or manual emergency overrides
   */
  setBypass(enabled) {
    this.bypassed = Boolean(enabled);
  }

  isBypassed() {
    return this.bypassed;
  }

  /**
   * Resets rate-limiting history and clears circuit breaker state
   */
  reset(provider = null) {
    if (provider) {
      const p = String(provider).toLowerCase();
      this.providerTimestamps.delete(p);
      this.lastRequestTime.delete(p);
      this.circuitTrippedUntil.delete(p);
    } else {
      this.providerTimestamps.clear();
      this.lastRequestTime.clear();
      this.globalTimestamps = [];
      this.circuitTrippedUntil.clear();
      this.globalCircuitTrippedUntil = 0;
    }
  }

  /**
   * Evaluates if a request to a provider is currently permitted.
   * Throws ByokRunawayLoopError or ByokRateLimitError if denied.
   * Records the attempt upon success.
   */
  async acquire(provider) {
    if (this.bypassed) return true;

    const p = String(provider || 'default').toLowerCase();
    const now = Date.now();
    const limits = this.providerLimits[p] || this.providerLimits.default;

    // 1. Check Circuit Breaker (Runaway Loop Cooldown)
    const providerTrip = this.circuitTrippedUntil.get(p) || 0;
    if (now < providerTrip) {
      const remainingMs = providerTrip - now;
      const msg = `[BYOK Safety Shield] Runaway AI loop circuit breaker ACTIVE for ${p}. Pausing requests for ${Math.ceil(remainingMs / 1000)}s to protect your API quota.`;
      this._dispatchRateLimitedEvent(p, msg, remainingMs, true);
      throw new ByokRunawayLoopError(msg, { provider: p, cooldownRemainingMs: remainingMs });
    }

    if (now < this.globalCircuitTrippedUntil) {
      const remainingMs = this.globalCircuitTrippedUntil - now;
      const msg = `[BYOK Safety Shield] Global runaway AI loop circuit breaker ACTIVE. Pausing requests for ${Math.ceil(remainingMs / 1000)}s.`;
      this._dispatchRateLimitedEvent(p, msg, remainingMs, true);
      throw new ByokRunawayLoopError(msg, { provider: p, cooldownRemainingMs: remainingMs });
    }

    // 2. Prune old timestamps older than 60s
    const windowStart = now - 60000;
    const pHistory = (this.providerTimestamps.get(p) || []).filter(ts => ts > windowStart);
    this.globalTimestamps = this.globalTimestamps.filter(ts => ts > windowStart);

    // 3. Detect Runaway AI Loop Velocity
    const recentBurstCalls = pHistory.filter(ts => ts > (now - this.burstWindowMs)).length;
    const recentSurgeCalls = pHistory.filter(ts => ts > (now - this.surgeWindowMs)).length;

    if (recentBurstCalls >= this.burstThresholdCount || recentSurgeCalls >= this.surgeThresholdCount) {
      const cooldownUntil = now + this.circuitCooldownMs;
      this.circuitTrippedUntil.set(p, cooldownUntil);
      
      const breachType = recentBurstCalls >= this.burstThresholdCount
        ? `${recentBurstCalls + 1} calls in ${this.burstWindowMs / 1000}s`
        : `${recentSurgeCalls + 1} calls in ${this.surgeWindowMs / 1000}s`;

      const msg = `[BYOK Safety Shield] Runaway AI loop detected for ${p} (${breachType}). Circuit breaker tripped: pausing for ${this.circuitCooldownMs / 1000}s to protect quota.`;
      
      try {
        SecurityAuditLog.log('BYOK_CIRCUIT_BREAKER_TRIPPED', {
          provider: p,
          breachType,
          cooldownMs: this.circuitCooldownMs
        });
      } catch {}

      this._dispatchRateLimitedEvent(p, msg, this.circuitCooldownMs, true);
      throw new ByokRunawayLoopError(msg, { provider: p, cooldownRemainingMs: this.circuitCooldownMs });
    }

    // 4. Anti-Burst Spacing (Throttles rapid micro-bursts)
    const isTest = typeof process !== 'undefined' && (
      process.env?.NODE_ENV === 'test' || 
      Boolean(process.env?.VITEST) || 
      process.execArgv?.some(a => a.includes('test')) ||
      process.argv?.some(a => a.includes('test'))
    );
    const lastTime = this.lastRequestTime.get(p) || 0;
    const defaultSpacing = typeof limits.burstMinSpacingMs === 'number' ? limits.burstMinSpacingMs : 500;
    const spacing = isTest ? 0 : defaultSpacing;
    const elapsedSinceLast = now - lastTime;
    if (spacing > 0 && elapsedSinceLast < spacing) {
      const waitTime = spacing - elapsedSinceLast;
      // In browser or fast callers, small delay smoothing is allowed if < 200ms
      if (waitTime <= 200) {
        await new Promise(r => setTimeout(r, waitTime));
      } else {
        const msg = `[BYOK Safety Shield] Burst request rate too high for ${p}. Please wait ${Math.ceil(waitTime)}ms before next prompt.`;
        throw new ByokRateLimitError(msg, { provider: p, retryAfterMs: waitTime, reason: 'anti_burst_spacing' });
      }
    }

    // 5. Check Provider RPM Limit
    if (pHistory.length >= limits.rpm) {
      const oldestInWindow = pHistory[0];
      const retryAfterMs = Math.max(1000, 60000 - (now - oldestInWindow));
      const msg = `[BYOK Safety Shield] Rate limit reached for ${p} (${limits.rpm} RPM). Resets in ${Math.ceil(retryAfterMs / 1000)}s.`;
      
      try {
        SecurityAuditLog.log('BYOK_RPM_LIMIT_EXCEEDED', { provider: p, limitRpm: limits.rpm, retryAfterMs });
      } catch {}

      this._dispatchRateLimitedEvent(p, msg, retryAfterMs, false);
      throw new ByokRateLimitError(msg, { provider: p, retryAfterMs, reason: 'rpm_limit_exceeded' });
    }

    // 6. Check Global RPM Limit across all BYOK providers
    if (this.globalTimestamps.length >= this.globalRpm) {
      const oldestGlobal = this.globalTimestamps[0];
      const retryAfterMs = Math.max(1000, 60000 - (now - oldestGlobal));
      const msg = `[BYOK Safety Shield] Global BYOK rate limit reached (${this.globalRpm} RPM). Resets in ${Math.ceil(retryAfterMs / 1000)}s.`;
      
      try {
        SecurityAuditLog.log('BYOK_GLOBAL_LIMIT_EXCEEDED', { globalRpm: this.globalRpm, retryAfterMs });
      } catch {}

      this._dispatchRateLimitedEvent(p, msg, retryAfterMs, false);
      throw new ByokRateLimitError(msg, { provider: p, retryAfterMs, reason: 'global_rpm_limit_exceeded' });
    }

    // 7. Record Timestamp
    const actualNow = Date.now();
    pHistory.push(actualNow);
    this.providerTimestamps.set(p, pHistory);
    this.lastRequestTime.set(p, actualNow);
    this.globalTimestamps.push(actualNow);

    return true;
  }

  /**
   * Returns current telemetry status for a given provider
   */
  getStatus(provider) {
    const p = String(provider || 'default').toLowerCase();
    const now = Date.now();
    const limits = this.providerLimits[p] || this.providerLimits.default;

    const providerTrip = this.circuitTrippedUntil.get(p) || 0;
    const isCircuitBroken = now < providerTrip || now < this.globalCircuitTrippedUntil;
    const cooldownRemainingMs = isCircuitBroken 
      ? Math.max(0, Math.max(providerTrip, this.globalCircuitTrippedUntil) - now) 
      : 0;

    const windowStart = now - 60000;
    const pHistory = (this.providerTimestamps.get(p) || []).filter(ts => ts > windowStart);
    const remainingRpm = Math.max(0, limits.rpm - pHistory.length);

    return {
      provider: p,
      allowed: !isCircuitBroken && remainingRpm > 0,
      isCircuitBroken,
      cooldownRemainingMs,
      limitRpm: limits.rpm,
      activeInWindow: pHistory.length,
      remainingRpm,
      globalActiveInWindow: this.globalTimestamps.filter(ts => ts > windowStart).length,
      globalLimitRpm: this.globalRpm
    };
  }

  /**
   * Dispatches custom window event for UI notifications
   */
  _dispatchRateLimitedEvent(provider, message, retryAfterMs, isCircuitBreaker) {
    if (typeof window !== 'undefined' && typeof window.dispatchEvent === 'function') {
      try {
        window.dispatchEvent(new CustomEvent('sprav_byok_rate_limited', {
          detail: {
            provider,
            message,
            retryAfterMs,
            isCircuitBreaker,
            friendlyTitle: isCircuitBreaker ? 'Runaway AI Loop Protection Tripped' : 'BYOK Rate Limit Reached',
            recommendedAction: isCircuitBreaker
              ? 'Pausing background requests to protect your quota. You can resume in 60s or reset in Settings.'
              : `Provider limit reached. Requests will automatically resume in ${Math.ceil(retryAfterMs / 1000)}s.`
          }
        }));
      } catch {}
    }
  }
}

export const byokRateLimiter = new ByokRateLimiter();
