import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INDUSTRY_BENCHMARKS,
  normalizeJobStage,
  calculateStageFunnel,
  analyzeApplicationTiming,
  classifyCompanyTier,
  classifyCompanyTierMetrics,
  compareAgainstBenchmarks,
  generateConversionCoaching
} from './conversion_analytics_engine.js';

test('normalizeJobStage: correctly normalizes statuses and stages', () => {
  assert.equal(normalizeJobStage({ status: 'applied' }), 'applied');
  assert.equal(normalizeJobStage({ status: 'interviewing' }), 'screening');
  assert.equal(normalizeJobStage({ status: 'phone_screen' }), 'screening');
  assert.equal(normalizeJobStage({ status: 'technical' }), 'technical');
  assert.equal(normalizeJobStage({ status: 'assessment' }), 'technical');
  assert.equal(normalizeJobStage({ status: 'offer' }), 'offer');
  assert.equal(normalizeJobStage({ status: 'accepted' }), 'offer');
  assert.equal(normalizeJobStage({ status: 'rejected' }), 'archived');
  assert.equal(normalizeJobStage({ kanban_stage: 'screening' }), 'screening');
  assert.equal(normalizeJobStage({ status: 'matched' }), 'wishlist');
  assert.equal(normalizeJobStage(null), 'wishlist');
});

test('calculateStageFunnel: handles empty and zero-state data gracefully', () => {
  const result = calculateStageFunnel([], []);
  assert.equal(result.total_dispatched, 0);
  assert.equal(result.stages.applied.count, 0);
  assert.equal(result.stages.screening.count, 0);
  assert.equal(result.stages.technical.count, 0);
  assert.equal(result.stages.offer.count, 0);
  assert.equal(result.conversionRates.appliedToScreen, 0);
  assert.equal(result.bottleneck, null);
});

test('calculateStageFunnel: accurately computes multi-stage conversion and step dropoffs', () => {
  const jobs = [
    { id: '1', title: 'SWE', company: 'Google', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '2', title: 'Full Stack', company: 'Meta', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '3', title: 'Backend', company: 'Stripe', status: 'screening', applied_at: '2026-09-01T10:00:00Z' },
    { id: '4', title: 'Staff Eng', company: 'Figma', status: 'technical', applied_at: '2026-09-01T10:00:00Z' },
    { id: '5', title: 'AI Eng', company: 'Supabase', status: 'offer', applied_at: '2026-09-01T10:00:00Z' }
  ];

  const result = calculateStageFunnel(jobs, []);
  assert.equal(result.total_dispatched, 5);
  // All 5 applied, 3 reached screening or beyond, 2 reached technical or beyond, 1 reached offer
  assert.equal(result.stages.applied.count, 5);
  assert.equal(result.stages.screening.count, 3);
  assert.equal(result.stages.technical.count, 2);
  assert.equal(result.stages.offer.count, 1);

  assert.equal(result.conversionRates.appliedToScreen, 60.0); // 3 / 5 = 60%
  assert.equal(result.conversionRates.screenToTech, 66.7);    // 2 / 3 = 66.7%
  assert.equal(result.conversionRates.techToOffer, 50.0);     // 1 / 2 = 50%
  assert.equal(result.conversionRates.overallYield, 20.0);    // 1 / 5 = 20%
});

test('calculateStageFunnel: detects bottleneck when conversion is unusually low', () => {
  const jobs = [
    { id: '1', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '2', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '3', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '4', status: 'applied', applied_at: '2026-09-01T10:00:00Z' },
    { id: '5', status: 'applied', applied_at: '2026-09-01T10:00:00Z' }
  ];

  const result = calculateStageFunnel(jobs, []);
  assert.ok(result.bottleneck);
  assert.equal(result.bottleneck.stage, 'Applied → Recruiter Screen');
  assert.ok(result.bottleneck.recommendation.includes('ATS keyword'));
});

test('analyzeApplicationTiming: parses day of week and recruiter hour windows', () => {
  // 2026-09-08 is a Tuesday (Day 2) at 09:30 AM (Prime morning slot in local time)
  const jobs = [
    { id: '1', applied_at: '2026-09-08T09:30:00' }, // Tue 9:30 AM (Prime)
    { id: '2', applied_at: '2026-09-09T10:15:00' }, // Wed 10:15 AM (Prime)
    { id: '3', applied_at: '2026-09-06T20:00:00' }  // Sun 8:00 PM (Off-peak)
  ];

  const result = analyzeApplicationTiming([], jobs);
  assert.equal(result.validTimestampCount, 3);
  assert.equal(result.dayDistribution.length, 7);
  assert.equal(result.slotDistribution.length, 5);
  assert.ok(result.peakDay);
  assert.ok(result.primeAlignmentPct > 0);
  assert.ok(typeof result.timingAdvice === 'string');
});

test('classifyCompanyTier: categorizes enterprise, mid-market, and startups accurately', () => {
  assert.equal(classifyCompanyTier('Google LLC'), 'enterprise');
  assert.equal(classifyCompanyTier('Meta Platforms'), 'enterprise');
  assert.equal(classifyCompanyTier('Acme Global Technologies Inc.'), 'enterprise');
  assert.equal(classifyCompanyTier('Vercel'), 'mid_market');
  assert.equal(classifyCompanyTier('Figma'), 'mid_market');
  assert.equal(classifyCompanyTier('Stealth AI Agentic Labs'), 'startup');
  assert.equal(classifyCompanyTier(''), 'startup');
});

test('classifyCompanyTierMetrics: summarizes volume and response rates across tiers', () => {
  const jobs = [
    { id: '1', company: 'Google', status: 'screening', ats_match_score: 90 },
    { id: '2', company: 'Microsoft', status: 'applied', ats_match_score: 85 },
    { id: '3', company: 'Vercel', status: 'offer', ats_match_score: 95 },
    { id: '4', company: 'TinySeed Studio', status: 'applied', ats_match_score: 80 }
  ];

  const result = classifyCompanyTierMetrics(jobs, []);
  assert.equal(result.tiers.length, 3);

  const ent = result.tiers.find(t => t.id === 'enterprise');
  const mid = result.tiers.find(t => t.id === 'mid_market');
  const sta = result.tiers.find(t => t.id === 'startup');

  assert.equal(ent.count, 2);
  assert.equal(ent.responses, 1);
  assert.equal(ent.responseRate, 50.0);

  assert.equal(mid.count, 1);
  assert.equal(mid.responses, 1);
  assert.equal(mid.responseRate, 100.0);

  assert.equal(sta.count, 1);
  assert.equal(sta.responses, 0);
  assert.equal(sta.responseRate, 0.0);
});

test('compareAgainstBenchmarks: evaluates performance delta vs industry targets', () => {
  const highPerformer = compareAgainstBenchmarks({
    total_dispatched: 10,
    conversionRates: { appliedToScreen: 20.0, screenToTech: 40.0, techToOffer: 25.0, overallYield: 5.0 }
  });
  assert.equal(highPerformer.rating, 'Top Decile Performer');
  assert.ok(highPerformer.performanceSummary.includes('surpasses'));

  const averagePerformer = compareAgainstBenchmarks({
    total_dispatched: 10,
    conversionRates: { appliedToScreen: 5.0, screenToTech: 30.0, techToOffer: 20.0, overallYield: 1.0 }
  });
  assert.equal(averagePerformer.rating, 'Average Baseline');

  const needsTuning = compareAgainstBenchmarks({
    total_dispatched: 10,
    conversionRates: { appliedToScreen: 1.0, screenToTech: 0, techToOffer: 0, overallYield: 0 }
  });
  assert.equal(needsTuning.rating, 'Needs Keyword Calibration');
});

test('generateConversionCoaching: identifies weakest stage and outputs 3 actionable fixes', () => {
  const funnel = {
    total_dispatched: 10,
    conversionRates: { appliedToScreen: 5.0, screenToTech: 20.0, techToOffer: 15.0, overallYield: 1.0 }
  };
  const coaching = generateConversionCoaching(funnel);
  assert.ok(coaching.headline.includes('5%'));
  assert.ok(coaching.coachingMessage.includes('5% vs 14.5% benchmark'));
  assert.equal(coaching.actionableFixes.length, 3);
  assert.ok(coaching.weakestStageName);
  assert.ok(coaching.actionableFixes[0].title);
  assert.ok(coaching.actionableFixes[0].detail);
});
