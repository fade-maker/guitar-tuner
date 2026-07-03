import type { AudioEngineError, EngineStatus, PitchReading } from './types';

export interface AudioEngine {
  readonly status: EngineStatus;
  start(): Promise<void>;
  stop(): void;
  subscribe(listener: (reading: PitchReading) => void): () => void;
  onError(listener: (error: AudioEngineError) => void): () => void;
}

export type CreateAudioEngine = () => AudioEngine;
