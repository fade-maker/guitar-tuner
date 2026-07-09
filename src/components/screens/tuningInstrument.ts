import type { InstrumentId } from '../../preferences';

// Screen-level stopgap shared by SimpleTunerScreen and SelectTuningScreen: TuningPreset (in
// music-theory, frozen) has no instrument field of its own, so this is the one place that maps a
// preset id to the instrument it belongs to, instead of duplicating the mapping per screen.
export const TUNING_INSTRUMENT: Record<string, InstrumentId> = {
  'guitar-standard': 'guitar',
  'guitar-drop-d': 'guitar',
  'guitar-double-drop-d': 'guitar',
  'guitar-d-modal': 'guitar',
  'guitar-double-daddy': 'guitar',
  'guitar-drop-c-sharp': 'guitar',
  'guitar-drop-c': 'guitar',
  'guitar-drop-b': 'guitar',
  'guitar-drop-a': 'guitar',
  'guitar-open-c': 'guitar',
  'guitar-open-e': 'guitar',
  'guitar-open-f': 'guitar',
  'guitar-open-g': 'guitar',
  'guitar-open-a': 'guitar',
  'guitar-open-a-2': 'guitar',
  'guitar-open-am': 'guitar',
  'guitar-open-em': 'guitar',
  'guitar-open-d': 'guitar',
  'guitar-open-dm': 'guitar',
  'guitar-dmaj69': 'guitar',
  'guitar-half-step-down': 'guitar',
  'guitar-whole-step-down': 'guitar',
  'guitar-plus-1': 'guitar',
  'guitar-plus-2': 'guitar',
  'guitar-g-modal': 'guitar',
  'guitar-all-4th': 'guitar',
  'guitar-nst': 'guitar',
  'bass-standard': 'bass',
  'ukulele-standard': 'ukulele',
};
