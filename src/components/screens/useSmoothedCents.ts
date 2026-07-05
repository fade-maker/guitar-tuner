import { useEffect, useRef, useState } from 'react';
import { OneEuroFilter } from './oneEuroFilter';

// Low-pass filters a noisy cents reading frame-to-frame so SimplePitchBadge's position and number
// glide instead of jittering with every reading, without adding fixed latency: it uses a 1€ Filter
// (see oneEuroFilter.ts) rather than a fixed-time-constant filter, specifically because a fixed
// constant applies the same smoothing whether the signal is genuinely still or genuinely moving -
// any per-frame sensor noise still gets a constant, nonzero pass-through every frame regardless,
// which read as visible micro-jitter around In Tune even after tuning that constant. The 1€ filter
// estimates the signal's own speed and adapts: heavier smoothing while it's ~still, near-instant
// once it's moving for real.
// `identityKey` (the current target's id) bypasses smoothing entirely on a string change - sliding
// over from a previous string's stale position would read as a glitch, not as "weighty".
//
// Split into two mechanisms, each satisfying this project's react-hooks/purity and
// react-hooks/set-state-in-effect lint rules for a different reason (hooks themselves are always
// called unconditionally, per the Rules of Hooks - only the setState calls inside are conditional):
// - A string change, going quiet, or the very first value never needs a wall-clock delta - it's
//   just "show what's there now". That's pure and instant, so it's handled during render via
//   React's documented "adjusting state when a prop changes" pattern (setState called directly in
//   the render body when a tracked prop changed since last render) - no impure performance.now()
//   call, nothing for react-hooks/purity to flag.
// - Continuing to blend toward a new reading for the *same* string genuinely needs elapsed time,
//   which is impure - so that part runs in an effect, exactly mirroring useAudioEngine's own
//   tick-loop shape: the timestamp comes from requestAnimationFrame's own callback argument (never
//   a direct performance.now() call), and setState is only ever called from inside that callback
//   (never synchronously in the effect body itself), which is what react-hooks/set-state-in-effect
//   requires.
//
// The filter instance itself lives in a ref, but per this project's react-hooks/refs rule, a ref's
// `.current` must never be read or written during render - only in effects/event handlers. So
// resetting the filter on a snap (which conceptually belongs next to the state-adjustment above)
// instead happens in its own effect, keyed on the same `shouldSnap`/`cents` that trigger the snap.
export function useSmoothedCents(
  cents: number | null,
  identityKey: string | null,
  minCutoffHz: number,
  beta: number,
  derivativeCutoffHz: number,
): number | null {
  const [smoothed, setSmoothed] = useState<number | null>(cents);
  const [trackedIdentity, setTrackedIdentity] = useState(identityKey);
  const lastFrameTimeRef = useRef<number | null>(null);
  const filterRef = useRef(new OneEuroFilter({ minCutoffHz, beta, derivativeCutoffHz }));

  const isFreshIdentity = identityKey !== trackedIdentity;
  const shouldSnap = isFreshIdentity || (cents === null && smoothed !== null);

  if (shouldSnap) {
    setTrackedIdentity(identityKey);
    setSmoothed(cents);
  }

  // A fresh identity/value just snapped above - the next blend step should count elapsed time from
  // scratch, not from a timestamp that belonged to a different string or a gap in signal.
  useEffect(() => {
    lastFrameTimeRef.current = null;
  }, [identityKey]);

  useEffect(() => {
    if (shouldSnap) {
      filterRef.current.reset(cents);
    }
  }, [shouldSnap, cents]);

  useEffect(() => {
    if (shouldSnap || cents === null) return;

    const frameId = requestAnimationFrame((now) => {
      const lastTime = lastFrameTimeRef.current ?? now;
      lastFrameTimeRef.current = now;
      const dtSeconds = (now - lastTime) / 1000;
      setSmoothed(filterRef.current.filter(cents, dtSeconds));
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldSnap, cents]);

  return shouldSnap ? cents : smoothed;
}
