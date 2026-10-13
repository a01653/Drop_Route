// Capa de sesión: menú, pregunta, verificación y regreso al menú. Funciones puras sobre un estado
// inmutable, sin React ni DOM, para probarlas con fixtures y semillas.
import type { Catalog, Inversion, QualityKey } from '../data/types'
import { defaultConfig, updateConfig } from './config'
import type { GameConfig } from './config'
import { createQuestion, emptyAnswer, evaluate, isAnswerComplete } from './recognition'
import type { RecognitionAnswer, RecognitionQuestion, RecognitionResult } from './recognition'
import { applyDegreeAction } from './degrees'
import type { DegreeAction, Held } from './degrees'
import { createRng } from './rng'

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

export type SessionState = MenuState | QuestionState | VerifiedState
export type SessionPhase = SessionState['phase']

export function createSession(catalog: Catalog): MenuState {
  return { phase: 'menu', config: defaultConfig(catalog) }
}

/** Cambia la configuración. Solo tiene efecto en el menú. */
export function configure(
  catalog: Catalog,
  state: SessionState,
  change: Parameters<typeof updateConfig>[2],
): SessionState {
  return state.phase === 'menu' ? { phase: 'menu', config: updateConfig(catalog, state.config, change) } : state
}

/** Empieza una partida desde el menú con la primera pregunta. */
export function start(catalog: Catalog, state: SessionState, seed: number): SessionState {
  if (state.phase !== 'menu') return state
  const question = createQuestion(catalog, state.config, createRng(seed))
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

/** Verifica una respuesta completa. Incompleta, o ya verificada, no cambia nada. */
export function verify(catalog: Catalog, state: SessionState): SessionState {
  if (state.phase !== 'pregunta' || !isAnswerComplete(state.question.difficulty, state.answer)) return state
  return {
    phase: 'verificada',
    config: state.config,
    question: state.question,
    answer: state.answer,
    result: evaluate(catalog, state.question, state.answer),
  }
}

/** Siguiente pregunta tras verificar, con la misma configuración y sin repetir la forma anterior. */
export function next(catalog: Catalog, state: SessionState, seed: number): SessionState {
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
