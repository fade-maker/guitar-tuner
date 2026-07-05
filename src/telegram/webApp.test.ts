// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { getTelegramWebApp, initTelegramWebApp } from './webApp';

afterEach(() => {
  Reflect.deleteProperty(window, 'Telegram');
});

describe('getTelegramWebApp', () => {
  it('returns the WebApp object when the Telegram bridge is present', () => {
    const webApp = { viewportHeight: 640 };
    Object.defineProperty(window, 'Telegram', { value: { WebApp: webApp }, configurable: true });

    expect(getTelegramWebApp()).toBe(webApp);
  });

  it('returns undefined when the Telegram bridge is absent', () => {
    expect(getTelegramWebApp()).toBeUndefined();
  });
});

describe('initTelegramWebApp', () => {
  it('calls ready() and expand() when the Telegram bridge is present', () => {
    const ready = vi.fn();
    const expand = vi.fn();
    Object.defineProperty(window, 'Telegram', { value: { WebApp: { ready, expand } }, configurable: true });

    initTelegramWebApp();

    expect(ready).toHaveBeenCalledTimes(1);
    expect(expand).toHaveBeenCalledTimes(1);
  });

  it('does not throw when the Telegram bridge is absent', () => {
    expect(() => initTelegramWebApp()).not.toThrow();
  });

  it('does not throw when Telegram exists but WebApp/ready/expand do not', () => {
    Object.defineProperty(window, 'Telegram', { value: {}, configurable: true });
    expect(() => initTelegramWebApp()).not.toThrow();
  });
});
