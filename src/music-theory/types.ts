export type Accidental = 'sharp' | 'flat';

export type PitchClassName =
  | 'C' | 'C#' | 'Db'
  | 'D' | 'D#' | 'Eb'
  | 'E'
  | 'F' | 'F#' | 'Gb'
  | 'G' | 'G#' | 'Ab'
  | 'A' | 'A#' | 'Bb'
  | 'B';

export interface NoteName {
  readonly note: string;
  readonly octave: number;
}

export interface NoteData {
  readonly note: string;
  readonly octave: number;
  readonly midi: number;
  readonly cents: number;
  readonly expectedFrequency: number;
}

export interface AnalyzeFrequencyOptions {
  readonly a4?: number;
  readonly accidental?: Accidental;
}

export interface StringTarget {
  readonly id: string;
  readonly label: string;
  readonly midi: number;
}

export interface TuningPreset {
  readonly id: string;
  readonly name: string;
  readonly strings: readonly StringTarget[];
}

export interface NearestTargetMatch {
  readonly target: StringTarget;
  readonly frequency: number;
  readonly cents: number;
}
