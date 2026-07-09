import { describe, expect, it } from 'vitest';
import { interpolate } from './interpolate';

describe('interpolate', () => {
  it('maps a value proportionally from the input range to the output range', () => {
    expect(interpolate(50, [0, 100], [0, 1])).toBeCloseTo(0.5);
    expect(interpolate(25, [0, 100], [0, 200])).toBeCloseTo(50);
  });

  it('clamps to the output range by default when the value is outside the input range', () => {
    expect(interpolate(150, [0, 100], [0, 1])).toBe(1);
    expect(interpolate(-50, [0, 100], [0, 1])).toBe(0);
  });

  it('extrapolates beyond the output range when clamp is false', () => {
    expect(interpolate(150, [0, 100], [0, 1], { clamp: false })).toBeCloseTo(1.5);
    expect(interpolate(-50, [0, 100], [0, 1], { clamp: false })).toBeCloseTo(-0.5);
  });

  it('supports an inverted output range', () => {
    expect(interpolate(0, [0, 100], [1, 0])).toBeCloseTo(1);
    expect(interpolate(100, [0, 100], [1, 0])).toBeCloseTo(0);
  });

  it('does not divide by zero when the input range is degenerate', () => {
    expect(interpolate(5, [10, 10], [0, 1])).toBe(0);
  });
});
