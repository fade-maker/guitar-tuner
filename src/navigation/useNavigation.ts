import { useContext } from 'react';
import { NavigationContext } from './context';
import type { NavigationContextValue } from './context';

export function useNavigation(): NavigationContextValue {
  const context = useContext(NavigationContext);
  if (context === null) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
}
