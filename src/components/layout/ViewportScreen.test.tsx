// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { ViewportScreen } from './ViewportScreen';

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'Telegram');
});

describe('ViewportScreen', () => {
  it('renders its children', () => {
    render(
      <ViewportScreen>
        <span>content</span>
      </ViewportScreen>,
    );
    expect(screen.getByText('content')).not.toBeNull();
  });

  it('merges a caller-provided className alongside the shell class', () => {
    const { container } = render(
      <ViewportScreen className="my-screen">
        <span>content</span>
      </ViewportScreen>,
    );
    const root = container.firstElementChild as HTMLElement;
    expect(root.className).toMatch(/viewportScreen/);
    expect(root.className).toMatch(/my-screen/);
  });

  it('does not set the Telegram viewport height custom property outside Telegram', () => {
    const { container } = render(<ViewportScreen>content</ViewportScreen>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--tg-viewport-height')).toBe('');
  });

  it('sets the Telegram viewport height custom property when running inside Telegram', () => {
    Object.defineProperty(window, 'Telegram', {
      value: { WebApp: { viewportHeight: 611 } },
      configurable: true,
    });

    const { container } = render(<ViewportScreen>content</ViewportScreen>);
    const root = container.firstElementChild as HTMLElement;
    expect(root.style.getPropertyValue('--tg-viewport-height')).toBe('611px');
  });

  it('renders the footer prop last, in its own slot', () => {
    render(
      <ViewportScreen footer={<span>my footer</span>}>
        <span>my content</span>
      </ViewportScreen>,
    );
    expect(screen.getByText('my footer')).not.toBeNull();
  });

  it('renders no footer slot at all when the footer prop is omitted', () => {
    const { container } = render(
      <ViewportScreen>
        <span>my content</span>
      </ViewportScreen>,
    );
    expect(container.querySelectorAll('div').length).toBe(1); // just the shell itself
  });
});
