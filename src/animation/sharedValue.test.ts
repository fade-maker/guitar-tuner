import { describe, expect, it, vi } from 'vitest';
import { createSharedValue } from './sharedValue';

describe('createSharedValue', () => {
  it('returns the initial value from get()', () => {
    const value = createSharedValue(5);
    expect(value.get()).toBe(5);
  });

  it('set() updates what get() returns', () => {
    const value = createSharedValue(5);
    value.set(10);
    expect(value.get()).toBe(10);
  });

  it('notifies subscribers with the new value on set()', () => {
    const value = createSharedValue(0);
    const listener = vi.fn();
    value.subscribe(listener);

    value.set(42);
    expect(listener).toHaveBeenCalledWith(42);
  });

  it('notifies every subscriber', () => {
    const value = createSharedValue(0);
    const a = vi.fn();
    const b = vi.fn();
    value.subscribe(a);
    value.subscribe(b);

    value.set(1);
    expect(a).toHaveBeenCalledWith(1);
    expect(b).toHaveBeenCalledWith(1);
  });

  it('stops notifying once unsubscribed', () => {
    const value = createSharedValue(0);
    const listener = vi.fn();
    const unsubscribe = value.subscribe(listener);

    unsubscribe();
    value.set(1);
    expect(listener).not.toHaveBeenCalled();
  });

  it('does not call a listener subscribed during another listener\'s notification until the next set()', () => {
    const value = createSharedValue(0);
    const calls: string[] = [];
    value.subscribe(() => {
      calls.push('first');
      value.subscribe(() => calls.push('late'));
    });

    value.set(1);
    expect(calls).toEqual(['first']);

    value.set(2);
    expect(calls).toEqual(['first', 'first', 'late']);
  });

  it('supports a listener unsubscribing itself mid-notification without breaking others', () => {
    const value = createSharedValue(0);
    const calls: string[] = [];
    const unsubscribeSelf = value.subscribe(() => {
      calls.push('self');
      unsubscribeSelf();
    });
    value.subscribe(() => calls.push('other'));

    value.set(1);
    expect(calls).toEqual(['self', 'other']);
  });

  it('works with non-number values', () => {
    const value = createSharedValue({ x: 0, y: 0 });
    value.set({ x: 1, y: 2 });
    expect(value.get()).toEqual({ x: 1, y: 2 });
  });
});
