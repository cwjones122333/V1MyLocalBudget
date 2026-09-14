// Portable, versioned representation of the entire vault: still-encrypted
// records plus the key-wrapping metadata needed to unlock them. This file
// is exactly as safe as the live IndexedDB database — it's ciphertext, not
// plaintext, and useless without the passphrase or recovery code. It is
// never uploaded anywhere automatically; producing it is always an
// explicit, user-initiated action.

export interface BackupFileRecord {
  id: string;
  type: string;
  accountId: string | null;
  yearMonth: string | null;
  iv: string; // base64
  ciphertext: string; // base64
  payloadVersion: number;
  createdAt: number;
  updatedAt: number;
}

export interface BackupFile {
  formatVersion: 1;
  appVersion: string;
  exportedAt: number;
  vaultMeta: {
    formatVersion: number;
    kdfSalt: string; // base64
    kdfIterations: number;
    wrappedMEK: { iv: string; wrapped: string }; // base64
    recovery?: {
      kdfSalt: string;
      kdfIterations: number;
      wrappedMEK: { iv: string; wrapped: string };
    };
    lockTimeoutMinutes: number;
  };
  records: BackupFileRecord[];
}
