import type { ReactElement } from 'react';
import { classNames } from '../classNames';
import styles from './SimplePitchBadge.module.css';

export type SimplePitchBadgeState = 'In tune' | 'Tune up' | 'Tune down';

export interface SimplePitchBadgeProps {
  readonly state?: SimplePitchBadgeState;
  // Cents to display on "Tune up"/"Tune down" - e.g. 11 renders as "-11"/"+11" per Figma.
  readonly cents?: number;
}

function Tail({ color }: { color: string }): ReactElement {
  return (
    <svg
      width="100%"
      height="100%"
      viewBox="0 0 7.04791 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <path
        d="M0.0725095 1.37139C-0.190236 0.714526 0.293522 0 1.00099 0H6.04692C6.75439 0 7.23814 0.714526 6.9754 1.37139L4.5754 7.37139C4.42353 7.75105 4.05583 8 3.64692 8H3.40099C2.99208 8 2.62437 7.75105 2.47251 7.37139L0.0725095 1.37139Z"
        fill={color}
      />
    </svg>
  );
}

function Checkmark(): ReactElement {
  return (
    <svg width={18} height={14} viewBox="0 0 18 14" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <path
        d="M6.44272 14C6.08254 14 5.74037 13.8437 5.48824 13.5703L0.391696 8.04255C-0.130565 7.47611 -0.130565 6.53854 0.391696 5.9721C0.913957 5.40565 1.77839 5.40565 2.30065 5.9721L6.44272 10.4646L15.6993 0.424834C16.2216 -0.141611 17.086 -0.141611 17.6083 0.424834C18.1306 0.99128 18.1306 1.92884 17.6083 2.49529L7.3972 13.5703C7.14507 13.8437 6.8029 14 6.44272 14Z"
        fill="#141413"
      />
    </svg>
  );
}

export function SimplePitchBadge({ state = 'In tune', cents = 11 }: SimplePitchBadgeProps): ReactElement {
  const isTuneDown = state === 'Tune down';
  const isTuneUp = state === 'Tune up';
  const isOffPitch = isTuneUp || isTuneDown;
  const magnitude = Math.abs(Math.round(cents));

  return (
    <div className={styles.badge}>
      <div className={styles.badgeColumn}>
        <div className={classNames(styles.indicator, isOffPitch ? styles.offPitch : styles.inTune)}>
          {isOffPitch && <span className={styles.centsText}>{isTuneDown ? `+${magnitude}` : `-${magnitude}`}</span>}
          {state === 'In tune' && <Checkmark />}
        </div>
        <span className={styles.tail}>
          <Tail color={isOffPitch ? '#CD5C58' : '#ffffff'} />
        </span>
      </div>
      <div className={styles.label}>
        <span className={styles.labelText}>{isTuneDown ? 'Tune down' : isTuneUp ? 'Tune up' : 'In tune!'}</span>
      </div>
    </div>
  );
}
