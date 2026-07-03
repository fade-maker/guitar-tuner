import { PitchDetector as PitchyDetector } from 'pitchy';
import type { PitchDetector } from './PitchDetector';

export type CreatePitchyDetector = (bufferLength: number) => PitchDetector;

// pitchy's own internal clarity/volume gating (the MPM paper's `k` constant, plus its minimum-volume
// cutoff) is a separate concern from this pipeline's downstream clarity gate and silence gate — left at
// pitchy's defaults here rather than tuned, since it needs real-signal validation, not a guess.
export const createPitchyDetector: CreatePitchyDetector = (bufferLength) => {
  const detector = PitchyDetector.forFloat32Array(bufferLength);

  return {
    detect(buffer, sampleRate) {
      if (buffer.length !== bufferLength) {
        throw new RangeError(`Expected a buffer of length ${bufferLength}, received ${buffer.length}.`);
      }

      const [frequency, clarity] = detector.findPitch(buffer, sampleRate);
      if (!Number.isFinite(frequency) || frequency <= 0) {
        return null;
      }

      return { frequency, clarity };
    },
  };
};
