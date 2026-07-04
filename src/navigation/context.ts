import { createContext } from 'react';
import type { ScreenId } from './types';

export interface NavigationContextValue {
  readonly screen: ScreenId;
  navigateTo(screen: ScreenId): void;
}

export const NavigationContext = createContext<NavigationContextValue | null>(null);
