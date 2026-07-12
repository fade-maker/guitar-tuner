export type Language = 'en' | 'ru' | 'es';

export const SUPPORTED_LANGUAGES: readonly Language[] = ['en', 'ru', 'es'];

// Native endonyms - shown identically regardless of the app's current language (a Russian-reading
// user picking their language still sees "English"/"Español" in their own script, not translated
// language names), same convention as virtually every app's language picker.
export const LANGUAGE_NAMES: Record<Language, string> = {
  en: 'English',
  ru: 'Русский',
  es: 'Español',
};

export interface FAQEntryText {
  readonly question: string;
  readonly answer: string;
}

// One key per piece of UI copy in the app. Deliberately a single flat-ish interface (not split into
// per-screen modules) so a locale file missing a key is a single, immediate TypeScript error at that
// file's own `satisfies Translations` check, not a runtime gap discovered by clicking around in one
// language. Tuning/preset names (Drop D, Open G, Standard, ...) are intentionally NOT here - they're
// international guitar vocabulary used unchanged by Russian- and Spanish-speaking guitarists alike,
// not UI chrome; see tuningInstrument.ts/tuningCategory.ts's own data, which stays as-is across every
// locale on purpose.
export interface Translations {
  readonly permission: {
    readonly title: string; // contains a literal "\n" - see PermissionScreen's white-space: pre-line usage
    readonly button: string;
  };
  readonly tunerHeader: {
    readonly auto: string;
    readonly autoAriaLabel: string;
    readonly flatAriaLabel: string;
    readonly sharpAriaLabel: string;
    // Word order/grammar for "N-string instrument" genuinely differs per language (English suffixes
    // "-string", Russian/Spanish don't) - a template function, not prefix/suffix concatenation.
    // 'ukulele' is accepted (matches preferences' InstrumentId) even though Select Tuning doesn't
    // expose it yet - not duplicating that union here just to narrow this by one unused case.
    readonly instrumentTitle: (instrument: 'guitar' | 'bass' | 'ukulele', stringCount: number) => string;
  };
  readonly advancedTuner: {
    readonly title: string;
    readonly reset: string;
  };
  readonly tunerStatus: {
    readonly inTune: string; // badge text, e.g. "In tune!"
    readonly tuneUp: string;
    readonly tuneDown: string;
    readonly startPlaying: string;
  };
  readonly settings: {
    readonly advancedMode: string;
    readonly soundEffect: string;
    readonly leftHandedMode: string;
    readonly calibrate: string;
    readonly language: string;
    readonly support: string;
    readonly faq: string;
    readonly nicknamePlaceholder: string;
    readonly version: string;
  };
  readonly selectTuning: {
    readonly title: string;
    readonly guitarOption: string;
    readonly bassOption: string;
    readonly categoryPower: string;
    readonly categoryOpen: string;
    readonly categoryExtras: string;
    readonly save: string;
  };
  readonly faq: {
    readonly title: string;
    readonly backAriaLabel: string;
    readonly entries: readonly FAQEntryText[];
  };
  readonly languagePicker: {
    readonly title: string;
  };
}
