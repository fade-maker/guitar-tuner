import { useEffect } from 'react';
import { tween } from '../animation';
import type { SharedValue, TweenConfig } from '../animation';
import { useSharedValue } from './useSharedValue';

// Drives a SharedValue toward `target` via tween(), re-driving it (from wherever it currently is)
// whenever `target` or a config field changes. Starts at rest at the initial `target`.
//
// Caveat: `config.easing` is compared by identity - an inline arrow function at the call site gets
// a new identity every render and restarts the tween each time. Pass a stable reference (a
// module-level constant, or a memoized function) for a custom easing function.
export function useTween(target: number, config: TweenConfig): SharedValue<number> {
  const value = useSharedValue(target);
  const { durationMs, easing } = config;

  useEffect(() => {
    const handle = tween(value, target, { durationMs, easing });
    return () => handle.stop();
  }, [value, target, durationMs, easing]);

  return value;
}
