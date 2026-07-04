import { useCallback, useMemo, useState } from 'react';
import type { ReactElement, ReactNode } from 'react';
import { NavigationContext } from './context';
import type { NavigationContextValue } from './context';
import type { ScreenId } from './types';

export interface NavigationProviderProps {
  readonly children: ReactNode;
  // Defaults to the real landing screen. Not wired to PermissionGate/engine status yet - see
  // CLAUDE.md's architecture log for why 'permission' isn't the default despite conceptually
  // gating everything else.
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
