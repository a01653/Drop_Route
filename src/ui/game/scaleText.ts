import { scalesDocument } from '../../data'
import type { PatternNumber, ScaleId } from '../../data'
import { scaleOf } from '../../session'

export const MINOR_SCALES: ReadonlySet<ScaleId> = new Set<ScaleId>(['minor-pentatonic', 'natural-minor'])

/** «patrón 2 · forma D», con el nombre CAGED de la escala (Dm en las menores). */
export function patternName(scaleId: ScaleId, number: PatternNumber | null): string {
  if (number === null) return 'sin respuesta'
  const pattern = scaleOf(scalesDocument, scaleId).patterns.find((item) => item.number === number)
  return `patrón ${number} · forma ${pattern?.caged ?? '?'}`
}

export const capital = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)
