/**
 * Estado de «hay una versión nueva lista» que la interfaz puede observar. Es un almacén externo mínimo para
 * useSyncExternalStore: la aplicación se entera aunque el aviso llegue mientras hay una pregunta abierta, y solo lo
 * muestra en el menú.
 */
export interface UpdateController {
  subscribe(listener: () => void): () => void
  getSnapshot(): boolean
  /** Activa la versión nueva y recarga. Solo hace algo si hay una lista. */
  apply(): void
}

export interface UpdateAnnouncer extends UpdateController {
  /** El registro avisa de que hay una versión lista y de cómo activarla. */
  announce(apply: () => void): void
}

export function createUpdateController(): UpdateAnnouncer {
  let available = false
  let applier: (() => void) | null = null
  const listeners = new Set<() => void>()
  return {
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    getSnapshot: () => available,
    apply: () => applier?.(),
    announce(apply) {
      applier = apply
      if (available) return
      available = true
      for (const listener of [...listeners]) listener()
    },
  }
}

/** Controlador sin actualizaciones: para pruebas, desarrollo y navegadores sin service worker. */
export const NO_UPDATES: UpdateController = {
  subscribe: () => () => undefined,
  getSnapshot: () => false,
  apply: () => undefined,
}
