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
  },
  server: { port: 5199 },
})
