import { putRecord, listRecordsByType, getRecordWithMeta, deleteRecord } from './recordStore';
import { newId } from '../domain/uuid';
import type { CategoryPayload } from '../types/domain';

export interface Category extends CategoryPayload {
  id: string;
}

export async function listCategories(): Promise<Category[]> {
  const rows = await listRecordsByType<CategoryPayload>('category');
  return rows.map((r) => ({ id: r.id, ...r.payload }));
}

export async function createCategory(name: string, parentId: string | null): Promise<string> {
  const id = newId();
  const payload: CategoryPayload = { schemaVersion: 1, name: name.trim(), parentId };
  await putRecord({ id, type: 'category', accountId: null, yearMonth: null, payload });
  return id;
}

export async function renameCategory(id: string, name: string): Promise<void> {
  const existing = await getRecordWithMeta<CategoryPayload>(id);
  if (!existing) throw new Error('Category not found.');
  const payload: CategoryPayload = { ...existing.payload, name: name.trim() };
  await putRecord({
    id,
    type: 'category',
    accountId: null,
    yearMonth: null,
    payload,
    createdAt: existing.createdAt
  });
}

/**
 * Deletes a category outright. Transactions or rules that already point at
 * this categoryId are NOT reassigned — they'll just show as uncategorized
 * going forward. Deleting a top-level category does not delete its
 * children; delete those separately first if you want them gone too.
 */
export async function deleteCategory(id: string): Promise<void> {
  await deleteRecord(id);
}

/** Builds a simple two-level tree: top-level categories with their direct children. Deeper nesting isn't supported yet, matching the flat example hierarchy from the spec. */
export interface CategoryTreeNode {
  category: Category;
  children: Category[];
}

export function buildCategoryTree(categories: Category[]): CategoryTreeNode[] {
  const topLevel = categories.filter((c) => c.parentId === null).sort((a, b) => a.name.localeCompare(b.name));
  return topLevel.map((parent) => ({
    category: parent,
    children: categories
      .filter((c) => c.parentId === parent.id)
      .sort((a, b) => a.name.localeCompare(b.name))
  }));
}
