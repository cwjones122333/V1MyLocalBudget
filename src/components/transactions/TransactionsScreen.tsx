import { useState } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { formatCents } from '../../domain/money';
import { TransactionFormModal } from './TransactionFormModal';
import type { Transaction } from '../../repositories/transactionsRepository';

export function TransactionsScreen() {
  const { transactions, loading } = useTransactions();
  const { accounts } = useAccounts(true);
  const { categories } = useCategories();
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [creating, setCreating] = useState(false);

  const accountName = (id: string) => accounts.find((a) => a.id === id)?.name ?? 'Unknown account';
  const categoryName = (id: string | null) => (id ? categories.find((c) => c.id === id)?.name ?? null : null);

  const hasAccounts = accounts.length > 0;

  return (
    <div>
      <div className="section-header">
        <h2>Transactions</h2>
      </div>

      {!loading && transactions.length === 0 && (
        <div className="empty-state">
          {hasAccounts ? 'No transactions yet. Tap + to add one.' : 'Add an account first, then come back here.'}
        </div>
      )}

      {transactions.length > 0 && (
        <div className="list">
          {transactions.map((t) => {
            const category = categoryName(t.categoryId);
            const isPositive = t.amount >= 0;
            return (
              <button
                type="button"
                key={t.id}
                className="list-item"
                onClick={() => setEditingTransaction(t)}
              >
                <div className="list-item__main">
                  <div className="list-item__title">{t.merchant}</div>
                  <div className="list-item__meta">
                    {t.date} · {accountName(t.accountId)}
                    {category ? ` · ${category}` : ''}
                  </div>
                </div>
                <div className={`amount list-item__amount ${isPositive ? 'amount--positive' : 'amount--negative'}`}>
                  {formatCents(t.amount)}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {hasAccounts && (
        <button type="button" className="fab" onClick={() => setCreating(true)} aria-label="Add transaction">
          +
        </button>
      )}

      {creating && <TransactionFormModal onClose={() => setCreating(false)} />}
      {editingTransaction && (
        <TransactionFormModal transaction={editingTransaction} onClose={() => setEditingTransaction(null)} />
      )}
    </div>
  );
}
