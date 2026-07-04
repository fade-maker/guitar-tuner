// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckIndicator } from './CheckIndicator';

afterEach(() => {
  cleanup();
});

describe('CheckIndicator', () => {
  it('renders the blue filled checkmark when Active', () => {
    const { container } = render(<CheckIndicator state="Active" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('#4682D5');
  });

  it('renders the dim outline when Default', () => {
    const { container } = render(<CheckIndicator state="Default" />);
    expect(container.querySelector('path')?.getAttribute('fill')).toBe('#2C2C2C');
  });
});
