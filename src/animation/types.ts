// Shared by scheduler.ts, sharedValue.ts, tween.ts and spring.ts - kept in their own file rather
// than owned by one of those modules, so no one of them reads as "primary" and the others as
// depending on it.

export type Unsubscribe = () => void;

export interface AnimationHandle {
  stop(): void;
}
