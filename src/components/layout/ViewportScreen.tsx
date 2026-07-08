import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useTelegramViewportHeight } from '../../telegram';
import styles from './ViewportScreen.module.css';

export interface ViewportScreenProps {
  readonly children: ReactNode;
  // Renders in the same fixed-position slot at all times (flex-shrink:0, full width, last in the
  // column) - AppShell passes this only when the current screen wants Bottom Navigation (see
  // AppShell.tsx's SCREENS_WITHOUT_FOOTER), omitting it entirely otherwise (Select Tuning, and
  // Permission's own single-button affordance instead of the tab bar).
  readonly footer?: ReactNode;
}

// The app's single full-screen shell, mounted exactly once by AppShell (see
// components/layout/AppShell.tsx) - not per screen. Owns the one piece of behavior every screen
// needs identically - real viewport height, Telegram-aware - so that logic, and the Bottom
// Navigation slot, exist exactly once instead of being duplicated (and re-subscribed to Telegram's
// viewportChanged event) on every navigation. See ViewportScreen.module.css for the height-priority
// cascade and the `.routedScreen` class each individual screen composes to fill this shell's
// content area.
export function ViewportScreen({ children, footer }: ViewportScreenProps): ReactElement {
  const telegramViewportHeight = useTelegramViewportHeight();
  const style: CSSProperties | undefined =
    telegramViewportHeight !== null
      ? ({ '--tg-viewport-height': `${telegramViewportHeight}px` } as CSSProperties)
      : undefined;

  return (
    <div className={styles.viewportScreen} style={style}>
      {children}
      {footer && <div className={styles.footerSlot}>{footer}</div>}
    </div>
  );
}
