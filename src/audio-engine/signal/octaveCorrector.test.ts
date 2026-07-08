import { describe, expect, it } from 'vitest';
import { createOctaveCorrector } from './octaveCorrector';
import type { CandidateValidationResult } from './candidateValidator';
import type { OctaveCorrector } from './octaveCorrector';

function shiftCents(frequency: number, cents: number): number {
  return frequency * 2 ** (cents / 1200);
}

function accepted(frequency: number, clarity = 0.95, timestamp = 0): CandidateValidationResult {
  return { accepted: true, candidate: { frequency, clarity, timestamp } };
}

function rejected(timestamp = 0): CandidateValidationResult {
  return { accepted: false, reason: 'low-clarity', timestamp, raw: { frequency: null, clarity: null } };
}

function frequencyOf(result: CandidateValidationResult): number {
  if (!result.accepted) throw new Error('expected an accepted result');
  return result.candidate.frequency;
}

// Feeds the same octave-shifted frequency repeatedly and returns the corrector's own output for
// each call, so a test can inspect exactly when (if ever) it stops folding.
function feedRepeatedly(corrector: OctaveCorrector, frequency: number, count: number): CandidateValidationResult[] {
  const outputs: CandidateValidationResult[] = [];
  for (let i = 0; i < count; i++) {
    outputs.push(corrector.correct(accepted(frequency, 0.95, i)));
  }
  return outputs;
}

const BASE_FREQUENCY = 220; // A3
const TEST_CONFIG = { octaveConfirmFrames: 5 };

describe('bootstrap (fresh start, no prior reference)', () => {
  it('passes the very first candidate through unchanged', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    const result = corrector.correct(accepted(BASE_FREQUENCY));

    expect(frequencyOf(result)).toBe(BASE_FREQUENCY);
  });

  it('does not touch a rejected candidate, and does not treat it as establishing a reference', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    const rejectedResult = corrector.correct(rejected());
    expect(rejectedResult).toEqual(rejected());

    // Still no reference established - the very next accepted candidate is still a fresh bootstrap.
    const result = corrector.correct(accepted(BASE_FREQUENCY * 2));
    expect(frequencyOf(result)).toBe(BASE_FREQUENCY * 2);
  });
});

describe('ordinary continued tracking (no octave ambiguity)', () => {
  it('passes through a candidate that stays close to the reference', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    const result = corrector.correct(accepted(shiftCents(BASE_FREQUENCY, 20)));

    expect(frequencyOf(result)).toBeCloseTo(shiftCents(BASE_FREQUENCY, 20), 5);
  });

  it('passes through a genuine, gradual drift with no octave relation to the reference', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    // A large but non-octave drift (400 cents) - not explainable by any octave fold, so it's just a
    // real pitch change, not this module's concern.
    const drifted = shiftCents(BASE_FREQUENCY, 400);
    const result = corrector.correct(accepted(drifted));

    expect(frequencyOf(result)).toBeCloseTo(drifted, 5);
  });
});

describe('single-frame octave glitches', () => {
  it('folds a single octave-up glitch back toward the reference', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    const result = corrector.correct(accepted(BASE_FREQUENCY * 2));

    expect(frequencyOf(result)).toBeCloseTo(BASE_FREQUENCY, 5);
  });

  it('folds a single octave-down (subharmonic) glitch back toward the reference', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    const result = corrector.correct(accepted(BASE_FREQUENCY / 2));

    expect(frequencyOf(result)).toBeCloseTo(BASE_FREQUENCY, 5);
  });

  it('recovers cleanly if the reading reverts before the confirmation count is reached', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    // A brief run of the octave-up glitch, well under the confirmation count.
    feedRepeatedly(corrector, BASE_FREQUENCY * 2, 2);

    // Back to the true reading.
    const result = corrector.correct(accepted(BASE_FREQUENCY));
    expect(frequencyOf(result)).toBeCloseTo(BASE_FREQUENCY, 5);
  });
});

describe('accepting a genuine octave-apart change', () => {
  it('keeps folding while the alternate octave is not yet consistently confirmed', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    const outputs = feedRepeatedly(corrector, BASE_FREQUENCY * 2, 3); // fewer than the confirm count

    for (const output of outputs) {
      expect(frequencyOf(output)).toBeCloseTo(BASE_FREQUENCY, 5);
    }
  });

  it('stops folding and accepts the new octave once it has been suggested consistently for long enough', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));

    const outputs = feedRepeatedly(corrector, BASE_FREQUENCY * 2, 6); // more than the confirm count

    const stillFolding = outputs.slice(0, -1).some((o) => Math.abs(frequencyOf(o) - BASE_FREQUENCY) < 1);
    expect(stillFolding).toBe(true); // some early frames were still folded
    expect(frequencyOf(outputs[outputs.length - 1])).toBeCloseTo(BASE_FREQUENCY * 2, 5); // last one accepted raw
  });

  it('models the reported bug: a brief octave-doubled glitch on a detuned low string does not flip the reference, but a sustained one does', () => {
    // Mirrors standard tuning's Low E / D string relationship: exactly 2 semitones apart, so a Low
    // E detuned exactly 2 semitones flat has its octave-doubled misread land exactly on the D
    // string's own frequency - a structural consequence of octaves, not a coincidence.
    const lowStringDetuned = shiftCents(BASE_FREQUENCY, -200);
    const dString = lowStringDetuned * 2;

    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(lowStringDetuned));

    // Brief glitch - well under the confirm count - must not stick.
    feedRepeatedly(corrector, dString, 2);
    const recovered = corrector.correct(accepted(lowStringDetuned));
    expect(frequencyOf(recovered)).toBeCloseTo(lowStringDetuned, 5);

    // A genuine, sustained switch to the D string - must eventually go through unfolded.
    const outputs = feedRepeatedly(corrector, dString, 6);
    expect(frequencyOf(outputs[outputs.length - 1])).toBeCloseTo(dString, 5);
  });
});

describe('reset', () => {
  it('clears the reference so the next candidate is treated as a fresh bootstrap', () => {
    const corrector = createOctaveCorrector(TEST_CONFIG);
    corrector.correct(accepted(BASE_FREQUENCY));
    corrector.reset();

    const result = corrector.correct(accepted(BASE_FREQUENCY * 2));
    expect(frequencyOf(result)).toBe(BASE_FREQUENCY * 2); // not folded - no reference survived reset
  });
});
