import type { KeyValueStore } from '../progress'

/**
 * Adaptador del navegador: el único sitio que toca localStorage. Devuelve null si no se puede ni acceder a él
 * (almacenamiento bloqueado, modo restringido, entorno sin navegador). Que escribir falle después, por estar lleno,
 * se trata en el almacén de progreso y no aquí.
 */
export function browserStorage(): KeyValueStore | null {
  try {
    return globalThis.localStorage ?? null
  } catch {
    return null
  }
}
