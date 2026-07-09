import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import { Icon } from '../Icon';
import settingsPlaceholder from './assets/settings-placeholder.png';
import styles from './FooterNavigation.module.css';

export type FooterNavigationTab = 'Tuner' | 'Settings';

export interface FooterNavigationProps {
  readonly active: FooterNavigationTab;
  readonly onSelect: (tab: FooterNavigationTab) => void;
  // The Settings tab's icon slot is a round avatar photo, not a generic icon (Figma's own
  // placeholder is a photo, not an icon glyph) - this component stays presentational and doesn't
  // reach into telegram/ itself, so the real Telegram user's photo (when available) is passed in
  // as a prop by AppShell, the same way active/onSelect already are. Falls back to the static
  // Figma placeholder when omitted or null (no Telegram user, or no photo_url set).
  readonly avatarUrl?: string | null;
}

export function FooterNavigation({ active, onSelect, avatarUrl }: FooterNavigationProps): ReactElement {
  const isTunerActive = active === 'Tuner';
  const isSettingsActive = active === 'Settings';

  return (
    <nav className={styles.footer}>
      <div className={styles.pill}>
        <span className={styles.glass} aria-hidden="true" />
        <button
          type="button"
          className={classNames(styles.tab, isTunerActive && styles.active)}
          onClick={() => onSelect('Tuner')}
          aria-current={isTunerActive ? 'page' : undefined}
        >
          <span className={styles.iconSlot}>
            <Icon name="voice-square" size={26} color={isTunerActive ? '#faf9f5' : '#9c9a92'} />
          </span>
          <span className={classNames(styles.label, isTunerActive ? styles.active : styles.inactive)}>Tuner</span>
        </button>
        <button
          type="button"
          className={classNames(styles.tab, isSettingsActive && styles.active)}
          onClick={() => onSelect('Settings')}
          aria-current={isSettingsActive ? 'page' : undefined}
        >
          <span className={styles.iconSlot}>
            <img src={avatarUrl ?? settingsPlaceholder} alt="" className={styles.settingsIcon} />
          </span>
          <span className={classNames(styles.label, isSettingsActive ? styles.active : styles.inactive)}>
            Settings
          </span>
        </button>
      </div>
    </nav>
  );
}
