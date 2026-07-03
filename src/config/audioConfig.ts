export interface AudioEngineConfig {
  readonly windowDurationMs: number;
  readonly hopDurationMs: number;
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly clarityThreshold: number;
}

// Duration-based, not a fixed sample count: converted to samples against the real AudioContext
// sample rate at start() time, so the analysis window covers the same span of real time (~46ms,
// chosen for low-E accuracy) regardless of whether the device runs at 44.1kHz or 48kHz.
export const DEFAULT_AUDIO_ENGINE_CONFIG: AudioEngineConfig = {
  windowDurationMs: 46,
  hopDurationMs: 12,
  minFrequency: 20,
  maxFrequency: 5000,
  clarityThreshold: 0.9,
};
