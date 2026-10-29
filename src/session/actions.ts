import { routesDocument } from '../data'
import type { Catalog, PatternNumber, RoutesDocument, ScaleDegree } from '../data/types'
import { choose, configure, exit, finishTest, moveDegree, next, previous, selectCandidate, start, verify } from '.'
import type { SessionState } from '.'
import type { DegreeAction } from './degrees'
import { chooseScalePattern, markScaleNote, pickOrderCard, resetOrder } from './scaleSession'

type ConfigureChange = Parameters<typeof configure>[2]
type ChooseChange = Parameters<typeof choose>[1]

/**
 * Acciones que puede lanzar la interfaz. Las que necesitan azar llevan la semilla ya elegida, de modo que el
 * reductor sigue siendo una función pura y cada pregunta se puede reproducir.
 */
export type SessionAction =
  | { type: 'configure'; change: ConfigureChange }
  | { type: 'start'; seed: number }
  | { type: 'choose'; change: ChooseChange }
  | { type: 'degree'; action: DegreeAction }
  | { type: 'candidate'; index: number }
  | { type: 'scale-pattern'; pattern: PatternNumber | null }
  | { type: 'scale-mark'; index: number; degree: ScaleDegree | null }
  | { type: 'order-pick'; card: number }
  | { type: 'order-reset' }
  | { type: 'verify' }
  | { type: 'next'; seed: number }
  | { type: 'previous' }
  | { type: 'finish-test' }
  | { type: 'exit' }

export function reduceSession(
  catalog: Catalog,
  state: SessionState,
  action: SessionAction,
  routes: RoutesDocument = routesDocument,
): SessionState {
  switch (action.type) {
    case 'configure':
      return configure(catalog, state, action.change, routes)
    case 'start':
      return start(catalog, state, action.seed, routes)
    case 'choose':
      return choose(state, action.change)
    case 'degree':
      return moveDegree(state, action.action)
    case 'candidate':
      return selectCandidate(state, action.index)
    case 'scale-pattern':
      return state.phase === 'escala' ? chooseScalePattern(state, action.pattern) : state
    case 'scale-mark':
      return state.phase === 'escala' ? markScaleNote(state, action.index, action.degree) : state
    case 'order-pick':
      return state.phase === 'orden' ? pickOrderCard(state, action.card) : state
    case 'order-reset':
      return state.phase === 'orden' ? resetOrder(state) : state
    case 'verify':
      return verify(catalog, state, routes)
    case 'next':
      return next(catalog, state, action.seed, routes)
    case 'previous':
      return previous(state)
    case 'finish-test':
      return finishTest(state)
    case 'exit':
      return exit(state)
  }
}
