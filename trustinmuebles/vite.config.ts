import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

export default defineConfig({
  base: '/',
  plugins: [
    react(),
    tailwindcss(),
  ],
  server: {
    // En desarrollo, /api se reenvía al backend de Spring Boot (evita CORS)
    proxy: {
      '/api': 'http://localhost:8080',
      // v1.0 (etapa 6): robots.txt lo arma el servidor según app.sitio.indexable.
      '/robots.txt': 'http://localhost:8080',
    },
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})