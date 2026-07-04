import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './StringControl.module.css';

export type StringControlState = 'Default' | 'In tune' | 'Tuned';

export interface StringControlProps {
  readonly label: string;
  readonly state?: StringControlState;
  readonly onClick?: () => void;
}

const STATE_CLASS: Record<StringControlState, string> = {
  Default: 'default',
  'In tune': 'inTune',
  Tuned: 'tuned',
};

export function StringControl({ label, state = 'Default', onClick }: StringControlProps): ReactElement {
  return (
    <button
      type="button"
      onClick={onClick}
      className={classNames(styles.control, styles[STATE_CLASS[state]])}
      aria-pressed={state !== 'Default'}
    >
      {label}
    </button>
  );
}
