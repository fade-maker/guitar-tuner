import type { DurationTokens, EasingTokens } from '../theme';

export interface ScalePreset {
  readonly duration: keyof DurationTokens;
  readonly easing: keyof EasingTokens;
  readonly fromScale: number;
  readonly toScale: number;
}
