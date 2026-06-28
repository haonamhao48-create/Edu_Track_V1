import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws/chat': {
        target: 'http://localhost:7007',
        ws: true,
        changeOrigin: true,
      },
      '/api/admin': {
        target: 'http://localhost:8085',
        changeOrigin: true,
      },
      '/api': {
        target: 'http://localhost:7007',
        changeOrigin: true,
      }
    }
  }
})
