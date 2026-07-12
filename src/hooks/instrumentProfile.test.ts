import { describe, expect, it } from 'vitest';
import { deriveInstrumentProfile } from './instrumentProfile';
import { getAllTunings, getStandardTuning, midiToFrequency } from '../music-theory';
import type { StringTarget } from '../music-theory';

function tuning(id: string): readonly StringTarget[] {
  const preset = getAllTunings().find((t) => t.id === id);
  if (!preset) throw new Error(`no tuning ${id}`);
  return preset.strings;
}

describe('deriveInstrumentProfile - window duration', () => {
  it('leaves standard guitar at the default 46ms (byte-for-byte, not a rounding coincidence)', () => {
    const profile = deriveInstrumentProfile(getStandardTuning().strings);
    expect(profile.windowDurationMs).toBe(46);
  });

  it('lengthens the window for a standard bass low E (too short at 46ms for MPM)', () => {
    const profile = deriveInstrumentProfile(tuning('bass-standard'));
    // ~92ms - holds standard guitar's ~3.8-period coverage for the far lower E1 fundamental.
    expect(profile.windowDurationMs).toBeGreaterThan(85);
    expect(profile.windowDurationMs).toBeLessThan(100);
  });

  it('lengthens the window further for a 5-string bass low B, but caps it', () => {
    const profile = deriveInstrumentProfile(tuning('bass-low-b'));
    expect(profile.windowDurationMs).toBeGreaterThan(100);
    expect(profile.windowDurationMs).toBeLessThanOrEqual(150);
  });

  it('gives a low drop-tuned guitar a proportional bump too (frequency-driven, not instrument-labelled)', () => {
    const standard = deriveInstrumentProfile(tuning('guitar-standard')).windowDurationMs;
    const dropA = deriveInstrumentProfile(tuning('guitar-drop-a')).windowDurationMs;
    expect(dropA).toBeGreaterThan(standard);
  });
});

describe('deriveInstrumentProfile - instrument range', () => {
  it('rejects sub-instrument rumble but still admits an octave-up misread of the highest string', () => {
    const strings = getStandardTuning().strings;
    const profile = deriveInstrumentProfile(strings);
    const lowE = midiToFrequency(Math.min(...strings.map((s) => s.midi))); // ~82.4
    const highE = midiToFrequency(Math.max(...strings.map((s) => s.midi))); // ~329.6

    // 25Hz room rumble (the recorded 22-31Hz cluster) is below the floor -> rejected.
    expect(profile.instrumentRange.minFrequency).toBeGreaterThan(31);
    expect(profile.instrumentRange.minFrequency).toBeLessThan(lowE);

    // A subharmonic (/2) of the lowest string must still be visible to be folded back up.
    expect(profile.instrumentRange.minFrequency).toBeLessThan(lowE / 2);

    // An octave-up (x2) misread of the highest string must still pass so the corrector can fold it.
    expect(profile.instrumentRange.maxFrequency).toBeGreaterThan(highE * 2);
  });

  it('handles an empty target list without throwing (unbounded range, default window)', () => {
    const profile = deriveInstrumentProfile([]);
    expect(profile.windowDurationMs).toBe(46);
    expect(profile.instrumentRange.minFrequency).toBe(0);
    expect(profile.instrumentRange.maxFrequency).toBe(Number.POSITIVE_INFINITY);
  });
});
