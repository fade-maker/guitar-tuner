import { assertPositive } from './validation';
import { DEFAULT_A4_FREQUENCY, frequencyToMidi, midiToFrequency } from './midi';
import { midiToNoteName } from './noteNames';
import type { AnalyzeFrequencyOptions, NearestTargetMatch, NoteData, StringTarget } from './types';

export function centsBetween(frequencyA: number, frequencyB: number): number {
  assertPositive(frequencyA, 'frequencyA');
  assertPositive(frequencyB, 'frequencyB');
  return 1200 * Math.log2(frequencyA / frequencyB);
}

export function analyzeFrequency(frequency: number, options: AnalyzeFrequencyOptions = {}): NoteData {
  const a4 = options.a4 ?? DEFAULT_A4_FREQUENCY;
  const exactMidi = frequencyToMidi(frequency, a4);
  const midi = Math.round(exactMidi);
  const cents = (exactMidi - midi) * 100;
  const { note, octave } = midiToNoteName(midi, options.accidental);
  const expectedFrequency = midiToFrequency(midi, a4);

  return { note, octave, midi, cents, expectedFrequency };
}

export function findNearestTarget(
  frequency: number,
  targets: readonly StringTarget[],
  a4: number = DEFAULT_A4_FREQUENCY,
): NearestTargetMatch {
  if (targets.length === 0) {
    throw new RangeError('findNearestTarget requires at least one target.');
  }

  const candidates = targets.map((target) => {
    const targetFrequency = midiToFrequency(target.midi, a4);
    return { target, targetFrequency, distance: Math.abs(centsBetween(frequency, targetFrequency)) };
  });

  const nearest = candidates.reduce((closest, candidate) =>
    candidate.distance < closest.distance ? candidate : closest,
  );

  return {
    target: nearest.target,
    frequency: nearest.targetFrequency,
    cents: centsBetween(frequency, nearest.targetFrequency),
  };
}
