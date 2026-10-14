// Reexportación tipada: la lógica vive en scripts/lib/capture-output.mjs para que los tests de la base la importen
// sin ejecutar TypeScript con Node.
export { OUTPUT_VARIABLE, VERSIONED_DIR, resolveCaptureDir } from '../scripts/lib/capture-output.mjs'
