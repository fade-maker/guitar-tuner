// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuitarIllustrationSmall } from './GuitarIllustrationSmall';

afterEach(() => {
  cleanup();
});

describe('GuitarIllustrationSmall', () => {
  it('renders the headstock photo', () => {
    const { container } = render(<GuitarIllustrationSmall />);
    expect(container.querySelector('img')).not.toBeNull();
  });
});
