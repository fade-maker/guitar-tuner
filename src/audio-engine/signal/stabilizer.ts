import { DEFAULT_A4_FREQUENCY, frequencyToMidi, midiToFrequency } from '../../music-theory';
import type { CandidateValidationResult } from './candidateValidator';

export interface StabilizedReading {
  readonly frequency: number;
  readonly clarity: number;
}

export interface PitchStabilizer {
  push(result: CandidateValidationResult): StabilizedReading | null;
  reset(): void;
}

export type CreatePitchStabilizer = () => PitchStabilizer;

const MEDIAN_WINDOW_SIZE = 5;
const RELEASE_ALPHA = 0.15;
const ATTACK_ALPHA = 0.6;
const RELEASE_THRESHOLD_CENTS = 8;
const CONFIRMATION_THRESHOLD_CENTS = 50;
const PENDING_AGREEMENT_TOLERANCE_CENTS = 15;
const CONFIRMATION_DURATION_MS = 40;
const DEBOUNCE_TOLERANCE_MS = 30;

function computeMedian(buffer: readonly number[], count: number): number {
  const sorted = buffer.slice(0, count).sort((a, b) => a - b);
  const mid = Math.floor(count / 2);
  return count % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

interface PendingDeviation {
  readonly candidateMidi: number;
  readonly firstObservedAt: number;
}

export const createPitchStabilizer: CreatePitchStabilizer = () => {
  const medianWindow: number[] = new Array(MEDIAN_WINDOW_SIZE).fill(0);
  let medianCount = 0;
  let medianWriteIndex = 0;

  // emaValue, in MIDI-fractional space, doubles as "has anything ever been accepted" - undefined means no.
  // DEFAULT_A4_FREQUENCY is used only as an internal log-transform anchor for relative-distance math; it
  // cancels out in every comparison this module makes and carries no note-identity meaning, since this
  // module never produces note names.
  let emaValue: number | undefined;
  let heldClarity = 0;
  let lastAcceptedAt: number | undefined;
  let pendingDeviation: PendingDeviation | undefined;

  function clearAll(): void {
    medianCount = 0;
    medianWriteIndex = 0;
    emaValue = undefined;
    heldClarity = 0;
    lastAcceptedAt = undefined;
    pendingDeviation = undefined;
  }

  function seed(midi: number, clarity: number, timestamp: number): void {
    medianWindow[0] = midi;
    medianCount = 1;
    medianWriteIndex = 1 % MEDIAN_WINDOW_SIZE;
    emaValue = midi;
    heldClarity = clarity;
    lastAcceptedAt = timestamp;
    pendingDeviation = undefined;
  }

  function feed(midi: number, clarity: number, alpha: number, timestamp: number, currentEma: number): void {
    medianWindow[medianWriteIndex] = midi;
    medianWriteIndex = (medianWriteIndex + 1) % MEDIAN_WINDOW_SIZE;
    medianCount = Math.min(medianCount + 1, MEDIAN_WINDOW_SIZE);
    const median = computeMedian(medianWindow, medianCount);
    emaValue = currentEma + alpha * (median - currentEma);
    heldClarity = clarity;
    lastAcceptedAt = timestamp;
  }

  function currentReading(): StabilizedReading {
    // Safe: only ever called once emaValue has been established (lastAcceptedAt is always set in lockstep).
    return { frequency: midiToFrequency(emaValue!, DEFAULT_A4_FREQUENCY), clarity: heldClarity };
  }

  return {
    push(result) {
      if (!result.accepted) {
        if (lastAcceptedAt === undefined) {
          return null;
        }
        if (result.timestamp - lastAcceptedAt <= DEBOUNCE_TOLERANCE_MS) {
          // Nothing established yet (still confirming a fresh candidate) - there's no held value to
          // return, but the brief gap alone shouldn't abandon the in-progress confirmation either.
          return emaValue === undefined ? null : currentReading();
        }
        clearAll();
        return null;
      }

      const { frequency, clarity, timestamp } = result.candidate;
      const candidateMidi = frequencyToMidi(frequency, DEFAULT_A4_FREQUENCY);

      if (emaValue === undefined) {
        // Mirrors the severe-deviation confirmation below: a fresh candidate after a period with no
        // established track must persist - matching a prior pending candidate within
        // PENDING_AGREEMENT_TOLERANCE_CENTS for at least CONFIRMATION_DURATION_MS - before it seeds a
        // new track. This is what rejects a loud, non-periodic transient (a knock, a click) that
        // happens to pass the RMS gate and clarity threshold on a single frame: with no real
        // periodicity behind it, it essentially never produces two-plus consecutive matching
        // detections. Nothing is reported while unconfirmed - there's no established value to hold.
        if (
          pendingDeviation === undefined ||
          Math.abs((candidateMidi - pendingDeviation.candidateMidi) * 100) >= PENDING_AGREEMENT_TOLERANCE_CENTS
        ) {
          pendingDeviation = { candidateMidi, firstObservedAt: timestamp };
          lastAcceptedAt = timestamp;
          return null;
        }

        lastAcceptedAt = timestamp;
        if (timestamp - pendingDeviation.firstObservedAt < CONFIRMATION_DURATION_MS) {
          return null;
        }

        seed(candidateMidi, clarity, timestamp);
        return currentReading();
      }

      const deviationCents = Math.abs((candidateMidi - emaValue) * 100);

      if (deviationCents < RELEASE_THRESHOLD_CENTS) {
        pendingDeviation = undefined;
        feed(candidateMidi, clarity, RELEASE_ALPHA, timestamp, emaValue);
        return currentReading();
      }

      if (deviationCents < CONFIRMATION_THRESHOLD_CENTS) {
        pendingDeviation = undefined;
        feed(candidateMidi, clarity, ATTACK_ALPHA, timestamp, emaValue);
        return currentReading();
      }

      // Severe deviation: never fed to the median/EMA directly, only trusted once it persists.
      if (
        pendingDeviation === undefined ||
        Math.abs((candidateMidi - pendingDeviation.candidateMidi) * 100) >= PENDING_AGREEMENT_TOLERANCE_CENTS
      ) {
        pendingDeviation = { candidateMidi, firstObservedAt: timestamp };
        lastAcceptedAt = timestamp;
        return currentReading();
      }

      lastAcceptedAt = timestamp;
      if (timestamp - pendingDeviation.firstObservedAt < CONFIRMATION_DURATION_MS) {
        return currentReading();
      }

      seed(candidateMidi, clarity, timestamp);
      return currentReading();
    },
    reset() {
      clearAll();
    },
  };
};
