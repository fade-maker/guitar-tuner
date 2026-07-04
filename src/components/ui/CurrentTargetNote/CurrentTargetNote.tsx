import type { ReactElement } from 'react';
import styles from './CurrentTargetNote.module.css';

const SUPERSCRIPT_DIGITS: Record<string, string> = {
  '0': '⁰',
  '1': '¹',
  '2': '²',
  '3': '³',
  '4': '⁴',
  '5': '⁵',
  '6': '⁶',
  '7': '⁷',
  '8': '⁸',
  '9': '⁹',
  '-': '⁻',
};

function toSuperscript(octave: number): string {
  return String(octave)
    .split('')
    .map((char) => SUPERSCRIPT_DIGITS[char] ?? char)
    .join('');
}

export interface CurrentTargetNoteProps {
  readonly note: string;
  readonly octave: number;
}

export function CurrentTargetNote({ note, octave }: CurrentTargetNoteProps): ReactElement {
  return (
    <div className={styles.chip}>
      <span className={styles.text}>
        {note}
        {toSuperscript(octave)}
      </span>
    </div>
  );
}
