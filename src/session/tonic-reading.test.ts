import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { Voicing } from '../data'
import { evaluate, voicingOf } from './recognition'
import { tonicReading } from '../music/tonicReading'

// Oráculos físicos independientes (4-3-2-1), sin generar posiciones desde el catálogo.
const c6: Voicing = {
  id: 'c6-oracle', setId: 'D2S1', root: 'C', rootPc: 0, quality: 'maj7',
  name: 'C6', inversion: 3, quizEnabled: true,
  notes: [
    { string: 4, fret: 7, degree: '6' }, // A
    { string: 3, fret: 9, degree: '3' }, // E
    { string: 2, fret: 8, degree: '5' }, // G
    { string: 1, fret: 8, degree: '1' }, // C
  ],
}
const cm7: Voicing = {
  id: 'cm7-oracle', setId: 'D2S1', root: 'C', rootPc: 0, quality: 'm7',
  name: 'Cm7', inversion: 0, quizEnabled: true,
  notes: [
    { string: 4, fret: 10, degree: '1' }, // C
    { string: 3, fret: 12, degree: '5' }, // G
    { string: 2, fret: 11, degree: 'b7' }, // B♭
    { string: 1, fret: 11, degree: 'b3' }, // E♭
  ],
}

describe('la lectura depende de la tónica', () => {
  it('C6 en tercera inversión tiene C en la primera cuerda y también es Am7 fundamental', () => {
    const reading = tonicReading(c6, catalog)
    expect(reading.roots).toEqual([{ string: 1, fret: 8, degree: '1' }])
    expect(reading.equivalent).toEqual({ name: 'Am7', root: 'A', inversion: 0 })
    const am7: Voicing = {
      ...c6, root: 'A', rootPc: 9, name: 'Am7', quality: 'm7', inversion: 3,
      notes: c6.notes.map((note, i) => ({ ...note, degree: (['1', '5', 'b7', 'b3'] as const)[i]! })),
    }
    for (const [shape, expected] of [[c6, 3], [am7, 0]] as const) {
      const fixture = { ...catalog, voicings: [shape] }
      const answer = { quality: shape.quality, inversion: expected, degrees: shape.notes.map((note) => note.degree) }
      expect(evaluate(fixture, { voicingId: shape.id, difficulty: 'hard' }, answer).allCorrect).toBe(true)
      expect(evaluate(fixture, { voicingId: shape.id, difficulty: 'medium' }, { ...answer, inversion: expected === 3 ? 0 : 3 }).allCorrect).toBe(false)
    }
  })

  it('Cm7 fundamental tiene C en la cuarta cuerda y también es E♭6 en tercera inversión', () => {
    expect(tonicReading(cm7, catalog)).toMatchObject({
      roots: [{ string: 4, fret: 10 }],
      equivalent: { name: 'E♭6', root: 'E♭', inversion: 3 },
    })
    const eb6: Voicing = {
      ...cm7, root: 'E♭', rootPc: 3, name: 'E♭6', quality: 'maj7', inversion: 0,
      notes: cm7.notes.map((note, i) => ({ ...note, degree: (['6', '3', '5', '1'] as const)[i]! })),
    }
    for (const [shape, expected] of [[cm7, 0], [eb6, 3]] as const) {
      const fixture = { ...catalog, voicings: [shape] }
      expect(evaluate(fixture, { voicingId: shape.id, difficulty: 'hard' }, {
        quality: shape.quality, inversion: expected, degrees: shape.notes.map((note) => note.degree),
      }).allCorrect).toBe(true)
    }
  })

  it('localiza C por afinación y traste aunque los grados o el orden estén mal etiquetados', () => {
    const notes = [...c6.notes].reverse().map((note) => ({ ...note, degree: '5' as const }))
    expect(tonicReading({ ...c6, notes }, catalog).roots).toEqual([{ string: 1, fret: 8, degree: '5' }])
    expect(tonicReading({ ...c6, notes }, catalog).equivalent?.inversion).toBe(0)
  })

  it('todos los voicings evaluables tienen una tónica física y las equivalencias se limitan a 6 y m7', () => {
    for (const source of catalog.voicings.filter((shape) => shape.quizEnabled)) {
      const shape = voicingOf(catalog, { voicingId: source.id })
      const before = JSON.stringify(shape)
      const reading = tonicReading(shape, catalog)
      expect(reading.roots, shape.id).toHaveLength(1)
      expect(reading.roots[0]!.degree).toBe('1')
      expect(Boolean(reading.equivalent)).toBe(shape.quality === 'm7' || shape.notes.some((note) => note.degree === '6'))
      if (reading.equivalent) {
        // Con el mismo bajo, 6→m7 gira una inversión; m7→6 gira en sentido contrario.
        const expected = shape.quality === 'm7' ? [3, 0, 1, 2] : [1, 2, 3, 0]
        expect(reading.equivalent.inversion, shape.id).toBe(expected[shape.inversion])
      }
      expect(JSON.stringify(shape)).toBe(before)
    }
  })
})
