import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  plugins: [react(), tailwindcss()],
  build: {
    target: 'es2022',
    sourcemap: false,
    cssMinify: true,
    reportCompressedSize: false,
  },
  server: {
    host: '127.0.0.1',
    port: 5173,
  },
});
