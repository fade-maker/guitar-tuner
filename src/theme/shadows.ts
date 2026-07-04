// Shape only - no values. Modeled after the one composite effect the Figma audit found (the
// footer's drop-shadow + background-blur + inner-shadow stack, currently an unnamed "Background
// Blur + Shadow" style) so a real token can slot in once it's named properly in Figma.

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
