// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { AudioEngineError, AudioEngineOverrides, EngineStatus, PitchReading } from '../audio-engine';

// Only AudioEngine (the real Web Audio/getUserMedia boundary) is faked here. TunerPresenter is the
// real, already-tested implementation, so these tests exercise the real presenter logic through the
// hook's wiring, not a second mock of it.
const { fakeEngine, createAudioEngineMock, readingListeners, statusListeners, errorListeners } = vi.hoisted(() => {
  const readingListeners: Array<(reading: PitchReading) => void> = [];
  const statusListeners: Array<(status: EngineStatus) => void> = [];
  const errorListeners: Array<(error: AudioEngineError) => void> = [];

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
    onError: vi.fn((fn: (error: AudioEngineError) => void) => register(errorListeners, fn)),
  };

  const createAudioEngineMock = vi.fn<(overrides?: AudioEngineOverrides) => typeof fakeEngine>(
    () => fakeEngine,
  );

  return { fakeEngine, createAudioEngineMock, readingListeners, statusListeners, errorListeners };
});

vi.mock('../audio-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../audio-engine')>();
  return { ...actual, createAudioEngine: createAudioEngineMock };
});

vi.mock('../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

vi.mock('../sound/playInTuneSound', () => ({
  playInTuneSound: vi.fn(),
}));

import { getAllTunings, getStandardTuning, midiToFrequency } from '../music-theory';
import { playInTuneSound } from '../sound/playInTuneSound';
import { triggerHapticFeedback } from '../telegram/haptics';
import { useAudioEngine } from './useAudioEngine';

const HIGH_E = getStandardTuning().strings[5];
const HIGH_E_FREQUENCY = midiToFrequency(HIGH_E.midi);
const HOP_MS = 15;

const DROP_D_TUNING = getAllTunings().find((tuning) => tuning.id === 'guitar-drop-d')!;
const BASS_TUNING = getAllTunings().find((tuning) => tuning.id === 'bass-standard')!;

function emitReading(reading: PitchReading): void {
  readingListeners.forEach((fn) => fn(reading));
}
function emitStatus(status: EngineStatus): void {
  statusListeners.forEach((fn) => fn(status));
}
function emitError(error: AudioEngineError): void {
  errorListeners.forEach((fn) => fn(error));
}

beforeEach(() => {
  fakeEngine.start.mockClear();
  fakeEngine.stop.mockClear();
  createAudioEngineMock.mockClear();
  readingListeners.length = 0;
  statusListeners.length = 0;
  errorListeners.length = 0;
  vi.mocked(triggerHapticFeedback).mockClear();
  vi.mocked(playInTuneSound).mockClear();
  // Fully deterministic: the tick loop never fires on its own during these tests, so every
  // presentation-state change is driven explicitly by emitReading/emitStatus.
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useAudioEngine - instrument profile wiring', () => {
  it('builds the engine with a per-instrument window + range derived from the tuning targets', () => {
    renderHook(() => useAudioEngine(getStandardTuning()));
    const guitarOverrides = createAudioEngineMock.mock.calls[0]?.[0];
    expect(guitarOverrides?.windowDurationMs).toBe(46);
    expect(guitarOverrides?.instrumentRange).toBeDefined();

    cleanup();
    createAudioEngineMock.mockClear();

    renderHook(() => useAudioEngine(BASS_TUNING));
    const bassOverrides = createAudioEngineMock.mock.calls[0]?.[0];
    // Bass gets a materially longer window (its low E is too low for the 46ms guitar window).
    expect(bassOverrides?.windowDurationMs).toBeGreaterThan(46);
    // ...and a lower instrument-range floor than guitar, matching its lower lowest string.
    expect(bassOverrides?.instrumentRange?.minFrequency).toBeLessThan(
      guitarOverrides!.instrumentRange!.minFrequency,
    );
  });
});

describe('useAudioEngine', () => {
  it('starts idle, not running, with a searching presentation', () => {
    const { result } = renderHook(() => useAudioEngine());

    expect(result.current.engineStatus).toBe('idle');
    expect(result.current.isRunning).toBe(false);
    expect(result.current.error).toBeNull();
    expect(result.current.frequency).toBeNull();
    expect(result.current.presentation.state).toBe('searching');
  });

  it('defaults to standard tuning when no preset is given', () => {
    const { result } = renderHook(() => useAudioEngine());

    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));

    expect(result.current.presentation.target?.label).toBe(HIGH_E.label);
  });

  it('threads a given tuning preset into the presenter from the start', () => {
    const { result } = renderHook(() => useAudioEngine(BASS_TUNING));

    act(() => emitStatus('listening'));
    const bassLowE = BASS_TUNING.strings[0];
    act(() => emitReading({ frequency: midiToFrequency(bassLowE.midi), clarity: 0.95, timestamp: 1000 }));

    expect(result.current.presentation.target?.id).toBe(bassLowE.id);
    expect(result.current.presentation.target?.label).toBe(bassLowE.label);
  });

  it('re-targets the presenter via setTargets() when the tuning preset changes across renders', () => {
    const { result, rerender } = renderHook(({ preset }) => useAudioEngine(preset), {
      initialProps: { preset: getStandardTuning() },
    });
    act(() => emitStatus('listening'));

    const dropDLowString = DROP_D_TUNING.strings[0];
    rerender({ preset: DROP_D_TUNING });
    act(() => emitReading({ frequency: midiToFrequency(dropDLowString.midi), clarity: 0.95, timestamp: 1000 }));

    expect(result.current.presentation.target?.label).toBe(dropDLowString.label);
  });

  it('threads a given a4 into the presenter from the start', () => {
    const { result } = renderHook(() => useAudioEngine(getStandardTuning(), 432));

    act(() => emitStatus('listening'));
    act(() =>
      emitReading({ frequency: midiToFrequency(HIGH_E.midi, 432), clarity: 0.95, timestamp: 1000 }),
    );

    expect(result.current.presentation.target?.label).toBe(HIGH_E.label);
    expect(result.current.presentation.cents).toBeCloseTo(0, 0);
  });

  it('re-calibrates the presenter via setA4() when the a4 argument changes across renders', () => {
    const { result, rerender } = renderHook(({ a4 }) => useAudioEngine(getStandardTuning(), a4), {
      initialProps: { a4: 440 },
    });
    act(() => emitStatus('listening'));

    rerender({ a4: 432 });
    act(() =>
      emitReading({ frequency: midiToFrequency(HIGH_E.midi, 432), clarity: 0.95, timestamp: 1000 }),
    );

    expect(result.current.presentation.target?.label).toBe(HIGH_E.label);
    expect(result.current.presentation.cents).toBeCloseTo(0, 0);
  });

  it('delegates start()/stop() to the AudioEngine instance', async () => {
    const { result } = renderHook(() => useAudioEngine());

    await act(async () => {
      await result.current.start();
    });
    expect(fakeEngine.start).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.stop();
    });
    expect(fakeEngine.stop).toHaveBeenCalledTimes(1);
  });

  it('reflects engine status changes, including isRunning', () => {
    const { result } = renderHook(() => useAudioEngine());

    act(() => emitStatus('requesting-permission'));
    expect(result.current.engineStatus).toBe('requesting-permission');
    expect(result.current.isRunning).toBe(false);

    act(() => emitStatus('listening'));
    expect(result.current.engineStatus).toBe('listening');
    expect(result.current.isRunning).toBe(true);
  });

  it('feeds every PitchReading into the presenter and exposes the result', () => {
    const { result } = renderHook(() => useAudioEngine());

    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: 440, clarity: 0.95, timestamp: 1000 }));

    expect(result.current.frequency).toBe(440);
    expect(result.current.presentation.state).toBe('active');
    expect(result.current.presentation.target).not.toBeNull();
  });

  it('surfaces AudioEngine errors directly', () => {
    const { result } = renderHook(() => useAudioEngine());

    act(() => emitError({ reason: 'no-input-device', message: 'gone' }));

    expect(result.current.error).toEqual({ reason: 'no-input-device', message: 'gone' });
  });

  it('resets the presenter and clears frequency when status leaves listening', () => {
    const { result } = renderHook(() => useAudioEngine());

    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: 440, clarity: 0.95, timestamp: 1000 }));
    expect(result.current.presentation.state).toBe('active');

    act(() => emitStatus('idle'));

    expect(result.current.presentation.state).toBe('searching');
    expect(result.current.frequency).toBeNull();
  });

  it('triggers haptic feedback exactly when presentation.hapticTrigger becomes true', () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => emitStatus('listening'));

    let t = 1000;
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    expect(triggerHapticFeedback).not.toHaveBeenCalled();

    // Sustain the same, in-tune reading well past lockDurationMs (280ms) to cross the lock+haptic edge.
    while (result.current.presentation.state !== 'locked' && t < 1000 + 280 + 300) {
      t += HOP_MS;
      act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    }

    expect(result.current.presentation.state).toBe('locked');
    expect(result.current.presentation.inTune).toBe(true);
    expect(triggerHapticFeedback).toHaveBeenCalledTimes(1);

    // Staying locked afterward must not re-fire it.
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t + HOP_MS }));
    expect(triggerHapticFeedback).toHaveBeenCalledTimes(1);
  });

  it('plays the in-tune sound effect on the same edge as haptic feedback, by default', () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => emitStatus('listening'));

    let t = 1000;
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    expect(playInTuneSound).not.toHaveBeenCalled();

    while (result.current.presentation.state !== 'locked' && t < 1000 + 280 + 300) {
      t += HOP_MS;
      act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    }

    expect(result.current.presentation.state).toBe('locked');
    expect(playInTuneSound).toHaveBeenCalledTimes(1);

    // Staying locked afterward must not re-fire it, same as haptic feedback's own edge-gating.
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t + HOP_MS }));
    expect(playInTuneSound).toHaveBeenCalledTimes(1);
  });

  it('does not play the sound effect when soundEffectsEnabled is false, but still triggers haptics', () => {
    const { result } = renderHook(() => useAudioEngine(getStandardTuning(), 440, false));
    act(() => emitStatus('listening'));

    let t = 1000;
    while (result.current.presentation.state !== 'locked' && t < 1000 + 280 + 300) {
      t += HOP_MS;
      act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    }

    expect(result.current.presentation.state).toBe('locked');
    expect(triggerHapticFeedback).toHaveBeenCalledTimes(1);
    expect(playInTuneSound).not.toHaveBeenCalled();
  });

  it('reset() clears tunedTargetIds and immediately reflects it in presentation, without waiting for the next tick', () => {
    const { result } = renderHook(() => useAudioEngine());
    act(() => emitStatus('listening'));

    let t = 1000;
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    while (result.current.presentation.state !== 'locked' && t < 1000 + 280 + 300) {
      t += HOP_MS;
      act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: t }));
    }
    expect(result.current.presentation.tunedTargetIds.size).toBeGreaterThan(0);

    act(() => result.current.reset());

    expect(result.current.presentation.tunedTargetIds.size).toBe(0);
    expect(result.current.presentation.state).toBe('searching');
  });

  it('drives presenter.tick() through the shared animation-system scheduler while listening', () => {
    // Override this file's default always-inert rAF stub (see beforeEach) for just this test - a
    // queue-based one that lets us actually invoke the frame the scheduler requested, to prove the
    // hook is genuinely wired to src/animation's scheduler and not just requesting a frame it never
    // uses.
    let storedCallback: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
      storedCallback = cb;
      return 1;
    });
    vi.stubGlobal('cancelAnimationFrame', () => {
      storedCallback = null;
    });

    const { result } = renderHook(() => useAudioEngine());
    act(() => emitStatus('listening'));
    act(() => emitReading({ frequency: HIGH_E_FREQUENCY, clarity: 0.95, timestamp: 1000 }));
    expect(result.current.presentation.state).toBe('active');
    expect(storedCallback).not.toBeNull();

    // Fire the one frame the scheduler requested, with performance.now() far enough past the last
    // reading to cross LOST_GRACE_MS (400ms, tunerPresenter.ts) with no new reading arriving in
    // between - only tick()'s own time-based logic can produce this transition, so seeing it proves
    // the scheduler is actually driving presenter.tick() on a real frame, not that
    // requestAnimationFrame merely got called once.
    const nowSpy = vi.spyOn(performance, 'now').mockReturnValue(1000 + 401);
    act(() => {
      storedCallback?.(performance.now());
    });
    nowSpy.mockRestore();

    expect(result.current.presentation.state).toBe('searching');
  });

  it('unsubscribes and stops the engine on unmount', () => {
    const { unmount } = renderHook(() => useAudioEngine());
    expect(readingListeners.length).toBeGreaterThan(0);

    unmount();

    expect(fakeEngine.stop).toHaveBeenCalled();
    expect(readingListeners.length).toBe(0);
  });
});
