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
};
