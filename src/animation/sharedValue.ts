import type { Unsubscribe } from './types';

export type Listener<T> = (value: T) => void;

// A mutable value container with subscribers, decoupled from React's render cycle - the foundation
// every driver (tween/spring) reads and writes. Not React-aware; src/hooks/useSharedValue.ts is the
// React-side glue.
export interface SharedValue<T> {
  get(): T;
  set(value: T): void;
  subscribe(listener: Listener<T>): Unsubscribe;
}

export function createSharedValue<T>(initial: T): SharedValue<T> {
  let current = initial;
  const listeners = new Set<Listener<T>>();

  return {
    get(): T {
      return current;
    },
    set(value: T): void {
      current = value;
      // Snapshot before iterating - same reasoning as the scheduler: a listener that
      // subscribes/unsubscribes another listener mid-notification must not affect this round.
      for (const listener of Array.from(listeners)) {
        listener(current);
      }
    },
    subscribe(listener: Listener<T>): Unsubscribe {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
  };
}
