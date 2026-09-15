import { useEffect, useState } from 'react';
import { useDataVersionStore } from '../store/dataVersionStore';
import { useVaultStore } from '../store/vaultStore';
import { listCategories, type Category } from '../repositories/categoriesRepository';
import { ensureDefaultCategoriesSeeded } from '../repositories/seedCategories';

export function useCategories() {
  const version = useDataVersionStore((s) => s.version);
  const status = useVaultStore((s) => s.status);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (status !== 'unlocked') return;
    let cancelled = false;
    setLoading(true);
    ensureDefaultCategoriesSeeded()
      .then(() => listCategories())
      .then((result) => {
        if (!cancelled) {
          setCategories(result);
          setLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [version, status]);

  return { categories, loading };
}
