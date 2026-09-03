import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import './styles.css';
import { App } from './App';

const root = document.getElementById('root')!;
const app = (
  <StrictMode>
    <App />
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
