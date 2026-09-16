import { listCategories, createCategory } from './categoriesRepository';

const DEFAULT_CATEGORIES: { name: string; children: string[] }[] = [
  { name: 'Housing', children: ['Mortgage', 'HOA', 'Home Maintenance'] },
  { name: 'Food', children: ['Groceries', 'Restaurants', 'Fast Food'] },
  { name: 'Transportation', children: ['Fuel', 'Maintenance', 'Insurance'] },
  { name: 'Subscriptions', children: ['Streaming', 'Software'] },
  { name: 'Income', children: ['Salary', 'Bonus', 'Other Income'] }
];

// If ensureDefaultCategoriesSeeded is called twice in close succession —
// which React's StrictMode does deliberately in development, and which can
// also happen if two components using useCategories() mount around the
// same time — a plain "check length, then write" sequence is not safe:
// both calls can see zero categories before either has finished writing,
// and both proceed to seed, producing duplicates. This module-level
// promise makes every call within one page load share the SAME seed
// attempt, so the check-then-write only ever actually happens once.
let seedingPromise: Promise<void> | null = null;

async function seedDefaultCategories(): Promise<void> {
  const existing = await listCategories();
  if (existing.length > 0) return;

  for (const group of DEFAULT_CATEGORIES) {
    const parentId = await createCategory(group.name, null);
    for (const childName of group.children) {
      await createCategory(childName, parentId);
    }
  }
}

/** Safe to call unconditionally, as many times as you like, from anywhere — only the first call per page load actually does anything, and only if the vault has zero categories. */
export function ensureDefaultCategoriesSeeded(): Promise<void> {
  if (!seedingPromise) {
    seedingPromise = seedDefaultCategories();
  }
  return seedingPromise;
}
