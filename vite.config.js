import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  server: { host: true },
  preview: { host: true },
  build: { chunkSizeWarningLimit: 2000 } // Phaser is ~1.2MB; silence the warning
});
