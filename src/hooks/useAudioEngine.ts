import type { AudioEngineError, EngineStatus } from '../audio-engine';

export interface UseAudioEngineResult {
  readonly status: EngineStatus;
  readonly error: AudioEngineError | null;
  start(): Promise<void>;
  stop(): void;
}

export type UseAudioEngine = () => UseAudioEngineResult;
