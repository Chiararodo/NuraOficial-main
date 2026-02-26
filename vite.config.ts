import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',

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
          {
            src: '/logos/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: '/logos/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
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