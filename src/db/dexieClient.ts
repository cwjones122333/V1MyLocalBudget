import Dexie, { type Table } from 'dexie';
import type { EncryptedRecord, VaultMeta } from './schema';

export class BudgetDatabase extends Dexie {
  vaultMeta!: Table<VaultMeta, string>;
  records!: Table<EncryptedRecord, string>;

  constructor() {
    super('local-budget-vault');

    // Dexie schema versioning is separate from our own payloadVersion /
    // formatVersion concepts above — this only describes IndexedDB's
    // table/index structure. Bump this .version() call (with an upgrade
    // function) if we ever add/remove an INDEXED field, not for changes to
    // what's inside the encrypted payloads.
    this.version(1).stores({
      vaultMeta: 'id',
      records: 'id, type, accountId, yearMonth, [type+yearMonth], [type+accountId]'
    });
  }
}

export const db = new BudgetDatabase();
