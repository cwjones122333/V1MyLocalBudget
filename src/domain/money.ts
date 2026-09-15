const formatter = new Intl.NumberFormat(undefined, {
  style: 'currency',
  currency: 'USD'
});

/** Formats integer cents as a currency string, e.g. -4820 -> "-$48.20". */
export function formatCents(cents: number): string {
  return formatter.format(cents / 100);
}

/**
 * Parses a user-typed dollar amount ("48.20", "-48.2", "$48") into integer
 * cents. Returns null if the input isn't a valid number. The sign is taken
 * from the input directly — callers decide whether to force a sign based
 * on debit/credit selection (see TransactionForm).
 */
export function parseDollarsToCents(input: string): number | null {
  const cleaned = input.replace(/[$,\s]/g, '');
  if (cleaned === '' || cleaned === '-') return null;
  if (!/^-?\d+(\.\d{1,2})?$/.test(cleaned)) return null;
  const dollars = Number(cleaned);
  if (Number.isNaN(dollars)) return null;
  return Math.round(dollars * 100);
}

/** For pre-filling an edit form from stored cents, e.g. -4820 -> "48.20" (sign handled separately by the form). */
export function centsToInputString(cents: number): string {
  return (Math.abs(cents) / 100).toFixed(2);
}
