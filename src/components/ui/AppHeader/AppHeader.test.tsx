// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AppHeader } from './AppHeader';

afterEach(() => {
  cleanup();
});

describe('AppHeader - Default variant', () => {
  it('renders title, subtitle, and frequency', () => {
    render(
      <AppHeader
        variant="Default"
        title="Guitar 6-string"
        subtitle="Standard"
        frequencyLabel="440Hz"
        autoMode={true}
        onAutoModeChange={() => {}}
      />,
    );
    expect(screen.getByText('Guitar 6-string')).not.toBeNull();
    expect(screen.getByText('Standard')).not.toBeNull();
    expect(screen.getByText('440Hz')).not.toBeNull();
  });

  it('reflects autoMode on the ToggleSwitch and calls onAutoModeChange', () => {
    const onAutoModeChange = vi.fn();
    render(
      <AppHeader
        variant="Default"
        title="Guitar 6-string"
        subtitle="Standard"
        frequencyLabel="440Hz"
        autoMode={false}
        onAutoModeChange={onAutoModeChange}
      />,
    );
    const toggle = screen.getByRole('switch');
    expect(toggle.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(toggle);
    expect(onAutoModeChange).toHaveBeenCalledWith(true);
  });

  it('calls onAccidentalSelect with "flat"/"sharp"', () => {
    const onAccidentalSelect = vi.fn();
    render(
      <AppHeader
        variant="Default"
        title="Guitar 6-string"
        subtitle="Standard"
        frequencyLabel="440Hz"
        autoMode={true}
        onAutoModeChange={() => {}}
        onAccidentalSelect={onAccidentalSelect}
      />,
    );
    fireEvent.click(screen.getByLabelText('Use flat notation'));
    fireEvent.click(screen.getByLabelText('Use sharp notation'));
    expect(onAccidentalSelect).toHaveBeenNthCalledWith(1, 'flat');
    expect(onAccidentalSelect).toHaveBeenNthCalledWith(2, 'sharp');
  });
});

describe('AppHeader - Advanced variant', () => {
  it('renders only title and frequency - no Auto switch, no accidental row', () => {
    render(<AppHeader variant="Advanced" title="Advanced tuning" frequencyLabel="440Hz" />);
    expect(screen.getByText('Advanced tuning')).not.toBeNull();
    expect(screen.getByText('440Hz')).not.toBeNull();
    expect(screen.queryByRole('switch')).toBeNull();
    expect(screen.queryByLabelText('Use flat notation')).toBeNull();
  });
});
