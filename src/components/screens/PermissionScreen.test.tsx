// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider, usePreferences } from '../../preferences';
import { PermissionScreen } from './PermissionScreen';

// jsdom has neither navigator.mediaDevices nor navigator.permissions - both are defined per-test
// (configurable so they can be redefined/removed between tests).
function stubGetUserMedia(impl: () => Promise<MediaStream>): ReturnType<typeof vi.fn> {
  const getUserMedia = vi.fn(impl);
  Object.defineProperty(window.navigator, 'mediaDevices', {
    value: { getUserMedia },
    configurable: true,
  });
  return getUserMedia;
}

function stubPermissionsQuery(state: 'granted' | 'denied' | 'prompt'): void {
  Object.defineProperty(window.navigator, 'permissions', {
    value: { query: vi.fn(async () => ({ state })) },
    configurable: true,
  });
}

function fakeStream(): { stream: MediaStream; stop: ReturnType<typeof vi.fn> } {
  const stop = vi.fn();
  const stream = { getTracks: () => [{ stop }] } as unknown as MediaStream;
  return { stream, stop };
}

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  Reflect.deleteProperty(window.navigator, 'mediaDevices');
  Reflect.deleteProperty(window.navigator, 'permissions');
});

function Probe(): ReactElement {
  const { screen: current } = useNavigation();
  const { setPreference } = usePreferences();
  return (
    <>
      <span data-testid="current-screen">{current}</span>
      <button type="button" onClick={() => setPreference('tunerMode', 'advanced')}>
        set-advanced
      </button>
    </>
  );
}

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="permission">
        <PermissionScreen />
        <Probe />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

describe('PermissionScreen', () => {
  it('renders the title and the Request access button', () => {
    renderScreen();
    expect(screen.getByText(/Allow microphone/)).not.toBeNull();
    expect(screen.getByRole('button', { name: 'Request access' })).not.toBeNull();
  });

  it('requests microphone access on button press, stops the probe stream, and navigates to the tuner', async () => {
    const { stream, stop } = fakeStream();
    const getUserMedia = stubGetUserMedia(async () => stream);
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));

    await waitFor(() => expect(screen.getByTestId('current-screen').textContent).toBe('simple-tuner'));
    expect(getUserMedia).toHaveBeenCalledWith({ audio: true });
    expect(stop).toHaveBeenCalled(); // the grant probe must not hold the mic open
  });

  it('navigates to the Advanced Tuner instead when tunerMode is advanced', async () => {
    const { stream } = fakeStream();
    stubGetUserMedia(async () => stream);
    renderScreen();

    fireEvent.click(screen.getByText('set-advanced'));
    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));

    await waitFor(() => expect(screen.getByTestId('current-screen').textContent).toBe('advanced-tuner'));
  });

  it('stays on the permission screen when access is denied', async () => {
    const getUserMedia = stubGetUserMedia(async () => {
      throw new DOMException('Permission denied', 'NotAllowedError');
    });
    renderScreen();

    fireEvent.click(screen.getByRole('button', { name: 'Request access' }));

    await waitFor(() => expect(getUserMedia).toHaveBeenCalled());
    expect(screen.getByTestId('current-screen').textContent).toBe('permission');
    // Button is still there for a retry.
    expect(screen.getByRole('button', { name: 'Request access' })).not.toBeNull();
  });

  it('skips itself straight to the tuner when permission is already granted from a previous session', async () => {
    stubPermissionsQuery('granted');
    renderScreen();

    await waitFor(() => expect(screen.getByTestId('current-screen').textContent).toBe('simple-tuner'));
  });

  it('shows normally (no navigation) when the Permissions API reports prompt', async () => {
    stubPermissionsQuery('prompt');
    renderScreen();

    // Give the mount-time query a tick to resolve, then confirm nothing navigated.
    await waitFor(() => expect(screen.getByTestId('current-screen').textContent).toBe('permission'));
    expect(screen.getByRole('button', { name: 'Request access' })).not.toBeNull();
  });
});
