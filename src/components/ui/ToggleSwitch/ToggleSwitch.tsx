import { useEffect, useRef, useState } from 'react';
import type { ReactElement } from 'react';
import { triggerHapticFeedback } from '../../../telegram/haptics';
import { classNames } from '../classNames';
import styles from './ToggleSwitch.module.css';

export interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly 'aria-label'?: string;
}

type AnimateDirection = 'on' | 'off' | null;

export function ToggleSwitch({ checked, onChange, disabled, ...rest }: ToggleSwitchProps): ReactElement {
  // Plays the pickup/travel/settle "liquid glass" animation only on a real checked transition, never
  // on mount - previousChecked seeds to the initial checked value, so the first effect run (which
  // always fires once after mount) sees no change and skips animating in from a state that never
  // visually existed. Every subsequent real change (a click on this instance, or the checked prop
  // changing from elsewhere) does animate, since that's a genuine state transition either way.
  const previousChecked = useRef(checked);
  const [animateDirection, setAnimateDirection] = useState<AnimateDirection>(null);

  useEffect(() => {
    if (previousChecked.current !== checked) {
      setAnimateDirection(checked ? 'on' : 'off');
      previousChecked.current = checked;
    }
  }, [checked]);

  function handleClick(): void {
    triggerHapticFeedback('light');
    onChange(!checked);
  }

  const animateClass =
    animateDirection === 'on' ? styles.thumbAnimateOn : animateDirection === 'off' ? styles.thumbAnimateOff : null;

  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={handleClick}
      className={classNames(styles.track, checked ? styles.on : styles.off)}
      {...rest}
    >
      {/* One persistent thumb/indicator each, position-animated between two fixed slots - not
          conditionally rendered in different flex slots like before (see CLAUDE.md's note on why
          that couldn't be animated with a plain CSS transition at all). animateClass plays the
          pickup (scale + glass) / travel / settle (shrink + glass fade) sequence; the base
          thumbOn/thumbOff classes alone still define the plain resting position. */}
      <span className={classNames(styles.thumb, checked ? styles.thumbOn : styles.thumbOff, animateClass)} />
      <span className={classNames(styles.indicatorSlot, checked ? styles.indicatorOn : styles.indicatorOff)}>
        {checked ? <span className={styles.onSliver} /> : <span className={styles.trackBorder} />}
      </span>
    </button>
  );
}
