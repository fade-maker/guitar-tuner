// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import type { ScreenId } from './types';
import { AppRouter } from './AppRouter';
import { NavigationProvider } from './NavigationProvider';

afterEach(() => {
  cleanup();
});

describe('AppRouter', () => {
  it.each([
    ['simple-tuner', 'Simple Tuner (stub)'],
    ['advanced-tuner', 'Advanced Tuner (stub)'],
    ['select-tuning', 'Select Tuning (stub)'],
    ['settings', 'Settings (stub)'],
    ['permission', 'Permission (stub)'],
  ] as const satisfies readonly (readonly [ScreenId, string])[])('renders the %s screen', (initialScreen, text) => {
    render(
      <NavigationProvider initialScreen={initialScreen}>
        <AppRouter />
      </NavigationProvider>,
    );

    expect(screen.getByText(text)).not.toBeNull();
  });
});
