// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

import { triggerHapticFeedback } from '../../../telegram/haptics';
import { ToggleSwitch } from './ToggleSwitch';

afterEach(() => {
  cleanup();
  vi.mocked(triggerHapticFeedback).mockClear();
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

  it('triggers a light haptic when toggled', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(triggerHapticFeedback).toHaveBeenCalledWith('light');
  });

  it('does not trigger haptic feedback when disabled', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(triggerHapticFeedback).not.toHaveBeenCalled();
  });
});
