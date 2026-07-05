// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useSmoothedCents } from './useSmoothedCents';

// The hook's continuing-smoothing branch gets its timestamp from requestAnimationFrame's own
// callback argument (never a direct performance.now() call - see the hook's own comment on why),
// so it's driven here by a synchronous, test-controlled rAF stub instead of mocking
// performance.now(): each call invokes its callback immediately with the externally-controlled
// `rafNow`, keeping every assertion deterministic without needing real timers.
let rafNow = 0;

beforeEach(() => {
  rafNow = 0;
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    cb(rafNow);
    return 0;
  });
  vi.stubGlobal('cancelAnimationFrame', () => {});
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('useSmoothedCents', () => {
  it('snaps instantly to the first value for a given identity', () => {
    const { result } = renderHook(() => useSmoothedCents(20, 'string-1', 120));
    expect(result.current).toBe(20);
  });

  it('returns null when cents is null', () => {
    const { result } = renderHook(() => useSmoothedCents(null, null, 120));
    expect(result.current).toBeNull();
  });

  it('converges gradually toward a new value for the same identity, not instantly', () => {
    const { result, rerender } = renderHook(({ cents }) => useSmoothedCents(cents, 'string-1', 120), {
      initialProps: { cents: 0 },
    });
    expect(result.current).toBe(0);

    rafNow = 30; // a single ~30ms hop toward a new reading
    act(() => rerender({ cents: 40 }));

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(40);
  });

  it('fully converges after several time constants have elapsed', () => {
    const { result, rerender } = renderHook(({ cents }) => useSmoothedCents(cents, 'string-1', 120), {
      initialProps: { cents: 0 },
    });

    rafNow = 1000; // >> tau - effectively fully converged in one large hop
    act(() => rerender({ cents: 40 }));

    expect(result.current).toBeCloseTo(40, 1);
  });

  it('snaps instantly when the identity key changes, instead of sliding over', () => {
    const { result, rerender } = renderHook(({ cents, key }) => useSmoothedCents(cents, key, 120), {
      initialProps: { cents: 40, key: 'string-1' },
    });
    expect(result.current).toBe(40);

    rafNow = 10;
    act(() => rerender({ cents: -15, key: 'string-2' }));

    expect(result.current).toBe(-15);
  });

  it('snaps instantly to null when the signal goes quiet', () => {
    const { result, rerender } = renderHook(({ cents }) => useSmoothedCents(cents, 'string-1', 120), {
      initialProps: { cents: 40 as number | null },
    });
    expect(result.current).toBe(40);

    act(() => rerender({ cents: null }));

    expect(result.current).toBeNull();
  });
});
