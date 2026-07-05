// @vitest-environment jsdom
import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useTelegramViewportHeight } from './useTelegramViewportHeight';

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'Telegram');
});

describe('useTelegramViewportHeight', () => {
  it('returns null when the Telegram bridge is absent', () => {
    const { result } = renderHook(() => useTelegramViewportHeight());
    expect(result.current).toBeNull();
  });

  it('returns the current viewportHeight when the Telegram bridge is present', () => {
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { viewportHeight: 620 } },
      configurable: true,
    });

    const { result } = renderHook(() => useTelegramViewportHeight());
    expect(result.current).toBe(620);
  });

  it('updates when Telegram fires viewportChanged', () => {
    let viewportChangedHandler: (() => void) | undefined;
    const webApp = {
      viewportHeight: 620,
      onEvent: vi.fn((eventType: string, cb: () => void) => {
        if (eventType === 'viewportChanged') viewportChangedHandler = cb;
      }),
      offEvent: vi.fn(),
    };
    Object.defineProperty(window, 'Telegram', { value: { WebApp: webApp }, configurable: true });

    const { result } = renderHook(() => useTelegramViewportHeight());
    expect(result.current).toBe(620);

    webApp.viewportHeight = 480; // e.g. keyboard opened, shrinking the usable viewport
    act(() => viewportChangedHandler?.());

    expect(result.current).toBe(480);
  });

  it('unsubscribes from viewportChanged on unmount', () => {
    const offEvent = vi.fn();
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { viewportHeight: 620, onEvent: vi.fn(), offEvent } },
      configurable: true,
    });

    const { unmount } = renderHook(() => useTelegramViewportHeight());
    unmount();

    expect(offEvent).toHaveBeenCalledWith('viewportChanged', expect.any(Function));
  });
});
