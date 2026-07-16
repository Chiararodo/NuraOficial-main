import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),

    VitePWA({
      registerType: 'autoUpdate',

      injectRegister: 'auto',

      includeAssets: [
        'logos/isotipo.png',
        'logos/apple-touch-icon.png',
        'logos/pwa-192x192.png',
        'logos/pwa-512x512.png',
        'logos/pwa-512x512-maskable.png'
      ],

      manifest: {
        id: '/',
        name: 'Nura',
        short_name: 'Nura',

        description:
          'Plataforma de bienestar emocional, acompañamiento y comunidad.',

        theme_color: '#50bdbd',
        background_color: '#f8fafa',

        display: 'standalone',
        display_override: ['window-controls-overlay', 'standalone'],

        start_url: '/',
        scope: '/',

        orientation: 'portrait-primary',

        categories: [
          'health',
          'lifestyle',
          'social'
        ],

        lang: 'es-AR',

        icons: [
          {
            src: '/logos/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logos/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/logos/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },

      workbox: {
        cleanupOutdatedCaches: true,

        navigateFallback: '/index.html',

        globPatterns: [
          '**/*.{js,css,html,ico,png,svg,webp,woff,woff2}'
        ]
      },

      devOptions: {
        enabled: true,
        type: 'module'
      }
    })
  ],

  server: {
    proxy: {
      '/api': {
        target: 'https://nura-backend-vvuv.onrender.com',
        changeOrigin: true,
        secure: false
      }
    }
  },

  resolve: {
    alias: {
      '@': fileURLToPath(
        new URL('./src', import.meta.url)
      )
    }
  }
})