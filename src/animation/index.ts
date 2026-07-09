export type { SharedValue, Listener } from './sharedValue';
export { createSharedValue } from './sharedValue';

export type { Unsubscribe, AnimationHandle } from './types';

export type { EasingFunction } from './easing';
export { linear, cubicBezier } from './easing';

export type { InterpolateOptions } from './interpolate';
export { interpolate } from './interpolate';

export type { TweenConfig } from './tween';
export { tween } from './tween';

export type { SpringConfig } from './spring';
export { spring } from './spring';

// The shared scheduler is exported too - not only drivers use it. useAudioEngine's own tick loop
// (src/hooks/useAudioEngine.ts) is a non-animation per-frame consumer that registers with it
// directly, precisely so the app doesn't end up with more than one requestAnimationFrame chain.
export type { FrameListener, Scheduler } from './scheduler';
export { scheduler } from './scheduler';
