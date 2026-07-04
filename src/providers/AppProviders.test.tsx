// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { usePreferences } from '../preferences';
import { AppProviders } from './AppProviders';

afterEach(() => {
  cleanup();
  window.localStorage.clear();
});

function ProbeConsumer() {
  const { preferences } = usePreferences();
  return <span>tunerMode:{preferences.tunerMode}</span>;
}

describe('AppProviders', () => {
  it('makes usePreferences() available to descendants', () => {
    render(
      <AppProviders>
        <ProbeConsumer />
      </AppProviders>,
    );

    expect(screen.getByText('tunerMode:simple')).not.toBeNull();
  });
});
