import { useState } from 'react';
import { createSharedValue } from '../animation';
import type { SharedValue } from '../animation';

// Lazy useState initializer, not useRef - this project's lint rules forbid touching ref.current
// during render (see useAudioEngine.ts's own note on this), so this is the sanctioned way to
// construct something exactly once per mount and keep a stable identity across re-renders.
export function useSharedValue<T>(initial: T): SharedValue<T> {
  const [value] = useState<SharedValue<T>>(() => createSharedValue(initial));
  return value;
}
