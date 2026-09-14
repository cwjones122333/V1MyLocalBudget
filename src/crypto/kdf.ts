/**
 * Passphrase -> Key-Encryption-Key (KEK) derivation.
 *
 * We use PBKDF2-HMAC-SHA256 via native WebCrypto. This is not the strongest
 * possible choice (Argon2id is more resistant to GPU/ASIC brute force) but
 * it requires zero extra dependencies and WebCrypto's implementation is
 * well-audited and hardware-accelerated. See the Phase 1 writeup for the
 * Argon2id tradeoff discussion — this can be swapped in later behind the
 * same function signature without touching call sites.
 */

// OWASP's 2023 minimum recommendation for PBKDF2-HMAC-SHA256. Tune this
// after benchmarking on a real phone if unlock feels too slow or too fast.
export const PBKDF2_ITERATIONS = 600_000;
export const SALT_LENGTH_BYTES = 16;

export function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH_BYTES));
}

/**
 * Derives a non-extractable AES-GCM key from a passphrase and salt.
 * "Non-extractable" means the raw key bytes can never be read back out of
 * the CryptoKey object by application code (ours or an attacker's, short of
 * a browser engine bug) — only used for encrypt/decrypt operations.
 */
export async function deriveKeyFromPassphrase(
  passphrase: string,
  salt: Uint8Array,
  iterations: number = PBKDF2_ITERATIONS
): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256'
    },
    baseKey,
    { name: 'AES-GCM', length: 256 },
    false, // non-extractable
    ['wrapKey', 'unwrapKey']
  );
}
