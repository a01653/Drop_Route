import { resolve } from 'node:path'

// Destino de las capturas. Sin variable se escribe en las entradas versionadas de los manuales (regeneración local
// intencional); con DROP_ROUTE_CAPTURE_OUTPUT se escribe solo en el directorio indicado, que nunca puede ser el versionado.
// JavaScript estándar sin imports de Playwright ni de la app: los tests de la base lo cargan con cualquier Node admitido.

export const OUTPUT_VARIABLE = 'DROP_ROUTE_CAPTURE_OUTPUT'
export const VERSIONED_DIR = 'docs/manuals/capturas'

/**
 * @param {Record<string, string | undefined>} [env]
 * @param {string} [cwd]
 * @returns {string}
 */
export function resolveCaptureDir(env = process.env, cwd = process.cwd()) {
  const versioned = resolve(cwd, VERSIONED_DIR)
  const requested = env[OUTPUT_VARIABLE]
  if (requested === undefined) return versioned
  if (requested.trim() === '') throw new Error(`${OUTPUT_VARIABLE} está definida pero vacía: indica un directorio o quita la variable.`)
  const dir = resolve(cwd, requested)
  const same = process.platform === 'win32' ? dir.toLowerCase() === versioned.toLowerCase() : dir === versioned
  if (same) throw new Error(`${OUTPUT_VARIABLE} no puede apuntar a ${VERSIONED_DIR}: son las entradas versionadas de los manuales.`)
  return dir
}
