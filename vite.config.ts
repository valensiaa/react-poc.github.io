import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import cssInjectedByJs from 'vite-plugin-css-injected-by-js'

export default defineConfig({
  base: '/react-poc.github.io/', // must match the GitHub repo name for Pages asset paths
  plugins: [
    react(),
    cssInjectedByJs(), // inlines CSS into the JS bundle — one file to host
  ],
  build: {
    rollupOptions: {
      output: {
        entryFileNames: 'widget.js',   // stable filename, no hash — safe for CDN URLs
        chunkFileNames: 'widget-[name].js',
      },
    },
  },
})
