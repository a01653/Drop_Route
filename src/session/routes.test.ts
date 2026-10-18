import { describe, expect, it } from 'vitest'
import { catalog, routesDocument } from '../data'
import type { Inversion, RoutesDocument, SetId } from '../data'
import { inversionFromBass } from '../music/pitch'
import { configure, createSession, exit, finishRouteTest, next, previousRoute, selectCandidate, start, verify } from '.'
import type { RouteQuestionState, RouteVerifiedState, SessionState } from '.'
import { defaultConfig, dropFamilies, routeSetIds, setsForGame, setsOfDrop, updateConfig } from './config'
import type { GameConfig, RouteMode, RouteStretch } from './config'
import {
  answerStep,
  candidateSteps,
  createRouteQuestion,
  evaluateRoute,
  routeById,
  routeGroup,
  startStep,
  stepOf,
} from './routes'
import { createRng } from './rng'

const ROUTE_SETS: SetId[] = ['D2S1', 'D2S2']
const MODES: RouteMode[] = ['major', 'minor']
const STRETCHES: RouteStretch[] = ['ii-v', 'v-i', 'both']
const config = (setId: SetId, routeMode: RouteMode, stretch: RouteStretch): GameConfig => ({
  ...defaultConfig(catalog),
  game: 'routes',
  drop: 'drop2',
  setId,
  routeMode,
  stretch,
})
const signature = (notes: { string: number; fret: number }[]) =>
  notes.map((note) => `${note.string}:${note.fret}`).sort().join(',')
const rightIndexFor = (state: RouteQuestionState) => state.question.candidateRouteIds.indexOf(state.question.routeId)

// Oráculo independiente de docs/MUSIC.md: inversión del V y del I según la inversión inicial del II.
const V_INVERSION: Inversion[] = [2, 3, 0, 1]

describe('datos de rutas y configuración (R11)', () => {
  it('hay 16 rutas: cuatro por set y modo, en Drop 2 sets 1 y 2', () => {
    expect(routesDocument.routes).toHaveLength(16)
    expect(routeSetIds()).toEqual(ROUTE_SETS)
    for (const setId of ROUTE_SETS) for (const mode of MODES) expect(routeGroup(routesDocument, setId, mode)).toHaveLength(4)
  })

  it('solo se ofrecen los sets con rutas: Drop 2 sets 1 y 2', () => {
    expect(setsForGame(catalog, 'routes').map((set) => set.id)).toEqual(ROUTE_SETS)
    expect(dropFamilies(catalog, 'routes')).toEqual(['drop2'])
    expect(setsOfDrop(catalog, 'drop2', 'routes').map((set) => set.id)).toEqual(ROUTE_SETS)
    expect(setsOfDrop(catalog, 'drop3', 'routes')).toEqual([])
    // Las demás familias siguen disponibles para reconocimiento.
    expect(dropFamilies(catalog, 'recognition')).toEqual(['drop2', 'drop3', 'drop2+4'])
  })

  it('al elegir rutas desde un set sin rutas se pasa a uno válido, y se puede volver sin perder nada', () => {
    const recognition = { ...defaultConfig(catalog), drop: 'drop3' as const, setId: 'D3S2' as const }
    const routes = updateConfig(catalog, recognition, { game: 'routes' })
    expect(routes).toMatchObject({ game: 'routes', drop: 'drop2', setId: 'D2S1' })
    expect(updateConfig(catalog, routes, { drop: 'drop3' })).toMatchObject({ drop: 'drop2', setId: 'D2S1' })
    expect(updateConfig(catalog, routes, { setId: 'D3S1' })).toMatchObject({ setId: 'D2S1' })
    expect(updateConfig(catalog, routes, { setId: 'D2S2' })).toMatchObject({ setId: 'D2S2' })
    expect(updateConfig(catalog, routes, { game: 'recognition', drop: 'drop2+4' })).toMatchObject({ game: 'recognition', drop: 'drop2+4', setId: 'D24S1' })
    expect(updateConfig(catalog, routes, { routeMode: 'minor', stretch: 'both' })).toMatchObject({ routeMode: 'minor', stretch: 'both' })
  })

  it('un documento sin rutas de un set no lo ofrece (fixture)', () => {
    const only: RoutesDocument = { ...routesDocument, routes: routesDocument.routes.filter((route) => route.setId === 'D2S2') }
    expect(routeSetIds(only)).toEqual(['D2S2'])
    expect(updateConfig(catalog, defaultConfig(catalog), { game: 'routes' }, only).setId).toBe('D2S2')
  })
})

describe('preguntas de ruta (R12, R14)', () => {
  it('ofrece cuatro candidatas únicas de la misma calidad que la respuesta, en todos los grupos y tramos', () => {
    for (const setId of ROUTE_SETS) {
      for (const mode of MODES) {
        for (const stretch of STRETCHES) {
          for (let seed = 1; seed <= 25; seed += 1) {
            const question = createRouteQuestion(config(setId, mode, stretch), createRng(seed))
            const candidates = candidateSteps(routesDocument, question)
            const expected = answerStep(routesDocument, question)
            const label = `${setId} ${mode} ${stretch} semilla ${seed}`
            expect(candidates, label).toHaveLength(4)
            expect(new Set(question.candidateRouteIds).size, label).toBe(4)
            expect(new Set(candidates.map((step) => signature(step.notes))).size, `${label}: posiciones únicas`).toBe(4)
            expect(new Set(candidates.map((step) => step.quality)).size, `${label}: misma calidad`).toBe(1)
            expect(new Set(candidates.map((step) => step.rootPc)).size).toBe(1)
            expect(new Set(candidates.map((step) => step.inversion)).size, `${label}: cuatro inversiones`).toBe(4)
            expect(candidates.map((step) => signature(step.notes)), label).toContain(signature(expected.notes))
            expect(question.candidateRouteIds).toContain(question.routeId)
          }
        }
      }
    }
  })

  it('el tramo II-V pregunta el V desde el II y el V-I pregunta el I desde el V de esa ruta', () => {
    for (const mode of MODES) {
      const ii = createRouteQuestion(config('D2S1', mode, 'ii-v'), createRng(3))
      expect(ii.target).toBe('V')
      const route = routeById(routesDocument, ii.routeId)
      expect(startStep(routesDocument, ii)).toBe(stepOf(route, 'ii'))
      expect(answerStep(routesDocument, ii)).toBe(stepOf(route, 'V'))
      expect(answerStep(routesDocument, ii).name).toBe('G7')
      expect(startStep(routesDocument, ii).name).toBe(mode === 'major' ? 'Dm7' : 'Dm7(b5)')

      const vi = createRouteQuestion(config('D2S1', mode, 'v-i'), createRng(3))
      expect(vi.target).toBe('I')
      const other = routeById(routesDocument, vi.routeId)
      expect(startStep(routesDocument, vi)).toBe(stepOf(other, 'V'))
      expect(answerStep(routesDocument, vi).name).toBe(mode === 'major' ? 'Cmaj7' : 'Cm7')
    }
  })

  it('el I menor sigue siendo Cm7 y nunca otra calidad', () => {
    for (const setId of ROUTE_SETS) {
      for (let seed = 1; seed <= 20; seed += 1) {
        const question = createRouteQuestion(config(setId, 'minor', 'v-i'), createRng(seed))
        for (const step of candidateSteps(routesDocument, question)) {
          expect(step.quality).toBe('m7')
          expect(step.name).toBe('Cm7')
        }
      }
    }
  })

  it('la respuesta es la de la ruta del material y su inversión coincide con la tabla independiente', () => {
    for (const route of routesDocument.routes) {
      const start = route.steps[0]!.inversion
      expect(inversionFromBass(stepOf(route, 'V'), catalog), route.id).toBe(V_INVERSION[start])
      expect(inversionFromBass(stepOf(route, 'I'), catalog), route.id).toBe(start)
    }
  })

  it('el orden de las candidatas varía y es reproducible con la misma semilla', () => {
    const orders = new Set<string>()
    for (let seed = 1; seed <= 60; seed += 1) {
      orders.add(createRouteQuestion(config('D2S2', 'major', 'ii-v'), createRng(seed)).candidateRouteIds.join(','))
    }
    expect(orders.size).toBeGreaterThan(8)
    expect(createRouteQuestion(config('D2S1', 'minor', 'v-i'), createRng(9))).toEqual(
      createRouteQuestion(config('D2S1', 'minor', 'v-i'), createRng(9)),
    )
  })

  it('no repite la ruta anterior y a lo largo de una sesión salen las cuatro', () => {
    for (const stretch of ['ii-v', 'v-i'] as const) {
      let previous = createRouteQuestion(config('D2S1', 'major', stretch), createRng(1))
      const seen = new Set([previous.routeId])
      for (let seed = 2; seed <= 120; seed += 1) {
        const question = createRouteQuestion(config('D2S1', 'major', stretch), createRng(seed), routesDocument, previous)
        expect(question.routeId).not.toBe(previous.routeId)
        expect(question.number).toBe(previous.number + 1)
        seen.add(question.routeId)
        previous = question
      }
      expect(seen.size).toBe(4)
    }
  })

  it('todas las 16 rutas se preguntan en algún momento', () => {
    const seen = new Set<string>()
    for (const setId of ROUTE_SETS) {
      for (const mode of MODES) {
        for (let seed = 1; seed <= 80; seed += 1) seen.add(createRouteQuestion(config(setId, mode, 'ii-v'), createRng(seed)).routeId)
      }
    }
    expect(seen.size).toBe(16)
  })
})

describe('partida estable y tramo V-I desde el V correcto (R14)', () => {
  const begin = (stretch: RouteStretch, seed = 4): RouteQuestionState => {
    const menu = configure(catalog, createSession(catalog), { game: 'routes', routeMode: 'major', stretch })
    return start(catalog, menu, seed) as RouteQuestionState
  }

  it('cambiar de candidata no cambia la partida, la pregunta ni verifica', () => {
    const state = begin('ii-v')
    const before = { question: state.question, start: startStep(routesDocument, state.question) }
    for (const index of [3, 1, 2, 0]) {
      const moved = selectCandidate(state, index) as RouteQuestionState
      expect(moved.phase).toBe('ruta')
      expect(moved.selected).toBe(index === 0 ? state.selected : index)
      expect(moved.question).toBe(before.question)
      expect(startStep(routesDocument, moved.question)).toBe(before.start)
    }
  })

  it('ignora candidatas fuera de rango y no hace nada fuera de una pregunta de ruta', () => {
    const state = begin('ii-v')
    for (const index of [-1, 4, 1.5, Number.NaN]) expect(selectCandidate(state, index)).toBe(state)
    const menu = createSession(catalog)
    expect(selectCandidate(menu, 1)).toBe(menu)
  })

  it('verifica una vez, bloquea la candidata y compara con la ruta exacta', () => {
    const state = begin('ii-v')
    const right = state.question.candidateRouteIds.indexOf(state.question.routeId)
    const done = verify(catalog, selectCandidate(state, right)) as RouteVerifiedState
    expect(done.phase).toBe('ruta-verificada')
    expect(done.result.correct).toBe(true)
    expect(done.result.chosenRouteId).toBe(state.question.routeId)
    // Bloqueo.
    expect(selectCandidate(done, (right + 1) % 4)).toBe(done)
    expect(verify(catalog, done)).toBe(done)
  })

  it('una candidata distinta no es la de nuestra ruta, pero es una posición válida de la misma calidad', () => {
    const state = begin('ii-v')
    const right = state.question.candidateRouteIds.indexOf(state.question.routeId)
    const wrong = (right + 1) % 4
    const done = verify(catalog, selectCandidate(state, wrong)) as RouteVerifiedState
    expect(done.result.correct).toBe(false)
    expect(done.result.chosenRouteId).not.toBe(done.result.expectedRouteId)
    expect(done.result.chosenInversion).not.toBe(done.result.expectedInversion)
    expect(done.result.chosenInversion).not.toBeNull()
    const chosen = stepOf(routeById(routesDocument, done.result.chosenRouteId), 'V')
    expect(chosen.quality).toBe(answerStep(routesDocument, state.question).quality)
    expect(done.selected).toBe(wrong)
  })

  it('II → V → I: tras fallar el V, el tramo V-I parte del V correcto de la misma ruta', () => {
    for (let seed = 1; seed <= 20; seed += 1) {
      const state = begin('both', seed)
      expect(state.question.target).toBe('V')
      const right = state.question.candidateRouteIds.indexOf(state.question.routeId)
      const wrong = (right + 1 + (seed % 3)) % 4
      const failed = verify(catalog, selectCandidate(state, wrong)) as RouteVerifiedState
      expect(failed.result.correct).toBe(false)

      const chained = next(catalog, failed, seed * 7) as RouteQuestionState
      expect(chained.phase).toBe('ruta')
      expect(chained.question.target).toBe('I')
      expect(chained.question.routeId).toBe(state.question.routeId)
      expect(chained.question.number).toBe(2)
      // La partida es el V de nuestra ruta, no el que eligió el usuario.
      const route = routeById(routesDocument, state.question.routeId)
      expect(startStep(routesDocument, chained.question)).toBe(stepOf(route, 'V'))
      expect(startStep(routesDocument, chained.question)).not.toBe(
        stepOf(routeById(routesDocument, failed.result.chosenRouteId), 'V'),
      )

      // Tras el V-I vuelve a otra ruta con el tramo II-V.
      const done = verify(catalog, chained) as RouteVerifiedState
      const after = next(catalog, done, seed * 11) as RouteQuestionState
      expect(after.question.target).toBe('V')
      expect(after.question.routeId).not.toBe(state.question.routeId)
    }
  })

  it('vuelve a la pregunta anterior y restaura exactamente la candidata y la corrección guardadas', () => {
    let first = begin('both', 12)
    first = selectCandidate(first, (rightIndexFor(first) + 1) % 4) as RouteQuestionState
    const firstDone = verify(catalog, first) as RouteVerifiedState
    const second = next(catalog, firstDone, 33) as RouteQuestionState
    const secondDone = verify(catalog, second) as RouteVerifiedState
    const restored = previousRoute(secondDone) as RouteVerifiedState
    expect(restored.question).toEqual(firstDone.question)
    expect(restored.selected).toBe(firstDone.selected)
    expect(restored.result).toEqual(firstDone.result)
    expect(restored.position).toBe(0)
    const forward = next(catalog, restored, 99) as RouteVerifiedState
    expect(forward.question).toEqual(secondDone.question)
    expect(forward.result).toEqual(secondDone.result)
  })

  it('termina y resume el test con los errores y las preguntas sin verificar', () => {
    const first = begin('ii-v', 15)
    const wrong = (rightIndexFor(first) + 1) % 4
    const firstDone = verify(catalog, selectCandidate(first, wrong)) as RouteVerifiedState
    const second = next(catalog, firstDone, 55) as RouteQuestionState
    const summary = finishRouteTest(second)
    expect(summary.phase).toBe('ruta-resumen')
    if (summary.phase !== 'ruta-resumen') throw new Error('El test debería haber terminado')
    expect(summary.attempts).toHaveLength(2)
    expect(summary.attempts[0]?.result?.correct).toBe(false)
    expect(summary.attempts[0]?.selected).toBe(wrong)
    expect(summary.attempts[1]?.result).toBeNull()
    const revisiting = previousRoute(second)
    expect(finishRouteTest(revisiting)).toBe(revisiting)
  })

  it('los tramos sueltos no encadenan: cada pregunta es de otra ruta', () => {
    for (const stretch of ['ii-v', 'v-i'] as const) {
      const state = begin(stretch)
      const done = verify(catalog, state) as RouteVerifiedState
      const following = next(catalog, done, 77) as RouteQuestionState
      expect(following.question.target).toBe(state.question.target)
      expect(following.question.routeId).not.toBe(state.question.routeId)
      expect(following.selected).toBe(0)
    }
  })

  it('Salir vuelve al menú con la configuración de rutas', () => {
    const state = begin('both')
    expect(exit(state)).toEqual({ phase: 'menu', config: state.config })
    expect(exit(verify(catalog, state))).toEqual({ phase: 'menu', config: state.config })
  })

  it('evaluateRoute rechaza una candidata fuera de rango', () => {
    const state = begin('ii-v')
    expect(() => evaluateRoute(catalog, routesDocument, state.question, 9)).toThrow(/fuera de rango/)
  })
})

describe('sin cambiar de juego en medio de una partida', () => {
  it('la configuración solo se cambia desde el menú', () => {
    const menu = configure(catalog, createSession(catalog), { game: 'routes' })
    const playing = start(catalog, menu, 2)
    expect(configure(catalog, playing as SessionState, { game: 'recognition' })).toBe(playing)
  })
})
