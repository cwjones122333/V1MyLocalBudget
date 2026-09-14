import { useEffect, useState } from 'react';
import { useVaultStore } from '../../store/vaultStore';
import { exportEncryptedBackup } from '../../backup/exportEncrypted';
import { getLockTimeoutMinutes, setLockTimeoutMinutes } from '../../crypto/vaultManager';

const TIMEOUT_OPTIONS: { label: string; minutes: number }[] = [
  { label: 'Immediately when app closes', minutes: 0 },
  { label: 'After 5 minutes', minutes: 5 },
  { label: 'After 15 minutes', minutes: 15 },
  { label: 'After 30 minutes', minutes: 30 }
];

export function UnlockedShell() {
  const lock = useVaultStore((s) => s.lock);
  const storeTimeout = useVaultStore((s) => s.lockTimeoutMinutes);
  const setStoreTimeout = useVaultStore((s) => s.setLockTimeoutMinutes);
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  useEffect(() => {
    getLockTimeoutMinutes().then(setStoreTimeout);
  }, [setStoreTimeout]);

  const handleExport = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await exportEncryptedBackup();
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const handleTimeoutChange = async (minutes: number) => {
    setStoreTimeout(minutes);
    await setLockTimeoutMinutes(minutes);
  };

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel__mark" />
        <h1>Vault unlocked</h1>
        <p className="lede">
          Your encrypted vault is open. The accounts, transactions, and budgeting screens come in the
          next phase — for now this confirms the vault itself works end to end.
        </p>

        {exportError && <div className="error-banner">{exportError}</div>}

        <div className="field">
          <label>Auto-lock</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {TIMEOUT_OPTIONS.map((opt) => (
              <label key={opt.minutes} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14 }}>
                <input
                  type="radio"
                  name="lock-timeout"
                  checked={storeTimeout === opt.minutes}
                  onChange={() => handleTimeoutChange(opt.minutes)}
                />
                {opt.label}
              </label>
            ))}
          </div>
        </div>

        <button type="button" className="btn btn-primary" onClick={handleExport} disabled={exporting}>
          {exporting ? 'Exporting…' : 'Export encrypted backup'}
        </button>

        <button type="button" className="btn btn-secondary" onClick={lock}>
          Lock now
        </button>
      </div>
    </div>
  );
}
