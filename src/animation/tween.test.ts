import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSharedValue } from './sharedValue';
import { tween } from './tween';

// tween() drives the real, shared `scheduler` singleton (not an isolated instance - there is no way
// to inject a different one through tween()'s public signature, by design). Every test below must
// therefore leave zero listeners registered by the time it ends, or it would leak into the next
// test in this file - every test explicitly stops its own handle for this reason.
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

describe('tween', () => {
  it('does not move on the very first frame (zero elapsed delta)', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 100 });
    fireFrame(16);
    expect(value.get()).toBe(0);
    handle.stop();
  });

  it('interpolates linearly toward the target by default', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 100 });
    fireFrame(0);
    fireFrame(50);
    expect(value.get()).toBeCloseTo(50, 5);
    handle.stop();
  });

  it('reaches exactly the target when the duration elapses, and stops itself', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 100 });
    fireFrame(0);
    fireFrame(100);
    expect(value.get()).toBe(100);
    handle.stop();
  });

  it('does not keep moving the value after completion', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 100 });
    fireFrame(0);
    fireFrame(150);
    const valueAfterCompletion = value.get();
    fireFrame(1000);
    expect(value.get()).toBe(valueAfterCompletion);
    handle.stop();
  });

  it('applies a custom easing function', () => {
    const value = createSharedValue(0);
    const easeToHalf = () => 0.5; // trivial fixed-output easing, for a deterministic assertion
    const handle = tween(value, 100, { durationMs: 100, easing: easeToHalf });
    fireFrame(0);
    fireFrame(1);
    expect(value.get()).toBe(50);
    handle.stop();
  });

  it('stop() halts the animation immediately, wherever it currently is', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 100 });
    fireFrame(0);
    fireFrame(50);
    const valueAtStop = value.get();
    handle.stop();
    fireFrame(50);
    expect(value.get()).toBe(valueAtStop);
  });

  it('animates from the value the SharedValue held at the moment tween() was called', () => {
    const value = createSharedValue(20);
    const handle = tween(value, 120, { durationMs: 100 });
    fireFrame(0);
    fireFrame(50);
    expect(value.get()).toBeCloseTo(70, 5);
    handle.stop();
  });

  it('treats a non-positive duration as an instant jump to the target', () => {
    const value = createSharedValue(0);
    const handle = tween(value, 100, { durationMs: 0 });
    fireFrame(16);
    expect(value.get()).toBe(100);
    handle.stop();
  });
});
