import type { ReactElement } from 'react';
import styles from './AdvancedStatusBadge.module.css';

export type AdvancedStatusBadgeState = 'In tune' | 'Tune up' | 'Tune down';

export interface AdvancedStatusBadgeProps {
  readonly state?: AdvancedStatusBadgeState;
  // Optional, English-defaulting override - same convention as SimplePitchBadge's own translated
  // labels, keeps this primitive's existing tests/gallery usage unchanged.
  readonly label?: string;
}

const DEFAULT_LABEL: Record<AdvancedStatusBadgeState, string> = {
  'In tune': 'In tune!',
  'Tune up': 'Tune up',
  'Tune down': 'Tune down',
};

export function AdvancedStatusBadge({ state = 'In tune', label }: AdvancedStatusBadgeProps): ReactElement {
  return (
    <div className={styles.badge}>
      <span className={styles.text}>{label ?? DEFAULT_LABEL[state]}</span>
    </div>
  );
}
