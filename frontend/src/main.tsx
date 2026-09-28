import './sentry';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import * as Sentry from '@sentry/react';
import './styles.css';
import { App } from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <Sentry.ErrorBoundary
      fallback={
        <main role="alert">
          <h1>Die Seite konnte nicht geladen werden.</h1>
          <p>Bitte lade die Seite neu.</p>
          <button type="button" onClick={() => window.location.reload()}>Seite neu laden</button>
        </main>
      }
    >
      <App />
    </Sentry.ErrorBoundary>
  </StrictMode>
);

if (root.hasChildNodes()) {
  const isDynamicRepairRequest = /^\/hilfe\/anfragen\/[a-f0-9]{32}\/?$/.test(window.location.pathname);
  if (isDynamicRepairRequest) {
    root.replaceChildren();
    createRoot(root).render(app);
  } else {
    hydrateRoot(root, app);
  }
} else {
  createRoot(root).render(app);
}
