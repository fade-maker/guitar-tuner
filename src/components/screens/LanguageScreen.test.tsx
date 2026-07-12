// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider, usePreferences } from '../../preferences';
import { LanguageScreen } from './LanguageScreen';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Probe(): ReactElement {
  const { screen: current } = useNavigation();
  const { preferences } = usePreferences();
  return (
    <>
      <span data-testid="current-screen">{current}</span>
      <span data-testid="current-language">{preferences.language}</span>
    </>
  );
}

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="language">
        <LanguageScreen />
        <Probe />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

describe('LanguageScreen', () => {
  it('renders all 3 supported languages, with the current one checked', () => {
    renderScreen();

    expect(screen.getByText('English')).not.toBeNull();
    expect(screen.getByText('Русский')).not.toBeNull();
    expect(screen.getByText('Español')).not.toBeNull();
    expect(screen.getByTestId('current-language').textContent).toBe('en');
  });

  it('selecting a language persists it to preferences without navigating away', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Русский'));

    expect(screen.getByTestId('current-language').textContent).toBe('ru');
    expect(screen.getByTestId('current-screen').textContent).toBe('language');
  });

  it('navigates back to Settings when the back button is tapped', () => {
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' }));

    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });

  it('re-rendering the screen after a language change shows the new language in the correct script', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Español'));

    // The screen's own title (t.languagePicker.title) switches language too, in the same render.
    expect(screen.getByText('Idioma')).not.toBeNull();
  });
});
