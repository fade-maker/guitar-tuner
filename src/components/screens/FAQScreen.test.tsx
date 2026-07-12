// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import type { ReactElement } from 'react';
import { afterEach, describe, expect, it } from 'vitest';
import { NavigationProvider, useNavigation } from '../../navigation';
import { PreferencesProvider } from '../../preferences';
import { FAQScreen } from './FAQScreen';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function Probe(): ReactElement {
  const { screen: current } = useNavigation();
  return <span data-testid="current-screen">{current}</span>;
}

function renderScreen() {
  return render(
    <PreferencesProvider>
      <NavigationProvider initialScreen="faq">
        <FAQScreen />
        <Probe />
      </NavigationProvider>
    </PreferencesProvider>,
  );
}

describe('FAQScreen', () => {
  it('renders the title and every question, collapsed by default', () => {
    renderScreen();
    expect(screen.getByText('FAQ')).not.toBeNull();
    expect(screen.getByText(/can’t hear my guitar/)).not.toBeNull();
    // The answer text is always in the DOM (grid-based accordion, not conditional rendering) but
    // its wrapper starts collapsed.
    const answer = screen.getByText(/microphone access is allowed/);
    const wrapper = answer.closest('div')?.parentElement;
    expect(wrapper?.className).not.toMatch(/expandWrapperOpen/);
  });

  it('expands a question on click and collapses it again on a second click', () => {
    renderScreen();
    const questionButton = screen.getByRole('button', { name: /can’t hear my guitar/ });
    const answer = screen.getByText(/microphone access is allowed/);
    const wrapper = () => answer.closest('div')?.parentElement;

    fireEvent.click(questionButton);
    expect(wrapper()?.className).toMatch(/expandWrapperOpen/);

    fireEvent.click(questionButton);
    expect(wrapper()?.className).not.toMatch(/expandWrapperOpen/);
  });

  it('navigates back to Settings via the back button', () => {
    renderScreen();
    fireEvent.click(screen.getByRole('button', { name: 'Back to Settings' }));
    expect(screen.getByTestId('current-screen').textContent).toBe('settings');
  });
});
