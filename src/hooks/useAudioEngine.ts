import { useCallback, useEffect, useState } from 'react';
import { createAudioEngine } from '../audio-engine';
import type { AudioEngine, AudioEngineError, EngineStatus } from '../audio-engine';
import { deriveInstrumentProfile } from './instrumentProfile';
import { scheduler } from '../animation';
import { createTunerPresenter } from '../presentation/tunerPresenter';
import type { TunerPresentationState, TunerPresenter } from '../presentation/tunerPresenter';
import { DEFAULT_A4_FREQUENCY, getStandardTuning } from '../music-theory';
import type { TuningPreset } from '../music-theory';
import { DEFAULT_PRESENTATION_CONFIG, DEFAULT_TUNING_TOLERANCE_CONFIG } from '../config';
import { playInTuneSound } from '../sound/playInTuneSound';
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
  // writes to AppPreferences - wiring a screen's Auto switch to these is a later step.
  pinTarget(targetId: string): void;
  unpinTarget(): void;
  // Same passthrough shape as the above two - clears the presenter's pin, lock/identity state,
  // and tunedTargetIds. Needed by Simple Tuner's Auto -> Manual switch (a mode change should start
  // the manual session fresh, not carry over "already tuned" badges from Auto).
  reset(): void;
}

// a4 is a controlled input, the same shape as tuningPreset: both seed the presenter's initial lazy
// state AND stay live-synced via their own effect below for as long as the caller keeps passing an
// updated value. There is deliberately no separate setA4() escape hatch on UseAudioEngineResult -
// every caller (SimpleTunerScreen, AdvancedTunerScreen, DebugSettingsPanel) already has
// preferences.a4Frequency on hand to pass straight through, so a second, manually-called path to
// the same effect would just be redundant API surface. soundEffectsEnabled is a plain read (no
// live-sync effect needed like a4's - it's only ever consulted at the moment hapticTrigger fires,
// never applied to any persistent engine/presenter state), same controlled-input shape regardless.
export type UseAudioEngine = (
  tuningPreset?: TuningPreset,
  a4?: number,
  soundEffectsEnabled?: boolean,
) => UseAudioEngineResult;

function createPresenter(tuningPreset: TuningPreset, a4: number): TunerPresenter {
  return createTunerPresenter({
    targets: tuningPreset.strings,
    inTuneCents: DEFAULT_TUNING_TOLERANCE_CONFIG.inTuneCents,
    closeCents: DEFAULT_TUNING_TOLERANCE_CONFIG.closeCents,
    lockDurationMs: DEFAULT_PRESENTATION_CONFIG.lockDurationMs,
    a4,
  });
}

export const useAudioEngine: UseAudioEngine = (
  tuningPreset = getStandardTuning(),
  a4 = DEFAULT_A4_FREQUENCY,
  soundEffectsEnabled = true,
) => {
  // Lazy useState initializers, not useRef: this project's lint rules forbid touching ref.current
  // during render at all (React Compiler-era purity rules), so useState's one-time initializer is the
  // sanctioned way to construct something exactly once per mount.
  const [presenter] = useState<TunerPresenter>(() => createPresenter(tuningPreset, a4));
  // The engine's DSP window + instrument range are derived from the tuning targets once, at mount.
  // This is correct for how the app navigates today: switching tuning (guitar<->bass) goes through
  // Select Tuning, which unmounts the live tuner screen, so a fresh engine is built with the new
  // preset on return. If a future change keeps the tuner mounted across a preset switch, this would
  // need the live-config plumbing that AudioEngine deliberately doesn't have yet (see CLAUDE.md).
  const [engine] = useState<AudioEngine>(() => {
    const profile = deriveInstrumentProfile(tuningPreset.strings, a4);
    return createAudioEngine({
      instrumentRange: profile.instrumentRange,
      windowDurationMs: profile.windowDurationMs,
    });
  });

  const [presentation, setPresentation] = useState<TunerPresentationState>(() => presenter.tick(0));
  const [engineStatus, setEngineStatus] = useState<EngineStatus>('idle');
  const [error, setError] = useState<AudioEngineError | null>(null);
  const [frequency, setFrequency] = useState<number | null>(null);

  // Re-targets the presenter whenever the caller switches tuningPreset. Redundant but harmless on the
  // mount render (the lazy useState initializer above already used this same preset).
  useEffect(() => {
    presenter.setTargets(tuningPreset.strings);
  }, [presenter, tuningPreset]);

  // Keeps the presenter's calibration in sync with the caller's current a4 for as long as this
  // engine stays mounted - e.g. AdvancedTunerScreen's own Calibrate stepper writes to
  // AppPreferences, which flows back in as this same a4 argument on the next render, and this
  // effect is what actually applies it to the running presenter. Redundant but harmless on the
  // mount render (the lazy useState initializer above already used this same value).
  useEffect(() => {
    presenter.setA4(a4);
  }, [presenter, a4]);

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
  // Subscribes to the shared animation-system scheduler instead of calling requestAnimationFrame
  // itself - this used to be its own independent rAF loop; see src/animation/scheduler.ts for why
  // the app should own exactly one requestAnimationFrame chain, not one per consumer.
  useEffect(() => {
    if (engineStatus !== 'listening') {
      return;
    }
    return scheduler.subscribe(() => {
      setPresentation(presenter.tick(performance.now()));
    });
  }, [engineStatus, presenter]);

  // Fires exactly on the render where hapticTrigger transitions to true - the presenter is already
  // one-shot/cooldown-gated internally, so this effect only needs to react to the boolean itself.
  // Sound effect reuses this exact same signal rather than re-deriving "just reached in tune" a
  // second time - one edge-detected event, two independent feedback channels.
  useEffect(() => {
    if (presentation.hapticTrigger) {
      triggerHapticFeedback();
      if (soundEffectsEnabled) {
        playInTuneSound();
      }
    }
  }, [presentation.hapticTrigger, soundEffectsEnabled]);

  const start = useCallback(async () => {
    setError(null);
    await engine.start();
  }, [engine]);

  const stop = useCallback(() => {
    engine.stop();
  }, [engine]);

  const pinTarget = useCallback((targetId: string) => presenter.pinTarget(targetId), [presenter]);
  const unpinTarget = useCallback(() => presenter.unpinTarget(), [presenter]);
  const reset = useCallback(() => {
    presenter.reset();
    setPresentation(presenter.tick(performance.now()));
  }, [presenter]);

  return {
    presentation,
    engineStatus,
    error,
    frequency,
    isRunning: engineStatus === 'listening',
    start,
    stop,
    pinTarget,
    unpinTarget,
    reset,
  };
};
