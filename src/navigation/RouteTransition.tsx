import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { classNames } from '../components/ui/classNames';
import { resolveScreen } from './resolveScreen';
import { useNavigation } from './useNavigation';
import type { ScreenId } from './types';
import styles from './RouteTransition.module.css';

type ExitStyle = 'slideOutRight' | 'staticUnderneath';
type EnterStyle = 'slideInRight' | 'staticUnderneath';

interface TransitionStyles {
  readonly exit: ExitStyle;
  readonly enter: EnterStyle;
  // Which of the two sides actually plays a real, self-terminating animation - the other side is
  // 'staticUnderneath' (no animation of its own), so its own animation-end event never fires; the
  // side that does fire is what tells RouteTransition it's safe to drop the exiting screen.
  readonly completionSource: 'exit' | 'enter';
}

// Only Select Tuning (opened via the header title, closed via Save - never via the footer) gets a
// real transition here - a push-navigation cover, sliding in from the right on top of whatever
// screen was showing, which never itself animates (it's just revealed again once Select Tuning
// slides back out). Modeled as its own two cases (opening vs closing), since which screen carries
// the real motion flips depending on direction.
//
// Every other navigation (switching between the three footer-accessible screens) is a plain,
// instant swap - returns null, meaning RouteTransition never creates an `exiting` entry for it at
// all. This used to also fade the outgoing screen out while the incoming one spring-bounced in
// (Animation System's spring() driving a SharedValue), but that was rolled back after real-device
// testing: keeping both Simple/Advanced Tuner mounted simultaneously - each owning a live
// microphone stream via useAudioEngine(), on top of their own heavy image assets - made the footer
// itself feel laggy/unresponsive, especially under rapid re-tapping. The lag wasn't specific to the
// spring mechanism; any exit/enter overlap between two audio-engine-owning screens has the same
// problem, so the fix is not doing the overlap for these screens at all, not a gentler animation.
function stylesFor(previous: ScreenId, next: ScreenId): TransitionStyles | null {
  if (next === 'select-tuning') {
    return { exit: 'staticUnderneath', enter: 'slideInRight', completionSource: 'enter' };
  }
  if (previous === 'select-tuning') {
    return { exit: 'slideOutRight', enter: 'staticUnderneath', completionSource: 'exit' };
  }
  return null;
}

interface ExitingEntry {
  readonly screen: ScreenId;
  readonly exitStyle: ExitStyle;
  readonly completionSource: 'exit' | 'enter';
}

// Replaces AppRouter as AppShell's routed-content child - AppRouter itself is unchanged (still a
// plain, directly-testable ScreenId -> element resolver); this is what actually keeps Select
// Tuning's underlying screen mounted long enough to play its own exit animation, which a plain
// `switch` structurally cannot do (it unmounts the old subtree the instant the new one renders).
//
// Only ever tracks one exiting screen at a time, by design, not an oversight: if a new navigation
// happens before the previous exit finished, the new transition simply overwrites the single
// `exiting` slot - the previous exiting screen is dropped immediately rather than queued.
export function RouteTransition(): ReactElement {
  const { screen: current } = useNavigation();
  const previousScreenRef = useRef<ScreenId>(current);
  const [exiting, setExiting] = useState<ExitingEntry | null>(null);
  // Plain state, not a ref - this project's lint rules forbid reading ref.current during render
  // (see useAudioEngine.ts/useSmoothedCents's own history of this exact class of bug), and this
  // value directly drives what gets rendered below, so it has to be render-safe state. Updated in
  // lockstep with `exiting` inside the same effect; never needs its own reset when a transition
  // completes, since it's only ever *read* while `exiting` is non-null (see the ternary below) -
  // its value while `exiting` is null is simply unused, not meaningfully stale.
  const [enterStyleWhileExiting, setEnterStyleWhileExiting] = useState<EnterStyle>('staticUnderneath');

  useEffect(() => {
    const previous = previousScreenRef.current;
    if (previous === current) return;
    previousScreenRef.current = current;

    // Reduced motion: swap instantly, with no `exiting` entry at all - not merely disabling the
    // visual animation (as theme/screen-local CSS does elsewhere), because that alone would be a
    // real bug here: `exiting` is only ever cleared by an animation-end event, which never fires if
    // `animation: none` suppresses the animation, permanently stranding the outgoing screen mounted.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const transitionStyles = stylesFor(previous, current);
    if (!transitionStyles) return; // plain instant swap - no exiting entry

    setExiting({ screen: previous, exitStyle: transitionStyles.exit, completionSource: transitionStyles.completionSource });
    setEnterStyleWhileExiting(transitionStyles.enter);
  }, [current]);

  function handleExitAnimationEnd(): void {
    setExiting((entry) => (entry && entry.completionSource === 'exit' ? null : entry));
  }

  function handleEnterAnimationEnd(): void {
    setExiting((entry) => (entry && entry.completionSource === 'enter' ? null : entry));
  }

  // Falls back to 'staticUnderneath' (no wrapper animation at all) once nothing is exiting - both
  // on first mount (nothing has ever transitioned) and once a transition's own completion event has
  // already cleared `exiting`.
  const enterStyle = exiting ? enterStyleWhileExiting : 'staticUnderneath';

  return (
    <div className={styles.stage}>
      {exiting && (
        <div
          className={classNames(styles.layer, exiting.exitStyle === 'slideOutRight' && styles.exitSlideOutRight)}
          onAnimationEnd={exiting.exitStyle !== 'staticUnderneath' ? handleExitAnimationEnd : undefined}
        >
          {resolveScreen(exiting.screen)}
        </div>
      )}
      <div
        className={classNames(styles.layer, enterStyle === 'slideInRight' && styles.enterSlideInRight)}
        onAnimationEnd={enterStyle === 'slideInRight' ? handleEnterAnimationEnd : undefined}
      >
        {resolveScreen(current)}
      </div>
    </div>
  );
}
