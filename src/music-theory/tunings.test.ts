import { describe, expect, it } from 'vitest';
import { midiToFrequency } from './midi';
import { getAllTunings, getStandardTuning } from './tunings';

describe('getStandardTuning', () => {
  it('returns the standard guitar tuning with 6 strings in low-to-high order', () => {
    const tuning = getStandardTuning();
    const frequencies = tuning.strings.map((string) => midiToFrequency(string.midi));

    expect(tuning.strings).toHaveLength(6);
    expect(frequencies[0]).toBeCloseTo(82.4069, 3); // E2
    expect(frequencies[1]).toBeCloseTo(110.0, 3); // A2
    expect(frequencies[2]).toBeCloseTo(146.8324, 3); // D3
    expect(frequencies[3]).toBeCloseTo(195.9977, 3); // G3
    expect(frequencies[4]).toBeCloseTo(246.9417, 3); // B3
    expect(frequencies[5]).toBeCloseTo(329.6276, 3); // E4
  });

  it('returns the same reference on repeated calls', () => {
    expect(getStandardTuning()).toBe(getStandardTuning());
  });
});

describe('getAllTunings', () => {
  const all = getAllTunings();

  it('includes the standard guitar preset', () => {
    expect(all.some((preset) => preset.id === 'guitar-standard')).toBe(true);
  });

  it('includes at least one non-guitar instrument, proving presets are not guitar-only', () => {
    const bass = all.find((preset) => preset.id === 'bass-standard');
    const ukulele = all.find((preset) => preset.id === 'ukulele-standard');
    expect(bass).toBeDefined();
    expect(ukulele).toBeDefined();

    const bassFrequencies = bass!.strings.map((string) => midiToFrequency(string.midi));
    expect(bassFrequencies[0]).toBeCloseTo(41.2034, 3); // E1
    expect(bassFrequencies[3]).toBeCloseTo(97.9989, 3); // G2

    const ukuleleFrequencies = ukulele!.strings.map((string) => midiToFrequency(string.midi));
    expect(ukuleleFrequencies[0]).toBeCloseTo(391.9954, 3); // G4 (reentrant high G)
    expect(ukuleleFrequencies[3]).toBeCloseTo(440.0, 3); // A4
  });

  it('returns the same reference on repeated calls', () => {
    expect(getAllTunings()).toBe(getAllTunings());
  });
});
