import type { ReactElement } from 'react';
import { AppRouter, useNavigation } from '../../navigation';
import type { ScreenId } from '../../navigation';
import { usePreferences } from '../../preferences';
import { useTelegramUser } from '../../telegram';
import { FooterNavigation } from '../ui';
import type { FooterNavigationTab } from '../ui';
import { ViewportScreen } from './ViewportScreen';

// Screens that render full-bleed with no Bottom Navigation at all: Select Tuning (removed from
// Figma for this screen) and Permission (today a placeholder, but its own Figma exception is a
// single button, not the tab bar, once built for real). A screen ends up here by being listed,
// never by choosing whether to render FooterNavigation itself - only AppShell ever creates it.
const SCREENS_WITHOUT_FOOTER: ReadonlySet<ScreenId> = new Set(['select-tuning', 'permission']);

function footerTabFor(screen: ScreenId): FooterNavigationTab {
  return screen === 'settings' ? 'Settings' : 'Tuner';
}

// The single mount point for both the routed screen content and Bottom Navigation - see
// CLAUDE.md's Bottom Navigation architecture log for why this exists. Previously every screen that
// wanted a footer created its own <FooterNavigation> (three duplicated onSelect handlers, only one
// of which correctly accounted for preferences.tunerMode) and it remounted from scratch on every
// navigation because it lived inside the subtree AppRouter swaps out. Screens no longer know
// FooterNavigation exists; they can only opt out of it by being listed in SCREENS_WITHOUT_FOOTER.
export function AppShell(): ReactElement {
  const { screen, navigateTo } = useNavigation();
  const { preferences } = usePreferences();
  const telegramUser = useTelegramUser();

  function handleFooterSelect(tab: FooterNavigationTab): void {
    if (tab === 'Settings') {
      navigateTo('settings');
    } else {
      navigateTo(preferences.tunerMode === 'advanced' ? 'advanced-tuner' : 'simple-tuner');
    }
  }

  const footer = SCREENS_WITHOUT_FOOTER.has(screen) ? undefined : (
    <FooterNavigation active={footerTabFor(screen)} onSelect={handleFooterSelect} avatarUrl={telegramUser?.photoUrl} />
  );

  return (
    <ViewportScreen footer={footer}>
      <AppRouter />
    </ViewportScreen>
  );
}
