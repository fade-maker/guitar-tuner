import { describe, expect, it } from 'vitest';
import type { PitchDetectionResult } from '../pitchDetection/PitchDetector';
import { validateCandidate } from './candidateValidator';
import type { CandidateValidationConfig, CandidateValidationContext } from './candidateValidator';

const SAMPLE_RATE = 44100;
const TIMESTAMP = 12345;

const config: CandidateValidationConfig = {
  minFrequency: 20,
  maxFrequency: 5000,
  clarityThreshold: 0.9,
};

const context: CandidateValidationContext = {
  sampleRate: SAMPLE_RATE,
  timestamp: TIMESTAMP,
};

function result(frequency: number, clarity: number): PitchDetectionResult {
  return { frequency, clarity };
}

describe('validateCandidate - accepted path', () => {
  it('accepts a well-formed candidate and passes values through unchanged', () => {
    const outcome = validateCandidate(result(440, 0.95), context, config);

    expect(outcome).toEqual({
      accepted: true,
      candidate: { frequency: 440, clarity: 0.95, timestamp: TIMESTAMP },
    });
  });

  it('is deterministic for identical input', () => {
    const first = validateCandidate(result(196, 0.92), context, config);
    const second = validateCandidate(result(196, 0.92), context, config);

    expect(second).toEqual(first);
  });

  it('does not apply instrument-range filtering when none is configured', () => {
    // Within the general range but well outside e.g. a typical guitar's playable range - still accepted
    // since no instrumentRange was supplied.
    const outcome = validateCandidate(result(3000, 0.95), context, config);
    expect(outcome.accepted).toBe(true);
  });
});

describe('validateCandidate - rejection reasons', () => {
  it('rejects with no-detection when the detector found nothing', () => {
    const outcome = validateCandidate(null, context, config);
    expect(outcome).toEqual({
      accepted: false,
      reason: 'no-detection',
      timestamp: TIMESTAMP,
      raw: { frequency: null, clarity: null },
    });
  });

  it('rejects NaN frequency as invalid-value', () => {
    expect(validateCandidate(result(NaN, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
  });

  it('rejects Infinite frequency as invalid-value', () => {
    expect(validateCandidate(result(Infinity, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
  });

  it('rejects zero frequency as invalid-value', () => {
    expect(validateCandidate(result(0, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
  });

  it('rejects NaN clarity as invalid-value', () => {
    expect(validateCandidate(result(440, NaN), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
  });

  it('rejects clarity outside [0, 1] as invalid-value', () => {
    expect(validateCandidate(result(440, -0.1), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
    expect(validateCandidate(result(440, 1.1), context, config)).toMatchObject({
      accepted: false,
      reason: 'invalid-value',
    });
  });

  it('rejects negative frequency as impossible-frequency', () => {
    expect(validateCandidate(result(-100, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'impossible-frequency',
    });
  });

  it('rejects a frequency at or above Nyquist as impossible-frequency', () => {
    expect(validateCandidate(result(SAMPLE_RATE / 2, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'impossible-frequency',
    });
  });

  it('rejects a frequency below the general range as out-of-range', () => {
    expect(validateCandidate(result(10, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'out-of-range',
    });
  });

  it('rejects a frequency above the general range as out-of-range', () => {
    expect(validateCandidate(result(6000, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'out-of-range',
    });
  });

  it('rejects clarity below the threshold as low-clarity', () => {
    expect(validateCandidate(result(440, 0.5), context, config)).toMatchObject({
      accepted: false,
      reason: 'low-clarity',
    });
  });

  it('rejects a frequency outside a supplied instrument range as outside-instrument-range', () => {
    const narrowConfig: CandidateValidationConfig = {
      ...config,
      instrumentRange: { minFrequency: 80, maxFrequency: 350 },
    };
    expect(validateCandidate(result(1000, 0.95), context, narrowConfig)).toMatchObject({
      accepted: false,
      reason: 'outside-instrument-range',
    });
  });
});

describe('validateCandidate - raw values on rejection', () => {
  it('preserves the examined frequency and clarity in the raw payload', () => {
    expect(validateCandidate(result(10, 0.5), context, config)).toMatchObject({
      raw: { frequency: 10, clarity: 0.5 },
    });
  });

  it('reports null raw values for no-detection', () => {
    expect(validateCandidate(null, context, config)).toMatchObject({
      raw: { frequency: null, clarity: null },
    });
  });
});

describe('validateCandidate - boundaries', () => {
  it('accepts frequency exactly at minFrequency (inclusive)', () => {
    expect(validateCandidate(result(config.minFrequency, 0.95), context, config).accepted).toBe(true);
  });

  it('rejects frequency just below minFrequency', () => {
    expect(validateCandidate(result(config.minFrequency - 0.01, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'out-of-range',
    });
  });

  it('accepts frequency exactly at maxFrequency (inclusive)', () => {
    expect(validateCandidate(result(config.maxFrequency, 0.95), context, config).accepted).toBe(true);
  });

  it('rejects frequency just above maxFrequency', () => {
    expect(validateCandidate(result(config.maxFrequency + 0.01, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'out-of-range',
    });
  });

  it('rejects frequency exactly at Nyquist (exclusive upper bound)', () => {
    expect(validateCandidate(result(SAMPLE_RATE / 2, 0.95), context, config)).toMatchObject({
      accepted: false,
      reason: 'impossible-frequency',
    });
  });

  it('accepts frequency just below Nyquist', () => {
    const wideConfig: CandidateValidationConfig = { ...config, maxFrequency: SAMPLE_RATE };
    expect(validateCandidate(result(SAMPLE_RATE / 2 - 0.01, 0.95), context, wideConfig).accepted).toBe(true);
  });

  it('accepts clarity exactly at the threshold (inclusive)', () => {
    expect(validateCandidate(result(440, config.clarityThreshold), context, config).accepted).toBe(true);
  });

  it('rejects clarity just below the threshold', () => {
    expect(validateCandidate(result(440, config.clarityThreshold - 0.001), context, config)).toMatchObject({
      accepted: false,
      reason: 'low-clarity',
    });
  });

  it('accepts frequency exactly at the instrument-range bounds (inclusive)', () => {
    const narrowConfig: CandidateValidationConfig = {
      ...config,
      instrumentRange: { minFrequency: 80, maxFrequency: 350 },
    };
    expect(validateCandidate(result(80, 0.95), context, narrowConfig).accepted).toBe(true);
    expect(validateCandidate(result(350, 0.95), context, narrowConfig).accepted).toBe(true);
  });

  it('rejects frequency just outside the instrument-range bounds', () => {
    const narrowConfig: CandidateValidationConfig = {
      ...config,
      instrumentRange: { minFrequency: 80, maxFrequency: 350 },
    };
    expect(validateCandidate(result(79.99, 0.95), context, narrowConfig)).toMatchObject({
      accepted: false,
      reason: 'outside-instrument-range',
    });
    expect(validateCandidate(result(350.01, 0.95), context, narrowConfig)).toMatchObject({
      accepted: false,
      reason: 'outside-instrument-range',
    });
  });
});

describe('validateCandidate - check ordering', () => {
  it('reports invalid-value before impossible-frequency when both would apply', () => {
    // Negative frequency (would also fail impossible-frequency) combined with NaN clarity.
    expect(validateCandidate(result(-100, NaN), context, config)).toMatchObject({ reason: 'invalid-value' });
  });

  it('reports impossible-frequency before out-of-range when both would apply', () => {
    // Negative frequency is also below minFrequency.
    expect(validateCandidate(result(-100, 0.95), context, config)).toMatchObject({
      reason: 'impossible-frequency',
    });
  });

  it('reports out-of-range before low-clarity when both would apply', () => {
    expect(validateCandidate(result(10, 0.1), context, config)).toMatchObject({ reason: 'out-of-range' });
  });

  it('reports low-clarity before outside-instrument-range when both would apply', () => {
    const narrowConfig: CandidateValidationConfig = {
      ...config,
      instrumentRange: { minFrequency: 80, maxFrequency: 350 },
    };
    // Within the general range, but fails both low-clarity and outside-instrument-range.
    expect(validateCandidate(result(1000, 0.1), context, narrowConfig)).toMatchObject({ reason: 'low-clarity' });
  });
});
