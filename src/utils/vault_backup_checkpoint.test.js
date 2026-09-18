import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  evaluateBackupCheckpoint, 
  dismissBackupCheckpoint, 
  exportAndDownloadVaultBackup, 
  CHECKPOINT_INTERVAL 
} from './vault_backup_checkpoint.js';

class MockStorage {
  constructor() {
    this.store = new Map();
  }
  getItem(key) {
    return this.store.get(key) || null;
  }
  setItem(key, val) {
    this.store.set(key, String(val));
  }
  removeItem(key) {
    this.store.delete(key);
  }
  clear() {
    this.store.clear();
  }
}

test('evaluateBackupCheckpoint: does not prompt when count is below 25', () => {
  const mockStorage = new MockStorage();
  
  assert.equal(evaluateBackupCheckpoint(0, mockStorage).shouldPrompt, false);
  assert.equal(evaluateBackupCheckpoint(10, mockStorage).shouldPrompt, false);
  assert.equal(evaluateBackupCheckpoint(24, mockStorage).shouldPrompt, false);
});

test('evaluateBackupCheckpoint: prompts when count reaches exactly 25 or above', () => {
  const mockStorage = new MockStorage();
  
  const res25 = evaluateBackupCheckpoint(25, mockStorage);
  assert.equal(res25.shouldPrompt, true);
  assert.equal(res25.milestone, 25);
  assert.equal(res25.applicationCount, 25);

  const res28 = evaluateBackupCheckpoint(28, mockStorage);
  assert.equal(res28.shouldPrompt, true);
  assert.equal(res28.milestone, 25);
});

test('evaluateBackupCheckpoint: respects dismissal until next 25-application milestone', () => {
  const mockStorage = new MockStorage();
  
  // Prompt at 25
  const res1 = evaluateBackupCheckpoint(25, mockStorage);
  assert.equal(res1.shouldPrompt, true);

  // Candidate dismisses milestone 25
  dismissBackupCheckpoint(25, mockStorage);

  // Subsequent check at 26 should not prompt
  const res2 = evaluateBackupCheckpoint(26, mockStorage);
  assert.equal(res2.shouldPrompt, false);

  // Check at 49 should still not prompt
  const res3 = evaluateBackupCheckpoint(49, mockStorage);
  assert.equal(res3.shouldPrompt, false);

  // Check at milestone 50 should prompt again!
  const res4 = evaluateBackupCheckpoint(50, mockStorage);
  assert.equal(res4.shouldPrompt, true);
  assert.equal(res4.milestone, 50);
});

test('exportAndDownloadVaultBackup calls export and updates storage', async () => {
  const mockStorage = new MockStorage();
  let exportCalled = false;

  const mockVault = {
    async exportFullVaultBackup() {
      exportCalled = true;
      return JSON.stringify({ version: 3, items: [] });
    }
  };

  const result = await exportAndDownloadVaultBackup(mockVault, 25, mockStorage);
  assert.equal(result.success, true);
  assert.equal(exportCalled, true);
  assert.ok(result.filename.includes('milestone25'));

  // Should have marked dismissed for 25
  const check = evaluateBackupCheckpoint(25, mockStorage);
  assert.equal(check.shouldPrompt, false);
});
