import { defineConfig } from 'vite';
import { readFileSync, cpSync, existsSync } from 'fs';
import { resolve } from 'path';

const pkg = JSON.parse(readFileSync('./package.json', 'utf-8'));

export default defineConfig({
  root: 'www',
  publicDir: resolve(__dirname, 'www/assets'),
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    rollupOptions: {
      input: resolve(__dirname, 'www/index.html'),
      output: {
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
      }
    }
  },
  plugins: [
    {
      name: 'copy-docs',
      closeBundle() {
        const src = resolve(__dirname, 'www/docs');
        const dst = resolve(__dirname, 'dist/docs');
        if (existsSync(src)) {
          cpSync(src, dst, { recursive: true });
          console.log('[copy-docs] www/docs → dist/docs ✓');
        }
      }
    }
  ]
});