// Minimal shape of window.Telegram.WebApp this module actually reads - same convention as
// haptics.ts's own local TelegramWindow interface (a fresh minimal interface per consumer rather
// than one shared "the entire SDK" type, since no consumer needs more than a few fields of it).
interface TelegramWebApp {
  readonly viewportHeight?: number;
  ready?: () => void;
  expand?: () => void;
  onEvent?: (eventType: string, callback: () => void) => void;
  offEvent?: (eventType: string, callback: () => void) => void;
}

interface TelegramWindow {
  readonly Telegram?: {
    readonly WebApp?: TelegramWebApp;
  };
}

export function getTelegramWebApp(): TelegramWebApp | undefined {
  return (window as unknown as TelegramWindow).Telegram?.WebApp;
}

// Tells Telegram the app is ready to be shown (removes its loading placeholder) and requests the
// largest available viewport instead of Telegram's default compact one - both are one-shot, app
// lifecycle-level calls (not tied to any particular screen), which is why this runs once from
// main.tsx rather than from inside a component. Safe outside Telegram: WebApp is undefined in a
// plain browser (local dev, or the telegram-web-app.js script simply not running inside Telegram),
// so this is a no-op there.
export function initTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  webApp?.ready?.();
  webApp?.expand?.();
}
