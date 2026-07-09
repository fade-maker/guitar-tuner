// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { FooterNavigation } from './FooterNavigation';

afterEach(() => {
  cleanup();
});

describe('FooterNavigation', () => {
  it('marks the active tab with aria-current', () => {
    render(<FooterNavigation active="Tuner" onSelect={() => {}} />);
    expect(screen.getByText('Tuner').closest('button')?.getAttribute('aria-current')).toBe('page');
    expect(screen.getByText('Settings').closest('button')?.getAttribute('aria-current')).toBeNull();
  });

  it('calls onSelect with the tapped tab', () => {
    const onSelect = vi.fn();
    render(<FooterNavigation active="Tuner" onSelect={onSelect} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(onSelect).toHaveBeenCalledWith('Settings');
  });

  it('falls back to the static placeholder icon when avatarUrl is omitted', () => {
    render(<FooterNavigation active="Tuner" onSelect={() => {}} />);
    const img = screen.getByText('Settings').closest('button')?.querySelector('img');
    expect(img?.getAttribute('src')).toContain('settings-placeholder');
  });

  it('uses avatarUrl as the Settings tab icon when provided', () => {
    render(<FooterNavigation active="Tuner" onSelect={() => {}} avatarUrl="https://t.me/ada.jpg" />);
    const img = screen.getByText('Settings').closest('button')?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://t.me/ada.jpg');
  });
});
