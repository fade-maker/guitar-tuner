import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './StringControl.module.css';

// 'Selected' (Figma: "Stelected", 66:3581) is manual mode's currently-picked string before any
// reading has confirmed it - see SimpleTunerScreen's stringState() for the precedence rule against
// 'In tune'/'Tuned'. 'Pressed' is deliberately not a member of this type - it's a momentary
// touch-down effect, not application state (see StringControl.module.css's :active rule).
export type StringControlState = 'Default' | 'In tune' | 'Tuned' | 'Selected';

export interface StringControlProps {
  readonly label: string;
  readonly state?: StringControlState;
  readonly onClick?: () => void;
}

const STATE_CLASS: Record<StringControlState, string> = {
  Default: 'default',
  'In tune': 'inTune',
  Tuned: 'tuned',
  Selected: 'selected',
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
