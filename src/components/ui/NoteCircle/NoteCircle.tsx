import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './NoteCircle.module.css';

// Figma: "AdvancedPitchIndicator". Kept as NoteCircle here per the requested component name.
export type NoteCircleState = 'In tune' | 'Searching';

export interface NoteCircleProps {
  readonly note: string;
  readonly state?: NoteCircleState;
}

export function NoteCircle({ note, state = 'In tune' }: NoteCircleProps): ReactElement {
  const isSearching = state === 'Searching';
  return (
    <div className={classNames(styles.circle, isSearching ? styles.searching : styles.inTune)}>
      <span className={styles.text}>{note}</span>
    </div>
  );
}
