import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0', // Listen on all network interfaces
    strictPort: false,
    fs: {
      allow: ['..'] // Allow access to parent directories for WASM files
    }
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      output: {
        manualChunks: {
          tensorflow: ['@tensorflow/tfjs', '@tensorflow/tfjs-vis'],
          charts: ['chart.js', 'react-chartjs-2'],
          react: ['react', 'react-dom', 'react-router-dom']
        }
      }
    }
  },
  optimizeDeps: {
    include: ['@tensorflow/tfjs', '@tensorflow/tfjs-vis'],
    exclude: ['pong.js'] // Don't pre-bundle our WASM module
  },
  assetsInclude: ['**/*.wasm'] // Include WASM files as assets
})
