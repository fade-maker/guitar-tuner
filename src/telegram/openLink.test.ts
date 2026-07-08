// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { openExternalLink } from './openLink';

afterEach(() => {
  Reflect.deleteProperty(window, 'Telegram');
  vi.restoreAllMocks();
});

describe('openExternalLink', () => {
  it('calls WebApp.openLink with the given url when the Telegram bridge is present', () => {
    const openLink = vi.fn();
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { openLink } },
      configurable: true,
    });

    openExternalLink('https://t.me/vrwrxx');

    expect(openLink).toHaveBeenCalledWith('https://t.me/vrwrxx');
  });

  it('falls back to window.open when the Telegram bridge is absent', () => {
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternalLink('https://t.me/vrwrxx');

    expect(windowOpen).toHaveBeenCalledWith('https://t.me/vrwrxx', '_blank', 'noopener,noreferrer');
  });

  it('falls back to window.open when Telegram exists but WebApp/openLink do not', () => {
    Object.defineProperty(window, 'Telegram', { value: {}, configurable: true });
    const windowOpen = vi.spyOn(window, 'open').mockReturnValue(null);

    openExternalLink('https://t.me/vrwrxx');

    expect(windowOpen).toHaveBeenCalledWith('https://t.me/vrwrxx', '_blank', 'noopener,noreferrer');
  });
});
