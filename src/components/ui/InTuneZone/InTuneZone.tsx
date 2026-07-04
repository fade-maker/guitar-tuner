import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './InTuneZone.module.css';

// Figma prop/state names transcribed as-is: "Default" shows the idle "Start playing" prompt baked
// into the ring; "Tuning started" is the plain ring with no text (the note itself is rendered by
// NoteCircle, layered on top once a pitch is detected).
export type InTuneZoneState = 'Default' | 'Tuning started';

export interface InTuneZoneProps {
  readonly state?: InTuneZoneState;
}

export function InTuneZone({ state = 'Tuning started' }: InTuneZoneProps): ReactElement {
  const isDefault = state === 'Default';
  return (
    <div className={classNames(styles.ring, isDefault && styles.withPrompt)}>
      {isDefault && <span className={styles.promptText}>Start playing</span>}
    </div>
  );
}
