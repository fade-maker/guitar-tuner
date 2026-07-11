import { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { NavigationContext } from './context';
import type { NavigationContextValue } from './context';
import type { ScreenId } from './types';

export interface NavigationProviderProps {
  readonly children: ReactNode;
  // The real app boots into 'permission' (AppProviders passes it explicitly; the Permission screen
  // skips itself to the tuner when mic access is already granted). This default exists for tests
  // and debug entry points that mount a screen directly without caring about the permission flow.
  readonly initialScreen?: ScreenId;
}

export function NavigationProvider({ children, initialScreen = 'simple-tuner' }: NavigationProviderProps): ReactElement {
  const [screen, setScreen] = useState<ScreenId>(initialScreen);

  const navigateTo = useCallback((next: ScreenId) => {
    setScreen(next);
  }, []);

  const value = useMemo<NavigationContextValue>(() => ({ screen, navigateTo }), [screen, navigateTo]);

  return <NavigationContext.Provider value={value}>{children}</NavigationContext.Provider>;
}
