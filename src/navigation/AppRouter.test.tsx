// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ScreenId } from './types';
import { AppRouter } from './AppRouter';
import { NavigationProvider } from './NavigationProvider';

// SimpleTunerScreen is real now (Stage 2) and needs the audio engine mocked the same way
// useAudioEngine.test.ts does - only the Web Audio/getUserMedia boundary is faked.
const { fakeEngine } = vi.hoisted(() => {
  const fakeEngine = {
    start: vi.fn(async () => undefined),
    stop: vi.fn(),
    subscribe: vi.fn(() => () => {}),
    onStatusChange: vi.fn(() => () => {}),
    onError: vi.fn(() => () => {}),
  };
  return { fakeEngine };
});

vi.mock('../audio-engine', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../audio-engine')>();
  return { ...actual, createAudioEngine: () => fakeEngine };
});

import { PreferencesProvider } from '../preferences';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

describe('AppRouter', () => {
  it.each([
    ['permission', 'Request access'],
  ] as const satisfies readonly (readonly [ScreenId, string])[])('renders the %s screen', (initialScreen, text) => {
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen={initialScreen}>
          <AppRouter />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByText(text)).not.toBeNull();
  });

  it('renders the real SimpleTunerScreen for simple-tuner', () => {
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="simple-tuner">
          <AppRouter />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByText('Guitar 6-string')).not.toBeNull();
  });

  it('renders the real SettingsScreen for settings', () => {
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="settings">
          <AppRouter />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByText('Advanced mode')).not.toBeNull();
  });

  it('renders the real SelectTuningScreen for select-tuning', () => {
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="select-tuning">
          <AppRouter />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByText('Select tuning')).not.toBeNull();
  });

  it('renders the real AdvancedTunerScreen for advanced-tuner', () => {
    render(
      <PreferencesProvider>
        <NavigationProvider initialScreen="advanced-tuner">
          <AppRouter />
        </NavigationProvider>
      </PreferencesProvider>,
    );

    expect(screen.getByText('Advanced tuning')).not.toBeNull();
  });
});
