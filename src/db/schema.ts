// This file defines only the PLAINTEXT shape Dexie/IndexedDB ever sees.
// The actual financial data (merchant, amount, notes, etc.) lives inside
// `ciphertext` and is opaque without the vault's Master Encryption Key.
// See src/types/domain.ts for the decrypted payload shapes, and
// src/crypto/aes.ts for how records get sealed/opened.

export type RecordType = 'account' | 'transaction' | 'category' | 'budget' | 'rule';

export interface EncryptedRecord {
  id: string; // UUID
  type: RecordType;
  /** Plaintext FK — needed to query "this account's records" without decrypting everything. Not sensitive on its own. */
  accountId: string | null;
  /** Plaintext "YYYY-MM" bucket — needed to query a given month's data. Not sensitive on its own. */
  yearMonth: string | null;
  iv: Uint8Array<ArrayBuffer>;
  ciphertext: Uint8Array<ArrayBuffer>;
  /** Version of the decrypted payload's shape, for future migrations. */
  payloadVersion: number;
  createdAt: number;
  updatedAt: number;
}

/**
 * Vault-level metadata. This is NOT financial data and is intentionally
 * left in plaintext — a KDF salt and a wrapped key are not secret by
 * themselves; without the passphrase (or recovery code) they're useless.
 * There is exactly one row in this table, keyed by `id: 'singleton'`.
 */
export interface VaultMeta {
  id: 'singleton';
  formatVersion: number;
  kdfSalt: Uint8Array<ArrayBuffer>;
  kdfIterations: number;
  wrappedMEK: {
    iv: Uint8Array<ArrayBuffer>;
    wrapped: Uint8Array<ArrayBuffer>;
  };
  /** Present only if the user opted in to a recovery code at creation. */
  recovery?: {
    kdfSalt: Uint8Array<ArrayBuffer>;
    kdfIterations: number;
    wrappedMEK: {
      iv: Uint8Array<ArrayBuffer>;
      wrapped: Uint8Array<ArrayBuffer>;
    };
  };
  lockTimeoutMinutes: number; // 0 = lock immediately on app close
  createdAt: number;
  updatedAt: number;
}

export const CURRENT_FORMAT_VERSION = 1;
export const CURRENT_PAYLOAD_VERSION = 1;
