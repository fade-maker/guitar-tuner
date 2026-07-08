// Real values for the composite effect Figma defines on BottomNavigation
// ("Effects/BottomNavigation/Background Blur + Shadow"), re-confirmed against the updated Figma
// component (get_variable_defs on node 66:3223/66:3224). Color alpha values are the exact
// byte-to-fraction conversions of Figma's hex-with-alpha colors (e.g. #16161714 -> alpha byte
// 0x14 = 20/255 = 0.0784...), not the earlier stage's rounded 0.08/0.25.
// No card shadow is populated - none exists on real screens (cards are flat fills, no elevation
// shadow observed) - inventing one here would be unrequested design.
//
// The separate "Progressive Blur" effect this used to document (a masked, spatially-graduated
// blur layered on top of this one) was removed - see FooterNavigation.module.css's `.glass`
// comment: it only ever made sense back when `.pill` had no blur of its own, and started actively
// fighting the pill's own real backdrop-filter once that was added from Figma's per-node dev-mode
// CSS. `.pill`'s own blur is the only blur source for the capsule now.

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
  },
};
