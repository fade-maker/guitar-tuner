import type { PitchDetectionResult } from '../pitchDetection/PitchDetector';

export interface PitchCandidate {
  readonly frequency: number;
  readonly clarity: number;
  readonly timestamp: number;
}

export type CandidateRejectionReason =
  | 'no-detection'
  | 'invalid-value'
  | 'impossible-frequency'
  | 'out-of-range'
  | 'low-clarity'
  | 'outside-instrument-range';

export interface RawPitchValues {
  readonly frequency: number | null;
  readonly clarity: number | null;
}

export type CandidateValidationResult =
  | { readonly accepted: true; readonly candidate: PitchCandidate }
  | {
      readonly accepted: false;
      readonly reason: CandidateRejectionReason;
      readonly timestamp: number;
      readonly raw: RawPitchValues;
    };

export interface InstrumentRange {
  readonly minFrequency: number;
  readonly maxFrequency: number;
}

export interface CandidateValidationConfig {
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly clarityThreshold: number;
  readonly instrumentRange?: InstrumentRange;
}

export interface CandidateValidationContext {
  readonly sampleRate: number;
  readonly timestamp: number;
}

export type ValidateCandidate = (
  result: PitchDetectionResult | null,
  context: CandidateValidationContext,
  config: CandidateValidationConfig,
) => CandidateValidationResult;

function isValidFrequency(frequency: number): boolean {
  return Number.isFinite(frequency) && frequency !== 0;
}

function isValidClarity(clarity: number): boolean {
  return Number.isFinite(clarity) && clarity >= 0 && clarity <= 1;
}

// Both bounds inclusive: a value exactly at min/max is accepted, not rejected.
function isWithinRange(value: number, min: number, max: number): boolean {
  return value >= min && value <= max;
}

// Exclusive at Nyquist itself: a signal exactly at sampleRate/2 degenerates to a fixed +1/-1 pattern and
// carries no distinguishable frequency information, so it's treated as impossible, not borderline-valid.
function isBelowNyquist(frequency: number, sampleRate: number): boolean {
  return frequency < sampleRate / 2;
}

// Inclusive: clarity exactly at the threshold clears it - the threshold is a minimum bar to meet, not a
// strict value to exceed.
function meetsClarityThreshold(clarity: number, clarityThreshold: number): boolean {
  return clarity >= clarityThreshold;
}

function reject(
  reason: CandidateRejectionReason,
  timestamp: number,
  frequency: number | null,
  clarity: number | null,
): CandidateValidationResult {
  return { accepted: false, reason, timestamp, raw: { frequency, clarity } };
}

/**
 * Rejection checks run in this exact order, and that order is part of this function's public contract,
 * not an implementation detail: when a candidate fails more than one check at once, the earliest-listed
 * reason below is always what's reported.
 *
 * 1. no-detection            - the detector found nothing (its own "no pitch" sentinel).
 * 2. invalid-value           - NaN/Infinity on either field, frequency exactly 0, or clarity outside [0, 1].
 * 3. impossible-frequency    - negative frequency, or at/above the Nyquist limit for the sample rate.
 * 4. out-of-range            - outside the general, app-wide supported frequency range.
 * 5. low-clarity             - below the configured confidence threshold.
 * 6. outside-instrument-range - only checked when a narrower instrument range is supplied.
 */
export const validateCandidate: ValidateCandidate = (result, context, config) => {
  const { timestamp, sampleRate } = context;

  if (result === null) {
    return reject('no-detection', timestamp, null, null);
  }

  const { frequency, clarity } = result;

  if (!isValidFrequency(frequency) || !isValidClarity(clarity)) {
    return reject('invalid-value', timestamp, frequency, clarity);
  }

  if (frequency < 0 || !isBelowNyquist(frequency, sampleRate)) {
    return reject('impossible-frequency', timestamp, frequency, clarity);
  }

  if (!isWithinRange(frequency, config.minFrequency, config.maxFrequency)) {
    return reject('out-of-range', timestamp, frequency, clarity);
  }

  if (!meetsClarityThreshold(clarity, config.clarityThreshold)) {
    return reject('low-clarity', timestamp, frequency, clarity);
  }

  const { instrumentRange } = config;
  if (instrumentRange && !isWithinRange(frequency, instrumentRange.minFrequency, instrumentRange.maxFrequency)) {
    return reject('outside-instrument-range', timestamp, frequency, clarity);
  }

  return { accepted: true, candidate: { frequency, clarity, timestamp } };
};
