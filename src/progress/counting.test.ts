import { describe, expect, it } from 'vitest'
import { catalog } from '../data'
import type { Degree, Inversion, QualityKey } from '../data'
import { inversionFromBass } from '../music/pitch'
import { configure, createSession, start, voicingOf } from '../session'
import type { ConfigChange, QuestionState, RouteQuestionState, SessionAction } from '../session'
import { EMPTY_PROGRESS, addAttempt, attemptOf, reduceApp } from '.'
import type { AppState, ProgressData } from '.'

const begin = (change: ConfigChange, progress: ProgressData = EMPTY_PROGRESS, seed = 3): AppState => ({
  session: start(catalog, configure(catalog, createSession(catalog), change), seed),
  progress,
})
const act = (state: AppState, action: SessionAction) => reduceApp(state, action)
const verify = (state: AppState) => act(state, { type: 'verify' })

/** Responde la pregunta de reconocimiento abierta: bien, o con exactamente un campo equivocado. */
type Mistake = 'none' | 'quality' | 'inversion' | 'degree' | 'empty'
function answered(state: AppState, mistake: Mistake = 'none'): AppState {
  const session = state.session as QuestionState
  const voicing = voicingOf(catalog, session.question)
  const inversion = inversionFromBass(voicing, catalog)!
  const wrongQuality = (['maj7', '7', 'm7', 'm7b5'] as const).find((quality) => quality !== voicing.quality)!
  const degrees = voicing.notes.map((note) => note.degree)
  const answer = {
    quality: (mistake === 'empty' ? null : mistake === 'quality' ? wrongQuality : voicing.quality) as QualityKey | null,
    inversion: (mistake === 'inversion' ? (inversion + 1) % 4 : inversion) as Inversion,
    degrees: degrees.map((degree, slot): Degree => (mistake === 'degree' && slot === 0 ? (degree === '1' ? '3' : '1') : degree)),
  }
  return { ...state, session: { ...session, answer } }
}

/** Elige la candidata de la pregunta de ruta abierta: la de nuestra ruta o la siguiente. */
function candidate(state: AppState, right: boolean): AppState {
  const session = state.session as RouteQuestionState
  const expected = session.question.candidateRouteIds.indexOf(session.question.routeId)
  return act(state, { type: 'candidate', index: right ? expected : (expected + 1) % session.question.candidateRouteIds.length })
}

const counter = (state: AppState, key: string) => state.progress[key]
const ROUTE_D2S1 = { game: 'routes', drop: 'drop2', setId: 'D2S1', routeMode: 'major' } as const

describe('un intento cuenta cuando se verifica y solo entonces', () => {
  it('una respuesta incompleta no verifica ni cuenta, y no cambia el estado', () => {
    const state = answered(begin({ difficulty: 'easy' }), 'empty')
    expect(verify(state)).toBe(state)
  })

  it('verificar cuenta un intento y un acierto completo suma uno a los aciertos', () => {
    const verified = verify(answered(begin({ setId: 'D2S1', difficulty: 'easy' })))
    expect(verified.session.phase).toBe('verificada')
    expect(counter(verified, 'recognition:D2S1:easy')).toEqual({ attempts: 1, correct: 1 })
    expect(Object.keys(verified.progress)).toEqual(['recognition:D2S1:easy'])
  })

  it('un fallo cuenta como intento sin acierto', () => {
    const verified = verify(answered(begin({ difficulty: 'easy' }), 'quality'))
    expect(counter(verified, 'recognition:D2S1:easy')).toEqual({ attempts: 1, correct: 0 })
  })

  it('seleccionar, mover grados, Siguiente y Salir no cuentan nunca', () => {
    let state = begin({ difficulty: 'hard' })
    const initial = state.progress
    state = act(state, { type: 'choose', change: { quality: 'm7' } })
    state = act(state, { type: 'degree', action: { type: 'pick-bank', degree: '1' } })
    expect(state.session.phase === 'pregunta' && state.session.held).not.toBeNull()
    expect(state.progress).toBe(initial)
    state = verify(answered(state))
    expect(state.progress['recognition:D2S1:hard']?.attempts).toBe(1)
    const counted = state.progress
    state = act(state, { type: 'next', seed: 9 })
    expect(state.session.phase).toBe('pregunta')
    expect(state.progress).toBe(counted)
    state = act(state, { type: 'exit' })
    expect(state.session.phase).toBe('menu')
    expect(state.progress).toBe(counted)
  })
})

describe('una verificación cuenta una sola vez', () => {
  it('verificar de nuevo, cambiar la respuesta o mover grados tras verificar no cambia nada', () => {
    const verified = verify(answered(begin({ difficulty: 'hard' })))
    for (const action of [
      { type: 'verify' },
      { type: 'verify' },
      { type: 'choose', change: { quality: 'maj7' } },
      { type: 'choose', change: { inversion: 2 } },
      { type: 'degree', action: { type: 'pick-bank', degree: '5' } },
      { type: 'candidate', index: 1 },
    ] as SessionAction[]) {
      expect(act(verified, action)).toBe(verified)
    }
  })

  it('el reductor es puro: ejecutarlo dos veces con la misma entrada da lo mismo y no toca la entrada', () => {
    const state = answered(begin({ difficulty: 'medium' }))
    const before = JSON.stringify(state)
    const first = verify(state)
    const second = verify(state)
    expect(second).toEqual(first)
    expect(JSON.stringify(state)).toBe(before)
    expect(first.progress['recognition:D2S1:medium']).toEqual({ attempts: 1, correct: 1 })
    // Renderizados dobles: reducir el resultado otra vez con la misma acción no suma.
    expect(verify(first)).toBe(first)
  })

  it('en rutas, verificar, cambiar de vista o seleccionar después no vuelve a contar', () => {
    const verified = verify(candidate(begin({ ...ROUTE_D2S1, stretch: 'ii-v' }), true))
    expect(counter(verified, 'routes:D2S1:major:ii-v')).toEqual({ attempts: 1, correct: 1 })
    for (const action of [{ type: 'verify' }, { type: 'verify' }, { type: 'candidate', index: 0 }, { type: 'candidate', index: 3 }] as SessionAction[]) {
      expect(act(verified, action)).toBe(verified)
    }
  })

  it('addAttempt no modifica el progreso recibido', () => {
    const progress = Object.freeze({ 'recognition:D2S1:easy': Object.freeze({ attempts: 1, correct: 1 }) })
    const next = addAttempt(progress, { bucket: { game: 'recognition', setId: 'D2S1', difficulty: 'easy' }, correct: false })
    expect(next['recognition:D2S1:easy']).toEqual({ attempts: 2, correct: 1 })
    expect(progress['recognition:D2S1:easy']).toEqual({ attempts: 1, correct: 1 })
  })

  it('attemptOf solo reconoce el paso de pregunta abierta a verificada', () => {
    const open = answered(begin({ difficulty: 'easy' }))
    const verified = verify(open)
    expect(attemptOf(open.session, verified.session)).toEqual({
      bucket: { game: 'recognition', setId: 'D2S1', difficulty: 'easy' },
      correct: true,
    })
    expect(attemptOf(verified.session, verified.session)).toBeNull()
    expect(attemptOf(open.session, open.session)).toBeNull()
  })
})

describe('reconocimiento: acierto completo solo con todos los campos del nivel, y un contador por set y dificultad', () => {
  it('fácil exige solo el acorde: la inversión y los grados no importan', () => {
    const state = answered(begin({ difficulty: 'easy' }), 'inversion')
    expect(counter(verify(state), 'recognition:D2S1:easy')).toEqual({ attempts: 1, correct: 1 })
  })

  it('medio exige acorde e inversión', () => {
    for (const [mistake, correct] of [['none', 1], ['quality', 0], ['inversion', 0]] as const) {
      const verified = verify(answered(begin({ difficulty: 'medium' }), mistake))
      expect(counter(verified, 'recognition:D2S1:medium'), mistake).toEqual({ attempts: 1, correct })
    }
  })

  it('difícil exige además los cuatro grados: uno equivocado no es acierto completo', () => {
    for (const [mistake, correct] of [['none', 1], ['degree', 0], ['quality', 0], ['inversion', 0]] as const) {
      const verified = verify(answered(begin({ difficulty: 'hard' }), mistake))
      expect(counter(verified, 'recognition:D2S1:hard'), mistake).toEqual({ attempts: 1, correct })
    }
  })

  it('cada set y cada dificultad tienen su propio contador y se acumulan sin mezclarse', () => {
    let progress: ProgressData = EMPTY_PROGRESS
    for (const set of catalog.sets) {
      for (const difficulty of ['easy', 'medium', 'hard'] as const) {
        progress = verify(answered(begin({ drop: set.drop, setId: set.id, difficulty }, progress))).progress
        progress = verify(answered(begin({ drop: set.drop, setId: set.id, difficulty }, progress, 8), 'quality')).progress
      }
    }
    expect(Object.keys(progress)).toHaveLength(catalog.sets.length * 3)
    for (const set of catalog.sets) {
      for (const difficulty of ['easy', 'medium', 'hard']) {
        expect(progress[`recognition:${set.id}:${difficulty}`]).toEqual({ attempts: 2, correct: 1 })
      }
    }
  })
})

describe('rutas: acierto solo con la candidata exacta, y un contador por set, modo y tramo', () => {
  it('solo la candidata de nuestra ruta es acierto: de las cuatro, una', () => {
    const open = begin({ ...ROUTE_D2S1, stretch: 'ii-v' })
    const expected = (open.session as RouteQuestionState).question.candidateRouteIds.indexOf((open.session as RouteQuestionState).question.routeId)
    for (let index = 0; index < 4; index += 1) {
      const verified = verify(act(open, { type: 'candidate', index }))
      expect(counter(verified, 'routes:D2S1:major:ii-v'), `candidata ${index + 1}`).toEqual({ attempts: 1, correct: index === expected ? 1 : 0 })
    }
  })

  it('II → V y V → I son contadores distintos', () => {
    const iiV = verify(candidate(begin({ ...ROUTE_D2S1, stretch: 'ii-v' }), true))
    const viI = verify(candidate(begin({ ...ROUTE_D2S1, stretch: 'v-i' }, iiV.progress), false))
    expect(viI.progress).toEqual({
      'routes:D2S1:major:ii-v': { attempts: 1, correct: 1 },
      'routes:D2S1:major:v-i': { attempts: 1, correct: 0 },
    })
  })

  it('II → V → I cuenta cada tramo como un intento independiente, también tras fallar el V', () => {
    let state = begin({ ...ROUTE_D2S1, stretch: 'both' })
    expect((state.session as RouteQuestionState).question.target).toBe('V')
    state = verify(candidate(state, false))
    expect(state.progress).toEqual({ 'routes:D2S1:major:ii-v': { attempts: 1, correct: 0 } })
    state = act(state, { type: 'next', seed: 5 })
    expect(state.session.phase).toBe('ruta')
    expect((state.session as RouteQuestionState).question.target).toBe('I')
    state = verify(candidate(state, true))
    expect(state.progress).toEqual({
      'routes:D2S1:major:ii-v': { attempts: 1, correct: 0 },
      'routes:D2S1:major:v-i': { attempts: 1, correct: 1 },
    })
    // Y la siguiente ruta vuelve a empezar por el tramo II → V.
    state = act(state, { type: 'next', seed: 6 })
    expect((state.session as RouteQuestionState).question.target).toBe('V')
    expect(state.progress['routes:D2S1:major:ii-v']).toEqual({ attempts: 1, correct: 0 })
  })

  it('el modo menor y el otro set tienen contadores propios', () => {
    let progress: ProgressData = EMPTY_PROGRESS
    for (const [setId, routeMode] of [['D2S1', 'major'], ['D2S1', 'minor'], ['D2S2', 'major'], ['D2S2', 'minor']] as const) {
      progress = verify(candidate(begin({ game: 'routes', drop: 'drop2', setId, routeMode, stretch: 'ii-v' }, progress), true)).progress
    }
    expect(progress).toEqual({
      'routes:D2S1:major:ii-v': { attempts: 1, correct: 1 },
      'routes:D2S1:minor:ii-v': { attempts: 1, correct: 1 },
      'routes:D2S2:major:ii-v': { attempts: 1, correct: 1 },
      'routes:D2S2:minor:ii-v': { attempts: 1, correct: 1 },
    })
  })

  it('reconocimiento y rutas no se mezclan', () => {
    const recognition = verify(answered(begin({ difficulty: 'easy' })))
    const both = verify(candidate(begin({ ...ROUTE_D2S1, stretch: 'ii-v' }, recognition.progress), true))
    expect(Object.keys(both.progress).sort()).toEqual(['recognition:D2S1:easy', 'routes:D2S1:major:ii-v'])
  })
})
