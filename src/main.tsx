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
        const path = input;
        const isApiRoute = 
          path.startsWith("/login") || 
          path.startsWith("/m/") || 
          path.startsWith("/class/") || 
          path.startsWith("/rel/") ||
          path.startsWith("/homework/") ||
          path.startsWith("/api/");
          
        if (isApiRoute) {
          input = `https://abms-lkw9.onrender.com${path}`;
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

