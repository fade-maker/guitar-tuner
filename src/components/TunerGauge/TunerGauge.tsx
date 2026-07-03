import type { ReactElement } from 'react';
import type { TunerLifecycleState } from '../../presentation/tunerPresenter';

export interface TunerGaugeProps {
  readonly cents: number | null;
  readonly state: TunerLifecycleState;
  readonly isInTune: boolean;
}

export type TunerGaugeComponent = (props: TunerGaugeProps) => ReactElement;
