import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import vm from 'node:vm';
import { ROOT, readJson } from '../scripts/lib/music-validation.mjs';
import { ICON_PWA } from '../scripts/lib/icon.mjs';
import {
  cacheName,
  collectPrecache,
  emitServiceWorker,
  isPrecacheable,
  listFiles,
  normalizeBase,
  precacheUrls,
  renderServiceWorker,
} from '../scripts/lib/pwa-build.mjs';
import { createCacheStorage, createNetwork, dispatchFetch, lifecycle, loadServiceWorker } from './lib/sw-harness.mjs';
import { DIST_FILES, TEMPLATE, buildFixture, filesUnder, tempDir, writeTree } from './lib/pwa-fixture.mjs';

const template = readFileSync(TEMPLATE, 'utf8');
const idOf = (files, tpl) => buildFixture({ files, template: tpl }).buildId;

test('la base de publicación es / o una subruta absoluta, y lo demás se rechaza', () => {
  assert.equal(normalizeBase(undefined), '/');
  assert.equal(normalizeBase(''), '/');
  assert.equal(normalizeBase('/'), '/');
  assert.equal(normalizeBase('/Drop_Route/'), '/Drop_Route/');
  assert.equal(normalizeBase('/Drop_Route'), '/Drop_Route/');
  assert.equal(normalizeBase('Drop_Route'), '/Drop_Route/');
  assert.equal(normalizeBase('/a/b/'), '/a/b/');
  for (const bad of ['./', '../x/', 'https://a01653.github.io/Drop_Route/', '/a b/', '/a//b/', '/../']) {
    assert.throws(() => normalizeBase(bad), /DROP_ROUTE_BASE/, bad);
  }
});

test('solo se precachean recursos propios de la aplicación: ni guías PDF, ni referencias, ni sourcemaps, ni el propio worker', () => {
  for (const ok of ['index.html', 'assets/index-AAA.js', 'assets/x.css', 'assets/f.woff2', 'icons/a.png', 'favicon.svg', 'manifest.webmanifest']) {
    assert.equal(isPrecacheable(ok), true, ok);
  }
  for (const no of ['sw.js', 'guia.pdf', 'GUIA.PDF', 'references/laminas.html', 'assets/index.js.map', 'notas.txt', 'datos.bin']) {
    assert.equal(isPrecacheable(no), false, no);
  }
});

test('listFiles recorre las carpetas y devuelve rutas con «/», ordenadas', () => {
  const dir = writeTree(tempDir('dr-pwa-list-'), { 'b.txt': '1', 'a/z.js': '2', 'a/y/w.css': '3' });
  assert.deepEqual(listFiles(dir), ['a/y/w.css', 'a/z.js', 'b.txt']);
});

test('collectPrecache lista lo precacheable y exige index.html', () => {
  const dir = writeTree(tempDir('dr-pwa-collect-'), DIST_FILES);
  const { entries } = collectPrecache(dir, template);
  assert.deepEqual(
    entries.map(entry => entry.path),
    ['assets/GochiHand-CCC.woff2', 'assets/index-AAA.js', 'assets/index-BBB.css', 'favicon.svg', 'icons/icon-192.png', 'index.html', 'manifest.webmanifest'],
  );
  assert.ok(entries.every(entry => /^[a-f0-9]{64}$/.test(entry.sha256)));
  assert.deepEqual(precacheUrls(entries).slice(0, 2), ['./', 'assets/GochiHand-CCC.woff2']);
  const sinIndex = writeTree(tempDir('dr-pwa-noindex-'), { 'assets/a.js': '1' });
  assert.throws(() => collectPrecache(sinIndex, template), /index\.html/);
});

test('la versión sale del contenido: mismo contenido, misma versión; cualquier cambio, otra', () => {
  const same = idOf(DIST_FILES, template);
  assert.match(same, /^[a-f0-9]{16}$/);
  // El orden en que se escriben los ficheros no cuenta.
  assert.equal(idOf(Object.fromEntries(Object.entries(DIST_FILES).reverse()), template), same);
  // Lo que no se precachea no cambia la versión.
  assert.equal(idOf({ ...DIST_FILES, 'otra-guia.pdf': 'x', 'references/x.html': 'y' }, template), same);
  // Un byte distinto en un recurso, un recurso nuevo o uno que falta, sí.
  assert.notEqual(idOf({ ...DIST_FILES, 'assets/index-AAA.js': 'console.log("v2")' }, template), same);
  assert.notEqual(idOf({ ...DIST_FILES, 'assets/nuevo.js': '1' }, template), same);
  const { 'favicon.svg': _removed, ...without } = DIST_FILES;
  assert.notEqual(idOf(without, template), same);
});

test('la versión incluye la plantilla del worker: mismo texto, misma versión; otra lógica, otra versión', () => {
  const same = idOf(DIST_FILES, template);
  assert.equal(idOf(DIST_FILES, template), same);
  assert.equal(idOf(DIST_FILES, template + ''), same);
  assert.notEqual(idOf(DIST_FILES, template + '\n// cambio de lógica'), same);
  assert.notEqual(idOf(DIST_FILES, template.replace("'SKIP_WAITING'", "'OTRO'")), same);
});

test('la plantilla real es un script válido con sus dos marcadores una sola vez', () => {
  assert.doesNotThrow(() => new vm.Script(template));
  assert.equal(template.split("/*__BUILD_ID__*/ 'dev'").length, 2);
  assert.equal(template.split('/*__PRECACHE__*/ []').length, 2);
  assert.doesNotMatch(template, /localStorage|sessionStorage|indexedDB/);
});

test('renderServiceWorker rellena versión y lista sin interpretar caracteres especiales, y rechaza plantillas sin marcadores', () => {
  const urls = ['./', 'assets/a$&b.js', "assets/it's.js"];
  const out = renderServiceWorker(template, { buildId: 'abc123', urls });
  assert.doesNotThrow(() => new vm.Script(out));
  assert.ok(out.includes('const BUILD_ID = "abc123"'));
  assert.ok(out.includes(JSON.stringify(urls)));
  assert.throws(() => renderServiceWorker('const x = 1', { buildId: 'a', urls }), /marcadores/);
});

test('emitServiceWorker escribe sw.js con lo precacheable, no se incluye a sí mismo y es idempotente', () => {
  const { dir, source, buildId, urls } = buildFixture();
  assert.ok(urls.includes('./') && urls.includes('index.html') && urls.includes('manifest.webmanifest'));
  assert.ok(!urls.some(url => /\.pdf$|references|\.map$|sw\.js/.test(url)));
  assert.ok(source.includes(JSON.stringify(buildId)));
  // Una segunda ejecución sobre el mismo dist da exactamente el mismo worker.
  const again = emitServiceWorker({ dir, template: TEMPLATE });
  assert.equal(again.buildId, buildId);
  assert.equal(readFileSync(join(dir, 'sw.js'), 'utf8'), source);
  assert.throws(() => emitServiceWorker({ dir, template: join(dir, 'no-existe.js') }), /plantilla/);
});

test('el nombre de la caché lleva el ámbito y la versión, y el worker usa exactamente esa fórmula', async () => {
  const { source, buildId } = buildFixture();
  for (const scope of ['https://example.test/', 'https://example.test/Drop_Route/', 'https://example.test/a/b/']) {
    const caches = createCacheStorage();
    const network = createNetwork({ ...filesUnder(scope, DIST_FILES), [scope]: DIST_FILES['index.html'] });
    const worker = loadServiceWorker(source, { scope, caches, network });
    await lifecycle(worker, 'install');
    assert.deepEqual(caches.names(), [cacheName(new URL(scope).pathname, buildId)], scope);
  }
  assert.equal(cacheName('/Drop_Route/', 'abc'), 'drop-route-precache:/Drop_Route/:abc');
});

// --- Archivos estáticos de la PWA ------------------------------------------------------------------------------

test('el manifest usa rutas relativas, nombre e iconos de la aplicación, con icono maskable aparte', () => {
  const manifest = readJson('public/manifest.webmanifest');
  assert.equal(manifest.name, 'Drop Route');
  assert.equal(manifest.short_name, 'Drop Route');
  assert.equal(manifest.display, 'standalone');
  assert.equal(manifest.lang, 'es');
  // Rutas relativas: funcionan igual en / que en una subruta como /Drop_Route/.
  for (const key of ['id', 'start_url', 'scope']) assert.equal(manifest[key], './', key);
  for (const icon of manifest.icons) assert.ok(!icon.src.startsWith('/') && !/^[a-z]+:/.test(icon.src), icon.src);
  assert.deepEqual(
    manifest.icons.map(icon => [icon.src, icon.sizes, icon.type, icon.purpose]),
    ICON_PWA.map(item => ['icons/' + item.file.split('/').pop(), item.size + 'x' + item.size, 'image/png', item.purpose]),
  );
  // 192 y 512 «any» y un 512 maskable que no mezcla propósitos.
  assert.deepEqual(manifest.icons.map(icon => icon.purpose), ['any', 'any', 'maskable']);
  assert.match(manifest.background_color, /^#[0-9A-Fa-f]{6}$/);
  assert.match(manifest.theme_color, /^#[0-9A-Fa-f]{6}$/);
});

test('index.html enlaza el manifest y declara el color del tema, y el favicon aprobado no cambia', () => {
  const html = readFileSync(resolve(ROOT, 'index.html'), 'utf8');
  assert.match(html, /<link rel="manifest" href="\/manifest\.webmanifest"/);
  assert.match(html, /<meta name="theme-color" content="#0B1D2E"/i);
  assert.match(html, /<link rel="icon" type="image\/svg\+xml" href="\/favicon\.svg"/);
});

// --- Build real con Vite, sin navegador --------------------------------------------------------------------------

async function buildApp(base) {
  const { build } = await import('vite');
  const outDir = tempDir('dr-pwa-build-');
  await build({
    root: ROOT,
    configFile: resolve(ROOT, 'vite.config.ts'),
    logLevel: 'silent',
    ...(base ? { base } : {}),
    build: { outDir, emptyOutDir: true },
  });
  return outDir;
}

for (const base of ['/', '/Drop_Route/']) {
  test(`npm run build real, base ${base}: genera sw.js con los recursos del build y funciona sin red`, { timeout: 120_000 }, async () => {
    const dist = await buildApp(base === '/' ? undefined : base);
    const files = listFiles(dist);
    assert.ok(files.includes('sw.js') && files.includes('index.html') && files.includes('manifest.webmanifest'));
    // Ni guías ni referencias en el build; el único PDF es el manual de uso del botón «Manual», y no se precachea.
    assert.ok(!files.some(path => /\.pdf$/.test(path) && path !== 'manual/Manual_Uso_Drop_Route.pdf'), files.join(', '));
    assert.ok(!files.some(path => /^references\//.test(path)), files.join(', '));
    assert.ok(files.includes('manual/Manual_Uso_Drop_Route.pdf'), 'el manual de uso se publica');

    const html = readFileSync(join(dist, 'index.html'), 'utf8');
    assert.ok(html.includes(`href="${base}manifest.webmanifest"`), 'manifest enlazado con la base');
    assert.ok(html.includes(`"${base}assets/`), 'recursos bajo la base');

    const source = readFileSync(join(dist, 'sw.js'), 'utf8');
    const listed = JSON.parse(/const PRECACHE = (\[[^\n]*\])/.exec(source)[1]);
    // El worker precachea exactamente lo precacheable del build: ni más ni menos.
    assert.deepEqual(
      listed.filter(url => url !== './').sort(),
      files.filter(isPrecacheable).sort(),
    );
    assert.ok(listed.some(url => url.endsWith('.js')) && listed.some(url => url.endsWith('.css')));
    assert.ok(listed.filter(url => url.endsWith('.woff2')).length >= 2, 'las dos fuentes de las tarjetas');

    // Se instala y responde sin red a partir de los ficheros reales del build.
    const scope = new URL(base, 'https://example.test').href;
    const network = createNetwork(
      Object.fromEntries([...files.filter(path => path !== 'sw.js').map(path => [new URL(path, scope).href, readFileSync(join(dist, path))]), [scope, readFileSync(join(dist, 'index.html'))]]),
    );
    const caches = createCacheStorage();
    const worker = loadServiceWorker(source, { scope, caches, network });
    await lifecycle(worker, 'install');
    await lifecycle(worker, 'activate');
    assert.equal(caches.names().length, 1);
    assert.ok(caches.names()[0].startsWith(`drop-route-precache:${base}:`));
    network.online = false;
    const shell = await dispatchFetch(worker, { url: scope, mode: 'navigate' });
    assert.equal(await shell.response.text(), html);
    const script = listed.find(url => url.endsWith('.js'));
    const asset = await dispatchFetch(worker, { url: new URL(script, scope).href });
    assert.equal(asset.response.status, 200);
  });
}

test('el build no depende de Chromium: los iconos finales son ficheros versionados de public/', () => {
  // La exportación (Chromium) es aparte: npm run build solo copia public/. El script no lo lanza.
  const pkg = readJson('package.json');
  assert.doesNotMatch(pkg.scripts.build, /icon:export|playwright/);
  assert.ok(readdirSync(resolve(ROOT, 'public')).includes('manifest.webmanifest'));
});
