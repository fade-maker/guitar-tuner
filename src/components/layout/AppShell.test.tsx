// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { EngineStatus, PitchReading } from '../../audio-engine';

// Same convention as SimpleTunerScreen.test.tsx/AdvancedTunerScreen.test.tsx - AppShell mounts the
// real AppRouter, which can render either tuner screen, both of which own a real useAudioEngine().
const { fakeEngine, readingListeners, statusListeners } = vi.hoisted(() => {
  const readingListeners: Array<(reading: PitchReading) => void> = [];
  const statusListeners: Array<(status: EngineStatus) => void> = [];

  function register<T>(list: Array<(value: T) => void>, fn: (value: T) => void): () => void {
    list.push(fn);
    return () => {
      const index = list.indexOf(fn);
      if (index >= 0) list.splice(index, 1);
    };
  }

  const fakeEngine = {
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    subscribe: vi.fn((fn: (reading: PitchReading) => void) => register(readingListeners, fn)),
    onStatusChange: vi.fn((fn: (status: EngineStatus) => void) => register(statusListeners, fn)),
    onError: vi.fn(() => () => {}),
  };

  return { fakeEngine, readingListeners, statusListeners };
});

vi.mock('../../audio-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../audio-engine')>();
  return { ...actual, createAudioEngine: () => fakeEngine };
});

vi.mock('../../telegram/haptics', () => ({
  triggerHapticFeedback: vi.fn(),
}));

const { useTelegramUser } = vi.hoisted(() => ({
  useTelegramUser: vi.fn(() => null as null | { displayName: string; username: string | null; photoUrl: string | null }),
}));
vi.mock('../../telegram', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../telegram')>();
  return { ...actual, useTelegramUser };
});

import { NavigationProvider } from '../../navigation';
import type { ScreenId } from '../../navigation';
import { PreferencesProvider } from '../../preferences';
import { AppShell } from './AppShell';

function renderShell(initialScreen: ScreenId = 'simple-tuner') {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen={initialScreen}>
        <AppShell />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

beforeEach(() => {
  readingListeners.length = 0;
  statusListeners.length = 0;
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
  useTelegramUser.mockReturnValue(null);
});

describe('AppShell', () => {
  it('renders Bottom Navigation with Tuner active on Simple Tuner', () => {
    renderShell('simple-tuner');
    const nav = screen.getByRole('navigation');
    expect(nav.textContent).toContain('Tuner');
    expect(nav.textContent).toContain('Settings');
  });

  it('renders Bottom Navigation with Settings active on the Settings screen', () => {
    renderShell('settings');
    expect(screen.getByRole('navigation')).not.toBeNull();
  });

  it('renders no Bottom Navigation on Select Tuning', () => {
    renderShell('select-tuning');
    expect(screen.queryByRole('navigation')).toBeNull();
  });

  it('does not remount the footer when navigating between screens', () => {
    renderShell('simple-tuner');
    const navBefore = screen.getByRole('navigation');

    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('Advanced mode')).not.toBeNull(); // proves Settings actually rendered
    const navAfterSettings = screen.getByRole('navigation');
    expect(navAfterSettings).toBe(navBefore);

    fireEvent.click(screen.getByText('Tuner'));
    expect(screen.getByText('Guitar 6-string')).not.toBeNull(); // proves Simple Tuner re-rendered
    const navAfterBack = screen.getByRole('navigation');
    expect(navAfterBack).toBe(navBefore);
  });

  it('navigates back to Simple Tuner from Settings when tunerMode is simple', () => {
    renderShell('settings');
    fireEvent.click(screen.getByText('Tuner'));
    expect(screen.getByText('Guitar 6-string')).not.toBeNull();
  });

  it('navigates back to Advanced Tuner from Settings when tunerMode is advanced', () => {
    renderShell('settings');
    fireEvent.click(screen.getByRole('switch', { name: 'Advanced mode' }));
    fireEvent.click(screen.getByText('Tuner'));
    expect(screen.getByText('Advanced tuning')).not.toBeNull();
  });

  it("uses the real Telegram user's photo as the footer Settings tab icon when available", () => {
    useTelegramUser.mockReturnValue({ displayName: 'Ada Lovelace', username: 'ada', photoUrl: 'https://t.me/ada.jpg' });
    renderShell('simple-tuner');
    const img = screen.getByText('Settings').closest('button')?.querySelector('img');
    expect(img?.getAttribute('src')).toBe('https://t.me/ada.jpg');
  });
});
