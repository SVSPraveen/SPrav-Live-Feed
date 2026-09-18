import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_2026_SALARY_BENCHMARKS,
  ANCHOR_TIERS,
  OPEN_SALARY_ENDPOINTS,
  aggregateEmpiricalSalaries,
  blendBenchmarks,
  parseOpenWebJobSalaries,
  subscribeToSalaryUpdates,
  getActiveSalaryBenchmarks,
  getSalaryCalibrationTelemetry,
  setNegotiationAnchorTier
} from './live_salary_service.js';
import {
  COMP_BENCHMARKS,
  SALARY_CALIBRATION_METADATA,
  updateSalaryBenchmarks,
  getSalaryCalibrationDisclaimer
} from './salary_benchmark_engine.js';

test('live_salary_service: exports comprehensive 2026 baseline covering all 11 roles and geos', () => {
  const roles = [
    'software_engineer', 'frontend_engineer', 'ai_ml_engineer', 'devops_sre',
    'data_engineer', 'cybersecurity_engineer', 'mobile_engineer', 'qa_sdet',
    'embedded_firmware', 'product_manager', 'engineering_manager'
  ];

  for (const role of roles) {
    assert.ok(DEFAULT_2026_SALARY_BENCHMARKS[role], `Role ${role} exists in 2026 baseline`);
    assert.ok(DEFAULT_2026_SALARY_BENCHMARKS[role].mid.us_tier1, `Role ${role} has mid US Tier-1`);
    assert.ok(DEFAULT_2026_SALARY_BENCHMARKS[role].senior.india, `Role ${role} has senior India`);
  }

  // AI / ML premium verification (2026 calibration)
  const sweMidUs = DEFAULT_2026_SALARY_BENCHMARKS.software_engineer.mid.us_tier1[1];
  const aimlMidUs = DEFAULT_2026_SALARY_BENCHMARKS.ai_ml_engineer.mid.us_tier1[1];
  assert.ok(aimlMidUs > sweMidUs, 'AI/ML mid salary is calibrated higher than general SWE in 2026');

  // Open CORS endpoints validation
  assert.ok(OPEN_SALARY_ENDPOINTS.remoteOk.includes('remoteok.com/api'));
  assert.ok(OPEN_SALARY_ENDPOINTS.arbeitnow.includes('arbeitnow.com'));
});

test('ANCHOR_TIERS: provides distinct negotiation leverage multipliers', () => {
  assert.equal(ANCHOR_TIERS.tier_1_big_tech.multiplier, 1.18);
  assert.equal(ANCHOR_TIERS.high_growth.multiplier, 1.06);
  assert.equal(ANCHOR_TIERS.market_median.multiplier, 1.0);
  assert.equal(ANCHOR_TIERS.early_stage.multiplier, 0.88);
});

test('aggregateEmpiricalSalaries: parses and buckets varied job compensation signals', () => {
  const mockJobs = [
    {
      title: 'Senior Frontend Engineer',
      location: 'San Francisco, CA',
      salary: '$190,000 - $230,000 / year'
    },
    {
      title: 'Senior Frontend Developer',
      location: 'San Jose, CA',
      salary_min: 200000,
      salary_max: 240000
    },
    {
      title: 'Staff AI Research Scientist',
      location: 'New York, NY',
      salary: '$350k - $420k'
    },
    {
      title: 'Junior QA Engineer',
      location: 'Bengaluru, India',
      salary: '$18k - $24k'
    },
    {
      title: 'Mystery Role Without Salary',
      location: 'Remote',
      salary: null
    }
  ];

  const { buckets, sampleCount } = aggregateEmpiricalSalaries(mockJobs);
  assert.equal(sampleCount, 4);
  assert.ok(buckets.frontend_engineer.senior.us_tier1.length === 2);
  assert.ok(buckets.ai_ml_engineer.staff.us_tier1.length === 1);
  assert.ok(buckets.qa_sdet.entry.india.length === 1);
});

test('blendBenchmarks: adjusts baseline with anchor tier multiplier and empirical weights', () => {
  const mockEmpirical = {
    software_engineer: {
      senior: {
        us_tier1: [280000, 300000, 320000] // Empirical higher than 258k baseline
      }
    }
  };

  // Standard market median blend
  const blendedMedian = blendBenchmarks(DEFAULT_2026_SALARY_BENCHMARKS, mockEmpirical, 'market_median');
  const baseSeniorSwe = DEFAULT_2026_SALARY_BENCHMARKS.software_engineer.senior.us_tier1[1];
  const blendedSeniorSwe = blendedMedian.software_engineer.senior.us_tier1[1];
  assert.ok(blendedSeniorSwe > baseSeniorSwe, 'Empirical data lifts the calibrated median');

  // Big Tech Anchor Tier multiplier (+18%)
  const bigTechBlended = blendBenchmarks(DEFAULT_2026_SALARY_BENCHMARKS, {}, 'tier_1_big_tech');
  const bigTechMedian = bigTechBlended.software_engineer.senior.us_tier1[1];
  assert.ok(bigTechMedian > baseSeniorSwe * 1.15, 'Big tech multiplier scales benchmark by ~1.18x');

  // Early-Stage Anchor Tier multiplier (-12%)
  const earlyStageBlended = blendBenchmarks(DEFAULT_2026_SALARY_BENCHMARKS, {}, 'early_stage');
  const earlyStageMedian = earlyStageBlended.software_engineer.senior.us_tier1[1];
  assert.ok(earlyStageMedian < baseSeniorSwe, 'Early-stage multiplier discounts cash target');
});

test('parseOpenWebJobSalaries: normalizes open CORS feeds accurately', () => {
  const mockRemoteOk = [
    {
      position: 'Staff SRE Engineer',
      location: 'US Remote',
      salary_min: 190000,
      salary_max: 230000,
      tags: ['devops', 'kubernetes']
    },
    {
      position: 'Unpaid Intern',
      salary_min: 0,
      salary_max: 0
    }
  ];

  const mockArbeitnow = {
    data: [
      {
        title: 'Lead Data Engineer',
        salary: '€95,000 - €120,000',
        remote: true
      }
    ]
  };

  const parsed = parseOpenWebJobSalaries(mockRemoteOk, mockArbeitnow);
  assert.equal(parsed.length, 2);
  assert.equal(parsed[0].title, 'Staff SRE Engineer');
  assert.equal(parsed[0].salary_min, 190000);
  assert.equal(parsed[1].title, 'Lead Data Engineer');
});

test('subscribeToSalaryUpdates & telemetry: emits active calibrated state', () => {
  let latestState = null;
  const unsub = subscribeToSalaryUpdates((state) => {
    latestState = state;
  });

  assert.ok(latestState);
  assert.ok(latestState.benchmarks);
  assert.ok(typeof unsub === 'function');
  unsub();

  const telemetry = getSalaryCalibrationTelemetry();
  assert.ok(telemetry.badgeText);
  assert.ok(telemetry.anchorTierInfo);
  assert.equal(typeof telemetry.sampleCount, 'number');
});

test('setNegotiationAnchorTier: updates active tier and notifies listeners', async () => {
  let notifiedState = null;
  const unsub = subscribeToSalaryUpdates((state) => {
    notifiedState = state;
  });

  await setNegotiationAnchorTier('tier_1_big_tech');
  assert.equal(notifiedState.anchorTier, 'tier_1_big_tech');
  unsub();

  // Reset back to market_median
  await setNegotiationAnchorTier('market_median');
  assert.equal(getActiveSalaryBenchmarks().software_engineer.mid.us_tier1[1], DEFAULT_2026_SALARY_BENCHMARKS.software_engineer.mid.us_tier1[1]);
});

test('updateSalaryBenchmarks: updates in-memory engine and updates calibration disclaimer', () => {
  const custom = {
    software_engineer: {
      mid: {
        us_tier1: [180000, 210000, 250000]
      }
    }
  };

  updateSalaryBenchmarks(custom, {
    source: 'Test Custom Ingestion',
    lastUpdated: 'October 2026',
    sampleCount: 15
  });

  assert.equal(COMP_BENCHMARKS.software_engineer.mid.us_tier1[1], 210000);
  assert.equal(SALARY_CALIBRATION_METADATA.sampleCount, 15);
  assert.equal(SALARY_CALIBRATION_METADATA.isLive, true);
  assert.match(getSalaryCalibrationDisclaimer(), /15 active ATS job postings/);
});
