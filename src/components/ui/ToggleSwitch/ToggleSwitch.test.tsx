// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

import { triggerHapticFeedback } from '../../../telegram/haptics';
import { ToggleSwitch } from './ToggleSwitch';
import styles from './ToggleSwitch.module.css';

afterEach(() => {
  cleanup();
  vi.mocked(triggerHapticFeedback).mockClear();
});

function getThumb(): Element {
  const thumb = screen.getByRole('switch').querySelector(`.${styles.thumb}`);
  if (!thumb) throw new Error('thumb not found');
  return thumb;
}

describe('ToggleSwitch', () => {
  it('exposes its state via role="switch"/aria-checked', () => {
    render(<ToggleSwitch checked={true} onChange={() => {}} />);
    expect(screen.getByRole('switch').getAttribute('aria-checked')).toBe('true');
  });

  it('calls onChange with the flipped value when clicked', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('does not fire onChange when disabled', () => {
    const onChange = vi.fn();
    render(<ToggleSwitch checked={false} onChange={onChange} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(onChange).not.toHaveBeenCalled();
  });

  it('triggers a light haptic when toggled', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    fireEvent.click(screen.getByRole('switch'));
    expect(triggerHapticFeedback).toHaveBeenCalledWith('light');
  });

  it('does not trigger haptic feedback when disabled', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} disabled />);
    fireEvent.click(screen.getByRole('switch'));
    expect(triggerHapticFeedback).not.toHaveBeenCalled();
  });

  it('does not play the pickup/travel/settle animation on initial mount', () => {
    render(<ToggleSwitch checked={false} onChange={() => {}} />);
    const thumb = getThumb();
    expect(thumb.classList.contains(styles.thumbAnimateOn)).toBe(false);
    expect(thumb.classList.contains(styles.thumbAnimateOff)).toBe(false);
  });

  it('plays the turn-on animation after a real transition to checked', async () => {
    function Controlled(): ReactElement {
      const [checked, setChecked] = useState(false);
      return <ToggleSwitch checked={checked} onChange={setChecked} />;
    }
    render(<Controlled />);

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    expect(getThumb().classList.contains(styles.thumbAnimateOn)).toBe(true);
  });

  it('plays the turn-off animation after a real transition away from checked', async () => {
    function Controlled(): ReactElement {
      const [checked, setChecked] = useState(true);
      return <ToggleSwitch checked={checked} onChange={setChecked} />;
    }
    render(<Controlled />);

    await act(async () => {
      fireEvent.click(screen.getByRole('switch'));
    });

    expect(getThumb().classList.contains(styles.thumbAnimateOff)).toBe(true);
  });
});
