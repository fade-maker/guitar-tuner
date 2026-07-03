import type { ReactElement, ReactNode } from 'react';
import type { EngineStatus } from '../../audio-engine';

export interface PermissionGateProps {
  readonly status: EngineStatus;
  readonly onRequestAccess: () => void;
  readonly children: ReactNode;
}

export type PermissionGateComponent = (props: PermissionGateProps) => ReactElement;
