/**
 * Envelope encryption key management.
 *
 * - The Master Encryption Key (MEK) is a random AES-256 key generated once
 *   at vault creation. It directly encrypts every financial record and
 *   never changes for the life of the vault (unless explicitly rotated).
 * - The Key-Encryption Key (KEK) is derived from the user's passphrase
 *   (see kdf.ts) and is only ever used to "wrap" (encrypt) or "unwrap"
 *   (decrypt) the MEK — never to touch financial data directly.
 *
 * Why: changing your passphrase only requires re-wrapping the MEK, not
 * re-encrypting the entire database. It also means a second unlock method
 * (like the recovery code) can wrap the same MEK independently.
 *
 * A note on `extractable`: WebCrypto's wrapKey() requires the key you're
 * wrapping to have been generated as extractable. We generate the MEK as
 * extractable ONLY long enough to wrap it, then immediately re-derive a
 * NON-extractable working copy for actual use during the session (see
 * unwrapMEKForSession below). This limits, but does not eliminate, the
 * window in which raw key bytes could theoretically be pulled out of the
 * CryptoKey object by code running in the page. This is the same class of
 * "unlocked session" exposure described in the Phase 1 threat model — it
 * isn't a new hole, just being explicit about where it lives.
 */

 const WRAP_IV_LENGTH_BYTES = 12;

 export interface WrappedKey {
   iv: Uint8Array<ArrayBuffer>;
   wrapped: Uint8Array<ArrayBuffer>;
 }
 
 /** Generates a brand-new random 256-bit MEK. Extractable so it can be wrapped once, immediately below. */
 async function generateExtractableMEK(): Promise<CryptoKey> {
   return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
     'encrypt',
     'decrypt'
   ]);
 }
 
 async function wrapMEK(kek: CryptoKey, mek: CryptoKey): Promise<WrappedKey> {
   const iv = crypto.getRandomValues(new Uint8Array(WRAP_IV_LENGTH_BYTES));
   const wrappedBuffer = await crypto.subtle.wrapKey('raw', mek, kek, {
     name: 'AES-GCM',
     iv
   });
   return { iv, wrapped: new Uint8Array(wrappedBuffer) };
 }
 
 /**
  * Unwraps a wrapped MEK into a NON-extractable working key, suitable for
  * the entire unlocked session. Throws if `kek` is wrong (wrong passphrase)
  * — this failure IS the passphrase verification; there is no separate
  * password hash stored anywhere.
  */
 export async function unwrapMEKForSession(kek: CryptoKey, wrappedKey: WrappedKey): Promise<CryptoKey> {
   return crypto.subtle.unwrapKey(
     'raw',
     wrappedKey.wrapped,
     kek,
     { name: 'AES-GCM', iv: wrappedKey.iv },
     { name: 'AES-GCM', length: 256 },
     false, // non-extractable working copy
     ['encrypt', 'decrypt']
   );
 }
 
 /**
  * Creates a brand new MEK and wraps it once under the given KEK.
  * Returns both the wrapped form (to persist) and a non-extractable session
  * copy (to use immediately, without ever persisting the extractable one).
  */
 export async function createAndWrapNewMEK(
   kek: CryptoKey
 ): Promise<{ wrappedKey: WrappedKey; sessionKey: CryptoKey }> {
   const extractableMEK = await generateExtractableMEK();
   const wrappedKey = await wrapMEK(kek, extractableMEK);
   const sessionKey = await unwrapMEKForSession(kek, wrappedKey);
   return { wrappedKey, sessionKey };
 }
 
 /**
  * Used when changing the passphrase or adding a recovery-code wrapping:
  * unwraps the MEK as extractable (briefly) under the OLD kek, then wraps it
  * under a NEW kek. The extractable reference is not returned or persisted.
  */
 export async function rewrapMEK(oldKek: CryptoKey, wrappedKey: WrappedKey, newKek: CryptoKey): Promise<WrappedKey> {
   const extractableMEK = await crypto.subtle.unwrapKey(
     'raw',
     wrappedKey.wrapped,
     oldKek,
     { name: 'AES-GCM', iv: wrappedKey.iv },
     { name: 'AES-GCM', length: 256 },
     true, // must be extractable to wrap again
     ['encrypt', 'decrypt']
   );
   return wrapMEK(newKek, extractableMEK);
 }
 
