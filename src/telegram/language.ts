import { SUPPORTED_LANGUAGES } from '../i18n/types';
import type { Language } from '../i18n/types';

// Same fresh-minimal-interface-per-consumer convention as useTelegramUser.ts/haptics.ts, rather than
// one shared "the entire SDK" type. initDataUnsafe is not cryptographically verified (see
// useTelegramUser.ts's own comment on that) - irrelevant here, this only ever seeds a low-stakes,
// freely-overridable UI language default, never an authorization or business-logic decision.
interface TelegramWebAppUser {
  readonly language_code?: string;
}

interface TelegramWindow {
  readonly Telegram?: {
    readonly WebApp?: {
      readonly initDataUnsafe?: {
        readonly user?: TelegramWebAppUser;
      };
    };
  };
}

// Telegram's language_code is a BCP-47-ish tag ('en', 'ru', 'es-MX', 'pt-BR', ...) - only the
// primary subtag is compared, and anything outside this app's 3 supported languages falls back to
// English rather than guessing at a "closest" match.
export function detectTelegramLanguage(): Language {
  // Guards `typeof window` rather than assuming a DOM (unlike this file's siblings, which only ever
  // run inside a real or jsdom browser context) - this is invoked as loadPreferences()'s default
  // parameter in preferences/storage.ts, a module deliberately kept environment-agnostic (its own
  // tests run in plain Node, no jsdom) so it stays testable/usable outside a browser entirely.
  if (typeof window === 'undefined') return 'en';
  const raw = (window as unknown as TelegramWindow).Telegram?.WebApp?.initDataUnsafe?.user?.language_code;
  const primarySubtag = raw?.split('-')[0].toLowerCase();
  const match = SUPPORTED_LANGUAGES.find((language) => language === primarySubtag);
  return match ?? 'en';
}
