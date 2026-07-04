// Shape only - no values. The Figma audit found a flat, unscaled 10px padding reused on
// containers ranging from 24px to 184px, with no named spacing scale behind it anywhere in the
// file. A real scale (and which components should actually scale their padding vs. stay fixed) is
// a Figma decision, not something to guess at here.

export interface SpacingScale {
  readonly xs: number;
  readonly sm: number;
  readonly md: number;
  readonly lg: number;
  readonly xl: number;
}
