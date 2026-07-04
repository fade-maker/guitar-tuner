// Real values. Figma's own spacing "tokens" are literally named after their value (a variable named
// "10" bound to 10, etc.) rather than a semantic role - see the punch list. Reproduced honestly as
// the same un-semantic scale rather than inventing xs/sm/md/lg names Figma doesn't have.

export interface SpacingScale {
  readonly space2: number;
  readonly space4: number;
  readonly space8: number;
  readonly space10: number;
  readonly space12: number;
  readonly space16: number;
  readonly space24: number;
}

export const spacing: SpacingScale = {
  space2: 2,
  space4: 4,
  space8: 8,
  space10: 10,
  space12: 12,
  space16: 16,
  space24: 24,
};
