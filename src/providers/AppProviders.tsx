import type { ReactElement, ReactNode } from 'react';
import { PreferencesProvider } from '../preferences';

export interface AppProvidersProps {
  readonly children: ReactNode;
}

// Single composition root for every app-level provider. New cross-cutting providers (navigation,
// theme, anything Telegram-adapter-backed that needs context) nest here, in whatever order they
// depend on each other, so App.tsx never has to know the wrapping order itself.
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}
