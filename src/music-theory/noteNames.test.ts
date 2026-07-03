import { describe, expect, it } from 'vitest';
import { midiToNoteName, noteNameToMidi } from './noteNames';
import type { PitchClassName } from './types';

describe('midiToNoteName', () => {
  it('resolves natural notes the same regardless of accidental preference', () => {
    expect(midiToNoteName(69, 'sharp')).toEqual({ note: 'A', octave: 4 });
    expect(midiToNoteName(69, 'flat')).toEqual({ note: 'A', octave: 4 });
  });

  it('defaults to sharp spelling when accidental is omitted', () => {
    expect(midiToNoteName(61)).toEqual({ note: 'C#', octave: 4 });
  });

  it('spells black-key pitch classes differently per accidental preference', () => {
    expect(midiToNoteName(61, 'sharp')).toEqual({ note: 'C#', octave: 4 });
    expect(midiToNoteName(61, 'flat')).toEqual({ note: 'Db', octave: 4 });
  });

  it('resolves middle C and the ends of the MIDI range', () => {
    expect(midiToNoteName(60)).toEqual({ note: 'C', octave: 4 });
    expect(midiToNoteName(0)).toEqual({ note: 'C', octave: -1 });
    expect(midiToNoteName(127)).toEqual({ note: 'G', octave: 9 });
  });

  it('wraps octave boundaries correctly for negative MIDI numbers', () => {
    expect(midiToNoteName(-1)).toEqual({ note: 'B', octave: -2 });
  });

  it('rounds fractional MIDI input to the nearest whole semitone', () => {
    expect(midiToNoteName(60.6)).toEqual({ note: 'C#', octave: 4 });
    expect(midiToNoteName(60.4)).toEqual({ note: 'C', octave: 4 });
  });

  it('throws for a non-finite midi value', () => {
    expect(() => midiToNoteName(NaN)).toThrow(RangeError);
    expect(() => midiToNoteName(Infinity)).toThrow(RangeError);
  });
});

describe('noteNameToMidi', () => {
  it('matches known reference notes', () => {
    expect(noteNameToMidi('A', 4)).toBe(69);
    expect(noteNameToMidi('C', 4)).toBe(60);
    expect(noteNameToMidi('C', -1)).toBe(0);
  });

  it('treats sharp and flat spellings of the same pitch class as equal', () => {
    expect(noteNameToMidi('C#', 4)).toBe(noteNameToMidi('Db', 4));
    expect(noteNameToMidi('C#', 4)).toBe(61);
  });

  it('round-trips with midiToNoteName across a representative range, for both spellings', () => {
    for (const midi of [0, 21, 40, 60, 61, 69, 81, 108, 127]) {
      const sharp = midiToNoteName(midi, 'sharp');
      const flat = midiToNoteName(midi, 'flat');
      // midiToNoteName widens its result to `string`; casting back is safe here since the value
      // always originates from the module's own PitchClassName-typed name tables.
      expect(noteNameToMidi(sharp.note as PitchClassName, sharp.octave)).toBe(midi);
      expect(noteNameToMidi(flat.note as PitchClassName, flat.octave)).toBe(midi);
    }
  });

  it('throws for a non-integer octave', () => {
    expect(() => noteNameToMidi('A', 4.5)).toThrow(RangeError);
  });
});
