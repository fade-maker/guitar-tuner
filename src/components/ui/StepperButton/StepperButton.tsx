import type { ButtonHTMLAttributes, MouseEvent, ReactElement } from 'react';
import { triggerHapticFeedback } from '../../../telegram/haptics';
import { classNames } from '../classNames';
import styles from './StepperButton.module.css';

export type StepperButtonType = '+' | '-';
export type StepperButtonSize = 'large' | 'small';

export interface StepperButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className' | 'type'> {
  readonly type: StepperButtonType;
  readonly size?: StepperButtonSize;
}

// Icon path data transcribed exactly from Figma's "+/- buttons" component (66:3252): each
// size/type combination is a distinct "Union" asset in Figma rather than one path reused at
// different scales, so all four are reproduced as-is instead of approximated from one shape.
function PlusIconLarge(): ReactElement {
  return (
    <svg width="18.0498" height="18.0996" viewBox="0 0 18.0498 18.0996" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
      <path
        d="M9.0498 0C9.46402 0 9.7998 0.335786 9.7998 0.75V8.2998H17.2998C17.714 8.2998 18.0498 8.63559 18.0498 9.0498C18.0498 9.46402 17.714 9.7998 17.2998 9.7998H9.7998V17.3496C9.79967 17.7637 9.46394 18.0996 9.0498 18.0996C8.63567 18.0996 8.29994 17.7637 8.2998 17.3496V9.7998H0.75C0.335787 9.7998 3.90578e-07 9.46402 0 9.0498C4.26905e-07 8.63559 0.335787 8.2998 0.75 8.2998H8.2998V0.75C8.2998 0.335786 8.63559 0 9.0498 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function PlusIconSmall(): ReactElement {
  return (
    <svg width="10.6689" height="10.6963" viewBox="0 0 10.6689 10.6963" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
      <path
        d="M5.34766 0C5.76175 0 6.09747 0.335949 6.09766 0.75V4.59863H9.91895C10.3329 4.59889 10.6689 4.93458 10.6689 5.34863C10.6689 5.76269 10.3329 6.09837 9.91895 6.09863H6.09766V9.94629C6.09766 10.3605 5.76187 10.6963 5.34766 10.6963C4.9335 10.6962 4.59766 10.3605 4.59766 9.94629V6.09863H0.75C0.335786 6.09863 2.16352e-07 5.76285 0 5.34863C-7.01369e-07 4.93442 0.335787 4.59863 0.75 4.59863H4.59766V0.75C4.59785 0.33599 4.93362 6.72021e-05 5.34766 0Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MinusIconLarge(): ReactElement {
  return (
    <svg width="18.0498" height="1.5" viewBox="0 0 18.0498 1.5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
      <path
        d="M17.2998 0C17.714 3.58235e-08 18.0498 0.335786 18.0498 0.75C18.0498 1.16421 17.714 1.5 17.2998 1.5H0.75C0.335787 1.5 3.90578e-07 1.16421 0 0.75C4.26905e-07 0.335787 0.335787 -3.88083e-10 0.75 0H17.2998Z"
        fill="currentColor"
      />
    </svg>
  );
}

function MinusIconSmall(): ReactElement {
  return (
    <svg width="10.6689" height="1.5" viewBox="0 0 10.6689 1.5" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ display: 'block' }}>
      <path
        d="M9.91895 0C10.3329 0.000258117 10.6689 0.335946 10.6689 0.75C10.6689 1.16405 10.3329 1.49974 9.91895 1.5H0.75C0.335786 1.5 2.16352e-07 1.16421 0 0.75C-7.01369e-07 0.335787 0.335787 -1.81058e-08 0.75 0H9.91895Z"
        fill="currentColor"
      />
    </svg>
  );
}

export function StepperButton({ type, size = 'large', disabled, onClick, ...rest }: StepperButtonProps): ReactElement {
  const isLarge = size === 'large';
  const icon =
    type === '+' ? (isLarge ? <PlusIconLarge /> : <PlusIconSmall />) : isLarge ? <MinusIconLarge /> : <MinusIconSmall />;

  // Haptic lives here, not at each call site - every StepperButton usage (Settings' and Advanced
  // Tuner's Calibrate rows) is the same "step a value up/down" interaction, unlike the generic
  // Button component (Save/Reset/etc.) which is used for varied purposes and gets its haptic wired
  // per call site instead.
  function handleClick(event: MouseEvent<HTMLButtonElement>): void {
    triggerHapticFeedback('light');
    onClick?.(event);
  }

  return (
    <button
      type="button"
      className={classNames(styles.stepper, styles[size])}
      disabled={disabled}
      aria-label={type === '+' ? 'Increase' : 'Decrease'}
      onClick={handleClick}
      {...rest}
    >
      {icon}
    </button>
  );
}
