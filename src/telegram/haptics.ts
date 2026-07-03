import type { HapticImpactStyle } from './types';

// Deliberately scoped to just haptics, not the full TelegramAdapter skeleton (theme params,
// onThemeChange) - those have no consumer yet, and building them now would be speculative. This can
// be folded into TelegramAdapter later if/when theme integration is actually needed.
interface TelegramHapticFeedback {
  readonly impactOccurred: (style: HapticImpactStyle) => void;
}

interface TelegramWindow {
  readonly Telegram?: {
    readonly WebApp?: {
      readonly HapticFeedback?: TelegramHapticFeedback;
    };
  };
}

// Safe outside Telegram (plain browser, local dev): no-ops if the WebApp bridge isn't present.
export function triggerHapticFeedback(style: HapticImpactStyle = 'medium'): void {
  const haptics = (window as unknown as TelegramWindow).Telegram?.WebApp?.HapticFeedback;
  haptics?.impactOccurred(style);
}
