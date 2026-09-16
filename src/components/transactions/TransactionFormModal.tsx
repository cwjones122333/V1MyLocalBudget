import { useEffect, useState, type FormEvent } from 'react';
import { createTransaction, updateTransaction, deleteTransaction } from '../../repositories/transactionsRepository';
import { useAccounts } from '../../hooks/useAccounts';
import { useCategories } from '../../hooks/useCategories';
import { buildCategoryTree } from '../../repositories/categoriesRepository';
import { parseDollarsToCents, centsToInputString } from '../../domain/money';
import type { Transaction } from '../../repositories/transactionsRepository';
import type { TransactionType } from '../../types/domain';

interface Props {
  transaction?: Transaction;
  onClose: () => void;
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function TransactionFormModal({ transaction, onClose }: Props) {
  const isEditing = Boolean(transaction);
  const { accounts } = useAccounts();
  const { categories } = useCategories();
  const categoryTree = buildCategoryTree(categories);

  const [accountId, setAccountId] = useState(transaction?.accountId ?? accounts[0]?.id ?? '');

  // accounts loads asynchronously, so on first render it's still []  and
  // the line above locks accountId in as ''. Once accounts actually
  // arrives, default to the first one — but only for a brand-new
  // transaction, and only if the user hasn't already picked something.
  useEffect(() => {
    if (!transaction && !accountId && accounts.length > 0) {
      setAccountId(accounts[0].id);
    }
  }, [transaction, accountId, accounts]);

  const [date, setDate] = useState(transaction?.date ?? todayIso());
  const [merchant, setMerchant] = useState(transaction?.merchant ?? '');
  const [txType, setTxType] = useState<Exclude<TransactionType, 'transfer'>>(
    transaction && transaction.transactionType !== 'transfer' ? transaction.transactionType : 'debit'
  );
  const [amountInput, setAmountInput] = useState(transaction ? centsToInputString(transaction.amount) : '');
  const [categoryId, setCategoryId] = useState<string>(transaction?.categoryId ?? '');
  const [notes, setNotes] = useState(transaction?.notes ?? '');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountId) {
      setError('Choose an account.');
      return;
    }
    if (merchant.trim().length === 0) {
      setError('Enter a merchant or description.');
      return;
    }
    const parsed = parseDollarsToCents(amountInput);
    if (parsed === null || parsed === 0) {
      setError('Enter a valid amount, like 48.20.');
      return;
    }
    const amount = txType === 'debit' ? -Math.abs(parsed) : Math.abs(parsed);

    setBusy(true);
    try {
      const input = {
        accountId,
        date,
        merchant: merchant.trim(),
        amount,
        transactionType: txType as TransactionType,
        categoryId: categoryId || null,
        notes
      };
      if (isEditing && transaction) {
        await updateTransaction(transaction.id, input);
      } else {
        await createTransaction(input);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!transaction) return;
    setBusy(true);
    try {
      await deleteTransaction(transaction.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <h2>{isEditing ? 'Edit transaction' : 'Add transaction'}</h2>

        {error && <div className="error-banner">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="field">
            <label htmlFor="tx-account">Account</label>
            <select id="tx-account" value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {accounts.length === 0 && <option value="">No accounts yet</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <label>Type</label>
            <div className="segmented">
              <button type="button" className={txType === 'debit' ? 'active' : ''} onClick={() => setTxType('debit')}>
                Spent
              </button>
              <button type="button" className={txType === 'credit' ? 'active' : ''} onClick={() => setTxType('credit')}>
                Received
              </button>
            </div>
          </div>

          <div className="field">
            <label htmlFor="tx-amount">Amount</label>
            <input
              id="tx-amount"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amountInput}
              onChange={(e) => setAmountInput(e.target.value)}
              autoFocus
            />
          </div>

          <div className="field">
            <label htmlFor="tx-merchant">Merchant / description</label>
            <input id="tx-merchant" type="text" value={merchant} onChange={(e) => setMerchant(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="tx-date">Date</label>
            <input id="tx-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </div>

          <div className="field">
            <label htmlFor="tx-category">Category</label>
            <select id="tx-category" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
              <option value="">Uncategorized</option>
              {categoryTree.map((node) => (
                <optgroup key={node.category.id} label={node.category.name}>
                  <option value={node.category.id}>{node.category.name} (general)</option>
                  {node.children.map((child) => (
                    <option key={child.id} value={child.id}>
                      {child.name}
                    </option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>

          <div className="field">
            <label htmlFor="tx-notes">Notes (optional)</label>
            <textarea id="tx-notes" value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={busy}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy || accounts.length === 0}>
              {busy ? 'Saving…' : isEditing ? 'Save' : 'Add transaction'}
            </button>
          </div>
        </form>

        {isEditing && (
          <button type="button" className="link-danger" onClick={handleDelete} disabled={busy}>
            Delete this transaction
          </button>
        )}
      </div>
    </div>
  );
}
