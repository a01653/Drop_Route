import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { SetId } from '../data'
import { choose, configure, createSession, exit, next, start, verify } from '.'
import type { QuestionState, SessionState, VerifiedState } from '.'
import { dropFamilies, setsOfDrop, updateConfig } from './config'
import { emptyAnswer, evaluate, voicingOf } from './recognition'

const menu = createSession(catalog)
const asQuestion = (state: SessionState) => {
  expect(state.phase).toBe('pregunta')
  return state as QuestionState
}
const started = (difficulty: 'easy' | 'medium', setId: SetId = 'D2S1', seed = 5) => {
  const drop = catalog.sets.find((set) => set.id === setId)!.drop
  return asQuestion(start(catalog, configure(catalog, menu, { drop, setId, difficulty }), seed))
}

/** Respuesta correcta para la pregunta abierta: sale del catálogo, no del estado. */
const correctChange = (state: QuestionState) => {
  const voicing = voicingOf(catalog, state.question)
  return { quality: voicing.quality, inversion: voicing.inversion }
}

describe('menú (R01)', () => {
  it('empieza en el menú con una configuración válida', () => {
    expect(menu.phase).toBe('menu')
    expect(menu.config).toEqual({ game: 'recognition', drop: 'drop2', setId: 'D2S1', difficulty: 'easy' })
  })

  it('lista las tres familias Drop y los sets de cada una con sus cuerdas', () => {
    expect(dropFamilies(catalog)).toEqual(['drop2', 'drop3', 'drop2+4'])
    expect(setsOfDrop(catalog, 'drop2').map((set) => set.id)).toEqual(['D2S1', 'D2S2', 'D2S3'])
    expect(setsOfDrop(catalog, 'drop2+4').map((set) => set.strings)).toEqual([
      [5, 4, 2, 1],
      [6, 5, 3, 2],
    ])
  })

  it('al cambiar de Drop elige el primer set de esa familia y nunca queda incoherente', () => {
    const state = configure(catalog, menu, { drop: 'drop3' })
    expect(state.phase === 'menu' && state.config).toMatchObject({ drop: 'drop3', setId: 'D3S1' })
    expect(updateConfig(catalog, menu.config, { drop: 'drop2+4', setId: 'D24S2' })).toMatchObject({ drop: 'drop2+4', setId: 'D24S2' })
    expect(updateConfig(catalog, menu.config, { setId: 'D3S1' })).toMatchObject({ drop: 'drop2', setId: 'D2S1' })
    expect(updateConfig(catalog, menu.config, { difficulty: 'medium' }).difficulty).toBe('medium')
  })

  it('la configuración solo cambia en el menú', () => {
    const playing = started('easy')
    expect(configure(catalog, playing, { difficulty: 'medium' })).toBe(playing)
  })
})

describe('pregunta, selección y verificación (R06, R07)', () => {
  it('empieza una pregunta de la configuración con la respuesta vacía', () => {
    const state = started('medium', 'D24S1')
    expect(state.answer).toEqual(emptyAnswer())
    expect(state.question.setId).toBe('D24S1')
    expect(state.question.difficulty).toBe('medium')
    expect(state.question.number).toBe(1)
  })

  it('seleccionar no verifica ni da resultado', () => {
    const state = started('easy')
    const chosen = choose(state, { quality: correctChange(state).quality })
    expect(chosen.phase).toBe('pregunta')
    expect('result' in chosen).toBe(false)
    expect(choose(chosen, { quality: 'm7b5' }).phase).toBe('pregunta')
  })

  it('verificar con la respuesta incompleta no hace nada', () => {
    const easy = started('easy')
    expect(verify(catalog, easy)).toBe(easy)
    const medium = started('medium')
    const half = choose(medium, { quality: 'maj7' })
    expect(verify(catalog, half)).toBe(half)
    const other = choose(medium, { inversion: 1 })
    expect(verify(catalog, other)).toBe(other)
  })

  it('verificar una respuesta completa produce un único resultado y bloquea la respuesta', () => {
    const state = started('medium')
    const { quality, inversion } = correctChange(state)
    const ready = choose(choose(state, { quality }), { inversion })
    const done = verify(catalog, ready) as VerifiedState
    expect(done.phase).toBe('verificada')
    expect(done.result.allCorrect).toBe(true)
    expect(done.answer).toEqual({ quality, inversion, degrees: emptyAnswer().degrees })
    // Bloqueo: ni cambiar la respuesta ni verificar de nuevo alteran nada.
    expect(choose(done, { quality: 'm7b5' })).toBe(done)
    expect(choose(done, { inversion: 3 })).toBe(done)
    expect(verify(catalog, done)).toBe(done)
  })

  it('conserva lo contestado aunque sea incorrecto y marca cada campo por separado', () => {
    const state = started('medium')
    const truth = correctChange(state)
    const wrongQuality = truth.quality === 'm7' ? 'maj7' : 'm7'
    const done = verify(catalog, choose(choose(state, { quality: wrongQuality }), { inversion: truth.inversion })) as VerifiedState
    expect(done.answer.quality).toBe(wrongQuality)
    expect(done.result.fields.map((item) => item.correct)).toEqual([false, true])
    expect(done.result.allCorrect).toBe(false)
    expect(done.result).toEqual(evaluate(catalog, done.question, done.answer))
  })
})

describe('siguiente y salir (R09, R10)', () => {
  const finish = (state: QuestionState): VerifiedState => {
    const { quality, inversion } = correctChange(state)
    return verify(catalog, choose(choose(state, { quality }), { inversion })) as VerifiedState
  }

  it('siguiente solo existe tras verificar y abre otra pregunta limpia con la misma configuración', () => {
    const state = started('medium')
    expect(next(catalog, state, 9)).toBe(state)
    const after = asQuestion(next(catalog, finish(state), 9))
    expect(after.question.number).toBe(2)
    expect(after.question.voicingId).not.toBe(state.question.voicingId)
    expect(after.answer).toEqual(emptyAnswer())
    expect(after.config).toEqual(state.config)
  })

  it('la sesión es libre: encadena preguntas sin repetir la anterior hasta salir', () => {
    let state: SessionState = started('easy', 'D3S2')
    for (let round = 1; round <= 40; round += 1) {
      const q = asQuestion(state)
      expect(q.question.number).toBe(round)
      const done = finish(q)
      const following = asQuestion(next(catalog, done, round * 13))
      expect(following.question.voicingId).not.toBe(q.question.voicingId)
      state = following
    }
  })

  it('salir vuelve al menú desde cualquier fase y conserva la configuración', () => {
    const state = started('medium', 'D24S2')
    expect(exit(state)).toEqual({ phase: 'menu', config: state.config })
    expect(exit(finish(state)).phase).toBe('menu')
    expect(exit(menu)).toEqual(menu)
  })
})
