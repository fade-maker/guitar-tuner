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

  it('centers the pitch badge when in tune', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByTestId('pitch-badge-position').style.left).toBe('44.527%');
  });

  // Tune down renders label-then-circle (see SimplePitchBadge.tsx), so the badge is anchored via
  // `right` instead of `left` - positioning via `left` there would track the label's edge, not the
  // circle's. `left` is explicitly 'auto' in that case so it can't fight the `right` transition.
  it('shifts the pitch badge toward the right edge when sharp (tune down)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 20), clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByText('Tune down')).not.toBeNull();
    const style = screen.getByTestId('pitch-badge-position').style;
    expect(style.left).toBe('auto');
    // The circle's own right-edge margin shrinks as the reading moves further sharp - confirmed
    // against the base (in-tune) left-edge margin (44.527%), which is ~symmetric with the base
    // right-edge margin since the badge sits close to screen center at rest.
    expect(parseFloat(style.right)).toBeLessThan(44.527);
  });

  it('shifts the pitch badge left when flat (tune up)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -20), clarity: 0.95, timestamp: 1000 }));

    expect(screen.getByText('Tune up')).not.toBeNull();
    const left = parseFloat(screen.getByTestId('pitch-badge-position').style.left);
    expect(left).toBeLessThan(44.527);
  });

  // -200/+200 cents is where Figma's own demo screens show the circle stopping (16px from the
  // screen edge on each side) - confirmed as a hard stop, not an asymptote, so any reading at or
  // beyond that magnitude must land on the exact same position, not just approach it.
  it('reaches exactly the confirmed 16px-from-edge position at -200 cents and beyond (tune up)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -200), clarity: 0.95, timestamp: 1000 }));
    const leftAt200 = parseFloat(screen.getByTestId('pitch-badge-position').style.left);

    expect(leftAt200).toBeCloseTo(16 / 4.02, 1); // 16px / 402px reference width, as a percent

    cleanup();
    renderScreen();
    act(() => emitStatus('listening'));
    // -220, not something further out like -500: High E (E4) and the next-lowest string (B3) are a
    // perfect fourth apart (500 cents) - anything past roughly -250 cents stops being closer to E4
    // than to B3 and auto-detection retargets to B3 instead, which would show a small deviation
    // from B3, not a large clamped one from E4. -220 stays safely within E4's own nearest-target
    // range while still being past the -200 cap.
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -220), clarity: 0.95, timestamp: 1000 }));
    const leftAt220 = parseFloat(screen.getByTestId('pitch-badge-position').style.left);

    expect(leftAt220).toBeCloseTo(leftAt200, 5);
  });

  it('reaches exactly the confirmed 16px-from-edge position at +200 cents and beyond (tune down)', () => {
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 200), clarity: 0.95, timestamp: 1000 }));
    const rightAt200 = parseFloat(screen.getByTestId('pitch-badge-position').style.right);

    expect(rightAt200).toBeCloseTo(16 / 4.02, 1);

    cleanup();
    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, 500), clarity: 0.95, timestamp: 1000 }));
    const rightAt500 = parseFloat(screen.getByTestId('pitch-badge-position').style.right);

    expect(rightAt500).toBeCloseTo(rightAt200, 5);
  });

  it('keeps a moderate and a near-cap deviation visually distinguishable, not yet collapsed', () => {
    const { unmount } = renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -60), clarity: 0.95, timestamp: 1000 }));
    const leftAt60 = parseFloat(screen.getByTestId('pitch-badge-position').style.left);
    unmount();

    renderScreen();
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: shiftCents(HIGH_E_FREQUENCY, -150), clarity: 0.95, timestamp: 1000 }));
    const leftAt150 = parseFloat(screen.getByTestId('pitch-badge-position').style.left);

    expect(Math.abs(leftAt150 - leftAt60)).toBeGreaterThan(1);
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
});
