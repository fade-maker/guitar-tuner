// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { BassIllustration } from './BassIllustration';

afterEach(() => {
  cleanup();
});

describe('BassIllustration', () => {
  it('renders the headstock photo', () => {
    const { container } = render(<BassIllustration />);
    expect(container.querySelector('img')).not.toBeNull();
  });
});
