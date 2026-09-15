import { putRecord, listRecordsByType, listRecordsByTypeAndAccount, getRecordWithMeta, deleteRecord } from './recordStore';
import { newId } from '../domain/uuid';
import type { TransactionPayload, TransactionType } from '../types/domain';

export interface Transaction extends TransactionPayload {
  id: string;
  accountId: string;
  createdAt: number;
  updatedAt: number;
}

function yearMonthFromDate(dateIso: string): string {
  return dateIso.slice(0, 7); // "YYYY-MM"
}

function computeFingerprint(accountId: string, date: string, amount: number, merchant: string): string {
  return `${accountId}|${date}|${amount}|${merchant.trim().toLowerCase()}`;
}

export interface CreateTransactionInput {
  accountId: string;
  date: string; // ISO "YYYY-MM-DD"
  merchant: string;
  /** Integer cents. Sign should already match transactionType (negative for debit, positive for credit) — see TransactionForm. */
  amount: number;
  transactionType: TransactionType;
  categoryId: string | null;
  notes?: string;
}

export async function createTransaction(input: CreateTransactionInput): Promise<string> {
  const id = newId();
  const merchant = input.merchant.trim();
  const payload: TransactionPayload = {
    schemaVersion: 1,
    date: input.date,
    merchant,
    originalDescription: merchant,
    amount: input.amount,
    transactionType: input.transactionType,
    categoryId: input.categoryId,
    notes: input.notes?.trim() ?? '',
    cleared: false,
    imported: false,
    transferId: null,
    fingerprint: computeFingerprint(input.accountId, input.date, input.amount, merchant)
  };
  await putRecord({
    id,
    type: 'transaction',
    accountId: input.accountId,
    yearMonth: yearMonthFromDate(input.date),
    payload
  });
  return id;
}

export interface UpdateTransactionInput {
  accountId: string;
  date: string;
  merchant: string;
  amount: number;
  transactionType: TransactionType;
  categoryId: string | null;
  notes?: string;
}

export async function updateTransaction(id: string, input: UpdateTransactionInput): Promise<void> {
  const existing = await getRecordWithMeta<TransactionPayload>(id);
  if (!existing) throw new Error('Transaction not found.');

  const merchant = input.merchant.trim();
  const payload: TransactionPayload = {
    ...existing.payload,
    date: input.date,
    merchant,
    originalDescription: existing.payload.imported ? existing.payload.originalDescription : merchant,
    amount: input.amount,
    transactionType: input.transactionType,
    categoryId: input.categoryId,
    notes: input.notes?.trim() ?? '',
    fingerprint: computeFingerprint(input.accountId, input.date, input.amount, merchant)
  };

  await putRecord({
    id,
    type: 'transaction',
    accountId: input.accountId,
    yearMonth: yearMonthFromDate(input.date),
    payload,
    createdAt: existing.createdAt
  });
}

export async function deleteTransaction(id: string): Promise<void> {
  await deleteRecord(id);
}

export async function listAllTransactions(): Promise<Transaction[]> {
  const rows = await listRecordsByType<TransactionPayload>('transaction');
  return rows
    .map((r) => ({
      id: r.id,
      // Always set for transaction records — accountId is required at creation.
      accountId: r.accountId as string,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...r.payload
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}

export async function listTransactionsByAccount(accountId: string): Promise<Transaction[]> {
  const rows = await listRecordsByTypeAndAccount<TransactionPayload>('transaction', accountId);
  return rows
    .map((r) => ({
      id: r.id,
      accountId: r.accountId as string,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
      ...r.payload
    }))
    .sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : b.createdAt - a.createdAt));
}
