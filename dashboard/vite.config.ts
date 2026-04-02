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
    port: 5174,
  },
  build: {
    rollupOptions: {
      output: {
        // Split heavy chart/animation libs so the initial React bundle is lean
        manualChunks: {
          recharts:       ['recharts'],
          'framer-motion': ['framer-motion'],
          'react-vendor':  ['react', 'react-dom'],
        },
      },
    },
  },
})
