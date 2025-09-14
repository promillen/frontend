import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Dev safeguard: suppress noisy postMessage origin mismatch warnings when app runs in an iframe
(() => {
  try {
    const isFramed = window.top !== window.self;
    if (isFramed && typeof window.postMessage === 'function') {
      const original: any = (window.postMessage as any).bind(window);
      let warned = false;
      (window as any).postMessage = (message: any, targetOrigin?: any, transfer?: any) => {
        try {
          return original(message, targetOrigin, transfer);
        } catch (err: any) {
          const msg = String(err?.message || '');
          if (msg.includes("does not match the recipient window's origin")) {
            if (!warned) {
              console.warn('postMessage origin mismatch suppressed (preview iframe).');
              warned = true;
            }
            return; // swallow this specific noisy warning
          }
          throw err;
        }
      };
    }
  } catch {}
})();

createRoot(document.getElementById("root")!).render(<App />);

