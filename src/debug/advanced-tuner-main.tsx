import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../index.css';
import { AdvancedTunerScreen } from '../components/screens';
import { NavigationProvider } from '../navigation';
import { PreferencesProvider } from '../preferences';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <NavigationProvider initialScreen="advanced-tuner">
        <AdvancedTunerScreen />
      </NavigationProvider>
    </PreferencesProvider>
  </StrictMode>,
);
