import type { ChordShape, SetId } from '../data'

const DROP24_SETS: ReadonlySet<SetId> = new Set(['D24S1', 'D24S2'])

/** Las nueve formas en las que la lámina baja la séptima mayor a sexta. */
export function usesSourceSixth(shape: ChordShape): boolean {
  return shape.quality === 'maj7' && (shape.inversion === 3 || (shape.inversion === 1 && DROP24_SETS.has(shape.setId)))
}

/** Deriva cuatro voces activas y conserva la séptima como referencia gris. */
export function withSixthAlternative<T extends ChordShape & { name: string; root: string }>(shape: T, enabled = usesSourceSixth(shape)): T {
  if (!enabled || !shape.notes.some((note) => note.degree === '7')) return shape
  return {
    ...shape,
    name: `${shape.name} – ${shape.root}6`,
    referenceNotes: shape.notes.filter((note) => note.degree === '7').map((note) => ({ ...note })),
    notes: shape.notes.map((note) =>
      note.degree === '7' ? { ...note, fret: note.fret - 2, degree: '6' as const } : note,
    ),
  }
}
