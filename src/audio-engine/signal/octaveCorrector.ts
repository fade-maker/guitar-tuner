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
  let best: OctaveFold = { offset: 0, frequency, cents: centsBetween(frequency, reference) };
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

  return {
    correct(result) {
      if (!result.accepted) {
        return result;
      }

      const { frequency } = result.candidate;

      if (referenceFrequency === null) {
        // Nothing established yet - nothing to fold against, take this candidate at face value.
        referenceFrequency = frequency;
        pendingAlternate = undefined;
        return result;
      }

      const fold = bestOctaveFold(frequency, referenceFrequency);

      if (fold.offset === 0) {
        // The raw candidate is already the best explanation relative to what was just being
        // tracked - ordinary continued tracking (holding steady or genuinely drifting in pitch),
        // not an octave question at all.
        referenceFrequency = frequency;
        pendingAlternate = undefined;
        return result;
      }

      // An octave-shifted interpretation explains this candidate better than the raw value does.
      const reinforcesPending =
        pendingAlternate !== undefined &&
        Math.abs(centsBetween(frequency, pendingAlternate.frequency)) < PENDING_ALTERNATE_AGREEMENT_CENTS;

      const current: PendingAlternate = reinforcesPending
        ? { frequency: pendingAlternate!.frequency, consecutiveFrames: pendingAlternate!.consecutiveFrames + 1 }
        : { frequency, consecutiveFrames: 1 };
      pendingAlternate = current;

      if (current.consecutiveFrames >= config.octaveConfirmFrames) {
        // Consistently suggested for long enough - stop treating it as an error and accept it as
        // the new reality.
        referenceFrequency = frequency;
        pendingAlternate = undefined;
        return result;
      }

      // Not yet confirmed - keep explaining this candidate as the octave already trusted.
      return { ...result, candidate: { ...result.candidate, frequency: fold.frequency } };
    },

    reset() {
      referenceFrequency = null;
      pendingAlternate = undefined;
    },
  };
};
