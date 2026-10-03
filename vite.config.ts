import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// v4.4 — PUBLIC_SITE_URL substitution into index.html
// Fallback to Cloudflare Pages default — do NOT hardcode .co.uk or any specific TLD.
const PUBLIC_SITE_URL = process.env.PUBLIC_SITE_URL || 'https://easy-tenancy-global-os.pages.dev'

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'html-env-vars',
      transformIndexHtml(html) {
        return html.replace(/%PUBLIC_SITE_URL%/g, PUBLIC_SITE_URL)
      },
    },
  ],
  build: {
    outDir: 'dist',
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          if (id.includes('node_modules/react') || id.includes('node_modules/react-dom') || id.includes('node_modules/react-router')) {
            return 'react-vendor'
          }
          if (id.includes('node_modules/framer-motion')) {
            return 'framer-vendor'
          }
          if (id.includes('node_modules/d3-force') ||
              id.includes('node_modules/d3-selection') ||
              id.includes('node_modules/d3-scale') ||
              id.includes('node_modules/d3-zoom') ||
              id.includes('node_modules/d3-drag') ||
              id.includes('node_modules/d3-')) {
            return 'd3-vendor'
          }
        }
      }
    }
  },
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    // 'all' as string (not array) is the correct Vite 6 syntax
    allowedHosts: 'all',
    cors: true,
    hmr: { overlay: false },
  },
  preview: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: false,
    // 'all' as string allows *.e2b.dev sandbox tunnels, ngrok, CF preview, etc.
    allowedHosts: 'all',
    cors: true,
  }
})
