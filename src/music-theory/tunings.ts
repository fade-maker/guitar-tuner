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

// Power/Open/Extras (below): the guitar tuning catalog for Select Tuning's new grouped/collapsible
// layout - see tuningCategory.ts for the id -> category mapping. Transcribed directly from the
// user-supplied reference images (not invented), string order low-to-high matching every other
// preset in this file. 'Double Daddy' really does repeat D3 on strings 4 and 3 - confirmed with the
// user as intentional, not a transcription error.

const DOUBLE_DROP_D_GUITAR = preset('guitar-double-drop-d', 'Double Drop D Guitar (D A D G B D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const D_MODAL_GUITAR = preset('guitar-d-modal', 'D Modal Guitar (D A D G A D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const DOUBLE_DADDY_GUITAR = preset('guitar-double-daddy', 'Double Daddy Guitar (D A D D A D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'D', 'D', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const DROP_C_SHARP_GUITAR = preset('guitar-drop-c-sharp', 'Drop C# Guitar (C# G# C# F# A# D#)', [
  stringTarget('6', 'C#', 'C#', 2),
  stringTarget('5', 'G#', 'G#', 2),
  stringTarget('4', 'C#', 'C#', 3),
  stringTarget('3', 'F#', 'F#', 3),
  stringTarget('2', 'A#', 'A#', 3),
  stringTarget('1', 'D#', 'D#', 4),
]);

const DROP_C_GUITAR = preset('guitar-drop-c', 'Drop C Guitar (C G C F A D)', [
  stringTarget('6', 'C', 'C', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'C', 'C', 3),
  stringTarget('3', 'F', 'F', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const DROP_B_GUITAR = preset('guitar-drop-b', 'Drop B Guitar (B F# B E G# C#)', [
  stringTarget('6', 'B', 'B', 1),
  stringTarget('5', 'F#', 'F#', 2),
  stringTarget('4', 'B', 'B', 2),
  stringTarget('3', 'E', 'E', 3),
  stringTarget('2', 'G#', 'G#', 3),
  stringTarget('1', 'C#', 'C#', 4),
]);

const DROP_A_GUITAR = preset('guitar-drop-a', 'Drop A Guitar (A E A D F# B)', [
  stringTarget('6', 'A', 'A', 1),
  stringTarget('5', 'E', 'E', 2),
  stringTarget('4', 'A', 'A', 2),
  stringTarget('3', 'D', 'D', 3),
  stringTarget('2', 'F#', 'F#', 3),
  stringTarget('1', 'B', 'B', 3),
]);

const OPEN_C_GUITAR = preset('guitar-open-c', 'Open C Guitar (C G C G C E)', [
  stringTarget('6', 'C', 'C', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'C', 'C', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'C', 'C', 4),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_E_GUITAR = preset('guitar-open-e', 'Open E Guitar (E B E G# B E)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'B', 'B', 2),
  stringTarget('4', 'E', 'E', 3),
  stringTarget('3', 'G#', 'G#', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_F_GUITAR = preset('guitar-open-f', 'Open F Guitar (C F C F A F)', [
  stringTarget('6', 'C', 'C', 2),
  stringTarget('5', 'F', 'F', 2),
  stringTarget('4', 'C', 'C', 3),
  stringTarget('3', 'F', 'F', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'F', 'F', 4),
]);

const OPEN_G_GUITAR = preset('guitar-open-g', 'Open G Guitar (D G D G B D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const OPEN_A_GUITAR = preset('guitar-open-a', 'Open A Guitar (E A C# E A E)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'C#', 'C#', 3),
  stringTarget('3', 'E', 'E', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_A_2_GUITAR = preset('guitar-open-a-2', 'Open A 2 Guitar (E A E A C# E)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'E', 'E', 3),
  stringTarget('3', 'A', 'A', 3),
  stringTarget('2', 'C#', 'C#', 4),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_AM_GUITAR = preset('guitar-open-am', 'Open Am Guitar (E A E A C E)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'E', 'E', 3),
  stringTarget('3', 'A', 'A', 3),
  stringTarget('2', 'C', 'C', 4),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_EM_GUITAR = preset('guitar-open-em', 'Open Em Guitar (E B E G B E)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'B', 'B', 2),
  stringTarget('4', 'E', 'E', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'E', 'E', 4),
]);

const OPEN_D_GUITAR = preset('guitar-open-d', 'Open D Guitar (D A D F# A D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'F#', 'F#', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const OPEN_DM_GUITAR = preset('guitar-open-dm', 'Open Dm Guitar (D A D F A D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'F', 'F', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const DMAJ69_GUITAR = preset('guitar-dmaj69', 'Dmaj6/9 Guitar (D A D F# B E)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'F#', 'F#', 3),
  stringTarget('2', 'B', 'B', 3),
  stringTarget('1', 'E', 'E', 4),
]);

const HALF_STEP_DOWN_GUITAR = preset('guitar-half-step-down', 'Half Step Down Guitar (Eb Ab Db Gb Bb Eb)', [
  stringTarget('6', 'D#', 'D#', 2),
  stringTarget('5', 'G#', 'G#', 2),
  stringTarget('4', 'C#', 'C#', 3),
  stringTarget('3', 'F#', 'F#', 3),
  stringTarget('2', 'A#', 'A#', 3),
  stringTarget('1', 'D#', 'D#', 4),
]);

const WHOLE_STEP_DOWN_GUITAR = preset('guitar-whole-step-down', 'Whole Step Down Guitar (D G C F A D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'C', 'C', 3),
  stringTarget('3', 'F', 'F', 3),
  stringTarget('2', 'A', 'A', 3),
  stringTarget('1', 'D', 'D', 4),
]);

const PLUS_1_GUITAR = preset('guitar-plus-1', '+1 Guitar (F Bb Eb Ab C F)', [
  stringTarget('6', 'F', 'F', 2),
  stringTarget('5', 'A#', 'A#', 2),
  stringTarget('4', 'D#', 'D#', 3),
  stringTarget('3', 'G#', 'G#', 3),
  stringTarget('2', 'C', 'C', 4),
  stringTarget('1', 'F', 'F', 4),
]);

const PLUS_2_GUITAR = preset('guitar-plus-2', '+2 Guitar (F# B E A C# F#)', [
  stringTarget('6', 'F#', 'F#', 2),
  stringTarget('5', 'B', 'B', 2),
  stringTarget('4', 'E', 'E', 3),
  stringTarget('3', 'A', 'A', 3),
  stringTarget('2', 'C#', 'C#', 4),
  stringTarget('1', 'F#', 'F#', 4),
]);

const G_MODAL_GUITAR = preset('guitar-g-modal', 'G Modal Guitar (D G D G C D)', [
  stringTarget('6', 'D', 'D', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'C', 'C', 4),
  stringTarget('1', 'D', 'D', 4),
]);

const ALL_4TH_GUITAR = preset('guitar-all-4th', 'All 4th Guitar (E A D G C F)', [
  stringTarget('6', 'E', 'E', 2),
  stringTarget('5', 'A', 'A', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'G', 'G', 3),
  stringTarget('2', 'C', 'C', 4),
  stringTarget('1', 'F', 'F', 4),
]);

const NST_GUITAR = preset('guitar-nst', 'NST Guitar (C G D A E G)', [
  stringTarget('6', 'C', 'C', 2),
  stringTarget('5', 'G', 'G', 2),
  stringTarget('4', 'D', 'D', 3),
  stringTarget('3', 'A', 'A', 3),
  stringTarget('2', 'E', 'E', 4),
  stringTarget('1', 'G', 'G', 4),
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

const ALL_TUNINGS: readonly TuningPreset[] = [
  STANDARD_GUITAR,
  DROP_D_GUITAR,
  DOUBLE_DROP_D_GUITAR,
  D_MODAL_GUITAR,
  DOUBLE_DADDY_GUITAR,
  DROP_C_SHARP_GUITAR,
  DROP_C_GUITAR,
  DROP_B_GUITAR,
  DROP_A_GUITAR,
  OPEN_C_GUITAR,
  OPEN_E_GUITAR,
  OPEN_F_GUITAR,
  OPEN_G_GUITAR,
  OPEN_A_GUITAR,
  OPEN_A_2_GUITAR,
  OPEN_AM_GUITAR,
  OPEN_EM_GUITAR,
  OPEN_D_GUITAR,
  OPEN_DM_GUITAR,
  DMAJ69_GUITAR,
  HALF_STEP_DOWN_GUITAR,
  WHOLE_STEP_DOWN_GUITAR,
  PLUS_1_GUITAR,
  PLUS_2_GUITAR,
  G_MODAL_GUITAR,
  ALL_4TH_GUITAR,
  NST_GUITAR,
  BASS_STANDARD,
  UKULELE_STANDARD,
];

export function getStandardTuning(): TuningPreset {
  return STANDARD_GUITAR;
}

export function getAllTunings(): readonly TuningPreset[] {
  return ALL_TUNINGS;
}
