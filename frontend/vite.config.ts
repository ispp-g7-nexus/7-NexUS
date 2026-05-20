import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    port: 5173,
    allowedHosts: ['demo.nexus.local', '.nbynexus.com'],
    proxy: {
      '/api': {
        target: 'http://demo.nexus.local',
        changeOrigin: true,
        secure: false,
      },
      // Las imágenes subidas (p. ej. fotos de los platos del menú) se sirven
      // desde el backend en /media; sin este proxy no se ven en desarrollo.
      '/media': {
        target: 'http://demo.nexus.local',
        changeOrigin: true,
        secure: false,
      }
    }
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
})