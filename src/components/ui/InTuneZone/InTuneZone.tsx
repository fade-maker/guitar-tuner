import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './InTuneZone.module.css';

// Figma prop/state names transcribed as-is: "Default" shows the idle "Start playing" prompt baked
// into the ring; "Tuning started" is the plain ring with no text (the note itself is rendered by
// NoteCircle, layered on top once a pitch is detected).
export type InTuneZoneState = 'Default' | 'Tuning started';

export interface InTuneZoneProps {
  readonly state?: InTuneZoneState;
  // Optional, English-defaulting override - same convention as the other tuner-status primitives.
  readonly promptText?: string;
}

export function InTuneZone({ state = 'Tuning started', promptText = 'Start playing' }: InTuneZoneProps): ReactElement {
  const isDefault = state === 'Default';
  return (
    <div className={classNames(styles.ring, isDefault && styles.withPrompt)}>
      {isDefault && <span className={styles.promptText}>{promptText}</span>}
    </div>
  );
}
