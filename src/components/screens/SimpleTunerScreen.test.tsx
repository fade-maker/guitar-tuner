// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineStatus, PitchReading } from '../../audio-engine';

// Only the Web Audio/getUserMedia boundary is faked - same convention as useAudioEngine.test.ts.
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
import { SimpleTunerScreen } from './SimpleTunerScreen';

function emitReading(reading: PitchReading): void {
  readingListeners.forEach((fn) => fn(reading));
}
function emitStatus(status: EngineStatus): void {
  statusListeners.forEach((fn) => fn(status));
}

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="simple-tuner">
        <SimpleTunerScreen />
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

describe('SimpleTunerScreen', () => {
  it('renders the default tuning in the header', () => {
    renderScreen();
    expect(screen.getByText('Guitar 6-string')).not.toBeNull();
    expect(screen.getByText('Standard')).not.toBeNull();
  });

  it('renders all 6 strings, split D/A/E left and G/B/E right', () => {
    renderScreen();
    expect(screen.getAllByText('D')).toHaveLength(1);
    expect(screen.getAllByText('A')).toHaveLength(1);
    expect(screen.getAllByText('G')).toHaveLength(1);
    expect(screen.getAllByText('B')).toHaveLength(1);
    expect(screen.getAllByText('E')).toHaveLength(2); // low E and high E
  });

  it('hides the pitch badge and current note before any reading arrives', () => {
    renderScreen();
    expect(screen.queryByText('In tune!')).toBeNull();
    expect(screen.queryByText('Tune up')).toBeNull();
    expect(screen.queryByText('Tune down')).toBeNull();
  });

  it('shows the pitch badge and current note once a reading arrives', () => {
    renderScreen();

    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByText('In tune!')).not.toBeNull();
    expect(screen.getByText('E⁴')).not.toBeNull(); // CurrentTargetNote for High E (E4)
  });

  it('navigates to settings when the footer Settings tab is tapped', () => {
    function ScreenProbe() {
      const { screen: current } = useNavigation();
      return <span data-testid="current-screen">{current}</span>;
    }

    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="simple-tuner">
          <SimpleTunerScreen />
          <ScreenProbe />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    fireEvent.click(screen.getByText('Settings'));

    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });
});
