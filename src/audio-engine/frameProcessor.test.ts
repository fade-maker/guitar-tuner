import { describe, expect, it } from 'vitest';
import { createFrameProcessor } from './frameProcessor';
import type { FrameProcessorConfig } from './frameProcessor';

const SAMPLE_RATE = 44100;
const WINDOW_SIZE = 2048;
const HOP_SIZE = 512;
const BLOCK_SIZE = 128;

const config: FrameProcessorConfig = {
  sampleRate: SAMPLE_RATE,
  windowSize: WINDOW_SIZE,
  hopSize: HOP_SIZE,
  minFrequency: 20,
  maxFrequency: 5000,
  clarityThreshold: 0.9,
  minRmsAmplitude: 0.0012,
};

function sineWave(frequency: number, length: number, startSample = 0, amplitude = 0.8): Float32Array {
  const buffer = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    buffer[i] = amplitude * Math.sin((2 * Math.PI * frequency * (startSample + i)) / SAMPLE_RATE);
  }
  return buffer;
}

function pushTone(processor: ReturnType<typeof createFrameProcessor>, frequency: number, totalSamples: number, startTime: number) {
  const readings = [];
  let sampleOffset = 0;
  let t = startTime;
  while (sampleOffset < totalSamples) {
    const readingBlock = sineWave(frequency, BLOCK_SIZE, sampleOffset);
    const reading = processor.processBlock(readingBlock, t);
    if (reading) readings.push(reading);
    sampleOffset += BLOCK_SIZE;
    t += (BLOCK_SIZE / SAMPLE_RATE) * 1000;
  }
  return readings;
}

describe('createFrameProcessor', () => {
  it('produces stabilized readings close to the true frequency for a clean sustained tone', () => {
    const processor = createFrameProcessor(config);
    const readings = pushTone(processor, 220, SAMPLE_RATE * 0.3, 0); // ~0.3s of A3

    expect(readings.length).toBeGreaterThan(0);
    const last = readings[readings.length - 1];
    expect(last.frequency).toBeGreaterThan(215);
    expect(last.frequency).toBeLessThan(225);
    expect(last.clarity).toBeGreaterThan(0.8);
  });

  it('produces no readings for silence', () => {
    const processor = createFrameProcessor(config);
    let readingCount = 0;
    let t = 0;
    for (let i = 0; i < 40; i++) {
      const silence = new Float32Array(BLOCK_SIZE);
      const reading = processor.processBlock(silence, t);
      if (reading) readingCount++;
      t += (BLOCK_SIZE / SAMPLE_RATE) * 1000;
    }
    expect(readingCount).toBe(0);
  });

  it('produces no readings for a clean periodic signal below the RMS gate', () => {
    const processor = createFrameProcessor(config);
    let readingCount = 0;
    let t = 0;
    for (let i = 0; i < 40; i++) {
      // amplitude 0.0005 -> rms ~0.00035, well below config.minRmsAmplitude (0.0012). Pitchy would
      // happily report high clarity on this if the gate didn't block detection before it ran.
      const quiet = sineWave(220, BLOCK_SIZE, i * BLOCK_SIZE, 0.0005);
      const reading = processor.processBlock(quiet, t);
      if (reading) readingCount++;
      t += (BLOCK_SIZE / SAMPLE_RATE) * 1000;
    }
    expect(readingCount).toBe(0);
  });

  it('resets cleanly: after reset, warm-up is required again from scratch', () => {
    const processor = createFrameProcessor(config);
    const firstPass = pushTone(processor, 220, WINDOW_SIZE + HOP_SIZE * 2, 0);
    expect(firstPass.length).toBeGreaterThan(0);

    processor.reset();

    const immediatelyAfterReset = processor.processBlock(sineWave(220, BLOCK_SIZE, 0), 0);
    expect(immediatelyAfterReset).toBeNull();
  });

  it('does not throw across a transition from one frequency to a clearly different one', () => {
    const processor = createFrameProcessor(config);
    expect(() => {
      pushTone(processor, 220, SAMPLE_RATE * 0.2, 0);
      pushTone(processor, 440, SAMPLE_RATE * 0.2, 200);
    }).not.toThrow();
  });
});
