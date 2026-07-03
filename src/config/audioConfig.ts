export interface AudioEngineConfig {
  readonly fftSize: number;
  readonly rmsThreshold: number;
  readonly clarityThreshold: number;
  readonly minFrequency: number;
  readonly maxFrequency: number;
}
