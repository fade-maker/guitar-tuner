export interface SignalGate {
  isAboveThreshold(buffer: Float32Array): boolean;
}

export type CreateRmsGate = (thresholdRms: number) => SignalGate;
