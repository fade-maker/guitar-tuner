import type { ReactElement } from 'react';

export type CheckIndicatorState = 'Active' | 'Default';

export interface CheckIndicatorProps {
  readonly state?: CheckIndicatorState;
}

export function CheckIndicator({ state = 'Active' }: CheckIndicatorProps): ReactElement {
  const isActive = state === 'Active';
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: 10, width: 24, height: 24, boxSizing: 'border-box' }}>
      <svg width={16} height={16} viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
        {isActive ? (
          <path
            d="M8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0ZM11.7041 5.15332C11.3746 4.90258 10.9043 4.96653 10.6533 5.2959L7.19922 9.8291L5.30469 7.74512C5.02602 7.43895 4.5515 7.41679 4.24512 7.69531C3.93895 7.97398 3.91679 8.4485 4.19531 8.75488L6.69531 11.5049C6.84502 11.6694 7.06003 11.7586 7.28223 11.749C7.50468 11.7394 7.71174 11.6312 7.84668 11.4541L11.8467 6.2041C12.0974 5.87464 12.0335 5.40427 11.7041 5.15332Z"
            fill="#4682D5"
          />
        ) : (
          <path
            d="M8 0C12.4183 0 16 3.58172 16 8C16 12.4183 12.4183 16 8 16C3.58172 16 0 12.4183 0 8C0 3.58172 3.58172 0 8 0ZM8 1.5C4.41015 1.5 1.5 4.41015 1.5 8C1.5 11.5899 4.41015 14.5 8 14.5C11.5899 14.5 14.5 11.5899 14.5 8C14.5 4.41015 11.5899 1.5 8 1.5Z"
            fill="#2C2C2C"
            fillOpacity={0.6}
          />
        )}
      </svg>
    </span>
  );
}
