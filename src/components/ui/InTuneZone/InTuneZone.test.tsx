// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { InTuneZone } from './InTuneZone';

afterEach(() => {
  cleanup();
});

describe('InTuneZone', () => {
  it('shows the "Start playing" prompt in the Default state', () => {
    render(<InTuneZone state="Default" />);
    expect(screen.getByText('Start playing')).not.toBeNull();
  });

  it('shows no text once tuning has started', () => {
    render(<InTuneZone state="Tuning started" />);
    expect(screen.queryByText('Start playing')).toBeNull();
  });

  it('uses the provided promptText override instead of the English default', () => {
    render(<InTuneZone state="Default" promptText="Empieza a tocar" />);
    expect(screen.getByText('Empieza a tocar')).not.toBeNull();
    expect(screen.queryByText('Start playing')).toBeNull();
  });
});
