import { describe, expect, it } from 'vitest';
import { frequencyToMidi, midiToFrequency } from './midi';
import { midiToNoteName, noteNameToMidi } from './noteNames';
import { analyzeFrequency, centsBetween, findNearestTarget } from './notes';
import { getAllTunings, getStandardTuning } from './tunings';

describe('determinism', () => {
  it('midiToFrequency and frequencyToMidi return identical results for identical inputs', () => {
    expect(midiToFrequency(64, 442)).toBe(midiToFrequency(64, 442));
    expect(frequencyToMidi(329.63, 442)).toBe(frequencyToMidi(329.63, 442));
  });

  it('midiToNoteName and noteNameToMidi return identical results for identical inputs', () => {
    expect(midiToNoteName(61, 'flat')).toEqual(midiToNoteName(61, 'flat'));
    expect(noteNameToMidi('G#', 3)).toBe(noteNameToMidi('G#', 3));
  });

  it('centsBetween and analyzeFrequency return identical results for identical inputs', () => {
    expect(centsBetween(441, 440)).toBe(centsBetween(441, 440));
    expect(analyzeFrequency(196, { a4: 442 })).toEqual(analyzeFrequency(196, { a4: 442 }));
  });

  it('findNearestTarget returns identical results for identical inputs', () => {
    const strings = getStandardTuning().strings;
    expect(findNearestTarget(150, strings)).toEqual(findNearestTarget(150, strings));
  });

  it('getStandardTuning and getAllTunings are referentially stable across calls', () => {
    expect(getStandardTuning()).toBe(getStandardTuning());
    expect(getAllTunings()).toBe(getAllTunings());
  });
});
