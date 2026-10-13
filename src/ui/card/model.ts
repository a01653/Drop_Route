import type { Catalog, ChordShape, Degree, QualityKey, StringNumber } from '../../data'
import { windowForPosition } from './geometry'
import type { FretWindow, PositionNote } from './geometry'

/**
 * Lo que sabe la pregunta: dónde están las notas. Es lo único que recibe la vista
 * neutra, de modo que no puede dibujar ni etiquetar la solución aunque quisiera.
 */
export interface CardPosition {
  strings: StringNumber[]
  notes: PositionNote[]
  window: FretWindow
}

/** Lo que revela la corrección: calidad, grados e inversión de cada nota de la posición. */
export interface CardSolution {
  name: string
  quality: QualityKey
  /** Un grado por cada nota de la posición, en el mismo orden. */
  degrees: Degree[]
  inversionLabel: string
  /** Grado del bajo real, por ejemplo «b3». */
  bass: string
}

export function toPosition(
  shape: ChordShape,
  catalog: Catalog,
  window?: FretWindow,
): CardPosition {
  const set = catalog.sets.find((item) => item.id === shape.setId)
  if (!set) throw new Error(`Set desconocido: ${shape.setId}`)
  const notes = shape.notes.map(({ string, fret }) => ({ string, fret }))
  return {
    strings: set.strings,
    notes,
    window: window ?? windowForPosition(catalog, shape.setId, notes),
  }
}

export function toSolution(shape: ChordShape & { name: string }, catalog: Catalog): CardSolution {
  return {
    name: shape.name,
    quality: shape.quality,
    degrees: shape.notes.map((note) => note.degree),
    inversionLabel: catalog.inversions[shape.inversion] ?? '',
    bass: catalog.qualities[shape.quality].degrees[shape.inversion] ?? '',
  }
}

/** Grado para texto de la interfaz, con bemoles como glifo: «b3» se escribe «♭3». */
export function displayDegree(degree: string): string {
  return degree.replace(/^b+/, (flats) => '♭'.repeat(flats.length))
}

/** Lectura de pantalla de una alteración: «b3» se dice «bemol 3». */
export function spokenDegree(degree: Degree): string {
  if (degree.startsWith('bb')) return `doble bemol ${degree.slice(2)}`
  if (degree.startsWith('b')) return `bemol ${degree.slice(1)}`
  return degree
}

/** Nombre accesible de la vista neutra: solo las posiciones, que son la pregunta. */
export function positionLabel(position: CardPosition): string {
  const notes = position.notes.map((note) => `cuerda ${note.string}, traste ${note.fret}`)
  return `Posición de ${position.notes.length} notas: ${notes.join('; ')}.`
}

/** Nombre accesible de la solución: nombre, inversión y grado de cada nota. */
export function solutionLabel(position: CardPosition, solution: CardSolution): string {
  const notes = position.notes.map(
    (note, i) => `cuerda ${note.string}, traste ${note.fret}, grado ${spokenDegree(solution.degrees[i] ?? '1')}`,
  )
  return `${solution.name}, ${solution.inversionLabel}: ${notes.join('; ')}.`
}
