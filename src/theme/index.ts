export type { SurfaceColorTokens, TextColorTokens, BorderColorTokens, AccentColorTokens, ColorTokens } from './colors';
export type { RadiusTokens } from './radius';
export type { SpacingScale } from './spacing';
export type { TypeStyle, TypographyTokens } from './typography';
export type { ShadowLayer, ShadowToken, ShadowTokens } from './shadows';
export type { DurationTokens, EasingTokens, AnimationTokens } from './animation';

import type { ColorTokens } from './colors';
import type { RadiusTokens } from './radius';
import type { SpacingScale } from './spacing';
import type { TypographyTokens } from './typography';
import type { ShadowTokens } from './shadows';
import type { AnimationTokens } from './animation';

// The full token set a screen/component consumes once Figma's punch list is closed. No default
// instance is exported yet - see each token file for why its values aren't filled in.
export interface ThemeTokens {
  readonly colors: ColorTokens;
  readonly radius: RadiusTokens;
  readonly spacing: SpacingScale;
  readonly typography: TypographyTokens;
  readonly shadows: ShadowTokens;
  readonly animation: AnimationTokens;
}
