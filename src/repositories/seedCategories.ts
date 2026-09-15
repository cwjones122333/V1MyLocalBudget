import { listCategories, createCategory } from './categoriesRepository';

const DEFAULT_CATEGORIES: { name: string; children: string[] }[] = [
  { name: 'Housing', children: ['Mortgage', 'HOA', 'Home Maintenance'] },
  { name: 'Food', children: ['Groceries', 'Restaurants', 'Fast Food'] },
  { name: 'Transportation', children: ['Fuel', 'Maintenance', 'Insurance'] },
  { name: 'Subscriptions', children: ['Streaming', 'Software'] },
  { name: 'Income', children: ['Salary', 'Bonus', 'Other Income'] }
];

/** Only seeds if the vault currently has zero categories, so this is safe to call unconditionally on every unlock. */
export async function ensureDefaultCategoriesSeeded(): Promise<void> {
  const existing = await listCategories();
  if (existing.length > 0) return;

  for (const group of DEFAULT_CATEGORIES) {
    const parentId = await createCategory(group.name, null);
    for (const childName of group.children) {
      await createCategory(childName, parentId);
    }
  }
}
