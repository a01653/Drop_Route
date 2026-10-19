// Plugin de Vite: publica el manual de uso en <base>manual/ sin duplicar el PDF en el repositorio.
// La fuente sigue siendo docs/latex/Manual_Uso_Drop_Route.pdf; en build se emite como asset y en desarrollo se sirve.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export const MANUAL_SOURCE = 'docs/latex/Manual_Uso_Drop_Route.pdf';
export const MANUAL_FILE = 'manual/Manual_Uso_Drop_Route.pdf';

/** @returns {import('vite').Plugin} */
export function manualPlugin() {
  let root = process.cwd();
  
  const read = () => readFileSync(resolve(root, MANUAL_SOURCE));
  return {
    name: 'drop-route-manual',
    configResolved(config) {
      root = config.root;
    },
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.split('?')[0].endsWith('/' + MANUAL_FILE)) return next();
        res.setHeader('Content-Type', 'application/pdf');
        res.end(read());
      });
    },
    generateBundle() {
      this.emitFile({ type: 'asset', fileName: MANUAL_FILE, source: read() });
    },
  };
}
