import { create } from 'zustand';

export type VaultStatus = 'checking' | 'no-vault' | 'locked' | 'unlocked';

interface VaultState {
  status: VaultStatus;
  /**
   * The non-extractable AES-GCM session key (unwrapped MEK). This is the
   * ONLY place it's held in the whole app. Every repository read/write
   * pulls it from here rather than passing it around as a prop.
   */
  sessionKey: CryptoKey | null;
  lockTimeoutMinutes: number;
  lastActivityAt: number;

  setStatus: (status: VaultStatus) => void;
  unlock: (key: CryptoKey) => void;
  lock: () => void;
  setLockTimeoutMinutes: (minutes: number) => void;
  touchActivity: () => void;
}

export const useVaultStore = create<VaultState>((set) => ({
  status: 'checking',
  sessionKey: null,
  lockTimeoutMinutes: 5,
  lastActivityAt: Date.now(),

  setStatus: (status) => set({ status }),

  unlock: (key) =>
    set({
      status: 'unlocked',
      sessionKey: key,
      lastActivityAt: Date.now()
    }),

  // We cannot force JavaScript to zero out memory, and we say so plainly
  // elsewhere — but we CAN and do drop every reference to the session key
  // immediately on lock, so nothing in application state keeps it alive
  // past this point. What happens to the underlying memory after that is
  // up to the JS engine's garbage collector, which we don't control.
  lock: () =>
    set({
      status: 'locked',
      sessionKey: null
    }),

  setLockTimeoutMinutes: (minutes) => set({ lockTimeoutMinutes: minutes }),

  touchActivity: () => set({ lastActivityAt: Date.now() })
}));
