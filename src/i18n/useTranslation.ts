import { usePreferences } from '../preferences';
import { LOCALES } from './locales';
import type { Translations } from './types';

// No Context of its own - reads straight through usePreferences(), same "no new provider for a
// single derived value" reasoning as this project's other single-source hooks. LOCALES is a plain
// module-level lookup (no async loading, no code-splitting) - the whole app's copy across all 3
// languages is a few KB of strings, not worth a lazy-loading mechanism.
export function useTranslation(): Translations {
  const { preferences } = usePreferences();
  return LOCALES[preferences.language];
}
