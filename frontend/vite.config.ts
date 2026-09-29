import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
  // jsPDF pulls in canvg/core-js/dompurify for HTML rendering which we don't use.
  // Stub them out so Vite/Rollup can bundle jsPDF without these optional deps.
  resolve: {
    alias: {
      'canvg':    'data:text/javascript,export default {};export const Canvg={};',
      'dompurify':'data:text/javascript,export default {sanitize:(s)=>s};',
      'html2canvas':'data:text/javascript,export default ()=>Promise.resolve({toDataURL:()=>""});',
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

