import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EARLY_CAREER_DRIVES, filterEarlyCareerDrives } from './early_career_drives_service.js';

describe('early_career_drives_service', () => {
  it('contains verified entry-level drives including TCS NQT, Infosys, Wipro, and Google STEP', () => {
    assert.ok(EARLY_CAREER_DRIVES.length >= 7);
    const ids = EARLY_CAREER_DRIVES.map(d => d.id);
    assert.ok(ids.includes('tcs_nqt'));
    assert.ok(ids.includes('infosys_dse_sp'));
    assert.ok(ids.includes('wipro_elite_nth'));
    assert.ok(ids.includes('cognizant_genc'));
    assert.ok(ids.includes('accenture_india_ase'));
    assert.ok(ids.includes('google_step_intern'));
    assert.ok(ids.includes('microsoft_explore_intern'));
  });

  it('ensures every drive has official URLs, eligibility batches, and compensation bands', () => {
    for (const drive of EARLY_CAREER_DRIVES) {
      assert.ok(drive.company, 'drive must have company');
      assert.ok(drive.drive_title, 'drive must have drive_title');
      assert.ok(drive.official_portal_url.startsWith('https://'), 'drive must have secure official URL');
      assert.ok(Array.isArray(drive.batch_eligibility) && drive.batch_eligibility.length > 0);
      assert.ok(Array.isArray(drive.compensation_bands) && drive.compensation_bands.length > 0);
      assert.ok(drive.minimum_criteria);
    }
  });

  it('filters drives by target graduation batch', () => {
    const drives2026 = filterEarlyCareerDrives({ batch: '2026' });
    assert.ok(drives2026.length >= 5);
    for (const d of drives2026) {
      assert.ok(d.batch_eligibility.includes('2026'));
    }
  });

  it('filters drives by search query', () => {
    const tcsResults = filterEarlyCareerDrives({ searchQuery: 'TCS' });
    assert.equal(tcsResults.length, 1);
    assert.equal(tcsResults[0].id, 'tcs_nqt');
  });
});
