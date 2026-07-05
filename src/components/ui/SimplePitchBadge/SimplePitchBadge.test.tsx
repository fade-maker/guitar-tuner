// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { SimplePitchBadge } from './SimplePitchBadge';

afterEach(() => {
  cleanup();
});

describe('SimplePitchBadge', () => {
  it('shows "In tune!" with no cents number', () => {
    render(<SimplePitchBadge state="In tune" />);
    expect(screen.getByText('In tune!')).not.toBeNull();
  });

  it('shows "-N" for Tune up', () => {
    render(<SimplePitchBadge state="Tune up" cents={11} />);
    expect(screen.getByText('Tune up')).not.toBeNull();
    expect(screen.getByText('-11')).not.toBeNull();
  });

  it('shows "+N" for Tune down', () => {
    render(<SimplePitchBadge state="Tune down" cents={11} />);
    expect(screen.getByText('Tune down')).not.toBeNull();
    expect(screen.getByText('+11')).not.toBeNull();
  });

  it('uses the normal type size for 2-digit magnitudes', () => {
    render(<SimplePitchBadge state="Tune down" cents={99} />);
    const text = screen.getByText('+99');
    expect(text.className).not.toMatch(/centsTextCompact/);
  });

  it('uses a compact type size for 3-digit magnitudes so they fit the fixed-size circle', () => {
    render(<SimplePitchBadge state="Tune down" cents={120} />);
    const text = screen.getByText('+120');
    expect(text.className).toMatch(/centsTextCompact/);
  });
});
