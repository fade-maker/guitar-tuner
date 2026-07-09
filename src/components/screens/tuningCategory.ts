// Screen-level stopgap, same pattern as tuningInstrument.ts's TUNING_INSTRUMENT: which collapsible
// catalog (Select Tuning's new grouped layout) a tuning id belongs to. Lives here, not in
// music-theory, for the same reason TUNING_INSTRUMENT does - this is a Select Tuning presentation
// concern, not core tuning data. Ids absent from this map (guitar-standard, every bass/ukulele
// preset) render outside any catalog - guitar-standard gets its own dedicated card, the rest simply
// have no catalog data yet (bass's catalog structure is a separate, later pass per instruction).
export type TuningCategory = 'Power' | 'Open' | 'Extras';

export const CATEGORY_ORDER: readonly TuningCategory[] = ['Power', 'Open', 'Extras'];

export const TUNING_CATEGORY: Record<string, TuningCategory> = {
  'guitar-drop-d': 'Power',
  'guitar-double-drop-d': 'Power',
  'guitar-d-modal': 'Power',
  'guitar-double-daddy': 'Power',
  'guitar-drop-c-sharp': 'Power',
  'guitar-drop-c': 'Power',
  'guitar-drop-b': 'Power',
  'guitar-drop-a': 'Power',

  'guitar-open-c': 'Open',
  'guitar-open-e': 'Open',
  'guitar-open-f': 'Open',
  'guitar-open-g': 'Open',
  'guitar-open-a': 'Open',
  'guitar-open-a-2': 'Open',
  'guitar-open-am': 'Open',
  'guitar-open-em': 'Open',
  'guitar-open-d': 'Open',
  'guitar-open-dm': 'Open',
  'guitar-dmaj69': 'Open',

  'guitar-half-step-down': 'Extras',
  'guitar-whole-step-down': 'Extras',
  'guitar-plus-1': 'Extras',
  'guitar-plus-2': 'Extras',
  'guitar-g-modal': 'Extras',
  'guitar-all-4th': 'Extras',
  'guitar-nst': 'Extras',
};
