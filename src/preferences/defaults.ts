import { DEFAULT_A4_FREQUENCY, getStandardTuning } from '../music-theory';
import type { AppPreferences } from './types';

export const DEFAULT_PREFERENCES: AppPreferences = {
  tunerMode: 'simple',
  accidental: 'sharp',
  selectedInstrument: 'guitar',
  selectedTuning: getStandardTuning().id,
  autoMode: true,
  a4Frequency: DEFAULT_A4_FREQUENCY,
  leftHanded: false,
  haptics: true,
  animations: true,
  soundEffectsEnabled: true,
  // Static fallback for resetPreferences()/tests. loadPreferences() in storage.ts overrides this
  // with a Telegram-detected language whenever there's no persisted choice yet - see its own comment.
  language: 'en',
};
