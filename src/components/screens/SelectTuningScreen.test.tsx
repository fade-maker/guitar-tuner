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

  function renderWithProbe() {
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

    return render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="select-tuning">
          <SelectTuningScreen />
          <Probe />
        </NavigationProvider>
      </PreferencesProvider>,
    );
  }

  // Tapping a row only marks it as the pending choice now (Figma's "Frame 1", 174:1392, added a
  // Save button specifically to gate this - see CLAUDE.md) - it must not touch preferences or
  // navigation on its own anymore.
  it('tapping a row does not persist or navigate on its own', () => {
    renderWithProbe();
    fireEvent.click(screen.getByText('Drop-D'));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-standard');
    expect(screen.getByTestId('current-screen').textContent).toBe('select-tuning');
    // CheckIndicator's "Active" state renders its checkmark path in this exact fill color (see
    // CheckIndicator.tsx) - confirms the tap did mark Drop-D as the pending choice, just without
    // persisting it yet.
    expect(screen.getByText('Drop-D').closest('button')?.querySelector('path[fill="#4682D5"]')).not.toBeNull();
  });

  it('selects a tuning, persists it, and navigates back to the tuner once Save is pressed', () => {
    renderWithProbe();

    fireEvent.click(screen.getByText('Drop-D'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-drop-d');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('guitar');
    expect(screen.getByTestId('current-screen').textContent).toBe('simple-tuner');
  });

  it('Save persists whichever tuning is pending even after switching segments to browse', () => {
    renderWithProbe();

    fireEvent.click(screen.getByText('Drop-D')); // pick a guitar tuning
    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' })); // just browsing
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-drop-d');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('guitar');
  });
});
