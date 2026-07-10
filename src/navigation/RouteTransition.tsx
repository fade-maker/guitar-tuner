import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { classNames } from '../components/ui/classNames';
import { resolveScreen } from './resolveScreen';
import { useNavigation } from './useNavigation';
import type { ScreenId } from './types';
import styles from './RouteTransition.module.css';

interface ExitingEntry {
  readonly screen: ScreenId;
}

// Select Tuning (opened via the header title, closed via Save - never via the footer) is the only
// screen that ever gets a real transition here - a push-navigation cover, sliding in from the right
// on top of whatever screen was showing, which never itself animates (it's just revealed again once
// Select Tuning slides back out). Every other navigation (switching between the three
// footer-accessible screens) is a plain, instant swap - `exiting` is never even created for it. This
// used to also fade the outgoing screen out while the incoming one spring-bounced in (Animation
// System's spring() driving a SharedValue), but that was rolled back after real-device testing:
// keeping both Simple/Advanced Tuner mounted simultaneously - each owning a live microphone stream
// via useAudioEngine(), on top of their own heavy image assets - made the footer itself feel
// laggy/unresponsive, especially under rapid re-tapping. The lag wasn't specific to the spring
// mechanism; any exit/enter overlap between two audio-engine-owning screens has the same problem, so
// the fix is not doing the overlap for these screens at all, not a gentler animation.
function isRelevantToSelectTuning(previous: ScreenId, next: ScreenId): boolean {
  return previous === 'select-tuning' || next === 'select-tuning';
}

// Which screen renders without any animation of its own right now, and whether Select Tuning is
// involved (and if so, in which role) - Select Tuning is the only screen that ever animates, so its
// own layer must always render *last* (on top) in DOM order regardless of whether it's the one
// entering (opening) or exiting (closing); everything else is "the underneath screen" and always
// renders first.
interface RenderPlan {
  readonly underneathScreen: ScreenId;
  readonly selectTuningRole: 'exiting' | 'entering' | null;
}

function computeRenderPlan(current: ScreenId, exiting: ExitingEntry | null): RenderPlan {
  if (exiting?.screen === 'select-tuning') {
    return { underneathScreen: current, selectTuningRole: 'exiting' };
  }
  if (current === 'select-tuning' && exiting) {
    return { underneathScreen: exiting.screen, selectTuningRole: 'entering' };
  }
  return { underneathScreen: current, selectTuningRole: null };
}

// Replaces AppRouter as AppShell's routed-content child - AppRouter itself is unchanged (still a
// plain, directly-testable ScreenId -> element resolver); this is what actually keeps Select
// Tuning's underlying screen mounted long enough to play its own exit animation, which a plain
// `switch` structurally cannot do (it unmounts the old subtree the instant the new one renders).
//
// Settings is the one screen kept alive once visited (mounted once, then only ever shown/hidden via
// CSS, never unmounted) rather than remounted fresh on every visit - unlike Simple/Advanced Tuner,
// it owns no live resource that needs to stop when it's not visible, so there's no correctness
// reason to tear it down, only a (real) reason to preserve it: scroll position and any in-progress
// UI state survive a round trip through another screen. Simple/Advanced Tuner deliberately do NOT
// get this treatment, for the same live-microphone reason the footer transition itself was rolled
// back for - keeping either mounted while not current would mean its audio engine keeps listening.
export function RouteTransition(): ReactElement {
  const { screen: current } = useNavigation();
  const previousScreenRef = useRef<ScreenId>(current);
  const [exiting, setExiting] = useState<ExitingEntry | null>(null);
  const [hasVisitedSettings, setHasVisitedSettings] = useState(current === 'settings');

  // A one-way ratchet ("has this ever been true"), not a plain derived value, so it can't live in
  // a useEffect (that pattern is exactly what react-hooks/set-state-in-effect exists to catch - see
  // this project's own useSmoothedCents history for the same class of bug). React's own documented
  // "adjusting state when a prop changes" pattern instead: a guarded setState call directly in the
  // render body, not an effect - safe specifically because it's conditional and idempotent once
  // `hasVisitedSettings` is already true.
  if (current === 'settings' && !hasVisitedSettings) {
    setHasVisitedSettings(true);
  }

  useEffect(() => {
    const previous = previousScreenRef.current;
    if (previous === current) return;
    previousScreenRef.current = current;

    // Reduced motion: swap instantly, with no `exiting` entry at all - not merely disabling the
    // visual animation (as theme/screen-local CSS does elsewhere), because that alone would be a
    // real bug here: `exiting` is only ever cleared by an animation-end event, which never fires if
    // `animation: none` suppresses the animation, permanently stranding the outgoing screen mounted.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    if (!isRelevantToSelectTuning(previous, current)) return; // plain instant swap - no exiting entry
    setExiting({ screen: previous });
  }, [current]);

  function handleSelectTuningAnimationEnd(): void {
    setExiting(null);
  }

  const plan = computeRenderPlan(current, exiting);
  const selectTuningTransitioning = plan.selectTuningRole !== null;

  return (
    <div className={styles.stage}>
      {hasVisitedSettings && (
        <div className={classNames(styles.layer, plan.underneathScreen !== 'settings' && styles.hidden)}>
          {resolveScreen('settings')}
        </div>
      )}
      {plan.underneathScreen !== 'settings' && <div className={styles.layer}>{resolveScreen(plan.underneathScreen)}</div>}
      {/* Backdrop scrim behind the Select Tuning card - fades in/out in lockstep with the sheet via
          the shared `entering`/`exiting` animation-driven opacity below, so it never lingers after
          the sheet has finished sliding away. */}
      {selectTuningTransitioning && (
        <div
          className={classNames(
            styles.scrim,
            plan.selectTuningRole === 'exiting' ? styles.scrimOut : styles.scrimIn,
          )}
          aria-hidden="true"
        />
      )}
      {plan.selectTuningRole === 'exiting' && (
        <div className={classNames(styles.layer, styles.exitSlideDown)} onAnimationEnd={handleSelectTuningAnimationEnd}>
          {resolveScreen('select-tuning')}
        </div>
      )}
      {plan.selectTuningRole === 'entering' && (
        <div className={classNames(styles.layer, styles.enterSlideUp)} onAnimationEnd={handleSelectTuningAnimationEnd}>
          {resolveScreen('select-tuning')}
        </div>
      )}
    </div>
  );
}
