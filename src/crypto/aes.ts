/**
 * Generic AES-GCM encrypt/decrypt for JSON-serializable payloads, used to
 * seal/open individual record payloads (transactions, accounts, etc.) with
 * the vault's Master Encryption Key (MEK).
 *
 * A fresh random IV is generated for every single call to encryptPayload —
 * IVs must never be reused with the same key under AES-GCM. We store the IV
 * alongside the ciphertext (it is not secret) so decryption can reuse it.
 */

 export const IV_LENGTH_BYTES = 12;

 export interface Sealed {
   iv: Uint8Array<ArrayBuffer>;
   ciphertext: Uint8Array<ArrayBuffer>;
 }
 
 export async function encryptPayload<T>(key: CryptoKey, payload: T): Promise<Sealed> {
   const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH_BYTES));
   const encoder = new TextEncoder();
   const plaintext = encoder.encode(JSON.stringify(payload));
 
   const ciphertextBuffer = await crypto.subtle.encrypt(
     { name: 'AES-GCM', iv },
     key,
     plaintext
   );
 
   return { iv, ciphertext: new Uint8Array(ciphertextBuffer) };
 }
 
 /**
  * Decrypts a sealed record. Throws if the key is wrong or the ciphertext
  * has been tampered with — AES-GCM's authentication tag makes silent
  * corruption impossible; a wrong key or modified bytes fails loudly here.
  */
 export async function decryptPayload<T>(key: CryptoKey, sealed: Sealed): Promise<T> {
   const plaintextBuffer = await crypto.subtle.decrypt(
     { name: 'AES-GCM', iv: sealed.iv },
     key,
     sealed.ciphertext
   );
 
   const decoder = new TextDecoder();
   return JSON.parse(decoder.decode(plaintextBuffer)) as T;
 }
 
