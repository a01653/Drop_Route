import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { Catalog, Degree, Inversion, QualityKey, SetId } from '../data'
import { inversionFromBass } from '../music/pitch'
import { defaultConfig } from './config'
import { newSlots } from './degrees'
import type { Difficulty, GameConfig } from './config'
import {
  answerQualities,
  createQuestion,
  emptyAnswer,
  evaluate,
  isAnswerComplete,
  questionPool,
  requiredFields,
  voicingOf,
} from './recognition'
import { createRng, shuffle } from './rng'

const answer = (quality: QualityKey | null, inversion: Inversion | null, degrees: (Degree | null)[] = newSlots()) => ({ quality, inversion, degrees })
const SET_IDS = catalog.sets.map((set) => set.id)
const config = (setId: SetId, difficulty: Difficulty = 'easy'): GameConfig => ({
  ...defaultConfig(catalog),
  drop: catalog.sets.find((set) => set.id === setId)!.drop,
  setId,
  difficulty,
})

// Fixture: un set con una única forma evaluable, para comprobar el caso sin alternativas.
const single: Catalog = { ...catalog, voicings: [catalog.voicings.find((item) => item.quizEnabled)!] }

describe('azar con semilla', () => {
  it('la misma semilla da la misma secuencia y semillas distintas la cambian', () => {
    const a = createRng(7)
    const b = createRng(7)
    expect([a(), a(), a()]).toEqual([b(), b(), b()])
    expect(createRng(8)()).not.toBe(createRng(7)())
  })

  it('baraja sin perder ni duplicar elementos y sin tocar la entrada', () => {
    const input = ['maj7', '7', 'm7', 'm7b5']
    const result = shuffle(input, createRng(3))
    expect([...result].sort()).toEqual([...input].sort())
    expect(input).toEqual(['maj7', '7', 'm7', 'm7b5'])
  })
})

describe('preguntas de reconocimiento (R02)', () => {
  it('cada set tiene 16 formas evaluables y la pregunta sale de ellas', () => {
    for (const setId of SET_IDS) {
      const pool = questionPool(catalog, setId)
      expect(pool, setId).toHaveLength(16)
      const question = createQuestion(catalog, config(setId), createRng(1))
      expect(pool.map((item) => item.id), setId).toContain(question.voicingId)
      expect(voicingOf(catalog, question).setId).toBe(setId)
    }
  })

  it('no se ofrecen calidades de referencia: solo las cuatro evaluables, sin Cdim7', () => {
    expect(answerQualities(catalog)).toEqual(['maj7', '7', 'm7', 'm7b5'])
    for (const voicing of catalog.voicings.filter((item) => item.quality === 'dim7')) {
      expect(voicing.quizEnabled).toBe(false)
    }
  })

  it('las opciones son únicas y una permutación de las cuatro calidades, y el orden varía', () => {
    const orders = new Set<string>()
    for (let seed = 1; seed <= 60; seed += 1) {
      const { qualityOrder } = createQuestion(catalog, config('D2S1'), createRng(seed))
      expect(new Set(qualityOrder).size).toBe(4)
      expect([...qualityOrder].sort()).toEqual(['7', 'm7', 'm7b5', 'maj7'])
      orders.add(qualityOrder.join(','))
    }
    expect(orders.size).toBeGreaterThan(8)
  })

  it('es reproducible con la misma semilla', () => {
    expect(createQuestion(catalog, config('D3S2'), createRng(99))).toEqual(createQuestion(catalog, config('D3S2'), createRng(99)))
  })

  it('no repite la forma anterior cuando hay alternativas', () => {
    for (const setId of SET_IDS) {
      let previous = createQuestion(catalog, config(setId), createRng(1))
      for (let seed = 2; seed <= 120; seed += 1) {
        const question = createQuestion(catalog, config(setId), createRng(seed), previous)
        expect(question.voicingId, `${setId} semilla ${seed}`).not.toBe(previous.voicingId)
        expect(question.number).toBe(previous.number + 1)
        previous = question
      }
    }
  })

  it('con una sola forma disponible la repite, porque no hay alternativa', () => {
    const first = createQuestion(single, { ...config('D2S1'), setId: single.voicings[0]!.setId }, createRng(1))
    const second = createQuestion(single, { ...config('D2S1'), setId: single.voicings[0]!.setId }, createRng(2), first)
    expect(second.voicingId).toBe(first.voicingId)
  })

  it('a lo largo de una sesión salen las 16 formas del set', () => {
    let previous = createQuestion(catalog, config('D24S1'), createRng(1))
    const seen = new Set([previous.voicingId])
    for (let seed = 2; seed <= 300; seed += 1) {
      previous = createQuestion(catalog, config('D24S1'), createRng(seed), previous)
      seen.add(previous.voicingId)
    }
    expect(seen.size).toBe(16)
  })

  for (const difficulty of ['easy', 'medium', 'hard'] as const) {
    it.each(SET_IDS)(`${difficulty}: cada ronda recorre todo %s una vez, incluso con azar constante`, (setId) => {
      const pool = questionPool(catalog, setId)
      let previous: ReturnType<typeof createQuestion> | undefined
      for (let round = 0; round < 4; round += 1) {
        const seen: string[] = []
        for (let i = 0; i < pool.length; i += 1) {
          const question = createQuestion(catalog, config(setId, difficulty), () => 0, previous)
          expect(question.voicingId).not.toBe(previous?.voicingId)
          seen.push(question.voicingId)
          previous = question
        }
        expect([...seen].sort()).toEqual(pool.map((item) => item.id).sort())
      }
    })
  }

  it('con once formas disponibles muestra las once antes de repetir, también con azar en el extremo superior', () => {
    const fixture = { ...catalog, voicings: questionPool(catalog, 'D2S1').slice(0, 11) }
    let previous: ReturnType<typeof createQuestion> | undefined
    for (let round = 0; round < 3; round += 1) {
      const seen = new Set<string>()
      for (let i = 0; i < 11; i += 1) {
        const question = createQuestion(fixture, config('D2S1'), () => 0.999999, previous)
        expect(seen.has(question.voicingId)).toBe(false)
        expect(question.voicingId).not.toBe(previous?.voicingId)
        seen.add(question.voicingId)
        previous = question
      }
      expect(seen.size).toBe(11)
    }
  })
})

describe('respuesta completa por nivel (R03, R04, R06)', () => {
  it('fácil exige solo el acorde y medio exige acorde e inversión', () => {
    expect(requiredFields('easy')).toEqual(['quality'])
    expect(requiredFields('medium')).toEqual(['quality', 'inversion'])
    expect(isAnswerComplete('easy', emptyAnswer())).toBe(false)
    expect(isAnswerComplete('easy', answer('m7', null))).toBe(true)
    expect(isAnswerComplete('medium', answer('m7', null))).toBe(false)
    expect(isAnswerComplete('medium', answer(null, 2))).toBe(false)
    expect(isAnswerComplete('medium', answer('m7', 0))).toBe(true)
  })
})

describe('corrección por campos (R08)', () => {
  const question = (id: string, difficulty: Difficulty) => ({
    number: 1,
    voicingId: id,
    setId: catalog.voicings.find((item) => item.id === id)!.setId,
    difficulty,
    qualityOrder: ['maj7', '7', 'm7', 'm7b5'] as QualityKey[],
  })

  it('fácil: acierta o falla solo el acorde y no mira la inversión', () => {
    const q = question('d2s1-maj7-i1', 'easy')
    expect(evaluate(catalog, q, answer('maj7', null))).toEqual({
      fields: [{ field: 'quality', given: 'maj7', expected: 'maj7', correct: true }],
      allCorrect: true,
    })
    const wrong = evaluate(catalog, q, answer('7', 3))
    expect(wrong.allCorrect).toBe(false)
    expect(wrong.fields).toHaveLength(1)
  })

  it('medio: corrige acorde e inversión por separado y el acierto completo exige ambos', () => {
    const q = question('d2s1-m7-i2', 'medium')
    const both = evaluate(catalog, q, answer('m7', 2))
    expect(both.allCorrect).toBe(true)
    const chordOnly = evaluate(catalog, q, answer('m7', 1))
    expect(chordOnly.fields.map((item) => item.correct)).toEqual([true, false])
    expect(chordOnly.allCorrect).toBe(false)
    const inversionOnly = evaluate(catalog, q, answer('maj7', 2))
    expect(inversionOnly.fields.map((item) => item.correct)).toEqual([false, true])
    expect(inversionOnly.allCorrect).toBe(false)
  })

  it('devuelve lo contestado y lo esperado de cada campo', () => {
    const q = question('d3s1-m7b5-i3', 'medium')
    const result = evaluate(catalog, q, answer('m7', 0))
    expect(result.fields).toEqual([
      { field: 'quality', given: 'm7', expected: 'm7b5', correct: false },
      { field: 'inversion', given: 0, expected: 3, correct: false },
    ])
  })

  it('la inversión sale del bajo físico, no de la etiqueta declarada ni del orden del array', () => {
    const real = catalog.voicings.find((item) => item.id === 'd2s1-7-i1')!
    // Fixture: misma posición con la inversión mal declarada y las notas en otro orden.
    const tampered = {
      ...real,
      id: 'fixture-inversion-mal-declarada',
      inversion: 3 as Inversion,
      notes: [...real.notes].reverse(),
    }
    const fixture: Catalog = { ...catalog, voicings: [tampered] }
    expect(inversionFromBass(tampered, fixture)).toBe(1)
    const q = { ...question(real.id, 'medium'), voicingId: tampered.id }
    expect(evaluate(fixture, q, answer('7', 1)).allCorrect).toBe(true)
    expect(evaluate(fixture, q, answer('7', 3)).fields[1]).toMatchObject({ expected: 1, correct: false })
  })

  it('las 112 formas se corrigen como correctas con su propia calidad e inversión', () => {
    for (const voicing of catalog.voicings.filter((item) => item.quizEnabled)) {
      const q = question(voicing.id, 'medium')
      expect(evaluate(catalog, q, answer(voicing.quality, voicing.inversion)).allCorrect, voicing.id).toBe(true)
    }
  })
})
