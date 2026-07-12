import { DEFAULT_A4_FREQUENCY, midiToFrequency } from '../music-theory';
import type { StringTarget } from '../music-theory';
import type { InstrumentRange } from '../audio-engine';

// A per-instrument DSP profile derived purely from the tuning targets, so the audio engine can size
// its analysis window and reject out-of-instrument noise without ever importing music-theory's
// StringTarget/tuning types itself (that boundary is deliberate - see audio-engine/signal/*). This
// lives in the hook layer, which already depends on music-theory, and hands the engine plain numbers.
export interface InstrumentProfile {
  // Passed to Candidate Validation as its narrower `instrumentRange`, on top of the global
  // minFrequency/maxFrequency floor - see candidateValidator.ts.
  readonly instrumentRange: InstrumentRange;
  // Overrides DEFAULT_AUDIO_ENGINE_CONFIG.windowDurationMs for this instrument - a longer window for
  // low-pitched instruments (see below).
  readonly windowDurationMs: number;
}

// Standard guitar's low E - the frequency DEFAULT_WINDOW_MS was originally calibrated against.
const GUITAR_LOW_E_HZ = 82.41;

// The guitar-calibrated default (config/audioConfig.ts keeps the same value). 46ms spans ~3.8 periods
// of GUITAR_LOW_E_HZ, which MPM/NSDF (pitchy's algorithm) needs to place the fundamental reliably.
const DEFAULT_WINDOW_MS = 46;

// A single fixed-duration window that works for guitar is too short for bass: MPM's autocorrelation
// needs at least ~2 (ideally 3-4) full periods of the fundamental to place its peak, and below that it
// structurally returns the 2nd harmonic instead (an octave-up misread nothing downstream can undo).
// At 46ms a bass low E (E1, 41.2Hz) gets only ~1.9 periods; a 5-string's low B (B0, ~30.9Hz) ~1.4.
// Rather than a hard guitar/bass switch, hold the SAME period coverage standard guitar gets at 46ms
// for whatever the lowest string actually is - so standard guitar stays byte-for-byte at 46ms, bass
// lands ~92-122ms, and low drop-tuned guitars get a proportional (smaller) bump too. windowMs =
// DEFAULT_WINDOW_MS * (GUITAR_LOW_E_HZ / lowestFreq), floored at the default and capped for safety.
const MAX_WINDOW_MS = 150;

// Instrument-range margins. The range's only job is rejecting genuinely out-of-instrument noise (the
// 22-31Hz rumble/hum cluster this project's calibration notes recorded), NOT genuine octave-misread
// candidates - the octave corrector still needs to SEE an octave-up (x2) or subharmonic (/2) misread
// to fold it. So the floor sits below half the lowest string and the ceiling above double the highest.
const RANGE_FLOOR_FACTOR = 0.5 * 0.85; // ~0.425 * lowest string: below the /2 subharmonic, still above rumble
const RANGE_CEIL_FACTOR = 2 * 1.15; // 2.3 * highest string: above the x2 octave-up misread, with margin

export function deriveInstrumentProfile(
  strings: readonly StringTarget[],
  a4: number = DEFAULT_A4_FREQUENCY,
): InstrumentProfile {
  if (strings.length === 0) {
    // No targets to derive from - fall back to the guitar-calibrated default and no extra range.
    return {
      instrumentRange: { minFrequency: 0, maxFrequency: Number.POSITIVE_INFINITY },
      windowDurationMs: DEFAULT_WINDOW_MS,
    };
  }

  let minMidi = strings[0].midi;
  let maxMidi = strings[0].midi;
  for (const string of strings) {
    if (string.midi < minMidi) minMidi = string.midi;
    if (string.midi > maxMidi) maxMidi = string.midi;
  }

  const lowestFrequency = midiToFrequency(minMidi, a4);
  const highestFrequency = midiToFrequency(maxMidi, a4);

  const windowDurationMs = Math.min(
    MAX_WINDOW_MS,
    Math.max(DEFAULT_WINDOW_MS, Math.round((DEFAULT_WINDOW_MS * GUITAR_LOW_E_HZ) / lowestFrequency)),
  );

  return {
    instrumentRange: {
      minFrequency: lowestFrequency * RANGE_FLOOR_FACTOR,
      maxFrequency: highestFrequency * RANGE_CEIL_FACTOR,
    },
    windowDurationMs,
  };
}
