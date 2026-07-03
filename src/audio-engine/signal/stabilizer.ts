import type { PitchCandidate } from './candidateValidator';

export interface StabilizedReading {
  readonly frequency: number;
  readonly clarity: number;
  readonly isStable: boolean;
}

export interface PitchStabilizer {
  push(candidate: PitchCandidate): StabilizedReading | null;
  reset(): void;
}

export type CreatePitchStabilizer = () => PitchStabilizer;
