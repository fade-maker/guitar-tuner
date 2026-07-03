import type { ReactElement } from 'react';

export interface TunerGaugeProps {
  readonly cents: number;
  readonly isActive: boolean;
  readonly isInTune: boolean;
}

export type TunerGaugeComponent = (props: TunerGaugeProps) => ReactElement;
