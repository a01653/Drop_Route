import { describe, expect, it } from 'vitest'
import type { NamedShape } from './transposition'
import {
  chordName,
  commonFretShift,
  movementText,
  routeChordName,
  transposeShape,
  transposeShapes,
  voiceMovement,
} from './transposition'

const shape = (frets: number[], rootPc = 0, quality: NamedShape['quality'] = 'maj7'): NamedShape => ({
  setId: 'D2S1',
  quality,
  rootPc,
  inversion: 0,
  root: 'C',
  name: chordName(rootPc, quality),
  notes: frets.map((fret, index) => ({
    string: (4 - index) as 4 | 3 | 2 | 1,
    fret,
    degree: ['1', '5', '7', '3'][index] as '1' | '5' | '7' | '3',
  })),
})

describe('transposición para estudio', () => {
  it('prefiere el desplazamiento cromático corto cuando no cruza el traste 0', () => {
    expect(commonFretShift([shape([3, 5, 4, 5])], 11)).toBe(-1)
    expect(commonFretShift([shape([8, 9, 9, 8])], 7)).toBe(-5)
  })

  it('sube una octava si el desplazamiento corto produciría trastes negativos', () => {
    expect(commonFretShift([shape([0, 2, 1, 1])], 11)).toBe(11)
    expect(commonFretShift([shape([0, 2, 1, 1])], 7)).toBe(7)
  })

  it('transpone nombre, raíz y trastes sin alterar grados ni inversión', () => {
    const source = shape([3, 5, 4, 5])
    const transposed = transposeShape(source, 2)
    expect(transposed.name).toBe('Dmaj7')
    expect(transposed.root).toBe('D')
    expect(transposed.rootPc).toBe(2)
    expect(transposed.notes.map((note) => note.fret)).toEqual([5, 7, 6, 7])
    expect(transposed.notes.map((note) => note.degree)).toEqual(source.notes.map((note) => note.degree))
    expect(transposed.inversion).toBe(source.inversion)
  })

  it('usa grafía funcional correcta en tonalidades con sostenidos', () => {
    expect(routeChordName(11, 'ii', 'm7')).toBe('C♯m7')
    expect(routeChordName(11, 'V', '7')).toBe('F♯7')
    expect(routeChordName(4, 'ii', 'm7b5')).toBe('F♯m7(♭5)')
  })

  it('usa un desplazamiento común para una ruta completa y conserva la conducción de voces', () => {
    const ii = shape([3, 5, 3, 5], 2, 'm7')
    const v = shape([3, 4, 3, 3], 7, '7')
    const originalMovement = voiceMovement(ii, v).map((voice) => voice.delta)
    const { shapes } = transposeShapes([ii, v], 4)
    expect(voiceMovement(shapes[0]!, shapes[1]!).map((voice) => voice.delta)).toEqual(originalMovement)
  })

  it('describe el sentido y tamaño del movimiento', () => {
    expect(movementText(0)).toBe('se mantiene')
    expect(movementText(1)).toBe('sube 1 semitono')
    expect(movementText(-1)).toBe('baja 1 semitono')
    expect(movementText(2)).toBe('sube 2 semitonos')
    expect(movementText(-3)).toBe('baja 3 semitonos')
  })
})
