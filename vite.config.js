import { defineConfig } from 'vite'

// Hashed /assets/* (the service worker caches them forever), modern output, no source maps shipped.
// SITE_BASE: where the site is served from (/ locally; /watchnight/ on GitHub Pages)
export default defineConfig({
  base: process.env.SITE_BASE || '/',
  build: {
    outDir: 'dist',
    target: 'es2022',
    cssMinify: true,
    assetsInlineLimit: 0,
    // (WN-77) three pages: the house, and the privacy policy and terms
    rollupOptions: { input: { main: 'index.html', privacy: 'privacy.html', terms: 'terms.html' } },
  },
  server: { port: 5199 },
})
