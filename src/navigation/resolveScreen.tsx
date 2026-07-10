import type { ReactElement } from 'react';
import {
  AdvancedTunerScreen,
  PermissionScreen,
  SelectTuningScreen,
  SettingsScreen,
  SimpleTunerScreen,
} from '../components/screens';
import type { ScreenId } from './types';

// Separate from AppRouter.tsx (which exports a component) so react-refresh/only-export-components
// doesn't flag it - same split-file convention as preferences/'s context.ts vs PreferencesProvider.tsx.
// RouteTransition.tsx needs this to render an arbitrary ScreenId (the screen currently exiting, not
// just whatever NavigationProvider says is current), not just AppRouter's own single "current" case.
export function resolveScreen(screen: ScreenId): ReactElement {
  switch (screen) {
    case 'simple-tuner':
      return <SimpleTunerScreen />;
    case 'advanced-tuner':
      return <AdvancedTunerScreen />;
    case 'select-tuning':
      return <SelectTuningScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'permission':
      return <PermissionScreen />;
  }
}
