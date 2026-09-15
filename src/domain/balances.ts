interface HasAmount {
  amount: number;
}

/**
 * An account's displayed balance is its starting balance (set when the
 * account was created, or last manually corrected) plus every transaction
 * recorded against it since. Transactions are the source of truth for
 * activity; `currentBalance` on the account record is only ever the
 * starting point, never mutated directly by adding a transaction.
 */
export function computeAccountBalance(startingBalanceCents: number, transactions: HasAmount[]): number {
  return transactions.reduce((sum, t) => sum + t.amount, 0) + startingBalanceCents;
}
