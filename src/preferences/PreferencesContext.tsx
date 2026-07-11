import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { PreferencesContext } from './context';
import type { PreferencesContextValue } from './context';
import { DEFAULT_PREFERENCES } from './defaults';
import { loadPreferences, savePreferences } from './storage';
import type { AppPreferences } from './types';

export interface PreferencesProviderProps {
  readonly children: ReactNode;
}

// Trailing debounce for the localStorage write (audit M3): holding a Calibrate stepper produces a
// burst of preference changes, each of which used to run JSON.stringify + a synchronous setItem
// immediately. One write 150ms after the burst settles is indistinguishable in behavior.
const SAVE_DEBOUNCE_MS = 150;

export function PreferencesProvider({ children }: PreferencesProviderProps): ReactElement {
  const [preferences, setPreferences] = useState<AppPreferences>(() => loadPreferences());

  // Every change persists as a whole - simpler and cheap enough at this size than diffing which
  // key changed, and it means savePreferences never has to reason about partial updates.
  const pendingRef = useRef<AppPreferences | null>(null);
  useEffect(() => {
    pendingRef.current = preferences;
    const timer = setTimeout(() => {
      pendingRef.current = null;
      savePreferences(preferences);
    }, SAVE_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [preferences]);

  // The debounce must not lose the last change when the app closes within its window - 'pagehide'
  // is the reliable mobile-WebView lifecycle signal ('beforeunload' often never fires there) and
  // flushes whatever is still pending. Registered once; reads through the ref so it never needs
  // re-subscribing per change.
  useEffect(() => {
    const flush = (): void => {
      if (pendingRef.current !== null) {
        savePreferences(pendingRef.current);
        pendingRef.current = null;
      }
    };
    window.addEventListener('pagehide', flush);
    return () => {
      window.removeEventListener('pagehide', flush);
      flush(); // provider unmount (app teardown) flushes too, same as leaving the page
    };
  }, []);

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
