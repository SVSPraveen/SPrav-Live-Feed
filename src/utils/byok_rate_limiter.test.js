import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  ByokRateLimiter, 
  byokRateLimiter, 
  ByokRateLimitError, 
  ByokRunawayLoopError 
} from './byok_rate_limiter.js';
import { hybridLLM } from './hybrid_llm_client.js';

test('ByokRateLimiter: allows normal requests within limits and tracks status', async () => {
  const limiter = new ByokRateLimiter({
    limits: { groq: { rpm: 10, burstMinSpacingMs: 0 } },
    globalRpm: 20
  });

  assert.equal(limiter.getStatus('groq').allowed, true);
  assert.equal(limiter.getStatus('groq').remainingRpm, 10);

  await limiter.acquire('groq');
  await limiter.acquire('groq');

  const status = limiter.getStatus('groq');
  assert.equal(status.activeInWindow, 2);
  assert.equal(status.remainingRpm, 8);
  assert.equal(status.isCircuitBroken, false);
});

test('ByokRateLimiter: enforces per-provider RPM limits gracefully', async () => {
  const limiter = new ByokRateLimiter({
    limits: { gemini: { rpm: 3, burstMinSpacingMs: 0 } },
    burstThresholdCount: 10, // high so runaway circuit breaker doesn't trip first
    globalRpm: 20
  });

  await limiter.acquire('gemini');
  await limiter.acquire('gemini');
  await limiter.acquire('gemini');

  let threw = false;
  try {
    await limiter.acquire('gemini');
  } catch (err) {
    threw = true;
    assert.equal(err instanceof ByokRateLimitError, true);
    assert.equal(err.name, 'ByokRateLimitError');
    assert.equal(err.provider, 'gemini');
    assert.equal(err.reason, 'rpm_limit_exceeded');
    assert.ok(err.retryAfterMs > 0);
  }
  assert.equal(threw, true, 'Should throw ByokRateLimitError when provider RPM is exceeded');
});

test('ByokRateLimiter: enforces global RPM limit across multiple providers', async () => {
  const limiter = new ByokRateLimiter({
    limits: {
      groq: { rpm: 10, burstMinSpacingMs: 0 },
      gemini: { rpm: 10, burstMinSpacingMs: 0 }
    },
    burstThresholdCount: 20,
    globalRpm: 3
  });

  await limiter.acquire('groq');
  await limiter.acquire('gemini');
  await limiter.acquire('groq');

  let threw = false;
  try {
    await limiter.acquire('gemini');
  } catch (err) {
    threw = true;
    assert.equal(err instanceof ByokRateLimitError, true);
    assert.equal(err.reason, 'global_rpm_limit_exceeded');
  }
  assert.equal(threw, true, 'Should throw ByokRateLimitError when global RPM is exceeded');
});

test('ByokRateLimiter: trips circuit breaker on runaway loop burst and enters cooldown', async () => {
  let eventDispatched = null;
  const originalWindow = globalThis.window;
  globalThis.window = {
    dispatchEvent: (e) => {
      eventDispatched = e;
      return true;
    }
  };

  try {
    const limiter = new ByokRateLimiter({
      limits: { groq: { rpm: 50, burstMinSpacingMs: 0 } },
      burstThresholdCount: 4, // rapid calls >= 4 in burst window trips circuit breaker
      burstWindowMs: 5000,
      circuitCooldownMs: 30000
    });

    // Fire 4 rapid calls
    await limiter.acquire('groq');
    await limiter.acquire('groq');
    await limiter.acquire('groq');
    await limiter.acquire('groq');

    // 5th call trips circuit breaker immediately
    let threw = false;
    try {
      await limiter.acquire('groq');
    } catch (err) {
      threw = true;
      assert.equal(err instanceof ByokRunawayLoopError, true);
      assert.equal(err.name, 'ByokRunawayLoopError');
      assert.equal(err.isCircuitBreaker, true);
      assert.ok(err.cooldownRemainingMs > 0);
    }
    assert.equal(threw, true, '5th call should trip circuit breaker');

    const status = limiter.getStatus('groq');
    assert.equal(status.isCircuitBroken, true);
    assert.equal(status.allowed, false);
    assert.ok(status.cooldownRemainingMs > 0);

    // Event should be dispatched to window
    assert.ok(eventDispatched, 'sprav_byok_rate_limited event should be dispatched');
    assert.equal(eventDispatched.type, 'sprav_byok_rate_limited');
    assert.equal(eventDispatched.detail.isCircuitBreaker, true);
    assert.equal(eventDispatched.detail.provider, 'groq');

    // Resetting should clear the circuit breaker
    limiter.reset('groq');
    const resetStatus = limiter.getStatus('groq');
    assert.equal(resetStatus.isCircuitBroken, false);
    assert.equal(resetStatus.allowed, true);
  } finally {
    globalThis.window = originalWindow;
  }
});

test('ByokRateLimiter: bypass mode allows requests regardless of limits', async () => {
  const limiter = new ByokRateLimiter({
    limits: { groq: { rpm: 1, burstMinSpacingMs: 0 } },
    globalRpm: 1
  });

  limiter.setBypass(true);
  assert.equal(limiter.isBypassed(), true);

  await limiter.acquire('groq');
  await limiter.acquire('groq');
  await limiter.acquire('groq');
  // No error thrown because bypass is active

  limiter.setBypass(false);
  assert.equal(limiter.isBypassed(), false);
});

test('hybridLLM: getRateLimitStatus and resetRateLimits are exposed and functional', () => {
  hybridLLM.resetRateLimits();
  const status = hybridLLM.getRateLimitStatus('groq');
  assert.ok(status);
  assert.equal(status.provider, 'groq');
  assert.equal(typeof status.allowed, 'boolean');
  assert.equal(typeof status.remainingRpm, 'number');
  assert.equal(status.isCircuitBroken, false);
});
