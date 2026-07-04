// Real values for the one composite effect Figma actually defines ("Background Blur + Shadow",
// used by the footer). No card shadow is populated - none exists on real screens (cards are flat
// fills, no elevation shadow observed) - inventing one here would be unrequested design.

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
    dropShadow: { offsetX: 0, offsetY: 0, blur: 40, spread: 0, color: 'rgba(22,22,23,0.08)' },
    innerShadow: { offsetX: 0, offsetY: 0, blur: 12.6, spread: 0, color: 'rgba(0,0,0,0.25)' },
    backgroundBlur: 6,
  },
};
