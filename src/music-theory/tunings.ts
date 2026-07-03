import type { TuningPreset } from './types';

export type GetStandardTuning = () => TuningPreset;

export type GetAllTunings = () => readonly TuningPreset[];
