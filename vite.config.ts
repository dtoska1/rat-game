import { defineConfig } from 'vite';

// Keep asset URLs relative for GitHub Pages /rat-game/ and local previews.
export default defineConfig({
  base: './',
  plugins: [],
  build: { target: 'es2022', outDir: 'dist' },
});
