import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { normalizeBase } from './scripts/lib/pwa-build.mjs'
import { manualPlugin } from './scripts/manual-plugin.mjs'
import { pwaPlugin } from './scripts/pwa-plugin.mjs'

// DROP_ROUTE_BASE fija la subruta de publicación, por ejemplo /Drop_Route/. Sin ella la aplicación cuelga de la raíz.
// El manifest usa rutas relativas y el service worker toma su ámbito de la base, así que no hay nada más que cambiar.
export default defineConfig({
  base: normalizeBase(process.env.DROP_ROUTE_BASE),
  plugins: [react(), manualPlugin(), pwaPlugin()],
})
