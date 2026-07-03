export type EngineStatus = 'idle' | 'requesting-permission' | 'listening' | 'error';

export interface PitchReading {
  readonly frequency: number;
  readonly clarity: number;
  readonly timestamp: number;
}

export interface AudioEngineError {
  readonly reason: 'permission-denied' | 'no-input-device' | 'context-unsupported' | 'unknown';
  readonly message: string;
}
