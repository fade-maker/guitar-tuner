import type { ReactElement } from 'react';
import styles from './AdvancedStatusBadge.module.css';

export type AdvancedStatusBadgeState = 'In tune' | 'Tune up' | 'Tune down';

export interface AdvancedStatusBadgeProps {
  readonly state?: AdvancedStatusBadgeState;
}

const LABEL: Record<AdvancedStatusBadgeState, string> = {
  'In tune': 'In tune!',
  'Tune up': 'Tune up',
  'Tune down': 'Tune down',
};

export function AdvancedStatusBadge({ state = 'In tune' }: AdvancedStatusBadgeProps): ReactElement {
  return (
    <div className={styles.badge}>
      <span className={styles.text}>{LABEL[state]}</span>
    </div>
  );
}
