import { useState } from 'react';

interface Props {
  recoveryCode: string;
  onContinue: () => void;
}

export function RecoveryCodeDisplay({ recoveryCode, onContinue }: Props) {
  const [confirmed, setConfirmed] = useState(false);
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(recoveryCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="screen">
      <div className="panel">
        <div className="panel__mark" />
        <h1>Save your recovery code</h1>
        <p className="lede">
          This is the only way back into your budget if you forget your passphrase. It's shown once,
          right now, and never stored by this app.
        </p>

        <div className="recovery-code">{recoveryCode}</div>

        <button type="button" className="btn-text" onClick={copy}>
          {copied ? 'Copied' : 'Copy to clipboard'}
        </button>

        <div className="divider" />

        <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: 'var(--ink-soft)' }}>
          <input
            type="checkbox"
            checked={confirmed}
            onChange={(e) => setConfirmed(e.target.checked)}
            style={{ marginTop: 3 }}
          />
          <span>I've written this down somewhere safe, off this device. I understand that without it or my
            passphrase, my financial data can't be recovered.</span>
        </label>

        <button
          type="button"
          className="btn btn-primary"
          style={{ marginTop: 20 }}
          disabled={!confirmed}
          onClick={onContinue}
        >
          Continue
        </button>
      </div>
    </div>
  );
}
