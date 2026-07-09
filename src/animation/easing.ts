// Deliberately no named presets here (no "standard"/"decelerate"/"accelerate" curves) - Figma has
// no animation design in this project yet (see theme/animation.ts's own EasingTokens, still shape
// only, zero values), and inventing numbers under design-sounding names would be exactly the kind
// of un-sourced design value CLAUDE.md prohibits. This module ships only the general-purpose math;
// real curves get named once a real design exists to transcribe.

export type EasingFunction = (t: number) => number;

export const linear: EasingFunction = (t) => t;

const NEWTON_ITERATIONS = 8;
const NEWTON_MIN_SLOPE = 1e-3;
const BISECTION_PRECISION = 1e-7;
const BISECTION_MAX_ITERATIONS = 20;

// Standard cubic bezier with fixed endpoints P0=(0,0), P3=(1,1); (x1,y1) and (x2,y2) are the two
// control points, same convention as CSS's cubic-bezier().
function bezierComponent(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * t * p1 + 3 * mt * t * t * p2 + t * t * t;
}

function bezierComponentDerivative(t: number, p1: number, p2: number): number {
  const mt = 1 - t;
  return 3 * mt * mt * p1 + 6 * mt * t * (p2 - p1) + 3 * t * t * (1 - p2);
}

function clamp01(t: number): number {
  return Math.max(0, Math.min(1, t));
}

// x(t) is monotonic for any well-formed easing curve (x1, x2 within [0,1]), so solving x(t) = x for
// t is a 1D root-find. Newton-Raphson converges fast; falls back to bisection wherever the slope is
// too flat for Newton to make progress (always converges for a monotonic function).
function solveTForX(x: number, x1: number, x2: number): number {
  let t = x;
  for (let i = 0; i < NEWTON_ITERATIONS; i++) {
    const derivative = bezierComponentDerivative(t, x1, x2);
    if (Math.abs(derivative) < NEWTON_MIN_SLOPE) break;
    const currentX = bezierComponent(t, x1, x2) - x;
    t -= currentX / derivative;
  }

  if (Math.abs(bezierComponent(t, x1, x2) - x) < BISECTION_PRECISION) {
    return clamp01(t);
  }

  let lower = 0;
  let upper = 1;
  t = x;
  for (let i = 0; i < BISECTION_MAX_ITERATIONS; i++) {
    const currentX = bezierComponent(t, x1, x2);
    if (Math.abs(currentX - x) < BISECTION_PRECISION) break;
    if (currentX < x) {
      lower = t;
    } else {
      upper = t;
    }
    t = (lower + upper) / 2;
  }
  return clamp01(t);
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  return (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return 1;
    const solvedT = solveTForX(t, x1, x2);
    return bezierComponent(solvedT, y1, y2);
  };
}
