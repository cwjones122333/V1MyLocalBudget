# Local Budget — Phase 2

A private, local-first budgeting app. This phase builds the encrypted vault
itself — create/unlock/lock, encrypted persistence, and encrypted
backup/restore. There's no accounts/transactions/budgeting UI yet; that's
Phase 3 onward.

## Running it

You need Node.js 18+ installed. This was scaffolded in a sandbox with no
network access, so dependencies have **not** been installed yet — you'll do
that once, locally:

```bash
cd budget-app
npm install
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`). To try it on
your iPhone: run `npm run dev -- --host`, then open the printed network
address in Safari on your phone (same Wi-Fi network), and use "Add to Home
Screen" to install it as a PWA.

To build a production bundle:

```bash
npm run build
npm run preview
```

## What to test

1. **Create a vault** — pick a passphrase, opt into a recovery code, confirm
   you see it and can copy it.
2. **Reload the page** — you should land on the Unlock screen, not Create
   (the vault metadata persisted in IndexedDB).
3. **Unlock** with the passphrase — should succeed. Try a wrong passphrase —
   should fail cleanly with "Incorrect passphrase."
4. **Unlock with the recovery code** instead (use the "I forgot my
   passphrase" link) — should also work.
5. **Export an encrypted backup** — check the downloaded `.json` file; you
   should NOT be able to read any financial meaning in it (there's no real
   financial data yet in Phase 2, but you can confirm the wrapped key and
   metadata are the only readable structure).
6. **Auto-lock** — set it to 5 minutes, leave the tab inactive, confirm it
   locks. Set "immediately when app closes," switch tabs/apps, come back —
   should be locked.
7. **Inspect storage directly** — open DevTools → Application →
   IndexedDB → `local-budget-vault`. You should see only ciphertext bytes,
   an IV, a KDF salt, and a wrapped key — never a readable passphrase or key.

## What's intentionally not here yet

- Accounts, transactions, categories, budgets (Phase 3+)
- CSV import (Phase 4)
- Dashboard, reconciliation, net worth (later phases)
- Real app icons (placeholder teal icons are in `public/icons/` — swap
  these for real artwork whenever you like, they don't affect functionality)

## Security notes specific to this codebase

- `src/crypto/` is the only place cryptographic operations happen. If you
  ever want a security review, that folder plus `src/db/schema.ts` is the
  entire trusted computing base for data-at-rest protection.
- The Master Encryption Key only exists in memory, inside `vaultStore.ts`,
  while unlocked. Locking clears the reference immediately.
- See the architecture discussion earlier in this conversation for the full
  threat model — it applies to this exact code.
# Local Budget — Phase 3

A private, local-first budgeting app. Phase 2 built the encrypted vault
(create/unlock/lock, encrypted persistence, backup/restore). This phase adds
the first real budgeting functionality: accounts, transactions, and
categories, all encrypted the same way as everything else.

## What's in this phase

- **Accounts** — add checking/savings/credit card/cash/investment/loan/other
  accounts with a starting balance; archive instead of delete.
- **Transactions** — add/edit/delete transactions against an account, with
  merchant, date, amount, category, and notes. Account balances on the
  Accounts screen are computed live as starting balance + all transactions.
- **Categories** — a default hierarchy (Housing, Food, Transportation,
  Subscriptions, Income, each with sub-categories) is seeded automatically
  the first time you open the app. You can add your own on top of it.

**Deliberately not here yet**, per the phased plan: transfers between
accounts, reconciliation, CSV import, budgets, dashboard, net worth. Those
come in later phases.

## Running it

You need Node.js 18+ installed.

```bash
cd budget-app
npm install
npm run build   # catches type errors before you even open the app
npm run dev
```

Then open the URL it prints (usually `http://localhost:5173`). On iPhone:
`npm run dev -- --host`, open the printed network address in Safari, "Add to
Home Screen."

## What to test this phase

1. Add an account with a starting balance.
2. Add a transaction against it (try both "Spent" and "Received") — confirm
   the account balance updates correctly on the Accounts screen.
3. Edit a transaction — change its amount, category, or account — confirm
   it saves and the balance recalculates.
4. Delete a transaction — confirm it disappears and the balance adjusts.
5. Open the Categories tab — the five default groups should already be
   there. Add a custom category and confirm it appears as a choice when
   adding a transaction.
6. Reload the page mid-session — should land on Unlock; after unlocking,
   all accounts/transactions/categories should still be there, correctly
   decrypted.
7. Everything from the Phase 2 checklist should still work unchanged
   (create/unlock/lock/recovery code/backup export).

## Security notes specific to this codebase

- `src/crypto/` is still the only place cryptographic operations happen.
- `src/repositories/recordStore.ts` is the only place outside `src/crypto`
  that touches the encrypted `db.records` table directly — every domain
  repository (accounts/transactions/categories) goes through it, so the
  encrypt/decrypt boundary stays in one place.
- Account and transaction records are encrypted the same way vault data
  always has been — see the threat model from Phase 1 for what that does
  and doesn't protect against.

