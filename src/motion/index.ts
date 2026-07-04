// Composed, reusable motion presets. Raw primitives (durations, easing curves) live in
// `src/theme/animation.ts` - these types reference them by key rather than duplicating them, so a
// preset always names an existing token instead of inventing a one-off number. No default preset
// values are exported: no animation has been designed in Figma yet (static screens only), so
// filling these in now would be inventing motion design that hasn't happened.

export type { FadePreset } from './fade';
export type { ScalePreset } from './scale';
export type { SlideDirection, SlidePreset } from './slide';
export type { SpringPreset } from './spring';

import type { FadePreset } from './fade';
import type { ScalePreset } from './scale';
import type { SlidePreset } from './slide';
import type { SpringPreset } from './spring';

export interface MotionTokens {
  readonly fade: FadePreset;
  readonly scale: ScalePreset;
  readonly slide: SlidePreset;
  readonly spring: SpringPreset;
}
