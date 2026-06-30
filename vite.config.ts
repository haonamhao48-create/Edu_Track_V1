import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/ws/chat': {
        target: 'https://api.edutrack.io.vn',
        ws: true,
        changeOrigin: true,
        secure: false,
      },
      '/api/admin': {
        target: 'https://api.edutrack.io.vn',
        changeOrigin: true,
        secure: false,
      },
      '/api': {
        target: 'https://api.edutrack.io.vn',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})
