import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

// Global fetch interceptor to dynamically route API requests
try {
  const originalFetch = window.fetch;
  Object.defineProperty(window, 'fetch', {
    value: function (input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
      if (typeof input === "string" && input.startsWith("/")) {
        const hostname = window.location.hostname;
        const isLocalOrDev =
          hostname === "localhost" ||
          hostname === "127.0.0.1" ||
          hostname.includes("ais-dev") ||
          hostname.includes("ais-pre");

        const isBackendDomain = hostname.includes("abms-lkw9.onrender.com");

        if (!isLocalOrDev && !isBackendDomain) {
          input = `https://abms-lkw9.onrender.com${input}`;
        }
      }
      return originalFetch(input, init);
    },
    writable: true,
    configurable: true,
    enumerable: true
  });
} catch (e) {
  console.warn("Failed to define custom window.fetch interceptor:", e);
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

