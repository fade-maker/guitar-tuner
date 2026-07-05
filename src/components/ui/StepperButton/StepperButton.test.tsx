// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StepperButton } from './StepperButton';

afterEach(() => {
  cleanup();
});

describe('StepperButton', () => {
  it('labels a "+" button as Increase', () => {
    render(<StepperButton type="+" />);
    expect(screen.getByRole('button', { name: 'Increase' })).not.toBeNull();
  });

  it('labels a "-" button as Decrease', () => {
    render(<StepperButton type="-" />);
    expect(screen.getByRole('button', { name: 'Decrease' })).not.toBeNull();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<StepperButton type="+" onClick={onClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', () => {
    const onClick = vi.fn();
    render(<StepperButton type="+" onClick={onClick} disabled />);
    fireEvent.click(screen.getByRole('button'));
    expect(onClick).not.toHaveBeenCalled();
  });
});
