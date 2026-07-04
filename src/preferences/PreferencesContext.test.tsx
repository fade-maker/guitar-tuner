// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { DEFAULT_PREFERENCES } from './defaults';
import { PreferencesProvider } from './PreferencesContext';
import { PREFERENCES_STORAGE_KEY } from './storage';
import { usePreferences } from './usePreferences';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('usePreferences', () => {
  it('throws when used outside a PreferencesProvider', () => {
    expect(() => renderHook(() => usePreferences())).toThrow(/PreferencesProvider/);
  });

  it('starts from defaults when localStorage is empty', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });

  it('updates a single preference without touching the others', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    act(() => result.current.setPreference('tunerMode', 'advanced'));

    expect(result.current.preferences).toEqual({ ...DEFAULT_PREFERENCES, tunerMode: 'advanced' });
  });

  it('persists changes to localStorage', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    act(() => result.current.setPreference('a4Frequency', 442));

    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)!);
    expect(stored.preferences.a4Frequency).toBe(442);
  });

  it('loads persisted preferences on mount', () => {
    const { result: first } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });
    act(() => first.current.setPreference('leftHanded', true));
    cleanup();

    const { result: second } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    expect(second.current.preferences.leftHanded).toBe(true);
  });

  it('resetPreferences() restores every field to its default', () => {
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });
    act(() => {
      result.current.setPreference('tunerMode', 'advanced');
      result.current.setPreference('haptics', false);
    });

    act(() => result.current.resetPreferences());

    expect(result.current.preferences).toEqual(DEFAULT_PREFERENCES);
  });
});
