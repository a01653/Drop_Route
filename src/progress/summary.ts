import { routesDocument } from '../data'
import type { Catalog, RoutesDocument } from '../data/types'
import { DIFFICULTIES, DROP_LABELS, ROUTE_MODES } from '../session'
import { allBuckets, bucketKey, counterOf } from './buckets'
import type { Bucket, Counter, ProgressData, RouteLeg } from './types'

const LEG_LABELS: Record<RouteLeg, string> = { 'ii-v': 'II → V', 'v-i': 'V → I' }

/** Nombre legible de un contador: Drop, set y dificultad, o Drop, set, modo y tramo. */
export function bucketLabel(bucket: Bucket, catalog: Catalog): string {
  const set = catalog.sets.find((item) => item.id === bucket.setId)
  const place = `${set ? DROP_LABELS[set.drop] : bucket.setId} · set ${set?.number ?? '?'}`
  if (bucket.game === 'recognition') {
    return `${place} · ${DIFFICULTIES.find((item) => item.id === bucket.difficulty)?.label ?? bucket.difficulty}`
  }
  return `${place} · ${ROUTE_MODES.find((item) => item.id === bucket.mode)?.label ?? bucket.mode} · ${LEG_LABELS[bucket.leg]}`
}

/** Porcentaje entero de aciertos, o null sin intentos. */
export function percentOf(counter: Counter): number | null {
  return counter.attempts === 0 ? null : Math.round((100 * counter.correct) / counter.attempts)
}

/** «7 de 10 (70 %)», o «Sin intentos». */
export function formatCounter(counter: Counter): string {
  const percent = percentOf(counter)
  return percent === null ? 'Sin intentos' : `${counter.correct} de ${counter.attempts} (${percent} %)`
}

export interface SummaryLine {
  readonly key: string
  readonly game: Bucket['game']
  readonly label: string
  readonly counter: Counter
}

export interface ProgressSummary {
  readonly recognition: Counter
  readonly routes: Counter
  readonly total: Counter
  /** Solo los contadores con al menos un intento, en el orden del menú. */
  readonly lines: readonly SummaryLine[]
}

const add = (a: Counter, b: Counter): Counter => ({ attempts: a.attempts + b.attempts, correct: a.correct + b.correct })

/** Cifras reales de lo guardado: nada se estima ni se redondea salvo el porcentaje que se muestra. */
export function summarize(progress: ProgressData, catalog: Catalog, routes: RoutesDocument = routesDocument): ProgressSummary {
  let recognition: Counter = { attempts: 0, correct: 0 }
  let routeTotals: Counter = { attempts: 0, correct: 0 }
  const lines: SummaryLine[] = []
  for (const bucket of allBuckets(catalog, routes)) {
    const counter = counterOf(progress, bucket)
    if (counter.attempts === 0) continue
    lines.push({ key: bucketKey(bucket), game: bucket.game, label: bucketLabel(bucket, catalog), counter })
    if (bucket.game === 'recognition') recognition = add(recognition, counter)
    else routeTotals = add(routeTotals, counter)
  }
  return { recognition, routes: routeTotals, total: add(recognition, routeTotals), lines }
}
