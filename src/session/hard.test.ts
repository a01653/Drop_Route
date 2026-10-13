import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { Degree, QualityKey, SetId } from '../data'
import { choose, configure, createSession, moveDegree, next, start, verify } from '.'
import type { QuestionState, SessionState, VerifiedState } from '.'
import { newSlots } from './degrees'
import { evaluate, isAnswerComplete, requiredFields, voicingOf } from './recognition'

const menu = createSession(catalog)
const answer = (quality: QualityKey | null, inversion: 0 | 1 | 2 | 3 | null, degrees: (Degree | null)[] = newSlots()) => ({
  quality,
  inversion,
  degrees,
})
const hardQuestion = (id: string) => {
  const voicing = catalog.voicings.find((item) => item.id === id)!
  return {
    voicing,
    question: {
      number: 1,
      voicingId: id,
      setId: voicing.setId,
      difficulty: 'hard' as const,
      qualityOrder: ['maj7', '7', 'm7', 'm7b5'] as QualityKey[],
    },
  }
}
const degreesOf = (id: string) => hardQuestion(id).voicing.notes.map((note) => note.degree)

describe('difícil: corrección de acorde, inversión y cuatro grados (R05, R08)', () => {
  it('exige acorde, inversión y los cuatro destinos', () => {
    expect(requiredFields('hard')).toEqual(['quality', 'inversion', 'degrees'])
    expect(isAnswerComplete('hard', answer('m7', 1))).toBe(false)
    expect(isAnswerComplete('hard', answer('m7', 1, ['1', 'b3', '5', null]))).toBe(false)
    expect(isAnswerComplete('hard', answer(null, 1, degreesOf('d2s1-m7-i1')))).toBe(false)
    expect(isAnswerComplete('hard', answer('m7', null, degreesOf('d2s1-m7-i1')))).toBe(false)
    expect(isAnswerComplete('hard', answer('m7', 1, degreesOf('d2s1-m7-i1')))).toBe(true)
  })

  it('corrige cada destino por separado y conserva los aciertos parciales', () => {
    const { voicing, question } = hardQuestion('d2s1-m7b5-i2')
    const failedSlot = voicing.notes.findIndex((note) => note.degree === 'b5')
    const degrees = degreesOf(voicing.id)
    degrees[failedSlot] = '5'
    const result = evaluate(catalog, question, answer('m7b5', 2, degrees))
    expect(result.fields).toHaveLength(6)
    expect(result.fields.map((item) => item.correct)).toEqual([true, true, ...voicing.notes.map((_, slot) => slot !== failedSlot)])
    expect(result.allCorrect).toBe(false)
    const slots = result.fields.filter((item) => item.field === 'degree')
    expect(slots.map((item) => [item.string, item.fret])).toEqual(voicing.notes.map((note) => [note.string, note.fret]))
  })

  it('acorde e inversión se corrigen aparte de los grados', () => {
    const { voicing, question } = hardQuestion('d3s1-7-i1')
    const result = evaluate(catalog, question, answer('maj7', 3, degreesOf(voicing.id)))
    expect(result.fields.slice(0, 2).map((item) => item.correct)).toEqual([false, false])
    expect(result.fields.slice(2).every((item) => item.correct)).toBe(true)
  })

  it('b3, b5 y b7 son grados reales: contestar 3, 5 o 7 en su lugar es un error', () => {
    const { voicing, question } = hardQuestion('d2s1-m7b5-i0')
    const natural = voicing.notes.map((note) => (note.degree.replace(/^b/, '') as Degree))
    const result = evaluate(catalog, question, answer('m7b5', 0, natural))
    expect(result.fields.filter((item) => item.field === 'degree' && !item.correct)).toHaveLength(3)
    expect(result.allCorrect).toBe(false)
  })

  it('cada grado se compara con la nota de su destino, no con el conjunto', () => {
    const { voicing, question } = hardQuestion('d3s2-7-i3')
    const reversed = [...degreesOf(voicing.id)].reverse()
    const result = evaluate(catalog, question, answer('7', 3, reversed))
    expect(result.fields.filter((item) => item.field === 'degree' && item.correct).length).toBeLessThan(4)
  })

  it('las 112 formas se corrigen como acierto completo con sus propios grados', () => {
    for (const voicing of catalog.voicings.filter((item) => item.quizEnabled)) {
      const { question } = hardQuestion(voicing.id)
      const given = answer(voicing.quality, voicing.inversion, degreesOf(voicing.id))
      expect(evaluate(catalog, question, given).allCorrect, voicing.id).toBe(true)
    }
  })
})

describe('difícil: tablero de grados dentro de la sesión', () => {
  const asQuestion = (state: SessionState) => {
    expect(state.phase).toBe('pregunta')
    return state as QuestionState
  }
  const begin = (difficulty: 'easy' | 'medium' | 'hard', setId: SetId = 'D2S1', seed = 8) => {
    const drop = catalog.sets.find((set) => set.id === setId)!.drop
    return asQuestion(start(catalog, configure(catalog, menu, { drop, setId, difficulty }), seed))
  }
  const placeAll = (state: SessionState, degrees: Degree[]) =>
    degrees.reduce<SessionState>(
      (current, degree, slot) => moveDegree(moveDegree(current, { type: 'pick-bank', degree }), { type: 'drop-slot', slot }),
      state,
    )

  it('los grados solo se mueven en difícil', () => {
    for (const difficulty of ['easy', 'medium'] as const) {
      const state = begin(difficulty)
      expect(moveDegree(state, { type: 'pick-bank', degree: '1' })).toBe(state)
    }
  })

  it('coloca, mueve y devuelve fichas; la ficha sostenida vive en el estado', () => {
    let state: SessionState = begin('hard')
    state = moveDegree(state, { type: 'pick-bank', degree: 'b3' })
    expect((state as QuestionState).held).toEqual({ from: 'bank', degree: 'b3' })
    state = moveDegree(state, { type: 'drop-slot', slot: 1 })
    expect((state as QuestionState).answer.degrees).toEqual([null, 'b3', null, null])
    expect((state as QuestionState).held).toBeNull()
    state = moveDegree(moveDegree(state, { type: 'pick-slot', slot: 1 }), { type: 'drop-slot', slot: 3 })
    expect((state as QuestionState).answer.degrees).toEqual([null, null, null, 'b3'])
    state = moveDegree(moveDegree(state, { type: 'pick-slot', slot: 3 }), { type: 'drop-bank' })
    expect((state as QuestionState).answer.degrees).toEqual([null, null, null, null])
  })

  it('Verificar exige acorde, inversión y los cuatro destinos', () => {
    const state = begin('hard')
    const voicing = voicingOf(catalog, state.question)
    let current: SessionState = choose(choose(state, { quality: voicing.quality }), { inversion: voicing.inversion })
    expect(verify(catalog, current)).toBe(current)
    voicing.notes.slice(0, 3).forEach((note, slot) => {
      current = placeAll(current, [])
      current = moveDegree(moveDegree(current, { type: 'pick-bank', degree: note.degree }), { type: 'drop-slot', slot })
      expect(verify(catalog, current).phase).toBe('pregunta')
    })
    current = moveDegree(moveDegree(current, { type: 'pick-bank', degree: voicing.notes[3]!.degree }), { type: 'drop-slot', slot: 3 })
    const done = verify(catalog, current) as VerifiedState
    expect(done.phase).toBe('verificada')
    expect(done.result.fields).toHaveLength(6)
    expect(done.result.allCorrect).toBe(true)
  })

  it('tras verificar el tablero se bloquea y lo contestado se conserva con sus aciertos parciales', () => {
    const state = begin('hard', 'D3S1', 21)
    const voicing = voicingOf(catalog, state.question)
    const degrees = voicing.notes.map((note) => note.degree)
    const spare = (['1', '3', 'b3', '5', 'b5', '7', 'b7'] as Degree[]).find((degree) => !degrees.includes(degree))!
    degrees[0] = spare
    const current = placeAll(choose(choose(state, { quality: voicing.quality }), { inversion: voicing.inversion }), degrees)
    const done = verify(catalog, current) as VerifiedState
    expect(done.answer.degrees).toEqual(degrees)
    expect(done.result.fields.filter((item) => item.field === 'degree' && item.correct)).toHaveLength(3)
    expect(moveDegree(done, { type: 'pick-bank', degree: '1' })).toBe(done)
    expect(moveDegree(done, { type: 'clear-slot', slot: 0 })).toBe(done)
    const following = asQuestion(next(catalog, done, 3))
    expect(following.answer.degrees).toEqual([null, null, null, null])
    expect(following.held).toBeNull()
  })
})
