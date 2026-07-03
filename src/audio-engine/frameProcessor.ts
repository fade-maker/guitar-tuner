import { createPitchyDetector } from './pitchDetection/pitchyDetector';
import { validateCandidate } from './signal/candidateValidator';
import type { CandidateValidationConfig } from './signal/candidateValidator';
import { createRmsGate } from './signal/rmsGate';
import { createPitchStabilizer } from './signal/stabilizer';
import { createWindowAccumulator } from './windowAccumulator';
import type { PitchReading } from './types';

export interface FrameProcessorConfig extends CandidateValidationConfig {
  readonly sampleRate: number;
  readonly windowSize: number;
  readonly hopSize: number;
  readonly minRmsAmplitude: number;
}

export interface FrameProcessor {
  processBlock(samples: Float32Array, timestamp: number): PitchReading | null;
  reset(): void;
}

export type CreateFrameProcessor = (config: FrameProcessorConfig) => FrameProcessor;

// The composition of the whole DSP pipeline (window -> gate -> detect -> validate -> stabilize),
// separated from AudioEngine so it can be exercised with synthetic sample blocks in tests, with no
// AudioContext or worklet involved at all.
export const createFrameProcessor: CreateFrameProcessor = (config) => {
  const accumulator = createWindowAccumulator(config.windowSize, config.hopSize);
  const signalGate = createRmsGate(config.minRmsAmplitude);
  const detector = createPitchyDetector(config.windowSize);
  const stabilizer = createPitchStabilizer();

  return {
    processBlock(samples, timestamp) {
      const ready = accumulator.push(samples, timestamp);
      if (!ready) {
        return null;
      }

      // Below the RMS floor, skip Pitchy entirely rather than trusting whatever it reports on
      // near-silent input - clarity alone doesn't distinguish a real quiet signal from a
      // confidently-periodic-looking noise floor. Feeding null here reuses the same no-detection path
      // Pitchy's own [0, 0] sentinel already takes, so Stabilizer debounce and the presenter lifecycle
      // need no changes.
      const raw = signalGate.isAboveThreshold(ready.samples) ? detector.detect(ready.samples, config.sampleRate) : null;

      const validated = validateCandidate(raw, { sampleRate: config.sampleRate, timestamp: ready.timestamp }, config);
      const stabilized = stabilizer.push(validated);

      return stabilized
        ? { frequency: stabilized.frequency, clarity: stabilized.clarity, timestamp: ready.timestamp }
        : null;
    },
    reset() {
      accumulator.reset();
      stabilizer.reset();
    },
  };
};
