// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineStatus, PitchReading } from '../../audio-engine';

// Only the Web Audio/getUserMedia boundary is faked - same convention as SimpleTunerScreen.test.tsx.
const { fakeEngine, readingListeners, statusListeners } = vi.hoisted(() => {
  const readingListeners: Array<(reading: PitchReading) => void> = [];
  const statusListeners: Array<(status: EngineStatus) => void> = [];

  function register<T>(list: Array<(value: T) => void>, fn: (value: T) => void): () => void {
    list.push(fn);
    return () => {
      const index = list.indexOf(fn);
      if (index >= 0) list.splice(index, 1);
    };
  }

  const fakeEngine = {
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    subscribe: vi.fn((fn: (reading: PitchReading) => void) => register(readingListeners, fn)),
    onStatusChange: vi.fn((fn: (status: EngineStatus) => void) => register(statusListeners, fn)),
    onError: vi.fn(() => () => {}),
  };

  return { fakeEngine, readingListeners, statusListeners };
});

vi.mock('../../audio-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../audio-engine')>();
  return { ...actual, createAudioEngine: () => fakeEngine };
});

vi.mock('../../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

import { getStandardTuning, midiToFrequency } from '../../music-theory';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider } from '../../preferences';
import { AdvancedTunerScreen } from './AdvancedTunerScreen';

function emitReading(reading: PitchReading): void {
  readingListeners.forEach((fn) => fn(reading));
}
function emitStatus(status: EngineStatus): void {
  statusListeners.forEach((fn) => fn(status));
}

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="advanced-tuner">
        <AdvancedTunerScreen />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

const HIGH_E = getStandardTuning().strings[5];
const HIGH_E_FREQUENCY = midiToFrequency(HIGH_E.midi);

beforeEach(() => {
  readingListeners.length = 0;
  statusListeners.length = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

describe('AdvancedTunerScreen', () => {
  it('renders the header title and calibrate value', () => {
    renderScreen();
    expect(screen.getByText('Advanced tuning')).not.toBeNull();
    expect(screen.getAllByText('440Hz').length + screen.getAllByText('440').length).toBeGreaterThan(0);
  });

  it('shows the idle prompt and no note before any reading arrives', () => {
    renderScreen();
    expect(screen.getByText('Start playing')).not.toBeNull();
    expect(screen.queryByText('In tune!')).toBeNull();
  });

  it('shows the note and status badge once a reading arrives', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    expect(screen.queryByText('Start playing')).toBeNull();
    expect(screen.getByText('E')).not.toBeNull();
    expect(screen.getByText('In tune!')).not.toBeNull();
  });

  it('increments the A4 calibration via the large stepper buttons', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(screen.getByText('441')).not.toBeNull();
  });

  it('resets calibration to the default via the Reset button', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Increase' }));
    expect(screen.getByText('441')).not.toBeNull();
    fireEvent.click(screen.getByText('Reset'));
    expect(screen.getByText('440')).not.toBeNull();
  });

  it('navigates to settings when the footer Settings tab is tapped', () => {
    function ScreenProbe() {
      const { screen: current } = useNavigation();
      return <span data-testid="current-screen">{current}</span>;
    }

    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="advanced-tuner">
          <AdvancedTunerScreen />
          <ScreenProbe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });
});
