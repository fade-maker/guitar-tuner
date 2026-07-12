import { centsBetween } from '../../music-theory';
import type { CandidateValidationResult } from './candidateValidator';

export interface OctaveCorrector {
  correct(result: CandidateValidationResult): CandidateValidationResult;
  reset(): void;
}

export interface OctaveCorrectorConfig {
  // How many *consecutive* candidates must consistently suggest the same alternate octave before
  // this module stops correcting it and accepts it as the new reality (e.g. a genuine string change
  // onto a target that happens to be an exact octave away from the one just tracked - Drop D's
  // Low D/D string; standard tuning's Low E/High E). A starting engineering estimate, not a measured
  // value - see DEFAULT_AUDIO_ENGINE_CONFIG's own comment (config/audioConfig.ts) for the
  // symptom-based calibration criteria (too small: still briefly flickers while holding one string
  // steady; too large: noticeably laggy when deliberately switching strings).
  readonly octaveConfirmFrames: number;
}

export type CreateOctaveCorrector = (config: OctaveCorrectorConfig) => OctaveCorrector;

// A known McLeod Pitch Method failure mode (the algorithm `pitchy` implements): on a low-frequency
// signal, where a fixed-duration analysis window covers relatively few wave periods, a strong
// harmonic's own autocorrelation peak can occasionally outrank the true fundamental's, producing a
// candidate that's an almost-exact octave multiple of the real pitch. This module's only job is
// answering "is this candidate probably the wrong octave of what I was just, recently, consistently
// hearing" - it does not decide how much to trust the resulting value over time (Stabilizer's job,
// downstream of this) and it has no knowledge of tuning targets (that's TunerPresenter's job,
// downstream of Stabilizer) - an octave relationship is a property of two frequencies, not of a
// target, and this needs to keep meaning something in a future chromatic mode where every pitch
// class has a valid sibling in every octave.
//
// Deliberately sits BEFORE Stabilizer, not after: feeding a wrong-octave candidate into Stabilizer's
// median/EMA would corrupt its temporal state before correctness has even been decided. Stabilizer
// should only ever see an already octave-safe stream.

// How many octaves up/down a reading is tried at. 1 covers the primary, most common failure (an
// octave-up misread); 2 is included because this project's own calibration notes (audioConfig.ts)
// already recorded a real subharmonic artifact two octaves below a held note. Not left uncapped: an
// arbitrarily large deviation coincidentally landing near some large octave multiple is far more
// likely to be a genuinely different pitch than a detector octave error.
const MAX_OCTAVE_OFFSET = 2;

// How closely a new candidate must agree with the *first-observed* alternate-octave candidate to
// count as reinforcing the same pending alternate, rather than starting a fresh one. Mirrors
// stabilizer.ts's PENDING_AGREEMENT_TOLERANCE_CENTS exactly (same shape of problem: don't let a
// second, unrelated glitch accidentally inherit an unrelated pending counter).
const PENDING_ALTERNATE_AGREEMENT_CENTS = 15;

// How long a gap since the last accepted candidate is tolerated before referenceFrequency/
// pendingAlternate are treated as stale and cleared. Independently defined (not imported from
// stabilizer.ts, per this module's own no-cross-module-state-coupling design), and deliberately
// LONGER than the Stabilizer's own debounce: the two answer different questions. Stabilizer's track
// is "what is the smoothed pitch right now" and rightly forgets after a short clarity gap; this
// module's referenceFrequency is "which octave was this physical string in", which stays true across
// the natural silence between two plucks of the same string. At the previous 30ms every new pluck
// bootstrapped its octave decision from zero - exactly during the attack transient, where harmonics
// dominate and octave misreads are most likely. Raised so the octave memory survives an ordinary
// gap between plucks; only a genuinely long pause (the player stopping) resets it.
const GAP_RESET_MS = 300;

interface PendingAlternate {
  readonly frequency: number; // the raw, unfolded frequency first suggesting this alternate octave
  consecutiveFrames: number;
}

interface OctaveFold {
  readonly offset: number;
  readonly frequency: number;
  readonly cents: number;
}

// Tries every octave-shifted interpretation of `frequency` (within +-MAX_OCTAVE_OFFSET, including
// the unshifted candidate itself at offset 0) against a single reference frequency and returns
// whichever lands closest.
function bestOctaveFold(frequency: number, reference: number): OctaveFold {
  const unshifted: OctaveFold = { offset: 0, frequency, cents: centsBetween(frequency, reference) };

  // centsBetween(frequency * 2**n, reference) === centsBetween(frequency, reference) + 1200*n exactly
  // (an octave shift is a pure log2 shift), so once the unshifted candidate is already within half an
  // octave (|cents| < 600), no octave-shifted alternative can possibly land closer - skip the loop
  // entirely rather than re-deriving that same conclusion via 4 wasted centsBetween calls on what is
  // the dominant, ordinary-tracking case on every accepted frame in this hot audio path.
  if (Math.abs(unshifted.cents) < 600) {
    return unshifted;
  }

  let best = unshifted;
  for (let offset = -MAX_OCTAVE_OFFSET; offset <= MAX_OCTAVE_OFFSET; offset++) {
    if (offset === 0) continue;
    const folded = frequency * 2 ** offset;
    const cents = centsBetween(folded, reference);
    if (Math.abs(cents) < Math.abs(best.cents)) {
      best = { offset, frequency: folded, cents };
    }
  }
  return best;
}

export const createOctaveCorrector: CreateOctaveCorrector = (config) => {
  let referenceFrequency: number | null = null;
  let pendingAlternate: PendingAlternate | undefined;
  let lastAcceptedAt: number | undefined;

  function acceptAsFresh(frequency: number): void {
    referenceFrequency = frequency;
    pendingAlternate = undefined;
  }

  return {
    correct(result) {
      if (!result.accepted) {
        // See GAP_RESET_MS: only a sustained gap clears the stale reference/pending state, not a
        // single dropped frame mid-note.
        if (lastAcceptedAt !== undefined && result.timestamp - lastAcceptedAt > GAP_RESET_MS) {
          referenceFrequency = null;
          pendingAlternate = undefined;
        }
        return result;
      }

      const { frequency, timestamp } = result.candidate;
      lastAcceptedAt = timestamp;

      if (referenceFrequency === null) {
        // Nothing established yet - nothing to fold against, take this candidate at face value.
        acceptAsFresh(frequency);
        return result;
      }

      const fold = bestOctaveFold(frequency, referenceFrequency);

      if (fold.offset === 0) {
        // The raw candidate is already the best explanation relative to what was just being
        // tracked - ordinary continued tracking (holding steady or genuinely drifting in pitch),
        // not an octave question at all.
        acceptAsFresh(frequency);
        return result;
      }

      // An octave-shifted interpretation explains this candidate better than the raw value does.
      if (
        pendingAlternate !== undefined &&
        Math.abs(centsBetween(frequency, pendingAlternate.frequency)) < PENDING_ALTERNATE_AGREEMENT_CENTS
      ) {
        pendingAlternate = { frequency: pendingAlternate.frequency, consecutiveFrames: pendingAlternate.consecutiveFrames + 1 };
      } else {
        pendingAlternate = { frequency, consecutiveFrames: 1 };
      }

      if (pendingAlternate.consecutiveFrames >= config.octaveConfirmFrames) {
        // Consistently suggested for long enough - stop treating it as an error and accept it as
        // the new reality.
        acceptAsFresh(frequency);
        return result;
      }

      // Not yet confirmed - keep explaining this candidate as the octave already trusted.
      return {
        accepted: true,
        candidate: { frequency: fold.frequency, clarity: result.candidate.clarity, timestamp: result.candidate.timestamp },
      };
    },

    reset() {
      referenceFrequency = null;
      pendingAlternate = undefined;
      lastAcceptedAt = undefined;
    },
  };
};
