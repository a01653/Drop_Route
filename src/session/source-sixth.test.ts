import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import { inversionFromBass, midiOf, pitchClass } from '../music/pitch'
import { DEGREE_BANK } from './degrees'
import { evaluate, voicingOf } from './recognition'

const IDS = [
  'd2s1-maj7-i3', 'd2s2-maj7-i3', 'd2s3-maj7-i3',
  'd3s1-maj7-i3', 'd3s2-maj7-i3',
  'd24s1-maj7-i1', 'd24s1-maj7-i3', 'd24s2-maj7-i1', 'd24s2-maj7-i3',
]

describe('la sexta de la fuente también se pregunta', () => {
  it.each(IDS)('%s: pregunta, bajo y corrección usan la sexta, con la séptima solo como referencia', (id) => {
    const source = catalog.voicings.find((item) => item.id === id)!
    const before = JSON.stringify(source)
    const seventh = source.notes.find((note) => note.degree === '7')!
    const expected = source.notes.map((note) => note.degree === '7'
      ? { ...note, degree: '6', fret: note.fret - 2 }
      : { ...note })
    const shape = voicingOf(catalog, { voicingId: id })
    expect(shape.notes).toEqual(expected)
    expect(shape.referenceNotes).toEqual([seventh])
    expect(shape.name).toBe('Cmaj7 – C6')
    expect(shape.notes).toHaveLength(4)
    expect(shape.notes.map((note) => pitchClass(midiOf(note, catalog.tuning) - source.rootPc)).sort((a, b) => a - b)).toEqual([0, 4, 7, 9])
    expect(inversionFromBass({ ...shape, inversion: 0, notes: [...shape.notes].reverse() }, catalog)).toBe(source.inversion)
    const given = { quality: source.quality, inversion: source.inversion, degrees: expected.map((note) => note.degree as '1' | '3' | '5' | '6') }
    for (const difficulty of ['easy', 'medium', 'hard'] as const) {
      expect(evaluate(catalog, { voicingId: id, difficulty }, given).allCorrect).toBe(true)
    }
    const wrong = evaluate(catalog, { voicingId: id, difficulty: 'hard' }, {
      ...given, degrees: source.notes.map((note) => note.degree),
    })
    expect(wrong.allCorrect).toBe(false)
    expect(wrong.fields.find((field) => field.field === 'degree' && field.expected === '6')).toMatchObject({
      given: '7', correct: false, fret: seventh.fret - 2,
    })
    expect(JSON.stringify(source)).toBe(before)
  })

  it('ofrece 6 y 7 siempre, sin revelar cuándo se necesita la sexta', () => {
    expect(DEGREE_BANK).toContain('6')
    expect(DEGREE_BANK).toContain('7')
    expect(new Set(DEGREE_BANK).size).toBe(8)
  })
})
