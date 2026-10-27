/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.ico', 'apple-touch-icon-180x180.png', 'icon.svg'],
      manifest: {
        name: 'CarGuard — فحص السيارة',
        short_name: 'CarGuard',
        description: 'أداة محلية لمساعدتك على فحص سيارتك بحثًا عن أجهزة تتبع أو تسجيل مشتبه بها.',
        lang: 'ar',
        dir: 'rtl',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'portrait',
        background_color: '#0b1014',
        theme_color: '#0b1014',
        icons: [
          { src: 'pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        // The detection runtime and model are large and optional: never precache them on install.
        globIgnores: ['**/models/**', '**/assets/tf-*.js', '**/assets/coco-*.js'],
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            // Model files are immutable; cache after the user opts in so detection also works offline.
            urlPattern: ({ url }) => url.origin === self.location.origin && (url.pathname.startsWith('/models/') || /\/assets\/(tf|coco)-/.test(url.pathname)),
            handler: 'CacheFirst',
            options: { cacheName: 'carguard-detection-model', expiration: { maxEntries: 20 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        // Name the lazy detection chunks so the service worker can treat them separately.
        manualChunks(id) {
          if (id.includes('@tensorflow-models/coco-ssd')) return 'coco'
          if (id.includes('@tensorflow/')) return 'tf'
          return undefined
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    coverage: { include: ['src/**'], exclude: ['src/test/**', 'src/main.tsx'] },
  },
})
