import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { cacheName } from '../scripts/lib/pwa-build.mjs';
import { createCacheStorage, createNetwork, dispatchFetch, lifecycle, loadServiceWorker, sendMessage } from './lib/sw-harness.mjs';
import { DIST_FILES, TEMPLATE, buildFixture, filesUnder } from './lib/pwa-fixture.mjs';

// Se ejecuta el service worker REAL generado por el build, con eventos como los del navegador y una Cache API y una
// red simuladas. No se miran fragmentos de su texto: se observa qué cachés quedan y qué responde.
const SCOPE = 'https://example.test/Drop_Route/';
const ROOT_SCOPE = 'https://example.test/';
const V1 = DIST_FILES;
const V2 = { ...DIST_FILES, 'assets/index-AAA.js': 'console.log("v2")', 'index.html': '<!doctype html><title>Drop Route v2</title>' };
const template = readFileSync(TEMPLATE, 'utf8');
const at = (path, scope = SCOPE) => new URL(path, scope).href;

/** Genera el worker de un build, lo carga en un ámbito y lo conecta a una red que sirve ese build. */
function deploy({ files = V1, scope = SCOPE, caches = createCacheStorage(), template: tpl } = {}) {
  const build = buildFixture({ files, template: tpl });
  const network = createNetwork({ ...filesUnder(scope, files), [scope]: files['index.html'] });
  const worker = loadServiceWorker(build.source, { scope, caches, network });
  return { ...build, caches, network, worker, name: cacheName(new URL(scope).pathname, build.buildId) };
}
const bodyOf = async result => (await result.response.text());

test('instalar precachea exactamente los recursos propios, saltándose la caché HTTP, y no activa ni toma el control', async () => {
  const d = deploy();
  await lifecycle(d.worker, 'install');
  assert.deepEqual(d.caches.names(), [d.name]);
  const cache = d.caches.stores.get(d.name);
  assert.deepEqual([...cache.entries.keys()].sort(), d.urls.map(url => at(url)).sort());
  assert.equal(cache.entries.get(at('assets/index-AAA.js')).body, 'console.log("v1")');
  assert.equal(cache.entries.get(SCOPE).body, V1['index.html'], 'la raíz del ámbito es el HTML de arranque');
  for (const key of cache.entries.keys()) assert.doesNotMatch(key, /\.pdf|references|\.map|sw\.js/);
  assert.ok(d.network.requests.length >= d.urls.length);
  assert.ok(d.network.requests.every(request => request.cache === 'reload'), 'cada petición ignora la caché HTTP');
  assert.deepEqual(d.worker.calls, { skipWaiting: 0, claim: 0 });
});

test('una instalación que falla (un recurso devuelve 404) no deja una caché a medias', async () => {
  const d = deploy();
  d.network.files.delete(at('assets/index-BBB.css'));
  await assert.rejects(lifecycle(d.worker, 'install'), /No se pudo precachear/);
  assert.deepEqual(d.caches.names(), []);
});

test('sin conexión durante la instalación también falla limpiamente', async () => {
  const d = deploy();
  d.network.online = false;
  await assert.rejects(lifecycle(d.worker, 'install'), /Failed to fetch/);
  assert.deepEqual(d.caches.names(), []);
});

test('una instalación fallida de un worker nuevo no borra ni reutiliza la caché del que está activo', async () => {
  const caches = createCacheStorage();
  const v1 = deploy({ files: V1, caches });
  await lifecycle(v1.worker, 'install');
  await lifecycle(v1.worker, 'activate');
  // Versión con otros recursos que falla al instalar.
  const v2 = deploy({ files: V2, caches });
  v2.network.online = false;
  await assert.rejects(lifecycle(v2.worker, 'install'));
  // Y un worker con la misma web pero otra lógica: su caché tiene otro nombre, así que no pisa la activa.
  const logic = deploy({ files: V1, caches, template: template + '\n// otra lógica del worker' });
  assert.notEqual(logic.name, v1.name);
  logic.network.online = false;
  await assert.rejects(lifecycle(logic.worker, 'install'));
  assert.deepEqual(caches.names(), [v1.name]);
  v1.network.online = false;
  assert.equal(await bodyOf(await dispatchFetch(v1.worker, { url: at('assets/index-AAA.js') })), 'console.log("v1")');
});

test('una versión nueva espera: no mezcla recursos con la activa ni toma el control hasta que se le pide', async () => {
  const caches = createCacheStorage();
  const v1 = deploy({ files: V1, caches });
  await lifecycle(v1.worker, 'install');
  await lifecycle(v1.worker, 'activate');
  const v2 = deploy({ files: V2, caches });
  await lifecycle(v2.worker, 'install');
  assert.equal(v2.worker.calls.skipWaiting, 0, 'instalar no activa');
  assert.deepEqual(caches.names().sort(), [v1.name, v2.name].sort());
  assert.notEqual(v1.name, v2.name);

  // Cada worker responde solo con su caché, aunque estén las dos.
  for (const d of [v1, v2]) d.network.online = false;
  const js = at('assets/index-AAA.js');
  assert.equal(await bodyOf(await dispatchFetch(v1.worker, { url: js })), 'console.log("v1")');
  assert.equal(await bodyOf(await dispatchFetch(v1.worker, { url: SCOPE, mode: 'navigate' })), V1['index.html']);
  assert.equal(await bodyOf(await dispatchFetch(v2.worker, { url: js })), 'console.log("v2")');
  assert.equal(await bodyOf(await dispatchFetch(v2.worker, { url: SCOPE, mode: 'navigate' })), V2['index.html']);

  // Solo el mensaje explícito de la página lo activa.
  for (const data of [undefined, null, {}, { type: 'OTRO' }, 'SKIP_WAITING']) sendMessage(v2.worker, data);
  assert.equal(v2.worker.calls.skipWaiting, 0);
  sendMessage(v2.worker, { type: 'SKIP_WAITING' });
  assert.equal(v2.worker.calls.skipWaiting, 1);

  // Al activarse toma el control y borra la caché de la versión anterior; la suya queda.
  await lifecycle(v2.worker, 'activate');
  assert.equal(v2.worker.calls.claim, 1);
  assert.deepEqual(caches.names(), [v2.name]);
});

test('activar borra solo las cachés propias de otras versiones en SU ámbito', async () => {
  const caches = createCacheStorage();
  const keep = ['otra-app-v1', 'drop-route-precache:/Otro/:abc', 'drop-route-precache:/:vieja', 'drop-route-precache:/Drop_Route/x/:vieja', 'drop-route-precache-sin-ambito'];
  for (const name of [...keep, 'drop-route-precache:/Drop_Route/:vieja', 'drop-route-precache:/Drop_Route/:otra']) await caches.open(name);
  const d = deploy({ caches });
  await lifecycle(d.worker, 'install');
  await lifecycle(d.worker, 'activate');
  assert.deepEqual(caches.names().sort(), [...keep, d.name].sort());
});

test('dos instalaciones en el mismo origen (/ y /Drop_Route/) no se borran las cachés entre sí', async () => {
  const caches = createCacheStorage();
  const root = deploy({ files: V1, scope: ROOT_SCOPE, caches });
  const sub1 = deploy({ files: V1, caches });
  for (const d of [root, sub1]) {
    await lifecycle(d.worker, 'install');
    await lifecycle(d.worker, 'activate');
  }
  assert.notEqual(root.name, sub1.name);
  assert.match(root.name, /^drop-route-precache:\/:/);
  assert.match(sub1.name, /^drop-route-precache:\/Drop_Route\/:/);
  // Una versión nueva en la subruta limpia la suya y respeta la de la raíz; y al revés.
  const sub2 = deploy({ files: V2, caches });
  await lifecycle(sub2.worker, 'install');
  await lifecycle(sub2.worker, 'activate');
  assert.deepEqual(caches.names().sort(), [root.name, sub2.name].sort());
  const root2 = deploy({ files: V2, scope: ROOT_SCOPE, caches });
  await lifecycle(root2.worker, 'install');
  await lifecycle(root2.worker, 'activate');
  assert.deepEqual(caches.names().sort(), [root2.name, sub2.name].sort());
});

test('solo responde a GET del mismo origen dentro de su ámbito; la navegación a la raíz recibe el HTML precacheado', async () => {
  const d = deploy();
  await lifecycle(d.worker, 'install');
  await lifecycle(d.worker, 'activate');
  d.network.online = false;

  for (const url of [SCOPE, at('index.html'), at('index.html') + '?utm=1', SCOPE + '?x=1']) {
    const result = await dispatchFetch(d.worker, { url, mode: 'navigate' });
    assert.equal(result.intercepted, true, url);
    assert.equal(await bodyOf(result), V1['index.html'], url);
  }
  // Recursos precacheados, también con parámetros: sin red.
  for (const path of ['assets/index-AAA.js', 'assets/index-AAA.js?v=1', 'assets/index-BBB.css', 'assets/GochiHand-CCC.woff2', 'icons/icon-192.png', 'manifest.webmanifest', 'favicon.svg']) {
    const result = await dispatchFetch(d.worker, { url: at(path) });
    assert.equal(result.intercepted, true, path);
    assert.equal(result.response.status, 200, path);
  }
  // Lo que no es suyo, no lo toca: el navegador usa su red normal.
  const ignored = [
    { url: at('assets/index-AAA.js'), method: 'POST' },
    { url: at('assets/index-AAA.js'), method: 'PUT' },
    { url: 'https://cdn.example.net/lib.js' },
    { url: 'https://example.test/Drop_Route_otro/x.js' },
    { url: 'https://example.test/otra/ruta.js' },
    { url: 'https://example.test/', mode: 'navigate' },
    { url: at('otra-pagina'), mode: 'navigate' },
    { url: 'http://example.test/Drop_Route/assets/index-AAA.js' },
  ];
  for (const request of ignored) assert.equal((await dispatchFetch(d.worker, request)).intercepted, false, JSON.stringify(request));
});

test('lo que no se precacheó va a la red y no se guarda; sin red falla en vez de inventar una respuesta', async () => {
  const d = deploy();
  await lifecycle(d.worker, 'install');
  await lifecycle(d.worker, 'activate');
  const cache = d.caches.stores.get(d.name);
  const before = [...cache.entries.keys()].sort();

  // La guía PDF está en el servidor de pruebas pero nunca se precacheó: se pide a la red cada vez.
  const online = await dispatchFetch(d.worker, { url: at('guia.pdf') });
  assert.equal(online.intercepted, true);
  assert.equal(await bodyOf(online), 'no se cachea');
  assert.ok(d.network.requests.some(request => request.url === at('guia.pdf')));
  assert.deepEqual([...cache.entries.keys()].sort(), before, 'no hay caché de ejecución');

  d.network.online = false;
  await assert.rejects(dispatchFetch(d.worker, { url: at('guia.pdf') }), /Failed to fetch/);
  await assert.rejects(dispatchFetch(d.worker, { url: at('references/laminas.html') }), /Failed to fetch/);
  assert.deepEqual([...cache.entries.keys()].sort(), before);
});

test('el worker usa solo la Cache API y la red: no toca el almacenamiento del progreso', async () => {
  const { source } = deploy();
  assert.doesNotMatch(source, /localStorage|sessionStorage|indexedDB|document\.|window\./);
  // Y se ejecuta entero sin esas APIs: el contexto de la prueba no las tiene, y cualquier uso habría lanzado.
  const d = deploy();
  await lifecycle(d.worker, 'install');
  await lifecycle(d.worker, 'activate');
  d.network.online = false;
  assert.equal((await dispatchFetch(d.worker, { url: SCOPE, mode: 'navigate' })).intercepted, true);
});
