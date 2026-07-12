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
function shiftCents(frequency: number, cents: number): number {
  return frequency * 2 ** (cents / 1200);
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
  // jsdom has no real implementation of HTMLMediaElement.play() (it logs "Not implemented" and
  // returns undefined instead of a Promise) - this screen's default soundEffectsEnabled=true means
  // reaching "in tune" now really calls playInTuneSound(), same as AppShell.test.tsx's own matchMedia
  // stub for a jsdom gap this file never used to hit.
  Object.defineProperty(window.HTMLMediaElement.prototype, 'play', {
    value: vi.fn(() => Promise.resolve()),
    configurable: true,
  });
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

  it('renders bass as a single left column, G/D/A/E top to bottom (Figma 144:1976)', () => {
    window.localStorage.setItem(
      'guitar-tuner:preferences',
      JSON.stringify({ version: 1, preferences: { selectedInstrument: 'bass', selectedTuning: 'bass-standard' } }),
    );
    renderScreen();

    expect(screen.getByText('Bass 4-string')).not.toBeNull();
    const labels = screen.getAllByText(/^[A-G]$/).map((el) => el.textContent);
    expect(labels).toEqual(['G', 'D', 'A', 'E']);
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

  // The badge's movement is a translateX percentage on its full-width track wrapper (compositor-
  // friendly - see badgeOffsetPercent's comment), so 0% = in tune; sign = direction; the static
  // 44.527% anchor lives in CSS, not in this inline style.
  function badgeTranslatePercent(): number {
    const transform = screen.getByTestId('pitch-badge-position').style.transform;
    const match = /translateX\((-?[\d.]+)%\)/.exec(transform);
    expect(match).not.toBeNull();
    return parseFloat(match![1]);
  }

  it('centers the pitch badge when in tune', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    expect(badgeTranslatePercent()).toBe(0);
  });

  it('shifts the pitch badge right when sharp (tune down)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 20), clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByText('Tune down')).not.toBeNull();
    expect(badgeTranslatePercent()).toBeGreaterThan(0);
  });

  it('shifts the pitch badge left when flat (tune up)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -20), clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByText('Tune up')).not.toBeNull();
    expect(badgeTranslatePercent()).toBeLessThan(0);
  });

  it('clamps the pitch badge offset for extreme cents', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 500), clarity: 0.95, timestamp: 1000 }));

    expect(badgeTranslatePercent()).toBeCloseTo(40.547, 2);
  });

  it('shows a white trail behind the badge when in tune, riding the same track transform', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    const trail = screen.getByTestId('pitch-badge-trail');
    expect(trail.className).toContain('trailInTune');
    expect(trail.className).not.toContain('trailOffPitch');
    // The trail's own full-width track (its parent) is a sibling of pitch-badge-position, not
    // nested inside it - nesting it inside pitch-badge-position resolved its top/bottom percentages
    // against that element's own auto (content-sized) height instead of .main's, collapsing the
    // trail to zero height (a real bug caught via a live end-to-end run, not by jsdom alone). Both
    // tracks receive the identical inline transform instead.
    const track = screen.getByTestId('pitch-badge-position');
    expect(trail.parentElement).not.toBe(track);
    expect(trail.parentElement?.style.transform).toBe(track.style.transform);
  });

  it('shows a danger-colored trail when off pitch (tune up or down)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 20), clarity: 0.95, timestamp: 1000 }));

    const trail = screen.getByTestId('pitch-badge-trail');
    expect(trail.className).toContain('trailOffPitch');
    expect(trail.className).not.toContain('trailInTune');
  });

  it('does not render a trail before any reading arrives', () => {
    renderScreen();
    expect(screen.queryByTestId('pitch-badge-trail')).toBeNull();
  });

  it('navigates to select-tuning when the header title is tapped', () => {
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

    fireEvent.click(screen.getByText('Guitar 6-string'));

    expect(screen.getByTestId('current-screen').textContent).toBe('select-tuning');
  });

  it('resets every string\'s Tuned badge when switching from Auto to Manual', () => {
    renderScreen();
    act(() => emitStatus('listening'));

    const A_STRING = getStandardTuning().strings[1];
    const A_FREQUENCY = midiToFrequency(A_STRING.midi);
    const D_STRING = getStandardTuning().strings[2];
    const D_FREQUENCY = midiToFrequency(D_STRING.midi);

    // Bring the A string to locked + in-tune: sustain a steady reading well past lockDurationMs
    // (280ms), same pattern as useAudioEngine.test.ts's haptic test - a fixed number of hops rather
    // than an early-exit-on-inTune loop, since `inTune` alone can go true before `state` reaches
    // 'locked' (they're independent per TunerPresenter), which is what tunedTargetIds requires.
    let t = 1000;
    for (let i = 0; i < 40; i++) {
      t += 15;
      act(() => emitReading({ frequency: A_FREQUENCY, clarity: 0.95, timestamp: t }));
    }
    expect(screen.getByText('A').className.includes('_inTune_')).toBe(true);

    // Move the live target to a different string - A is no longer the current match, so it now
    // reads as "Tuned" (still confirmed in-tune earlier this session) rather than "In tune".
    t += 15;
    act(() => emitReading({ frequency: D_FREQUENCY, clarity: 0.95, timestamp: t }));
    expect(screen.getByText('A').className.includes('_tuned_')).toBe(true);

    // Auto -> Manual must clear that Tuned badge, not carry it over.
    fireEvent.click(screen.getByRole('switch', { name: 'Auto mode' }));

    expect(screen.getByText('A').className.includes('_tuned_')).toBe(false);
    expect(screen.getByText('A').className.includes('_default_')).toBe(true);
  });

  it('does not force a reset when switching from Manual back to Auto', () => {
    renderScreen();
    act(() => emitStatus('listening'));

    // Enter Manual and pin the D string.
    fireEvent.click(screen.getByRole('switch', { name: 'Auto mode' }));
    fireEvent.click(screen.getByText('D'));

    const D_STRING = getStandardTuning().strings[2];
    const D_FREQUENCY = midiToFrequency(D_STRING.midi);

    let t = 1000;
    for (let i = 0; i < 40; i++) {
      t += 15;
      act(() => emitReading({ frequency: D_FREQUENCY, clarity: 0.95, timestamp: t }));
    }
    expect(screen.getByText('D').className.includes('_inTune_')).toBe(true);

    // Manual -> Auto must behave exactly as before (unpinTarget() only) - the just-confirmed D
    // reading must not be thrown away by a forced reset() on this branch.
    fireEvent.click(screen.getByRole('switch', { name: 'Auto mode' }));

    expect(screen.getByText('D').className.includes('_inTune_')).toBe(true);
  });

  it('shows Selected on the manually-picked string before any reading confirms it', () => {
    renderScreen();

    // Enter Manual and pick D - no reading has arrived yet, so this used to show no feedback at all.
    fireEvent.click(screen.getByRole('switch', { name: 'Auto mode' }));
    fireEvent.click(screen.getByText('D'));

    expect(screen.getByText('D').className.includes('_selected_')).toBe(true);
    expect(screen.getByText('A').className.includes('_default_')).toBe(true);

    // Picking a different string moves Selected, rather than leaving D marked too.
    fireEvent.click(screen.getByText('A'));
    expect(screen.getByText('A').className.includes('_selected_')).toBe(true);
    expect(screen.getByText('D').className.includes('_default_')).toBe(true);
  });

  it('lets In tune take precedence over Selected once a reading confirms the picked string', () => {
    renderScreen();
    act(() => emitStatus('listening'));

    fireEvent.click(screen.getByRole('switch', { name: 'Auto mode' }));
    fireEvent.click(screen.getByText('D'));
    expect(screen.getByText('D').className.includes('_selected_')).toBe(true);

    const D_STRING = getStandardTuning().strings[2];
    const D_FREQUENCY = midiToFrequency(D_STRING.midi);
    let t = 1000;
    for (let i = 0; i < 40; i++) {
      t += 15;
      act(() => emitReading({ frequency: D_FREQUENCY, clarity: 0.95, timestamp: t }));
    }

    expect(screen.getByText('D').className.includes('_inTune_')).toBe(true);
    expect(screen.getByText('D').className.includes('_selected_')).toBe(false);
  });
});
