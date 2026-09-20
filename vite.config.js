import { copyFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Static hosts (Wasmer Edge, GitHub Pages, nginx without try_files) answer a
// hard refresh on a client-side route with 404. Copy the built index.html to
// each route so /chuva resolves as a real file on any host.
const SPA_ROUTES = ['chuva'];
const spaDeepLinks = () => ({
  name: 'spa-deep-links',
  apply: 'build',
  writeBundle({ dir }) {
    for (const route of SPA_ROUTES) {
      mkdirSync(join(dir, route), { recursive: true });
      copyFileSync(join(dir, 'index.html'), join(dir, route, 'index.html'));
    }
  },
});

export default defineConfig({
  plugins: [react(), spaDeepLinks()],
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
