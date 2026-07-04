// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { CurrentTargetNote } from './CurrentTargetNote';

afterEach(() => {
  cleanup();
});

describe('CurrentTargetNote', () => {
  it('renders the note with the octave as a superscript digit', () => {
    render(<CurrentTargetNote note="E" octave={2} />);
    expect(screen.getByText('E²')).not.toBeNull();
  });

  it('renders a double-digit octave correctly', () => {
    render(<CurrentTargetNote note="A" octave={10} />);
    expect(screen.getByText('A¹⁰')).not.toBeNull();
  });
});
