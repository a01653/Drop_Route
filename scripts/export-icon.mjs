// Genera las exportaciones del icono desde su original editable.
// Uso: npm run icon:export (requiere Chromium: npx playwright install chromium)
import { copyFileSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { ICON_SIZES, ICON_SOURCE, ICON_FAVICON, ICON_EXPORT_DIR, ICON_MANIFEST } from './lib/icon.mjs';
import { ROOT } from './lib/music-validation.mjs';

const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const source = readFileSync(resolve(ROOT, ICON_SOURCE));
const dataUrl = 'data:image/svg+xml;base64,' + source.toString('base64');

mkdirSync(resolve(ROOT, ICON_EXPORT_DIR), { recursive: true });
const browser = await chromium.launch();
const files = [];
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  for (const size of ICON_SIZES) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      '<!doctype html><meta charset="utf-8"><body style="margin:0;background:transparent">' +
        `<img alt="" src="${dataUrl}" width="${size}" height="${size}" style="display:block"></body>`,
    );
    await page.waitForFunction(() => document.images[0].complete);
    const png = await page.screenshot({ type: 'png', omitBackground: true, clip: { x: 0, y: 0, width: size, height: size } });
    const file = `${ICON_EXPORT_DIR}/icon-${size}.png`;
    writeFileSync(resolve(ROOT, file), png);
    files.push({ file, size, sha256: sha256(png) });
    console.log('OK ' + file + ' (' + png.length + ' bytes)');
  }
} finally {
  await browser.close();
}

copyFileSync(resolve(ROOT, ICON_SOURCE), resolve(ROOT, ICON_FAVICON));
const manifest = {
  source: ICON_SOURCE,
  sourceSha256: sha256(source),
  favicon: { file: ICON_FAVICON, sha256: sha256(source) },
  command: 'npm run icon:export',
  files,
};
writeFileSync(resolve(ROOT, ICON_MANIFEST), JSON.stringify(manifest, null, 2) + '\n', { encoding: 'utf8' });
console.log('OK ' + ICON_MANIFEST + ' y ' + ICON_FAVICON);
