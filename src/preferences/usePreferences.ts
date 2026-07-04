import { useContext } from 'react';
import { PreferencesContext } from './context';
import type { PreferencesContextValue } from './context';

export function usePreferences(): PreferencesContextValue {
  const context = useContext(PreferencesContext);
  if (context === null) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
}
