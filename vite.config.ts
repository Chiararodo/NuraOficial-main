import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',

      // Si querés que el SW controle más rápido la app luego de update
      workbox: {
        clientsClaim: true,
        skipWaiting: true,

        runtimeCaching: [
          /**
           * Cache para especialistas (GET).
           * Estrategia: NetworkFirst con timeout corto
           * - Si Render/Netlify tarda o estás offline => responde cache
           * - Si hay red => actualiza cache
           */
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.origin === self.location.origin &&
              url.pathname.startsWith('/api/especialistas'),
            handler: 'NetworkFirst',
            options: {
              cacheName: 'nura-api-especialistas',
              networkTimeoutSeconds: 3,
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 120 // 30–120s (acá está en 120)
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          },

          /**
           * (Opcional, recomendado) Cache para otras requests GET a /api
           * Útil para endpoints tipo /api/ciudades, /api/especialidades, etc.
           * Si no querés cachear nada más, borrá este bloque.
           */
          {
            urlPattern: ({ url, request }) =>
              request.method === 'GET' &&
              url.origin === self.location.origin &&
              url.pathname.startsWith('/api/'),
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'nura-api-general',
              expiration: {
                maxEntries: 60,
                maxAgeSeconds: 60 // cortito para no “ensuciar” datos
              },
              cacheableResponse: {
                statuses: [0, 200]
              }
            }
          }
        ]
      },

      includeAssets: [
        'logos/isotipo.png',
        'logos/apple-touch-icon.png',
        'logos/pwa-192x192.png',
        'logos/pwa-512x512.png',
        'logos/pwa-512x512-maskable.png'
      ],

      manifest: {
        name: 'Nura',
        short_name: 'Nura',
        description: 'Plataforma de bienestar emocional',
        theme_color: '#50bdbd',
        background_color: '#50bdbd',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        orientation: 'portrait',

        icons: [
          { src: '/logos/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/logos/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          {
            src: '/logos/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
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
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})