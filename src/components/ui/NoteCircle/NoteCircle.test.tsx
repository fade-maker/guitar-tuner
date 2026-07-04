// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { NoteCircle } from './NoteCircle';

afterEach(() => {
  cleanup();
});

describe('NoteCircle', () => {
  it('renders the note letter', () => {
    render(<NoteCircle note="E" />);
    expect(screen.getByText('E')).not.toBeNull();
  });

  it.each(['In tune', 'Searching'] as const)('renders in the "%s" state without throwing', (state) => {
    expect(() => render(<NoteCircle note="A" state={state} />)).not.toThrow();
  });
});
