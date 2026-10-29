// Estados y transiciones de los dos juegos de escalas. Mismo modelo que reconocimiento: historial de preguntas,
// verificación única, Anterior y Siguiente sobre lo visitado y resumen al terminar.
import { scalesDocument } from '../data'
import type { PatternNumber, ScaleDegree, ScalesDocument } from '../data/types'
import type { GameConfig } from './config'
import { createRng } from './rng'
import { createOrderQuestion, emptyOrderAnswer, evaluateOrder, isOrderComplete, pickCard } from './scaleOrder'
import type { OrderAnswer, OrderQuestion, OrderResult } from './scaleOrder'
import { createScaleQuestion, emptyScaleAnswer, evaluateScale, isScaleAnswerComplete, markNote } from './scales'
import type { ScaleAnswer, ScaleQuestion, ScaleResult } from './scales'

export interface ScaleAttempt {
  readonly question: ScaleQuestion
  readonly answer: ScaleAnswer
  readonly result: ScaleResult | null
}

export interface ScaleQuestionState {
  readonly phase: 'escala'
  readonly config: GameConfig
  readonly question: ScaleQuestion
  readonly answer: ScaleAnswer
  readonly attempts: readonly ScaleAttempt[]
  readonly position: number
}

export interface ScaleVerifiedState {
  readonly phase: 'escala-verificada'
  readonly config: GameConfig
  readonly question: ScaleQuestion
  readonly answer: ScaleAnswer
  readonly result: ScaleResult
  readonly attempts: readonly ScaleAttempt[]
  readonly position: number
}

export interface ScaleSummaryState {
  readonly phase: 'escala-resumen'
  readonly config: GameConfig
  readonly attempts: readonly ScaleAttempt[]
}

export interface OrderAttempt {
  readonly question: OrderQuestion
  readonly answer: OrderAnswer
  readonly result: OrderResult | null
}

export interface OrderQuestionState {
  readonly phase: 'orden'
  readonly config: GameConfig
  readonly question: OrderQuestion
  readonly answer: OrderAnswer
  readonly attempts: readonly OrderAttempt[]
  readonly position: number
}

export interface OrderVerifiedState {
  readonly phase: 'orden-verificada'
  readonly config: GameConfig
  readonly question: OrderQuestion
  readonly answer: OrderAnswer
  readonly result: OrderResult
  readonly attempts: readonly OrderAttempt[]
  readonly position: number
}

export interface OrderSummaryState {
  readonly phase: 'orden-resumen'
  readonly config: GameConfig
  readonly attempts: readonly OrderAttempt[]
}

export type ScaleGameState = ScaleQuestionState | ScaleVerifiedState | OrderQuestionState | OrderVerifiedState

/** Primera pregunta del juego de escalas elegido en el menú. */
export function startScaleGame(config: GameConfig, seed: number, document: ScalesDocument = scalesDocument): ScaleQuestionState | OrderQuestionState {
  const rng = createRng(seed)
  if (config.game === 'scale-order') {
    const question = createOrderQuestion(config, rng, undefined, document)
    const answer = emptyOrderAnswer()
    return { phase: 'orden', config, question, answer, attempts: [{ question, answer, result: null }], position: 0 }
  }
  const question = createScaleQuestion(config, rng)
  const answer = emptyScaleAnswer(question, document)
  return { phase: 'escala', config, question, answer, attempts: [{ question, answer, result: null }], position: 0 }
}

const replaceAt = <T>(items: readonly T[], position: number, item: T): T[] => items.map((current, i) => (i === position ? item : current))

export function chooseScalePattern(state: ScaleQuestionState, pattern: PatternNumber | null): ScaleQuestionState {
  if (state.answer.pattern === pattern) return state
  const answer = { ...state.answer, pattern }
  return { ...state, answer, attempts: replaceAt(state.attempts, state.position, { question: state.question, answer, result: null }) }
}

export function markScaleNote(state: ScaleQuestionState, index: number, degree: ScaleDegree | null): ScaleQuestionState {
  const answer = markNote(state.question, state.answer, index, degree)
  if (answer === state.answer) return state
  return { ...state, answer, attempts: replaceAt(state.attempts, state.position, { question: state.question, answer, result: null }) }
}

export function pickOrderCard(state: OrderQuestionState, card: number): OrderQuestionState {
  const answer = pickCard(state.answer, card)
  if (answer === state.answer) return state
  return { ...state, answer, attempts: replaceAt(state.attempts, state.position, { question: state.question, answer, result: null }) }
}

export function resetOrder(state: OrderQuestionState): OrderQuestionState {
  if (state.answer.sequence.length === 0) return state
  const answer = emptyOrderAnswer()
  return { ...state, answer, attempts: replaceAt(state.attempts, state.position, { question: state.question, answer, result: null }) }
}

/** Verifica una respuesta completa una sola vez. */
export function verifyScaleGame(state: ScaleGameState, document: ScalesDocument = scalesDocument): ScaleGameState {
  if (state.phase === 'escala') {
    if (!isScaleAnswerComplete(state.question.difficulty, state.answer)) return state
    const result = evaluateScale(state.question, state.answer, document)
    const attempts = replaceAt(state.attempts, state.position, { question: state.question, answer: state.answer, result })
    return { ...state, phase: 'escala-verificada', result, attempts }
  }
  if (state.phase === 'orden') {
    if (!isOrderComplete(state.answer)) return state
    const result = evaluateOrder(state.question, state.answer, document)
    const attempts = replaceAt(state.attempts, state.position, { question: state.question, answer: state.answer, result })
    return { ...state, phase: 'orden-verificada', result, attempts }
  }
  return state
}

function restoreScale(config: GameConfig, attempts: readonly ScaleAttempt[], position: number): ScaleQuestionState | ScaleVerifiedState {
  const { question, answer, result } = attempts[position]!
  const common = { config, question, answer, attempts, position }
  return result ? { phase: 'escala-verificada', ...common, result } : { phase: 'escala', ...common }
}

function restoreOrder(config: GameConfig, attempts: readonly OrderAttempt[], position: number): OrderQuestionState | OrderVerifiedState {
  const { question, answer, result } = attempts[position]!
  const common = { config, question, answer, attempts, position }
  return result ? { phase: 'orden-verificada', ...common, result } : { phase: 'orden', ...common }
}

/** Siguiente tras verificar: recorre lo ya visitado y, al final, crea otra pregunta. */
export function nextScaleGame(state: ScaleGameState, seed: number, document: ScalesDocument = scalesDocument): ScaleGameState {
  if (state.phase === 'escala-verificada') {
    if (state.position < state.attempts.length - 1) return restoreScale(state.config, state.attempts, state.position + 1)
    const question = createScaleQuestion(state.config, createRng(seed), state.question)
    const answer = emptyScaleAnswer(question, document)
    const attempts = [...state.attempts, { question, answer, result: null }]
    return { phase: 'escala', config: state.config, question, answer, attempts, position: attempts.length - 1 }
  }
  if (state.phase === 'orden-verificada') {
    if (state.position < state.attempts.length - 1) return restoreOrder(state.config, state.attempts, state.position + 1)
    const question = createOrderQuestion(state.config, createRng(seed), state.question, document)
    const answer = emptyOrderAnswer()
    const attempts = [...state.attempts, { question, answer, result: null }]
    return { phase: 'orden', config: state.config, question, answer, attempts, position: attempts.length - 1 }
  }
  return state
}

/** Vuelve a la pregunta anterior con su respuesta y su corrección. */
export function previousScaleGame(state: ScaleGameState): ScaleGameState {
  if (state.position === 0) return state
  return state.phase === 'escala' || state.phase === 'escala-verificada'
    ? restoreScale(state.config, state.attempts, state.position - 1)
    : restoreOrder(state.config, state.attempts, state.position - 1)
}

/** Termina en la pregunta actual y pasa a la revisión, con las preguntas sin verificar incluidas. */
export function finishScaleGame(state: ScaleGameState): ScaleSummaryState | OrderSummaryState {
  return state.phase === 'escala' || state.phase === 'escala-verificada'
    ? { phase: 'escala-resumen', config: state.config, attempts: state.attempts }
    : { phase: 'orden-resumen', config: state.config, attempts: state.attempts }
}
