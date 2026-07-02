import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  preview: {
    host: '0.0.0.0',
    port: parseInt(process.env.PORT || '4173'),
    allowedHosts: ['keeper-lng8.onrender.com'],
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
  },
});
