/**
 * Production build for the mobile app (`npm run build` → dist/): three.js and the fonts are
 * bundled so the game opens without internet. The web/dev version keeps using the import
 * map and Google Fonts (index.html) through `npm start`.
 */
import { defineConfig } from 'vite';
import { cpSync, existsSync } from 'node:fs';

const offlineHtml = {
  name: 'offline-html',
  transformIndexHtml: {
    order: 'pre', // before Vite collects the scripts, so fonts.js gets bundled
    handler: (html) => html
      .replace(/<script type="importmap">[\s\S]*?<\/script>\s*/, '')
      .replace(/<link rel="preconnect"[^>]*>\s*/, '')
      .replace(/<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>\s*/, '')
      .replace('<script type="module" src="src/main.js"></script>', '<script type="module" src="src/fonts.js"></script>\n<script type="module" src="src/main.js"></script>'),
  },
};

// game data loaded at runtime by path (textures, manifest, models); the 120 MB Piper voices stay out
const copyGameAssets = {
  name: 'copy-game-assets',
  closeBundle() {
    cpSync('assets', 'dist/assets', { recursive: true, filter: (src) => !src.includes('/voices') });
    cpSync('sw.js', 'dist/sw.js'); // the website's service worker (always the newest game; the app does not use it)
  },
};

export default defineConfig({
  base: './',
  plugins: [offlineHtml, copyGameAssets],
  build: {
    outDir: 'dist',
    assetsDir: 'bundle',
    target: 'es2022',
    chunkSizeWarningLimit: 1500,
    rollupOptions: { external: [/^https:\/\//] },
  },
  worker: { format: 'es', rollupOptions: { external: [/^https:\/\//] } },
});
