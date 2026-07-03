import { assertFinite, assertPositive } from './validation';

export const DEFAULT_A4_FREQUENCY = 440;

// A4 = MIDI 69 is the scientific-pitch-notation convention (middle C = C4 = MIDI 60).
const A4_MIDI_NUMBER = 69;
const SEMITONES_PER_OCTAVE = 12;

export function midiToFrequency(midi: number, a4: number = DEFAULT_A4_FREQUENCY): number {
  assertFinite(midi, 'midi');
  assertPositive(a4, 'a4');
  return a4 * 2 ** ((midi - A4_MIDI_NUMBER) / SEMITONES_PER_OCTAVE);
}

export function frequencyToMidi(frequency: number, a4: number = DEFAULT_A4_FREQUENCY): number {
  assertPositive(frequency, 'frequency');
  assertPositive(a4, 'a4');
  return A4_MIDI_NUMBER + SEMITONES_PER_OCTAVE * Math.log2(frequency / a4);
}
