import type { ReactElement, ReactNode } from 'react';

export type PermissionStatus = 'idle' | 'requesting' | 'granted' | 'denied';

export interface PermissionGateProps {
  readonly status: PermissionStatus;
  readonly onRequestAccess: () => void;
  readonly children: ReactNode;
}

export type PermissionGateComponent = (props: PermissionGateProps) => ReactElement;
