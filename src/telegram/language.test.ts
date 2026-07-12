// @vitest-environment jsdom
import { afterEach, describe, expect, it } from 'vitest';
import { detectTelegramLanguage } from './language';

afterEach(() => {
  Reflect.deleteProperty(window, 'Telegram');
});

function setTelegramLanguageCode(language_code: unknown): void {
  Object.defineProperty(window, 'Telegram', {
    value: { WebApp: { initDataUnsafe: { user: { language_code } } } },
    configurable: true,
  });
}

describe('detectTelegramLanguage', () => {
  it('falls back to English when the Telegram bridge is absent', () => {
    expect(detectTelegramLanguage()).toBe('en');
  });

  it('falls back to English when Telegram is present but has no user', () => {
    Object.defineProperty(window, 'Telegram', { value: { WebApp: {} }, configurable: true });
    expect(detectTelegramLanguage()).toBe('en');
  });

  it.each([
    ['en', 'en'],
    ['ru', 'ru'],
    ['es', 'es'],
  ] as const)('maps a plain %s language_code to %s', (code, expected) => {
    setTelegramLanguageCode(code);
    expect(detectTelegramLanguage()).toBe(expected);
  });

  it.each([
    ['en-US', 'en'],
    ['ru-RU', 'ru'],
    ['es-MX', 'es'],
    ['ES-ES', 'es'],
  ] as const)('compares only the primary subtag for %s -> %s', (code, expected) => {
    setTelegramLanguageCode(code);
    expect(detectTelegramLanguage()).toBe(expected);
  });

  it('falls back to English for an unsupported language (e.g. German)', () => {
    setTelegramLanguageCode('de');
    expect(detectTelegramLanguage()).toBe('en');
  });

  it('falls back to English when language_code is missing from the user object', () => {
    setTelegramLanguageCode(undefined);
    expect(detectTelegramLanguage()).toBe('en');
  });
});
