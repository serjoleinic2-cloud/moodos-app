import { defineConfig } from 'vite';
import { resolve } from 'path';
import { viteStaticCopy } from 'vite-plugin-static-copy';

export default defineConfig({
  root: 'www',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'www/index.html')
    }
  },
  plugins: [
    viteStaticCopy({
      targets: [
        {
          src: './assets',
          dest: 'assets'
        }
      ]
    })
  ]
});