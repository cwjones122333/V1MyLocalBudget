import { useState } from 'react';
import { useAccounts } from '../../hooks/useAccounts';
import { useTransactions } from '../../hooks/useTransactions';
import { computeAccountBalance } from '../../domain/balances';
import { formatCents } from '../../domain/money';
import { AccountFormModal } from './AccountFormModal';
import type { Account, AccountType } from '../../repositories/accountsRepository';

const ACCOUNT_TYPE_LABELS: Record<AccountType, string> = {
  checking: 'Checking',
  savings: 'Savings',
  credit_card: 'Credit Card',
  cash: 'Cash',
  investment: 'Investment',
  loan: 'Loan',
  other: 'Other'
};

export function AccountsScreen() {
  const { accounts, loading } = useAccounts();
  const { transactions } = useTransactions();
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [creating, setCreating] = useState(false);

  return (
    <div>
      <div className="section-header">
        <h2>Accounts</h2>
      </div>

      {!loading && accounts.length === 0 && (
        <div className="empty-state">No accounts yet. Tap + to add your first one.</div>
      )}

      {accounts.length > 0 && (
        <div className="list">
          {accounts.map((account) => {
            const balance = computeAccountBalance(
              account.currentBalance,
              transactions.filter((t) => t.accountId === account.id)
            );
            return (
              <button
                type="button"
                key={account.id}
                className="list-item"
                onClick={() => setEditingAccount(account)}
              >
                <div className="list-item__main">
                  <div className="list-item__title">{account.name}</div>
                  <div className="list-item__meta">{ACCOUNT_TYPE_LABELS[account.type]}</div>
                </div>
                <div className={`amount list-item__amount ${balance < 0 ? 'amount--negative' : ''}`}>
                  {formatCents(balance)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <button type="button" className="fab" onClick={() => setCreating(true)} aria-label="Add account">
        +
      </button>

      {creating && <AccountFormModal onClose={() => setCreating(false)} />}
      {editingAccount && (
        <AccountFormModal account={editingAccount} onClose={() => setEditingAccount(null)} />
      )}
    </div>
  );
}
