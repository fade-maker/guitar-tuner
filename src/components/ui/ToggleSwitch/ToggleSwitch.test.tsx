// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ToggleSwitch } from './ToggleSwitch';

afterEach(() => {
  cleanup();
});

describe('ToggleSwitch', () => {
  it('exposes its state via role="switch"/aria-checked', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange with the flipped value when clicked', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });
});
