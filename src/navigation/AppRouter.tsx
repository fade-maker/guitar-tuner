import type { ReactElement } from 'react';
import { resolveScreen } from './resolveScreen';
import { useNavigation } from './useNavigation';

// Deliberately a plain switch (via resolveScreen), not a routing library dependency - a single-view
// Telegram Mini App with 5 flat screens doesn't need one, and CLAUDE.md rules out unnecessary
// dependencies.
export function AppRouter(): ReactElement {
  const { screen } = useNavigation();
  return resolveScreen(screen);
}
