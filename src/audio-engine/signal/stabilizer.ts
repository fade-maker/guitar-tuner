import type { PitchDetectionResult } from '../pitchDetection/PitchDetector';

export interface StabilizedReading {
  readonly frequency: number;
  readonly clarity: number;
  readonly isStable: boolean;
}

export interface PitchStabilizer {
  push(reading: PitchDetectionResult): StabilizedReading | null;
  reset(): void;
}

export type CreatePitchStabilizer = () => PitchStabilizer;
