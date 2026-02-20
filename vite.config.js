import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 1200, // 27 locales × 329 keys + Stock.jsx = intentional large bundle (zero loading time)
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3700',
        changeOrigin: true,
      }
    }
  }
})
