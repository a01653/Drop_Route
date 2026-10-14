import { mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { ROOT } from '../../scripts/lib/music-validation.mjs';
import { SERVICE_WORKER_TEMPLATE, emitServiceWorker } from '../../scripts/lib/pwa-build.mjs';

export const TEMPLATE = resolve(ROOT, SERVICE_WORKER_TEMPLATE);

/** Un build mínimo. Incluye cosas que NUNCA deben precachearse: una guía PDF, una referencia y un sourcemap. */
export const DIST_FILES = {
  'index.html': '<!doctype html><title>Drop Route</title><script type="module" src="/assets/index-AAA.js"></script>',
  'assets/index-AAA.js': 'console.log("v1")',
  'assets/index-BBB.css': 'body{margin:0}',
  'assets/GochiHand-CCC.woff2': 'fuente-1',
  'manifest.webmanifest': '{"name":"Drop Route"}',
  'favicon.svg': '<svg xmlns="http://www.w3.org/2000/svg"/>',
  'icons/icon-192.png': 'png-192',
  'guia.pdf': 'no se cachea',
  'references/laminas.html': '<html>no se cachea</html>',
  'assets/index-AAA.js.map': '{"version":3}',
};

export const tempDir = prefix => mkdtempSync(join(tmpdir(), prefix));

export function writeTree(dir, files) {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), content);
  }
  return dir;
}

/**
 * Escribe un build de prueba y genera su sw.js. template permite probar otra versión del worker sin tocar el real.
 * Devuelve la carpeta, el texto del worker y lo que precachea.
 */
export function buildFixture({ files = DIST_FILES, template } = {}) {
  const dir = writeTree(tempDir('dr-pwa-'), files);
  let templatePath = TEMPLATE;
  if (template !== undefined) {
    templatePath = join(tempDir('dr-pwa-template-'), 'sw.template.js');
    writeFileSync(templatePath, template);
  }
  const result = emitServiceWorker({ dir, template: templatePath });
  return { dir, source: readFileSync(join(dir, 'sw.js'), 'utf8'), ...result };
}

/** Red simulada con el contenido de un build bajo el ámbito dado: https://example.test/<subruta>/ */
export function filesUnder(scope, files) {
  return Object.fromEntries(Object.entries(files).map(([path, content]) => [new URL(path, scope).href, content]));
}
