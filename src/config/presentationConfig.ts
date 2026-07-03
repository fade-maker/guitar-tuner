export interface PresentationConfig {
  readonly lockDurationMs: number;
}

// 280ms was the one number repeatedly flagged across the presentation-layer design as the most likely
// to need feel-based correction once this is actually playable - a pure UX choice, not physically derived.
export const DEFAULT_PRESENTATION_CONFIG: PresentationConfig = {
  lockDurationMs: 280,
};
