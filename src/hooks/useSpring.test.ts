// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSpring } from './useSpring';

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

describe('useSpring', () => {
  it('starts at rest, at the initial target', () => {
    const { result } = renderHook(() => useSpring(100, { stiffness: 100, damping: 20 }));
    expect(result.current.get()).toBe(100);
  });

  it('animates toward a new target when the target prop changes', () => {
    const { result, rerender } = renderHook(({ target }) => useSpring(target, { stiffness: 100, damping: 20 }), {
      initialProps: { target: 0 },
    });

    rerender({ target: 100 });
    act(() => {
      fireFrame(0);
      fireFrame(16);
    });

    expect(result.current.get()).toBeGreaterThan(0);
    expect(result.current.get()).toBeLessThan(100);
  });

  it('stops driving the value on unmount', () => {
    const { result, rerender, unmount } = renderHook(
      ({ target }) => useSpring(target, { stiffness: 100, damping: 20 }),
      { initialProps: { target: 0 } },
    );

    rerender({ target: 100 });
    act(() => {
      fireFrame(0);
      fireFrame(16);
    });
    const valueBeforeUnmount = result.current.get();
    expect(valueBeforeUnmount).toBeGreaterThan(0);

    unmount();
    act(() => fireFrame(16));

    expect(result.current.get()).toBe(valueBeforeUnmount);
  });
});
