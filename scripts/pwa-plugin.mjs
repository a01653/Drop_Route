// Plugin de Vite: tras escribir el build genera dist/sw.js con los recursos y la versión de ESE build.
// Solo actúa en build. En desarrollo no hay service worker.
import { resolve } from 'node:path';
import { SERVICE_WORKER_TEMPLATE, emitServiceWorker } from './lib/pwa-build.mjs';

/** @returns {import('vite').Plugin} */
export function pwaPlugin() {
  let root = process.cwd();
  let outDir = resolve(root, 'dist');
  let failed = false;
  return {
    name: 'drop-route-pwa',
    apply: 'build',
    enforce: 'post',
    configResolved(config) {
      root = config.root;
      outDir = resolve(config.root, config.build.outDir);
    },
    buildEnd(error) {
      failed = Boolean(error);
    },
    // closeBundle: cuando el HTML, los recursos y la carpeta public/ ya están escritos en outDir.
    closeBundle() {
      if (failed) return;
      emitServiceWorker({ dir: outDir, template: resolve(root, SERVICE_WORKER_TEMPLATE) });
    },
  };
}
