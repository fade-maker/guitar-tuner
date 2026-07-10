// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CheckIndicator } from './CheckIndicator';

afterEach(() => {
  cleanup();
});

// Both the ring (Default) and check (Active) paths are always mounted now (see CheckIndicator.tsx's
// own comment) - only their opacity/scale toggles with `state`, so tests assert on the check path's
// presence/visibility class rather than "which single path exists".
describe('CheckIndicator', () => {
  it('shows the blue checkmark (not the dim ring) when Active', () => {
    const { container } = render(<CheckIndicator state="Active" />);
    const check = container.querySelector('path[fill="#4682D5"]');
    const ring = container.querySelector('path[fill="#2C2C2C"]');
    expect(check).not.toBeNull();
    expect(check?.getAttribute('class')).toContain('checkVisible');
    expect(ring?.getAttribute('class')).toContain('ringHidden');
  });

  it('shows the dim ring (not the checkmark) when Default', () => {
    const { container } = render(<CheckIndicator state="Default" />);
    const check = container.querySelector('path[fill="#4682D5"]');
    const ring = container.querySelector('path[fill="#2C2C2C"]');
    expect(check?.getAttribute('class')).not.toContain('checkVisible');
    expect(ring?.getAttribute('class')).not.toContain('ringHidden');
  });
});
