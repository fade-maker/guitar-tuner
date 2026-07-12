// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import type { ReactElement, ReactNode } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { PreferencesProvider, usePreferences } from '../preferences';
import { LOCALES } from './locales';
import { useTranslation } from './useTranslation';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function wrapper({ children }: { readonly children: ReactNode }): ReactElement {
  return <PreferencesProvider>{children}</PreferencesProvider>;
}

describe('useTranslation', () => {
  it('returns the English dictionary by default', () => {
    const { result } = renderHook(() => useTranslation(), { wrapper });
    expect(result.current).toBe(LOCALES.en);
  });

  it('tracks preferences.language - switching it returns the matching dictionary', () => {
    const { result } = renderHook(
      () => {
        const translations = useTranslation();
        const { setPreference } = usePreferences();
        return { translations, setPreference };
      },
      { wrapper },
    );

    expect(result.current.translations).toBe(LOCALES.en);

    act(() => result.current.setPreference('language', 'ru'));
    expect(result.current.translations).toBe(LOCALES.ru);

    act(() => result.current.setPreference('language', 'es'));
    expect(result.current.translations).toBe(LOCALES.es);
  });
});
