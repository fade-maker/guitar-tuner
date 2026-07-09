import type { AnimationHandle, Unsubscribe } from './types';
import type { SharedValue } from './sharedValue';
import type { EasingFunction } from './easing';
import { linear } from './easing';
import { scheduler } from './scheduler';
import { claimDriver, releaseDriver } from './activeDriver';

export interface TweenConfig {
  readonly durationMs: number;
  readonly easing?: EasingFunction;
}

// Animates `value` from whatever it currently holds to `target` over durationMs, via easing.
//
// Retargeting the same SharedValue (stop() the old handle, then call tween()/spring() again - what
// useTween/useSpring already do via effect cleanup ordering) works normally. Calling tween()/spring()
// on a value that already has an active, un-stopped driver is rejected - see activeDriver.ts for the
// full dev/prod contract.
export function tween(value: SharedValue<number>, target: number, config: TweenConfig): AnimationHandle {
  let unsubscribe: Unsubscribe | null = null;

  const handle: AnimationHandle = {
    stop(): void {
      if (unsubscribe === null) return;
      unsubscribe();
      unsubscribe = null;
      releaseDriver(value, handle);
    },
  };

  if (!claimDriver(value, handle)) {
    return handle; // rejected (dev-mode conflict) - nothing subscribed, already in a stopped state
  }

  const from = value.get();
  const easingFn = config.easing ?? linear;
  let elapsedMs = 0;

  unsubscribe = scheduler.subscribe((deltaMs) => {
    elapsedMs += deltaMs;
    const progress = config.durationMs <= 0 ? 1 : Math.min(1, elapsedMs / config.durationMs);
    value.set(from + (target - from) * easingFn(progress));
    if (progress >= 1) {
      handle.stop();
    }
  });

  return handle;
}
