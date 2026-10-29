import { describe, expect, it } from 'vitest'
import { catalog, scalesDocument } from '../data'
import type { ScaleDegree } from '../data/types'
import {
  SCALE_MARK_BANK,
  createOrderQuestion,
  createRng,
  createScaleQuestion,
  createSession,
  emptyScaleAnswer,
  evaluateOrder,
  evaluateScale,
  expectedOrder,
  isScaleAnswerComplete,
  markNote,
  markedDegrees,
  orderCardsOf,
  placedPatternOf,
  reduceSession,
  updateConfig,
} from '.'
import type { GameConfig, OrderQuestionState, ScaleQuestion, ScaleQuestionState, SessionAction, SessionState } from '.'

const base = createSession(catalog).config
const config = (change: Partial<GameConfig>): GameConfig => ({ ...base, game: 'scale-patterns', ...change })
const run = (state: SessionState, ...actions: SessionAction[]) =>
  actions.reduce((current, action) => reduceSession(catalog, current, action), state)
const menu = (change: Partial<GameConfig>): SessionState => ({ phase: 'menu', config: config(change) })

/** Marca todas las notas como pide el nivel, para una respuesta perfecta. */
function perfectMarks(question: ScaleQuestion): (ScaleDegree | null)[] {
  const wanted = markedDegrees(question.scaleId, question.difficulty)
  return placedPatternOf(question).notes.map((note) => (wanted.includes(note.degree) ? note.degree : null))
}

describe('preguntas de patrón', () => {
  it('con tonalidad fija agota los cinco patrones antes de repetir y no repite la última al cambiar de ronda', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const rng = createRng(seed)
      let question = createScaleQuestion(config({ scaleKey: 7 }), rng)
      const seen = [question.pattern]
      for (let i = 0; i < 9; i += 1) {
        const next = createScaleQuestion(config({ scaleKey: 7 }), rng, question)
        expect(next.tonicPc).toBe(7)
        expect(next.pattern).not.toBe(question.pattern)
        question = next
        seen.push(question.pattern)
      }
      expect(new Set(seen.slice(0, 5)).size).toBe(5)
      expect(new Set(seen.slice(5, 10)).size).toBe(5)
    }
  })

  it('con tonalidad aleatoria recorre las doce tonalidades y los cinco patrones sin repetir combinación', () => {
    const rng = createRng(11)
    let question = createScaleQuestion(config({ scaleKey: 'random' }), rng)
    const seen = new Set([`${question.tonicPc}:${question.pattern}`])
    for (let i = 0; i < 59; i += 1) {
      question = createScaleQuestion(config({ scaleKey: 'random' }), rng, question)
      seen.add(`${question.tonicPc}:${question.pattern}`)
    }
    expect(seen.size).toBe(60)
  })

  it('Fácil pide el patrón; Medio y Difícil, además, al menos una marca', () => {
    const question = createScaleQuestion(config({ difficulty: 'medium', scaleKey: 0 }), createRng(1))
    const empty = emptyScaleAnswer(question)
    expect(empty.marks).toHaveLength(placedPatternOf(question).notes.length)
    expect(isScaleAnswerComplete('easy', { ...empty, pattern: 1 })).toBe(true)
    expect(isScaleAnswerComplete('medium', { ...empty, pattern: 1 })).toBe(false)
    expect(isScaleAnswerComplete('medium', { pattern: 1, marks: markNote(question, empty, 0, '1').marks })).toBe(true)
    expect(isScaleAnswerComplete('hard', { ...empty, pattern: null })).toBe(false)
  })

  it('Medio solo admite la tónica y Difícil solo el banco fijo', () => {
    const medium = createScaleQuestion(config({ difficulty: 'medium' }), createRng(2))
    const answer = emptyScaleAnswer(medium)
    expect(markNote(medium, answer, 0, '5')).toBe(answer)
    expect(markNote(medium, answer, 0, '1').marks[0]).toBe('1')
    const hard = { ...medium, difficulty: 'hard' as const }
    expect(markNote(hard, answer, 0, '2')).toBe(answer)
    expect(markNote(hard, answer, 99, '1')).toBe(answer)
    for (const degree of SCALE_MARK_BANK) expect(markNote(hard, answer, 0, degree).marks[0]).toBe(degree)
  })
})

describe('corrección de patrones', () => {
  const question = (difficulty: 'easy' | 'medium' | 'hard', scaleId: GameConfig['scaleId'] = 'major'): ScaleQuestion => ({
    number: 1, scaleId, tonicPc: 0, difficulty, pattern: 1, roundIds: ['0:1'],
  })

  it('las cuatro escalas en las doce tonalidades y los tres niveles se corrigen como acierto con la respuesta perfecta', () => {
    for (const scale of scalesDocument.scales) {
      for (let tonicPc = 0; tonicPc < 12; tonicPc += 1) {
        for (const difficulty of ['easy', 'medium', 'hard'] as const) {
          for (const pattern of [1, 2, 3, 4, 5] as const) {
            const q: ScaleQuestion = { number: 1, scaleId: scale.id, tonicPc, difficulty, pattern, roundIds: [] }
            const result = evaluateScale(q, { pattern, marks: perfectMarks(q) })
            expect(result.allCorrect).toBe(true)
          }
        }
      }
    }
  })

  it('Medio: cuenta las tónicas que faltan y las marcadas de más', () => {
    const q = question('medium')
    const notes = placedPatternOf(q).notes
    const marks = perfectMarks(q)
    const firstTonic = marks.indexOf('1')
    const notTonic = notes.findIndex((note) => note.degree !== '1')
    marks[firstTonic] = null
    marks[notTonic] = '1'
    const result = evaluateScale(q, { pattern: 1, marks })
    const field = result.fields.find((item) => item.field === 'marks')!
    expect(result.allCorrect).toBe(false)
    expect(field).toMatchObject({ degree: '1', expected: 3, hits: 2 })
    if (field.field !== 'marks') throw new Error('campo inesperado')
    expect(field.missing.map((note) => note.index)).toEqual([firstTonic])
    expect(field.extra.map((note) => note.index)).toEqual([notTonic])
  })

  it('Difícil: ♭3 no es 3 y un grado del banco que no se pide aparece como error propio', () => {
    const q = question('hard', 'minor-pentatonic')
    const marks = perfectMarks(q)
    const flatThird = marks.indexOf('b3')
    marks[flatThird] = '3'
    const result = evaluateScale(q, { pattern: 1, marks })
    expect(result.fields.map((item) => (item.field === 'marks' ? item.degree : 'pattern'))).toEqual(['pattern', '1', 'b3', '5', 'b7', '3'])
    const third = result.fields.find((item) => item.field === 'marks' && item.degree === 'b3')
    const wrong = result.fields.find((item) => item.field === 'marks' && item.degree === '3')
    expect(third).toMatchObject({ correct: false, missing: [{ index: flatThird, given: '3' }] })
    expect(wrong).toMatchObject({ correct: false, expected: 0, extra: [{ index: flatThird }] })
  })

  it('pentatónica mayor marca la sexta y la escala mayor no la pide', () => {
    expect(markedDegrees('major-pentatonic', 'hard')).toEqual(['1', '3', '5', '6'])
    const q = question('hard', 'major')
    const marks = perfectMarks(q)
    const sixth = placedPatternOf(q).notes.findIndex((note) => note.degree === '6')
    marks[sixth] = '6'
    expect(evaluateScale(q, { pattern: 1, marks }).allCorrect).toBe(false)
  })

  it('el patrón se corrige aparte de las marcas', () => {
    const q = question('medium')
    const result = evaluateScale(q, { pattern: 3, marks: perfectMarks(q) })
    expect(result.fields.map((item) => item.correct)).toEqual([false, true])
  })
})

describe('ordenar patrones', () => {
  it('las tarjetas nunca salen ya ordenadas y el orden esperado depende de la tonalidad', () => {
    for (let seed = 0; seed < 40; seed += 1) {
      const question = createOrderQuestion(config({ game: 'scale-order', scaleKey: 0 }), createRng(seed))
      expect([...question.cards].sort()).toEqual([1, 2, 3, 4, 5])
      expect(question.cards).not.toEqual(expectedOrder(question))
    }
    expect(expectedOrder({ scaleId: 'major', tonicPc: 0 })).toEqual([3, 4, 5, 1, 2])
    expect(expectedOrder({ scaleId: 'major', tonicPc: 4 })).toEqual([2, 3, 4, 5, 1])
  })

  it('con tonalidad aleatoria agota las doce antes de repetir', () => {
    const rng = createRng(5)
    let question = createOrderQuestion(config({ game: 'scale-order', scaleKey: 'random' }), rng)
    const keys = [question.tonicPc]
    for (let i = 0; i < 11; i += 1) {
      question = createOrderQuestion(config({ game: 'scale-order', scaleKey: 'random' }), rng, question)
      keys.push(question.tonicPc)
    }
    expect(new Set(keys).size).toBe(12)
  })

  it('corrige puesto a puesto', () => {
    const question = createOrderQuestion(config({ game: 'scale-order', scaleId: 'natural-minor', scaleKey: 9 }), createRng(3))
    const expected = expectedOrder(question)
    const right = expected.map((number) => question.cards.indexOf(number))
    expect(evaluateOrder(question, { sequence: right }).allCorrect).toBe(true)
    const swapped = [right[1]!, right[0]!, ...right.slice(2)]
    const result = evaluateOrder(question, { sequence: swapped })
    expect(result.places.map((item) => item.correct)).toEqual([false, false, true, true, true])
    expect(orderCardsOf(question).map((card) => card.number)).toEqual(question.cards)
  })
})

describe('sesión de los juegos de escalas', () => {
  it('Reconocer patrones: verificar una vez, Anterior y Siguiente conservan respuestas, y Terminar revisa todo', () => {
    let state = run(menu({ difficulty: 'easy', scaleKey: 2 }), { type: 'start', seed: 9 })
    expect(state.phase).toBe('escala')
    const first = (state as ScaleQuestionState).question
    state = run(state, { type: 'verify' })
    expect(state.phase).toBe('escala')
    state = run(state, { type: 'scale-pattern', pattern: first.pattern }, { type: 'verify' })
    expect(state.phase).toBe('escala-verificada')
    const verified = state
    expect(run(state, { type: 'verify' })).toBe(verified)
    expect(run(state, { type: 'scale-pattern', pattern: 1 })).toBe(verified)
    state = run(state, { type: 'next', seed: 10 }, { type: 'scale-pattern', pattern: 2 }, { type: 'previous' })
    expect(state).toMatchObject({ phase: 'escala-verificada', position: 0 })
    state = run(state, { type: 'next', seed: 99 })
    expect(state).toMatchObject({ phase: 'escala', position: 1, answer: { pattern: 2 } })
    state = run(state, { type: 'finish-test' })
    expect(state.phase).toBe('escala-resumen')
    if (state.phase !== 'escala-resumen') throw new Error('fase inesperada')
    expect(state.attempts.map((attempt) => attempt.result?.allCorrect ?? null)).toEqual([true, null])
    expect(run(state, { type: 'exit' }).phase).toBe('menu')
  })

  it('Ordenar: elegir, quitar y borrar el orden; solo verifica con las cinco tarjetas', () => {
    let state = run(menu({ game: 'scale-order', scaleKey: 4 }), { type: 'start', seed: 1 })
    expect(state.phase).toBe('orden')
    state = run(state, { type: 'order-pick', card: 2 }, { type: 'order-pick', card: 0 }, { type: 'order-pick', card: 2 })
    expect((state as OrderQuestionState).answer.sequence).toEqual([0])
    state = run(state, { type: 'order-reset' })
    expect((state as OrderQuestionState).answer.sequence).toEqual([])
    state = run(state, { type: 'order-pick', card: 7 }, { type: 'verify' })
    expect(state.phase).toBe('orden')
    const question = (state as OrderQuestionState).question
    for (const number of expectedOrder(question)) state = run(state, { type: 'order-pick', card: question.cards.indexOf(number) })
    state = run(state, { type: 'verify' })
    expect(state).toMatchObject({ phase: 'orden-verificada', result: { allCorrect: true } })
  })

  it('cambiar a un juego de escalas conserva Drop y set para volver a reconocimiento', () => {
    const before = createSession(catalog).config
    const scales = updateConfig(catalog, { ...before, drop: 'drop3', setId: 'D3S2' }, { game: 'scale-order', scaleKey: 'random' })
    expect(scales).toMatchObject({ game: 'scale-order', drop: 'drop3', setId: 'D3S2', scaleKey: 'random' })
    expect(updateConfig(catalog, scales, { game: 'recognition' })).toMatchObject({ drop: 'drop3', setId: 'D3S2' })
  })
})
