// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ErrorBoundary } from './ErrorBoundary';

function Bomb(): ReactElement {
  throw new Error('boom');
}

beforeEach(() => {
  // React logs caught render errors loudly (plus this component's own componentDidCatch log) -
  // silence both so intentional-throw tests don't spam the runner output.
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe('ErrorBoundary', () => {
  it('renders children when nothing throws', () => {
    render(
      <ErrorBoundary>
        <span>content</span>
      </ErrorBoundary>,
    );
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('shows the fallback instead of a blank page when a child throws during render', () => {
    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    expect(screen.getByRole('alert')).not.toBeNull();
    expect(screen.getByText('Something went wrong')).not.toBeNull();
  });

  it('the fallback Reload button triggers a page reload', () => {
    const reload = vi.fn();
    const original = window.location;
    Object.defineProperty(window, 'location', {
      value: { ...original, reload },
      configurable: true,
    });

    render(
      <ErrorBoundary>
        <Bomb />
      </ErrorBoundary>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Reload' }));
    expect(reload).toHaveBeenCalled();

    Object.defineProperty(window, 'location', { value: original, configurable: true });
  });
});
