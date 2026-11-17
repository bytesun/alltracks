import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

if ('serviceWorker' in navigator && import.meta.env.PROD) {
  // A previously visited site can reopen a QR landing page without network.
  // No background identity, CAPTCHA token or private signing key is cached.
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/sw.js').catch(error => {
      console.warn('Offline app-shell cache unavailable:', error);
    });
  }, { once: true });
}
