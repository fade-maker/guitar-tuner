import type { ReactElement } from 'react';
import styles from './StringNoteChip.module.css';

export interface StringNoteChipProps {
  readonly note: string;
  readonly octave: number;
}

// Every natural note name is exactly one character ('C'..'B'); every accidental is exactly two
// ('C#', 'Db', ...) - the second character, if present, is the accidental itself. Figma's own
// "Extras SHarp/flat" variant (240:2935) renders that accidental as its own small element, not
// as part of the same text run as the letter - confirmed by the user to apply to every accidental
// note this component ever renders, not just ones that happen to appear in the Extras catalog.
export function StringNoteChip({ note, octave }: StringNoteChipProps): ReactElement {
  const letter = note[0];
  const accidental = note.length > 1 ? note.slice(1) : null;
  return (
    <div className={styles.chip}>
      <span className={styles.content}>
        <span className={styles.note}>{letter}</span>
        {accidental !== null && <span className={styles.accidental}>{accidental}</span>}
        <span className={styles.octave}>{octave}</span>
      </span>
    </div>
  );
}
