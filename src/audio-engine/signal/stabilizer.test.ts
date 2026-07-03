import { describe, expect, it } from 'vitest';
import { createPitchStabilizer } from './stabilizer';
import type { CandidateValidationResult } from './candidateValidator';

function shiftCents(frequency: number, cents: number): number {
  return frequency * 2 ** (cents / 1200);
}

function accepted(frequency: number, clarity: number, timestamp: number): CandidateValidationResult {
  return { accepted: true, candidate: { frequency, clarity, timestamp } };
}

function rejected(timestamp: number): CandidateValidationResult {
  return { accepted: false, reason: 'low-clarity', timestamp, raw: { frequency: null, clarity: null } };
}

const BASE_FREQUENCY = 220; // A3
const HOP_MS = 12;

describe('bootstrap', () => {
  it('seeds directly from the first accepted candidate', () => {
    const stabilizer = createPitchStabilizer();
    const reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.95, 1000));

    expect(reading).not.toBeNull();
    expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 6);
    expect(reading!.clarity).toBe(0.95);
  });

  it('returns null for a rejected candidate before anything has ever been accepted', () => {
    const stabilizer = createPitchStabilizer();
    expect(stabilizer.push(rejected(1000))).toBeNull();
  });
});

describe('steady state', () => {
  it('stays close to a run of nearly identical candidates', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    let last = stabilizer.push(accepted(BASE_FREQUENCY, 0.95, t))!;

    for (let i = 0; i < 10; i++) {
      t += HOP_MS;
      last = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 2), 0.95, t))!;
    }

    expect(last.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('reports a frequency within the range of recently fed values (never invents or overshoots)', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    const frequencies = [0, 3, -2, 4, 1].map((cents) => shiftCents(BASE_FREQUENCY, cents));
    let last: { frequency: number; clarity: number } | null = null;

    for (const f of frequencies) {
      last = stabilizer.push(accepted(f, 0.9, t));
      t += HOP_MS;
    }

    const min = Math.min(...frequencies);
    const max = Math.max(...frequencies);
    expect(last!.frequency).toBeGreaterThanOrEqual(min - 1e-6);
    expect(last!.frequency).toBeLessThanOrEqual(max + 1e-6);
  });

  it('responds faster to a moderate deviation than to steady-state noise', () => {
    const settled = createPitchStabilizer();
    const moved = createPitchStabilizer();
    let t = 1000;

    settled.push(accepted(BASE_FREQUENCY, 0.9, t));
    moved.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += HOP_MS;

    const settledReading = settled.push(accepted(shiftCents(BASE_FREQUENCY, 2), 0.9, t))!;
    const movedReading = moved.push(accepted(shiftCents(BASE_FREQUENCY, 20), 0.9, t))!;

    const settledMove = Math.abs(settledReading.frequency - BASE_FREQUENCY);
    const movedMove = Math.abs(movedReading.frequency - BASE_FREQUENCY);

    // The moderate deviation should pull the estimate further, proportionally, than steady-state noise -
    // a qualitative check of attack-vs-release asymmetry, not a pin on the exact internal coefficients.
    expect(movedMove / settledMove).toBeGreaterThan(2);
  });
});

describe('severe deviation confirmation', () => {
  it('does not move the estimate on a single severe deviation', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += HOP_MS;

    const reading = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 700), 0.9, t))!;

    expect(reading.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('confirms a severe deviation once it persists past the confirmation window', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));

    const newFrequency = shiftCents(BASE_FREQUENCY, 700);
    let reading = null;
    for (let i = 0; i < 6; i++) {
      t += HOP_MS;
      reading = stabilizer.push(accepted(newFrequency, 0.9, t));
    }

    expect(reading!.frequency).toBeCloseTo(newFrequency, 0);
  });

  it('abandons a severe deviation that does not repeat', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += HOP_MS;
    stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 700), 0.9, t)); // one-off spike
    t += HOP_MS;

    const reading = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 1), 0.9, t))!;

    expect(reading.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('restarts the confirmation window when a different severe deviation replaces a pending one', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));

    t += HOP_MS;
    stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 700), 0.9, t)); // candidate A pending

    t += HOP_MS;
    const secondFrequency = shiftCents(BASE_FREQUENCY, -700);
    // A different severe candidate arrives before A would have confirmed - replaces A, doesn't confirm it.
    let reading = stabilizer.push(accepted(secondFrequency, 0.9, t));
    expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 0);

    // B needs its own full confirmation window from here, not credit for A's elapsed time.
    for (let i = 0; i < 5; i++) {
      t += HOP_MS;
      reading = stabilizer.push(accepted(secondFrequency, 0.9, t));
    }
    expect(reading!.frequency).toBeCloseTo(secondFrequency, 0);
  });
});

describe('rejection handling', () => {
  it('absorbs a rejection within the debounce tolerance without changing the estimate', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += 10; // well within the short internal debounce

    const reading = stabilizer.push(rejected(t));

    expect(reading).not.toBeNull();
    expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('returns null once rejections exceed the debounce tolerance', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += 500; // well beyond the short internal debounce

    expect(stabilizer.push(rejected(t))).toBeNull();
  });

  it('treats resumption after a cleared signal as a fresh bootstrap, not a continuation', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += 500;
    stabilizer.push(rejected(t)); // exceeds tolerance, clears state
    t += HOP_MS;

    const newFrequency = shiftCents(BASE_FREQUENCY, 700); // would have been "severe" against the old value
    const reading = stabilizer.push(accepted(newFrequency, 0.9, t));

    // Treated as a fresh seed, not evaluated against stale history - takes effect immediately.
    expect(reading!.frequency).toBeCloseTo(newFrequency, 0);
  });
});

describe('reset', () => {
  it('returns the stabilizer to a state indistinguishable from a fresh instance', () => {
    const seasoned = createPitchStabilizer();
    let t = 1000;
    seasoned.push(accepted(BASE_FREQUENCY, 0.9, t));
    t += HOP_MS;
    seasoned.push(accepted(shiftCents(BASE_FREQUENCY, 5), 0.9, t));
    seasoned.reset();

    const fresh = createPitchStabilizer();

    const sequence = [
      accepted(300, 0.92, 2000),
      accepted(shiftCents(300, 3), 0.92, 2012),
      accepted(shiftCents(300, -2), 0.92, 2024),
    ];

    const seasonedOutputs = sequence.map((r) => seasoned.push(r));
    const freshOutputs = sequence.map((r) => fresh.push(r));

    expect(seasonedOutputs).toEqual(freshOutputs);
  });
});

describe('invariants', () => {
  it('never throws for well-typed accepted or rejected input', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    const inputs = [
      accepted(220, 0.95, t),
      rejected((t += HOP_MS)),
      accepted(shiftCents(220, 900), 0.5, (t += HOP_MS)),
      rejected((t += 1000)),
      accepted(50, 0.99, t + HOP_MS),
    ];

    expect(() => inputs.forEach((input) => stabilizer.push(input))).not.toThrow();
  });

  it('always returns a finite, positive frequency and a clarity within [0, 1] when non-null', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    const readings = [
      accepted(220, 0.95, t),
      accepted(shiftCents(220, 3), 0.9, (t += HOP_MS)),
      accepted(shiftCents(220, 900), 0.6, (t += HOP_MS)),
      rejected(t + HOP_MS),
    ].map((input) => stabilizer.push(input));

    for (const reading of readings) {
      if (reading) {
        expect(Number.isFinite(reading.frequency)).toBe(true);
        expect(reading.frequency).toBeGreaterThan(0);
        expect(reading.clarity).toBeGreaterThanOrEqual(0);
        expect(reading.clarity).toBeLessThanOrEqual(1);
      }
    }
  });

  it('is deterministic: two fresh instances fed an identical sequence produce identical output', () => {
    const a = createPitchStabilizer();
    const b = createPitchStabilizer();
    let t = 1000;
    const sequence = [
      accepted(147, 0.93, t),
      accepted(shiftCents(147, 4), 0.93, (t += HOP_MS)),
      rejected((t += HOP_MS)),
      accepted(shiftCents(147, -3), 0.93, t + HOP_MS),
    ];

    expect(sequence.map((r) => a.push(r))).toEqual(sequence.map((r) => b.push(r)));
  });
});
