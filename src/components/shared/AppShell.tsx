import { useState } from 'react';
import { AccountsScreen } from '../accounts/AccountsScreen';
import { TransactionsScreen } from '../transactions/TransactionsScreen';
import { CategoriesScreen } from '../categories/CategoriesScreen';
import { SettingsScreen } from '../settings/SettingsScreen';

type Tab = 'accounts' | 'transactions' | 'categories' | 'settings';

const TABS: { id: Tab; label: string }[] = [
  { id: 'accounts', label: 'Accounts' },
  { id: 'transactions', label: 'Transactions' },
  { id: 'categories', label: 'Categories' },
  { id: 'settings', label: 'Settings' }
];

export function AppShell() {
  const [tab, setTab] = useState<Tab>('accounts');

  return (
    <div className="app">
      <header className="app__header">
        <span className="app__title">Local Budget</span>
      </header>

      <main className="app__content">
        {tab === 'accounts' && <AccountsScreen />}
        {tab === 'transactions' && <TransactionsScreen />}
        {tab === 'categories' && <CategoriesScreen />}
        {tab === 'settings' && <SettingsScreen />}
      </main>

      <nav className="tab-bar">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            className={`tab-bar__item${tab === t.id ? ' active' : ''}`}
            onClick={() => setTab(t.id)}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
