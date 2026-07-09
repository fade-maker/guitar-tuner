// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider, usePreferences } from '../../preferences';
import { SelectTuningScreen } from './SelectTuningScreen';

// jsdom doesn't implement scrollIntoView at all (not even as a no-op) - every test that expands a
// catalog exercises handleCategoryToggle's scrollIntoView call, not just the dedicated scroll tests
// below, so this needs to be a global stub rather than scoped to one describe block.
beforeEach(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

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
  it('defaults to the Guitar segment, showing Standard directly and the catalog collapsed', () => {
    renderScreen();
    expect(screen.getByRole('tab', { name: 'Guitar 6-string' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByText('Standard')).not.toBeNull();
    expect(screen.getByText('Power')).not.toBeNull();
    expect(screen.getByText('Open')).not.toBeNull();
    expect(screen.getByText('Extras')).not.toBeNull();
    // Collapsed by default - Drop-D (inside Power) isn't in the DOM until Power is expanded.
    expect(screen.queryByText('Drop-D')).toBeNull();
  });

  it('expands a catalog to reveal its tunings, and collapses it again on a second tap', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Power'));
    expect(screen.getByText('Drop-D')).not.toBeNull();
    expect(screen.getByText('Drop C')).not.toBeNull();

    fireEvent.click(screen.getByText('Power'));
    expect(screen.queryByText('Drop-D')).toBeNull();
  });

  it('only keeps one catalog expanded at a time', () => {
    renderScreen();

    fireEvent.click(screen.getByText('Power'));
    expect(screen.getByText('Drop-D')).not.toBeNull();

    fireEvent.click(screen.getByText('Open'));
    expect(screen.queryByText('Drop-D')).toBeNull();
    expect(screen.getByText('Open C')).not.toBeNull();
  });

  it('shows Standard plus a plain (no catalog headers) list of bass tunings after switching segments', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' }));

    expect(screen.getAllByText('Standard')).toHaveLength(1);
    // No accordion for Bass (140:1289 has none) - every one of its own tunings is already visible,
    // nothing to expand.
    expect(screen.queryByText('Power')).toBeNull();
    expect(screen.getByText('Drop D')).not.toBeNull();
    expect(screen.getByText('E flat')).not.toBeNull();
    expect(screen.getByText('Drop C')).not.toBeNull();
    expect(screen.getByText('Low C')).not.toBeNull();
    expect(screen.getByText('Low B')).not.toBeNull();
  });

  it('selects and saves a bass tuning directly, with no expand step needed', () => {
    renderWithProbe();

    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' }));
    fireEvent.click(screen.getByText('Low B'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('bass-low-b');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('bass');
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
    fireEvent.click(screen.getByText('Power'));
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

    fireEvent.click(screen.getByText('Power'));
    fireEvent.click(screen.getByText('Drop-D'));
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-drop-d');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('guitar');
    expect(screen.getByTestId('current-screen').textContent).toBe('simple-tuner');
  });

  it('Save persists whichever tuning is pending even after switching segments to browse', () => {
    renderWithProbe();

    fireEvent.click(screen.getByText('Power'));
    fireEvent.click(screen.getByText('Drop-D')); // pick a guitar tuning
    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' })); // just browsing
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));

    expect(screen.getByTestId('selected-tuning').textContent).toBe('guitar-drop-d');
    expect(screen.getByTestId('selected-instrument').textContent).toBe('guitar');
  });

  describe('raise-on-expand scroll behavior', () => {
    it('scrolls (raises) the screen when a catalog is expanded from idle', () => {
      renderScreen();

      fireEvent.click(screen.getByText('Power'));

      expect(Element.prototype.scrollIntoView).toHaveBeenCalledWith({ behavior: 'auto', block: 'start' });
    });

    it('does not scroll again when expanding a different catalog while already raised', () => {
      renderScreen();

      fireEvent.click(screen.getByText('Power'));
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

      // Simulate already being raised (jsdom doesn't implement real scrolling, so scrollTop is
      // driven manually here rather than via a real scroll-snap gesture).
      const scrollArea = document.querySelector('[class*="scrollArea"]') as HTMLElement;
      Object.defineProperty(scrollArea, 'scrollTop', { value: 368, configurable: true });

      fireEvent.click(screen.getByText('Open'));
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    });

    it('does not scroll when collapsing an expanded catalog', () => {
      renderScreen();

      fireEvent.click(screen.getByText('Power'));
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);

      fireEvent.click(screen.getByText('Power')); // collapse
      expect(Element.prototype.scrollIntoView).toHaveBeenCalledTimes(1);
    });
  });
});
