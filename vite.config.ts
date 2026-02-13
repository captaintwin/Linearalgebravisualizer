
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY),
  },
  build: {
    rollupOptions: {
      external: [
        // Core dependencies should be bundled into the application for deployment
      ],
    },
  },
  server: {
    port: 3000,
  },
});
