import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, readJson } from '../scripts/lib/music-validation.mjs';
import { ICON_EXPORT_DIR, ICON_FAVICON, ICON_MANIFEST, ICON_SIZES, ICON_SOURCE } from '../scripts/lib/icon.mjs';
import { contrast, decodePng, hexToRgb } from './lib/png.mjs';

const read = path => readFileSync(resolve(ROOT, path));
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const svg = read(ICON_SOURCE).toString('utf8');
const manifest = readJson(ICON_MANIFEST);

// Colores de docs/VISUAL.md: raíz, tercera, quinta y séptima.
const CIRCLE_COLORS = ['#E11D48', '#0284C7', '#059669', '#EDBC07'];
const BACKGROUND = '#0B1D2E';
const numbers = (tag, attr) => [...svg.matchAll(new RegExp('<' + tag + '[^>]*?\\s' + attr + '="([-\\d.]+)"', 'g'))].map(m => Number(m[1]));

test('el manifiesto describe el original y su favicon con los hashes actuales', () => {
  assert.equal(manifest.source, ICON_SOURCE);
  assert.equal(manifest.sourceSha256, sha256(read(ICON_SOURCE)));
  assert.equal(manifest.favicon.file, ICON_FAVICON);
  assert.equal(sha256(read(ICON_FAVICON)), manifest.sourceSha256, 'public/favicon.svg debe ser copia del original');
});

test('las exportaciones PNG existen, coinciden con su hash y tienen el tamaño declarado', () => {
  assert.deepEqual(manifest.files.map(f => f.size), ICON_SIZES);
  for (const item of manifest.files) {
    assert.equal(item.file, ICON_EXPORT_DIR + '/icon-' + item.size + '.png');
    const bytes = read(item.file);
    assert.equal(sha256(bytes), item.sha256, item.file);
    const png = decodePng(bytes);
    assert.deepEqual([png.width, png.height], [item.size, item.size], item.file);
  }
});

test('el original es cuadrado, tiene fondo azul oscuro y no contiene letras ni números dibujados', () => {
  assert.match(svg, /viewBox="0 0 512 512"/);
  assert.doesNotMatch(svg, /<text|<tspan|<foreignObject/i);
  assert.match(svg, new RegExp('id="fondo"[^>]*fill="' + BACKGROUND + '"', 'i'));
  assert.ok(contrast(hexToRgb(BACKGROUND), [255, 255, 255]) > 12, 'el fondo debe ser oscuro');
});

test('tiene cuatro círculos con los colores de raíz, tercera, quinta y séptima', () => {
  const fills = [...svg.matchAll(/<circle[^>]*fill="(#[0-9A-Fa-f]{6})"/g)].map(m => m[1].toUpperCase());
  assert.deepEqual(fills, CIRCLE_COLORS);
});

test('los círculos están centrados entre trastes y sobre una cuerda, dentro de la zona segura del 80 %', () => {
  const cx = numbers('circle', 'cx'), cy = numbers('circle', 'cy'), r = numbers('circle', 'r');
  const strings = [...new Set(numbers('line', 'y1').filter(y => y > 100 && y < 420))];
  const frets = [...new Set(numbers('line', 'x1'))].sort((a, b) => a - b);
  assert.equal(cx.length, 4);
  for (let i = 0; i < 4; i++) {
    const left = Math.max(...frets.filter(x => x < cx[i])), right = Math.min(...frets.filter(x => x > cx[i]));
    assert.equal(cx[i], (left + right) / 2, 'círculo ' + i + ' entre trastes');
    assert.ok(strings.includes(cy[i]), 'círculo ' + i + ' sobre una cuerda');
    for (const edge of [cx[i] - r[i], cx[i] + r[i], cy[i] - r[i], cy[i] + r[i]]) {
      assert.ok(edge >= 51.2 && edge <= 460.8, 'zona segura maskable: ' + edge);
    }
  }
});

test('a 32 px se distinguen los cuatro círculos: color presente, contraste suficiente y centros separados', () => {
  const png = decodePng(read(ICON_EXPORT_DIR + '/icon-32.png'));
  const background = hexToRgb(BACKGROUND);
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 45;
  const centroids = [];
  for (const color of CIRCLE_COLORS) {
    const target = hexToRgb(color);
    let count = 0, sx = 0, sy = 0;
    for (let y = 0; y < 32; y++) for (let x = 0; x < 32; x++) {
      if (near(png.pixel(x, y), target)) { count++; sx += x; sy += y; }
    }
    assert.ok(count >= 12, color + ' ocupa solo ' + count + ' píxeles a 32 px');
    assert.ok(contrast(target, background) >= 3, color + ' no contrasta con el fondo (WCAG 1.4.11)');
    centroids.push([sx / count, sy / count]);
  }
  for (let i = 0; i < 4; i++) for (let j = i + 1; j < 4; j++) {
    assert.ok(Math.hypot(centroids[i][0] - centroids[j][0], centroids[i][1] - centroids[j][1]) >= 6, 'círculos ' + i + ' y ' + j + ' demasiado juntos');
  }
});

test('el decodificador PNG detecta un fichero que no lo es', () => {
  assert.throws(() => decodePng(Buffer.from('no es un png')), /No es un PNG/);
});
