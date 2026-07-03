import { describe, expect, it } from 'vitest';
import { DEFAULT_A4_FREQUENCY, frequencyToMidi, midiToFrequency } from './midi';

describe('midiToFrequency', () => {
  it('returns the default A4 reference frequency for MIDI 69', () => {
    expect(midiToFrequency(69)).toBe(440);
  });

  it('honors a custom a4 reference', () => {
    expect(midiToFrequency(69, 442)).toBe(442);
  });

  it('matches known reference frequencies', () => {
    expect(midiToFrequency(60)).toBeCloseTo(261.6256, 3); // C4
    expect(midiToFrequency(40)).toBeCloseTo(82.4069, 3); // guitar low E2
    expect(midiToFrequency(28)).toBeCloseTo(41.2034, 3); // bass low E1
  });

  it('doubles frequency one octave up and halves it one octave down', () => {
    const a4 = midiToFrequency(69);
    expect(midiToFrequency(81)).toBeCloseTo(a4 * 2, 9);
    expect(midiToFrequency(57)).toBeCloseTo(a4 / 2, 9);
  });

  it('accepts negative and fractional MIDI numbers', () => {
    expect(midiToFrequency(0)).toBeGreaterThan(0);
    expect(midiToFrequency(-12)).toBeGreaterThan(0);
    expect(Number.isFinite(midiToFrequency(60.5))).toBe(true);
  });

  it('throws for a non-finite midi value', () => {
    expect(() => midiToFrequency(NaN)).toThrow(RangeError);
    expect(() => midiToFrequency(Infinity)).toThrow(RangeError);
  });

  it('throws for a non-positive or non-finite a4', () => {
    expect(() => midiToFrequency(69, 0)).toThrow(RangeError);
    expect(() => midiToFrequency(69, -440)).toThrow(RangeError);
    expect(() => midiToFrequency(69, NaN)).toThrow(RangeError);
  });
});

describe('frequencyToMidi', () => {
  it('returns 69 for the default A4 frequency', () => {
    expect(frequencyToMidi(440)).toBeCloseTo(69, 9);
  });

  it('honors a custom a4 reference', () => {
    expect(frequencyToMidi(442, 442)).toBeCloseTo(69, 9);
  });

  it('round-trips through midiToFrequency across a representative range', () => {
    for (const midi of [0, 21, 40, 60, 69, 81, 108, 127]) {
      expect(frequencyToMidi(midiToFrequency(midi))).toBeCloseTo(midi, 9);
    }
  });

  it('round-trips consistently with a non-default a4', () => {
    const a4 = 415;
    for (const midi of [40, 60, 69, 81]) {
      expect(frequencyToMidi(midiToFrequency(midi, a4), a4)).toBeCloseTo(midi, 9);
    }
  });

  it('throws for a non-positive or non-finite frequency', () => {
    expect(() => frequencyToMidi(0)).toThrow(RangeError);
    expect(() => frequencyToMidi(-100)).toThrow(RangeError);
    expect(() => frequencyToMidi(NaN)).toThrow(RangeError);
    expect(() => frequencyToMidi(Infinity)).toThrow(RangeError);
  });

  it('throws for a non-positive or non-finite a4', () => {
    expect(() => frequencyToMidi(440, 0)).toThrow(RangeError);
    expect(() => frequencyToMidi(440, NaN)).toThrow(RangeError);
  });
});

describe('DEFAULT_A4_FREQUENCY', () => {
  it('is 440', () => {
    expect(DEFAULT_A4_FREQUENCY).toBe(440);
  });
});
