// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

import { triggerHapticFeedback } from '../../../telegram/haptics';
import { FooterNavigation } from './FooterNavigation';
import styles from './FooterNavigation.module.css';

afterEach(() => {
  cleanup();
  vi.mocked(triggerHapticFeedback).mockClear();
});

function getHighlight(container: HTMLElement): Element {
  const highlight = container.querySelector(`.${styles.activeHighlight}`);
  if (!highlight) throw new Error('active highlight not found');
  return highlight;
}

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

  it('triggers a light haptic on tab tap', () => {
    render(<FooterNavigation active="Tuner" onSelect={() => {}} />);
    fireEvent.click(screen.getByText('Settings'));
    expect(triggerHapticFeedback).toHaveBeenCalledWith('light');
  });

  it('does not play the pickup/travel/settle animation on initial mount', () => {
    const { container } = render(<FooterNavigation active="Tuner" onSelect={() => {}} />);
    const highlight = getHighlight(container);
    expect(highlight.classList.contains(styles.activeHighlightAnimateToSettings)).toBe(false);
    expect(highlight.classList.contains(styles.activeHighlightAnimateToTuner)).toBe(false);
  });

  it('plays the toSettings animation after a real transition to the Settings tab', async () => {
    function Controlled(): ReactElement {
      const [active, setActive] = useState<'Tuner' | 'Settings'>('Tuner');
      return <FooterNavigation active={active} onSelect={setActive} />;
    }
    const { container } = render(<Controlled />);

    await act(async () => {
      fireEvent.click(screen.getByText('Settings'));
    });

    expect(getHighlight(container).classList.contains(styles.activeHighlightAnimateToSettings)).toBe(true);
  });

  it('plays the toTuner animation after a real transition back to the Tuner tab', async () => {
    function Controlled(): ReactElement {
      const [active, setActive] = useState<'Tuner' | 'Settings'>('Settings');
      return <FooterNavigation active={active} onSelect={setActive} />;
    }
    const { container } = render(<Controlled />);

    await act(async () => {
      fireEvent.click(screen.getByText('Tuner'));
    });

    expect(getHighlight(container).classList.contains(styles.activeHighlightAnimateToTuner)).toBe(true);
  });
});
