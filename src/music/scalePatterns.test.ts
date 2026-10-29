import { describe, expect, it } from 'vitest'
import { scalesDocument } from '../data'
import { SCALE_TARGET_DEGREES, neckOrder, patternInKey, patternsInKey } from './scalePatterns'

const mod12 = (value: number) => ((value % 12) + 12) % 12
const KEYS = Array.from({ length: 12 }, (_, pc) => pc)
const scale = (id: string) => scalesDocument.scales.find((item) => item.id === id)!

describe('patrones de escala en cualquier tonalidad', () => {
  it.each(scalesDocument.scales.map((item) => [item.id, item]))('%s: las doce tonalidades conservan grados y digitación', (_, item) => {
    for (const tonicPc of KEYS) {
      for (const [i, placed] of patternsInKey(item, tonicPc).entries()) {
        const source = item.patterns[i]!
        expect(placed.lowFret).toBeGreaterThanOrEqual(0)
        expect(placed.lowFret).toBeLessThanOrEqual(11)
        expect(mod12(placed.shift)).toBe(tonicPc)
        expect(placed.notes.map((note) => note.fret - placed.shift)).toEqual(source.notes.map((note) => note.fret))
        for (const note of placed.notes) {
          const interval = mod12(scalesDocument.tuning[note.string] + note.fret - tonicPc)
          expect(item.degrees[item.formula.indexOf(interval)]).toBe(note.degree)
        }
      }
    }
  })

  it('no modifica los datos fuente', () => {
    const before = JSON.stringify(scalesDocument)
    for (const item of scalesDocument.scales) for (const tonicPc of KEYS) patternsInKey(item, tonicPc)
    expect(JSON.stringify(scalesDocument)).toBe(before)
  })

  it('usa la posición más grave sin trastes negativos', () => {
    const cShape = scale('major').patterns[2]!
    expect(patternInKey(cShape, 0)).toMatchObject({ caged: 'C', lowFret: 0, highFret: 3, shift: -12 })
    expect(patternInKey(scale('natural-minor').patterns[2]!, 0)).toMatchObject({ lowFret: 11, shift: 0 })
  })
})

describe('orden de grave a agudo', () => {
  it('depende de la tonalidad: C mayor 3-4-5-1-2 y E mayor 2-3-4-5-1', () => {
    expect(neckOrder(patternsInKey(scale('major'), 0)).map((p) => p.number)).toEqual([3, 4, 5, 1, 2])
    expect(neckOrder(patternsInKey(scale('major'), 4)).map((p) => p.number)).toEqual([2, 3, 4, 5, 1])
    expect(neckOrder(patternsInKey(scale('minor-pentatonic'), 4)).map((p) => p.number)).toEqual([1, 2, 3, 4, 5])
  })

  it.each(scalesDocument.scales.map((item) => [item.id, item]))('%s: es una rotación de 1-2-3-4-5 sin empates en las doce tonalidades', (_, item) => {
    for (const tonicPc of KEYS) {
      const ordered = neckOrder(patternsInKey(item, tonicPc))
      const lows = ordered.map((p) => p.lowFret)
      expect(new Set(lows).size).toBe(5)
      const first = ordered[0]!.number
      expect(ordered.map((p) => p.number)).toEqual([0, 1, 2, 3, 4].map((k) => ((first - 1 + k) % 5) + 1))
    }
  })
})

describe('grados marcados', () => {
  it('1-3-5-7 y la sexta donde falta la séptima, siempre presentes en la escala', () => {
    expect(SCALE_TARGET_DEGREES['major-pentatonic']).toEqual(['1', '3', '5', '6'])
    for (const item of scalesDocument.scales) {
      for (const degree of SCALE_TARGET_DEGREES[item.id]) expect(item.degrees).toContain(degree)
    }
  })
})
