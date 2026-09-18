import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { REGIONS, REGIONAL_ATS_COMPANIES, getRegionalCompanies, getRegionalStats, detectCandidateRegionFromScope } from './regional_ats_registries.js';

describe('regional_ats_registries', () => {
  it('defines 7 core regions including India & GCCs, North America, Europe, APAC, LatAm, and Remote', () => {
    assert.equal(REGIONS.length, 7);
    const ids = REGIONS.map(r => r.id);
    assert.ok(ids.includes('all'));
    assert.ok(ids.includes('india_gccs'));
    assert.ok(ids.includes('north_america'));
    assert.ok(ids.includes('europe_uk'));
    assert.ok(ids.includes('apac'));
    assert.ok(ids.includes('latam'));
    assert.ok(ids.includes('global_remote'));
  });

  it('contains Indian product unicorns and GCCs in india_gccs registry', () => {
    const indiaGh = REGIONAL_ATS_COMPANIES.india_gccs.greenhouse;
    assert.ok(Array.isArray(indiaGh));
    assert.ok(indiaGh.includes('swiggy'));
    assert.ok(indiaGh.includes('razorpay'));
    assert.ok(indiaGh.includes('cred'));
    assert.ok(indiaGh.includes('groww'));
    assert.ok(indiaGh.includes('meesho'));
    assert.ok(indiaGh.includes('browserstack'));
    assert.ok(indiaGh.includes('hasura'));
    assert.ok(indiaGh.includes('freshworks'));
  });

  it('returns filtered company slugs for specific region via getRegionalCompanies', () => {
    const indiaGh = getRegionalCompanies('india_gccs', 'greenhouse');
    assert.ok(indiaGh.includes('swiggy'));
    assert.ok(!indiaGh.includes('reddit')); // Reddit is in North America

    const naGh = getRegionalCompanies('north_america', 'greenhouse');
    assert.ok(naGh.includes('reddit'));
    assert.ok(naGh.includes('figma'));
  });

  it('calculates regional statistics across all catalogs', () => {
    const stats = getRegionalStats();
    assert.ok(stats.india_gccs > 40);
    assert.ok(stats.north_america > 40);
    assert.ok(stats.europe_uk > 20);
    assert.ok(stats.apac > 10);
  });

  it('detectCandidateRegionFromScope: accurately resolves region from candidate scope', () => {
    // 1. India scope (all 28 Indian hubs or specific cities)
    const indiaScope = {
      locations: [
        { label: 'Bengaluru', preference: 'apply' },
        { label: 'Hyderabad', preference: 'apply' },
        { label: 'Pune', preference: 'apply' }
      ]
    };
    assert.equal(detectCandidateRegionFromScope(indiaScope), 'india_gccs');

    // 2. North America scope
    const usScope = {
      locations: [
        { label: 'San Francisco Bay Area', preference: 'apply' },
        { label: 'New York', preference: 'apply' }
      ]
    };
    assert.equal(detectCandidateRegionFromScope(usScope), 'north_america');

    // 3. Europe scope
    const euScope = {
      locations: [
        { label: 'Berlin', preference: 'apply' },
        { label: 'London', preference: 'apply' }
      ]
    };
    assert.equal(detectCandidateRegionFromScope(euScope), 'europe_uk');

    // 4. Empty scope defaults to 'all'
    assert.equal(detectCandidateRegionFromScope(null), 'all');
    assert.equal(detectCandidateRegionFromScope({ locations: [] }), 'all');
  });
});
