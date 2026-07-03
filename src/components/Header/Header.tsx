import type { ReactElement } from 'react';

export interface HeaderProps {
  readonly title: string;
  readonly subtitle: string;
}

export type HeaderComponent = (props: HeaderProps) => ReactElement;
