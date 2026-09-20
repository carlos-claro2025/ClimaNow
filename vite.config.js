import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Absolute base: BrowserRouter needs /assets/... at every route depth.
  // With './' a deep link such as /chuva served index.html where the JS bundle
  // was expected, so the app rendered a blank page.
  base: '/',
  server: {
    proxy: {
      '/api/cemaden': {
        target: 'https://painelalertas.cemaden.gov.br',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/cemaden/, ''),
      },
    },
  },
  build: {
    outDir: 'dist',
  },
});
