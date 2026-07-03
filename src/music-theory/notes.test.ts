import { describe, expect, it } from 'vitest';
import { midiToFrequency } from './midi';
import { analyzeFrequency, centsBetween, findNearestTarget } from './notes';
import { getStandardTuning } from './tunings';
import type { StringTarget } from './types';

describe('centsBetween', () => {
  it('returns 0 for identical frequencies', () => {
    expect(centsBetween(440, 440)).toBe(0);
  });

  it('returns 1200 for one octave apart', () => {
    expect(centsBetween(880, 440)).toBeCloseTo(1200, 9);
    expect(centsBetween(220, 440)).toBeCloseTo(-1200, 9);
  });

  it('returns 100 for one equal-tempered semitone apart', () => {
    const semitoneUp = 440 * 2 ** (1 / 12);
    expect(centsBetween(semitoneUp, 440)).toBeCloseTo(100, 9);
  });

  it('matches the known reference value for 441 vs 440', () => {
    expect(centsBetween(441, 440)).toBeCloseTo(3.9302, 3);
  });

  it('is antisymmetric', () => {
    expect(centsBetween(450, 440)).toBeCloseTo(-centsBetween(440, 450), 9);
  });

  it('throws for non-positive or non-finite frequencies', () => {
    expect(() => centsBetween(0, 440)).toThrow(RangeError);
    expect(() => centsBetween(440, -1)).toThrow(RangeError);
    expect(() => centsBetween(NaN, 440)).toThrow(RangeError);
  });
});

describe('analyzeFrequency', () => {
  it('identifies A4 exactly at 440 Hz', () => {
    expect(analyzeFrequency(440)).toEqual({
      note: 'A',
      octave: 4,
      midi: 69,
      cents: 0,
      expectedFrequency: 440,
    });
  });

  it('reports a small positive cents deviation above the note, without changing the identified note', () => {
    const result = analyzeFrequency(441);
    expect(result.note).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBeCloseTo(3.9302, 3);
    expect(result.expectedFrequency).toBe(440);
  });

  it('reports a small negative cents deviation below the note', () => {
    const result = analyzeFrequency(439);
    expect(result.note).toBe('A');
    expect(result.cents).toBeLessThan(0);
  });

  it('flips to the next note exactly at the semitone boundary', () => {
    const boundary = midiToFrequency(69.5); // exact midpoint between A4 and A#4
    const justBelow = analyzeFrequency(boundary - 0.01);
    const justAbove = analyzeFrequency(boundary + 0.01);
    expect(justBelow.note).toBe('A');
    expect(justBelow.cents).toBeGreaterThan(45);
    expect(justAbove.note).toBe('A#');
    expect(justAbove.cents).toBeLessThan(-45);
  });

  it('supports a custom a4 reference (e.g. baroque pitch)', () => {
    const result = analyzeFrequency(415, { a4: 415 });
    expect(result.note).toBe('A');
    expect(result.octave).toBe(4);
    expect(result.cents).toBeCloseTo(0, 6);
  });

  it('respects the accidental option for black-key pitch classes', () => {
    const frequency = midiToFrequency(61); // C#4 / Db4
    expect(analyzeFrequency(frequency, { accidental: 'sharp' }).note).toBe('C#');
    expect(analyzeFrequency(frequency, { accidental: 'flat' }).note).toBe('Db');
  });

  it('throws for a non-positive frequency', () => {
    expect(() => analyzeFrequency(0)).toThrow(RangeError);
    expect(() => analyzeFrequency(-1)).toThrow(RangeError);
  });
});

describe('findNearestTarget', () => {
  const guitar = getStandardTuning();

  it('matches a frequency exactly on a target', () => {
    const lowE = guitar.strings[0]; // Low E, E2
    const result = findNearestTarget(midiToFrequency(lowE.midi), guitar.strings);
    expect(result.target).toBe(lowE);
    expect(result.cents).toBeCloseTo(0, 9);
  });

  it('returns the closer of two targets when between them', () => {
    const lowE = guitar.strings[0]; // midi 40
    const aString = guitar.strings[1]; // midi 45
    const closerToLowE = midiToFrequency(lowE.midi + 2); // 2 semitones from E, 3 from A
    const closerToA = midiToFrequency(aString.midi - 2); // 2 semitones from A, 3 from E
    expect(findNearestTarget(closerToLowE, guitar.strings).target).toBe(lowE);
    expect(findNearestTarget(closerToA, guitar.strings).target).toBe(aString);
  });

  it("returns a frequency matching the target's expected frequency at the given a4", () => {
    const target = guitar.strings[2];
    const result = findNearestTarget(midiToFrequency(target.midi), guitar.strings);
    expect(result.frequency).toBe(midiToFrequency(target.midi));
  });

  it('throws for an empty target list', () => {
    expect(() => findNearestTarget(440, [] as readonly StringTarget[])).toThrow(RangeError);
  });

  it('shifts matching consistently under a custom a4', () => {
    const a4 = 415;
    const target = guitar.strings[3];
    const result = findNearestTarget(midiToFrequency(target.midi, a4), guitar.strings, a4);
    expect(result.target).toBe(target);
  });

  it('does not mutate the targets array it is given', () => {
    const strings = guitar.strings;
    const snapshot = [...strings];
    findNearestTarget(440, strings);
    expect(strings).toEqual(snapshot);
  });
});
