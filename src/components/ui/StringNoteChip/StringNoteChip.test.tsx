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
});
