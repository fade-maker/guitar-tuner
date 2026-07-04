// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider } from './NavigationProvider';
import { useNavigation } from './useNavigation';

afterEach(() => {
  cleanup();
});

describe('useNavigation', () => {
  it('throws when used outside a NavigationProvider', () => {
    expect(() => renderHook(() => useNavigation())).toThrow(/NavigationProvider/);
  });

  it('defaults to the simple-tuner screen', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper: NavigationProvider });

    expect(result.current.screen).toBe('simple-tuner');
  });

  it('honors an explicit initialScreen', () => {
    const { result } = renderHook(() => useNavigation(), {
      wrapper: ({ children }) => <NavigationProvider initialScreen="settings">{children}</NavigationProvider>,
    });

    expect(result.current.screen).toBe('settings');
  });

  it('navigateTo() switches the current screen', () => {
    const { result } = renderHook(() => useNavigation(), { wrapper: NavigationProvider });

    act(() => result.current.navigateTo('advanced-tuner'));

    expect(result.current.screen).toBe('advanced-tuner');
  });
});
