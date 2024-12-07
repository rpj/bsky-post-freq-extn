import { defineConfig } from 'vite';
import { crx } from '@crxjs/vite-plugin';
import manifest from './manifest.json';

export default defineConfig({
  plugins: [crx({ manifest })],
  build: {
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      external: [
        'pico.blue.min.css'
      ]
    }
  }
});