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

// Production-matching 1€ Filter tuning (see SimpleTunerScreen.tsx's BADGE_SMOOTHING_* constants),
// used throughout so these tests exercise the same adaptive behavior the real screen relies on.
const MIN_CUTOFF_HZ = 1.0;
const BETA = 0.01;
const DERIVATIVE_CUTOFF_HZ = 1.0;

describe('useSmoothedCents', () => {
  it('snaps instantly to the first value for a given identity', () => {
    const { result } = renderHook(() =>
      useSmoothedCents(20, 'string-1', MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
    );
    expect(result.current).toBe(20);
  });

  it('returns null when cents is null', () => {
    const { result } = renderHook(() =>
      useSmoothedCents(null, null, MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
    );
    expect(result.current).toBeNull();
  });

  it('converges gradually toward a new value for the same identity, not instantly', () => {
    const { result, rerender } = renderHook(
      ({ cents }) => useSmoothedCents(cents, 'string-1', MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
      { initialProps: { cents: 0 } },
    );
    expect(result.current).toBe(0);

    rafNow = 30; // a single ~30ms hop toward a new reading
    act(() => rerender({ cents: 40 }));

    expect(result.current).toBeGreaterThan(0);
    expect(result.current).toBeLessThan(40);
  });

  it('keeps approaching a sustained real change over several frames, getting progressively closer', () => {
    const { result, rerender } = renderHook(
      ({ cents }) => useSmoothedCents(cents, 'string-1', MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
      { initialProps: { cents: 0 } },
    );
    expect(result.current).toBe(0);

    let previous = 0;
    for (let frame = 0; frame < 10; frame++) {
      rafNow += 16; // a sustained real change arrives at a normal ~60fps cadence
      // A real pitch reading is never bit-for-bit identical frame to frame even when it's
      // conceptually "holding at 40" - the tiny epsilon just ensures each rerender is a genuinely
      // new prop value (as it always is in production), so the effect's dependency array actually
      // changes and the blend step reschedules, instead of this synthetic loop accidentally
      // reusing the exact same 40 on every iteration.
      act(() => rerender({ cents: 40 + frame * 1e-6 }));
      const current = result.current;
      expect(current).not.toBeNull();
      expect(current as number).toBeGreaterThan(previous);
      previous = current as number;
    }

    // After ~160ms of sustained movement toward 40, the filter should have opened up (lower
    // effective smoothing) and be well on its way, without having snapped there instantly.
    expect(previous).toBeGreaterThan(30);
    expect(previous).toBeLessThan(40);
  });

  it('damps small frame-to-frame jitter far more than a real sustained change', () => {
    const { result, rerender } = renderHook(
      ({ cents }) => useSmoothedCents(cents, 'string-1', MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
      { initialProps: { cents: 0 } },
    );
    expect(result.current).toBe(0);

    // Simulates sensor noise oscillating around a stable 0 reading (e.g. a held, in-tune note) -
    // this is the "micro-jitter" a fixed-time-constant filter still let through every frame.
    for (let frame = 0; frame < 10; frame++) {
      rafNow += 16;
      const noisy = frame % 2 === 0 ? 3 : -3;
      act(() => rerender({ cents: noisy }));
      // The smoothed output should stay much closer to the stable center (0) than the raw jitter
      // amplitude (+-3) - i.e. genuinely damped, not just lightly delayed.
      expect(Math.abs(result.current as number)).toBeLessThan(1);
    }
  });

  it('snaps instantly when the identity key changes, instead of sliding over', () => {
    const { result, rerender } = renderHook(
      ({ cents, key }) => useSmoothedCents(cents, key, MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
      { initialProps: { cents: 40, key: 'string-1' } },
    );
    expect(result.current).toBe(40);

    rafNow = 10;
    act(() => rerender({ cents: -15, key: 'string-2' }));

    expect(result.current).toBe(-15);
  });

  it('snaps instantly to null when the signal goes quiet', () => {
    const { result, rerender } = renderHook(
      ({ cents }) => useSmoothedCents(cents, 'string-1', MIN_CUTOFF_HZ, BETA, DERIVATIVE_CUTOFF_HZ),
      { initialProps: { cents: 40 as number | null } },
    );
    expect(result.current).toBe(40);

    act(() => rerender({ cents: null }));

    expect(result.current).toBeNull();
  });
});
