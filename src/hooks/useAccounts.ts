import { useEffect, useState } from 'react';
import { useDataVersionStore } from '../store/dataVersionStore';
import { useVaultStore } from '../store/vaultStore';
import { listAccounts, type Account } from '../repositories/accountsRepository';

export function useAccounts(includeArchived = false) {
  const version = useDataVersionStore((s) => s.version);
  const status = useVaultStore((s) => s.status);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'unlocked') return;
    let cancelled = false;
    setLoading(true);
    listAccounts(includeArchived).then((result) => {
      if (!cancelled) {
        setAccounts(result);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [version, status, includeArchived]);

  return { accounts, loading };
}
