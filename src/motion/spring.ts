// Spring presets don't use duration/easing tokens at all - a spring's perceived speed comes from
// its physical parameters instead. Library-agnostic on purpose: these numbers mean the same thing
// whether a later stage drives them with CSS, the Web Animations API, or a JS spring library.
export interface SpringPreset {
  readonly stiffness: number;
  readonly damping: number;
  readonly mass?: number;
}
