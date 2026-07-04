// Shape only - no values. Figma's Typography page names 14 styles (display, headingLarge,
// heading, headingSemibold, headingMedium, body, bodySemibold, bodySecondary, bodySmall,
// bodySmallMedium, captionRegular, captionBold, captionMedium, micro), four of which currently
// carry a copy-pasted line-height that doesn't scale with their own font size (see the UI spec's
// punch list). Filling in real numbers before that's fixed would bake the bug into code.

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
