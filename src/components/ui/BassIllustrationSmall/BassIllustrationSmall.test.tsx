// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BassIllustrationSmall } from './BassIllustrationSmall';

afterEach(() => {
  cleanup();
});

describe('BassIllustrationSmall', () => {
  it('renders the headstock photo', () => {
    const { container } = render(<BassIllustrationSmall />);
    expect(container.querySelector('img')).not.toBeNull();
  });
});
