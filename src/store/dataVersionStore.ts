import { create } from 'zustand';

interface DataVersionState {
  version: number;
  bump: () => void;
}

/**
 * A deliberately dumb "something changed" signal. Every mutation in
 * recordStore.ts calls bump() afterward; every list-reading hook depends on
 * `version` so it refetches. This avoids pulling in a reactive-query
 * library just for a handful of screens — if the data model grows a lot
 * more complex later, dexie-react-hooks' useLiveQuery would be a
 * reasonable upgrade.
 */
export const useDataVersionStore = create<DataVersionState>((set) => ({
  version: 0,
  bump: () => set((s) => ({ version: s.version + 1 }))
}));
