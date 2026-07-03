import { describe, expect, it } from 'vitest';
import { createRmsGate } from './rmsGate';

function constantBuffer(value: number, length = 128): Float32Array {
  return new Float32Array(length).fill(value);
}

describe('createRmsGate', () => {
  it('rejects a silent (all-zero) buffer', () => {
    const gate = createRmsGate(0.001);
    expect(gate.isAboveThreshold(constantBuffer(0))).toBe(false);
  });

  it('rejects a buffer whose rms is below the threshold', () => {
    const gate = createRmsGate(0.01);
    // A constant-value buffer's rms equals its magnitude.
    expect(gate.isAboveThreshold(constantBuffer(0.005))).toBe(false);
  });

  it('accepts a buffer whose rms is above the threshold', () => {
    const gate = createRmsGate(0.01);
    expect(gate.isAboveThreshold(constantBuffer(0.05))).toBe(true);
  });

  it('is inclusive: a buffer whose rms exactly equals the threshold is accepted', () => {
    // 0.01 isn't exactly representable in a Float32Array, so the threshold is derived from the same
    // buffer via the same sum-of-squares computation, rather than compared against a separately-rounded
    // decimal literal, to make this an exact (not approximate) boundary check.
    const buffer = constantBuffer(0.01);
    let sumSquares = 0;
    for (const sample of buffer) sumSquares += sample * sample;
    const exactRms = Math.sqrt(sumSquares / buffer.length);

    const gate = createRmsGate(exactRms);
    expect(gate.isAboveThreshold(buffer)).toBe(true);
  });

  it('computes true RMS, not peak amplitude, for a non-constant signal', () => {
    // A square wave alternating +1/-1 has rms exactly 1, regardless of threshold scale.
    const buffer = new Float32Array(4);
    buffer[0] = 1;
    buffer[1] = -1;
    buffer[2] = 1;
    buffer[3] = -1;

    expect(createRmsGate(0.99).isAboveThreshold(buffer)).toBe(true);
    expect(createRmsGate(1.01).isAboveThreshold(buffer)).toBe(false);
  });
});
