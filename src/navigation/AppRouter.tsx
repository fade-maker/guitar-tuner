import type { ReactElement } from 'react';
import {
  AdvancedTunerScreen,
  FAQScreen,
  PermissionScreen,
  SelectTuningScreen,
  SettingsScreen,
  SimpleTunerScreen,
} from '../components/screens';
import { useNavigation } from './useNavigation';

// Deliberately a plain switch, not a routing library dependency - a single-view Telegram Mini App
// with 5 flat screens doesn't need one, and CLAUDE.md rules out unnecessary dependencies.
export function AppRouter(): ReactElement {
  const { screen } = useNavigation();

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
    case 'faq':
      return <FAQScreen />;
  }
}
