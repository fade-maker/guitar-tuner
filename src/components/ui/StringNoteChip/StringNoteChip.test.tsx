// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { StringNoteChip } from './StringNoteChip';

afterEach(() => {
  cleanup();
});

describe('StringNoteChip', () => {
  it('renders the note and octave as separate text nodes', () => {
    render(<StringNoteChip note="E" octave={2} />);
    expect(screen.getByText('E')).not.toBeNull();
    expect(screen.getByText('2')).not.toBeNull();
  });

  it('does not render an accidental slot for a natural note', () => {
    const { container } = render(<StringNoteChip note="E" octave={2} />);
    expect(container.querySelector('[class*="accidental"]')).toBeNull();
  });

  it('splits a sharp note into its own letter and accidental elements', () => {
    render(<StringNoteChip note="C#" octave={3} />);
    expect(screen.getByText('C')).not.toBeNull();
    expect(screen.getByText('#')).not.toBeNull();
    expect(screen.getByText('3')).not.toBeNull();
  });

  it('splits a flat note into its own letter and accidental elements', () => {
    render(<StringNoteChip note="Db" octave={3} />);
    expect(screen.getByText('D')).not.toBeNull();
    expect(screen.getByText('b')).not.toBeNull();
    expect(screen.getByText('3')).not.toBeNull();
  });
});
