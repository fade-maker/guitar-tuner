import type { ReactElement } from 'react';
import type { StringTarget } from '../../music-theory/types';

export interface StringSelectorProps {
  readonly strings: readonly StringTarget[];
  readonly activeString: StringTarget | null;
}

export type StringSelectorComponent = (props: StringSelectorProps) => ReactElement;
