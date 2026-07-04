import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { PreferencesContext } from './context';
import type { PreferencesContextValue } from './context';
import { DEFAULT_PREFERENCES } from './defaults';
import { loadPreferences, savePreferences } from './storage';
import type { AppPreferences } from './types';

export interface PreferencesProviderProps {
  readonly children: ReactNode;
}

export function PreferencesProvider({ children }: PreferencesProviderProps): ReactElement {
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());

  // Every change persists as a whole - simpler and cheap enough at this size than diffing which
  // key changed, and it means savePreferences never has to reason about partial updates.
  useEffect(() => {
    savePreferences(preferences);
  }, [preferences]);

  const setPreference = useCallback(<K extends keyof AppPreferences>(key: K, value: AppPreferences[K]) => {
    setPreferences((current) => ({ ...current, [key]: value }));
  }, []);

  const resetPreferences = useCallback(() => {
    setPreferences(DEFAULT_PREFERENCES);
  }, []);

  const value = useMemo<PreferencesContextValue>(
    () => ({ preferences, setPreference, resetPreferences }),
    [preferences, setPreference, resetPreferences],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}
