import type { Unsubscribe } from './types';

export type FrameListener = (deltaMs: number) => void;

export interface Scheduler {
  subscribe(listener: FrameListener): Unsubscribe;
}

// A scheduler owns exactly one requestAnimationFrame chain and fans it out to every subscriber, so
// the app never ends up with several independent rAF loops doing redundant work. Deliberately
// generic - no animation-specific vocabulary anywhere in this file - so any per-frame consumer can
// use it, not only tween/spring (see useAudioEngine.ts's own tick loop for a non-animation example).
export function createScheduler(): Scheduler {
  const listeners = new Set<FrameListener>();
  let rafId: number | null = null;
  let lastTime: number | null = null;

  function tick(now: number): void {
    const deltaMs = lastTime === null ? 0 : now - lastTime;
    lastTime = now;

    // Snapshot before iterating: a listener that subscribes or unsubscribes another listener
    // mid-tick must not affect who runs during *this* frame, only future ones.
    for (const listener of Array.from(listeners)) {
      listener(deltaMs);
    }

    if (listeners.size > 0) {
      rafId = requestAnimationFrame(tick);
    } else {
      rafId = null;
      lastTime = null;
    }
  }

  return {
    subscribe(listener: FrameListener): Unsubscribe {
      listeners.add(listener);
      if (rafId === null) {
        lastTime = null;
        rafId = requestAnimationFrame(tick);
      }

      return () => {
        listeners.delete(listener);
        if (listeners.size === 0 && rafId !== null) {
          cancelAnimationFrame(rafId);
          rafId = null;
          lastTime = null;
        }
      };
    },
  };
}

// The single shared instance every driver (tween/spring) and every other per-frame consumer
// registers with. `createScheduler` itself stays exported only so tests can build isolated
// instances instead of fighting shared module state - production code should use this instance.
export const scheduler: Scheduler = createScheduler();
