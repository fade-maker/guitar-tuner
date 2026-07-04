import type { ReactElement } from 'react';
import styles from './StringNoteChip.module.css';

export interface StringNoteChipProps {
  readonly note: string;
  readonly octave: number;
}

export function StringNoteChip({ note, octave }: StringNoteChipProps): ReactElement {
  return (
    <div className={styles.chip}>
      <span className={styles.content}>
        <span className={styles.note}>{note}</span>
        <span className={styles.octave}>{octave}</span>
      </span>
    </div>
  );
}
