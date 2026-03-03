import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['demo.nexus.local'],
    proxy: {
      '/api': {
        target: 'http://demo.nexus.local',
        changeOrigin: true,
        secure: false,
      }
    }
  }
})