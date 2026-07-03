import { describe, expect, it } from 'vitest';
import { midiToFrequency } from '../music-theory';
import type { StringTarget } from '../music-theory';
import type { PitchReading } from '../audio-engine';
import { createTunerPresenter } from './tunerPresenter';
import type { TunerPresenter, TunerPresenterConfig } from './tunerPresenter';

const TARGET_A: StringTarget = { id: 'a', label: 'Target A', midi: 69 }; // A4, 440Hz
const TARGET_B: StringTarget = { id: 'b', label: 'Target B', midi: 74 }; // D5

function shiftCents(frequency: number, cents: number): number {
  return frequency * 2 ** (cents / 1200);
}

function reading(frequency: number, timestamp: number, clarity = 0.95): PitchReading {
  return { frequency, clarity, timestamp };
}

const config: TunerPresenterConfig = {
  targets: [TARGET_A, TARGET_B],
  inTuneCents: 3,
  closeCents: 8,
  lockDurationMs: 200,
};

const FREQ_A = midiToFrequency(TARGET_A.midi);
const FREQ_B = midiToFrequency(TARGET_B.midi);
const HOP_MS = 15;

function lockIn(presenter: TunerPresenter, frequency: number, startTime: number, cfg: TunerPresenterConfig) {
  let t = startTime;
  let state = presenter.onReading(reading(frequency, t));
  while (state.state !== 'locked') {
    t += HOP_MS;
    state = presenter.onReading(reading(frequency, t));
    if (t > startTime + cfg.lockDurationMs + 200) break; // safety valve
  }
  return { state, t };
}

describe('onReading - identity and lock timing', () => {
  it('starts active (not locked) on the very first reading', () => {
    const presenter = createTunerPresenter(config);
    const state = presenter.onReading(reading(FREQ_A, 1000));

    expect(state.state).toBe('active');
    expect(state.target?.id).toBe('a');
    expect(state.cents).toBeCloseTo(0, 1);
  });

  it('transitions to locked once the same identity is sustained past lockDurationMs', () => {
    const presenter = createTunerPresenter(config);
    const { state } = lockIn(presenter, FREQ_A, 1000, config);

    expect(state.state).toBe('locked');
  });

  it('resets the lock timer when the matched target identity changes', () => {
    const presenter = createTunerPresenter(config);
    const { state: locked, t } = lockIn(presenter, FREQ_A, 1000, config);
    expect(locked.state).toBe('locked');

    const afterSwitch = presenter.onReading(reading(FREQ_B, t + HOP_MS));
    expect(afterSwitch.state).toBe('active');
    expect(afterSwitch.target?.id).toBe('b');
  });
});

describe('in-tune hysteresis', () => {
  it('enters in-tune within inTuneCents and stays in-tune until exceeding closeCents', () => {
    const presenter = createTunerPresenter(config);
    let t = 1000;

    // Outside inTuneCents (3) on the very first reading - entry threshold applies: not in tune yet.
    let state = presenter.onReading(reading(shiftCents(FREQ_A, 5), t));
    expect(state.inTune).toBe(false);

    // Within inTuneCents (3) - enters in-tune.
    t += HOP_MS;
    state = presenter.onReading(reading(shiftCents(FREQ_A, 2), t));
    expect(state.inTune).toBe(true);

    // Drifts to 6 cents - beyond inTuneCents but within closeCents (8) - stays in-tune (hysteresis).
    t += HOP_MS;
    state = presenter.onReading(reading(shiftCents(FREQ_A, 6), t));
    expect(state.inTune).toBe(true);

    // Drifts to 9 cents - beyond closeCents - exits in-tune.
    t += HOP_MS;
    state = presenter.onReading(reading(shiftCents(FREQ_A, 9), t));
    expect(state.inTune).toBe(false);
  });
});

describe('haptic trigger', () => {
  it('fires exactly once on the transition into locked while in tune', () => {
    const presenter = createTunerPresenter(config);
    const { state, t } = lockIn(presenter, FREQ_A, 1000, config);

    expect(state.state).toBe('locked');
    expect(state.inTune).toBe(true);
    expect(state.hapticTrigger).toBe(true);

    const next = presenter.onReading(reading(FREQ_A, t + HOP_MS));
    expect(next.state).toBe('locked');
    expect(next.hapticTrigger).toBe(false);
  });

  it('does not fire if locked but not in tune', () => {
    const presenter = createTunerPresenter(config);
    const { state } = lockIn(presenter, shiftCents(FREQ_A, 20), 1000, config);

    expect(state.state).toBe('locked');
    expect(state.inTune).toBe(false);
    expect(state.hapticTrigger).toBe(false);
  });

  it('respects the cooldown between separate lock episodes', () => {
    const presenter = createTunerPresenter(config);
    const first = lockIn(presenter, FREQ_A, 1000, config);
    expect(first.state.hapticTrigger).toBe(true);

    // Switch to B and lock in-tune again shortly after - within the cooldown window.
    const second = lockIn(presenter, FREQ_B, first.t + HOP_MS, config);
    expect(second.state.state).toBe('locked');
    expect(second.state.inTune).toBe(true);
    expect(second.state.hapticTrigger).toBe(false); // cooldown still active
  });
});

describe('rapid adjustment suppresses locking', () => {
  it('never reaches locked while the reading keeps oscillating beyond the rapid-adjustment threshold', () => {
    const presenter = createTunerPresenter(config);
    let t = 1000;
    let state = presenter.onReading(reading(FREQ_A, t));

    const deadline = 1000 + config.lockDurationMs + 200;
    let toggle = true;
    while (t < deadline) {
      t += HOP_MS;
      const cents = toggle ? 20 : -20;
      toggle = !toggle;
      state = presenter.onReading(reading(shiftCents(FREQ_A, cents), t));
    }

    expect(state.state).toBe('active');
    expect(state.target?.id).toBe('a'); // never reassigned to a different target
  });
});

describe('locked-exit hold', () => {
  it('holds the last locked display through a single brief off-tune reading, then resumes on recovery', () => {
    const presenter = createTunerPresenter(config);
    const { state: locked, t: lockedAt } = lockIn(presenter, FREQ_A, 1000, config);
    expect(locked.state).toBe('locked');
    expect(locked.inTune).toBe(true);

    // 10 cents: beyond closeCents (8, flips inTune false) but below the rapid-adjustment threshold
    // (15, so rawState itself would still compute as 'locked') - isolates the inTune-only downgrade
    // path from the separate isRapidlyChanging() mechanism.
    const noisy = presenter.onReading(reading(shiftCents(FREQ_A, 10), lockedAt + HOP_MS));
    expect(noisy).toEqual(locked); // held: identical to the last confirmed locked state, not recomputed

    const recovered = presenter.onReading(reading(FREQ_A, lockedAt + HOP_MS * 2));
    expect(recovered.state).toBe('locked');
    expect(recovered.inTune).toBe(true);
  });

  it('surfaces a sustained off-tune reading once it persists past the hold window', () => {
    const presenter = createTunerPresenter(config);
    const { state: locked, t: lockedAt } = lockIn(presenter, FREQ_A, 1000, config);
    expect(locked.inTune).toBe(true);

    let t = lockedAt;
    let state = locked;
    // Keep feeding the same 10-cent-off reading well past the ~120ms hold window.
    while (t < lockedAt + 200) {
      t += HOP_MS;
      state = presenter.onReading(reading(shiftCents(FREQ_A, 10), t));
    }

    expect(state.inTune).toBe(false);
    expect(state.state).toBe('locked'); // still locked - genuinely off-tune, not a lost signal
  });

  it('applies a target switch immediately, even though the previous target was locked', () => {
    const presenter = createTunerPresenter(config);
    const { state: locked, t: lockedAt } = lockIn(presenter, FREQ_A, 1000, config);
    expect(locked.state).toBe('locked');

    const switched = presenter.onReading(reading(FREQ_B, lockedAt + HOP_MS));
    expect(switched.state).toBe('active');
    expect(switched.target?.id).toBe('b');
  });

  it('enters locked immediately on the reading that crosses lockDurationMs - no hold delay for upgrades', () => {
    const presenter = createTunerPresenter(config);
    const first = presenter.onReading(reading(FREQ_A, 1000));
    expect(first.state).toBe('active');

    const state = presenter.onReading(reading(FREQ_A, 1000 + config.lockDurationMs));
    expect(state.state).toBe('locked'); // applied on this exact reading, not delayed
  });
});

describe('tick - searching and lost', () => {
  it('returns searching before any reading has ever arrived', () => {
    const presenter = createTunerPresenter(config);
    const state = presenter.tick(1000);
    expect(state.state).toBe('searching');
    expect(state.target).toBeNull();
  });

  it('leaves the state unchanged for a tick within the active gap tolerance', () => {
    const presenter = createTunerPresenter(config);
    const onReadingState = presenter.onReading(reading(FREQ_A, 1000));
    const tickState = presenter.tick(1050);

    expect(tickState).toEqual(onReadingState);
  });

  it('transitions to lost, holding the last target/cents, beyond the active gap tolerance', () => {
    const presenter = createTunerPresenter(config);
    presenter.onReading(reading(FREQ_A, 1000));
    const state = presenter.tick(1000 + 150);

    expect(state.state).toBe('lost');
    expect(state.target?.id).toBe('a');
    expect(state.cents).not.toBeNull();
  });

  it('clears to searching once the lost grace period fully elapses', () => {
    const presenter = createTunerPresenter(config);
    presenter.onReading(reading(FREQ_A, 1000));
    const state = presenter.tick(1000 + 500);

    expect(state.state).toBe('searching');
    expect(state.target).toBeNull();
    expect(state.cents).toBeNull();
  });

  it('starts a fresh identity/lock timer after a full loss, not resuming the old one', () => {
    const presenter = createTunerPresenter(config);
    const { t: lockedAt } = lockIn(presenter, FREQ_A, 1000, config);
    presenter.tick(lockedAt + 500); // fully clears

    const state = presenter.onReading(reading(FREQ_A, lockedAt + 600));
    expect(state.state).toBe('active'); // not immediately locked again
  });
});

describe('setTargets', () => {
  it('takes effect on the next reading, not retroactively', () => {
    const presenter = createTunerPresenter(config);
    const before = presenter.onReading(reading(FREQ_A, 1000));
    presenter.setTargets([TARGET_B]);

    const after = presenter.onReading(reading(FREQ_A, 1015));
    expect(before.target?.id).toBe('a');
    expect(after.target?.id).toBe('b'); // only target left, regardless of how far FREQ_A is from it
  });
});

describe('reset', () => {
  it('returns to a state indistinguishable from a fresh instance', () => {
    const seasoned = createTunerPresenter(config);
    lockIn(seasoned, FREQ_A, 1000, config);
    seasoned.reset();

    const fresh = createTunerPresenter(config);

    const sequence = [reading(FREQ_B, 5000), reading(shiftCents(FREQ_B, 2), 5015)];
    const seasonedOutputs = sequence.map((r) => seasoned.onReading(r));
    const freshOutputs = sequence.map((r) => fresh.onReading(r));

    expect(seasonedOutputs).toEqual(freshOutputs);
  });
});

describe('invariants', () => {
  it('never throws across a varied sequence of readings and ticks', () => {
    const presenter = createTunerPresenter(config);
    expect(() => {
      presenter.onReading(reading(FREQ_A, 1000));
      presenter.tick(1010);
      presenter.onReading(reading(shiftCents(FREQ_A, 3), 1020));
      presenter.tick(1300);
      presenter.tick(1600);
      presenter.onReading(reading(FREQ_B, 1650));
    }).not.toThrow();
  });
});
