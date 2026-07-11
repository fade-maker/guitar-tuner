import type { ReactElement, ReactNode } from 'react';
import { NavigationProvider } from '../navigation';
import { PreferencesProvider } from '../preferences';

export interface AppProvidersProps {
  readonly children: ReactNode;
}

// Single composition root for every app-level provider. New cross-cutting providers (theme,
// anything Telegram-adapter-backed that needs context) nest here, in whatever order they depend on
// each other, so App.tsx never has to know the wrapping order itself.
//
// initialScreen="permission" resolves the integration decision Stage 5's log deferred ("which
// screen renders while the permission gate is closed"): the real app now always boots into the
// Permission screen, which immediately skips itself to the tuner when microphone access is already
// granted from a previous session (see PermissionScreen.tsx) - so returning users never actually
// see it, and first-time users get the explicit request-behind-a-button flow instead of the tuner
// prompting the moment the app loads.
export function AppProviders({ children }: AppProvidersProps): ReactElement {
  return (
    <PreferencesProvider>
      <NavigationProvider initialScreen="permission">{children}</NavigationProvider>
    </PreferencesProvider>
  );
}
