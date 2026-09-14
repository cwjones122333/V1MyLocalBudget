import { useState, type FormEvent } from 'react';
import { createVault } from '../../crypto/vaultManager';
import { estimatePassphraseStrength } from '../../crypto/passphraseStrength';
import { useVaultStore } from '../../store/vaultStore';
import { RecoveryCodeDisplay } from './RecoveryCodeDisplay';

interface Props {
  onGoToRestore: () => void;
}

export function CreateVaultScreen({ onGoToRestore }: Props) {
  const [passphrase, setPassphrase] = useState('');
  const [confirm, setConfirm] = useState('');
  const [wantsRecoveryCode, setWantsRecoveryCode] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pendingRecoveryCode, setPendingRecoveryCode] = useState<string | null>(null);
  const [pendingSessionKey, setPendingSessionKey] = useState<CryptoKey | null>(null);

  const unlock = useVaultStore((s) => s.unlock);

  const strength = estimatePassphraseStrength(passphrase);
  const canSubmit = passphrase.length > 0 && passphrase === confirm && strength.level !== 'too-weak' && !busy;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (passphrase !== confirm) {
      setError("Passphrases don't match.");
      return;
    }
    if (strength.level === 'too-weak') {
      setError('Please choose a longer passphrase.');
      return;
    }

    setBusy(true);
    try {
      const result = await createVault(passphrase, wantsRecoveryCode);
      if (result.recoveryCode) {
        // Hold the session key until the user has confirmed they saved the code.
        setPendingSessionKey(result.sessionKey);
        setPendingRecoveryCode(result.recoveryCode);
      } else {
        unlock(result.sessionKey);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong creating the vault.');
    } finally {
      setBusy(false);
    }
  };

  if (pendingRecoveryCode && pendingSessionKey) {
    return (
      <RecoveryCodeDisplay
        recoveryCode={pendingRecoveryCode}
        onContinue={() => unlock(pendingSessionKey)}
      />
    );
  }

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel__mark" />
        <h1>Set up your budget</h1>
        <p className="lede">
          Choose a passphrase to encrypt your financial data. It never leaves this device, and there's
          no way for anyone — including us — to reset it for you.
        </p>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="passphrase">Passphrase</label>
            <input
              id="passphrase"
              type="password"
              autoComplete="new-password"
              value={passphrase}
              onChange={(e) => setPassphrase(e.target.value)}
            />
            {passphrase.length > 0 && (
              <>
                <div className="strength-row">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className={
                        i < strength.score
                          ? strength.level === 'weak'
                            ? 'strength-seg filled-weak'
                            : strength.level === 'ok'
                              ? 'strength-seg filled-ok'
                              : 'strength-seg filled-strong'
                          : 'strength-seg'
                      }
                    />
                  ))}
                </div>
                <div className="field-hint">{strength.message}</div>
              </>
            )}
          </div>

          <div className="field">
            <label htmlFor="confirm">Confirm passphrase</label>
            <input
              id="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
            />
          </div>

          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, marginBottom: 20 }}>
            <input
              type="checkbox"
              checked={wantsRecoveryCode}
              onChange={(e) => setWantsRecoveryCode(e.target.checked)}
              style={{ marginTop: 3 }}
            />
            <span>
              Generate a recovery code as a backup way in
              <span style={{ color: 'var(--ink-soft)', display: 'block' }}>
                Recommended. If you skip this and forget your passphrase, your data can't be recovered.
              </span>
            </span>
          </label>

          <button type="submit" className="btn btn-primary" disabled={!canSubmit}>
            {busy ? 'Setting up…' : 'Create vault'}
          </button>
        </form>

        <button type="button" className="btn-text" onClick={onGoToRestore} style={{ marginTop: 12 }}>
          Restore from an encrypted backup instead
        </button>

        <p className="warning-banner">
          There's no password reset. If you forget this passphrase and didn't save a recovery code, your
          financial data is permanently unreadable — even to us.
        </p>
      </div>
    </div>
  );
}
