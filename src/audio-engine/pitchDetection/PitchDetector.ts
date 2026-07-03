export interface PitchDetectionResult {
  readonly frequency: number;
  readonly clarity: number;
}

export interface PitchDetector {
  detect(buffer: Float32Array, sampleRate: number): PitchDetectionResult | null;
}
