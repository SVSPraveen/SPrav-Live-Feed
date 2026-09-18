/**
 * Periodic Vault Backup Checkpoints Engine
 * 
 * Provides automated, non-intrusive checkpoint detection to encourage sovereign users
 * to export encrypted local backups after every 25th job application milestone (25, 50, 75, etc.).
 */

export const CHECKPOINT_INTERVAL = 25;
export const STORAGE_KEY_DISMISSED = 'sprav_backup_checkpoint_last_dismissed';
export const STORAGE_KEY_EXPORTED = 'sprav_backup_last_exported_at';

/**
 * Evaluates whether a backup checkpoint prompt should be surfaced to the candidate.
 * Triggers after every 25th application (25, 50, 75, 100, etc.) if not already dismissed or exported.
 * 
 * @param {number} applicationCount 
 * @param {Storage} [storageEngine] - Defaults to window.localStorage
 * @returns {{ shouldPrompt: boolean, milestone: number, applicationCount: number, lastExportedAt: string|null }}
 */
export function evaluateBackupCheckpoint(applicationCount, storageEngine = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  const count = Number(applicationCount);
  if (!Number.isFinite(count) || count < CHECKPOINT_INTERVAL) {
    return { shouldPrompt: false, milestone: 0, applicationCount: count || 0, lastExportedAt: null };
  }

  // Calculate the highest milestone achieved (25, 50, 75...)
  const milestone = Math.floor(count / CHECKPOINT_INTERVAL) * CHECKPOINT_INTERVAL;
  if (milestone < CHECKPOINT_INTERVAL) {
    return { shouldPrompt: false, milestone: 0, applicationCount: count, lastExportedAt: null };
  }

  let lastDismissed = 0;
  let lastExportedAt = null;

  if (storageEngine) {
    try {
      const storedDismissed = storageEngine.getItem(STORAGE_KEY_DISMISSED);
      if (storedDismissed) lastDismissed = parseInt(storedDismissed, 10) || 0;
      lastExportedAt = storageEngine.getItem(STORAGE_KEY_EXPORTED);
    } catch {
      // Storage access blocked or restricted
    }
  }

  // If candidate has already dismissed or handled this milestone
  if (lastDismissed >= milestone) {
    return { shouldPrompt: false, milestone, applicationCount: count, lastExportedAt };
  }

  return {
    shouldPrompt: true,
    milestone,
    applicationCount: count,
    lastExportedAt
  };
}

/**
 * Records that the candidate has dismissed or snoozed the prompt for the current milestone.
 * 
 * @param {number} milestone 
 * @param {Storage} [storageEngine] 
 */
export function dismissBackupCheckpoint(milestone, storageEngine = (typeof localStorage !== 'undefined' ? localStorage : null)) {
  if (!storageEngine || !milestone) return;
  try {
    storageEngine.setItem(STORAGE_KEY_DISMISSED, String(milestone));
  } catch (err) {
    console.warn('[BackupCheckpoint] Could not persist dismissal milestone:', err);
  }
}

/**
 * Exports the full sovereign vault and triggers a browser file download.
 * Also marks the milestone as fulfilled and records the export timestamp.
 * 
 * @param {Object} storageVaultInstance 
 * @param {number} [milestone] 
 * @param {Storage} [storageEngine] 
 * @returns {Promise<{ success: boolean, filename: string, timestamp: string }>}
 */
export async function exportAndDownloadVaultBackup(
  storageVaultInstance, 
  milestone = 0, 
  storageEngine = (typeof localStorage !== 'undefined' ? localStorage : null)
) {
  if (!storageVaultInstance || typeof storageVaultInstance.exportFullVaultBackup !== 'function') {
    throw new Error('Valid StorageVault instance is required to export backup');
  }

  const jsonString = await storageVaultInstance.exportFullVaultBackup();
  const timestamp = new Date().toISOString();
  const dateStr = timestamp.split('T')[0];
  const filename = `sprav_career_vault_backup_${dateStr}_milestone${milestone || 'save'}.json`;

  if (typeof document !== 'undefined' && typeof Blob !== 'undefined') {
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }

  if (storageEngine) {
    try {
      storageEngine.setItem(STORAGE_KEY_EXPORTED, timestamp);
      if (milestone > 0) {
        storageEngine.setItem(STORAGE_KEY_DISMISSED, String(milestone));
      }
    } catch {
      // Ignore storage persistence failure
    }
  }

  return { success: true, filename, timestamp };
}
