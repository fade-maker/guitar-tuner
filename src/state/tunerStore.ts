import type { NoteData } from '../music-theory/types';

export interface TunerSnapshot {
  readonly note: NoteData | null;
  readonly isListening: boolean;
}

export interface TunerStoreReader {
  getSnapshot(): TunerSnapshot;
  subscribe(listener: () => void): () => void;
}

export interface TunerStoreWriter {
  publish(snapshot: TunerSnapshot): void;
}

export type TunerStore = TunerStoreReader & TunerStoreWriter;

export type CreateTunerStore = () => TunerStore;
