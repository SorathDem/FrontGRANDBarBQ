import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// El backend ya permite CORS desde http://localhost:5500, así que usamos ese
// puerto en desarrollo para que el panel funcione sin configuración extra.
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5500,
    strictPort: true,
  },
  preview: {
    port: 5500,
    strictPort: true,
  },
});
