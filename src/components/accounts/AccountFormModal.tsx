import { useState, type FormEvent } from 'react';
import { createAccount, updateAccount, archiveAccount } from '../../repositories/accountsRepository';
import { parseDollarsToCents, centsToInputString } from '../../domain/money';
import type { Account, AccountType } from '../../repositories/accountsRepository';

interface Props {
  account?: Account;
  onClose: () => void;
}

const ACCOUNT_TYPES: { value: AccountType; label: string }[] = [
  { value: 'checking', label: 'Checking' },
  { value: 'savings', label: 'Savings' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'cash', label: 'Cash' },
  { value: 'investment', label: 'Investment' },
  { value: 'loan', label: 'Loan' },
  { value: 'other', label: 'Other' }
];

export function AccountFormModal({ account, onClose }: Props) {
  const isEditing = Boolean(account);
  const [name, setName] = useState(account?.name ?? '');
  const [type, setType] = useState<AccountType>(account?.type ?? 'checking');
  const [mask, setMask] = useState(account?.mask ?? '');
  const [balanceInput, setBalanceInput] = useState(
    account ? centsToInputString(account.currentBalance) : ''
  );
  const [balanceNegative, setBalanceNegative] = useState(account ? account.currentBalance < 0 : false);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (name.trim().length === 0) {
      setError('Give the account a name.');
      return;
    }

    const parsed = parseDollarsToCents(balanceInput || '0');
    if (parsed === null) {
      setError('Enter a valid balance, like 1200.50.');
      return;
    }
    const currentBalance = balanceNegative ? -Math.abs(parsed) : Math.abs(parsed);

    setBusy(true);
    try {
      if (isEditing && account) {
        await updateAccount(account.id, {
          name: name.trim(),
          type,
          mask: mask.trim() || undefined,
          currentBalance
        });
      } else {
        await createAccount({ name: name.trim(), type, mask: mask.trim() || undefined, currentBalance });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleArchive = async () => {
    if (!account) return;
    setBusy(true);
    try {
      await archiveAccount(account.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Edit account' : 'Add account'}</h2>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="account-name">Name</label>
            <input id="account-name" type="text" value={name} onChange={(e) => setName(e.target.value)} autoFocus />
          </div>

          <div className="field">
            <label htmlFor="account-type">Type</label>
            <select id="account-type" value={type} onChange={(e) => setType(e.target.value as AccountType)}>
              {ACCOUNT_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="account-mask">Last 4 digits (optional)</label>
            <input
              id="account-mask"
              type="text"
              inputMode="numeric"
              maxLength={4}
              value={mask}
              onChange={(e) => setMask(e.target.value.replace(/\D/g, '').slice(0, 4))}
            />
          </div>

          <div className="field">
            <label htmlFor="account-balance">
              {isEditing ? 'Starting balance' : 'Starting balance (as of today)'}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <div className="segmented" style={{ width: 110 }}>
                <button
                  type="button"
                  className={!balanceNegative ? 'active' : ''}
                  onClick={() => setBalanceNegative(false)}
                >
                  +
                </button>
                <button
                  type="button"
                  className={balanceNegative ? 'active' : ''}
                  onClick={() => setBalanceNegative(true)}
                >
                  −
                </button>
              </div>
              <input
                id="account-balance"
                type="text"
                inputMode="decimal"
                placeholder="0.00"
                value={balanceInput}
                onChange={(e) => setBalanceInput(e.target.value)}
                style={{ flex: 1 }}
              />
            </div>
            <div className="field-hint">
              Transactions you add or import will adjust the balance from here.
            </div>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? 'Saving…' : isEditing ? 'Save' : 'Add account'}
            </button>
          </div>
        </form>

        {isEditing && (
          <button type="button" className="link-danger" onClick={handleArchive} disabled={busy}>
            Archive this account
          </button>
        )}
      </div>
    </div>
  );
}
