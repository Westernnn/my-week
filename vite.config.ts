import { defineConfig } from 'vite';

export default defineConfig({
  // './' = relative URLs, so the app works at any address, e.g. https://name.github.io/my-week/
  base: './',
  build: {
    rollupOptions: {
      // One JS file, so the single-file build (scripts/make-single.mjs) can inline everything
      output: { inlineDynamicImports: true },
    },
  },
});
