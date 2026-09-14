// These are the *decrypted* shapes of financial data. They only ever exist
// in memory after a record has been decrypted — never on disk in this form.
// Every payload carries its own schemaVersion so future migrations can
// upgrade old records the first time they're read (see db/schema.ts).

export type AccountType =
  | 'checking'
  | 'savings'
  | 'credit_card'
  | 'cash'
  | 'investment'
  | 'loan'
  | 'other';

export interface AccountPayload {
  schemaVersion: 1;
  name: string;
  type: AccountType;
  institutionName?: string;
  /** Last 4 digits only, if the user chooses to record it. Never a full account number. */
  mask?: string;
  /** Integer cents. */
  currentBalance: number;
  archived: boolean;
}

export type TransactionType = 'debit' | 'credit' | 'transfer';

export interface TransactionPayload {
  schemaVersion: 1;
  date: string; // ISO 8601 date, e.g. "2026-09-13"
  merchant: string;
  originalDescription: string;
  /** Integer cents. Debits negative, credits/income positive. */
  amount: number;
  transactionType: TransactionType;
  categoryId: string | null;
  notes: string;
  cleared: boolean;
  imported: boolean;
  /** Links both sides of a transfer between two of the user's own accounts. */
  transferId: string | null;
  /** Used for duplicate detection on import. See domain/duplicateDetection.ts (Phase 4). */
  fingerprint: string;
}

export interface CategoryPayload {
  schemaVersion: 1;
  name: string;
  parentId: string | null;
}

export interface BudgetPayload {
  schemaVersion: 1;
  yearMonth: string; // "2026-09"
  categoryId: string;
  /** Integer cents allocated for this category this month. */
  allocated: number;
  rollover: boolean;
}

export interface CategorizationRulePayload {
  schemaVersion: 1;
  /** Case-insensitive substring match against merchant/description. */
  matchText: string;
  categoryId: string;
}

/** Union used generically by the crypto layer when it doesn't need to know the concrete shape. */
export type AnyPayload =
  | AccountPayload
  | TransactionPayload
  | CategoryPayload
  | BudgetPayload
  | CategorizationRulePayload;
