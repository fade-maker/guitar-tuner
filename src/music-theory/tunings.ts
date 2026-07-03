import { noteNameToMidi } from './noteNames';
import type { PitchClassName, StringTarget, TuningPreset } from './types';

function stringTarget(id: string, label: string, pitchClass: PitchClassName, octave: number): StringTarget {
  return { id, label, midi: noteNameToMidi(pitchClass, octave) };
}

function preset(id: string, name: string, strings: readonly StringTarget[]): TuningPreset {
  return { id, name, strings };
}

const STANDARD_GUITAR = preset('guitar-standard', 'Standard Guitar (E A D G B E)', [
  stringTarget('6', 'Low E', 'E', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'High E', 'E', 4),
]);

const DROP_D_GUITAR = preset('guitar-drop-d', 'Drop D Guitar (D A D G B E)', [
  stringTarget('6', 'Low D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'High E', 'E', 4),
]);

const BASS_STANDARD = preset('bass-standard', 'Standard Bass (E A D G)', [
  stringTarget('4', 'Low E', 'E', 1),
  stringTarget('3', 'A', 'A', 1),
  stringTarget('2', 'D', 'D', 2),
  stringTarget('1', 'G', 'G', 2),
]);

const UKULELE_STANDARD = preset('ukulele-standard', 'Standard Ukulele (G C E A)', [
  stringTarget('4', 'G', 'G', 4),
  stringTarget('3', 'C', 'C', 4),
  stringTarget('2', 'E', 'E', 4),
  stringTarget('1', 'A', 'A', 4),
]);

const ALL_TUNINGS: readonly TuningPreset[] = [STANDARD_GUITAR, DROP_D_GUITAR, BASS_STANDARD, UKULELE_STANDARD];

export function getStandardTuning(): TuningPreset {
  return STANDARD_GUITAR;
}

export function getAllTunings(): readonly TuningPreset[] {
  return ALL_TUNINGS;
}
