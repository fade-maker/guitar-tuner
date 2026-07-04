// Real values, sourced from Figma's bound variables (get_variable_defs across Components/Settings/
// Typography). Figma itself binds these under several overlapping names for the same role
// (bg/secondary, Background/inverse, text/Surface/secondary, label/secondary, ...) - this file picks
// one canonical value per role rather than reproducing that duplication. See the UI spec's punch
// list (§13/§19) for the full inconsistency record; this is the resolution, not a new finding.

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

export const colors: ColorTokens = {
  surface: {
    page: '#121212', // bg/primary
    card: '#1e1e1e', // background/Surface/secondary
    elevated: '#2c2c2c', // background/Surface/tertiary (= background/Surface/glass)
    inverse: '#ffffff', // background/Surface/inverse
  },
  text: {
    primary: '#faf9f5', // text/Surface/primary
    secondary: '#9c9a92', // text/Surface/secondary
    tertiary: '#7b7a82', // text/tertiary as bound on real screens (Settings) - not the Typography
    // page's own #73726c, which colors that page's internal dev-annotation captions, not product UI
    inverse: '#141413', // text/Surface/inverse
  },
  border: {
    primary: '#faf9f5', // border/Surface/primary (= border/default)
    secondary: '#dedcd1', // border/Surface/secondary
  },
  accent: {
    info: '#4682d5', // background/Accent/info (= Background/active)
    danger: '#cd5c58', // border/Accent/danger
  },
};
