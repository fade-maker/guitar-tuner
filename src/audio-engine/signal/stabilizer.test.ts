import { describe, expect, it } from 'vitest';
import { createPitchStabilizer } from './stabilizer';
import type { CandidateValidationResult } from './candidateValidator';
import type { PitchStabilizer, StabilizedReading } from './stabilizer';

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

// Repeatedly pushes the same (frequency, clarity) until the stabilizer reports a non-null reading -
// i.e. until fresh-start confirmation completes. Mirrors tunerPresenter.test.ts's lockIn() helper.
function bootstrap(
  stabilizer: PitchStabilizer,
  frequency: number,
  clarity: number,
  startTime: number,
): { reading: StabilizedReading; t: number } {
  let t = startTime;
  let reading = stabilizer.push(accepted(frequency, clarity, t));
  while (reading === null) {
    t += HOP_MS;
    reading = stabilizer.push(accepted(frequency, clarity, t));
    if (t > startTime + 1000) throw new Error('bootstrap() safety valve tripped - never confirmed');
  }
  return { reading, t };
}

describe('bootstrap (fresh start, no prior track)', () => {
  it('does not seed from a single accepted candidate', () => {
    const stabilizer = createPitchStabilizer();
    const reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.95, 1000));

    expect(reading).toBeNull();
  });

  it('seeds once a matching candidate persists past the confirmation window', () => {
    const stabilizer = createPitchStabilizer();
    const { reading } = bootstrap(stabilizer, BASE_FREQUENCY, 0.95, 1000);

    expect(reading.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
    expect(reading.clarity).toBe(0.95);
  });

  it('never confirms an isolated candidate that never repeats (rejects a knock/click-style transient)', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    let reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.95, t));
    expect(reading).toBeNull();

    // The transient doesn't repeat - RMS gate cuts off immediately after, exactly like a knock's
    // instant decay. No accepted candidate follows within the debounce tolerance.
    t += 500; // well beyond DEBOUNCE_TOLERANCE_MS
    reading = stabilizer.push(rejected(t));
    expect(reading).toBeNull();

    // A later, unrelated candidate must start its own fresh confirmation, not inherit the transient's.
    t += HOP_MS;
    reading = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 500), 0.9, t));
    expect(reading).toBeNull(); // still just the first observation of a new streak
  });

  it('restarts the confirmation window when a different candidate replaces a pending one', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t)); // candidate A pending

    t += HOP_MS;
    const differentFrequency = shiftCents(BASE_FREQUENCY, 700);
    let reading = stabilizer.push(accepted(differentFrequency, 0.9, t)); // replaces A, doesn't confirm it
    expect(reading).toBeNull();

    // B needs its own full confirmation window from here, not credit for A's elapsed time.
    for (let i = 0; i < 2; i++) {
      t += HOP_MS;
      reading = stabilizer.push(accepted(differentFrequency, 0.9, t));
    }
    expect(reading).toBeNull(); // only ~24ms since B started - not yet 40ms

    t += HOP_MS * 2;
    reading = stabilizer.push(accepted(differentFrequency, 0.9, t));
    expect(reading!.frequency).toBeCloseTo(differentFrequency, 0);
  });

  it('tolerates a single brief rejection during confirmation without restarting it', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t)); // pending observed at t=1000

    t += HOP_MS;
    let reading = stabilizer.push(rejected(t)); // one dropped frame, well within debounce tolerance
    expect(reading).toBeNull();

    // The pending streak survived the blip - resuming matching candidates still counts from t=1000,
    // not restarted from here.
    t += HOP_MS;
    reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t)); // t=1024, 24ms since first observed
    expect(reading).toBeNull();

    t += HOP_MS * 2; // t=1048, 48ms since first observed - past the 40ms window
    reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('abandons a pending candidate after a sustained rejection, requiring a fresh confirmation', () => {
    const stabilizer = createPitchStabilizer();
    let t = 1000;
    stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t)); // pending observed at t=1000

    t += 500; // sustained gap, well beyond the debounce tolerance
    let reading = stabilizer.push(rejected(t));
    expect(reading).toBeNull();

    // Resuming the exact same candidate now must confirm from scratch, not from t=1000's progress.
    t += HOP_MS;
    reading = stabilizer.push(accepted(BASE_FREQUENCY, 0.9, t));
    expect(reading).toBeNull(); // freshly pending again, not yet confirmed

    const { reading: confirmed } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, t);
    expect(confirmed.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });
});

describe('steady state', () => {
  it('stays close to a run of nearly identical candidates', () => {
    const stabilizer = createPitchStabilizer();
    const { reading: seeded, t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.95, 1000);
    let last = seeded;
    let t = seededAt;

    for (let i = 0; i < 10; i++) {
      t += HOP_MS;
      last = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 2), 0.95, t))!;
    }

    expect(last.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('reports a frequency within the range of recently fed values (never invents or overshoots)', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    let t = seededAt;
    const frequencies = [0, 3, -2, 4, 1].map((cents) => shiftCents(BASE_FREQUENCY, cents));
    let last: StabilizedReading | null = null;

    for (const f of frequencies) {
      t += HOP_MS;
      last = stabilizer.push(accepted(f, 0.9, t));
    }

    const min = Math.min(BASE_FREQUENCY, ...frequencies);
    const max = Math.max(BASE_FREQUENCY, ...frequencies);
    expect(last!.frequency).toBeGreaterThanOrEqual(min - 1e-6);
    expect(last!.frequency).toBeLessThanOrEqual(max + 1e-6);
  });

  it('responds faster to a moderate deviation than to steady-state noise', () => {
    const settled = createPitchStabilizer();
    const moved = createPitchStabilizer();

    const { t: settledSeededAt } = bootstrap(settled, BASE_FREQUENCY, 0.9, 1000);
    const { t: movedSeededAt } = bootstrap(moved, BASE_FREQUENCY, 0.9, 1000);

    const settledReading = settled.push(accepted(shiftCents(BASE_FREQUENCY, 2), 0.9, settledSeededAt + HOP_MS))!;
    const movedReading = moved.push(accepted(shiftCents(BASE_FREQUENCY, 20), 0.9, movedSeededAt + HOP_MS))!;

    const settledMove = Math.abs(settledReading.frequency - BASE_FREQUENCY);
    const movedMove = Math.abs(movedReading.frequency - BASE_FREQUENCY);

    // The moderate deviation should pull the estimate further, proportionally, than steady-state noise -
    // a qualitative check of attack-vs-release asymmetry, not a pin on the exact internal coefficients.
    expect(movedMove / settledMove).toBeGreaterThan(2);
  });
});

describe('severe deviation confirmation (against an existing track)', () => {
  it('does not move the estimate on a single severe deviation', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);

    const reading = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 700), 0.9, seededAt + HOP_MS))!;

    expect(reading.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('confirms a severe deviation once it persists past the confirmation window', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    let t = seededAt;

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
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    let t = seededAt + HOP_MS;
    stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 700), 0.9, t)); // one-off spike
    t += HOP_MS;

    const reading = stabilizer.push(accepted(shiftCents(BASE_FREQUENCY, 1), 0.9, t))!;

    expect(reading.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('restarts the confirmation window when a different severe deviation replaces a pending one', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    let t = seededAt + HOP_MS;
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

describe('rejection handling (against an existing track)', () => {
  it('absorbs a rejection within the debounce tolerance without changing the estimate', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    const t = seededAt + 10; // well within the short internal debounce

    const reading = stabilizer.push(rejected(t));

    expect(reading).not.toBeNull();
    expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
  });

  it('returns null once rejections exceed the debounce tolerance', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    const t = seededAt + 500; // well beyond the short internal debounce

    expect(stabilizer.push(rejected(t))).toBeNull();
  });

  it('rides through a ~100ms burst of low-clarity frames without abandoning the track', () => {
    // The core of the "flickers, feels less confident" fix: a held note whose clarity dips below
    // threshold for a run of frames (electric decay, bass) must keep reporting the established pitch,
    // not fall back to null and force a fresh re-confirmation. ~100ms of dropped frames is within the
    // raised DEBOUNCE_TOLERANCE_MS; at the previous 30ms this would already have cleared to null.
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);

    for (let t = seededAt + HOP_MS; t <= seededAt + 96; t += HOP_MS) {
      const reading = stabilizer.push(rejected(t));
      expect(reading).not.toBeNull();
      expect(reading!.frequency).toBeCloseTo(BASE_FREQUENCY, 0);
    }
  });

  it('treats resumption after a cleared signal as a fresh, unbiased confirmation - not a continuation', () => {
    const stabilizer = createPitchStabilizer();
    const { t: seededAt } = bootstrap(stabilizer, BASE_FREQUENCY, 0.9, 1000);
    let t = seededAt + 500; // exceeds tolerance, clears state
    stabilizer.push(rejected(t));
    t += HOP_MS;

    // Would have been "severe" against the old value - proving it isn't compared against stale history,
    // just goes through the same ordinary fresh confirmation as any other new candidate.
    const newFrequency = shiftCents(BASE_FREQUENCY, 700);
    const { reading } = bootstrap(stabilizer, newFrequency, 0.9, t);

    expect(reading.frequency).toBeCloseTo(newFrequency, 0);
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
