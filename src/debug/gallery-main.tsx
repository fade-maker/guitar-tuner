import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { NavigationProvider } from '../navigation';
import { PreferencesProvider } from '../preferences';
import { ComponentGallery } from './ComponentGallery';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <PreferencesProvider>
      <NavigationProvider>
        <ComponentGallery />
      </NavigationProvider>
    </PreferencesProvider>
  </StrictMode>,
);
