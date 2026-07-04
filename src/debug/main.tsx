import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { PreferencesProvider } from '../preferences';
import { DebugSettingsPanel } from './DebugSettingsPanel';

// Separate entry point (debug.html), not imported by src/main.tsx - this whole folder can be
// deleted later without touching the production entry point at all.
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <DebugSettingsPanel />
    </PreferencesProvider>
  </StrictMode>,
);
