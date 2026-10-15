// Capa de sesión: menú, preguntas, verificación y regreso al menú. Funciones puras sobre un estado
// inmutable, sin React ni DOM, para probarlas con fixtures y semillas.
import { routesDocument } from '../data'
import type { Catalog, Inversion, QualityKey, RoutesDocument } from '../data/types'
import { defaultConfig, updateConfig } from './config'
import type { ConfigChange, GameConfig } from './config'
import { applyDegreeAction } from './degrees'
import type { DegreeAction, Held } from './degrees'
import { createQuestion, emptyAnswer, evaluate, isAnswerComplete } from './recognition'
import type { RecognitionAnswer, RecognitionQuestion, RecognitionResult } from './recognition'
import { createRng } from './rng'
import { createRouteQuestion, evaluateRoute } from './routes'
import type { RouteQuestion, RouteResult } from './routes'

export interface MenuState {
  readonly phase: 'menu'
  readonly config: GameConfig
}

/** Pregunta abierta: se puede cambiar la respuesta, pero todavía no hay resultado. */
export interface QuestionState {
  readonly phase: 'pregunta'
  readonly config: GameConfig
  readonly question: RecognitionQuestion
  readonly answer: RecognitionAnswer
  /** Ficha que se sostiene (arrastre, dos toques o teclado) en difícil; null si no hay ninguna. */
  readonly held: Held | null
}

/** Pregunta verificada: la respuesta queda bloqueada y el resultado se calcula una sola vez. */
export interface VerifiedState {
  readonly phase: 'verificada'
  readonly config: GameConfig
  readonly question: RecognitionQuestion
  readonly answer: RecognitionAnswer
  readonly result: RecognitionResult
}

/** Pregunta de ruta abierta. La candidata que se ve es la respuesta: el índice va de 0 a 3. */
export interface RouteQuestionState {
  readonly phase: 'ruta'
  readonly config: GameConfig
  readonly question: RouteQuestion
  readonly selected: number
}

/** Pregunta de ruta verificada: la candidata queda bloqueada y se compara con la ruta exacta. */
export interface RouteVerifiedState {
  readonly phase: 'ruta-verificada'
  readonly config: GameConfig
  readonly question: RouteQuestion
  readonly selected: number
  readonly result: RouteResult
}

export type SessionState = MenuState | QuestionState | VerifiedState | RouteQuestionState | RouteVerifiedState
export type SessionPhase = SessionState['phase']

export function createSession(catalog: Catalog): MenuState {
  return { phase: 'menu', config: defaultConfig(catalog) }
}

/** Cambia la configuración. Solo tiene efecto en el menú. */
export function configure(
  catalog: Catalog,
  state: SessionState,
  change: ConfigChange,
  routes: RoutesDocument = routesDocument,
): SessionState {
  return state.phase === 'menu' ? { phase: 'menu', config: updateConfig(catalog, state.config, change, routes) } : state
}

/** Empieza una partida desde el menú con la primera pregunta del juego elegido. */
export function start(
  catalog: Catalog,
  state: SessionState,
  seed: number,
  routes: RoutesDocument = routesDocument,
): SessionState {
  if (state.phase !== 'menu') return state
  const rng = createRng(seed)
  if (state.config.game === 'routes') {
    return { phase: 'ruta', config: state.config, question: createRouteQuestion(state.config, rng, routes), selected: 0 }
  }
  const question = createQuestion(catalog, state.config, rng)
  return { phase: 'pregunta', config: state.config, question, answer: emptyAnswer(), held: null }
}

/** Selecciona o cambia un campo de la respuesta. Seleccionar no verifica ni puntúa. */
export function choose(
  state: SessionState,
  change: { quality: QualityKey | null } | { inversion: Inversion | null },
): SessionState {
  if (state.phase !== 'pregunta') return state
  return { ...state, answer: { ...state.answer, ...change } }
}

/** Coloca, mueve, devuelve o quita grados en difícil. En otros niveles o fases no hace nada. */
export function moveDegree(state: SessionState, action: DegreeAction): SessionState {
  if (state.phase !== 'pregunta' || state.question.difficulty !== 'hard') return state
  const board = applyDegreeAction({ slots: state.answer.degrees, held: state.held }, action)
  if (board.slots === state.answer.degrees && board.held === state.held) return state
  return { ...state, answer: { ...state.answer, degrees: board.slots }, held: board.held }
}

/** Elige la candidata de ruta que se ve (0 a 3). Cambiar de candidata no cambia la partida ni verifica. */
export function selectCandidate(state: SessionState, index: number): SessionState {
  if (state.phase !== 'ruta' || !Number.isInteger(index) || index < 0 || index >= state.question.candidateRouteIds.length) {
    return state
  }
  return index === state.selected ? state : { ...state, selected: index }
}

/** Verifica una respuesta completa. Incompleta, o ya verificada, no cambia nada. */
export function verify(catalog: Catalog, state: SessionState, routes: RoutesDocument = routesDocument): SessionState {
  if (state.phase === 'ruta') {
    return {
      phase: 'ruta-verificada',
      config: state.config,
      question: state.question,
      selected: state.selected,
      result: evaluateRoute(catalog, routes, state.question, state.selected),
    }
  }
  if (state.phase !== 'pregunta' || !isAnswerComplete(state.question.difficulty, state.answer)) return state
  return {
    phase: 'verificada',
    config: state.config,
    question: state.question,
    answer: state.answer,
    result: evaluate(catalog, state.question, state.answer),
  }
}

/** Siguiente pregunta tras verificar: conserva la ronda de reconocimiento y su configuración. */
export function next(
  catalog: Catalog,
  state: SessionState,
  seed: number,
  routes: RoutesDocument = routesDocument,
): SessionState {
  if (state.phase === 'ruta-verificada') {
    const question = createRouteQuestion(state.config, createRng(seed), routes, state.question)
    return { phase: 'ruta', config: state.config, question, selected: 0 }
  }
  if (state.phase !== 'verificada') return state
  const question = createQuestion(catalog, state.config, createRng(seed), state.question)
  return { phase: 'pregunta', config: state.config, question, answer: emptyAnswer(), held: null }
}

/** Salir vuelve al menú conservando la última configuración. */
export function exit(state: SessionState): SessionState {
  return { phase: 'menu', config: state.config }
}

export * from './actions'
export * from './config'
export * from './degrees'
export * from './recognition'
export * from './rng'
export * from './routes'
