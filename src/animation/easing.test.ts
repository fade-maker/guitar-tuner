import { describe, expect, it } from 'vitest';
import { cubicBezier, linear } from './easing';

// An independently-implemented, deliberately slow bisection solver - used only to cross-validate
// the module's own Newton-Raphson implementation, not shared code with it.
function referenceCubicBezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  function bezier(t: number, p1: number, p2: number): number {
    const mt = 1 - t;
    return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
  }
  return (targetX: number): number => {
    let lower = 0;
    let upper = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lower + upper) / 2;
      if (bezier(mid, x1, x2) < targetX) {
        lower = mid;
      } else {
        upper = mid;
      }
    }
    return bezier((lower + upper) / 2, y1, y2);
  };
}

describe('linear', () => {
  it('returns its input unchanged', () => {
    for (const t of [0, 0.25, 0.5, 0.75, 1]) {
      expect(linear(t)).toBe(t);
    }
  });
});

describe('cubicBezier', () => {
  it('always starts at 0 and ends at 1', () => {
    const ease = cubicBezier(0.25, 0.1, 0.25, 1.0);
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
  });

  it('matches linear for the (0,0,1,1) control points', () => {
    const ease = cubicBezier(0, 0, 1, 1);
    for (const t of [0.1, 0.3, 0.5, 0.7, 0.9]) {
      expect(ease(t)).toBeCloseTo(t, 5);
    }
  });

  it('matches an independently-implemented bisection solver across a range of common curves', () => {
    const curves: Array<[number, number, number, number]> = [
      [0.25, 0.1, 0.25, 1.0],
      [0.42, 0, 1, 1],
      [0, 0, 0.58, 1],
      [0.42, 0, 0.58, 1],
    ];

    for (const [x1, y1, x2, y2] of curves) {
      const ease = cubicBezier(x1, y1, x2, y2);
      const reference = referenceCubicBezier(x1, y1, x2, y2);
      for (const t of [0.05, 0.2, 0.4, 0.5, 0.6, 0.8, 0.95]) {
        expect(ease(t)).toBeCloseTo(reference(t), 4);
      }
    }
  });

  it('is monotonically non-decreasing for a standard ease-in-out shaped curve', () => {
    const ease = cubicBezier(0.42, 0, 0.58, 1);
    let previous = ease(0);
    for (let t = 0.01; t <= 1; t += 0.01) {
      const current = ease(t);
      expect(current).toBeGreaterThanOrEqual(previous - 1e-9);
      previous = current;
    }
  });
});
