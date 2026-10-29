import { routesDocument } from '../data'
import type { Catalog, RoutesDocument } from '../data/types'
import { DIFFICULTIES, DROP_LABELS, ROUTE_MODES, SCALES } from '../session'
import { allBuckets, bucketKey, counterOf } from './buckets'
import type { Bucket, Counter, ProgressData, RouteLeg } from './types'

const LEG_LABELS: Record<RouteLeg, string> = { 'ii-v': 'II → V', 'v-i': 'V → I' }

const difficultyLabel = (id: string) => DIFFICULTIES.find((item) => item.id === id)?.label ?? id
const scaleLabel = (id: string) => SCALES.find((item) => item.id === id)?.label ?? id

/** Nombre legible de un contador: Drop, set y dificultad; Drop, set, modo y tramo; o escala y dificultad. */
export function bucketLabel(bucket: Bucket, catalog: Catalog): string {
  if (bucket.game === 'scale-patterns') return `Patrones · ${scaleLabel(bucket.scaleId)} · ${difficultyLabel(bucket.difficulty)}`
  if (bucket.game === 'scale-order') return `Ordenar · ${scaleLabel(bucket.scaleId)}`
  const set = catalog.sets.find((item) => item.id === bucket.setId)
  const place = `${set ? DROP_LABELS[set.drop] : bucket.setId} · set ${set?.number ?? '?'}`
  if (bucket.game === 'recognition') {
    return `${place} · ${difficultyLabel(bucket.difficulty)}`
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
  readonly scalePatterns: Counter
  readonly scaleOrder: Counter
  readonly total: Counter
  /** Solo los contadores con al menos un intento, en el orden del menú. */
  readonly lines: readonly SummaryLine[]
}

const add = (a: Counter, b: Counter): Counter => ({ attempts: a.attempts + b.attempts, correct: a.correct + b.correct })

/** Cifras reales de lo guardado: nada se estima ni se redondea salvo el porcentaje que se muestra. */
export function summarize(progress: ProgressData, catalog: Catalog, routes: RoutesDocument = routesDocument): ProgressSummary {
  const zero: Counter = { attempts: 0, correct: 0 }
  const totals: Record<Bucket['game'], Counter> = { recognition: zero, routes: zero, 'scale-patterns': zero, 'scale-order': zero }
  const lines: SummaryLine[] = []
  for (const bucket of allBuckets(catalog, routes)) {
    const counter = counterOf(progress, bucket)
    if (counter.attempts === 0) continue
    lines.push({ key: bucketKey(bucket), game: bucket.game, label: bucketLabel(bucket, catalog), counter })
    totals[bucket.game] = add(totals[bucket.game], counter)
  }
  return {
    recognition: totals.recognition,
    routes: totals.routes,
    scalePatterns: totals['scale-patterns'],
    scaleOrder: totals['scale-order'],
    total: Object.values(totals).reduce(add, zero),
    lines,
  }
}
