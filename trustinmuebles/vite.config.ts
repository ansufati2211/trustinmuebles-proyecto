import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  base: '/trustinmuebles/', // Cambia esto por el nombre de tu repo (ej. '/trustinmuebles/')
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // En desarrollo, /api se reenvía al backend de Spring Boot (evita CORS)
    proxy: {
      '/api': 'http://localhost:8080',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})