import type { KeyValueStore } from './store'

/**
 * Almacenamiento en memoria con fallos inyectables, para probar el almacén sin navegador. Solo lo usan los tests.
 * failGet hace que toda lectura lance (almacenamiento bloqueado) y failSet decide por clave si una escritura lanza
 * (almacenamiento lleno o bloqueado).
 */
export interface MemoryStorage extends KeyValueStore {
  readonly data: Map<string, string>
  /** Claves de las escrituras que sí se hicieron, en orden. */
  readonly writes: string[]
  failGet: boolean
  failSet: (key: string) => boolean
}

export function createMemoryStorage(initial: Record<string, string> = {}): MemoryStorage {
  const data = new Map(Object.entries(initial))
  const writes: string[] = []
  const storage: MemoryStorage = {
    data,
    writes,
    failGet: false,
    failSet: () => false,
    getItem(key) {
      if (storage.failGet) throw new DOMException('Acceso denegado', 'SecurityError')
      return data.get(key) ?? null
    },
    setItem(key, value) {
      if (storage.failSet(key)) throw new DOMException('Almacenamiento lleno', 'QuotaExceededError')
      data.set(key, value)
      writes.push(key)
    },
  }
  return storage
}
