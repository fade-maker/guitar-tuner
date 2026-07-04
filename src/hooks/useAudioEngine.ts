import { useCallback, useEffect, useState } from 'react';
import { createAudioEngine } from '../audio-engine';
import type { AudioEngine, AudioEngineError, EngineStatus } from '../audio-engine';
import { createTunerPresenter } from '../presentation/tunerPresenter';
import type { TunerPresentationState, TunerPresenter } from '../presentation/tunerPresenter';
import { getStandardTuning } from '../music-theory';
import type { TuningPreset } from '../music-theory';
import { DEFAULT_PRESENTATION_CONFIG, DEFAULT_TUNING_TOLERANCE_CONFIG } from '../config';
import { triggerHapticFeedback } from '../telegram/haptics';

export interface UseAudioEngineResult {
  readonly presentation: TunerPresentationState;
  readonly engineStatus: EngineStatus;
  readonly error: AudioEngineError | null;
  readonly frequency: number | null;
  readonly isRunning: boolean;
  start(): Promise<void>;
  stop(): void;
  // Presenter passthroughs, exposed ahead of any UI that calls them. None of this reads from or
  // writes to AppPreferences - wiring a screen's Auto switch or A4 stepper to these is a later step.
  setA4(a4: number): void;
  pinTarget(targetId: string): void;
  unpinTarget(): void;
}

export type UseAudioEngine = (tuningPreset?: TuningPreset) => UseAudioEngineResult;

function createPresenter(tuningPreset: TuningPreset): TunerPresenter {
  return createTunerPresenter({
    targets: tuningPreset.strings,
    inTuneCents: DEFAULT_TUNING_TOLERANCE_CONFIG.inTuneCents,
    closeCents: DEFAULT_TUNING_TOLERANCE_CONFIG.closeCents,
    lockDurationMs: DEFAULT_PRESENTATION_CONFIG.lockDurationMs,
  });
}

export const useAudioEngine: UseAudioEngine = (tuningPreset = getStandardTuning()) => {
  // Lazy useState initializers, not useRef: this project's lint rules forbid touching ref.current
  // during render at all (React Compiler-era purity rules), so useState's one-time initializer is the
  // sanctioned way to construct something exactly once per mount.
  const [presenter] = useState<TunerPresenter>(() => createPresenter(tuningPreset));
  const [engine] = useState<AudioEngine>(() => createAudioEngine());

  const [presentation, setPresentation] = useState<TunerPresentationState>(() => presenter.tick(0));
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [error, setError] = useState<AudioEngineError | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);

  // Re-targets the presenter whenever the caller switches tuningPreset. Redundant but harmless on the
  // mount render (the lazy useState initializer above already used this same preset).
  useEffect(() => {
    presenter.setTargets(tuningPreset.strings);
  }, [presenter, tuningPreset]);

  // Listener registration and clock reads are side effects, so they live here rather than inline in
  // the render body.
  useEffect(() => {
    const unsubscribeReading = engine.subscribe((reading) => {
      setFrequency(reading.frequency);
      setPresentation(presenter.onReading(reading));
    });

    const unsubscribeStatus = engine.onStatusChange((status) => {
      setEngineStatus(status);
      // Reset whenever the engine stops, errors, or hasn't started listening yet - a stale locked
      // reading from a previous session must never survive a status transition away from 'listening'.
      if (status !== 'listening') {
        presenter.reset();
        setFrequency(null);
        setPresentation(presenter.tick(performance.now()));
      }
    });

    const unsubscribeError = engine.onError((engineError) => {
      setError(engineError);
    });

    return () => {
      unsubscribeReading();
      unsubscribeStatus();
      unsubscribeError();
      engine.stop();
    };
  }, [engine, presenter]);

  // Drives presenter.tick() so 'searching'/'lost' can be derived even when no new reading arrives.
  useEffect(() => {
    if (engineStatus !== 'listening') {
      return;
    }
    let frameId: number;
    const loop = (now: number): void => {
      setPresentation(presenter.tick(now));
      frameId = requestAnimationFrame(loop);
    };
    frameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frameId);
  }, [engineStatus, presenter]);

  // Fires exactly on the render where hapticTrigger transitions to true - the presenter is already
  // one-shot/cooldown-gated internally, so this effect only needs to react to the boolean itself.
  useEffect(() => {
    if (presentation.hapticTrigger) {
      triggerHapticFeedback();
    }
  }, [presentation.hapticTrigger]);

  const start = useCallback(async () => {
    setError(null);
    await engine.start();
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const setA4 = useCallback((a4: number) => presenter.setA4(a4), [presenter]);
  const pinTarget = useCallback((targetId: string) => presenter.pinTarget(targetId), [presenter]);
  const unpinTarget = useCallback(() => presenter.unpinTarget(), [presenter]);

  return {
    presentation,
    engineStatus,
    error,
    frequency,
    isRunning: engineStatus === 'listening',
    start,
    stop,
    setA4,
    pinTarget,
    unpinTarget,
  };
};
