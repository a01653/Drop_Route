import catalogJson from '../../data/catalog.json'
import routesJson from '../../data/routes.json'
import scalesJson from '../../data/scales.json'
import type { Catalog, RoutesDocument, ScalesDocument } from './types'

// Frontera de tipos: la forma y la corrección musical de los JSON las
// garantizan npm run data:check, npm run audit:music y los tests, no esta
// conversión.
export const catalog = catalogJson as unknown as Catalog
export const routesDocument = routesJson as unknown as RoutesDocument
export const scalesDocument = scalesJson as unknown as ScalesDocument

export interface DataSummary {
  playableVoicings: number
  referenceVoicings: number
  routes: number
}

export function summarizeData(source: Catalog, routes: RoutesDocument): DataSummary {
  return {
    playableVoicings: source.voicings.filter((voicing) => voicing.quizEnabled).length,
    referenceVoicings: source.voicings.filter((voicing) => !voicing.quizEnabled).length,
    routes: routes.routes.length,
  }
}

export type * from './types'
