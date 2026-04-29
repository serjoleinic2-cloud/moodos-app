import { defineConfig } from 'vite';
import { readFileSync, cpSync, existsSync, copyFileSync } from 'fs';
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
    },
    {
      name: 'copy-pwa-files',
      closeBundle() {
        const swSrc = resolve(__dirname, 'www/sw.js');
        const swDst = resolve(__dirname, 'dist/sw.js');
        if (existsSync(swSrc)) {
          copyFileSync(swSrc, swDst);
          console.log('[copy-pwa-files] sw.js → dist/ ✓');
        }
        const mfSrc = resolve(__dirname, 'www/manifest.json');
        const mfDst = resolve(__dirname, 'dist/manifest.json');
        if (existsSync(mfSrc)) {
          copyFileSync(mfSrc, mfDst);
          console.log('[copy-pwa-files] manifest.json → dist/ ✓');
        }
        const cssSrc = resolve(__dirname, 'www/css');
        const cssDst = resolve(__dirname, 'dist/css');
        if (existsSync(cssSrc)) {
          cpSync(cssSrc, cssDst, { recursive: true });
          console.log('[copy-pwa-files] css/ → dist/ ✓');
        }
        const stylesSrc = resolve(__dirname, 'www/styles');
        const stylesDst = resolve(__dirname, 'dist/styles');
        if (existsSync(stylesSrc)) {
          cpSync(stylesSrc, stylesDst, { recursive: true });
          console.log('[copy-pwa-files] styles/ → dist/ ✓');
        }
      }
    }
  ]
});