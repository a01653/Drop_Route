import type { Catalog } from '../data/types'
import { choose, configure, exit, moveDegree, next, start, verify } from '.'
import type { SessionState } from '.'
import type { DegreeAction } from './degrees'

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
  | { type: 'verify' }
  | { type: 'next'; seed: number }
  | { type: 'exit' }

export function reduceSession(catalog: Catalog, state: SessionState, action: SessionAction): SessionState {
  switch (action.type) {
    case 'configure':
      return configure(catalog, state, action.change)
    case 'start':
      return start(catalog, state, action.seed)
    case 'choose':
      return choose(state, action.change)
    case 'degree':
      return moveDegree(state, action.action)
    case 'verify':
      return verify(catalog, state)
    case 'next':
      return next(catalog, state, action.seed)
    case 'exit':
      return exit(state)
  }
}
