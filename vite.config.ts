import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { VitePWA } from 'vite-plugin-pwa'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  plugins: [
    vue(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'Nura',
        short_name: 'Nura',
        theme_color: '#37B3B3',
        background_color: '#37B3B3',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],

  // 🔥 AGREGADO: PROXY PARA EVITAR CORS Y PERMITIR LLAMAR A RENDER
  server: {
    proxy: {
      '/api': {
        target: 'https://nura-backend-vvuv.onrender.com',
        changeOrigin: true,
        secure: false,
      }
    }
  },

  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  }
})
