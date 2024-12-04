import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'arweave': ['arweave'],
          'react-vendor': ['react', 'react-dom'],
          'maps': ['leaflet', 'react-leaflet'],
        },
        entryFileNames: '[name].[hash].js',
        chunkFileNames: '[name].[hash].js',
        assetFileNames: '[name].[hash].[ext]'
      }
    },
    chunkSizeWarningLimit: 1000
  },
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: "globalThis",
      },
    },
  },
})
