import type { Language } from '../i18n/types';
import type { Accidental } from '../music-theory';

export type TunerMode = 'simple' | 'advanced';

// Grouping used by the Select Tuning screen's instrument segmented control. Kept local to
// preferences rather than added onto TuningPreset in music-theory - that data-model question
// (should a preset carry its own instrument field?) belongs to the Select Tuning implementation
// pass, not to this settings layer.
export type InstrumentId = 'guitar' | 'bass' | 'ukulele';

export interface AppPreferences {
  readonly tunerMode: TunerMode;
  readonly accidental: Accidental;
  readonly selectedInstrument: InstrumentId;
  readonly selectedTuning: string; // a TuningPreset['id'], e.g. 'guitar-standard'
  readonly autoMode: boolean;
  readonly a4Frequency: number;
  readonly leftHanded: boolean;
  readonly haptics: boolean;
  readonly animations: boolean;
  readonly soundEffectsEnabled: boolean;
  readonly language: Language;
}
