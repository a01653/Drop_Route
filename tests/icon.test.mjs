import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { ROOT, readJson } from '../scripts/lib/music-validation.mjs';
import {
  ICON_EXPORT_DIR,
  ICON_FAVICON,
  ICON_MANIFEST,
  ICON_MASKABLE_SIZE,
  ICON_MASKABLE_SOURCE,
  ICON_PWA,
  ICON_PWA_ANY_SIZE,
  ICON_SIZES,
  ICON_SOURCE,
} from '../scripts/lib/icon.mjs';
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

// Margen de diseño del icono «any»: todo cabe en el 80 % central del lienzo. NO es la zona segura de un icono
// maskable, que es un círculo (véanse los tests de la variante maskable más abajo).
test('los círculos están centrados entre trastes y sobre una cuerda, dentro del 80 % central del lienzo', () => {
  const cx = numbers('circle', 'cx'), cy = numbers('circle', 'cy'), r = numbers('circle', 'r');
  const strings = [...new Set(numbers('line', 'y1').filter(y => y > 100 && y < 420))];
  const frets = [...new Set(numbers('line', 'x1'))].sort((a, b) => a - b);
  assert.equal(cx.length, 4);
  for (let i = 0; i < 4; i++) {
    const left = Math.max(...frets.filter(x => x < cx[i])), right = Math.min(...frets.filter(x => x > cx[i]));
    assert.equal(cx[i], (left + right) / 2, 'círculo ' + i + ' entre trastes');
    assert.ok(strings.includes(cy[i]), 'círculo ' + i + ' sobre una cuerda');
    for (const edge of [cx[i] - r[i], cx[i] + r[i], cy[i] - r[i], cy[i] + r[i]]) {
      assert.ok(edge >= 51.2 && edge <= 460.8, 'margen del 80 % central: ' + edge);
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

// ---------------------------------------------------------------------------------------------------------------
// PWA (DR-006): icono maskable y tamaños de la instalación.
// Zona segura maskable: un círculo central de radio el 40 % del tamaño, no un cuadrado del 80 %
// (https://www.w3.org/TR/appmanifest/#icon-masks).
// ---------------------------------------------------------------------------------------------------------------
const maskableSvg = read(ICON_MASKABLE_SOURCE).toString('utf8');
const CENTER = 256;
const SAFE_RADIUS = 0.4 * 512;
const BACKGROUND_RGB = hexToRgb(BACKGROUND);
// Pequeña tolerancia por si la exportación convierte el color; el dibujo está a mucha más distancia del fondo.
const isBackgroundColor = pixel => Math.hypot(pixel[0] - BACKGROUND_RGB[0], pixel[1] - BACKGROUND_RGB[1], pixel[2] - BACKGROUND_RGB[2]) < 6;
const attr = (tag, name) => Number(new RegExp('\\s' + name + '="([-\\d.]+)"').exec(tag)?.[1]);
// Se compara el dibujo sin espacios entre etiquetas ni comentarios: lo que cambia es la sangría, no el dibujo.
const drawingOf = text => text.replace(/<!--[\s\S]*?-->/g, '').replace(/>\s+</g, '><').trim();

/**
 * Punto más lejano del dibujo respecto al centro del lienzo, con el trazo incluido. Cota conservadora: todos los
 * trazos se tratan con el grosor máximo del icono (24, el de la ruta) y extremos redondeados.
 */
function farthest(svgText, { scale = 1, translate = [0, 0] } = {}) {
  const maxStroke = 24;
  const at = (x, y) => Math.hypot(x * scale + translate[0] - CENTER, y * scale + translate[1] - CENTER);
  let far = 0;
  for (const [tag] of svgText.matchAll(/<circle\b[^>]*>/g)) {
    far = Math.max(far, at(attr(tag, 'cx'), attr(tag, 'cy')) + attr(tag, 'r') * scale);
  }
  for (const [tag] of svgText.matchAll(/<line\b[^>]*>/g)) {
    for (const [x, y] of [[attr(tag, 'x1'), attr(tag, 'y1')], [attr(tag, 'x2'), attr(tag, 'y2')]]) {
      far = Math.max(far, at(x, y) + (maxStroke * scale) / 2);
    }
  }
  const points = /<polyline\b[^>]*\spoints="([^"]+)"/.exec(svgText)?.[1] ?? '';
  for (const pair of points.trim().split(/\s+/)) {
    const [x, y] = pair.split(',').map(Number);
    far = Math.max(far, at(x, y) + (maxStroke * scale) / 2);
  }
  return far;
}

test('la variante maskable es el mismo dibujo del icono aprobado, reducido al 80 % y centrado, sobre fondo opaco', () => {
  const transform = /<g id="dibujo" transform="translate\(([-\d.]+) ([-\d.]+)\) scale\(([-\d.]+)\)">/.exec(maskableSvg);
  assert.ok(transform, 'falta el grupo «dibujo» con su transformación');
  assert.deepEqual(transform.slice(1).map(Number), [51.2, 51.2, 0.8]);
  assert.match(maskableSvg, /viewBox="0 0 512 512"/);
  assert.doesNotMatch(maskableSvg, /<text|<tspan|<foreignObject/i);
  // Fondo: un rectángulo a sangre, del mismo color y sin transparencia.
  const background = /<rect id="fondo"[^>]*>/.exec(maskableSvg)?.[0] ?? '';
  assert.match(background, /width="512"/);
  assert.match(background, /height="512"/);
  assert.match(background, new RegExp('fill="' + BACKGROUND + '"', 'i'));
  assert.doesNotMatch(background, /opacity/i);
  // El dibujo es idéntico al del original.
  const original = /<rect id="fondo"[^>]*\/>([\s\S]*)<\/svg>/.exec(svg)?.[1] ?? '';
  const inner = /<g id="dibujo"[^>]*>([\s\S]*)<\/g>\s*<\/svg>/.exec(maskableSvg)?.[1] ?? '';
  assert.ok(drawingOf(original).length > 500, 'no se encontró el dibujo del original');
  assert.equal(drawingOf(inner), drawingOf(original));
});

test('el dibujo maskable cabe en el círculo central de radio el 40 %, y el original no (por eso existe la variante)', () => {
  const inside = farthest(maskableSvg, { scale: 0.8, translate: [51.2, 51.2] });
  assert.ok(inside <= SAFE_RADIUS, 'el dibujo llega a ' + inside.toFixed(1) + ' del centro; el límite es ' + SAFE_RADIUS);
  assert.ok(inside > 150, 'el dibujo no debería quedar diminuto: ' + inside.toFixed(1));
  const outside = farthest(svg);
  assert.ok(outside > SAFE_RADIUS, 'el original llega a ' + outside.toFixed(1) + ': no serviría como maskable');
});

// --- Dependen de los PNG que genera npm run icon:export (Chromium). Fallan hasta que se exportan. ---------------

test('el manifiesto del icono declara las exportaciones PWA con los hashes actuales', () => {
  const pwa = manifest.pwa;
  assert.ok(pwa, 'exports.json no tiene la sección «pwa»: ejecuta npm run icon:export');
  assert.equal(pwa.maskableSource, ICON_MASKABLE_SOURCE);
  assert.equal(pwa.maskableSourceSha256, sha256(read(ICON_MASKABLE_SOURCE)));
  assert.deepEqual(
    pwa.exports.map(item => [item.size, item.purpose]),
    [[ICON_PWA_ANY_SIZE, 'any'], [ICON_MASKABLE_SIZE, 'maskable']],
  );
  for (const item of [...pwa.exports, ...pwa.public]) {
    const png = decodePng(read(item.file));
    assert.equal(sha256(read(item.file)), item.sha256, item.file);
    assert.deepEqual([png.width, png.height], [item.size, item.size], item.file);
  }
});

test('public/icons contiene copias idénticas de las exportaciones, y el 512 «any» es el icono aprobado', () => {
  assert.deepEqual(manifest.pwa?.public.map(item => item.file), ICON_PWA.map(item => item.file));
  for (const item of ICON_PWA) {
    assert.ok(read(item.file).equals(read(item.from)), item.file + ' debe ser copia de ' + item.from);
  }
  const approved512 = manifest.files.find(item => item.size === 512);
  assert.equal(sha256(read(ICON_PWA[1].file)), approved512.sha256);
});

test('el PNG maskable es opaco, y fuera del círculo central de radio el 40 % solo hay fondo', () => {
  const maskable = decodePng(read(ICON_EXPORT_DIR + '/icon-maskable-512.png'));
  assert.deepEqual([maskable.width, maskable.height], [512, 512]);
  let artwork = 0;
  let farthestArtwork = 0;
  for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
    assert.equal(maskable.alpha(x, y), 255, 'píxel transparente en ' + x + ',' + y);
    const distance = Math.hypot(x + 0.5 - CENTER, y + 0.5 - CENTER);
    const isBackground = isBackgroundColor(maskable.pixel(x, y));
    if (!isBackground) { artwork++; farthestArtwork = Math.max(farthestArtwork, distance); }
    // Tolerancia de un píxel para el suavizado de bordes.
    if (distance > SAFE_RADIUS + 1) assert.ok(isBackground, 'dibujo fuera de la zona segura en ' + x + ',' + y);
  }
  assert.ok(artwork > 10000, 'el icono maskable parece vacío');
  assert.ok(farthestArtwork <= SAFE_RADIUS + 1, 'el dibujo llega a ' + farthestArtwork.toFixed(1));
  for (const [x, y] of [[0, 0], [511, 0], [0, 511], [511, 511], [256, 0], [0, 256]]) {
    assert.ok(isBackgroundColor(maskable.pixel(x, y)), 'esquina o borde con color distinto del fondo en ' + x + ',' + y);
  }
});

test('el PNG de 192 «any» muestra los cuatro círculos de colores', () => {
  const png = decodePng(read(ICON_EXPORT_DIR + '/icon-' + ICON_PWA_ANY_SIZE + '.png'));
  const near = (p, q) => Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]) < 45;
  for (const color of CIRCLE_COLORS) {
    const target = hexToRgb(color);
    let count = 0;
    for (let y = 0; y < 192; y++) for (let x = 0; x < 192; x++) if (near(png.pixel(x, y), target)) count++;
    assert.ok(count >= 400, color + ' ocupa solo ' + count + ' píxeles a 192 px');
  }
});
