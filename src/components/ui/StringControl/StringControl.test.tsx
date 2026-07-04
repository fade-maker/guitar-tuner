// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { StringControl } from './StringControl';

afterEach(() => {
  cleanup();
});

describe('StringControl', () => {
  it('renders the string label', () => {
    render(<StringControl label="A" />);
    expect(screen.getByText('A')).not.toBeNull();
  });

  it('calls onClick when pressed', () => {
    const onClick = vi.fn();
    render(<StringControl label="E" onClick={onClick} />);
    fireEvent.click(screen.getByText('E'));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('marks non-default states as pressed for assistive tech', () => {
    render(<StringControl label="E" state="In tune" />);
    expect(screen.getByRole('button').getAttribute('aria-pressed')).toBe('true');
  });
});
