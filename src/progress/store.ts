import { catalog as defaultCatalog, routesDocument } from '../data'
import type { Catalog, RoutesDocument } from '../data/types'
import { defaultConfig } from '../session'
import type { GameConfig, SessionAction, SessionState } from '../session'
import { reduceApp } from './counting'
import { parseDocument, serialize } from './schema'
import { DAMAGED_COPY_KEY, EMPTY_PROGRESS, STORAGE_KEY, migratedCopyKey } from './types'
import type { ProgressData } from './types'

/** Lo mínimo que se usa de localStorage. Cualquier método puede lanzar: el almacenamiento puede estar bloqueado o lleno. */
export interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

/**
 * Avisos que debe mostrar la interfaz sobre el almacenamiento:
 * - unavailable: no hay almacenamiento utilizable; se juega en memoria.
 * - write-failed: no se pudo escribir (lleno o bloqueado); se juega en memoria y se reintenta con el próximo cambio.
 * - damaged: lo guardado no se pudo leer; se empezó de cero y SE CONSERVÓ una copia del dato dañado.
 * - damaged-uncopied: igual, pero la copia no se pudo guardar: el dato dañado sigue donde estaba, esta sesión no
 *   escribe nada (para no perderlo) y se juega en memoria.
 * - repaired: parte de lo guardado no era válida y se descartó; se conservó una copia del original.
 * - repaired-uncopied: igual, pero sin copia: el original no se reescribe y se juega en memoria.
 * - migration-uncopied: se leyó un esquema anterior y se migró en memoria, pero no se pudo conservar el original:
 *   no se reescribe y esta sesión no escribe.
 * - future: lo guardó una versión más reciente del esquema; se conserva sin tocar y esta sesión no escribe.
 */
export type NoticeKind =
  | 'unavailable'
  | 'write-failed'
  | 'damaged'
  | 'damaged-uncopied'
  | 'repaired'
  | 'repaired-uncopied'
  | 'migration-uncopied'
  | 'future'

/**
 * Avisos con los que lo que hay en la página (configuración y contadores de esta sesión) NO está guardado en el
 * dispositivo: recargar lo pierde. En los demás avisos, y sin aviso, todo lo importante está guardado.
 */
const MEMORY_ONLY: readonly NoticeKind[] = ['unavailable', 'write-failed', 'damaged-uncopied', 'repaired-uncopied', 'migration-uncopied', 'future']
export const isMemoryOnly = (notice: NoticeKind | null): boolean => notice !== null && MEMORY_ONLY.includes(notice)

export interface AppSnapshot {
  readonly session: SessionState
  readonly progress: ProgressData
  readonly notice: NoticeKind | null
}

export interface AppStore {
  getSnapshot(): AppSnapshot
  subscribe(listener: () => void): () => void
  dispatch(action: SessionAction): void
  /** Cierra un aviso informativo (dañado o reparado). Los demás dependen del estado y no se cierran. */
  dismissNotice(): void
}

export interface AppStoreOptions {
  /**
   * El almacenamiento. Indefinido: sin persistencia, ni avisos (pruebas y renderizado sin navegador). Null: no hay
   * almacenamiento utilizable (bloqueado o no soportado), con aviso.
   */
  storage?: KeyValueStore | null
  catalog?: Catalog
  routes?: RoutesDocument
}

interface Loaded {
  config: GameConfig
  progress: ProgressData
  notice: NoticeKind | null
  /** Se puede escribir sin riesgo de pisar datos que no entendemos. */
  writable: boolean
  /** Último documento que sabemos que está guardado tal cual. */
  lastDoc: string | null
}

function tryWrite(storage: KeyValueStore, key: string, value: string): boolean {
  try {
    storage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

function load(storage: KeyValueStore | null | undefined, catalog: Catalog, routes: RoutesDocument): Loaded {
  const fresh = { config: defaultConfig(catalog), progress: EMPTY_PROGRESS, lastDoc: null }
  if (storage === undefined) return { ...fresh, notice: null, writable: false }
  if (storage === null) return { ...fresh, notice: 'unavailable', writable: false }

  let raw: string | null
  try {
    raw = storage.getItem(STORAGE_KEY)
  } catch {
    return { ...fresh, notice: 'unavailable', writable: false }
  }

  const parsed = parseDocument(raw, catalog, routes)
  switch (parsed.status) {
    case 'empty':
      return { ...fresh, notice: null, writable: true }
    case 'future':
      // No se escribe nada: sobrescribirlo destruiría lo que una versión más nueva guardó.
      return { ...fresh, notice: 'future', writable: false }
    case 'damaged':
      // Nada se sobrescribe sin una copia: si no se puede copiar, el dato dañado se queda como está.
      if (raw !== null && !tryWrite(storage, DAMAGED_COPY_KEY, raw)) {
        return { ...fresh, notice: 'damaged-uncopied', writable: false }
      }
      return { ...fresh, notice: 'damaged', writable: true }
    case 'loaded': {
      const doc = serialize(parsed.config, parsed.progress)
      const migrated = parsed.migratedFrom !== null
      if (!parsed.repaired && !migrated) {
        return { config: parsed.config, progress: parsed.progress, notice: null, writable: true, lastDoc: doc }
      }
      // Migrado o reparado: primero se conserva el original; solo si se conserva se escribe el documento actual.
      const copyKey = parsed.migratedFrom !== null ? migratedCopyKey(parsed.migratedFrom) : DAMAGED_COPY_KEY
      if (raw !== null && !tryWrite(storage, copyKey, raw)) {
        const notice = parsed.repaired ? 'repaired-uncopied' : 'migration-uncopied'
        return { config: parsed.config, progress: parsed.progress, notice, writable: false, lastDoc: null }
      }
      const written = tryWrite(storage, STORAGE_KEY, doc)
      return {
        config: parsed.config,
        progress: parsed.progress,
        notice: written ? (parsed.repaired ? 'repaired' : null) : 'write-failed',
        writable: true,
        lastDoc: written ? doc : null,
      }
    }
  }
}

/**
 * Almacén de la aplicación: sesión, contadores y persistencia en un objeto sin React. Cada acción pasa por el
 * reductor puro; después, si cambió la configuración o los contadores, se escribe el documento completo (idempotente:
 * escribirlo dos veces deja lo mismo). Al abrir vuelve siempre al menú: una pregunta abierta no se reanuda.
 */
export function createAppStore(options: AppStoreOptions = {}): AppStore {
  const { storage, catalog = defaultCatalog, routes = routesDocument } = options
  const loaded = load(storage, catalog, routes)
  const writable = loaded.writable
  let lastDoc = loaded.lastDoc
  let snapshot: AppSnapshot = {
    session: { phase: 'menu', config: loaded.config },
    progress: loaded.progress,
    notice: loaded.notice,
  }
  const listeners = new Set<() => void>()
  const publish = (next: AppSnapshot) => {
    snapshot = next
    for (const listener of [...listeners]) listener()
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
    dispatch(action) {
      const before = { session: snapshot.session, progress: snapshot.progress }
      const after = reduceApp(before, action, catalog, routes)
      if (after === before) return
      let notice = snapshot.notice
      if (writable && storage) {
        const doc = serialize(after.session.config, after.progress)
        if (doc !== lastDoc) {
          if (tryWrite(storage, STORAGE_KEY, doc)) {
            lastDoc = doc
            if (notice === 'write-failed') notice = null
          } else {
            notice = 'write-failed'
          }
        }
      }
      publish({ session: after.session, progress: after.progress, notice })
    },
    dismissNotice() {
      if (snapshot.notice === 'damaged' || snapshot.notice === 'repaired') publish({ ...snapshot, notice: null })
    },
  }
}
