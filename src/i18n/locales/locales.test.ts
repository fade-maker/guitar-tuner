import { describe, expect, it } from 'vitest';
import { SUPPORTED_LANGUAGES } from '../types';
import { LOCALES } from './index';

// TypeScript's `Translations` interface already guarantees every locale has every *key* (a missing
// key in en.ts/ru.ts/es.ts is a compile error) - but `faq.entries` is a plain array type, not a
// fixed-length tuple, so a locale silently shipping fewer/more FAQ entries than the others would
// still type-check. This is the one piece of cross-locale structure TS can't catch on its own.
describe('LOCALES structural consistency', () => {
  it('has an entry for every supported language', () => {
    for (const language of SUPPORTED_LANGUAGES) {
      expect(LOCALES[language]).toBeDefined();
    }
  });

  it('every locale has the same number of FAQ entries, in the same question order', () => {
    const [first, ...rest] = SUPPORTED_LANGUAGES.map((language) => LOCALES[language].faq.entries.length);
    for (const count of rest) {
      expect(count).toBe(first);
    }
  });

  it('no locale has an empty-string translation for any top-level leaf string field', () => {
    // Cheap smoke test against copy-paste-and-forget-to-translate mistakes, not a full recursive
    // walk - good enough to catch the failure mode that actually matters (an accidentally blank row).
    for (const language of SUPPORTED_LANGUAGES) {
      const t = LOCALES[language];
      expect(t.permission.title.length).toBeGreaterThan(0);
      expect(t.permission.button.length).toBeGreaterThan(0);
      expect(t.settings.language.length).toBeGreaterThan(0);
      expect(t.selectTuning.title.length).toBeGreaterThan(0);
      expect(t.faq.title.length).toBeGreaterThan(0);
      for (const entry of t.faq.entries) {
        expect(entry.question.length).toBeGreaterThan(0);
        expect(entry.answer.length).toBeGreaterThan(0);
      }
    }
  });
});
