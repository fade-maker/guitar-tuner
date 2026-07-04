// Real values, transcribed exactly from Figma's Typography page. 4 styles (headingMedium,
// bodySecondary, captionMedium, micro) carry a line-height that doesn't scale with their own font
// size - a known Figma inconsistency (punch list §13), reproduced as-is rather than silently
// "fixed" here, since this file's job is pixel-perfect transcription, not unrequested design
// correction.

export interface TypeStyle {
  readonly fontFamily: string;
  readonly fontWeight: number;
  readonly fontSize: number;
  readonly lineHeight: number;
  readonly letterSpacing?: number;
}

export interface TypographyTokens {
  readonly display: TypeStyle;
  readonly headingLarge: TypeStyle;
  readonly heading: TypeStyle;
  readonly headingSemibold: TypeStyle;
  readonly headingMedium: TypeStyle;
  readonly body: TypeStyle;
  readonly bodySemibold: TypeStyle;
  readonly bodySecondary: TypeStyle;
  readonly bodySmall: TypeStyle;
  readonly bodySmallMedium: TypeStyle;
  readonly captionRegular: TypeStyle;
  readonly captionBold: TypeStyle;
  readonly captionMedium: TypeStyle;
  readonly micro: TypeStyle;
}

const FONT_FAMILY = "'SF Pro Display', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif";

export const typography: TypographyTokens = {
  display: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 48, lineHeight: 36 },
  headingLarge: { fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 36, lineHeight: 36 },
  heading: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 20, lineHeight: 25 },
  headingSemibold: { fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 20, lineHeight: 25 },
  headingMedium: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 20, lineHeight: 36 },
  body: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 16, lineHeight: 22.4 },
  bodySemibold: { fontFamily: FONT_FAMILY, fontWeight: 600, fontSize: 16, lineHeight: 22.4 },
  bodySecondary: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 15, lineHeight: 36 },
  bodySmall: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 13, lineHeight: 19.6 },
  bodySmallMedium: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 13, lineHeight: 19.6 },
  captionRegular: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 11, lineHeight: 16.8 },
  captionBold: { fontFamily: FONT_FAMILY, fontWeight: 700, fontSize: 11, lineHeight: 16.8 },
  captionMedium: { fontFamily: FONT_FAMILY, fontWeight: 500, fontSize: 11, lineHeight: 36 },
  micro: { fontFamily: FONT_FAMILY, fontWeight: 400, fontSize: 10, lineHeight: 36 },
};
