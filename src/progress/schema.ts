import type { Catalog, DropFamily, RoutesDocument } from '../data/types'
import { DIFFICULTIES, GAMES, ROUTE_MODES, ROUTE_STRETCHES, SCALES, defaultConfig, isScaleKey, updateConfig } from '../session'
import type { GameConfig } from '../session'
import { bucketIndex } from './buckets'
import { SCHEMA_VERSION } from './types'
import type { Bucket, Counter, ProgressData } from './types'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value)

/** Resultado de leer lo que había guardado. Nunca lanza: lo ilegible se clasifica. */
export type ParseResult =
  | { status: 'empty' }
  | {
      status: 'loaded'
      config: GameConfig
      progress: ProgressData
      /** Versión del esquema de la que se migró, o null si ya era la actual. */
      migratedFrom: number | null
      /** Se descartaron contadores inválidos o se corrigieron campos de la configuración. */
      repaired: boolean
    }
  | { status: 'damaged'; reason: string }
  /** Guardado por una versión más reciente del esquema: no se interpreta y no se debe sobrescribir. */
  | { status: 'future'; version: number }

/**
 * Texto del documento actual. El orden de las claves es fijo (configuración en orden y contadores ordenados),
 * de modo que dos estados iguales dan el mismo texto y se puede detectar que no hay nada nuevo que escribir.
 */
export function serialize(config: GameConfig, progress: ProgressData): string {
  const { game, drop, setId, difficulty, routeMode, stretch, scaleId, scaleKey } = config
  const sorted = Object.fromEntries(
    Object.entries(progress)
      .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
      .map(([key, counter]) => [key, { attempts: counter.attempts, correct: counter.correct }]),
  )
  return JSON.stringify({
    schemaVersion: SCHEMA_VERSION,
    config: { game, drop, setId, difficulty, routeMode, stretch, scaleId, scaleKey },
    progress: sorted,
  })
}

type Migration = (doc: Record<string, unknown>) => Record<string, unknown>

/**
 * Esquema 0 -> 1. El esquema 0 NO es un formato que haya existido en una versión pública: es un documento de
 * prueba (src/progress/fixtures/schema-0.json) que obliga a ejercitar de verdad la cadena de migración. Sus
 * contadores colgaban de «counters» con claves separadas por «/» y pares [intentos, aciertos], y su
 * configuración no guardaba el Drop.
 */
const migrateFrom0: Migration = (doc) => {
  if (!isRecord(doc.counters)) throw new Error('El esquema 0 no tiene contadores')
  const progress = Object.fromEntries(
    Object.entries(doc.counters).map(([key, value]) => [
      key.replaceAll('/', ':'),
      Array.isArray(value) && value.length === 2 ? { attempts: value[0], correct: value[1] } : value,
    ]),
  )
  return { schemaVersion: 1, config: doc.config, progress }
}

/**
 * Esquema 1 -> 2 (DR-013). La configuración gana la escala y la tonalidad de los juegos de escalas; se rellenan
 * con sus valores por defecto para que un documento correcto del esquema 1 no se lea como reparado. Los
 * contadores no cambian: los de escalas son claves nuevas.
 */
const migrateFrom1: Migration = (doc) => {
  const config = isRecord(doc.config) ? { scaleId: 'major', scaleKey: 0, ...doc.config } : doc.config
  return { ...doc, schemaVersion: 2, config }
}

/** Una migración por versión anterior: MIGRATIONS[n] convierte un documento de la versión n en uno de la n + 1. */
export const MIGRATIONS: Readonly<Record<number, Migration>> = { 0: migrateFrom0, 1: migrateFrom1 }

const idOf = <T extends string>(value: unknown, options: readonly { id: T }[]): T | null =>
  typeof value === 'string' ? (options.find((option) => option.id === value)?.id ?? null) : null

/**
 * Convierte lo leído en una configuración coherente. Cada campo desconocido o ausente vuelve a su valor por
 * defecto y el resultado pasa por updateConfig, que garantiza que el set pertenece al Drop y al juego (un set sin
 * rutas no puede quedar en el juego de rutas). repaired indica si hubo que corregir algo; un Drop ausente se
 * deduce del set y no cuenta como corrección.
 */
export function sanitizeConfig(
  raw: unknown,
  catalog: Catalog,
  routes: RoutesDocument,
): { config: GameConfig; repaired: boolean } {
  const defaults = defaultConfig(catalog)
  const source = isRecord(raw) ? raw : {}
  let repaired = !isRecord(raw)
  const pick = <T>(value: T | null, fallback: T): T => {
    if (value !== null) return value
    repaired = true
    return fallback
  }

  const game = pick(idOf(source.game, GAMES), defaults.game)
  const difficulty = pick(idOf(source.difficulty, DIFFICULTIES), defaults.difficulty)
  const routeMode = pick(idOf(source.routeMode, ROUTE_MODES), defaults.routeMode)
  const stretch = pick(idOf(source.stretch, ROUTE_STRETCHES), defaults.stretch)
  const scaleId = pick(idOf(source.scaleId, SCALES), defaults.scaleId)
  const scaleKey = pick(isScaleKey(source.scaleKey) ? source.scaleKey : null, defaults.scaleKey)
  const set = typeof source.setId === 'string' ? catalog.sets.find((item) => item.id === source.setId) : undefined
  const setId = pick(set?.id ?? null, defaults.setId)
  const drops = new Set<DropFamily>(catalog.sets.map((item) => item.drop))
  const wantedDrop = source.drop === undefined && set ? set.drop : source.drop
  const drop = pick(typeof wantedDrop === 'string' && drops.has(wantedDrop as DropFamily) ? (wantedDrop as DropFamily) : null, set?.drop ?? defaults.drop)

  const config = updateConfig(catalog, defaults, { game, drop, setId, difficulty, routeMode, stretch, scaleId, scaleKey }, routes)
  const coherent = config.game === game && config.drop === drop && config.setId === setId
  return { config, repaired: repaired || !coherent }
}

function validCounter(value: unknown): Counter | null {
  if (!isRecord(value)) return null
  const { attempts, correct } = value
  if (typeof attempts !== 'number' || typeof correct !== 'number') return null
  if (!Number.isSafeInteger(attempts) || !Number.isSafeInteger(correct)) return null
  if (attempts < 0 || correct < 0 || correct > attempts) return null
  return { attempts, correct }
}

/** Se queda con los contadores de claves conocidas y valores válidos y cuenta los que descarta. */
function sanitizeProgress(raw: Record<string, unknown>, valid: ReadonlyMap<string, Bucket>) {
  const entries: [string, Counter][] = []
  let dropped = 0
  for (const key of Object.keys(raw)) {
    const counter = valid.has(key) ? validCounter(raw[key]) : null
    if (counter) entries.push([key, counter])
    else dropped += 1
  }
  return { progress: Object.fromEntries(entries) as ProgressData, dropped }
}

const damaged = (reason: string): ParseResult => ({ status: 'damaged', reason })

/**
 * Lee el texto guardado: JSON, versión del esquema, migración hasta la actual, y validación de configuración y
 * contadores. Una versión posterior a la actual se reconoce sin interpretarla.
 */
export function parseDocument(raw: string | null, catalog: Catalog, routes: RoutesDocument): ParseResult {
  if (raw === null) return { status: 'empty' }
  let value: unknown
  try {
    value = JSON.parse(raw)
  } catch {
    return damaged('El texto guardado no es JSON válido')
  }
  if (!isRecord(value)) return damaged('El documento guardado no es un objeto')
  const version = value.schemaVersion
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 0) {
    return damaged('El documento no declara una versión de esquema válida')
  }
  if (version > SCHEMA_VERSION) return { status: 'future', version }

  let doc: Record<string, unknown> = value
  for (let from = version; from < SCHEMA_VERSION; from += 1) {
    const migrate = MIGRATIONS[from]
    if (!migrate) return damaged(`No hay migración desde el esquema ${from}`)
    try {
      doc = migrate(doc)
    } catch (error) {
      return damaged(`Falló la migración desde el esquema ${from}: ${error instanceof Error ? error.message : 'error'}`)
    }
  }
  if (!isRecord(doc.progress)) return damaged('El documento no tiene contadores')

  const { config, repaired: configRepaired } = sanitizeConfig(doc.config, catalog, routes)
  const { progress, dropped } = sanitizeProgress(doc.progress, bucketIndex(catalog, routes))
  return {
    status: 'loaded',
    config,
    progress,
    migratedFrom: version < SCHEMA_VERSION ? version : null,
    repaired: configRepaired || dropped > 0,
  }
}
