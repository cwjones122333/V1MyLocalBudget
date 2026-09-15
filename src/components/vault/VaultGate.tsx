import { useEffect, useState } from 'react';
import { useVaultStore } from '../../store/vaultStore';
import { vaultExists } from '../../crypto/vaultManager';
import { useAutoLock } from '../../hooks/useAutoLock';
import { CreateVaultScreen } from './CreateVaultScreen';
import { UnlockScreen } from './UnlockScreen';
import { RestoreBackupScreen } from './RestoreBackupScreen';
import { AppShell } from '../shared/AppShell';

export function VaultGate() {
  const status = useVaultStore((s) => s.status);
  const setStatus = useVaultStore((s) => s.setStatus);
  const [showRestore, setShowRestore] = useState(false);

  useAutoLock();

  useEffect(() => {
    let cancelled = false;
    vaultExists().then((exists) => {
      if (!cancelled) setStatus(exists ? 'locked' : 'no-vault');
    });
    return () => {
      cancelled = true;
    };
  }, [setStatus]);

  if (status === 'checking') {
    return <div className="screen" />;
  }

  if (status === 'unlocked') {
    return <AppShell />;
  }

  if (showRestore) {
    return (
      <RestoreBackupScreen
        onRestored={() => {
          setShowRestore(false);
          setStatus('locked');
        }}
        onCancel={() => setShowRestore(false)}
      />
    );
  }

  if (status === 'no-vault') {
    return <CreateVaultScreen onGoToRestore={() => setShowRestore(true)} />;
  }

  return <UnlockScreen />;
}
