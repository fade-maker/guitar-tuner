// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { GuitarIllustration } from './GuitarIllustration';

afterEach(() => {
  cleanup();
});

describe('GuitarIllustration', () => {
  it('renders the headstock photo', () => {
    const { container } = render(<GuitarIllustration />);
    expect(container.querySelector('img')).not.toBeNull();
  });
});
