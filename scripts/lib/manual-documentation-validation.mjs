import {readFileSync,existsSync,readdirSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

// Integridad de los manuales de uso e instalación y de sus capturas. Independiente de la del DTS: no ejecuta el
// Markdown ni compila nada; solo contrasta los archivos con los registros que escribe scripts/build_manuals.py
// (<manual>.build.json) y con capturas.json, que escribe `npm run docs:captures`.

export const MANUAL_TEMPLATE = 'docs/latex/manual-template.tex';
export const MANUAL_GENERATOR = 'scripts/build_manuals.py';
export const MANUAL_COMMAND = 'npm run docs:build';
export const MANUAL_ENGINES = ['lualatex', 'xelatex'];
export const MANUALS = [
  {key: 'uso', title: 'Manual de uso', name: 'Manual_Uso_Drop_Route', source: 'docs/manuals/USO.md'},
  {key: 'instalacion', title: 'Manual de instalación', name: 'Manual_Instalacion_Drop_Route', source: 'docs/manuals/INSTALACION.md'},
];
export const MANUAL_ROLES = ['source', 'template', 'generator', 'capture', 'latex', 'pdf'];

export const CAPTURE_DIR = 'docs/manuals/capturas';
export const CAPTURE_MANIFEST = CAPTURE_DIR + '/capturas.json';
export const CAPTURE_COMMAND = 'npm run docs:captures';
// Contrato de captures/figures.ts: mismos identificadores y mismo orden.
export const CAPTURE_IDS = [
  'menu-reconocimiento-1280',
  'menu-rutas-1280',
  'facil-pregunta-1280',
  'facil-correccion-1280',
  'medio-pregunta-1280',
  'medio-correccion-1280',
  'dificil-pregunta-1280',
  'dificil-correccion-1280',
  'ruta-pregunta-1280',
  'ruta-fallo-solucion-1280',
  'ruta-fallo-tu-respuesta-1280',
  'progreso-detalle-1280',
  'escritorio-menu-1280',
  'menu-escalas-1280',
  'estudio-escalas-1280',
  'patron-medio-pregunta-1280',
  'patron-dificil-correccion-1280',
  'orden-pregunta-1280',
  'orden-correccion-1280',
];
export const CAPTURE_VIEWPORTS = {
  movil: {width: 360, height: 780, deviceScaleFactor: 2},
  escritorio: {width: 1280, height: 800, deviceScaleFactor: 2},
};

const SHA_RE = /^[a-f0-9]{64}$/;
const SAFE_PATH_RE = /^[A-Za-z0-9._/-]+$/;
const IMAGE_RE = /!\[[^\]\n]*\]\(([^)\s]+)\)/g;
const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
const isObject = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isText = (value) => typeof value === 'string' && value.trim() !== '';
const isCount = (value) => Number.isInteger(value) && value > 0;
const capturePath = (id) => CAPTURE_DIR + '/' + id + '.png';
const captureIds = new Set(CAPTURE_IDS);

/** Ruta POSIX relativa al repositorio, sin unidades, barras invertidas, segmentos vacíos ni «..». */
export function isRepoRelativePath(path) {
  if (typeof path !== 'string' || !SAFE_PATH_RE.test(path)) return false;
  return path.split('/').every((part) => part !== '' && part !== '.' && part !== '..');
}

/** Identificadores de captura citados por el Markdown, sin repetir y en orden; `invalid` recoge lo que no es capturas/<id>.png. */
export function referencedCaptures(markdown) {
  const ids = [], invalid = [];
  for (const match of markdown.replace(/\r\n/g, '\n').matchAll(IMAGE_RE)) {
    const found = /^capturas\/([a-z0-9-]+)\.png$/.exec(match[1]);
    if (!found || !captureIds.has(found[1])) invalid.push(match[1]);
    else if (!ids.includes(found[1])) ids.push(found[1]);
  }
  return {ids, invalid};
}

/** Dimensiones de la cabecera IHDR, o null si no empieza como un PNG. */
function pngHeader(bytes) {
  if (bytes.length < 24 || !bytes.subarray(0, 8).equals(PNG_SIGNATURE) || bytes.subarray(12, 16).toString('latin1') !== 'IHDR') return null;
  return {width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20)};
}

function readJson(path) {
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch {
    return undefined;
  }
}

/**
 * Valida capturas.json y los PNG de docs/manuals/capturas byte a byte. No exige que su commit sea el de la documentación.
 * @returns {{errors: string[], present: boolean}}
 */
export function validateCaptures(root) {
  const errors = [];
  const dir = resolve(root, CAPTURE_DIR);
  const manifestPath = resolve(root, CAPTURE_MANIFEST);
  const pngs = existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.png')).sort() : [];
  if (!existsSync(manifestPath)) {
    for (const name of pngs) errors.push('Captura sin capturas.json: ' + CAPTURE_DIR + '/' + name);
    return {errors, present: false};
  }
  const manifest = readJson(manifestPath);
  if (!isObject(manifest) || manifest.schema !== 1 || !isText(manifest.generatedBy) ||
      !isObject(manifest.browser) || !isText(manifest.browser.name) || !isText(manifest.browser.version) ||
      !(manifest.commit === null || isText(manifest.commit)) || !Array.isArray(manifest.captures)) {
    errors.push('capturas.json inválido');
    return {errors, present: true};
  }
  const ids = manifest.captures.map((item) => (isObject(item) ? item.id : undefined));
  if (ids.length !== CAPTURE_IDS.length || ids.some((id, index) => id !== CAPTURE_IDS[index])) {
    errors.push('capturas.json no lista las ' + CAPTURE_IDS.length + ' figuras del contrato, en su orden');
    return {errors, present: true};
  }
  for (const item of manifest.captures) {
    const where = 'capturas.json (' + item.id + ')';
    const spec = isObject(item.viewport) ? CAPTURE_VIEWPORTS[item.viewport.kind] : undefined;
    const expectedKind = item.id.endsWith('-1280') ? 'escritorio' : 'movil';
    if (item.file !== item.id + '.png' || !isText(item.title) || !isText(item.game) || !isText(item.state) ||
        !isObject(item.observed) || !isObject(item.region) || !['viewport', 'tramo'].includes(item.region.kind) ||
        !isObject(item.pixels) || !isCount(item.pixels.width) || !isCount(item.pixels.height) ||
        !isCount(item.bytes) || typeof item.sha256 !== 'string' || !SHA_RE.test(item.sha256) ||
        !spec || item.viewport.kind !== expectedKind || item.viewport.width !== spec.width ||
        item.viewport.height !== spec.height || item.viewport.deviceScaleFactor !== spec.deviceScaleFactor ||
        item.pixels.width !== spec.width * spec.deviceScaleFactor) {
      errors.push('Metadatos inválidos: ' + where);
      continue;
    }
    const path = resolve(root, capturePath(item.id));
    if (!existsSync(path)) {
      errors.push('Captura ausente: ' + capturePath(item.id));
      continue;
    }
    const bytes = readFileSync(path);
    const header = pngHeader(bytes);
    if (!header) errors.push('Captura que no es un PNG: ' + capturePath(item.id));
    else if (bytes.length !== item.bytes || sha(bytes) !== item.sha256 ||
             header.width !== item.pixels.width || header.height !== item.pixels.height) {
      errors.push('Captura alterada respecto a capturas.json: ' + capturePath(item.id));
    }
  }
  for (const name of pngs) {
    if (!captureIds.has(name.slice(0, -'.png'.length))) errors.push('Captura inesperada: ' + CAPTURE_DIR + '/' + name);
  }
  return {errors, present: true};
}

/** Entradas que debe tener el registro de un manual según su Markdown actual. */
function expectedEntries(doc, ids) {
  const base = 'docs/latex/' + doc.name;
  const entries = new Map([
    [doc.source, 'source'],
    [MANUAL_TEMPLATE, 'template'],
    [MANUAL_GENERATOR, 'generator'],
    [base + '.tex', 'latex'],
    [base + '.pdf', 'pdf'],
  ]);
  for (const id of ids) entries.set(capturePath(id), 'capture');
  return entries;
}

/**
 * @param {string} root
 * @param {{final?: boolean}} [options]
 * @returns {{errors: string[], pending: string[], notGenerated: string[]}}
 */
export function validateManualDocumentation(root, {final = false} = {}) {
  const errors = [], pending = [], notGenerated = [];
  const result = () => ({errors, pending, notGenerated});
  let policy;
  try {
    policy = JSON.parse(readFileSync(resolve(root, 'docs/documentation-policy.json'), 'utf8'));
  } catch {
    errors.push('Política documental ausente o inválida');
    return result();
  }
  if (!policy || policy.schemaVersion !== 1 ||
      !['deferred', 'required'].includes(policy.dtsDerivatives) || policy.finalWorkOrder !== 'DR-007') {
    errors.push('Política documental inválida');
    return result();
  }
  const requireCurrent = final || policy.dtsDerivatives === 'required';
  let anyGenerated = false;
  const checked = new Set();

  for (const doc of MANUALS) {
    const label = doc.title.toLowerCase();
    const manifestPath = 'docs/latex/' + doc.name + '.build.json';
    const sourcePath = resolve(root, doc.source);
    if (!existsSync(sourcePath)) {
      errors.push('Falta el Markdown del ' + label + ': ' + doc.source);
      continue;
    }
    const references = referencedCaptures(readFileSync(sourcePath, 'utf8'));
    for (const invalid of references.invalid) errors.push('Imagen no admitida en ' + doc.source + ': ' + invalid);
    const expected = expectedEntries(doc, references.ids);

    const present = [manifestPath, 'docs/latex/' + doc.name + '.tex', 'docs/latex/' + doc.name + '.pdf']
      .map((path) => ({path, found: existsSync(resolve(root, path))}));
    if (!requireCurrent && present.every((item) => !item.found)) {
      notGenerated.push(doc.source);
      continue;
    }
    anyGenerated = true;
    const missing = present.filter((item) => !item.found);
    for (const item of missing) errors.push('Archivo del ' + label + ' ausente: ' + item.path);
    if (missing.some((item) => item.path === manifestPath)) continue;

    const manifest = readJson(resolve(root, manifestPath));
    if (!isObject(manifest) || manifest.document !== doc.key || manifest.title !== doc.title ||
        manifest.source !== doc.source || manifest.command !== MANUAL_COMMAND ||
        !MANUAL_ENGINES.includes(manifest.engine) || !Array.isArray(manifest.files)) {
      errors.push('Registro del ' + label + ' inválido');
      continue;
    }

    const seen = new Map();
    let sourceChanged = false;
    for (const item of manifest.files) {
      const valid = isObject(item) && isRepoRelativePath(item.path) && MANUAL_ROLES.includes(item.role) &&
        typeof item.sha256 === 'string' && SHA_RE.test(item.sha256);
      const fixed = valid && expected.has(item.path) && expected.get(item.path) === item.role;
      // Una captura bien formada pero que el Markdown actual ya no cita es una fuente cambiada, no una entrada ajena.
      const known = valid && item.role === 'capture' && /^docs\/manuals\/capturas\/[a-z0-9-]+\.png$/.test(item.path) &&
        captureIds.has(item.path.slice(CAPTURE_DIR.length + 1, -'.png'.length));
      if (!valid || seen.has(item.path) || !(fixed || known)) {
        errors.push('Entrada del registro del ' + label + ' inválida');
        continue;
      }
      seen.set(item.path, item);
      if (item.path === doc.source && sha(readFileSync(sourcePath)) !== item.sha256) sourceChanged = true;
    }

    const absent = [...expected.keys()].filter((path) => !seen.has(path));
    const extra = [...seen.keys()].filter((path) => !expected.has(path));
    if (absent.length || extra.length) {
      if (requireCurrent || !sourceChanged) {
        for (const path of absent) errors.push('Falta entrada en el registro del ' + label + ': ' + path);
        for (const path of extra) errors.push('Entrada inesperada en el registro del ' + label + ': ' + path);
      } else {
        pending.push(manifestPath);
      }
    }

    for (const [path, item] of seen) {
      if (checked.has(path)) continue; // plantilla y generador son comunes a ambos manuales
      checked.add(path);
      const file = resolve(root, path);
      if (!existsSync(file)) {
        errors.push('Archivo del ' + label + ' ausente: ' + path);
        continue;
      }
      if (sha(readFileSync(file)) === item.sha256) continue;
      if (item.role === 'latex' || item.role === 'pdf') errors.push('Derivado del ' + label + ' alterado: ' + path);
      else if (requireCurrent) errors.push('Manual pendiente de regenerar: ' + path);
      else pending.push(path);
    }
  }

  // capturas.json se comprueba aparte: el generador no lo usa para componer el PDF, así que no figura en los registros.
  const captures = validateCaptures(root);
  errors.push(...captures.errors);
  if (!captures.present && (requireCurrent || anyGenerated)) errors.push('Falta capturas.json: ' + CAPTURE_MANIFEST);
  return result();
}
