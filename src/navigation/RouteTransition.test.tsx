// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../preferences';
import { NavigationProvider } from './NavigationProvider';
import { RouteTransition } from './RouteTransition';
import { useNavigation } from './useNavigation';
import type { ScreenId } from './types';

// jsdom does not implement AnimationEvent at all (confirmed directly: 'AnimationEvent' in
// window is false), and a plain Event dispatched as a stand-in for it does not fire React's
// onAnimationEnd handler either - confirmed with a minimal isolated repro before concluding this,
// not assumed. So the "exiting screen is removed once its animation reports finished" behavior
// (the onAnimationEnd branch of RouteTransition.tsx) is not something this file can exercise -
// verified instead via a real browser (Playwright) against the actual built output, where real
// animationend events fire naturally. What *is* tested here: the correct exit/enter styles and
// screens are chosen and rendered immediately after a navigation, and the single-exiting-slot
// eviction behavior on rapid re-navigation - all of which are pure render/state assertions, not
// dependent on the animation event system at all.

function ReducedMotion(matches: boolean): void {
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({ matches })),
  );
}

beforeEach(() => {
  ReducedMotion(false);
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 0));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  vi.unstubAllGlobals();
});

// Real, clickable triggers rather than capturing navigateTo into an outer variable during render -
// this project's lint rules forbid reassigning an outside-the-component variable during render (a
// form of side effect); a button + fireEvent.click is the same pattern already used for
// ToggleSwitch/FooterNavigation's own "Controlled" test harnesses.
function Harness({ targets }: { readonly targets: readonly ScreenId[] }): ReactElement {
  const { navigateTo } = useNavigation();
  return (
    <>
      {targets.map((target) => (
        <button key={target} type="button" onClick={() => navigateTo(target)}>
          {`go-${target}`}
        </button>
      ))}
      <RouteTransition />
    </>
  );
}

function renderTransition(initialScreen: ScreenId, targets: readonly ScreenId[]) {
  const utils = render(
    <PreferencesProvider>
      <NavigationProvider initialScreen={initialScreen}>
        <Harness targets={targets} />
      </NavigationProvider>
    </PreferencesProvider>,
  );

  return { ...utils, navigate: (to: ScreenId) => fireEvent.click(utils.getByText(`go-${to}`)) };
}

describe('RouteTransition', () => {
  it('renders the current screen on mount, with no exiting layer', () => {
    const { container } = renderTransition('permission', []);
    expect(screen.getByText('Permission (stub)')).not.toBeNull();
    // Only one screen's worth of content should be present - no leftover "exiting" layer on mount.
    expect(container.querySelectorAll('[class*="layer_"]').length).toBe(1);
  });

  it('keeps the outgoing screen mounted (fadeOut) alongside the incoming one after a footer-style switch', () => {
    const { container, navigate } = renderTransition('permission', ['settings']);
    navigate('settings');

    expect(screen.getByText('Permission (stub)')).not.toBeNull(); // still there, fading out
    expect(screen.getByText('Advanced mode')).not.toBeNull(); // Settings screen, entering
    expect(container.querySelector('[class*="exitFadeOut"]')).not.toBeNull();
  });

  it('opening Select Tuning: the previous screen stays static underneath, Select Tuning slides in', () => {
    const { container, navigate } = renderTransition('settings', ['select-tuning']);
    navigate('select-tuning');

    expect(screen.getByText('Advanced mode')).not.toBeNull(); // Settings, static underneath
    expect(screen.getByText('Select tuning')).not.toBeNull(); // Select Tuning, entering
    expect(container.querySelector('[class*="enterSlideInRight"]')).not.toBeNull();
    // The underneath screen must not itself carry an exit animation class.
    expect(container.querySelector('[class*="exitFadeOut"]')).toBeNull();
    expect(container.querySelector('[class*="exitSlideOutRight"]')).toBeNull();
  });

  it('closing Select Tuning: it slides out on top while the target screen sits static underneath', () => {
    const { container, navigate } = renderTransition('select-tuning', ['settings']);
    navigate('settings');

    expect(screen.getByText('Select tuning')).not.toBeNull(); // exiting, on top
    expect(screen.getByText('Advanced mode')).not.toBeNull(); // target, already revealed underneath
    expect(container.querySelector('[class*="exitSlideOutRight"]')).not.toBeNull();
  });

  it('a second navigation before the first exit finishes evicts the first exiting screen immediately', () => {
    const { navigate } = renderTransition('permission', ['settings', 'select-tuning']);
    navigate('settings'); // permission now exiting (fadeOut), unfinished
    expect(screen.getByText('Permission (stub)')).not.toBeNull();

    navigate('select-tuning'); // settings now exiting instead - permission must be gone, not stacked
    expect(screen.queryByText('Permission (stub)')).toBeNull();
    expect(screen.getByText('Advanced mode')).not.toBeNull(); // settings, now exiting (staticUnderneath)
    expect(screen.getByText('Select tuning')).not.toBeNull();
  });

  it('reduced motion: swaps instantly with no exiting layer at all', () => {
    ReducedMotion(true);
    const { container, navigate } = renderTransition('permission', ['settings']);
    navigate('settings');

    expect(screen.queryByText('Permission (stub)')).toBeNull();
    expect(screen.getByText('Advanced mode')).not.toBeNull();
    expect(container.querySelectorAll('[class*="layer_"]').length).toBe(1);
  });
});
