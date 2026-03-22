import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Modern browsers only — no legacy polyfills bloating the bundle
    target: 'es2020',
    minify: 'esbuild',
    cssMinify: true,
    // Inline small assets directly — fewer HTTP round-trips
    assetsInlineLimit: 4096,

    rollupOptions: {
      output: {
        // Each chunk cached independently — only re-download what changed
        manualChunks(id) {
          if (id.includes('node_modules/react-dom'))   return 'react-dom'
          if (id.includes('node_modules/react'))        return 'react'
          if (id.includes('node_modules/recharts') ||
              id.includes('node_modules/d3-') ||
              id.includes('node_modules/victory-'))     return 'charts'
          if (id.includes('node_modules/date-fns'))     return 'dates'
          if (id.includes('node_modules/lucide-react')) return 'icons'
        },
        entryFileNames:  'assets/[name]-[hash].js',
        chunkFileNames:  'assets/[name]-[hash].js',
        assetFileNames:  'assets/[name]-[hash].[ext]',
      },
    },
    chunkSizeWarningLimit: 600,
  },

  // Pre-bundle at dev startup — eliminates waterfall on first load
  optimizeDeps: {
    include: ['react', 'react-dom', 'recharts', 'date-fns', 'lucide-react'],
  },
})
