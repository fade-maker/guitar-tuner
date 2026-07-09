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

  // Power/Open/Extras (Select Tuning's grouped catalog) - spot-checks rather than exhaustive
  // coverage of all 25 new presets: confirms the +1/+2/-1/-2 "shift the whole standard tuning by a
  // fixed number of semitones" presets actually land on the expected frequencies (the strongest
  // signal the user-supplied reference data was transcribed correctly, since these four are
  // internally derivable from Standard rather than arbitrary), plus one preset with the
  // user-confirmed-intentional repeated pitch (Double Daddy) and NST (a well-known real tuning,
  // independently checkable).
  it('shifts +1/+2/-1/-2 by exactly the expected number of semitones from Standard', () => {
    const standardFrequencies = getStandardTuning().strings.map((string) => midiToFrequency(string.midi));
    const semitone = 2 ** (1 / 12);

    const plus1 = all.find((preset) => preset.id === 'guitar-plus-1')!;
    const plus1Frequencies = plus1.strings.map((string) => midiToFrequency(string.midi));
    plus1Frequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(standardFrequencies[index] * semitone, 3);
    });

    const plus2 = all.find((preset) => preset.id === 'guitar-plus-2')!;
    const plus2Frequencies = plus2.strings.map((string) => midiToFrequency(string.midi));
    plus2Frequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(standardFrequencies[index] * semitone ** 2, 3);
    });

    const halfStepDown = all.find((preset) => preset.id === 'guitar-half-step-down')!;
    const halfStepDownFrequencies = halfStepDown.strings.map((string) => midiToFrequency(string.midi));
    halfStepDownFrequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(standardFrequencies[index] / semitone, 3);
    });

    const wholeStepDown = all.find((preset) => preset.id === 'guitar-whole-step-down')!;
    const wholeStepDownFrequencies = wholeStepDown.strings.map((string) => midiToFrequency(string.midi));
    wholeStepDownFrequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(standardFrequencies[index] / semitone ** 2, 3);
    });
  });

  it('keeps Double Daddy\'s user-confirmed repeated D3 on strings 4 and 3', () => {
    const doubleDaddy = all.find((preset) => preset.id === 'guitar-double-daddy')!;
    const midiValues = doubleDaddy.strings.map((string) => string.midi);
    expect(midiValues[2]).toBe(midiValues[3]);
  });

  it('matches the known real NST (New Standard Tuning) frequencies', () => {
    const nst = all.find((preset) => preset.id === 'guitar-nst')!;
    const frequencies = nst.strings.map((string) => midiToFrequency(string.midi));
    expect(frequencies[0]).toBeCloseTo(65.4064, 3); // C2
    expect(frequencies[1]).toBeCloseTo(97.9989, 3); // G2
    expect(frequencies[2]).toBeCloseTo(146.8324, 3); // D3
    expect(frequencies[3]).toBeCloseTo(220.0, 3); // A3
    expect(frequencies[4]).toBeCloseTo(329.6276, 3); // E4
    expect(frequencies[5]).toBeCloseTo(391.9954, 3); // G4
  });

  // Bass's own tuning list (Select Tuning, 140:1289) - transcribed from a user-supplied reference
  // image. Same internal-consistency check as the guitar catalog above: Drop D/Drop C/E flat are
  // all exact semitone shifts of Standard Bass or of each other, and Low B matches the real,
  // well-known B-E-A-D low-string bass tuning, independently checkable.
  it('shifts Bass Drop D/Drop C/E flat by the expected number of semitones', () => {
    const standardBassFrequencies = all.find((preset) => preset.id === 'bass-standard')!
      .strings.map((string) => midiToFrequency(string.midi));
    const semitone = 2 ** (1 / 12);

    // Drop D: only the lowest string, down a whole step from Standard Bass.
    const dropD = all.find((preset) => preset.id === 'bass-drop-d')!;
    const dropDFrequencies = dropD.strings.map((string) => midiToFrequency(string.midi));
    expect(dropDFrequencies[0]).toBeCloseTo(standardBassFrequencies[0] / semitone ** 2, 3);
    expect(dropDFrequencies[1]).toBeCloseTo(standardBassFrequencies[1], 3);
    expect(dropDFrequencies[2]).toBeCloseTo(standardBassFrequencies[2], 3);
    expect(dropDFrequencies[3]).toBeCloseTo(standardBassFrequencies[3], 3);

    // Drop C: Drop D shifted down another whole step, on every string.
    const dropC = all.find((preset) => preset.id === 'bass-drop-c')!;
    const dropCFrequencies = dropC.strings.map((string) => midiToFrequency(string.midi));
    dropCFrequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(dropDFrequencies[index] / semitone ** 2, 3);
    });

    // E flat: every string of Standard Bass down a half step.
    const eFlat = all.find((preset) => preset.id === 'bass-e-flat')!;
    const eFlatFrequencies = eFlat.strings.map((string) => midiToFrequency(string.midi));
    eFlatFrequencies.forEach((frequency, index) => {
      expect(frequency).toBeCloseTo(standardBassFrequencies[index] / semitone, 3);
    });
  });

  it('matches the known real Low B (B-E-A-D) bass tuning frequencies', () => {
    const lowB = all.find((preset) => preset.id === 'bass-low-b')!;
    const frequencies = lowB.strings.map((string) => midiToFrequency(string.midi));
    expect(frequencies[0]).toBeCloseTo(30.8677, 3); // B0
    expect(frequencies[1]).toBeCloseTo(41.2034, 3); // E1
    expect(frequencies[2]).toBeCloseTo(55.0, 3); // A1
    expect(frequencies[3]).toBeCloseTo(73.4162, 3); // D2
  });
});
