// Genera las exportaciones del icono desde sus originales editables.
// Uso: npm run icon:export            todas: los siete tamaños del icono, el 192 y el maskable de la PWA
//      npm run icon:export -- --solo-pwa  solo el 192 «any» y el 512 maskable; no toca los PNG aprobados
// Requiere Chromium: npx playwright install chromium
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import {
  ICON_EXPORT_DIR,
  ICON_FAVICON,
  ICON_MANIFEST,
  ICON_MASKABLE_SIZE,
  ICON_MASKABLE_SOURCE,
  ICON_PWA,
  ICON_PWA_ANY_SIZE,
  ICON_PWA_DIR,
  ICON_SIZES,
  ICON_SOURCE,
} from './lib/icon.mjs';
import { ROOT } from './lib/music-validation.mjs';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--solo-pwa')) {
  console.error('Uso: node scripts/export-icon.mjs [--solo-pwa]');
  process.exit(1);
}
const onlyPwa = args.includes('--solo-pwa');

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const read = path => readFileSync(resolve(ROOT, path));
const source = read(ICON_SOURCE);
const maskable = read(ICON_MASKABLE_SOURCE);
const exportPath = name => `${ICON_EXPORT_DIR}/${name}`;

async function render(page, svg, size) {
  const dataUrl = 'data:image/svg+xml;base64,' + svg.toString('base64');
  await page.setViewportSize({ width: size, height: size });
  await page.setContent(
    '<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">' +
      `<img alt="" src="${dataUrl}" width="${size}" height="${size}" style="display:block"></body>`,
  );
  await page.waitForFunction(() => document.images[0].complete);
  return page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
}

let manifest;
if (onlyPwa) {
  if (!existsSync(resolve(ROOT, ICON_MANIFEST))) throw new Error('Falta ' + ICON_MANIFEST + ': ejecuta npm run icon:export sin opciones');
  manifest = JSON.parse(read(ICON_MANIFEST).toString('utf8'));
  if (manifest.sourceSha256 !== sha256(source)) {
    throw new Error('El icono original cambió desde la última exportación: ejecuta npm run icon:export sin opciones');
  }
} else {
  manifest = { source: ICON_SOURCE, sourceSha256: sha256(source), favicon: { file: ICON_FAVICON, sha256: sha256(source) }, command: 'npm run icon:export', files: [] };
}

mkdirSync(resolve(ROOT, ICON_EXPORT_DIR), { recursive: true });
mkdirSync(resolve(ROOT, ICON_PWA_DIR), { recursive: true });
const pwaExports = [];
const browser = await chromium.launch();
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const save = (file, png) => {
    writeFileSync(resolve(ROOT, file), png);
    console.log('OK ' + file + ' (' + png.length + ' bytes)');
    return sha256(png);
  };
  if (!onlyPwa) {
    for (const size of ICON_SIZES) {
      const file = exportPath(`icon-${size}.png`);
      manifest.files.push({ file, size, sha256: save(file, await render(page, source, size)) });
    }
  }
  const any192 = exportPath(`icon-${ICON_PWA_ANY_SIZE}.png`);
  pwaExports.push({ file: any192, size: ICON_PWA_ANY_SIZE, purpose: 'any', sha256: save(any192, await render(page, source, ICON_PWA_ANY_SIZE)) });
  const mask512 = exportPath(`icon-maskable-${ICON_MASKABLE_SIZE}.png`);
  pwaExports.push({ file: mask512, size: ICON_MASKABLE_SIZE, purpose: 'maskable', sha256: save(mask512, await render(page, maskable, ICON_MASKABLE_SIZE)) });
} finally {
  await browser.close();
}

// Copias que empaqueta el build: así npm run build no depende de Chromium.
const publicCopies = ICON_PWA.map(item => {
  if (!existsSync(resolve(ROOT, item.from))) throw new Error('Falta la exportación ' + item.from);
  copyFileSync(resolve(ROOT, item.from), resolve(ROOT, item.file));
  console.log('OK ' + item.file);
  return { file: item.file, size: item.size, purpose: item.purpose, sha256: sha256(read(item.file)) };
});

if (!onlyPwa) copyFileSync(resolve(ROOT, ICON_SOURCE), resolve(ROOT, ICON_FAVICON));
manifest.pwa = {
  maskableSource: ICON_MASKABLE_SOURCE,
  maskableSourceSha256: sha256(maskable),
  exports: pwaExports,
  public: publicCopies,
};
writeFileSync(resolve(ROOT, ICON_MANIFEST), JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8' });
console.log('OK ' + ICON_MANIFEST + (onlyPwa ? ' (solo PWA)' : ' y ' + ICON_FAVICON));
