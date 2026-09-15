import { db } from '../db/dexieClient';
import { encryptPayload, decryptPayload } from '../crypto/aes';
import { useVaultStore } from '../store/vaultStore';
import { useDataVersionStore } from '../store/dataVersionStore';
import type { EncryptedRecord, RecordType } from '../db/schema';
import { CURRENT_PAYLOAD_VERSION } from '../db/schema';

export class VaultLockedError extends Error {
  constructor() {
    super('The vault is locked.');
    this.name = 'VaultLockedError';
  }
}

function requireSessionKey(): CryptoKey {
  const key = useVaultStore.getState().sessionKey;
  if (!key) throw new VaultLockedError();
  return key;
}

export interface DecryptedRow<T> {
  id: string;
  payload: T;
  accountId: string | null;
  yearMonth: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface PutRecordParams<T> {
  id: string;
  type: RecordType;
  accountId: string | null;
  yearMonth: string | null;
  payload: T;
  /** Preserve the original creation timestamp when updating an existing record. */
  createdAt?: number;
}

export async function putRecord<T>(params: PutRecordParams<T>): Promise<void> {
  const key = requireSessionKey();
  const sealed = await encryptPayload(key, params.payload);
  const now = Date.now();

  const record: EncryptedRecord = {
    id: params.id,
    type: params.type,
    accountId: params.accountId,
    yearMonth: params.yearMonth,
    iv: sealed.iv,
    ciphertext: sealed.ciphertext,
    payloadVersion: CURRENT_PAYLOAD_VERSION,
    createdAt: params.createdAt ?? now,
    updatedAt: now
  };

  await db.records.put(record);
  useDataVersionStore.getState().bump();
}

export async function getRecord<T>(id: string): Promise<T | null> {
  const key = requireSessionKey();
  const record = await db.records.get(id);
  if (!record) return null;
  return decryptPayload<T>(key, { iv: record.iv, ciphertext: record.ciphertext });
}

export async function getRecordWithMeta<T>(id: string): Promise<DecryptedRow<T> | null> {
  const key = requireSessionKey();
  const record = await db.records.get(id);
  if (!record) return null;
  return {
    id: record.id,
    payload: await decryptPayload<T>(key, { iv: record.iv, ciphertext: record.ciphertext }),
    accountId: record.accountId,
    yearMonth: record.yearMonth,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt
  };
}

export async function listRecordsByType<T>(type: RecordType): Promise<DecryptedRow<T>[]> {
  const key = requireSessionKey();
  const records = await db.records.where('type').equals(type).toArray();
  return Promise.all(
    records.map(async (r) => ({
      id: r.id,
      payload: await decryptPayload<T>(key, { iv: r.iv, ciphertext: r.ciphertext }),
      accountId: r.accountId,
      yearMonth: r.yearMonth,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }))
  );
}

export async function listRecordsByTypeAndAccount<T>(type: RecordType, accountId: string): Promise<DecryptedRow<T>[]> {
  const key = requireSessionKey();
  const records = await db.records.where('[type+accountId]').equals([type, accountId]).toArray();
  return Promise.all(
    records.map(async (r) => ({
      id: r.id,
      payload: await decryptPayload<T>(key, { iv: r.iv, ciphertext: r.ciphertext }),
      accountId: r.accountId,
      yearMonth: r.yearMonth,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt
    }))
  );
}

export async function deleteRecord(id: string): Promise<void> {
  await db.records.delete(id);
  useDataVersionStore.getState().bump();
}
