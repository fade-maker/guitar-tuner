// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { Icon } from './Icon';
import type { IconName } from './Icon';

afterEach(() => {
  cleanup();
});

const NAMES: readonly IconName[] = ['arrow-down', 'flat', 'sharp', 'voice-square'];

describe('Icon', () => {
  it.each(NAMES)('renders an svg for "%s"', (name) => {
    const { container } = render(<Icon name={name} />);
    expect(container.querySelector('svg')).not.toBeNull();
  });

  it('defaults to a 24x24 box', () => {
    const { container } = render(<Icon name="flat" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('24');
    expect(svg.getAttribute('height')).toBe('24');
  });

  it('applies a custom size and color', () => {
    const { container } = render(<Icon name="sharp" size={16} color="#4682d5" />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toBe('16');
    expect(svg.style.color).toBe('rgb(70, 130, 213)');
  });
});
