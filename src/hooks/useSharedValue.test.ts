// @vitest-environment jsdom
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSharedValue } from './useSharedValue';

describe('useSharedValue', () => {
  it('returns a SharedValue holding the initial value', () => {
    const { result } = renderHook(() => useSharedValue(5));
    expect(result.current.get()).toBe(5);
  });

  it('keeps the same SharedValue identity across re-renders', () => {
    const { result, rerender } = renderHook(() => useSharedValue(5));
    const first = result.current;
    rerender();
    expect(result.current).toBe(first);
  });

  it('ignores a changed initial-value argument on re-render (created once, per useState semantics)', () => {
    const { result, rerender } = renderHook(({ initial }) => useSharedValue(initial), {
      initialProps: { initial: 5 },
    });
    rerender({ initial: 99 });
    expect(result.current.get()).toBe(5);
  });
});
