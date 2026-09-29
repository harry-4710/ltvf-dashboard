import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  base: './',
  // jsPDF uses canvg/dompurify/html2canvas for HTML rendering — we don't use that feature.
  // Stub them with real files (data: URIs break esbuild dev server).
  resolve: {
    alias: {
      'canvg':      path.resolve(__dirname, 'src/stubs/canvg.js'),
      'dompurify':  path.resolve(__dirname, 'src/stubs/dompurify.js'),
      'html2canvas':path.resolve(__dirname, 'src/stubs/html2canvas.js'),
    },
  },
  server: {
    port: 3000,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

