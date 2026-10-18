// Generador del service worker de Drop Route: lista los recursos propios del build, calcula una versión por
// contenido y rellena la plantilla scripts/pwa/sw.template.js. Sin dependencias: solo node:*.
import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, posix, resolve } from 'node:path';

// Los nombres de caché son «drop-route-precache:<ámbito>:<versión>», por ejemplo
// «drop-route-precache:/Drop_Route/:3fa9c1d2e4b5a678». El ámbito aísla las instalaciones de un mismo origen: la de «/»
// y la de «/Drop_Route/» no se borran las cachés entre sí. El service worker repite esta fórmula con su propio ámbito
// en tiempo de ejecución; un test comprueba que coinciden.
export const CACHE_PREFIX = 'drop-route-precache:';
export const cacheScopePrefix = scopePath => CACHE_PREFIX + scopePath + ':';
export const cacheName = (scopePath, buildId) => cacheScopePrefix(scopePath) + buildId;
export const SERVICE_WORKER_FILE = 'sw.js';
export const SERVICE_WORKER_TEMPLATE = 'scripts/pwa/sw.template.js';

// Solo se precachean tipos de recurso que usa la aplicación. Las guías PDF y las referencias no están en el build
// y, si algún día llegaran a copiarse a dist/, tampoco se cachearían.
const PRECACHE_EXTENSIONS = new Set(['.html', '.js', '.css', '.woff2', '.png', '.svg', '.webmanifest', '.json']);
const EXCLUDED = [/^references\//, /\.pdf$/i, /\.map$/i];

const ID_MARKER = "/*__BUILD_ID__*/ 'dev'";
const LIST_MARKER = '/*__PRECACHE__*/ []';

/**
 * Base de publicación: «/» o una subruta absoluta como «/Drop_Route/». Vale tanto lo que llega de DROP_ROUTE_BASE
 * como lo que se escriba a mano. Las bases relativas no se admiten porque el ámbito del service worker debe ser
 * una ruta absoluta y fija.
 * @param {string | undefined} value
 * @returns {string}
 */
export function normalizeBase(value) {
  const raw = (value ?? '').trim();
  if (raw === '' || raw === '/') return '/';
  const base = (raw.startsWith('/') ? raw : '/' + raw).replace(/\/*$/, '/');
  if (!/^\/([\w.~-]+\/)+$/.test(base) || base.includes('/./') || base.includes('/../')) {
    throw new Error(
      'DROP_ROUTE_BASE debe ser una ruta absoluta como /Drop_Route/ (recibido: ' + JSON.stringify(value) + ')',
    );
  }
  return base;
}

/** Rutas relativas (con «/») de todos los ficheros bajo dir, ordenadas. */
export function listFiles(dir, prefix = '') {
  const found = [];
  for (const entry of readdirSync(join(dir, prefix), { withFileTypes: true })) {
    const relative = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) found.push(...listFiles(dir, relative));
    else found.push(relative);
  }
  return found.sort();
}

export function isPrecacheable(path) {
  if (path === SERVICE_WORKER_FILE) return false;
  if (EXCLUDED.some(rule => rule.test(path))) return false;
  return PRECACHE_EXTENSIONS.has(posix.extname(path).toLowerCase());
}

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');

/**
 * Recursos que se precachean y la versión del conjunto. La versión sale del contenido de cada fichero Y del texto de
 * la plantilla del service worker: dos builds con los mismos bytes y el mismo worker dan la misma caché, y cambiar
 * un recurso o solo la lógica del worker da otra distinta, sin depender de fechas. Así una instalación fallida de un
 * worker nuevo nunca reutiliza ni borra la caché del que está activo.
 */
export function collectPrecache(dir, template = '') {
  const paths = listFiles(dir).filter(isPrecacheable);
  if (!paths.includes('index.html')) throw new Error('El build no contiene index.html en ' + dir);
  const entries = paths.map(path => ({ path, sha256: sha256(readFileSync(join(dir, path))) }));
  const buildId = sha256(
    entries.map(entry => entry.path + '\0' + entry.sha256 + '\n').join('') + '\0sw\0' + sha256(template),
  ).slice(0, 16);
  return { buildId, entries };
}

/** URL relativas al ámbito: primero la raíz (el HTML de arranque) y después cada fichero. */
export const precacheUrls = entries => ['./', ...entries.map(entry => entry.path)];

export function renderServiceWorker(template, { buildId, urls }) {
  if (!template.includes(ID_MARKER) || !template.includes(LIST_MARKER)) {
    throw new Error('La plantilla del service worker no contiene sus marcadores');
  }
  return template
    .replace(ID_MARKER, () => JSON.stringify(buildId))
    .replace(LIST_MARKER, () => JSON.stringify(urls));
}

/** Escribe dir/sw.js a partir de lo que haya en dir. Devuelve lo que ha precacheado. */
export function emitServiceWorker({ dir, template }) {
  if (!existsSync(template)) throw new Error('Falta la plantilla del service worker: ' + template);
  const text = readFileSync(template, 'utf8');
  const { buildId, entries } = collectPrecache(dir, text);
  const urls = precacheUrls(entries);
  writeFileSync(resolve(dir, SERVICE_WORKER_FILE), renderServiceWorker(text, { buildId, urls }), 'utf8');
  return { buildId, urls };
}
