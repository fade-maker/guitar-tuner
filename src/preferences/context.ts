import { createContext } from 'react';
import type { AppPreferences } from './types';

export interface PreferencesContextValue {
  readonly preferences: AppPreferences;
  setPreference<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]): void;
  resetPreferences(): void;
}

export const PreferencesContext = createContext<PreferencesContextValue | null>(null);
