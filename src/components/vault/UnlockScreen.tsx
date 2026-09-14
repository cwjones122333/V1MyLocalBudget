import { useState, type FormEvent } from 'react';
import { unlockWithPassphrase, unlockWithRecoveryCode, IncorrectPassphraseError } from '../../crypto/vaultManager';
import { useVaultStore } from '../../store/vaultStore';

export function UnlockScreen() {
  const [mode, setMode] = useState<'passphrase' | 'recovery'>('passphrase');
  const [value, setValue] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const unlock = useVaultStore((s) => s.unlock);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);

    try {
      const key =
        mode === 'passphrase' ? await unlockWithPassphrase(value) : await unlockWithRecoveryCode(value);
      unlock(key);
    } catch (err) {
      if (err instanceof IncorrectPassphraseError) {
        setError(mode === 'passphrase' ? 'Incorrect passphrase.' : 'Incorrect recovery code.');
      } else {
        setError(err instanceof Error ? err.message : 'Something went wrong.');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel__mark" />
        <h1>Unlock your budget</h1>
        <p className="lede">Your data stays encrypted until you enter your passphrase.</p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="unlock-value">{mode === 'passphrase' ? 'Passphrase' : 'Recovery code'}</label>
            <input
              id="unlock-value"
              type={mode === 'passphrase' ? 'password' : 'text'}
              autoComplete="current-password"
              autoFocus
              value={value}
              onChange={(e) => setValue(e.target.value)}
            />
          </div>

          <button type="submit" className="btn btn-primary" disabled={value.length === 0 || busy}>
            {busy ? 'Unlocking…' : 'Unlock'}
          </button>
        </form>

        <button
          type="button"
          className="btn-text"
          onClick={() => {
            setMode(mode === 'passphrase' ? 'recovery' : 'passphrase');
            setValue('');
            setError(null);
          }}
          style={{ marginTop: 12 }}
        >
          {mode === 'passphrase' ? "I forgot my passphrase — use recovery code" : 'Use my passphrase instead'}
        </button>
      </div>
    </div>
  );
}
