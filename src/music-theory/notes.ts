import type { NoteData, StringTarget } from './types';

export type FrequencyToNote = (frequency: number, targets: readonly StringTarget[]) => NoteData;

export type CentsBetween = (frequency: number, referenceFrequency: number) => number;
