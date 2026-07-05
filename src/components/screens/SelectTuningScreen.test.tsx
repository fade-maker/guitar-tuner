// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider, usePreferences } from '../../preferences';
import { SelectTuningScreen } from './SelectTuningScreen';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="select-tuning">
        <SelectTuningScreen />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

describe('SelectTuningScreen', () => {
  it('defaults to the Guitar segment showing both guitar tunings', () => {
    renderScreen();
    expect(screen.getByRole('tab', { name: 'Guitar 6-string' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Standard')).not.toBeNull();
    expect(screen.getByText('Drop-D')).not.toBeNull();
  });

  it('shows only the Bass standard tuning after switching segments (no bass-drop-d preset exists)', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' }));

    expect(screen.getAllByText('Standard')).toHaveLength(1);
    expect(screen.queryByText('Drop-D')).toBeNull();
  });

  it('excludes ukulele from both segments', () => {
    renderScreen();
    expect(screen.queryByRole('tab', { name: /ukulele/i })).toBeNull();
  });

  it('selects a tuning, persists it, and navigates back to the tuner', () => {
    function Probe() {
      const { preferences } = usePreferences();
      const { screen: current } = useNavigation();
      return (
        <>
          <span data-testid="selected-tuning">{preferences.selectedTuning}</span>
          <span data-testid="selected-instrument">{preferences.selectedInstrument}</span>
          <span data-testid="current-screen">{current}</span>
        </>
      );
    }

    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="select-tuning">
          <SelectTuningScreen />
          <Probe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByText('Drop-D'));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-drop-d');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('guitar');
    expect(screen.getByTestId('current-screen').textContent).toBe('simple-tuner');
  });

  // No Bottom Navigation on this screen at all (removed from Figma) - one of the two documented
  // exceptions to "every main screen has the footer in the same place" (the other being
  // Permission's single button).
  it('renders no footer/Bottom Navigation', () => {
    renderScreen();
    expect(screen.queryByRole('navigation')).toBeNull();
    expect(screen.queryByText('Settings')).toBeNull();
  });
});
