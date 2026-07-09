import type { AnimationHandle, Unsubscribe } from './types';
import type { SharedValue } from './sharedValue';
import { scheduler } from './scheduler';
import { claimDriver, releaseDriver } from './activeDriver';

export interface SpringConfig {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass?: number;
  readonly precision?: number;
}

const DEFAULT_MASS = 1;
const DEFAULT_PRECISION = 0.01;
// Sub-step physics above this size so a long single frame (GC pause, background tab, busy main
// thread) can't destabilize the integrator - semi-implicit Euler is only stable for small dt.
const MAX_STEP_MS = 1000 / 60;

// Velocity, unlike position, isn't observable via SharedValue.get() - it's a hidden derivative only
// the integrator tracks. Keyed by the SharedValue itself (not by call), so a second spring() call
// retargeting the same value picks up real momentum instead of restarting from rest - this is what
// actually makes "interrupt without a jump" true.
const velocityByValue = new WeakMap<SharedValue<number>, number>();

// Drives `value` toward `target` via a damped spring (stiffness/damping/mass), starting from
// whatever `value` currently holds and whatever velocity was last recorded for it.
//
// Retargeting the same SharedValue (stop() the old handle, then call spring() again - what
// useSpring already does via effect cleanup ordering) works normally, and continues with real
// momentum rather than restarting from rest. Calling spring()/tween() on a value that already has an
// active, un-stopped driver is rejected - see activeDriver.ts for the full dev/prod contract.
export function spring(value: SharedValue<number>, target: number, config: SpringConfig): AnimationHandle {
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

  const mass = config.mass ?? DEFAULT_MASS;
  const precision = config.precision ?? DEFAULT_PRECISION;
  let velocity = velocityByValue.get(value) ?? 0;

  function step(stepMs: number): void {
    const stepSeconds = stepMs / 1000;
    const displacement = value.get() - target;
    const acceleration = (-config.stiffness * displacement - config.damping * velocity) / mass;
    velocity += acceleration * stepSeconds;
    value.set(value.get() + velocity * stepSeconds);
    velocityByValue.set(value, velocity);
  }

  unsubscribe = scheduler.subscribe((deltaMs) => {
    let remainingMs = deltaMs;
    while (remainingMs > 0) {
      const stepMs = Math.min(remainingMs, MAX_STEP_MS);
      step(stepMs);
      remainingMs -= stepMs;
    }

    const settled = Math.abs(value.get() - target) < precision && Math.abs(velocity) < precision;
    if (settled) {
      velocity = 0;
      velocityByValue.set(value, 0);
      value.set(target);
      handle.stop();
    }
  });

  return handle;
}
