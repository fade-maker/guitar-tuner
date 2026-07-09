export interface InterpolateOptions {
  readonly clamp?: boolean;
}

// Maps `value` from inputRange onto outputRange, proportionally. Clamps to the output range by
// default (the common case - e.g. mapping a live sensor reading onto a bounded screen position);
// pass `clamp: false` to extrapolate instead.
export function interpolate(
  value: number,
  inputRange: readonly [number, number],
  outputRange: readonly [number, number],
  options: InterpolateOptions = {},
): number {
  const [inputMin, inputMax] = inputRange;
  const [outputMin, outputMax] = outputRange;
  const shouldClamp = options.clamp ?? true;

  const progress = inputMax === inputMin ? 0 : (value - inputMin) / (inputMax - inputMin);
  const clampedProgress = shouldClamp ? Math.max(0, Math.min(1, progress)) : progress;

  return outputMin + clampedProgress * (outputMax - outputMin);
}
