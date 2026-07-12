// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AdvancedStatusBadge } from './AdvancedStatusBadge';

afterEach(() => {
  cleanup();
});

describe('AdvancedStatusBadge', () => {
  it.each([
    ['In tune', 'In tune!'],
    ['Tune up', 'Tune up'],
    ['Tune down', 'Tune down'],
  ] as const)('renders "%s" as "%s"', (state, text) => {
    render(<AdvancedStatusBadge state={state} />);
    expect(screen.getByText(text)).not.toBeNull();
  });

  it('uses the provided label override instead of the English default', () => {
    render(<AdvancedStatusBadge state="Tune up" label="Sube" />);
    expect(screen.getByText('Sube')).not.toBeNull();
    expect(screen.queryByText('Tune up')).toBeNull();
  });
});
