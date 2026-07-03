import { assertFinite, assertInteger } from './validation';
import type { Accidental, NoteName, PitchClassName } from './types';

const SHARP_NAMES: readonly PitchClassName[] = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const FLAT_NAMES: readonly PitchClassName[] = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Record<PitchClassName, number> forces this table to stay exhaustive if PitchClassName ever grows.
const PITCH_CLASS_INDEX: Record<PitchClassName, number> = {
  'C': 0, 'C#': 1, 'Db': 1,
  'D': 2, 'D#': 3, 'Eb': 3,
  'E': 4,
  'F': 5, 'F#': 6, 'Gb': 6,
  'G': 7, 'G#': 8, 'Ab': 8,
  'A': 9, 'A#': 10, 'Bb': 10,
  'B': 11,
};

export function midiToNoteName(midi: number, accidental: Accidental = 'sharp'): NoteName {
  assertFinite(midi, 'midi');
  const rounded = Math.round(midi);
  const pitchClassIndex = ((rounded % 12) + 12) % 12;
  const names = accidental === 'flat' ? FLAT_NAMES : SHARP_NAMES;
  return { note: names[pitchClassIndex], octave: Math.floor(rounded / 12) - 1 };
}

export function noteNameToMidi(pitchClass: PitchClassName, octave: number): number {
  assertInteger(octave, 'octave');
  return (octave + 1) * 12 + PITCH_CLASS_INDEX[pitchClass];
}
