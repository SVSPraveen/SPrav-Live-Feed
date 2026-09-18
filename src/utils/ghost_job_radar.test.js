import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  calculateFreshnessTelemetry, 
  FRESHNESS_CODES, 
  calculateCallbackLikelihood, 
  formatJobFreshnessHuman,
  evaluateGhostProbability,
  evaluateSpamScamRisk,
  auditGhostAndSpamRisk
} from './ghost_job_radar.js';


test('FRESHNESS_CODES: verifies exact string constants against mutations', () => {
  assert.equal(FRESHNESS_CODES.ULTRA_FRESH, 'ultra_fresh');
  assert.equal(FRESHNESS_CODES.FRESH_DROP, 'fresh_drop');
  assert.equal(FRESHNESS_CODES.ACTIVE_CYCLE, 'active_cycle');
  assert.equal(FRESHNESS_CODES.MODERATE_AGE, 'moderate_age');
  assert.equal(FRESHNESS_CODES.REPOST_WARNING, 'repost_warning');
  assert.equal(FRESHNESS_CODES.STALE_PIPELINE, 'stale_pipeline');
  assert.equal(FRESHNESS_CODES.LIKELY_GHOST, 'likely_ghost');
});

test('calculateFreshnessTelemetry: exact object contract for ultra fresh drop (<4h)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  
  // 0 hours ago
  const res0 = calculateFreshnessTelemetry({ posted_at: '2026-09-06T12:00:00Z' }, ref);
  assert.deepStrictEqual(res0, {
    code: 'ultra_fresh',
    badge: '⚡ Fresh Drop',
    sublabel: '<1h ago • 4.2x Callback',
    badgeColor: '#34d399',
    bg: 'rgba(16, 185, 129, 0.15)',
    border: 'rgba(16, 185, 129, 0.35)',
    ageHours: 0,
    ageDays: 0,
    postedHuman: 'Just posted',
    callbackMultiplier: '4.2x',
    ghostRisk: 'None (Verified Fresh Listing)',
    isGhostRisk: false,
    isFreshDrop: true,
    urgency: 'Immediate Priority',
    recommendation: 'Prime Window: Roles applied to within the first 4 hours experience a 4.2x higher interview callback rate.',
    label: '⚡ Fresh Drop',
    color: '#34d399',
    riskLevel: 'low',
    actionableTip: 'Prime application window (<4h ago). Submitting immediately gives a 4.2x callback multiplier before hundreds of applications flood the ATS.',
    explanation: 'Prime Window: Roles applied to within the first 4 hours experience a 4.2x higher interview callback rate.'
  });

  // 2 hours ago
  const res2 = calculateFreshnessTelemetry({ posted_at: '2026-09-06T10:00:00Z' }, ref);
  assert.equal(res2.sublabel, '2h ago • 4.2x Callback');
  assert.equal(res2.ageHours, 2);
});

test('calculateFreshnessTelemetry: exact object contract for fresh drop (4 - 24h)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const res = calculateFreshnessTelemetry({ posted_at: '2026-09-05T20:00:00Z' }, ref); // 16h ago

  assert.deepStrictEqual(res, {
    code: 'fresh_drop',
    badge: '⚡ Fresh Drop',
    sublabel: '16h ago • 3.5x Callback',
    badgeColor: '#22d3ee',
    bg: 'rgba(6, 182, 212, 0.15)',
    border: 'rgba(6, 182, 212, 0.35)',
    ageHours: 16,
    ageDays: 0,
    postedHuman: 'Posted 16h ago',
    callbackMultiplier: '3.5x',
    ghostRisk: 'Very Low',
    isGhostRisk: false,
    isFreshDrop: true,
    urgency: 'High Priority',
    recommendation: 'Early Application Advantage: Applying within 24 hours places your resume in the first candidate review batch.',
    label: '⚡ Fresh Drop',
    color: '#22d3ee',
    riskLevel: 'low',
    actionableTip: 'Early application advantage (16h ago). Submitting now places your resume in the recruiter\'s first review batch.',
    explanation: 'Early Application Advantage: Applying within 24 hours places your resume in the first candidate review batch.'
  });

  // Boundary: exactly 4 hours
  const b4 = calculateFreshnessTelemetry({ posted_at: '2026-09-06T08:00:00Z' }, ref);
  assert.equal(b4.code, 'fresh_drop');
  assert.equal(b4.ageHours, 4);

  // Boundary: exactly 24 hours
  const b24 = calculateFreshnessTelemetry({ posted_at: '2026-09-05T12:00:00Z' }, ref);
  assert.equal(b24.code, 'fresh_drop');
  assert.equal(b24.ageHours, 24);
});

test('calculateFreshnessTelemetry: exact object contract for repost warning loop and 7-day boundary', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const firstPublished = new Date('2026-07-23T12:00:00Z'); // 45 days ago
  const updatedRecent = new Date('2026-09-03T12:00:00Z');  // 3 days ago
  const postedRecent = new Date('2026-09-04T12:00:00Z');   // 2 days ago (reposted)

  // Real repost loop: first published 45d ago, reposted 2d ago, updated 3d ago
  const res = calculateFreshnessTelemetry({
    first_published_at: firstPublished.toISOString(),
    updated_at: updatedRecent.toISOString(),
    posted_at: postedRecent.toISOString()
  }, ref);

  assert.deepStrictEqual(res, {
    code: 'repost_warning',
    badge: '⚠️ Repost Warning',
    sublabel: 'Refreshed loop • 2d old',
    badgeColor: '#f97316',
    bg: 'rgba(249, 115, 22, 0.15)',
    border: 'rgba(249, 115, 22, 0.35)',
    ageHours: 48,
    ageDays: 2,
    postedHuman: 'Posted 2 days ago',
    callbackMultiplier: '0.6x',
    ghostRisk: 'Elevated (Listing continuously bumped without hires)',
    isGhostRisk: true,
    isFreshDrop: false,
    urgency: 'Proceed with Caution',
    recommendation: 'Repost Warning: This listing has been periodically bumped by recruiters without closing. Prioritize newer drops.',
    label: '⚠️ Repost Warning',
    color: '#f97316',
    riskLevel: 'medium',
    actionableTip: "This posting is 2 days old with repost bumps detected. Address the re-post in your opening sentence if you still want to apply (e.g. 'I noticed this role was recently refreshed and wanted to proactively confirm if you are still actively screening candidates for this cycle').",
    explanation: 'Repost Warning: This listing has been periodically bumped by recruiters without closing. Prioritize newer drops.'
  });

  // Repost boundary: exactly 7 days ago (<= 7 * 24h)
  const exact7Days = new Date(ref.getTime() - (7 * 24 * 60 * 60 * 1000));
  const resExact7 = calculateFreshnessTelemetry({
    first_published: firstPublished.toISOString(),
    updated_at: exact7Days.toISOString(),
    posted_at: postedRecent.toISOString()
  }, ref);
  assert.equal(resExact7.code, 'repost_warning');

  // Repost with firstPublishedAt field
  const resFirstPublishedAt = calculateFreshnessTelemetry({
    firstPublishedAt: firstPublished.toISOString(),
    updated_at: updatedRecent.toISOString(),
    posted_at: postedRecent.toISOString()
  }, ref);
  assert.equal(resFirstPublishedAt.code, 'repost_warning');

  // Repost boundary: updatedMs > 7 days ago (8 days ago -> not a repost loop)
  const oldUpdate = calculateFreshnessTelemetry({
    first_published_at: firstPublished.toISOString(),
    updated_at: '2026-08-29T12:00:00Z',
    posted_at: postedRecent.toISOString()
  }, ref);
  assert.notEqual(oldUpdate.code, 'repost_warning');

  // Repost boundary: initialAgeDays < 45 (44 days ago -> not a repost loop)
  const young44 = calculateFreshnessTelemetry({
    first_published_at: '2026-07-24T12:00:00Z',
    updated_at: updatedRecent.toISOString(),
    posted_at: '2026-07-24T12:00:00Z'
  }, ref);
  assert.notEqual(young44.code, 'repost_warning');
});

test('calculateFreshnessTelemetry: exact object contract for active cycle (1 - 14d)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const res = calculateFreshnessTelemetry({ posted_at: '2026-09-02T12:00:00Z' }, ref); // 4 days ago

  assert.deepStrictEqual(res, {
    code: 'active_cycle',
    badge: '🟢 Active Cycle',
    sublabel: '4d ago • Active Review',
    badgeColor: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    ageHours: 96,
    ageDays: 4,
    postedHuman: 'Posted 4 days ago',
    callbackMultiplier: '2.0x',
    ghostRisk: 'Low',
    isGhostRisk: false,
    isFreshDrop: false,
    urgency: 'Normal Priority',
    recommendation: 'Active Cycle: Employer is within standard screening and initial interview cadence.',
    label: '🟢 Active Cycle',
    color: '#4ade80',
    riskLevel: 'low',
    actionableTip: 'Active review cycle (4d old). Standard 2.0x callback velocity; tailor top 3 technical keywords to pass initial recruiter filters.',
    explanation: 'Active Cycle: Employer is within standard screening and initial interview cadence.'
  });

  // Boundary 14 days
  const b14 = calculateFreshnessTelemetry({ posted_at: '2026-08-23T12:00:00Z' }, ref);
  assert.equal(b14.code, 'active_cycle');
  assert.equal(b14.ageDays, 14);
});

test('calculateFreshnessTelemetry: exact object contract for moderate age (15 - 45d)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const res = calculateFreshnessTelemetry({ posted_at: '2026-08-15T12:00:00Z' }, ref); // 22 days ago

  assert.deepStrictEqual(res, {
    code: 'moderate_age',
    badge: '🟡 Interviewing',
    sublabel: '22d ago • Later Stages',
    badgeColor: '#fbbf24',
    bg: 'rgba(245, 158, 11, 0.12)',
    border: 'rgba(245, 158, 11, 0.3)',
    ageHours: 528,
    ageDays: 22,
    postedHuman: 'Posted 22 days ago',
    callbackMultiplier: '1.0x',
    ghostRisk: 'Moderate (Candidates in progress)',
    isGhostRisk: false,
    isFreshDrop: false,
    urgency: 'Medium Priority',
    recommendation: 'Mid-Stage: Employer may already have candidates in intermediate interviews, but qualified fits are still reviewed.',
    label: '🟡 Interviewing',
    color: '#fbbf24',
    riskLevel: 'medium',
    actionableTip: 'Mid-stage cycle (22d old). Recruiter is likely reviewing second-round candidates. Emphasize immediate availability and relevant impact.',
    explanation: 'Mid-Stage: Employer may already have candidates in intermediate interviews, but qualified fits are still reviewed.'
  });

  // Boundary 45 days
  const b45 = calculateFreshnessTelemetry({ posted_at: '2026-07-23T12:00:00Z' }, ref);
  assert.equal(b45.code, 'moderate_age');
  assert.equal(b45.ageDays, 45);
});

test('calculateFreshnessTelemetry: exact object contract for stale pipeline (46 - 90d)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const res = calculateFreshnessTelemetry({ posted_at: '2026-07-05T12:00:00Z' }, ref); // 63 days ago

  assert.deepStrictEqual(res, {
    code: 'stale_pipeline',
    badge: '🟠 Stale Pipeline',
    sublabel: '63d old • Low Callback',
    badgeColor: '#fb923c',
    bg: 'rgba(251, 146, 60, 0.12)',
    border: 'rgba(251, 146, 60, 0.3)',
    ageHours: 1512,
    ageDays: 63,
    postedHuman: 'Posted 63 days ago',
    callbackMultiplier: '0.5x',
    ghostRisk: 'High (Open 45-90 days with reduced velocity)',
    isGhostRisk: true,
    isFreshDrop: false,
    urgency: 'Low Priority',
    recommendation: 'Stale Pipeline: Reduced callback rate. Recommended only if your skills match 85%+ of requirements.',
    label: '🟠 Stale Pipeline',
    color: '#fb923c',
    riskLevel: 'high',
    actionableTip: 'Stale pipeline (63d old). Highlight direct matches to the must-have requirements in your opening line to stand out in an aged queue.',
    explanation: 'Stale Pipeline: Reduced callback rate. Recommended only if your skills match 85%+ of requirements.'
  });

  // Boundary 46 days
  const b46 = calculateFreshnessTelemetry({ posted_at: '2026-07-22T12:00:00Z' }, ref);
  assert.equal(b46.code, 'stale_pipeline');
  assert.equal(b46.ageDays, 46);

  // Boundary 90 days
  const b90 = calculateFreshnessTelemetry({ posted_at: '2026-06-08T12:00:00Z' }, ref);
  assert.equal(b90.code, 'stale_pipeline');
  assert.equal(b90.ageDays, 90);
});

test('calculateFreshnessTelemetry: exact object contract for likely ghost role (>90d)', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  const res = calculateFreshnessTelemetry({ posted_at: '2026-04-01T12:00:00Z' }, ref); // 158 days ago

  assert.deepStrictEqual(res, {
    code: 'likely_ghost',
    badge: '🔴 Likely Ghost',
    sublabel: '158d open • Low ROI',
    badgeColor: '#f87171',
    bg: 'rgba(239, 68, 68, 0.15)',
    border: 'rgba(239, 68, 68, 0.35)',
    ageHours: 3792,
    ageDays: 158,
    postedHuman: 'Posted 158 days ago',
    callbackMultiplier: '0.2x',
    ghostRisk: 'Extreme (Open >90 days; probable hiring freeze)',
    isGhostRisk: true,
    isFreshDrop: false,
    urgency: 'Avoid / Low Return',
    recommendation: 'Ghost Risk: Role has remained open over 90 days. High likelihood of hiring freeze or automated evergreen listing.',
    label: '🔴 Likely Ghost',
    color: '#f87171',
    riskLevel: 'high',
    actionableTip: 'This posting is 158 days old (>90 days). If applying, verify on LinkedIn if the team is actively hiring before expending high effort, or mention recent company announcements in your note.',
    explanation: 'Ghost Risk: Role has remained open over 90 days. High likelihood of hiring freeze or automated evergreen listing.'
  });

  // Boundary 91 days
  const b91 = calculateFreshnessTelemetry({ posted_at: '2026-06-07T12:00:00Z' }, ref);
  assert.equal(b91.code, 'likely_ghost');
  assert.equal(b91.ageDays, 91);
});

test('calculateFreshnessTelemetry: fallback contract when no valid date is provided', () => {
  const res = calculateFreshnessTelemetry(null);
  assert.deepStrictEqual(res, {
    code: 'active_cycle',
    badge: '🟢 Active',
    sublabel: 'Verified ATS Listing',
    badgeColor: '#4ade80',
    bg: 'rgba(74, 222, 128, 0.12)',
    border: 'rgba(74, 222, 128, 0.3)',
    ageHours: 24,
    ageDays: 1,
    postedHuman: 'Posted 1 day ago',
    callbackMultiplier: '2.0x',
    ghostRisk: 'Low',
    isGhostRisk: false,
    isFreshDrop: false,
    urgency: 'Normal',
    recommendation: 'Verified direct employer listing.',
    label: '🟢 Active',
    color: '#4ade80',
    riskLevel: 'low',
    actionableTip: 'Active review cycle (1d old). Standard 2.0x callback velocity; tailor top 3 technical keywords to pass initial recruiter filters.',
    explanation: 'Verified direct employer listing.'
  });
});

test('calculateFreshnessTelemetry: handles diverse date inputs, millisecond thresholds, and default ref', () => {
  const ref = new Date('2026-09-06T12:00:00Z');

  // Unix epoch in seconds (numeric and string)
  const unixSec = 1788626400 - 3600; // 1h prior
  const t1 = calculateFreshnessTelemetry(unixSec, new Date(1788626400 * 1000));
  assert.equal(t1.code, 'ultra_fresh');
  assert.equal(t1.ageHours, 1);

  const t2 = calculateFreshnessTelemetry(String(unixSec), new Date(1788626400 * 1000));
  assert.equal(t2.code, 'ultra_fresh');

  // Milliseconds directly as number (>= 10,000,000,000)
  const msNow = 1788626400000;
  const ms2h = msNow - 7200000;
  const tMs = calculateFreshnessTelemetry(ms2h, msNow);
  assert.equal(tMs.code, 'ultra_fresh');
  assert.equal(tMs.ageHours, 2);

  // Milliseconds as string
  const tMsStr = calculateFreshnessTelemetry(String(ms2h), msNow);
  assert.equal(tMsStr.code, 'ultra_fresh');
  assert.equal(tMsStr.ageHours, 2);

  // Non-date string falls back to null and active_cycle
  const tNonDate = calculateFreshnessTelemetry('not-a-date', ref);
  assert.equal(tNonDate.code, 'active_cycle');

  const tInvalidAlpha = calculateFreshnessTelemetry('invalid-numeric-999-xyz', ref);
  assert.equal(tInvalidAlpha.code, 'active_cycle');

  // Default referenceDate uses Date.now()
  const recentPosting = calculateFreshnessTelemetry(Date.now() - 3600000);
  assert.equal(recentPosting.code, 'ultra_fresh');

  // Null referenceDate falls back to Date.now()
  const recentPostingNullRef = calculateFreshnessTelemetry(Date.now() - 3600000, null);
  assert.equal(recentPostingNullRef.code, 'ultra_fresh');

  // Date object passed directly
  const dateObj = new Date('2026-09-06T11:00:00Z');
  const tDate = calculateFreshnessTelemetry(dateObj, ref);
  assert.equal(tDate.code, 'ultra_fresh');

  // Invalid date instance
  const invalidDate = new Date('invalid');
  const tInvalidDate = calculateFreshnessTelemetry(invalidDate, ref);
  assert.equal(tInvalidDate.code, 'active_cycle');

  // Boolean and object without date
  assert.equal(calculateFreshnessTelemetry(false, ref).code, 'active_cycle');
  assert.equal(calculateFreshnessTelemetry(true, ref).code, 'active_cycle');

  // Alternative field names on job object
  const altFields = [
    { first_published: '2026-09-06T11:00:00Z' },
    { first_published_at: '2026-09-06T11:00:00Z' },
    { firstPublishedAt: '2026-09-06T11:00:00Z' },
    { publishedAt: '2026-09-06T11:00:00Z' },
    { releasedDate: '2026-09-06T11:00:00Z' },
    { created_at: '2026-09-06T11:00:00Z' },
    { createdAt: '2026-09-06T11:00:00Z' },
    { pubDate: '2026-09-06T11:00:00Z' },
    { publication_date: '2026-09-06T11:00:00Z' },
    { scraped_at: '2026-09-06T11:00:00Z' },
    { updatedAt: '2026-09-06T11:00:00Z', posted_at: '2026-09-06T11:00:00Z' }
  ];

  for (const obj of altFields) {
    const res = calculateFreshnessTelemetry(obj, ref);
    assert.equal(res.code, 'ultra_fresh');
  }
});

test('calculateFreshnessTelemetry: generates actionable opening sentence advice for repost warnings and ghost listings', () => {
  const ref = new Date('2026-09-06T12:00:00Z');
  
  // Repost warning role
  const repostJob = {
    first_published_at: new Date(ref.getTime() - 67 * 86400000).toISOString(),
    updated_at: new Date(ref.getTime() - 2 * 86400000).toISOString(),
    posted_at: new Date(ref.getTime() - 2 * 86400000).toISOString()
  };
  const repostTelemetry = calculateFreshnessTelemetry(repostJob, ref);
  assert.equal(repostTelemetry.code, 'repost_warning');
  assert.equal(repostTelemetry.label, '⚠️ Repost Warning');
  assert.equal(repostTelemetry.color, '#f97316');
  assert.equal(repostTelemetry.riskLevel, 'medium');
  assert.match(repostTelemetry.actionableTip, /Address the re-post in your opening sentence/);

  // Likely ghost role (e.g. 100 days old)
  const ghostJob = {
    posted_at: new Date(ref.getTime() - 100 * 86400000).toISOString()
  };
  const ghostTelemetry = calculateFreshnessTelemetry(ghostJob, ref);
  assert.equal(ghostTelemetry.code, 'likely_ghost');
  assert.equal(ghostTelemetry.riskLevel, 'high');
  assert.match(ghostTelemetry.actionableTip, /verify on LinkedIn/);
});

test('calculateCallbackLikelihood: correctly computes probability, tier rating, and visual tokens', () => {
  // 1. High probability: High ATS (90%), Fresh drop (1.25x), onsite
  const high = calculateCallbackLikelihood({ atsScore: 90, freshnessMultiplier: 1.25, isRemote: false });
  assert.equal(high.rating, 'High Probability');
  assert.equal(high.score >= 75, true);
  assert.equal(high.color, '#34d399');
  assert.match(high.badgeText, /Callback Likelihood/);
  assert.match(high.explanation, /High Probability/);

  // 2. Strong match: 80% ATS, normal 1.0 multiplier
  const strong = calculateCallbackLikelihood({ atsScore: 80, freshnessMultiplier: 1.0, isRemote: false });
  assert.equal(strong.rating, 'Strong Match');
  assert.equal(strong.score >= 55 && strong.score < 75, true);
  assert.equal(strong.color, '#38bdf8');

  // 3. Competitive: 60% ATS, remote penalty (-8)
  const competitive = calculateCallbackLikelihood({ atsScore: 60, freshnessMultiplier: 0.95, isRemote: true });
  assert.equal(competitive.rating, 'Competitive');
  assert.equal(competitive.score >= 35 && competitive.score < 55, true);
  assert.equal(competitive.color, '#fbbf24');

  // 4. Stretch: Low ATS (30%), stale multiplier (0.35x), remote penalty
  const stretch = calculateCallbackLikelihood({ atsScore: 30, freshnessMultiplier: 0.35, isRemote: true });
  assert.equal(stretch.rating, 'Stretch');
  assert.equal(stretch.score < 35, true);
  assert.equal(stretch.color, '#f87171');

  // 5. Clamping and defaults: empty input returns valid bounded structure
  const fallback = calculateCallbackLikelihood();
  assert.equal(fallback.score >= 5 && fallback.score <= 95, true);
  assert.equal(typeof fallback.badgeText, 'string');
  assert.equal(typeof fallback.explanation, 'string');
});

test('formatJobFreshnessHuman: formats friendly human-facing labels', () => {
  assert.equal(formatJobFreshnessHuman(null), 'Verified Active');
  assert.equal(formatJobFreshnessHuman({ postedHuman: 'Posted 3 days ago' }), 'Posted 3 days ago');
  const ref = new Date('2026-09-06T12:00:00Z');
  assert.equal(formatJobFreshnessHuman({ posted_at: '2026-09-06T12:00:00Z' }, ref), 'Just posted');
  assert.equal(formatJobFreshnessHuman({ posted_at: '2026-09-06T09:00:00Z' }, ref), 'Posted 3h ago');
  assert.equal(formatJobFreshnessHuman({ posted_at: '2026-09-03T12:00:00Z' }, ref), 'Posted 3 days ago');
});

test('evaluateGhostProbability: flags aged listings, repost loops, and evergreen pools', () => {
  const ref = new Date('2026-09-17T00:00:00Z');

  // 1. Fresh active job
  const freshJob = {
    title: 'Senior Software Engineer',
    company: 'Stripe',
    posted_at: '2026-09-15T00:00:00Z',
    description: 'Design distributed payment infrastructure.'
  };
  const freshRes = evaluateGhostProbability(freshJob, ref);
  assert.equal(freshRes.isGhostReject, false);
  assert.equal(freshRes.ghostScore, 0);
  assert.equal(freshRes.riskLevel, 'clean');

  // 2. Severe stale posting (>60 days)
  const staleJob = {
    title: 'Backend Engineer',
    company: 'OldCorp',
    posted_at: '2026-07-01T00:00:00Z', // 78 days ago
    description: 'General backend development.'
  };
  const staleRes = evaluateGhostProbability(staleJob, ref);
  assert.equal(staleRes.isGhostReject, true);
  assert.ok(staleRes.ghostScore >= 35);
  assert.ok(staleRes.indicators.some(i => i.includes('>60d')));

  // 3. Evergreen talent pool jargon
  const evergreenJob = {
    title: 'Platform Architect',
    company: 'TalentHub',
    posted_at: '2026-09-10T00:00:00Z',
    description: 'This is an evergreen requisition for our talent community. Submit your resume for future opportunities only.'
  };
  const evergreenRes = evaluateGhostProbability(evergreenJob, ref);
  assert.ok(evergreenRes.ghostScore >= 35);
  assert.ok(evergreenRes.indicators.some(i => i.includes('Evergreen Requisition')));

  // 4. Confidential client resume harvesting shell
  const stealthJob = {
    title: 'AI Researcher',
    company: 'Confidential Client',
    posted_at: '2026-09-12T00:00:00Z',
    description: 'Work with a top-tier client.'
  };
  const stealthRes = evaluateGhostProbability(stealthJob, ref);
  assert.ok(stealthRes.indicators.some(i => i.includes('Confidential Client')));
});

test('evaluateSpamScamRisk: flags Telegram phishing, wire check scams, and unpaid trials', () => {
  // 1. Telegram interview recruitment phishing
  const telegramJob = {
    title: 'Remote Data Scientist',
    description: 'Congratulations on your application! Please contact our hiring manager on Telegram @hiring_lead to conduct your preliminary interview.'
  };
  const tgRes = evaluateSpamScamRisk(telegramJob);
  assert.equal(tgRes.isSpamScam, true);
  assert.ok(tgRes.scamScore >= 70);
  assert.ok(tgRes.scamIndicators.some(i => i.includes('Telegram')));

  // 2. Advance check / equipment purchase scam
  const checkJob = {
    title: 'Executive Assistant',
    description: 'A cashier check will be sent to your address to purchase home office laptop equipment and we will reimburse all costs.'
  };
  const checkRes = evaluateSpamScamRisk(checkJob);
  assert.equal(checkRes.isSpamScam, true);
  assert.ok(checkRes.scamScore >= 80);
  assert.ok(checkRes.scamIndicators.some(i => i.includes('check deposit')));

  // 3. Unpaid labor exploitation
  const unpaidJob = {
    title: 'Full Stack Developer',
    description: 'Applicants must complete a 20+ hour take-home project to build a production ready app for our live review as an unpaid trial.'
  };
  const unpaidRes = evaluateSpamScamRisk(unpaidJob);
  assert.equal(unpaidRes.isSpamScam, true);
  assert.ok(unpaidRes.scamIndicators.some(i => i.includes('Labor Exploitation')));

  // 4. Clean job
  const cleanJob = {
    title: 'Staff Security Engineer',
    description: 'Join Datadog to protect cloud telemetry pipelines across distributed clusters.'
  };
  const cleanRes = evaluateSpamScamRisk(cleanJob);
  assert.equal(cleanRes.isSpamScam, false);
  assert.equal(cleanRes.scamScore, 0);
});

test('auditGhostAndSpamRisk: unified verdict rejects both ghost jobs and fraud scams', () => {
  const ref = new Date('2026-09-17T00:00:00Z');

  const scamJob = {
    title: 'Remote QA',
    description: 'Interview on Telegram @qa_jobs for $60/hr.'
  };
  const scamAudit = auditGhostAndSpamRisk(scamJob, { referenceDate: ref });
  assert.equal(scamAudit.shouldReject, true);
  assert.equal(scamAudit.isScam, true);
  assert.equal(scamAudit.primaryVerdict, '⛔ Scam / Fraud Alert');

  const ghostJob = {
    title: 'DevOps Engineer',
    posted_at: '2026-06-01T00:00:00Z', // >100 days old
    description: 'Maintain Kubernetes clusters.'
  };
  const ghostAudit = auditGhostAndSpamRisk(ghostJob, { referenceDate: ref });
  assert.equal(ghostAudit.shouldReject, true);
  assert.equal(ghostAudit.isGhost, true);
  assert.equal(ghostAudit.primaryVerdict, '🟡 Ghost Job Probability');

  const cleanJob = {
    title: 'Frontend Engineer',
    posted_at: '2026-09-16T12:00:00Z',
    description: 'Build React components for Figma.'
  };
  const cleanAudit = auditGhostAndSpamRisk(cleanJob, { referenceDate: ref });
  assert.equal(cleanAudit.shouldReject, false);
  assert.equal(cleanAudit.isGhost, false);
  assert.equal(cleanAudit.isScam, false);
  assert.equal(cleanAudit.primaryVerdict, '🟢 Verified Active');
});



