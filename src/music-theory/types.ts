export interface NoteData {
  readonly note: string;
  readonly octave: number;
  readonly cents: number;
  readonly expectedFrequency: number;
}

export interface StringTarget {
  readonly note: string;
  readonly octave: number;
  readonly frequency: number;
  readonly label: string;
}

export interface TuningPreset {
  readonly id: string;
  readonly name: string;
  readonly strings: readonly StringTarget[];
}
