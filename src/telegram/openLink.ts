// Deliberately scoped to just external-link opening - same convention as haptics.ts/webApp.ts (a
// fresh minimal interface per consumer rather than one shared "the entire SDK" type).
interface TelegramWebApp {
  readonly openLink?: (url: string) => void;
}

interface TelegramWindow {
  readonly Telegram?: {
    readonly WebApp?: TelegramWebApp;
  };
}

// Inside Telegram, a plain window.open()/<a target="_blank"> doesn't behave reliably in the Mini
// App webview - WebApp.openLink() is the documented way to hand a URL off to the system browser.
// Outside Telegram (plain browser, local dev), WebApp is undefined, so this falls back to a normal
// window.open() instead of no-op'ing - unlike haptics/viewport, there's a real, correct plain-browser
// equivalent for "open this link" to fall back to.
export function openExternalLink(url: string): void {
  const webApp = (window as unknown as TelegramWindow).Telegram?.WebApp;
  if (webApp?.openLink) {
    webApp.openLink(url);
    return;
  }
  window.open(url, '_blank', 'noopener,noreferrer');
}
