import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ComponentGallery } from './ComponentGallery';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ComponentGallery />
  </StrictMode>,
);
