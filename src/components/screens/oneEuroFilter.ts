// 1€ Filter (Casiez, Roussel & Vogel, 2012) - a speed-adaptive low-pass filter for noisy,
// per-frame interactive signals. Chosen over a fixed-time-constant EMA (this hook's previous
// implementation) because a fixed tau applies the *same* smoothing whether the signal is genuinely
// holding still or genuinely moving fast: any per-frame sensor jitter still gets a constant,
// nonzero pass-through every frame, which is exactly the visible micro-jitter this replaces. The
// 1€ filter instead estimates the signal's own rate of change and lowers the cutoff frequency
// (heavier smoothing) when it's slow/still, and raises it (lighter smoothing, near-instant) when
// it's moving quickly - stable at rest, responsive during a real change, without a fixed added
// delay either way. Public-domain algorithm, hand-implemented here (no new dependency).
export interface OneEuroFilterOptions {
  // Cutoff frequency (Hz) used when the signal's estimated speed is ~0 - lower means more
  // smoothing (more stable) while genuinely still.
  readonly minCutoffHz: number;
  // How much the cutoff frequency increases per unit of estimated speed (cents/second) - higher
  // means the filter opens up faster (less lag) as soon as the signal starts moving for real.
  readonly beta: number;
  // Cutoff frequency (Hz) for smoothing the speed estimate itself, not the value - the standard
  // default from the original paper. Smooths over single-sample speed spikes (one noisy jump
  // reading as "fast") without materially delaying a sustained real change.
  readonly derivativeCutoffHz: number;
}

function lowPassAlpha(cutoffHz: number, dtSeconds: number): number {
  const tau = 1 / (2 * Math.PI * cutoffHz);
  return 1 / (1 + tau / dtSeconds);
}

export class OneEuroFilter {
  private readonly options: OneEuroFilterOptions;
  private value: number | null = null;
  private derivative = 0;

  constructor(options: OneEuroFilterOptions) {
    this.options = options;
  }

  // Snaps the filter's internal state straight to `value` with zero estimated speed - used when
  // the caller wants an instant jump (a fresh reading identity, going quiet, etc.), not a filtered
  // one, so the filter doesn't fight the jump on the next real update.
  reset(value: number | null): void {
    this.value = value;
    this.derivative = 0;
  }

  filter(rawValue: number, dtSeconds: number): number {
    if (this.value === null || dtSeconds <= 0) {
      this.value = rawValue;
      return rawValue;
    }

    const rawDerivative = (rawValue - this.value) / dtSeconds;
    const derivativeAlpha = lowPassAlpha(this.options.derivativeCutoffHz, dtSeconds);
    this.derivative += derivativeAlpha * (rawDerivative - this.derivative);

    const cutoffHz = this.options.minCutoffHz + this.options.beta * Math.abs(this.derivative);
    const valueAlpha = lowPassAlpha(cutoffHz, dtSeconds);
    this.value += valueAlpha * (rawValue - this.value);

    return this.value;
  }
}
