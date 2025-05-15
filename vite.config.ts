
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// Remove the import of componentTagger
// import { componentTagger } from "lovable-tagger"

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  plugins: [
    react(),
    // Remove the tagger plugin since it's not available
    // mode === 'development' && componentTagger(),
  ].filter(Boolean),
  server: {
    host: "::",
    port: 8080,
        allowedHosts: [
      '6b58493b-0114-46f7-a4b8-0994abcf6210.lovableproject.com'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true
  },
}))
