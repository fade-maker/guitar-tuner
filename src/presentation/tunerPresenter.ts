import { findNearestTarget } from '../music-theory';
import type { StringTarget } from '../music-theory';
import type { PitchReading } from '../audio-engine';

export type TunerLifecycleState = 'searching' | 'active' | 'locked' | 'lost';

export interface TunerPresentationState {
  readonly state: TunerLifecycleState;
  readonly target: StringTarget | null;
  readonly cents: number | null;
  readonly inTune: boolean;
  readonly hapticTrigger: boolean;
}

export interface TunerPresenterConfig {
  readonly targets: readonly StringTarget[];
  readonly inTuneCents: number;
  readonly closeCents: number;
  readonly lockDurationMs: number;
}

export interface TunerPresenter {
  onReading(reading: PitchReading): TunerPresentationState;
  tick(timestamp: number): TunerPresentationState;
  setTargets(targets: readonly StringTarget[]): void;
  reset(): void;
}

export type CreateTunerPresenter = (config: TunerPresenterConfig) => TunerPresenter;

// Signal-absence tolerance before showing a fading 'lost' treatment - short enough that a couple of
// missed hops at the pipeline's ~12-23ms cadence never register, long enough to stay responsive.
const ACTIVE_GAP_TOLERANCE_MS = 100;
// Total hold time for a stale reading before fully clearing to 'searching' - covers natural string
// decay and incidental noise without the display looking stuck.
const LOST_GRACE_MS = 400;
// Trailing window used to detect "actively being adjusted" (e.g. a tuning peg turning).
const RAPID_ADJUSTMENT_WINDOW_MS = 150;
const RAPID_ADJUSTMENT_THRESHOLD_CENTS = 15;
// Floor between haptic firings, independent of the lock/in-tune edge detection, as a safety net
// against boundary oscillation the hysteresis bands don't fully rule out.
const HAPTIC_COOLDOWN_MS = 1200;

const SEARCHING_STATE: TunerPresentationState = {
  state: 'searching',
  target: null,
  cents: null,
  inTune: false,
  hapticTrigger: false,
};

interface CentsSample {
  readonly cents: number;
  readonly timestamp: number;
}

export const createTunerPresenter: CreateTunerPresenter = (config) => {
  let targets = config.targets;

  let currentTarget: StringTarget | undefined;
  let identitySince: number | undefined;
  let lastCents: number | undefined;
  let lastReadingAt: number | undefined;
  let recentCents: CentsSample[] = [];
  let lastHapticAt: number | undefined;
  let wasLocked = false;
  let wasInTune = false;
  let cachedState: TunerPresentationState = SEARCHING_STATE;

  function clearSession(): void {
    currentTarget = undefined;
    identitySince = undefined;
    lastCents = undefined;
    lastReadingAt = undefined;
    recentCents = [];
    lastHapticAt = undefined;
    wasLocked = false;
    wasInTune = false;
    cachedState = SEARCHING_STATE;
  }

  function isRapidlyChanging(timestamp: number): boolean {
    while (recentCents.length > 0 && timestamp - recentCents[0].timestamp > RAPID_ADJUSTMENT_WINDOW_MS) {
      recentCents.shift();
    }
    if (recentCents.length < 2) {
      return false;
    }
    const values = recentCents.map((sample) => sample.cents);
    return Math.max(...values) - Math.min(...values) >= RAPID_ADJUSTMENT_THRESHOLD_CENTS;
  }

  function updateInTune(cents: number): boolean {
    const inTune = wasInTune ? Math.abs(cents) <= config.closeCents : Math.abs(cents) <= config.inTuneCents;
    wasInTune = inTune;
    return inTune;
  }

  return {
    onReading(reading) {
      lastReadingAt = reading.timestamp;
      const match = findNearestTarget(reading.frequency, targets);

      if (currentTarget === undefined || match.target.id !== currentTarget.id) {
        currentTarget = match.target;
        identitySince = reading.timestamp;
        wasInTune = false;
        recentCents = [];
      }

      lastCents = match.cents;
      recentCents.push({ cents: match.cents, timestamp: reading.timestamp });

      // Safe: identitySince is always set above, either freshly this call or by a prior one.
      const sustainedMs = reading.timestamp - identitySince!;
      const rapidlyChanging = isRapidlyChanging(reading.timestamp);
      const state: TunerLifecycleState =
        sustainedMs >= config.lockDurationMs && !rapidlyChanging ? 'locked' : 'active';

      const inTune = updateInTune(match.cents);

      const justLocked = state === 'locked' && !wasLocked;
      const cooldownElapsed = lastHapticAt === undefined || reading.timestamp - lastHapticAt >= HAPTIC_COOLDOWN_MS;
      const hapticTrigger = justLocked && inTune && cooldownElapsed;
      if (hapticTrigger) {
        lastHapticAt = reading.timestamp;
      }
      wasLocked = state === 'locked';

      cachedState = { state, target: match.target, cents: match.cents, inTune, hapticTrigger };
      return cachedState;
    },

    tick(timestamp) {
      if (lastReadingAt === undefined) {
        cachedState = SEARCHING_STATE;
        return cachedState;
      }

      const gap = timestamp - lastReadingAt;

      if (gap > LOST_GRACE_MS) {
        clearSession();
        return cachedState;
      }

      if (gap > ACTIVE_GAP_TOLERANCE_MS) {
        if (cachedState.state === 'lost') {
          return cachedState;
        }
        cachedState = {
          state: 'lost',
          target: currentTarget ?? null,
          cents: lastCents ?? null,
          inTune: false,
          hapticTrigger: false,
        };
        return cachedState;
      }

      return cachedState;
    },

    setTargets(newTargets) {
      targets = newTargets;
    },

    reset() {
      clearSession();
    },
  };
};
