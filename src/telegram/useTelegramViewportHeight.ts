import { useEffect, useState } from 'react';
import { getTelegramWebApp } from './webApp';

// Live window.Telegram.WebApp.viewportHeight, in px - null outside Telegram (plain browser, local
// dev), so callers can fall back to a CSS-only viewport unit (100dvh, then 100vh) instead. This is
// Telegram's own reported usable viewport height, which already accounts for its native chrome
// (header, main button, etc.) in a way a CSS viewport unit alone can't know about. Subscribes to
// Telegram's 'viewportChanged' event so the value keeps tracking Telegram's chrome/keyboard changes
// live, the same way 100dvh already does automatically in a plain browser.
export function useTelegramViewportHeight(): number | null {
  const [height, setHeight] = useState<number | null>(() => getTelegramWebApp()?.viewportHeight ?? null);

  useEffect(() => {
    const webApp = getTelegramWebApp();
    if (!webApp?.onEvent) return;

    const handleViewportChanged = (): void => {
      setHeight(getTelegramWebApp()?.viewportHeight ?? null);
    };

    webApp.onEvent('viewportChanged', handleViewportChanged);
    return () => webApp.offEvent?.('viewportChanged', handleViewportChanged);
  }, []);

  return height;
}
