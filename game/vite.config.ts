import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { resolve } from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@haven/shared': resolve(__dirname, '../shared/src/types.ts'),
    },
  },
  server: {
    port: 5173,
  },
  build: {
    // Raise the inline-asset size limit to avoid tiny assets becoming fetch requests
    assetsInlineLimit: 4096,
    rollupOptions: {
      output: {
        // Isolate Phaser into its own chunk so the browser can cache it
        // independently from game logic and React UI code.
        manualChunks: {
          phaser:       ['phaser'],
          'react-vendor': ['react', 'react-dom', 'framer-motion'],
        },
      },
    },
  },
})
