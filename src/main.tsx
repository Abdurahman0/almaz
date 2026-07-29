import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import { RouterProvider } from 'react-router-dom';
import { AppProviders } from './app/providers';
import { router } from './app/router';
import './index.css';

// A new deploy replaces hashed chunk files; a tab opened against the old deploy
// 404s on lazy imports ("Failed to fetch dynamically imported module"). The
// router's loadPage() recovers with a one-time reload — here we just stop Vite
// from rethrowing the preload error to window (which would surface a raw error).
window.addEventListener('vite:preloadError', (e) => e.preventDefault());

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <AppProviders>
      <RouterProvider router={router} />
    </AppProviders>
  </React.StrictMode>,
);
