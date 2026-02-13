
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
        'react',
        'react-dom',
        'three',
        'd3',
        'katex',
        '@google/genai'
      ],
    },
  },
  server: {
    port: 3000,
  },
});
