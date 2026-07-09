import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { AppShell } from '../components/layout';
import { NavigationProvider } from '../navigation';
import { PreferencesProvider } from '../preferences';

// Renders AppShell (not the screen directly) - AppShell is what actually owns ViewportScreen's
// real-height sizing and the Bottom Navigation slot now; mounting a screen on its own here would
// leave it with no flex parent to size against (see the AppShell architecture log in CLAUDE.md).
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <NavigationProvider initialScreen="advanced-tuner">
        <AppShell />
      </NavigationProvider>
    </PreferencesProvider>
  </StrictMode>,
);
