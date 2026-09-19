import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { wasmEngine } from './wasm_engine_bridge.js';

describe('wasm_engine_bridge', () => {
  before(async () => {
    await wasmEngine.init();
  });

  it('initializes and verifies Wasm kernel version', () => {
    const version = wasmEngine.getKernelVersion();
    assert.strictEqual(version, 20260919);
    assert.strictEqual(wasmEngine.isReady(), true);
  });

  it('correctly scores resumes with balanced dimensions', () => {
    const dims = {
      contact: 85,
      sections: 90,
      format: 80,
      keywords: 75,
      actionVerbs: 85,
      quantification: 70,
      dates: 95,
      length: 90,
      redFlags: 100,
      skills: 80,
      education: 85,
    };
    const score = wasmEngine.scoreResume(dims, false);
    assert.ok(score >= 80 && score <= 90, `Expected score in 80-90 range, got ${score}`);
    assert.strictEqual(wasmEngine.scoreToGrade(score), 'B');
  });

  it('handles JD match taking over keywords weight', () => {
    const dims = {
      contact: 100,
      sections: 100,
      format: 100,
      keywords: 10, // Should be ignored when jdMatch is present
      jdMatch: 100,
      actionVerbs: 100,
      quantification: 100,
      dates: 100,
      length: 100,
      redFlags: 100,
      skills: 100,
      education: 100,
    };
    const score = wasmEngine.scoreResume(dims, true);
    assert.strictEqual(score, 100);
    assert.strictEqual(wasmEngine.scoreToGrade(score), 'A');
  });

  it('evaluates grade thresholds accurately across boundaries', () => {
    assert.strictEqual(wasmEngine.scoreToGrade(95), 'A');
    assert.strictEqual(wasmEngine.scoreToGrade(90), 'A');
    assert.strictEqual(wasmEngine.scoreToGrade(89), 'B');
    assert.strictEqual(wasmEngine.scoreToGrade(80), 'B');
    assert.strictEqual(wasmEngine.scoreToGrade(79), 'C');
    assert.strictEqual(wasmEngine.scoreToGrade(70), 'C');
    assert.strictEqual(wasmEngine.scoreToGrade(69), 'D');
    assert.strictEqual(wasmEngine.scoreToGrade(60), 'D');
    assert.strictEqual(wasmEngine.scoreToGrade(59), 'F');
    assert.strictEqual(wasmEngine.scoreToGrade(0), 'F');
  });

  it('computes freshness decay score and multipliers', () => {
    // Ultra fresh: 80 * 1.25 = 100
    const ultraFresh = wasmEngine.calculateFreshnessDecay(80, 'ULTRA_FRESH', 0);
    assert.strictEqual(ultraFresh, 100);

    // Fresh drop: 80 * 1.15 = 92
    const freshDrop = wasmEngine.calculateFreshnessDecay(80, 'FRESH_DROP', 0.5);
    assert.strictEqual(freshDrop, 92);

    // Stale pipeline: 80 * 0.65 = 52
    const stale = wasmEngine.calculateFreshnessDecay(80, 'STALE_PIPELINE', 45);
    assert.strictEqual(stale, 52);

    // Likely ghost: 80 * 0.35 = 28
    const ghost = wasmEngine.calculateFreshnessDecay(80, 'LIKELY_GHOST', 95);
    assert.strictEqual(ghost, 28);
  });

  it('computes callback likelihood accurately with remote penalty & boosts', () => {
    // In-person, fresh drop (1.15): raw = (80 * 0.75) * 1.15 + 10 = 69 + 10 = 79
    const cbFresh = wasmEngine.calculateCallbackLikelihood(80, 1.15, false);
    assert.strictEqual(cbFresh, 79);

    // Remote (+ penalty -8): 79 - 8 = 71
    const cbRemote = wasmEngine.calculateCallbackLikelihood(80, 1.15, true);
    assert.strictEqual(cbRemote, 71);

    // Stale (mult 0.50): raw = (80 * 0.75) * 0.50 - 12 = 30 - 12 = 18
    const cbStale = wasmEngine.calculateCallbackLikelihood(80, 0.50, false);
    assert.strictEqual(cbStale, 18);
  });

  it('computes salary delta and market tiers correctly', () => {
    // 150k vs 120k = +25% -> above_market
    const deltaAbove = wasmEngine.calculateSalaryDelta(150000, 120000);
    assert.strictEqual(deltaAbove, 25);
    assert.strictEqual(wasmEngine.classifySalaryTier(deltaAbove), 'above_market');

    // 120k vs 120k = 0% -> at_market
    const deltaAt = wasmEngine.calculateSalaryDelta(120000, 120000);
    assert.strictEqual(deltaAt, 0);
    assert.strictEqual(wasmEngine.classifySalaryTier(deltaAt), 'at_market');

    // 90k vs 120k = -25% -> below_market
    const deltaBelow = wasmEngine.calculateSalaryDelta(90000, 120000);
    assert.strictEqual(deltaBelow, -25);
    assert.strictEqual(wasmEngine.classifySalaryTier(deltaBelow), 'below_market');
  });
});
