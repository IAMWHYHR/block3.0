import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Ensure proper resolution of modules
      // Use local y-protocols source instead of node_modules
      'y-protocols': path.resolve(__dirname, './src/y-protocol'),
      'y-protocols/awareness': path.resolve(__dirname, './src/y-protocol/awareness.js'),
      'y-protocols/sync': path.resolve(__dirname, './src/y-protocol/sync.js'),
      'y-protocols/auth': path.resolve(__dirname, './src/y-protocol/auth.js')
    }
  },
  optimizeDeps: {
    include: ['@lifeomic/attempt']
  }
})










