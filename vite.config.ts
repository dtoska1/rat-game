import { defineConfig } from 'vite';

// Relative paths work on Cloudflare or at a nested GitHub Pages URL.
export default defineConfig({
  base: './',
  plugins: [],
  build: { target: 'es2022', outDir: 'dist' },
});
