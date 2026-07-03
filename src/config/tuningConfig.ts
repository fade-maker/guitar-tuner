export interface TuningToleranceConfig {
  readonly inTuneCents: number;
  readonly closeCents: number;
}

export const DEFAULT_TUNING_TOLERANCE_CONFIG: TuningToleranceConfig = {
  inTuneCents: 3,
  closeCents: 8,
};
