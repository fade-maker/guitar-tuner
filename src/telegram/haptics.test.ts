// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest';
import { triggerHapticFeedback } from './haptics';

afterEach(() => {
  Reflect.deleteProperty(window, 'Telegram');
});

describe('triggerHapticFeedback', () => {
  it('calls impactOccurred with the given style when the Telegram bridge is present', () => {
    const impactOccurred = vi.fn();
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { HapticFeedback: { impactOccurred } } },
      configurable: true,
    });

    triggerHapticFeedback('heavy');

    expect(impactOccurred).toHaveBeenCalledWith('heavy');
  });

  it('defaults to medium when no style is given', () => {
    const impactOccurred = vi.fn();
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { HapticFeedback: { impactOccurred } } },
      configurable: true,
    });

    triggerHapticFeedback();

    expect(impactOccurred).toHaveBeenCalledWith('medium');
  });

  it('does not throw when the Telegram bridge is absent', () => {
    expect(() => triggerHapticFeedback()).not.toThrow();
  });

  it('does not throw when Telegram exists but WebApp/HapticFeedback do not', () => {
    Object.defineProperty(window, 'Telegram', { value: {}, configurable: true });
    expect(() => triggerHapticFeedback()).not.toThrow();
  });
});
