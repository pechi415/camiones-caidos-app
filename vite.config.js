import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'cat-header-logo.jpg', 'drummond-logo.png'],
      manifest: {
        name: 'Camiones Caídos - Control de Flotas',
        short_name: 'Camiones Caídos',
        description: 'Sistema de Registro y Reporte de Camiones Caídos para Minas Pribbenow y El Descanso',
        theme_color: '#0F1115',
        background_color: '#0F1115',
        display: 'standalone',
        orientation: 'any',
        scope: '/',
        start_url: '/',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any'
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          }
        ]
      },
      devOptions: {
        enabled: true
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('node_modules/xlsx') ||
            id.includes('node_modules/codepage') ||
            id.includes('node_modules/cfb') ||
            id.includes('node_modules/ssf') ||
            id.includes('node_modules/adler-32') ||
            id.includes('node_modules/crc-32') ||
            id.includes('node_modules/wmf') ||
            id.includes('node_modules/word')
          ) {
            return 'vendor-export-xlsx';
          }
          if (
            id.includes('node_modules/jspdf') ||
            id.includes('node_modules/jspdf-autotable') ||
            id.includes('node_modules/html2canvas') ||
            id.includes('node_modules/dompurify') ||
            id.includes('node_modules/purify')
          ) {
            return 'vendor-export-pdf';
          }
          if (id.includes('node_modules/@supabase/')) {
            return 'vendor-supabase';
          }
          if (
            id.includes('node_modules/react/') ||
            id.includes('node_modules/react-dom/') ||
            id.includes('node_modules/scheduler/')
          ) {
            return 'vendor-react';
          }
        }
      }
    }
  }
})
