import { useEffect, useRef, useState } from 'react';

// Low-pass filters a noisy cents reading frame-to-frame so SimplePitchBadge's position and number
// glide instead of jittering with every reading, without adding fixed latency: on each new value it
// converges toward it at a rate set by `tauMs` (time-based, not frame-based, so it behaves the same
// regardless of the pitch pipeline's actual reading cadence), rather than snapping straight to it.
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
export function useSmoothedCents(cents: number | null, identityKey: string | null, tauMs: number): number | null {
  const [smoothed, setSmoothed] = useState<number | null>(cents);
  const [trackedIdentity, setTrackedIdentity] = useState(identityKey);
  const lastFrameTimeRef = useRef<number | null>(null);

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
    if (shouldSnap || cents === null) return;

    const frameId = requestAnimationFrame((now) => {
      const lastTime = lastFrameTimeRef.current ?? now;
      lastFrameTimeRef.current = now;
      const alpha = 1 - Math.exp(-(now - lastTime) / tauMs);
      setSmoothed((current) => (current === null ? cents : current + (cents - current) * alpha));
    });

    return () => cancelAnimationFrame(frameId);
  }, [shouldSnap, cents, tauMs]);

  return shouldSnap ? cents : smoothed;
}
