import { useEffect } from 'react';
import { spring } from '../animation';
import type { SharedValue, SpringConfig } from '../animation';
import { useSharedValue } from './useSharedValue';

// Drives a SharedValue toward `target` via spring(), re-driving it (without a jump - see spring()'s
// own velocity-continuity note) whenever `target` or a config field changes. Starts at rest at the
// initial `target` - if a different starting point is needed, seed it via useSharedValue + spring()
// directly instead of this convenience hook.
export function useSpring(target: number, config: SpringConfig): SharedValue<number> {
  const value = useSharedValue(target);
  const { stiffness, damping, mass, precision } = config;

  useEffect(() => {
    const handle = spring(value, target, { stiffness, damping, mass, precision });
    return () => handle.stop();
    // Depends on config's primitive fields, not its object identity, so an inline config literal at
    // the call site doesn't restart the spring on every render.
  }, [value, target, stiffness, damping, mass, precision]);

  return value;
}
