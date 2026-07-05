import type { InstrumentId } from '../../preferences';

// Screen-level stopgap shared by SimpleTunerScreen and SelectTuningScreen: TuningPreset (in
// music-theory, frozen) has no instrument field of its own, so this is the one place that maps a
// preset id to the instrument it belongs to, instead of duplicating the mapping per screen.
export const TUNING_INSTRUMENT: Record<string, InstrumentId> = {
  'guitar-standard': 'guitar',
  'guitar-drop-d': 'guitar',
  'bass-standard': 'bass',
  'ukulele-standard': 'ukulele',
};
