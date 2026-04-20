import { defineConfig } from 'vite';

export default defineConfig({
  root: 'www',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: 'www/index.html'
    }
  },
  resolve: {
    alias: {}
  }
});