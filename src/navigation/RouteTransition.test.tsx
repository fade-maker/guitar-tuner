// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { PreferencesProvider } from '../preferences';
import { NavigationProvider } from './NavigationProvider';
import { RouteTransition } from './RouteTransition';
import styles from './RouteTransition.module.css';
import { useNavigation } from './useNavigation';
import type { ScreenId } from './types';

// jsdom does not implement AnimationEvent at all (confirmed directly: 'AnimationEvent' in
// window is false), and a plain Event dispatched as a stand-in for it does not fire React's
// onAnimationEnd handler either - confirmed with a minimal isolated repro before concluding this,
// not assumed. So the "Select Tuning's layer is removed once its animation reports finished"
// behavior is not something this file can exercise - verified instead via a real browser
// (Playwright) against the actual built output, where real animationend events fire naturally.

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

// Settings' text ("Advanced mode") is unique to it - this finds its wrapper `.layer` regardless of
// whether that layer currently also carries `.hidden`.
function settingsLayer(container: HTMLElement): Element | null {
  return (
    Array.from(container.querySelectorAll(`.${styles.layer}`)).find((el) => el.textContent?.includes('Advanced mode')) ??
    null
  );
}

describe('RouteTransition', () => {
  it('does not mount Settings at all before it has ever been visited', () => {
    const { container } = renderTransition('permission', []);
    expect(screen.queryByText('Advanced mode')).toBeNull();
    expect(container.querySelectorAll(`.${styles.layer}`).length).toBe(1);
  });

  it('a switch between two non-Select-Tuning, non-Settings screens is an instant swap', () => {
    const { container, navigate } = renderTransition('permission', ['simple-tuner']);
    navigate('simple-tuner');
    expect(screen.queryByText('Request access')).toBeNull();
    expect(container.querySelectorAll(`.${styles.layer}`).length).toBe(1);
  });

  it('keeps Settings mounted (hidden, not removed) after navigating away from it', () => {
    const { container, navigate } = renderTransition('permission', ['settings', 'permission']);
    navigate('settings');
    const layerOnFirstVisit = settingsLayer(container);
    expect(layerOnFirstVisit).not.toBeNull();
    expect(layerOnFirstVisit?.classList.contains(styles.hidden)).toBe(false);

    navigate('permission');
    const layerAfterLeaving = settingsLayer(container);
    expect(layerAfterLeaving).toBe(layerOnFirstVisit); // same DOM node - not unmounted and remounted
    expect(layerAfterLeaving?.classList.contains(styles.hidden)).toBe(true);
  });

  it('shows the same persistent Settings node again (not a fresh mount) on a second visit', () => {
    const { container, navigate } = renderTransition('permission', ['settings', 'permission']);
    navigate('settings');
    const firstVisitNode = settingsLayer(container);

    navigate('permission');
    navigate('settings');
    const secondVisitNode = settingsLayer(container);

    expect(secondVisitNode).toBe(firstVisitNode);
    expect(secondVisitNode?.classList.contains(styles.hidden)).toBe(false);
  });

  it('opening Select Tuning from Settings: Settings stays visible underneath, Select Tuning is on top', () => {
    const { container, navigate } = renderTransition('settings', ['select-tuning']);
    navigate('select-tuning');

    const settings = settingsLayer(container);
    expect(settings).not.toBeNull();
    expect(settings?.classList.contains(styles.hidden)).toBe(false);
    expect(screen.getByText('Select tuning')).not.toBeNull();

    // Select Tuning's own layer must come after Settings' in DOM order, so it stacks visually on top.
    const selectTuningLayer = container.querySelector(`.${styles.enterSlideInRight}`);
    expect(selectTuningLayer).not.toBeNull();
    expect(settings!.compareDocumentPosition(selectTuningLayer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('closing Select Tuning back to Settings: Select Tuning stays on top while it slides away, Settings is revealed underneath', () => {
    const { container, navigate } = renderTransition('select-tuning', ['settings']);
    navigate('settings');

    const settings = settingsLayer(container);
    expect(settings).not.toBeNull();
    expect(settings?.classList.contains(styles.hidden)).toBe(false);

    const selectTuningLayer = container.querySelector(`.${styles.exitSlideOutRight}`);
    expect(selectTuningLayer).not.toBeNull();
    expect(screen.getByText('Select tuning')).not.toBeNull();

    // The regression this structure was rewritten to fix: Select Tuning must render *after* (on top
    // of) Settings' persistent layer here, not before it.
    expect(settings!.compareDocumentPosition(selectTuningLayer!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('opening Select Tuning from a non-Settings screen: the previous screen stays static underneath', () => {
    const { container, navigate } = renderTransition('permission', ['select-tuning']);
    navigate('select-tuning');

    expect(screen.getByText('Request access')).not.toBeNull();
    expect(screen.getByText('Select tuning')).not.toBeNull();
    expect(container.querySelector(`.${styles.enterSlideInRight}`)).not.toBeNull();
  });

  it('closing Select Tuning to a non-Settings screen: it slides out while the target sits static underneath', () => {
    const { container, navigate } = renderTransition('select-tuning', ['permission']);
    navigate('permission');

    expect(screen.getByText('Select tuning')).not.toBeNull();
    expect(screen.getByText('Request access')).not.toBeNull();
    expect(container.querySelector(`.${styles.exitSlideOutRight}`)).not.toBeNull();
  });

  it('opening or closing Select Tuning renders a backdrop scrim behind the sheet', () => {
    const { container, navigate } = renderTransition('permission', ['select-tuning']);
    navigate('select-tuning');
    expect(container.querySelector(`.${styles.scrimIn}`)).not.toBeNull();
  });

  it('reduced motion: Select Tuning swaps instantly, with no animated layer or scrim at all', () => {
    ReducedMotion(true);
    const { container, navigate } = renderTransition('settings', ['select-tuning']);
    navigate('select-tuning');

    // Settings is hidden (not removed - it's kept alive), Select Tuning is the plain, unanimated
    // "underneath" screen since no `exiting` entry was ever created.
    expect(settingsLayer(container)?.classList.contains(styles.hidden)).toBe(true);
    expect(screen.getByText('Select tuning')).not.toBeNull();
    expect(container.querySelector(`.${styles.enterSlideInRight}`)).toBeNull();
    expect(container.querySelector(`.${styles.exitSlideOutRight}`)).toBeNull();
    expect(container.querySelector(`.${styles.scrim}`)).toBeNull();
  });
});
