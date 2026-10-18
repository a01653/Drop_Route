import type { Catalog, Inversion, NotePosition, Voicing } from '../data'
import { midiOf, pitchClass } from './pitch'

const NOTE_NAMES = ['C', 'D♭', 'D', 'E♭', 'E', 'F', 'G♭', 'G', 'A♭', 'A', 'B♭', 'B'] as const

export interface TonicReading {
  name: string
  roots: NotePosition[]
  equivalent?: { name: string; root: string; inversion: Inversion }
}

/** Lectura de las notas activas: la raíz y el bajo se comprueban por su altura física. */
export function tonicReading(shape: Voicing, catalog: Catalog): TonicReading {
  const intervals = [...new Set(shape.notes.map((note) => pitchClass(midiOf(note, catalog.tuning) - shape.rootPc)))].sort((a, b) => a - b)
  const sixth = intervals.join(',') === '0,4,7,9'
  const minor = intervals.join(',') === '0,3,7,10'
  const reading: TonicReading = {
    name: sixth ? `${shape.root}6` : shape.name,
    roots: shape.notes.filter((note) => pitchClass(midiOf(note, catalog.tuning)) === shape.rootPc),
  }
  if (!sixth && !minor) return reading

  // C6 = Am7 y Cm7 = E♭6. Cambia la raíz, no las cuatro posiciones físicas.
  const rootPc = pitchClass(shape.rootPc + (sixth ? 9 : 3))
  const root = NOTE_NAMES[rootPc]!
  const formula = sixth ? [0, 3, 7, 10] : [0, 4, 7, 9]
  const bass = Math.min(...shape.notes.map((note) => midiOf(note, catalog.tuning)))
  const inversion = formula.indexOf(pitchClass(bass - rootPc)) as Inversion
  return { ...reading, equivalent: { name: `${root}${sixth ? 'm7' : '6'}`, root, inversion } }
}
