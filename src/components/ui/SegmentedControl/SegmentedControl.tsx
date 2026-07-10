import type { CSSProperties, ReactElement } from 'react';
import { triggerHapticFeedback } from '../../../telegram/haptics';
import { classNames } from '../classNames';
import styles from './SegmentedControl.module.css';

export interface SegmentedControlOption<T extends string> {
  readonly value: T;
  readonly label: string;
}

export interface SegmentedControlProps<T extends string> {
  readonly options: readonly SegmentedControlOption<T>[];
  readonly value: T;
  readonly onChange: (value: T) => void;
}

// Transcribed from Figma's "Swither" component (Components page, node 144:2140): get_design_context
// timed out repeatedly on both the screen instance and the master component (4 attempts), so exact
// bound colors couldn't be extracted - this reuses the project's existing surface/text tokens
// (closest visual match from the screenshot) rather than inventing new ones. Flagged in the Stage 3
// report as a Figma-MCP-limitation TODO, not a stop.
export function SegmentedControl<T extends string>({ options, value, onChange }: SegmentedControlProps<T>): ReactElement {
  const activeIndex = Math.max(
    0,
    options.findIndex((option) => option.value === value),
  );
  // --count/--index drive .pill's own width/position (see the module.css) - CSS custom properties
  // rather than inline width/transform math here, so the actual sliding is one declarative CSS
  // transition, not something recomputed in JS on every render.
  const trackStyle = { '--count': options.length, '--index': activeIndex } as CSSProperties;

  return (
    <div className={styles.track} role="tablist" style={trackStyle}>
      <div className={styles.pill} aria-hidden="true" />
      {options.map((option) => {
        const isActive = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="tab"
            aria-selected={isActive}
            className={classNames(styles.segment, isActive && styles.active)}
            onClick={() => {
              if (option.value !== value) triggerHapticFeedback('light');
              onChange(option.value);
            }}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
