import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cache-Control': 'no-store',
      'Pragma': 'no-cache',
      'Expires': '0',
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          'arweave': ['arweave'],
          'react-vendor': ['react', 'react-dom'],
          'maps': ['leaflet', 'react-leaflet'],
        },
        entryFileNames: 'assets/[name].[hash].js',
        chunkFileNames: 'assets/[name].[hash].js',
        assetFileNames: 'assets/[name].[hash].[ext]'
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
