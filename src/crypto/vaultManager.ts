import { db } from '../db/dexieClient';
import { CURRENT_FORMAT_VERSION } from '../db/schema';
import type { VaultMeta } from '../db/schema';
import { deriveKeyFromPassphrase, generateSalt, PBKDF2_ITERATIONS } from './kdf';
import { createAndWrapNewMEK, unwrapMEKForSession, rewrapMEK } from './keys';

export class IncorrectPassphraseError extends Error {
  constructor() {
    super('Incorrect passphrase.');
    this.name = 'IncorrectPassphraseError';
  }
}

export class NoVaultExistsError extends Error {
  constructor() {
    super('No vault has been created on this device yet.');
    this.name = 'NoVaultExistsError';
  }
}

export interface CreateVaultResult {
  sessionKey: CryptoKey;
  /** A human-readable recovery code, shown ONCE. Never stored by the app. */
  recoveryCode?: string;
}

/** Generates a recovery code: 8 groups of 4 alphanumeric characters, e.g. "X7K2-9QRT-...". Not persisted anywhere — it only exists in the returned string and whatever the user writes down. */
function generateRecoveryCode(): string {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I to avoid transcription errors
  const groups: string[] = [];
  for (let g = 0; g < 8; g++) {
    let group = '';
    const randomBytes = crypto.getRandomValues(new Uint8Array(4));
    for (let i = 0; i < 4; i++) {
      group += alphabet[randomBytes[i] % alphabet.length];
    }
    groups.push(group);
  }
  return groups.join('-');
}

export async function vaultExists(): Promise<boolean> {
  const meta = await db.vaultMeta.get('singleton');
  return meta !== undefined;
}

/**
 * Creates a brand-new vault. `withRecoveryCode: true` also wraps the same
 * MEK under a second, independently-derived key so the user has a fallback
 * if they forget their passphrase. The recovery code is returned exactly
 * once and is never written to storage — if the user doesn't save it, it's
 * gone, same as the passphrase would be.
 */
export async function createVault(
  passphrase: string,
  withRecoveryCode: boolean
): Promise<CreateVaultResult> {
  if (await vaultExists()) {
    throw new Error('A vault already exists on this device.');
  }

  const kdfSalt = generateSalt();
  const kek = await deriveKeyFromPassphrase(passphrase, kdfSalt);
  const { wrappedKey, sessionKey } = await createAndWrapNewMEK(kek);

  const meta: VaultMeta = {
    id: 'singleton',
    formatVersion: CURRENT_FORMAT_VERSION,
    kdfSalt,
    kdfIterations: PBKDF2_ITERATIONS,
    wrappedMEK: wrappedKey,
    lockTimeoutMinutes: 5,
    createdAt: Date.now(),
    updatedAt: Date.now()
  };

  let recoveryCode: string | undefined;

  if (withRecoveryCode) {
    recoveryCode = generateRecoveryCode();
    const recoverySalt = generateSalt();
    const recoveryKek = await deriveKeyFromPassphrase(recoveryCode, recoverySalt);

    // Re-wrap the SAME MEK under the recovery key. We need the extractable
    // MEK again momentarily to do this — createAndWrapNewMEK already
    // discarded its extractable reference, so we unwrap-then-rewrap using
    // the passphrase path we just created.
    const recoveryWrapped = await rewrapMEK(kek, wrappedKey, recoveryKek);

    meta.recovery = {
      kdfSalt: recoverySalt,
      kdfIterations: PBKDF2_ITERATIONS,
      wrappedMEK: recoveryWrapped
    };
  }

  await db.vaultMeta.put(meta);

  return { sessionKey, recoveryCode };
}

/** Unlocks the vault with the user's passphrase. Throws IncorrectPassphraseError on failure. */
export async function unlockWithPassphrase(passphrase: string): Promise<CryptoKey> {
  const meta = await db.vaultMeta.get('singleton');
  if (!meta) throw new NoVaultExistsError();

  const kek = await deriveKeyFromPassphrase(passphrase, meta.kdfSalt, meta.kdfIterations);

  try {
    return await unwrapMEKForSession(kek, meta.wrappedMEK);
  } catch {
    // AES-GCM unwrap fails with an integrity error on a wrong key — this
    // IS the passphrase check. We deliberately don't distinguish the
    // failure reason further.
    throw new IncorrectPassphraseError();
  }
}

/** Unlocks the vault using a recovery code instead of the passphrase. */
export async function unlockWithRecoveryCode(recoveryCode: string): Promise<CryptoKey> {
  const meta = await db.vaultMeta.get('singleton');
  if (!meta) throw new NoVaultExistsError();
  if (!meta.recovery) throw new Error('No recovery code was set up for this vault.');

  const kek = await deriveKeyFromPassphrase(
    recoveryCode.toUpperCase(),
    meta.recovery.kdfSalt,
    meta.recovery.kdfIterations
  );

  try {
    return await unwrapMEKForSession(kek, meta.recovery.wrappedMEK);
  } catch {
    throw new IncorrectPassphraseError();
  }
}

/**
 * Changes the vault passphrase. Requires the current passphrase — this is
 * NOT an admin reset, it's a re-wrap operation that only someone who
 * already holds a valid key (passphrase or recovery code) can perform.
 */
export async function changePassphrase(currentPassphrase: string, newPassphrase: string): Promise<void> {
  const meta = await db.vaultMeta.get('singleton');
  if (!meta) throw new NoVaultExistsError();

  const oldKek = await deriveKeyFromPassphrase(currentPassphrase, meta.kdfSalt, meta.kdfIterations);

  // Verify the current passphrase by attempting an unwrap before doing anything else.
  try {
    await unwrapMEKForSession(oldKek, meta.wrappedMEK);
  } catch {
    throw new IncorrectPassphraseError();
  }

  const newSalt = generateSalt();
  const newKek = await deriveKeyFromPassphrase(newPassphrase, newSalt);

  const newWrapped = await rewrapMEK(oldKek, meta.wrappedMEK, newKek);

  await db.vaultMeta.update('singleton', {
    kdfSalt: newSalt,
    kdfIterations: PBKDF2_ITERATIONS,
    wrappedMEK: newWrapped,
    updatedAt: Date.now()
  });
}

export async function getLockTimeoutMinutes(): Promise<number> {
  const meta = await db.vaultMeta.get('singleton');
  return meta?.lockTimeoutMinutes ?? 5;
}

export async function setLockTimeoutMinutes(minutes: number): Promise<void> {
  await db.vaultMeta.update('singleton', { lockTimeoutMinutes: minutes, updatedAt: Date.now() });
}
