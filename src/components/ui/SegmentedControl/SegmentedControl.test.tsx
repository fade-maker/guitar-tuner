// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SegmentedControl } from './SegmentedControl';

const OPTIONS = [
  { value: 'guitar', label: 'Guitar 6-string' },
  { value: 'bass', label: 'Bass 4-string' },
] as const;

afterEach(() => {
  cleanup();
});

describe('SegmentedControl', () => {
  it('marks the option matching value as selected', () => {
    render(<SegmentedControl options={OPTIONS} value="bass" onChange={() => {}} />);
    expect(screen.getByRole('tab', { name: 'Bass 4-string' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('tab', { name: 'Guitar 6-string' }).getAttribute('aria-selected')).toBe('false');
  });

  it('calls onChange with the tapped option value', () => {
    const onChange = vi.fn();
    render(<SegmentedControl options={OPTIONS} value="guitar" onChange={onChange} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Bass 4-string' }));
    expect(onChange).toHaveBeenCalledWith('bass');
  });
});
