import { putRecord, getRecordWithMeta } from './recordStore';
import { listRecordsByType } from './recordStore';
import { newId } from '../domain/uuid';
import type { AccountPayload, AccountType } from '../types/domain';

export type { AccountType } from '../types/domain';

export interface Account extends AccountPayload {
  id: string;
  createdAt: number;
  updatedAt: number;
}

export async function listAccounts(includeArchived = false): Promise<Account[]> {
  const rows = await listRecordsByType<AccountPayload>('account');
  const accounts = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    ...r.payload
  }));
  const filtered = includeArchived ? accounts : accounts.filter((a) => !a.archived);
  return filtered.sort((a, b) => a.name.localeCompare(b.name));
}

export interface CreateAccountInput {
  name: string;
  type: AccountType;
  institutionName?: string;
  mask?: string;
  /** Starting balance in integer cents, as of when the account was added here. */
  currentBalance: number;
}

export async function createAccount(input: CreateAccountInput): Promise<string> {
  const id = newId();
  const payload: AccountPayload = {
    schemaVersion: 1,
    name: input.name.trim(),
    type: input.type,
    institutionName: input.institutionName?.trim() || undefined,
    mask: input.mask?.trim() || undefined,
    currentBalance: input.currentBalance,
    archived: false
  };
  // accountId is left null on the account's own record — that index field
  // exists to let transactions point back at an account, not for the
  // account record to point at itself.
  await putRecord({ id, type: 'account', accountId: null, yearMonth: null, payload });
  return id;
}

export async function updateAccount(
  id: string,
  patch: Partial<Omit<AccountPayload, 'schemaVersion'>>
): Promise<void> {
  const existing = await getRecordWithMeta<AccountPayload>(id);
  if (!existing) throw new Error('Account not found.');
  const merged: AccountPayload = { ...existing.payload, ...patch, schemaVersion: 1 };
  await putRecord({
    id,
    type: 'account',
    accountId: null,
    yearMonth: null,
    payload: merged,
    createdAt: existing.createdAt
  });
}

export async function archiveAccount(id: string): Promise<void> {
  await updateAccount(id, { archived: true });
}

export async function unarchiveAccount(id: string): Promise<void> {
  await updateAccount(id, { archived: false });
}
