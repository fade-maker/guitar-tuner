// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useTween } from './useTween';

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
  cleanup();
  vi.unstubAllGlobals();
});

describe('useTween', () => {
  it('starts at rest, at the initial target', () => {
    const { result } = renderHook(() => useTween(100, { durationMs: 200 }));
    expect(result.current.get()).toBe(100);
  });

  it('animates toward a new target over the configured duration when the target prop changes', () => {
    const { result, rerender } = renderHook(({ target }) => useTween(target, { durationMs: 100 }), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    act(() => {
      fireFrame(0);
      fireFrame(50);
    });

    expect(result.current.get()).toBeCloseTo(50, 5);
  });

  it('reaches exactly the target once the duration elapses', () => {
    const { result, rerender } = renderHook(({ target }) => useTween(target, { durationMs: 100 }), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    act(() => {
      fireFrame(0);
      fireFrame(100);
    });

    expect(result.current.get()).toBe(100);
  });

  it('stops driving the value on unmount', () => {
    const { result, rerender, unmount } = renderHook(({ target }) => useTween(target, { durationMs: 200 }), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    act(() => {
      fireFrame(0);
      fireFrame(50);
    });
    const valueBeforeUnmount = result.current.get();
    expect(valueBeforeUnmount).toBeGreaterThan(0);
    expect(valueBeforeUnmount).toBeLessThan(100);

    unmount();
    act(() => fireFrame(50));

    expect(result.current.get()).toBe(valueBeforeUnmount);
  });
});
