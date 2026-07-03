export interface WorkletPitchMessage {
  readonly type: 'pitch';
  readonly frequency: number;
  readonly clarity: number;
  readonly timestamp: number;
}

export interface WorkletSilenceMessage {
  readonly type: 'silence';
}

export type WorkletMessage = WorkletPitchMessage | WorkletSilenceMessage;
