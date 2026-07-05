import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useTelegramViewportHeight } from '../../telegram';
import { classNames } from '../ui/classNames';
import styles from './ViewportScreen.module.css';

export interface ViewportScreenProps {
  readonly children: ReactNode;
  // Merged with the shared shell class (via `composes` in the caller's own CSS module, not string
  // concatenation) so a screen can add its own rules without repeating the shell's own.
  readonly className?: string;
}

// Shared full-screen shell: every screen (Simple Tuner, Settings, and whatever adopts this next)
// renders one of these at its root instead of sizing itself. Owns the one piece of behavior every
// screen needs identically - real viewport height, Telegram-aware - so that logic exists exactly
// once. See ViewportScreen.module.css for the height-priority cascade this sets up.
export function ViewportScreen({ children, className }: ViewportScreenProps): ReactElement {
  const telegramViewportHeight = useTelegramViewportHeight();
  const style: CSSProperties | undefined =
    telegramViewportHeight !== null
      ? ({ '--tg-viewport-height': `${telegramViewportHeight}px` } as CSSProperties)
      : undefined;

  return (
    <div className={classNames(styles.viewportScreen, className)} style={style}>
      {children}
    </div>
  );
}
