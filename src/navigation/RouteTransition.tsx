import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { spring } from '../animation';
import { classNames } from '../components/ui/classNames';
import { useSharedValue } from '../hooks';
import { resolveScreen } from './resolveScreen';
import { useNavigation } from './useNavigation';
import type { ScreenId } from './types';
import styles from './RouteTransition.module.css';

type ExitStyle = 'fadeOut' | 'slideOutRight' | 'staticUnderneath';
type EnterStyle = 'springBounce' | 'slideInRight' | 'staticUnderneath';

interface TransitionStyles {
  readonly exit: ExitStyle;
  readonly enter: EnterStyle;
  // Which of the two sides actually plays a real, self-terminating animation - the other side is
  // 'staticUnderneath' (no animation of its own), so its own animation-end event never fires; the
  // side that does fire is what tells RouteTransition it's safe to drop the exiting screen.
  readonly completionSource: 'exit' | 'enter';
}

// Not a Figma-sourced motion spec (no animation design exists anywhere in this project) - an
// explicit engineering read of two different real interactions, confirmed with the user before
// implementing:
// - Switching between the three footer-accessible screens (Simple/Advanced Tuner, Settings): the
//   outgoing screen fades out while the incoming one springs in (scale+opacity), fast enough that
//   the fade itself barely reads - the dominant sensation is meant to be the spring, not a crossfade.
// - Select Tuning (opened via the header title, closed via Save - never via the footer): not a
//   symmetric fade/spring pair at all. It's a push-navigation cover - Select Tuning slides in from
//   the right *on top of* whatever screen was showing, which never itself animates (it's just
//   revealed again once Select Tuning slides back out on close). Modeled as its own two cases
//   (opening vs closing) rather than one, since which screen is "the one with real motion" flips.
function stylesFor(previous: ScreenId, next: ScreenId): TransitionStyles {
  if (next === 'select-tuning') {
    return { exit: 'staticUnderneath', enter: 'slideInRight', completionSource: 'enter' };
  }
  if (previous === 'select-tuning') {
    return { exit: 'slideOutRight', enter: 'staticUnderneath', completionSource: 'exit' };
  }
  return { exit: 'fadeOut', enter: 'springBounce', completionSource: 'exit' };
}

interface ExitingEntry {
  readonly screen: ScreenId;
  readonly exitStyle: ExitStyle;
  readonly completionSource: 'exit' | 'enter';
}

// Tuned by simulating this project's own spring() integrator to settle in roughly 240-300ms with a
// slight (not exaggerated) bounce (damping ratio ~0.75) - not copied from Telegram-iOS's own real
// CASpringAnimation constants (stiffness 900/damping 88 in their source), since that's a different
// physical integrator with different unit conventions; those numbers don't transfer meaningfully
// into this engine's semi-implicit Euler model. Confirmed as a starting point, not a final value.
const ENTER_SPRING_CONFIG = { stiffness: 300, damping: 26, mass: 1 };

// The footer-switch entrance is spring-driven (SharedValue + spring()), not a CSS @keyframes
// animation like the other two cases - deliberately, per explicit discussion: a footer with three
// tabs makes rapid re-tapping realistic, and a CSS animation restarted mid-flight snaps back to its
// 0% state instead of continuing smoothly. spring() is exactly the primitive built for this
// (Animation System Stage 1) - this is its first real production use.
function SpringEntranceLayer({ children }: { readonly children: ReactElement }): ReactElement {
  const nodeRef = useRef<HTMLDivElement>(null);
  const value = useSharedValue(0);

  useEffect(() => {
    const unsubscribe = value.subscribe((progress) => {
      const node = nodeRef.current;
      if (!node) return;
      node.style.opacity = String(progress);
      node.style.transform = `scale(${0.94 + progress * 0.06})`;
    });
    const handle = spring(value, 1, ENTER_SPRING_CONFIG);
    return () => {
      handle.stop();
      unsubscribe();
    };
  }, [value]);

  return (
    <div ref={nodeRef} className={styles.layer} style={{ opacity: 0, transform: 'scale(0.94)' }}>
      {children}
    </div>
  );
}

// Replaces AppRouter as AppShell's routed-content child - AppRouter itself is unchanged (still a
// plain, directly-testable ScreenId -> element resolver); this is what actually keeps the outgoing
// screen mounted long enough to play its own exit animation, which a plain `switch` structurally
// cannot do (it unmounts the old subtree the instant the new one renders).
//
// Only ever tracks one exiting screen at a time, by design, not an oversight: if a new navigation
// happens before the previous exit finished (realistic on a 3-tab footer), the new transition simply
// overwrites the single `exiting` slot - the previous exiting screen is dropped immediately rather
// than queued. Chosen both because it's the more sensible real behavior (rapid navigation shouldn't
// pile up ghost screens) and because it keeps the render tree simple (never more than 2 screens
// mounted at once).
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

    const { exit, enter, completionSource } = stylesFor(previous, current);
    setExiting({ screen: previous, exitStyle: exit, completionSource });
    setEnterStyleWhileExiting(enter);
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
          className={classNames(
            styles.layer,
            exiting.exitStyle === 'fadeOut' && styles.exitFadeOut,
            exiting.exitStyle === 'slideOutRight' && styles.exitSlideOutRight,
          )}
          onAnimationEnd={exiting.exitStyle !== 'staticUnderneath' ? handleExitAnimationEnd : undefined}
        >
          {resolveScreen(exiting.screen)}
        </div>
      )}
      {enterStyle === 'springBounce' ? (
        <SpringEntranceLayer>{resolveScreen(current)}</SpringEntranceLayer>
      ) : (
        <div
          className={classNames(styles.layer, enterStyle === 'slideInRight' && styles.enterSlideInRight)}
          onAnimationEnd={enterStyle === 'slideInRight' ? handleEnterAnimationEnd : undefined}
        >
          {resolveScreen(current)}
        </div>
      )}
    </div>
  );
}
