import { describe, expect, it } from 'vitest';
import { centsBetween } from '../../music-theory/notes';
import { createPitchyDetector } from './pitchyDetector';

const BUFFER_LENGTH = 2048;
const SAMPLE_RATE = 44100;

function sineWave(frequency: number, sampleRate: number, length: number, amplitude = 0.8): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * i) / sampleRate);
  }
  return buffer;
}

describe('createPitchyDetector', () => {
  it('detects a clean 440 Hz sine wave with high clarity', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = sineWave(440, SAMPLE_RATE, BUFFER_LENGTH);

    const result = detector.detect(buffer, SAMPLE_RATE);

    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 440))).toBeLessThan(5);
    expect(result!.clarity).toBeGreaterThan(0.95);
  });

  it('detects the guitar low E string (82.41 Hz) accurately at the chosen window size', () => {
    // This is the case the 2048-sample window size was specifically chosen for: ~3.8 periods of E2.
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = sineWave(82.41, SAMPLE_RATE, BUFFER_LENGTH);

    const result = detector.detect(buffer, SAMPLE_RATE);

    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 82.41))).toBeLessThan(5);
    expect(result!.clarity).toBeGreaterThan(0.9);
  });

  it('is sample-rate independent', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = sineWave(329.63, 48000, BUFFER_LENGTH);

    const result = detector.detect(buffer, 48000);

    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 329.63))).toBeLessThan(5);
  });

  it('detects a high-register note accurately', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = sineWave(1046.5, SAMPLE_RATE, BUFFER_LENGTH); // C6

    const result = detector.detect(buffer, SAMPLE_RATE);

    expect(result).not.toBeNull();
    expect(Math.abs(centsBetween(result!.frequency, 1046.5))).toBeLessThan(5);
  });

  it('returns null for silence', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = new Float32Array(BUFFER_LENGTH); // all zero

    expect(detector.detect(buffer, SAMPLE_RATE)).toBeNull();
  });

  it('returns a degenerate near-DC frequency for unstructured noise, not a plausible pitch', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = new Float32Array(BUFFER_LENGTH);
    for (let i = 0; i < BUFFER_LENGTH; i++) {
      buffer[i] = Math.random() * 2 - 1;
    }

    const result = detector.detect(buffer, SAMPLE_RATE);

    // White noise reliably locks onto the longest representable lag (~sampleRate/bufferLength, ~21.5 Hz
    // here) with moderate-to-high clarity rather than reporting "no pitch" - clarity alone does not
    // reliably distinguish noise from a real tone. This is exactly why the pipeline design also gates on
    // a minimum plausible instrument frequency downstream, not clarity alone.
    if (result) {
      expect(result.frequency).toBeLessThan(30);
    }
  });

  it('throws for a buffer length that does not match the configured length', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const wrongLength = new Float32Array(BUFFER_LENGTH - 1);

    expect(() => detector.detect(wrongLength, SAMPLE_RATE)).toThrow(RangeError);
  });

  it('is deterministic: identical input yields identical output', () => {
    const detector = createPitchyDetector(BUFFER_LENGTH);
    const buffer = sineWave(196, SAMPLE_RATE, BUFFER_LENGTH);

    const first = detector.detect(buffer, SAMPLE_RATE);
    const second = detector.detect(buffer, SAMPLE_RATE);

    expect(second).toEqual(first);
  });
});
