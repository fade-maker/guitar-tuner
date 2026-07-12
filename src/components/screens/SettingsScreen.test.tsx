// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider, usePreferences } from '../../preferences';
import { SettingsScreen } from './SettingsScreen';

const { openExternalLink, useTelegramUser } = vi.hoisted(() => ({
  openExternalLink: vi.fn(),
  useTelegramUser: vi.fn(() => null as null | { displayName: string; username: string | null; photoUrl: string | null }),
}));
vi.mock('../../telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../telegram')>();
  return { ...actual, openExternalLink, useTelegramUser };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  openExternalLink.mockClear();
  useTelegramUser.mockReturnValue(null);
});

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="settings">
        <SettingsScreen />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

function NavigationProbe(): ReactElement {
  const { screen: current } = useNavigation();
  return <span data-testid="current-screen">{current}</span>;
}

function renderScreenWithNavigationProbe() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="settings">
        <SettingsScreen />
        <NavigationProbe />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

describe('SettingsScreen', () => {
  it('renders the profile placeholder and all rows', () => {
    renderScreen();
    expect(screen.getByText('Nickname')).not.toBeNull();
    expect(screen.getByText('@username')).not.toBeNull();
    expect(screen.getByText('Advanced mode')).not.toBeNull();
    expect(screen.getByText('Sound effect')).not.toBeNull();
    expect(screen.getByText('Left-handed mode')).not.toBeNull();
    expect(screen.getByText('Calibrate')).not.toBeNull();
    expect(screen.getByText('Language')).not.toBeNull();
    expect(screen.getByText('Support')).not.toBeNull();
    expect(screen.getByText('FAQ')).not.toBeNull();
    expect(screen.getByText('TunerApp v.1.0.0')).not.toBeNull();
  });

  it('shows the real Telegram display name and username when available', () => {
    useTelegramUser.mockReturnValue({ displayName: 'Ada Lovelace', username: 'ada', photoUrl: 'https://t.me/ada.jpg' });
    renderScreen();
    expect(screen.getByText('Ada Lovelace')).not.toBeNull();
    expect(screen.getByText('@ada')).not.toBeNull();
    expect(screen.queryByText('Nickname')).toBeNull();
    expect(screen.queryByText('@username')).toBeNull();
  });

  it('omits the username line when the real Telegram user has no username', () => {
    useTelegramUser.mockReturnValue({ displayName: 'Ada Lovelace', username: null, photoUrl: null });
    renderScreen();
    expect(screen.getByText('Ada Lovelace')).not.toBeNull();
    expect(screen.queryByText('@username')).toBeNull();
    expect(screen.queryByText(/^@/)).toBeNull();
  });

  it('toggles preferences.tunerMode via the Advanced mode switch', () => {
    function ModeProbe() {
      const { preferences } = usePreferences();
      return <span data-testid="tuner-mode">{preferences.tunerMode}</span>;
    }
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="settings">
          <SettingsScreen />
          <ModeProbe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('tuner-mode').textContent).toBe('simple');
    fireEvent.click(screen.getByRole('switch', { name: 'Advanced mode' }));
    expect(screen.getByTestId('tuner-mode').textContent).toBe('advanced');
  });

  it('toggles preferences.leftHanded via the Left-handed mode switch', () => {
    function HandProbe() {
      const { preferences } = usePreferences();
      return <span data-testid="left-handed">{String(preferences.leftHanded)}</span>;
    }
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="settings">
          <SettingsScreen />
          <HandProbe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('left-handed').textContent).toBe('false');
    fireEvent.click(screen.getByRole('switch', { name: 'Left-handed mode' }));
    expect(screen.getByTestId('left-handed').textContent).toBe('true');
  });

  it('toggles preferences.soundEffectsEnabled via the Sound effect switch', () => {
    function SoundProbe() {
      const { preferences } = usePreferences();
      return <span data-testid="sound-effects">{String(preferences.soundEffectsEnabled)}</span>;
    }
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="settings">
          <SettingsScreen />
          <SoundProbe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByTestId('sound-effects').textContent).toBe('true');
    fireEvent.click(screen.getByRole('switch', { name: 'Sound effect' }));
    expect(screen.getByTestId('sound-effects').textContent).toBe('false');
  });

  it('opens the Telegram support URL when the Support row is tapped', () => {
    renderScreen();
    fireEvent.click(screen.getByText('Support'));
    expect(openExternalLink).toHaveBeenCalledWith('https://t.me/vrwrxx');
  });

  it('navigates to the FAQ screen when the FAQ row is tapped', () => {
    renderScreenWithNavigationProbe();
    fireEvent.click(screen.getByText('FAQ'));
    expect(screen.getByTestId('current-screen').textContent).toBe('faq');
  });

  it('navigates to the Language screen when the Language row is tapped, and shows the current language', () => {
    renderScreenWithNavigationProbe();
    expect(screen.getByText('English')).not.toBeNull(); // default language's own display name
    fireEvent.click(screen.getByText('Language'));
    expect(screen.getByTestId('current-screen').textContent).toBe('language');
  });

  it('increments and decrements preferences.a4Frequency via the Calibrate stepper', () => {
    renderScreen();
    expect(screen.getByText('440Hz')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(screen.getByText('441Hz')).not.toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Decrease' }));
    expect(screen.getByText('440Hz')).not.toBeNull();
  });
});
