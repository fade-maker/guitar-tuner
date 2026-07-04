import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './ToggleSwitch.module.css';

export interface ToggleSwitchProps {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly disabled?: boolean;
  readonly 'aria-label'?: string;
}

export function ToggleSwitch({ checked, onChange, disabled, ...rest }: ToggleSwitchProps): ReactElement {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={classNames(styles.track, checked ? styles.on : styles.off)}
      {...rest}
    >
      {!checked && <span className={styles.thumb} />}
      <span className={styles.indicatorSlot}>
        {!checked && <span className={styles.trackBorder} />}
        {checked && <span className={styles.onSliver} />}
      </span>
      {checked && <span className={styles.thumb} />}
    </button>
  );
}
