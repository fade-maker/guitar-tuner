import type { DurationTokens, EasingTokens } from '../theme';

export type SlideDirection = 'up' | 'down' | 'left' | 'right';

export interface SlidePreset {
  readonly duration: keyof DurationTokens;
  readonly easing: keyof EasingTokens;
  readonly direction: SlideDirection;
  readonly distance: number; // px
}
