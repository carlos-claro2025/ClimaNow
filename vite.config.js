import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './',
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
  build: {
    outDir: 'dist',
  },
});
