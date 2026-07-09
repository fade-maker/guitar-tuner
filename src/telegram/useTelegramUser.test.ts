// @vitest-environment jsdom
import { cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useTelegramUser } from './useTelegramUser';

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'Telegram');
});

function setTelegramUser(user: unknown): void {
  Object.defineProperty(window, 'Telegram', {
    value: { WebApp: { initDataUnsafe: { user } } },
    configurable: true,
  });
}

describe('useTelegramUser', () => {
  it('returns null when the Telegram bridge is absent', () => {
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current).toBeNull();
  });

  it('returns null when Telegram is present but initDataUnsafe has no user', () => {
    Object.defineProperty(window, 'Telegram', { value: { WebApp: {} }, configurable: true });
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current).toBeNull();
  });

  it('returns displayName/username/photoUrl for a full user', () => {
    setTelegramUser({ first_name: 'Ada', last_name: 'Lovelace', username: 'ada', photo_url: 'https://t.me/ada.jpg' });
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current).toEqual({
      displayName: 'Ada Lovelace',
      username: 'ada',
      photoUrl: 'https://t.me/ada.jpg',
    });
  });

  it('uses just first_name when last_name is absent', () => {
    setTelegramUser({ first_name: 'Ada' });
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current?.displayName).toBe('Ada');
  });

  it('returns null username/photoUrl when Telegram omits them', () => {
    setTelegramUser({ first_name: 'Ada' });
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current?.username).toBeNull();
    expect(result.current?.photoUrl).toBeNull();
  });

  it('returns null when the user object has no first_name', () => {
    setTelegramUser({ username: 'ghost' });
    const { result } = renderHook(() => useTelegramUser());
    expect(result.current).toBeNull();
  });
});
