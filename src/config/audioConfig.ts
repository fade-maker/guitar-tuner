export interface AudioEngineConfig {
  readonly windowDurationMs: number;
  readonly hopDurationMs: number;
  readonly minFrequency: number;
  readonly maxFrequency: number;
  readonly clarityThreshold: number;
  readonly minRmsAmplitude: number;
}

// Duration-based, not a fixed sample count: converted to samples against the real AudioContext
// sample rate at start() time, so the analysis window covers the same span of real time (~46ms,
// chosen for low-E accuracy) regardless of whether the device runs at 44.1kHz or 48kHz.
//
// minRmsAmplitude is derived from real captured guitar audio, not guessed: logging raw rms alongside
// Pitchy's frequency/clarity during real playing showed clarity alone cannot distinguish a genuine quiet
// signal from confidently-periodic noise-floor/subharmonic artifacts. A sustained, correctly-tracked B3
// note (~247Hz, clarity >= 0.9) held a stable, correct reading down to roughly rms 0.0010-0.0013; below
// that, readings started drifting to octave-subharmonics (~123Hz, ~62Hz) despite still-high clarity, and
// a separate, apparently unrelated low-frequency noise cluster (~22-31/61-67/123-131Hz) was present
// almost continuously whenever rms was low, independent of what was actually played. 0.0012 sits at the
// upper (more conservative) edge of that measured transition band, cutting off blocks before the
// contamination that was already visible at 0.0010-0.0013 in the calibration data. Revisit with fresh
// measurements if real-hardware testing after this change still shows spurious near-silence tracking.
export const DEFAULT_AUDIO_ENGINE_CONFIG: AudioEngineConfig = {
  windowDurationMs: 46,
  hopDurationMs: 12,
  minFrequency: 20,
  maxFrequency: 5000,
  clarityThreshold: 0.9,
  minRmsAmplitude: 0.0012,
};
