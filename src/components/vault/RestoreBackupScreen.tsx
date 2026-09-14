import { useRef, useState } from 'react';
import { importEncryptedBackup } from '../../backup/importBackup';

interface Props {
  onRestored: () => void;
  onCancel: () => void;
}

export function RestoreBackupScreen({ onRestored, onCancel }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setError(null);
    setBusy(true);
    try {
      const text = await file.text();
      await importEncryptedBackup(text);
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not restore this backup.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel__mark" />
        <h1>Restore from backup</h1>
        <p className="lede">
          Choose a backup file you exported earlier. It's still encrypted — you'll unlock it with the
          same passphrase or recovery code from when you made it.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          style={{ display: 'none' }}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
          }}
        />

        <button
          type="button"
          className="btn btn-primary"
          disabled={busy}
          onClick={() => fileInputRef.current?.click()}
        >
          {busy ? 'Restoring…' : 'Choose backup file'}
        </button>

        <button type="button" className="btn btn-secondary" onClick={onCancel} disabled={busy}>
          Back
        </button>
      </div>
    </div>
  );
}
