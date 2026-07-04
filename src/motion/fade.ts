import type { DurationTokens, EasingTokens } from '../theme';

export interface FadePreset {
  readonly duration: keyof DurationTokens;
  readonly easing: keyof EasingTokens;
  readonly fromOpacity: number;
  readonly toOpacity: number;
}
