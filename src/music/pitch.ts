import type { Catalog, ChordShape, Inversion, NotePosition } from '../data/types'

/** Altura MIDI física: MIDI de la cuerda al aire más el traste. */
export function midiOf(
  note: Pick<NotePosition, 'string' | 'fret'>,
  tuning: Catalog['tuning'],
): number {
  return tuning[note.string] + note.fret
}

export function pitchClass(midi: number): number {
  return ((midi % 12) + 12) % 12
}

/**
 * Inversión según el bajo real: la nota física más grave, no la primera del
 * array. Devuelve null si el bajo no es una nota del acorde.
 */
export function inversionFromBass(shape: ChordShape, catalog: Catalog): Inversion | null {
  const bass = Math.min(...shape.notes.map((note) => midiOf(note, catalog.tuning)))
  const formula = shape.quality === 'maj7' && shape.notes.some((note) => note.degree === '6')
    ? [0, 4, 7, 9]
    : catalog.qualities[shape.quality].formula
  const index = formula.indexOf(pitchClass(bass - shape.rootPc))
  return index === -1 ? null : (index as Inversion)
}
