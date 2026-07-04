import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import { Icon } from '../Icon';
import { ToggleSwitch } from '../ToggleSwitch';
import styles from './AppHeader.module.css';

export type Accidental = 'sharp' | 'flat';

export interface AppHeaderDefaultProps {
  readonly variant: 'Default';
  readonly title: string;
  readonly subtitle: string;
  readonly frequencyLabel: string;
  readonly autoMode: boolean;
  readonly onAutoModeChange: (autoMode: boolean) => void;
  readonly onTitlePress?: () => void;
  readonly onAccidentalSelect?: (accidental: Accidental) => void;
}

export interface AppHeaderAdvancedProps {
  readonly variant: 'Advanced';
  readonly title: string;
  readonly frequencyLabel: string;
}

export type AppHeaderProps = AppHeaderDefaultProps | AppHeaderAdvancedProps;

export function AppHeader(props: AppHeaderProps): ReactElement {
  if (props.variant === 'Advanced') {
    return (
      <div className={styles.header}>
        <div className={styles.topRow}>
          <div className={styles.titleColumn}>
            <div className={styles.titleRow}>
              <span className={styles.title}>{props.title}</span>
            </div>
            <div className={styles.subtitleRow}>
              <span className={styles.subtitle}>{props.frequencyLabel}</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const { title, subtitle, frequencyLabel, autoMode, onAutoModeChange, onTitlePress, onAccidentalSelect } = props;

  return (
    <div className={classNames(styles.header, styles.default)}>
      <div className={classNames(styles.topRow, styles.default)}>
        <div className={styles.titleColumn}>
          <div
            className={classNames(styles.titleRow, styles.default)}
            onClick={onTitlePress}
            onKeyDown={(event) => {
              if (onTitlePress && (event.key === 'Enter' || event.key === ' ')) onTitlePress();
            }}
            role={onTitlePress ? 'button' : undefined}
            tabIndex={onTitlePress ? 0 : undefined}
          >
            <span className={styles.title}>{title}</span>
            <Icon name="arrow-down" size={16} color="var(--color-text-primary)" />
          </div>
          <div className={classNames(styles.subtitleRow, styles.default)}>
            <span className={styles.subtitle}>{subtitle}</span>
            <span className={styles.dot} />
            <span className={styles.subtitle}>{frequencyLabel}</span>
          </div>
        </div>
        <div className={styles.autoRow}>
          <span className={styles.autoLabel}>Auto</span>
          <ToggleSwitch checked={autoMode} onChange={onAutoModeChange} aria-label="Auto mode" />
        </div>
      </div>
      <div className={styles.accidentalRow}>
        <button
          type="button"
          className={styles.accidentalButton}
          onClick={() => onAccidentalSelect?.('flat')}
          aria-label="Use flat notation"
        >
          <Icon name="flat" size={24} />
        </button>
        <button
          type="button"
          className={styles.accidentalButton}
          onClick={() => onAccidentalSelect?.('sharp')}
          aria-label="Use sharp notation"
        >
          <Icon name="sharp" size={24} />
        </button>
      </div>
    </div>
  );
}
