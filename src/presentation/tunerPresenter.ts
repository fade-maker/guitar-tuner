import { DEFAULT_A4_FREQUENCY, centsBetween, findNearestTarget, midiToFrequency } from '../music-theory';
import type { NearestTargetMatch, StringTarget } from '../music-theory';
import type { PitchReading } from '../audio-engine';

export type TunerLifecycleState = 'searching' | 'active' | 'locked' | 'lost';

export interface TunerPresentationState {
  readonly state: TunerLifecycleState;
  readonly target: StringTarget | null;
  readonly cents: number | null;
  readonly inTune: boolean;
  readonly hapticTrigger: boolean;
  // Ids of every target confirmed locked+in-tune at least once this session. Persists through
  // brief signal loss (tick()'s 'lost'/'searching' transitions) - a guitarist pausing between
  // strings shouldn't lose their progress. Only setTargets()/reset() clear it, since a target-set
  // change also invalidates the ids (see the note on setTargets below).
  readonly tunedTargetIds: ReadonlySet<string>;
}

export interface TunerPresenterConfig {
  readonly targets: readonly StringTarget[];
  readonly inTuneCents: number;
  readonly closeCents: number;
  readonly lockDurationMs: number;
  // Reference pitch for A4, in Hz. Optional - defaults to DEFAULT_A4_FREQUENCY (440). Threading
  // this through only changes which frequency each StringTarget.midi resolves to (via the already
  // a4-aware music-theory helpers) - it never touches pitch detection itself.
  readonly a4?: number;
}

export interface TunerPresenter {
  onReading(reading: PitchReading): TunerPresentationState;
  tick(timestamp: number): TunerPresentationState;
  setTargets(targets: readonly StringTarget[]): void;
  setA4(a4: number): void;
  // Manual/Auto: pin resolves every reading against one fixed target instead of auto-detecting
  // the nearest one. unpinTarget() returns to Auto.
  pinTarget(targetId: string): void;
  unpinTarget(): void;
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

// How many octaves up/down a reading is tried at when checking whether it's actually a pitch
// detector octave error (a known McLeod-Pitch-Method failure mode, most likely on low-frequency
// strings where a fixed-duration analysis window covers relatively few wave periods) rather than a
// genuine pitch. 2 covers both a single-octave-up misread and the two-octaves-down subharmonic
// artifact already documented in audioConfig.ts's own calibration notes.
const MAX_OCTAVE_OFFSET = 2;

// How much better (in cents) an octave-folded reading against the target already being tracked has
// to be than the plain nearest-target search, before that continuity is trusted over just switching
// targets outright. This exists only to protect two real collisions in this project's own tuning
// presets - pairs of targets an exact octave/two apart (Drop D's Low D/D string; standard tuning's
// Low E/High E) - where a folded reading and the naively-nearest target can legitimately tie at ~0
// cents each; below this margin, a genuine target switch always wins over forced continuity.
//
// This can't be made airtight from frequency alone: a string tuned significantly (~200+ cents) flat
// can, by coincidence, double into a neighboring target's own zone closely enough that this margin
// doesn't catch it - a real, known limitation, not fixable without more signal than frequency+clarity
// provides (e.g. timbre/harmonic-profile analysis, which this pipeline doesn't do).
const OCTAVE_CONTINUITY_MARGIN_CENTS = 100;

// Tries every octave-shifted interpretation of `frequency` (within +-MAX_OCTAVE_OFFSET) against a
// single known target frequency and returns whichever lands closest - not just the direct,
// unshifted comparison.
function octaveFoldedCents(frequency: number, targetFrequency: number): { frequency: number; cents: number } {
  let best = { frequency, cents: centsBetween(frequency, targetFrequency) };
  for (let octave = -MAX_OCTAVE_OFFSET; octave <= MAX_OCTAVE_OFFSET; octave++) {
    if (octave === 0) continue;
    const candidateFrequency = frequency * 2 ** octave;
    const cents = centsBetween(candidateFrequency, targetFrequency);
    if (Math.abs(cents) < Math.abs(best.cents)) {
      best = { frequency: candidateFrequency, cents };
    }
  }
  return best;
}

function searchingState(tunedTargetIds: ReadonlySet<string>): TunerPresentationState {
  return { state: 'searching', target: null, cents: null, inTune: false, hapticTrigger: false, tunedTargetIds };
}

interface CentsSample {
  readonly cents: number;
  readonly timestamp: number;
}

export const createTunerPresenter: CreateTunerPresenter = (config) => {
  let targets = config.targets;
  let a4 = config.a4 ?? DEFAULT_A4_FREQUENCY;
  let pinnedTargetId: string | null = null;

  let currentTarget: StringTarget | undefined;
  let identitySince: number | undefined;
  let lastCents: number | undefined;
  let lastReadingAt: number | undefined;
  let recentCents: CentsSample[] = [];
  let lastHapticAt: number | undefined;
  let wasLocked = false;
  let wasInTune = false;
  let tunedTargetIds: ReadonlySet<string> = new Set();
  let cachedState: TunerPresentationState = searchingState(tunedTargetIds);

  // Resolves a reading against the current selection: the pinned target if one is set and still
  // present in `targets`, otherwise (or if the pin has gone stale) the nearest auto-detected match.
  function resolveMatch(frequency: number): NearestTargetMatch {
    if (pinnedTargetId !== null) {
      const pinnedTarget = targets.find((target) => target.id === pinnedTargetId);
      if (pinnedTarget !== undefined) {
        // Unambiguous: there's only one possible target while pinned, so whichever octave brings
        // the reading closest to it is simply the detector's most plausible read of that same
        // string, never a competing hypothesis.
        const targetFrequency = midiToFrequency(pinnedTarget.midi, a4);
        const { cents } = octaveFoldedCents(frequency, targetFrequency);
        return { target: pinnedTarget, frequency: targetFrequency, cents };
      }
    }

    const naiveMatch = findNearestTarget(frequency, targets, a4);

    // Only usable as a continuity anchor if it's still a real member of the current target set -
    // setTargets() can swap the whole list without clearing currentTarget (by design: target/cents
    // intentionally only take effect on the next reading), so a stale reference must not be trusted
    // just because it's still non-undefined.
    const trackedTarget = currentTarget;
    const continuityTarget = trackedTarget && targets.find((target) => target.id === trackedTarget.id);

    if (continuityTarget) {
      const continuityFrequency = midiToFrequency(continuityTarget.midi, a4);
      const folded = octaveFoldedCents(frequency, continuityFrequency);
      if (Math.abs(folded.cents) + OCTAVE_CONTINUITY_MARGIN_CENTS < Math.abs(naiveMatch.cents)) {
        return { target: continuityTarget, frequency: continuityFrequency, cents: folded.cents };
      }
    }

    return naiveMatch;
  }

  // Clears per-identity bookkeeping (what's currently sounding, lock timer, haptic cooldown) on a
  // signal gap. Deliberately does not touch tunedTargetIds or the pin - see the field comment above.
  function clearIdentity(): void {
    currentTarget = undefined;
    identitySince = undefined;
    lastCents = undefined;
    lastReadingAt = undefined;
    recentCents = [];
    lastHapticAt = undefined;
    wasLocked = false;
    wasInTune = false;
    cachedState = searchingState(tunedTargetIds);
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
      const match = resolveMatch(reading.frequency);

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

      if (state === 'locked' && inTune && !tunedTargetIds.has(match.target.id)) {
        tunedTargetIds = new Set(tunedTargetIds).add(match.target.id);
      }

      cachedState = { state, target: match.target, cents: match.cents, inTune, hapticTrigger, tunedTargetIds };
      return cachedState;
    },

    tick(timestamp) {
      if (lastReadingAt === undefined) {
        cachedState = searchingState(tunedTargetIds);
        return cachedState;
      }

      const gap = timestamp - lastReadingAt;

      if (gap > LOST_GRACE_MS) {
        clearIdentity();
        return cachedState;
      }

      if (gap > ACTIVE_GAP_TOLERANCE_MS) {
        if (cachedState.state === 'lost') {
          return cachedState;
        }
        // 'lost' means the signal disappeared, not that the pitch is newly wrong - inTune carries
        // forward the last confirmed verdict instead of being invented here. Confirmed via
        // instrumentation: tick() was flipping inTune=true readings to false with no new reading in
        // between, producing a false Tune Up/Down flash right before the display cleared to searching.
        cachedState = {
          state: 'lost',
          target: currentTarget ?? null,
          cents: lastCents ?? null,
          inTune: cachedState.inTune,
          hapticTrigger: false,
          tunedTargetIds,
        };
        return cachedState;
      }

      return cachedState;
    },

    setTargets(newTargets) {
      targets = newTargets;
      // A different target set invalidates both the pin and any tuned ids from the old one:
      // StringTarget.id is a string-position slot ('1'..'6'), not a globally unique identity, so
      // e.g. id '1' means a different physical string in a guitar preset than in a bass preset.
      // Carrying either over across a preset switch would silently apply to the wrong string.
      pinnedTargetId = null;
      tunedTargetIds = new Set();
      // Unlike target/cents (which intentionally take effect only on the next reading - see the
      // 'setTargets' test suite), tunedTargetIds is refreshed on cachedState immediately: it's
      // being invalidated for correctness, not superseded by new pitch data, so a tick() before the
      // next reading must not keep surfacing ids from the preset that's no longer active.
      cachedState = { ...cachedState, tunedTargetIds };
    },

    setA4(newA4) {
      a4 = newA4;
    },

    pinTarget(targetId) {
      pinnedTargetId = targetId;
    },

    unpinTarget() {
      pinnedTargetId = null;
    },

    reset() {
      pinnedTargetId = null;
      tunedTargetIds = new Set();
      clearIdentity();
    },
  };
};
