import { defineConfig } from 'vite';

// Relative paths work both at a GitHub Pages project URL and on a custom domain.
export default defineConfig({
  base: './',
  build: { target: 'es2022', outDir: 'dist' },
});
