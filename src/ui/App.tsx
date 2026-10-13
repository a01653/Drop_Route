import { useReducer } from 'react'
import { catalog } from '../data'
import { createSession, reduceSession } from '../session'
import type { SessionAction, SessionState } from '../session'
import './app.css'
import './game/game.css'
import { MenuScreen } from './game/MenuScreen'
import { RecognitionScreen } from './game/RecognitionScreen'
import { ReviewScreen } from './review/ReviewScreen'
import { useHashRoute } from './useHashRoute'

/** Semilla de una pregunta nueva: el azar de producción vive aquí, no en la sesión. */
const newSeed = () => Math.floor(Math.random() * 2 ** 32)

const reducer = (state: SessionState, action: SessionAction): SessionState => reduceSession(catalog, state, action)

export function App() {
  const route = useHashRoute()
  const [state, dispatch] = useReducer<SessionState, [SessionAction]>(reducer, createSession(catalog))

  if (route === '#/revision') return <ReviewScreen />
  return state.phase === 'menu' ? (
    <MenuScreen state={state} dispatch={dispatch} newSeed={newSeed} />
  ) : (
    <RecognitionScreen state={state} dispatch={dispatch} newSeed={newSeed} />
  )
}
