// Shape only - no values. Unlike typography, Figma has no animation designs at all yet (static
// screens only) - these are raw, composable primitives (a duration, an easing curve). Composed,
// reusable presets (fade/scale/slide/spring) are a separate concern - see `src/motion/`, which
// consumes these tokens rather than duplicating them.

export interface DurationTokens {
  readonly fast: number;
  readonly normal: number;
  readonly slow: number;
}

export interface EasingTokens {
  readonly standard: string;
  readonly decelerate: string;
  readonly accelerate: string;
}

export interface AnimationTokens {
  readonly duration: DurationTokens;
  readonly easing: EasingTokens;
}
