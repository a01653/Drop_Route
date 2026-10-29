import { routesDocument } from '../data'
import type { Catalog, RoutesDocument } from '../data/types'
import { DIFFICULTIES, ROUTE_MODES, SCALES, routeGroup, routeSetIds } from '../session'
import type { GameConfig } from '../session'
import type { Bucket, Counter, ProgressData, RouteLeg } from './types'

export const ROUTE_LEGS: readonly RouteLeg[] = ['ii-v', 'v-i']

/** Clave canónica de un contador. Es la que se guarda: cambiarla exige una migración del esquema. */
export function bucketKey(bucket: Bucket): string {
  switch (bucket.game) {
    case 'recognition':
      return `recognition:${bucket.setId}:${bucket.difficulty}`
    case 'routes':
      return `routes:${bucket.setId}:${bucket.mode}:${bucket.leg}`
    case 'scale-patterns':
      return `scale-patterns:${bucket.scaleId}:${bucket.difficulty}`
    case 'scale-order':
      return `scale-order:${bucket.scaleId}`
  }
}

/**
 * Todos los contadores posibles, en el orden en que se muestran: reconocimiento por set del catálogo y
 * dificultad, y rutas por set con rutas, modo y tramo. Son los únicos que se aceptan al leer datos guardados.
 */
export function allBuckets(catalog: Catalog, routes: RoutesDocument = routesDocument): Bucket[] {
  const buckets: Bucket[] = []
  for (const set of catalog.sets) {
    for (const difficulty of DIFFICULTIES) buckets.push({ game: 'recognition', setId: set.id, difficulty: difficulty.id })
  }
  for (const setId of routeSetIds(routes)) {
    for (const mode of ROUTE_MODES) {
      if (routeGroup(routes, setId, mode.id).length === 0) continue
      for (const leg of ROUTE_LEGS) buckets.push({ game: 'routes', setId, mode: mode.id, leg })
    }
  }
  for (const scale of SCALES) {
    for (const difficulty of DIFFICULTIES) buckets.push({ game: 'scale-patterns', scaleId: scale.id, difficulty: difficulty.id })
  }
  for (const scale of SCALES) buckets.push({ game: 'scale-order', scaleId: scale.id })
  return buckets
}

export function bucketIndex(catalog: Catalog, routes: RoutesDocument = routesDocument): ReadonlyMap<string, Bucket> {
  return new Map(allBuckets(catalog, routes).map((bucket): [string, Bucket] => [bucketKey(bucket), bucket]))
}

/** Contadores que corresponden a la configuración del menú: uno, o dos en «II → V → I». */
export function bucketsOfConfig(config: GameConfig): Bucket[] {
  if (config.game === 'recognition') return [{ game: 'recognition', setId: config.setId, difficulty: config.difficulty }]
  if (config.game === 'scale-patterns') return [{ game: 'scale-patterns', scaleId: config.scaleId, difficulty: config.difficulty }]
  if (config.game === 'scale-order') return [{ game: 'scale-order', scaleId: config.scaleId }]
  const legs: RouteLeg[] = config.stretch === 'both' ? ['ii-v', 'v-i'] : [config.stretch]
  return legs.map((leg): Bucket => ({ game: 'routes', setId: config.setId, mode: config.routeMode, leg }))
}

const ZERO: Counter = { attempts: 0, correct: 0 }

export function counterOf(progress: ProgressData, bucket: Bucket): Counter {
  return progress[bucketKey(bucket)] ?? ZERO
}
