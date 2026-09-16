import { useState, type FormEvent } from 'react';
import { useCategories } from '../../hooks/useCategories';
import { buildCategoryTree, createCategory, deleteCategory } from '../../repositories/categoriesRepository';

export function CategoriesScreen() {
  const { categories, loading } = useCategories();
  const tree = buildCategoryTree(categories);

  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (name.trim().length === 0) {
      setError('Give the category a name.');
      return;
    }
    setBusy(true);
    try {
      await createCategory(name.trim(), parentId || null);
      setName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async (id: string) => {
    setBusy(true);
    try {
      await deleteCategory(id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="section-header">
        <h2>Categories</h2>
      </div>

      {!loading && tree.length === 0 && <div className="empty-state">No categories yet.</div>}

      {tree.length > 0 && (
        <div className="list" style={{ marginBottom: 'var(--space-6)' }}>
          {tree.map((node) => (
            <div key={node.category.id}>
              <div className="list-item" style={{ cursor: 'default' }}>
                <div className="list-item__main">
                  <div className="list-item__title">{node.category.name}</div>
                </div>
                <button
                  type="button"
                  className="link-danger"
                  onClick={() => handleDelete(node.category.id)}
                  disabled={busy}
                >
                  Remove
                </button>
              </div>
              {node.children.map((child) => (
                <div key={child.id} className="list-item" style={{ cursor: 'default', paddingLeft: 32 }}>
                  <div className="list-item__main">
                    <div className="list-item__meta">{child.name}</div>
                  </div>
                  <button
                    type="button"
                    className="link-danger"
                    onClick={() => handleDelete(child.id)}
                    disabled={busy}
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}

      <div className="section-header">
        <h2>Add a category</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <form onSubmit={handleAdd}>
        <div className="field">
          <label htmlFor="category-name">Name</label>
          <input id="category-name" type="text" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="field">
          <label htmlFor="category-parent">Parent (optional)</label>
          <select id="category-parent" value={parentId} onChange={(e) => setParentId(e.target.value)}>
            <option value="">None — top-level category</option>
            {tree.map((node) => (
              <option key={node.category.id} value={node.category.id}>
                {node.category.name}
              </option>
            ))}
          </select>
        </div>
        <button type="submit" className="btn btn-primary" disabled={busy}>
          {busy ? 'Adding…' : 'Add category'}
        </button>
      </form>
    </div>
  );
}
