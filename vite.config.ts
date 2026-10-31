import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: '/home-assistant/',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'icons/icon-192.png', 'icons/icon-512.png'],
      manifest: {
        name: 'Our Home',
        short_name: 'Our Home',
        description: 'Kitchen tablet for Sehrish and André in Seddiner See.',
        theme_color: '#3c6b54',
        background_color: '#f6f1e8',
        display: 'standalone',
        orientation: 'any',
        start_url: '/home-assistant/',
        scope: '/home-assistant/',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        navigateFallback: '/home-assistant/index.html',
        globPatterns: ['**/*.{js,css,html,svg,png,ico,webmanifest,woff2}'],
      },
    }),
  ],
});
