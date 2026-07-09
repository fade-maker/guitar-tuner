import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSharedValue } from './sharedValue';
import { spring } from './spring';

// Same rationale as tween.test.ts: spring() drives the real, shared `scheduler` singleton, so every
// test must leave zero listeners registered by the time it ends.
let frameCallbacks: FrameRequestCallback[] = [];
let now = 0;

function fireFrame(deltaMs: number): void {
  now += deltaMs;
  const pending = frameCallbacks;
  frameCallbacks = [];
  for (const cb of pending) cb(now);
}

beforeEach(() => {
  frameCallbacks = [];
  now = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    frameCallbacks.push(cb);
    return frameCallbacks.length;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('spring', () => {
  it('does not move on the very first frame (zero elapsed delta)', () => {
    const value = createSharedValue(0);
    const handle = spring(value, 100, { stiffness: 100, damping: 10 });
    fireFrame(16);
    expect(value.get()).toBe(0);
    handle.stop();
  });

  it('matches hand-computed semi-implicit Euler integration for a single 16ms step', () => {
    // stiffness=100, damping=10, mass=1, from 0 toward 100:
    // acceleration = (-100*(0-100) - 10*0) / 1 = 10000
    // velocity += 10000 * 0.016 = 160
    // position += 160 * 0.016 = 2.56
    const value = createSharedValue(0);
    const handle = spring(value, 100, { stiffness: 100, damping: 10, mass: 1 });
    fireFrame(0); // primes the scheduler's delta clock (first tick after subscribing is always 0)
    fireFrame(16);
    expect(value.get()).toBeCloseTo(2.56, 5);
    handle.stop();
  });

  it('a larger mass responds more slowly to the same spring parameters', () => {
    const light = createSharedValue(0);
    const heavy = createSharedValue(0);
    const lightHandle = spring(light, 100, { stiffness: 100, damping: 10, mass: 1 });
    const heavyHandle = spring(heavy, 100, { stiffness: 100, damping: 10, mass: 4 });

    fireFrame(0);
    fireFrame(16);

    expect(Math.abs(light.get())).toBeGreaterThan(Math.abs(heavy.get()));
    lightHandle.stop();
    heavyHandle.stop();
  });

  it('eventually settles exactly at the target and stops moving', () => {
    const value = createSharedValue(0);
    const handle = spring(value, 100, { stiffness: 100, damping: 20, mass: 1 });
    fireFrame(0);

    let frames = 0;
    while (value.get() !== 100 && frames < 500) {
      fireFrame(16);
      frames++;
    }

    expect(value.get()).toBe(100);
    expect(frames).toBeLessThan(500); // sanity: it actually converged, not just hit the safety cap

    const settledValue = value.get();
    fireFrame(16);
    expect(value.get()).toBe(settledValue);
    handle.stop();
  });

  it('preserves velocity across a retarget on the same SharedValue (spring resumes motion, not from rest)', () => {
    const movingValue = createSharedValue(0);
    const firstHandle = spring(movingValue, 100, { stiffness: 100, damping: 10, mass: 1 });
    fireFrame(0);
    fireFrame(16);
    fireFrame(16);
    firstHandle.stop();

    const positionAtRetarget = movingValue.get();
    const restingValue = createSharedValue(positionAtRetarget);

    const retargetedHandle = spring(movingValue, 50, { stiffness: 100, damping: 10, mass: 1 });
    const freshHandle = spring(restingValue, 50, { stiffness: 100, damping: 10, mass: 1 });

    fireFrame(0); // primes both (scheduler dropped to 0 subscribers between firstHandle.stop() and here)
    fireFrame(16);

    // Both start this step from the exact same position toward the exact same target - the one
    // carrying real momentum from before must move further than one starting from rest.
    expect(Math.abs(movingValue.get() - positionAtRetarget)).toBeGreaterThan(
      Math.abs(restingValue.get() - positionAtRetarget),
    );

    retargetedHandle.stop();
    freshHandle.stop();
  });

  it('sub-steps large deltas so one janky frame does not diverge far from many small ones covering the same total time', () => {
    const smoothValue = createSharedValue(0);
    const smoothHandle = spring(smoothValue, 100, { stiffness: 300, damping: 20, mass: 1 });
    fireFrame(0);
    for (let i = 0; i < 20; i++) fireFrame(16);
    smoothHandle.stop();

    const jankyValue = createSharedValue(0);
    const jankyHandle = spring(jankyValue, 100, { stiffness: 300, damping: 20, mass: 1 });
    fireFrame(0);
    fireFrame(320); // same ~320ms total, delivered as one big frame
    jankyHandle.stop();

    expect(Math.abs(smoothValue.get() - jankyValue.get())).toBeLessThan(5);
  });
});
