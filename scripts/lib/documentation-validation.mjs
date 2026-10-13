import {readFileSync,existsSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';

export const DTS_INPUTS = [
  'docs/DTS.md',
  'docs/latex/dts-template.tex',
  'scripts/build_dts.py',
];
export const DTS_ARTIFACTS = [
  'docs/latex/DTS_Drop_Route.tex',
  'docs/latex/DTS_Drop_Route.pdf',
];

export function validateDtsDocumentation(root, {final = false} = {}) {
  const errors = [], pending = [];
  const result = () => ({errors, pending});
  let policy, manifest;
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
  try {
    manifest = JSON.parse(readFileSync(resolve(root, 'docs/latex/DTS_Drop_Route.build.json'), 'utf8'));
  } catch {
    errors.push('Registro del DTS ausente o inválido');
    return result();
  }
  if (!manifest || manifest.source !== 'docs/DTS.md' || !Array.isArray(manifest.files)) {
    errors.push('Registro del DTS inválido');
    return result();
  }
  const expected = new Set([...DTS_INPUTS, ...DTS_ARTIFACTS]);
  const seen = new Set();
  const requireCurrent = final || policy.dtsDerivatives === 'required';
  for (const item of manifest.files) {
    if (!item || !expected.has(item.path) || seen.has(item.path) ||
        typeof item.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(item.sha256)) {
      errors.push('Entrada del registro del DTS inválida');
      continue;
    }
    seen.add(item.path);
    const path = resolve(root, item.path);
    if (!existsSync(path)) {
      errors.push('Archivo del DTS ausente: ' + item.path);
      continue;
    }
    const hash = createHash('sha256').update(readFileSync(path)).digest('hex');
    if (hash === item.sha256) continue;
    if (DTS_ARTIFACTS.includes(item.path)) errors.push('Derivado del DTS alterado: ' + item.path);
    else if (requireCurrent) errors.push('DTS pendiente de regenerar: ' + item.path);
    else pending.push(item.path);
  }
  for (const path of expected) {
    if (!seen.has(path)) errors.push('Falta entrada en el registro del DTS: ' + path);
  }
  return result();
}
