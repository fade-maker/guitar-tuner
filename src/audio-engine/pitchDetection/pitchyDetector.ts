import { PitchDetector as PitchyDetector } from 'pitchy';
import type { PitchDetector } from './PitchDetector';

export type CreatePitchyDetector = (bufferLength: number) => PitchDetector;

// pitchy's own internal clarity/volume gating (the MPM paper's `k` constant, plus its minimum-volume
// cutoff) is a separate concern from this pipeline's downstream clarity gate and silence gate — left at
// pitchy's defaults here rather than tuned, since it needs real-signal validation, not a guess.
//
// This adapter is deliberately thin: it never rejects a result on its own judgment. All well-formedness,
// plausibility, and confidence checks belong exclusively to Candidate Validation, which sits downstream of
// this module. The only translation performed here is pitchy's own documented "no pitch could be
// determined" sentinel, [0, 0], into this interface's `null`.
export const createPitchyDetector: CreatePitchyDetector = (bufferLength) => {
  const detector = PitchyDetector.forFloat32Array(bufferLength);

  return {
    detect(buffer, sampleRate) {
      if (buffer.length !== bufferLength) {
        throw new RangeError(`Expected a buffer of length ${bufferLength}, received ${buffer.length}.`);
      }

      const [frequency, clarity] = detector.findPitch(buffer, sampleRate);
      if (frequency === 0 && clarity === 0) {
        return null;
      }

      return { frequency, clarity };
    },
  };
};
