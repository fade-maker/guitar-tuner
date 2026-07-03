import { createPitchyDetector } from './pitchDetection/pitchyDetector';
import { validateCandidate } from './signal/candidateValidator';
import type { CandidateValidationConfig } from './signal/candidateValidator';
import { createPitchStabilizer } from './signal/stabilizer';
import { createWindowAccumulator } from './windowAccumulator';
import type { PitchReading } from './types';

export interface FrameProcessorConfig extends CandidateValidationConfig {
  readonly sampleRate: number;
  readonly windowSize: number;
  readonly hopSize: number;
}

export interface FrameProcessor {
  processBlock(samples: Float32Array, timestamp: number): PitchReading | null;
  reset(): void;
}

export type CreateFrameProcessor = (config: FrameProcessorConfig) => FrameProcessor;

// The composition of the whole DSP pipeline (window -> detect -> validate -> stabilize), separated
// from AudioEngine so it can be exercised with synthetic sample blocks in tests, with no AudioContext
// or worklet involved at all.
export const createFrameProcessor: CreateFrameProcessor = (config) => {
  const accumulator = createWindowAccumulator(config.windowSize, config.hopSize);
  const detector = createPitchyDetector(config.windowSize);
  const stabilizer = createPitchStabilizer();

  return {
    processBlock(samples, timestamp) {
      const ready = accumulator.push(samples, timestamp);
      if (!ready) {
        return null;
      }

      const raw = detector.detect(ready.samples, config.sampleRate);
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
