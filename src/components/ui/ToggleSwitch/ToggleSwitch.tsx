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

export function ToggleSwitch({ checked, onChange, disabled, ...rest }: ToggleSwitchProps): ReactElement {
  function handleClick(): void {
    triggerHapticFeedback('light');
    onChange(!checked);
  }

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
          that couldn't be animated with a plain CSS transition at all). */}
      <span className={classNames(styles.thumb, checked ? styles.thumbOn : styles.thumbOff)} />
      <span className={classNames(styles.indicatorSlot, checked ? styles.indicatorOn : styles.indicatorOff)}>
        {checked ? <span className={styles.onSliver} /> : <span className={styles.trackBorder} />}
      </span>
    </button>
  );
}
