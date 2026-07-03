export interface SignalGate {
  isAboveThreshold(buffer: Float32Array): boolean;
}

export type CreateRmsGate = (thresholdRms: number) => SignalGate;

function computeRms(buffer: Float32Array): number {
  let sumSquares = 0;
  for (let i = 0; i < buffer.length; i++) {
    sumSquares += buffer[i] * buffer[i];
  }
  return Math.sqrt(sumSquares / buffer.length);
}

// Sits upstream of pitch detection (in frameProcessor, on the raw accumulated window) rather than
// downstream in Candidate Validation, which only ever sees {frequency, clarity} and has no access to
// the raw buffer. Below the threshold, the caller skips detection entirely rather than trusting
// whatever frequency/clarity Pitchy happens to report on near-silent input - clarity alone doesn't
// distinguish a real quiet signal from a confidently-periodic-looking noise floor.
export const createRmsGate: CreateRmsGate = (thresholdRms) => ({
  isAboveThreshold(buffer) {
    return computeRms(buffer) >= thresholdRms;
  },
});
