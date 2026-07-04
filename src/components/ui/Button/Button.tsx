import type { ButtonHTMLAttributes, ReactElement, ReactNode } from 'react';
import { classNames } from '../classNames';
import styles from './Button.module.css';

export type ButtonVariant = 'primary' | 'secondary';
export type ButtonSize = 'large' | 'small';

export interface ButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'className'> {
  readonly variant?: ButtonVariant;
  readonly size?: ButtonSize;
  readonly children: ReactNode;
}

export function Button({ variant = 'primary', size = 'large', children, ...rest }: ButtonProps): ReactElement {
  return (
    <button
      className={classNames(styles.button, styles[variant], styles[size])}
      type={rest.type ?? 'button'}
      {...rest}
    >
      {children}
    </button>
  );
}
