import { describe, expect, it } from 'vitest';
import { createWindowAccumulator } from './windowAccumulator';

function block(...values: number[]): Float32Array {
  return Float32Array.from(values);
}

describe('createWindowAccumulator', () => {
  it('returns null until the window has been fully warmed up', () => {
    const accumulator = createWindowAccumulator(10, 4);
    expect(accumulator.push(block(1, 2, 3), 0)).toBeNull();
    expect(accumulator.push(block(4, 5, 6), 1)).toBeNull();
    expect(accumulator.push(block(7, 8, 9), 2)).toBeNull();
  });

  it('produces a correctly ordered window once warmed, including across a wraparound write', () => {
    const accumulator = createWindowAccumulator(10, 4);
    accumulator.push(block(1, 2, 3), 0);
    accumulator.push(block(4, 5, 6), 1);
    accumulator.push(block(7, 8, 9), 2);
    const ready = accumulator.push(block(10, 11, 12), 3);

    expect(ready).not.toBeNull();
    expect(Array.from(ready!.samples)).toEqual([3, 4, 5, 6, 7, 8, 9, 10, 11, 12]);
  });

  it('attaches the timestamp of the push call that completed the window', () => {
    const accumulator = createWindowAccumulator(10, 4);
    accumulator.push(block(1, 2, 3), 100);
    accumulator.push(block(4, 5, 6), 112);
    accumulator.push(block(7, 8, 9), 124);
    const ready = accumulator.push(block(10, 11, 12), 136);

    expect(ready!.timestamp).toBe(136);
  });

  it('does not fire on every push once warmed - only at hop boundaries', () => {
    const accumulator = createWindowAccumulator(8, 4);
    let fireCount = 0;
    for (let i = 0; i < 50; i++) {
      const result = accumulator.push(block(i, i), i);
      if (result) fireCount++;
    }

    // 50 pushes * 2 samples = 100 samples total, over an 8-sample window with a 4-sample hop -
    // roughly (100 - 8) / 4 + 1 windows, with a small allowance for warm-up phase rounding.
    expect(fireCount).toBeGreaterThanOrEqual(20);
    expect(fireCount).toBeLessThanOrEqual(26);
  });

  it('does not burst-fire more than once immediately after warm-up completes', () => {
    const accumulator = createWindowAccumulator(8, 4);
    const results: (unknown | null)[] = [];
    for (let i = 0; i < 6; i++) {
      results.push(accumulator.push(block(i, i), i));
    }

    // At most the warm-up completion itself, plus one early catch-up window - never an unbounded run.
    const fireCount = results.filter((r) => r !== null).length;
    expect(fireCount).toBeLessThanOrEqual(2);
  });

  it('requires full re-warm-up after reset', () => {
    const accumulator = createWindowAccumulator(10, 4);
    accumulator.push(block(1, 2, 3), 0);
    accumulator.push(block(4, 5, 6), 1);
    accumulator.push(block(7, 8, 9), 2);
    accumulator.push(block(10, 11, 12), 3); // now warmed

    accumulator.reset();

    expect(accumulator.push(block(1, 2, 3), 10)).toBeNull();
  });
});
