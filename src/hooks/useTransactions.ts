import { useEffect, useState } from 'react';
import { useDataVersionStore } from '../store/dataVersionStore';
import { useVaultStore } from '../store/vaultStore';
import { listAllTransactions, listTransactionsByAccount, type Transaction } from '../repositories/transactionsRepository';

export function useTransactions(accountId?: string) {
  const version = useDataVersionStore((s) => s.version);
  const status = useVaultStore((s) => s.status);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'unlocked') return;
    let cancelled = false;
    setLoading(true);
    const fetch = accountId ? listTransactionsByAccount(accountId) : listAllTransactions();
    fetch.then((result) => {
      if (!cancelled) {
        setTransactions(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version, status, accountId]);

  return { transactions, loading };
}
