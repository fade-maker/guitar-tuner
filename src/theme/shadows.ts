// Real values for the two composite effects Figma defines on BottomNavigation
// ("Effects/BottomNavigation/Background Blur + Shadow" and ".../Progressive Blur"), re-confirmed
// against the updated Figma component (get_variable_defs on node 66:3223/66:3224). Color alpha
// values are the exact byte-to-fraction conversions of Figma's hex-with-alpha colors (e.g.
// #16161714 -> alpha byte 0x14 = 20/255 = 0.0784...), not the earlier stage's rounded 0.08/0.25.
// No card shadow is populated - none exists on real screens (cards are flat fills, no elevation
// shadow observed) - inventing one here would be unrequested design.

export interface ShadowLayer {
  readonly offsetX: number;
  readonly offsetY: number;
  readonly blur: number;
  readonly spread: number;
  readonly color: string;
}

export interface ShadowToken {
  readonly dropShadow?: ShadowLayer;
  readonly innerShadow?: ShadowLayer;
  readonly backgroundBlur?: number;
  // "Progressive Blur" (Figma's own name) is a *graduated* background blur, not a uniform one -
  // see FooterNavigation.module.css's .glass rule for why this needs a mask-graduated
  // backdrop-filter rather than a second flat blur() value stacked on the one above.
  readonly progressiveBlur?: number;
}

export interface ShadowTokens {
  readonly card: ShadowToken;
  readonly footer: ShadowToken;
}

export const shadows: ShadowTokens = {
  card: {},
  footer: {
    dropShadow: { offsetX: 0, offsetY: 0, blur: 40, spread: 0, color: 'rgba(22,22,23,0.0784)' },
    innerShadow: { offsetX: 0, offsetY: 0, blur: 12.6, spread: 0, color: 'rgba(0,0,0,0.251)' },
    backgroundBlur: 6,
    progressiveBlur: 4,
  },
};
