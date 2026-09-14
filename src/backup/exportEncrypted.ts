import { db } from '../db/dexieClient';
import { bytesToBase64 } from '../utils/base64';
import type { BackupFile } from './backupFormat';

const APP_VERSION = '0.1.0';

/**
 * Builds the full encrypted backup and triggers a browser download. Never
 * touches the network — this is a local file save, nothing more.
 */
export async function exportEncryptedBackup(): Promise<void> {
  const meta = await db.vaultMeta.get('singleton');
  if (!meta) throw new Error('No vault exists to back up.');

  const records = await db.records.toArray();

  const backup: BackupFile = {
    formatVersion: 1,
    appVersion: APP_VERSION,
    exportedAt: Date.now(),
    vaultMeta: {
      formatVersion: meta.formatVersion,
      kdfSalt: bytesToBase64(meta.kdfSalt),
      kdfIterations: meta.kdfIterations,
      wrappedMEK: {
        iv: bytesToBase64(meta.wrappedMEK.iv),
        wrapped: bytesToBase64(meta.wrappedMEK.wrapped)
      },
      recovery: meta.recovery
        ? {
            kdfSalt: bytesToBase64(meta.recovery.kdfSalt),
            kdfIterations: meta.recovery.kdfIterations,
            wrappedMEK: {
              iv: bytesToBase64(meta.recovery.wrappedMEK.iv),
              wrapped: bytesToBase64(meta.recovery.wrappedMEK.wrapped)
            }
          }
        : undefined,
      lockTimeoutMinutes: meta.lockTimeoutMinutes
    },
    records: records.map((r) => ({
      id: r.id,
      type: r.type,
      accountId: r.accountId,
      yearMonth: r.yearMonth,
      iv: bytesToBase64(r.iv),
      ciphertext: bytesToBase64(r.ciphertext),
      payloadVersion: r.payloadVersion,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }))
  };

  const blob = new Blob([JSON.stringify(backup)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const dateStamp = new Date().toISOString().slice(0, 10);

  const a = document.createElement('a');
  a.href = url;
  a.download = `local-budget-backup-${dateStamp}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
