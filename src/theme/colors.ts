// Shape only - no values. The Figma audit found six near-black surface hexes with no elevation
// system and a `text/tertiary` token that resolves to two different colors depending on where it's
// read (see the UI spec's "Blocking gaps" section). Populating this with a guessed value would be
// inventing design that hasn't been decided yet - this interface exists so the moment Figma settles
// on a 3-tier surface scale, there's already a typed shape for it to fill.

export interface SurfaceColorTokens {
  readonly page: string;
  readonly card: string;
  readonly elevated: string;
  readonly inverse: string;
}

export interface TextColorTokens {
  readonly primary: string;
  readonly secondary: string;
  readonly tertiary: string;
  readonly inverse: string;
}

export interface BorderColorTokens {
  readonly primary: string;
  readonly secondary: string;
}

export interface AccentColorTokens {
  readonly info: string;
  readonly danger: string;
}

export interface ColorTokens {
  readonly surface: SurfaceColorTokens;
  readonly text: TextColorTokens;
  readonly border: BorderColorTokens;
  readonly accent: AccentColorTokens;
}
