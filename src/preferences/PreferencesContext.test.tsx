// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES } from './defaults';
import { PreferencesProvider } from './PreferencesContext';
import { PREFERENCES_STORAGE_KEY } from './storage';
import { usePreferences } from './usePreferences';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.useRealTimers();
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

  it('persists changes to localStorage once the debounce window elapses', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    act(() => result.current.setPreference('a4Frequency', 442));
    // Inside the debounce window nothing is written yet (a stepper burst coalesces to one write).
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();

    act(() => vi.advanceTimersByTime(200));
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)!);
    expect(stored.preferences.a4Frequency).toBe(442);
  });

  it('coalesces a rapid burst of changes into a single trailing write with the final values', () => {
    vi.useFakeTimers();
    const setItem = vi.spyOn(Storage.prototype, 'setItem');
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    act(() => {
      result.current.setPreference('a4Frequency', 441);
    });
    act(() => {
      result.current.setPreference('a4Frequency', 442);
    });
    act(() => {
      result.current.setPreference('a4Frequency', 443);
    });
    act(() => vi.advanceTimersByTime(200));

    expect(setItem).toHaveBeenCalledTimes(1);
    const stored = JSON.parse(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)!);
    expect(stored.preferences.a4Frequency).toBe(443);
    setItem.mockRestore();
  });

  it('flushes a still-pending write on pagehide instead of losing it', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePreferences(), { wrapper: PreferencesProvider });

    act(() => result.current.setPreference('a4Frequency', 442));
    expect(window.localStorage.getItem(PREFERENCES_STORAGE_KEY)).toBeNull();

    act(() => {
      window.dispatchEvent(new Event('pagehide'));
    });
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
