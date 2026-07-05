import { describe, expect, it } from 'vitest';
import { OneEuroFilter } from './oneEuroFilter';

const OPTIONS = { minCutoffHz: 1.0, beta: 0.01, derivativeCutoffHz: 1.0 };

describe('OneEuroFilter', () => {
  it('snaps to the first value with no prior state', () => {
    const filter = new OneEuroFilter(OPTIONS);
    expect(filter.filter(40, 0.016)).toBe(40);
  });

  it('passes the raw value through unfiltered when dtSeconds is not positive', () => {
    const filter = new OneEuroFilter(OPTIONS);
    filter.filter(0, 0.016);
    expect(filter.filter(40, 0)).toBe(40);
  });

  it('moves partway toward a new value on a single frame, not instantly', () => {
    const filter = new OneEuroFilter(OPTIONS);
    filter.filter(0, 0.016);
    const next = filter.filter(40, 0.016);
    expect(next).toBeGreaterThan(0);
    expect(next).toBeLessThan(40);
  });

  it('converges closer to a sustained target with each additional frame', () => {
    const filter = new OneEuroFilter(OPTIONS);
    let previous = filter.filter(0, 0.016);
    for (let frame = 0; frame < 10; frame++) {
      const current = filter.filter(40, 0.016);
      expect(current).toBeGreaterThan(previous);
      previous = current;
    }
    expect(previous).toBeGreaterThan(30);
    expect(previous).toBeLessThan(40);
  });

  it('damps alternating small jitter far more than it would track a real change', () => {
    const filter = new OneEuroFilter(OPTIONS);
    filter.filter(0, 0.016);
    for (let frame = 0; frame < 10; frame++) {
      const noisy = frame % 2 === 0 ? 3 : -3;
      const smoothed = filter.filter(noisy, 0.016);
      expect(Math.abs(smoothed)).toBeLessThan(1);
    }
  });

  it('reset() seeds internal state so a matching next reading passes through unchanged', () => {
    const filter = new OneEuroFilter(OPTIONS);
    filter.filter(0, 0.016);
    filter.filter(40, 0.016); // build up non-zero internal value/speed state
    filter.reset(100);
    expect(filter.filter(100, 0.016)).toBe(100);
  });
});
