import type { ReactElement } from 'react';
import type { StringTarget } from '../../music-theory/types';

export interface StringSelectorProps {
  readonly strings: readonly StringTarget[];
  readonly activeString: StringTarget | null;
  readonly onSelect: (target: StringTarget) => void;
}

export type StringSelectorComponent = (props: StringSelectorProps) => ReactElement;
