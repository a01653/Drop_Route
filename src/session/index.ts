// Capa de sesión: menú, preguntas, verificación y regreso al menú. Funciones puras sobre un estado
// inmutable, sin React ni DOM, para probarlas con fixtures y semillas.
import { routesDocument } from '../data'
import type { Catalog, Inversion, QualityKey, RoutesDocument } from '../data/types'
import { defaultConfig, isScaleGame, updateConfig } from './config'
import type { ConfigChange, GameConfig } from './config'
import { applyDegreeAction } from './degrees'
import type { DegreeAction, Held } from './degrees'
import { createQuestion, emptyAnswer, evaluate, isAnswerComplete } from './recognition'
import type { RecognitionAnswer, RecognitionQuestion, RecognitionResult } from './recognition'
import { createRng } from './rng'
import { createRouteQuestion, evaluateRoute } from './routes'
import type { RouteQuestion, RouteResult } from './routes'
import { finishScaleGame, nextScaleGame, previousScaleGame, startScaleGame, verifyScaleGame } from './scaleSession'
import type { OrderQuestionState, OrderSummaryState, OrderVerifiedState, ScaleGameState, ScaleQuestionState, ScaleSummaryState, ScaleVerifiedState } from './scaleSession'

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
  readonly attempts: readonly RecognitionAttempt[]
  readonly position: number
}

/** Pregunta verificada: la respuesta queda bloqueada y el resultado se calcula una sola vez. */
export interface VerifiedState {
  readonly phase: 'verificada'
  readonly config: GameConfig
  readonly question: RecognitionQuestion
  readonly answer: RecognitionAnswer
  readonly result: RecognitionResult
  readonly attempts: readonly RecognitionAttempt[]
  readonly position: number
}

/** Respuesta de reconocimiento guardada para volver a la pregunta o revisar el test. */
export interface RecognitionAttempt {
  readonly question: RecognitionQuestion
  readonly answer: RecognitionAnswer
  readonly result: RecognitionResult | null
}

/** Revisión final de una sesión de reconocimiento. */
export interface RecognitionSummaryState {
  readonly phase: 'reconocimiento-resumen'
  readonly config: GameConfig
  readonly attempts: readonly RecognitionAttempt[]
}

/** Pregunta de ruta abierta. La candidata que se ve es la respuesta: el índice va de 0 a 3. */
export interface RouteQuestionState {
  readonly phase: 'ruta'
  readonly config: GameConfig
  readonly question: RouteQuestion
  readonly selected: number
  readonly attempts: readonly RouteAttempt[]
  readonly position: number
}

/** Pregunta de ruta verificada: la candidata queda bloqueada y se compara con la ruta exacta. */
export interface RouteVerifiedState {
  readonly phase: 'ruta-verificada'
  readonly config: GameConfig
  readonly question: RouteQuestion
  readonly selected: number
  readonly result: RouteResult
  readonly attempts: readonly RouteAttempt[]
  readonly position: number
}

/** Respuesta guardada para poder retroceder y revisar una sesión de rutas. */
export interface RouteAttempt {
  readonly question: RouteQuestion
  readonly selected: number
  readonly result: RouteResult | null
}

/** Resumen final de la sesión de rutas; incluye la pregunta actual aunque aún no se haya verificado. */
export interface RouteSummaryState {
  readonly phase: 'ruta-resumen'
  readonly config: GameConfig
  readonly attempts: readonly RouteAttempt[]
}

export type SessionState =
  | MenuState
  | QuestionState
  | VerifiedState
  | RecognitionSummaryState
  | RouteQuestionState
  | RouteVerifiedState
  | RouteSummaryState
  | ScaleQuestionState
  | ScaleVerifiedState
  | ScaleSummaryState
  | OrderQuestionState
  | OrderVerifiedState
  | OrderSummaryState

/** Pregunta abierta o verificada de uno de los dos juegos de escalas. */
export function isScaleGameState(state: SessionState): state is ScaleGameState {
  return state.phase === 'escala' || state.phase === 'escala-verificada' || state.phase === 'orden' || state.phase === 'orden-verificada'
}
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
  if (isScaleGame(state.config.game)) return startScaleGame(state.config, seed)
  const rng = createRng(seed)
  if (state.config.game === 'routes') {
    const question = createRouteQuestion(state.config, rng, routes)
    return {
      phase: 'ruta', config: state.config, question, selected: 0,
      attempts: [{ question, selected: 0, result: null }], position: 0,
    }
  }
  const question = createQuestion(catalog, state.config, rng)
  return {
    phase: 'pregunta', config: state.config, question, answer: emptyAnswer(), held: null,
    attempts: [{ question, answer: emptyAnswer(), result: null }], position: 0,
  }
}

function updateRecognitionAttempt<T extends QuestionState | VerifiedState>(state: T, attempt: RecognitionAttempt): T {
  return {
    ...state,
    attempts: state.attempts.map((item, position) => position === state.position ? attempt : item),
  }
}

/** Selecciona o cambia un campo de la respuesta. Seleccionar no verifica ni puntúa. */
export function choose(
  state: SessionState,
  change: { quality: QualityKey | null } | { inversion: Inversion | null },
): SessionState {
  if (state.phase !== 'pregunta') return state
  const answer = { ...state.answer, ...change }
  return updateRecognitionAttempt({ ...state, answer }, { question: state.question, answer, result: null })
}

/** Coloca, mueve, devuelve o quita grados en difícil. En otros niveles o fases no hace nada. */
export function moveDegree(state: SessionState, action: DegreeAction): SessionState {
  if (state.phase !== 'pregunta' || state.question.difficulty !== 'hard') return state
  const board = applyDegreeAction({ slots: state.answer.degrees, held: state.held }, action)
  if (board.slots === state.answer.degrees && board.held === state.held) return state
  const answer = { ...state.answer, degrees: board.slots }
  return updateRecognitionAttempt({ ...state, answer, held: board.held }, { question: state.question, answer, result: null })
}

/** Elige la candidata de ruta que se ve (0 a 3). Cambiar de candidata no cambia la partida ni verifica. */
export function selectCandidate(state: SessionState, index: number): SessionState {
  if (state.phase !== 'ruta' || !Number.isInteger(index) || index < 0 || index >= state.question.candidateRouteIds.length) {
    return state
  }
  if (index === state.selected) return state
  const attempts = state.attempts.map((attempt, position) => position === state.position ? { ...attempt, selected: index } : attempt)
  return { ...state, selected: index, attempts }
}

/** Recupera una pregunta anterior conservando su respuesta y su resultado. */
export function previousRoute(state: SessionState): SessionState {
  if ((state.phase !== 'ruta' && state.phase !== 'ruta-verificada') || state.position === 0) return state
  const position = state.position - 1
  const attempt = state.attempts[position]!
  const common = { config: state.config, question: attempt.question, selected: attempt.selected, attempts: state.attempts, position }
  return attempt.result
    ? { phase: 'ruta-verificada', ...common, result: attempt.result }
    : { phase: 'ruta', ...common }
}

/** Recupera la pregunta anterior de reconocimiento con la respuesta y corrección que ya tenía. */
export function previousRecognition(state: SessionState): SessionState {
  if ((state.phase !== 'pregunta' && state.phase !== 'verificada') || state.position === 0) return state
  const position = state.position - 1
  const attempt = state.attempts[position]!
  const common = {
    config: state.config, question: attempt.question, answer: attempt.answer,
    attempts: state.attempts, position,
  }
  return attempt.result
    ? { phase: 'verificada', ...common, result: attempt.result }
    : { phase: 'pregunta', ...common, held: null }
}

/** Cierra la sesión para mostrar las respuestas y las posiciones de la ruta. */
export function finishRouteTest(state: SessionState): SessionState {
  if ((state.phase !== 'ruta' && state.phase !== 'ruta-verificada') || state.position !== state.attempts.length - 1) return state
  return { phase: 'ruta-resumen', config: state.config, attempts: state.attempts.slice(0, state.position + 1) }
}

/** Termina el test de reconocimiento en la pregunta actual para revisar todo lo recorrido. */
export function finishRecognitionTest(state: SessionState): SessionState {
  if (state.phase !== 'pregunta' && state.phase !== 'verificada') return state
  return { phase: 'reconocimiento-resumen', config: state.config, attempts: state.attempts }
}

/** Despacha el retroceso al juego activo. */
export function previous(state: SessionState): SessionState {
  if (isScaleGameState(state)) return previousScaleGame(state)
  return state.phase === 'ruta' || state.phase === 'ruta-verificada' ? previousRoute(state) : previousRecognition(state)
}

/** Termina y resume el juego activo. */
export function finishTest(state: SessionState): SessionState {
  if (isScaleGameState(state)) return finishScaleGame(state)
  return state.phase === 'ruta' || state.phase === 'ruta-verificada' ? finishRouteTest(state) : finishRecognitionTest(state)
}

/** Verifica una respuesta completa. Incompleta, o ya verificada, no cambia nada. */
export function verify(catalog: Catalog, state: SessionState, routes: RoutesDocument = routesDocument): SessionState {
  if (isScaleGameState(state)) return verifyScaleGame(state)
  if (state.phase === 'ruta') {
    const result = evaluateRoute(catalog, routes, state.question, state.selected)
    const attempts = state.attempts.map((attempt, position) => position === state.position ? { ...attempt, result } : attempt)
    return {
      phase: 'ruta-verificada',
      config: state.config,
      question: state.question,
      selected: state.selected,
      result,
      attempts,
      position: state.position,
    }
  }
  if (state.phase !== 'pregunta' || !isAnswerComplete(state.question.difficulty, state.answer)) return state
  const result = evaluate(catalog, state.question, state.answer)
  const attempts = state.attempts.map((attempt, position) => position === state.position
    ? { ...attempt, answer: state.answer, result }
    : attempt)
  return {
    phase: 'verificada',
    config: state.config,
    question: state.question,
    answer: state.answer,
    result,
    attempts,
    position: state.position,
  }
}

/** Siguiente pregunta tras verificar: conserva la ronda de reconocimiento y su configuración. */
export function next(
  catalog: Catalog,
  state: SessionState,
  seed: number,
  routes: RoutesDocument = routesDocument,
): SessionState {
  if (isScaleGameState(state)) return nextScaleGame(state, seed)
  if (state.phase === 'ruta-verificada') {
    if (state.position < state.attempts.length - 1) {
      const position = state.position + 1
      const attempt = state.attempts[position]!
      const common = { config: state.config, question: attempt.question, selected: attempt.selected, attempts: state.attempts, position }
      return attempt.result
        ? { phase: 'ruta-verificada', ...common, result: attempt.result }
        : { phase: 'ruta', ...common }
    }
    const question = createRouteQuestion(state.config, createRng(seed), routes, state.question)
    const attempts = [...state.attempts, { question, selected: 0, result: null }]
    return { phase: 'ruta', config: state.config, question, selected: 0, attempts, position: attempts.length - 1 }
  }
  if (state.phase !== 'verificada') return state
  if (state.position < state.attempts.length - 1) {
    const position = state.position + 1
    const attempt = state.attempts[position]!
    const common = { config: state.config, question: attempt.question, answer: attempt.answer, attempts: state.attempts, position }
    return attempt.result
      ? { phase: 'verificada', ...common, result: attempt.result }
      : { phase: 'pregunta', ...common, held: null }
  }
  const question = createQuestion(catalog, state.config, createRng(seed), state.question)
  const answer = emptyAnswer()
  const attempts = [...state.attempts, { question, answer, result: null }]
  return { phase: 'pregunta', config: state.config, question, answer, held: null, attempts, position: attempts.length - 1 }
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
export * from './scaleOrder'
export * from './scaleSession'
export * from './scales'
