import type { ScaleId, SetId } from '../data/types'
import type { Difficulty, RouteMode } from '../session'

/** Versión del esquema del documento guardado. Es independiente de la versión de la aplicación. */
export const SCHEMA_VERSION = 2

/** Clave única del documento. No lleva la versión del esquema: así una versión futura se detecta bajo la misma clave. */
export const STORAGE_KEY = 'drop-route:state'
/** Copia del último dato que no se pudo leer o reparar entero, antes de sobrescribirlo. */
export const DAMAGED_COPY_KEY = 'drop-route:state:damaged'
/** Copia del documento tal como estaba antes de migrarlo desde una versión anterior del esquema. */
export const migratedCopyKey = (version: number) => `drop-route:state:v${version}`

/** Intentos verificados y aciertos completos. Siempre enteros, 0 <= correct <= attempts. */
export interface Counter {
  readonly attempts: number
  readonly correct: number
}

/** Tramo contado en rutas. «II → V → I» no es un tramo: cada mitad cuenta por separado. */
export type RouteLeg = 'ii-v' | 'v-i'

/**
 * Lo que se cuenta por separado: reconocimiento por set y dificultad, rutas por set, modo y tramo, patrones por
 * escala y dificultad, y ordenar patrones por escala. La tonalidad de los juegos de escalas no separa contadores.
 */
export type Bucket =
  | { readonly game: 'recognition'; readonly setId: SetId; readonly difficulty: Difficulty }
  | { readonly game: 'routes'; readonly setId: SetId; readonly mode: RouteMode; readonly leg: RouteLeg }
  | { readonly game: 'scale-patterns'; readonly scaleId: ScaleId; readonly difficulty: Difficulty }
  | { readonly game: 'scale-order'; readonly scaleId: ScaleId }

/** Contadores por clave de contador (véase bucketKey). Un contador ausente equivale a cero intentos. */
export type ProgressData = Readonly<Record<string, Counter>>

export const EMPTY_PROGRESS: ProgressData = Object.freeze({})
