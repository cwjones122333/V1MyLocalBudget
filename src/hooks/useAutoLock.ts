import { useEffect, useRef } from 'react';
import { useVaultStore } from '../store/vaultStore';

const ACTIVITY_EVENTS = ['mousedown', 'keydown', 'touchstart', 'scroll'] as const;
const CHECK_INTERVAL_MS = 15_000;

/**
 * Mount once near the app root while unlocked. Watches for user activity
 * and for the app being backgrounded, and locks the vault (clearing the
 * session key from the store) when appropriate.
 *
 * Honesty note: this locks the *application's* view of the data. It does
 * not and cannot guarantee that no trace of decrypted values remains
 * anywhere in the browser process's memory — see the Phase 1 threat model.
 */
export function useAutoLock() {
  const status = useVaultStore((s) => s.status);
  const lockTimeoutMinutes = useVaultStore((s) => s.lockTimeoutMinutes);
  const lastActivityAt = useVaultStore((s) => s.lastActivityAt);
  const touchActivity = useVaultStore((s) => s.touchActivity);
  const lock = useVaultStore((s) => s.lock);

  const lastActivityRef = useRef(lastActivityAt);
  lastActivityRef.current = lastActivityAt;

  useEffect(() => {
    if (status !== 'unlocked') return;

    const onActivity = () => touchActivity();
    ACTIVITY_EVENTS.forEach((evt) => window.addEventListener(evt, onActivity, { passive: true }));

    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && lockTimeoutMinutes === 0) {
        lock();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    let interval: ReturnType<typeof setInterval> | undefined;
    if (lockTimeoutMinutes > 0) {
      interval = setInterval(() => {
        const elapsedMs = Date.now() - lastActivityRef.current;
        if (elapsedMs >= lockTimeoutMinutes * 60_000) {
          lock();
        }
      }, CHECK_INTERVAL_MS);
    }

    return () => {
      ACTIVITY_EVENTS.forEach((evt) => window.removeEventListener(evt, onActivity));
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (interval) clearInterval(interval);
    };
  }, [status, lockTimeoutMinutes, lock, touchActivity]);
}
