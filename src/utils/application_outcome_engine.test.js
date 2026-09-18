import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_OUTCOME_BENCHMARKS,
  normalizeApplicationStage,
  classifyEmployerTier,
  computeApplicationOutcomes,
  diagnoseFunnelBottleneck
} from './application_outcome_engine.js';

test('normalizeApplicationStage: accurately maps stage synonyms to canonical buckets', () => {
  assert.equal(normalizeApplicationStage({ status: 'applied' }), 'applied');
  assert.equal(normalizeApplicationStage({ status: 'submitted' }), 'applied');
  assert.equal(normalizeApplicationStage({ status: 'screening' }), 'screening');
  assert.equal(normalizeApplicationStage({ status: 'phone_screen' }), 'screening');
  assert.equal(normalizeApplicationStage({ stage: 'interview' }), 'screening');
  assert.equal(normalizeApplicationStage({ status: 'technical' }), 'technical');
  assert.equal(normalizeApplicationStage({ status: 'coding_test' }), 'technical');
  assert.equal(normalizeApplicationStage({ stage: 'onsite' }), 'technical');
  assert.equal(normalizeApplicationStage({ status: 'offer' }), 'offer');
  assert.equal(normalizeApplicationStage({ stage: 'accepted' }), 'offer');
  assert.equal(normalizeApplicationStage({ status: 'rejected' }), 'rejected');
  assert.equal(normalizeApplicationStage({ stage: 'declined' }), 'rejected');
  assert.equal(normalizeApplicationStage({ status: 'ghosted' }), 'archived');
  assert.equal(normalizeApplicationStage(null), 'applied');
});

test('classifyEmployerTier: identifies enterprise, mid-market, and startup tiers', () => {
  assert.equal(classifyEmployerTier('Google'), 'enterprise');
  assert.equal(classifyEmployerTier('Amazon Web Services'), 'enterprise');
  assert.equal(classifyEmployerTier('Infosys'), 'enterprise');
  assert.equal(classifyEmployerTier('Figma'), 'mid_market');
  assert.equal(classifyEmployerTier('Swiggy'), 'mid_market');
  assert.equal(classifyEmployerTier('Razorpay'), 'mid_market');
  assert.equal(classifyEmployerTier('Acme Stealth AI Inc'), 'startup');
  assert.equal(classifyEmployerTier(''), 'startup');
});

test('computeApplicationOutcomes: handles empty applications list gracefully', () => {
  const result = computeApplicationOutcomes([], []);
  assert.equal(result.totalDispatched, 0);
  assert.equal(result.responsesReceived, 0);
  assert.equal(result.callbacksReceived, 0);
  assert.equal(result.rates.responseRatePct, 0);
  assert.equal(result.rates.callbackRatePct, 0);
  assert.equal(result.statisticalConfidence.sampleSize, 0);
  assert.equal(result.statisticalConfidence.isProvisional, true);
});

test('computeApplicationOutcomes: detects provisional status for early cohorts (<5 apps)', () => {
  const mockApps = [
    { id: '1', company: 'Stripe', title: 'SWE', status: 'applied', applied_at: new Date().toISOString() },
    { id: '2', company: 'Linear', title: 'Frontend', status: 'screening', applied_at: new Date().toISOString() },
    { id: '3', company: 'Vercel', title: 'Fullstack', status: 'applied', applied_at: new Date().toISOString() }
  ];

  const result = computeApplicationOutcomes(mockApps, []);
  assert.equal(result.totalDispatched, 3);
  assert.equal(result.callbacksReceived, 1);
  assert.equal(result.rates.callbackRatePct, 33.3);
  assert.equal(result.statisticalConfidence.isProvisional, true);
  assert.equal(result.statisticalConfidence.isStatisticallySignificant, false);
  assert.match(result.statisticalConfidence.label, /provisional/i);
});

test('computeApplicationOutcomes: calculates response rates, callback conversions, and turnaround velocity', () => {
  const threeDaysAgo = new Date(Date.now() - 3 * 24 * 3600 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
  const twoDaysAgo = new Date(Date.now() - 2 * 24 * 3600 * 1000).toISOString();

  const mockApps = [
    // 2 Offers
    { id: 'app-1', company: 'Google', title: 'SWE III', status: 'offer', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 90 },
    { id: 'app-2', company: 'Stripe', title: 'Backend Eng', status: 'offer', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 85 },
    // 2 Technical Loops
    { id: 'app-3', company: 'Figma', title: 'Fullstack Eng', status: 'technical', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 80 },
    { id: 'app-4', company: 'Notion', title: 'Infra Eng', status: 'technical', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 78 },
    // 2 Screenings
    { id: 'app-5', company: 'Vercel', title: 'Platform Eng', status: 'screening', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 82 },
    { id: 'app-6', company: 'Linear', title: 'Frontend Eng', status: 'screening', applied_at: sevenDaysAgo, updated_at: twoDaysAgo, ats_match_score: 65 },
    // 2 Rejections
    { id: 'app-7', company: 'Amazon', title: 'SDE II', status: 'rejected', applied_at: sevenDaysAgo, updated_at: threeDaysAgo, ats_match_score: 70 },
    { id: 'app-8', company: 'Meta', title: 'E5 Eng', status: 'rejected', applied_at: sevenDaysAgo, updated_at: threeDaysAgo, ats_match_score: 60 },
    // 2 Applied / Awaiting
    { id: 'app-9', company: 'Supabase', title: 'Database Eng', status: 'applied', applied_at: threeDaysAgo, ats_match_score: 88 },
    { id: 'app-10', company: 'Postman', title: 'API Arch', status: 'applied', applied_at: threeDaysAgo, ats_match_score: 72 }
  ];

  const result = computeApplicationOutcomes(mockApps, []);

  assert.equal(result.totalDispatched, 10);
  assert.equal(result.statisticalConfidence.isStatisticallySignificant, true);
  assert.equal(result.statisticalConfidence.isProvisional, false);

  // 6 positive callbacks (2 offer + 2 tech + 2 screen)
  assert.equal(result.callbacksReceived, 6);
  assert.equal(result.rates.callbackRatePct, 60.0);

  // 8 responses (6 callbacks + 2 rejections)
  assert.equal(result.responsesReceived, 8);
  assert.equal(result.rates.responseRatePct, 80.0);

  // Velocity: average ~5 days (7 days ago -> 2 days ago = 5 days)
  assert.equal(result.velocity.hasRealVelocityData, true);
  assert.ok(result.velocity.avgTurnaroundDays >= 4 && result.velocity.avgTurnaroundDays <= 6);

  // Attribution: High fit (ats >= 75) vs Moderate fit (< 75)
  assert.ok(result.attribution.fitScore.highFit.dispatched > 0);
  assert.ok(result.attribution.fitScore.highFit.callbackRate > 0);
});

test('diagnoseFunnelBottleneck: delivers accurate actionable diagnostic states', () => {
  // Empty
  assert.equal(diagnoseFunnelBottleneck({ totalDispatched: 0 }).status, 'no_data');

  // Early cohort (<5)
  const early = {
    totalDispatched: 3,
    statisticalConfidence: { isProvisional: true },
    rates: { callbackRatePct: 33.3 },
    stageCounts: { screening: 1, technical: 0, offer: 0 },
    velocity: { avgTurnaroundDays: 7.5 }
  };
  assert.equal(diagnoseFunnelBottleneck(early).status, 'early_cohort');

  // Top of funnel bottleneck (Low callback rate)
  const lowTop = {
    totalDispatched: 20,
    statisticalConfidence: { isProvisional: false },
    rates: { callbackRatePct: 1.0 },
    stageCounts: { screening: 0, technical: 0, offer: 0 },
    velocity: { avgTurnaroundDays: 7.5 }
  };
  assert.equal(diagnoseFunnelBottleneck(lowTop).status, 'top_funnel_bottleneck');

  // Screen to tech bottleneck
  const screenDrop = {
    totalDispatched: 15,
    statisticalConfidence: { isProvisional: false },
    rates: { callbackRatePct: 20.0, screenToTechRatePct: 15.0 },
    stageCounts: { screening: 3, technical: 0, offer: 0 },
    velocity: { avgTurnaroundDays: 6.0 }
  };
  assert.equal(diagnoseFunnelBottleneck(screenDrop).status, 'screen_bottleneck');

  // Healthy funnel
  const healthy = {
    totalDispatched: 15,
    statisticalConfidence: { isProvisional: false },
    rates: { callbackRatePct: 25.0, screenToTechRatePct: 40.0, techToOfferRatePct: 25.0, callbackVsColdDelta: 23.0 },
    stageCounts: { screening: 4, technical: 2, offer: 1 },
    velocity: { avgTurnaroundDays: 5.2 }
  };
  assert.equal(diagnoseFunnelBottleneck(healthy).status, 'healthy');
});

test('application_outcome_engine: exports valid INDUSTRY_OUTCOME_BENCHMARKS', () => {
  assert.ok(typeof INDUSTRY_OUTCOME_BENCHMARKS === 'object');
  assert.ok(INDUSTRY_OUTCOME_BENCHMARKS.coldResponseRate > 0);
  assert.ok(INDUSTRY_OUTCOME_BENCHMARKS.atsOptimizedResponseRate > 0);
});
