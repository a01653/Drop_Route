// Rutas y tamaños del icono, compartidos por la exportación y sus tests.
export const ICON_SOURCE = 'assets/icon/drop-route-icon.svg';
export const ICON_EXPORT_DIR = 'assets/icon/exports';
export const ICON_MANIFEST = 'assets/icon/exports.json';
export const ICON_FAVICON = 'public/favicon.svg';
// 32 es el tamaño de legibilidad exigido.
export const ICON_SIZES = [16, 32, 48, 64, 128, 256, 512];

// PWA (DR-006): 192 y 512 «any» a partir del icono aprobado, y 512 maskable a partir de su variante, que es el
// mismo dibujo reducido al 80 % dentro de la zona segura circular. Las exportaciones viven con las demás y
// public/icons/ guarda las copias que empaqueta el build, de modo que npm run build no necesita Chromium.
export const ICON_MASKABLE_SOURCE = 'assets/icon/drop-route-icon-maskable.svg';
export const ICON_PWA_DIR = 'public/icons';
export const ICON_PWA_ANY_SIZE = 192;
export const ICON_MASKABLE_SIZE = 512;
export const ICON_PWA = [
  // from: de qué exportación sale la copia de public/icons.
  { file: ICON_PWA_DIR + '/icon-192.png', from: ICON_EXPORT_DIR + '/icon-192.png', size: 192, purpose: 'any' },
  { file: ICON_PWA_DIR + '/icon-512.png', from: ICON_EXPORT_DIR + '/icon-512.png', size: 512, purpose: 'any' },
  { file: ICON_PWA_DIR + '/maskable-512.png', from: ICON_EXPORT_DIR + '/icon-maskable-512.png', size: 512, purpose: 'maskable' },
];
