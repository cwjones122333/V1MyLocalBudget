import { db } from '../db/dexieClient';
import { base64ToBytes } from '../utils/base64';
import type { BackupFile } from './backupFormat';
import type { EncryptedRecord, VaultMeta } from '../db/schema';
import { vaultExists } from '../crypto/vaultManager';

export class VaultAlreadyExistsError extends Error {
  constructor() {
    super('A vault already exists on this device. Restoring a backup would overwrite it.');
    this.name = 'VaultAlreadyExistsError';
  }
}

export class InvalidBackupFileError extends Error {
  constructor(reason: string) {
    super(`This doesn't look like a valid backup file: ${reason}`);
    this.name = 'InvalidBackupFileError';
  }
}

function parseBackupFile(raw: string): BackupFile {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new InvalidBackupFileError('not valid JSON.');
  }

  const obj = parsed as Partial<BackupFile>;
  if (obj.formatVersion !== 1) {
    throw new InvalidBackupFileError('unrecognized or missing format version.');
  }
  if (!obj.vaultMeta || !Array.isArray(obj.records)) {
    throw new InvalidBackupFileError('missing vault metadata or records.');
  }

  return obj as BackupFile;
}

/**
 * Restores a vault from an encrypted backup file. Refuses to overwrite an
 * existing vault on this device — if you want to replace it, delete the
 * current vault first (a separate, explicit action) rather than having
 * import silently clobber it.
 */
export async function importEncryptedBackup(fileContents: string): Promise<void> {
  if (await vaultExists()) {
    throw new VaultAlreadyExistsError();
  }

  const backup = parseBackupFile(fileContents);

  const meta: VaultMeta = {
    id: 'singleton',
    formatVersion: backup.vaultMeta.formatVersion,
    kdfSalt: base64ToBytes(backup.vaultMeta.kdfSalt),
    kdfIterations: backup.vaultMeta.kdfIterations,
    wrappedMEK: {
      iv: base64ToBytes(backup.vaultMeta.wrappedMEK.iv),
      wrapped: base64ToBytes(backup.vaultMeta.wrappedMEK.wrapped)
    },
    recovery: backup.vaultMeta.recovery
      ? {
          kdfSalt: base64ToBytes(backup.vaultMeta.recovery.kdfSalt),
          kdfIterations: backup.vaultMeta.recovery.kdfIterations,
          wrappedMEK: {
            iv: base64ToBytes(backup.vaultMeta.recovery.wrappedMEK.iv),
            wrapped: base64ToBytes(backup.vaultMeta.recovery.wrappedMEK.wrapped)
          }
        }
      : undefined,
    lockTimeoutMinutes: backup.vaultMeta.lockTimeoutMinutes,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  const records: EncryptedRecord[] = backup.records.map((r) => ({
    id: r.id,
    type: r.type as EncryptedRecord['type'],
    accountId: r.accountId,
    yearMonth: r.yearMonth,
    iv: base64ToBytes(r.iv),
    ciphertext: base64ToBytes(r.ciphertext),
    payloadVersion: r.payloadVersion,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt
  }));

  await db.transaction('rw', db.vaultMeta, db.records, async () => {
    await db.vaultMeta.put(meta);
    if (records.length > 0) {
      await db.records.bulkPut(records);
    }
  });
}
