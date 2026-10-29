import { scalesDocument } from '../data'
import type { PatternNumber, ScaleId, ScalesDocument } from '../data/types'
import { neckOrder, patternsInKey } from '../music/scalePatterns'
import type { PlacedPattern } from '../music/scalePatterns'
import type { GameConfig } from './config'
import { PATTERN_NUMBERS, keysOf, scaleOf } from './scales'
import { pickOne, shuffle } from './rng'
import type { Rng } from './rng'

/** Pregunta de ordenar: los cinco patrones de una escala en una tonalidad, barajados. */
export interface OrderQuestion {
  number: number
  scaleId: ScaleId
  tonicPc: number
  /** Patrón de cada tarjeta, en el orden en que se muestran (A, B, C, D y E). */
  cards: PatternNumber[]
  /** Tonalidades ya preguntadas en la ronda. Solo vive en la sesión. */
  roundKeys: readonly number[]
}

/** Los cinco patrones colocados en la tonalidad de la pregunta, en el orden de las tarjetas. */
export function orderCardsOf(question: Pick<OrderQuestion, 'scaleId' | 'tonicPc' | 'cards'>, document: ScalesDocument = scalesDocument): PlacedPattern[] {
  const placed = patternsInKey(scaleOf(document, question.scaleId), question.tonicPc, document.tonicPc)
  return question.cards.map((number) => placed.find((pattern) => pattern.number === number)!)
}

/** Orden correcto de grave a agudo en la tonalidad de la pregunta. */
export function expectedOrder(question: Pick<OrderQuestion, 'scaleId' | 'tonicPc'>, document: ScalesDocument = scalesDocument): PatternNumber[] {
  return neckOrder(patternsInKey(scaleOf(document, question.scaleId), question.tonicPc, document.tonicPc)).map((pattern) => pattern.number)
}

/**
 * Baraja las cinco tarjetas sin dejarlas ya ordenadas. Con tonalidad aleatoria agota las doce antes de repetir
 * y no repite la última al empezar otra ronda.
 */
export function createOrderQuestion(
  config: Pick<GameConfig, 'scaleId' | 'scaleKey'>,
  rng: Rng,
  previous?: Pick<OrderQuestion, 'number' | 'scaleId' | 'tonicPc' | 'roundKeys'>,
  document: ScalesDocument = scalesDocument,
): OrderQuestion {
  const pool = keysOf(config.scaleKey)
  const played = previous?.scaleId === config.scaleId ? previous.roundKeys : []
  const pending = pool.filter((key) => !played.includes(key))
  const alternatives = pending.length > 0 ? pending : pool.filter((key) => key !== previous?.tonicPc)
  const tonicPc = pickOne(alternatives.length > 0 ? alternatives : pool, rng)
  const solution = expectedOrder({ scaleId: config.scaleId, tonicPc }, document)
  let cards = shuffle(PATTERN_NUMBERS, rng)
  while (cards.every((number, i) => number === solution[i])) cards = shuffle(PATTERN_NUMBERS, rng)
  return {
    number: (previous?.number ?? 0) + 1,
    scaleId: config.scaleId,
    tonicPc,
    cards,
    roundKeys: pending.length > 0 ? [...played, tonicPc] : [tonicPc],
  }
}

/** Respuesta: índices de tarjeta (0 a 4) en el orden elegido, de la más grave a la más aguda. */
export interface OrderAnswer {
  sequence: readonly number[]
}

export const emptyOrderAnswer = (): OrderAnswer => ({ sequence: [] })

/** Añade la tarjeta al final del orden o, si ya estaba, la quita y corre las siguientes. */
export function pickCard(answer: OrderAnswer, card: number): OrderAnswer {
  if (!Number.isInteger(card) || card < 0 || card >= PATTERN_NUMBERS.length) return answer
  return answer.sequence.includes(card)
    ? { sequence: answer.sequence.filter((item) => item !== card) }
    : { sequence: [...answer.sequence, card] }
}

export const isOrderComplete = (answer: OrderAnswer) => answer.sequence.length === PATTERN_NUMBERS.length

export interface OrderPlaceResult {
  /** Puesto, desde 1 (el más grave). */
  place: number
  given: PatternNumber | null
  expected: PatternNumber
  correct: boolean
}

export interface OrderResult {
  places: OrderPlaceResult[]
  allCorrect: boolean
}

/** Corrige puesto a puesto contra el orden de grave a agudo de esa tonalidad. */
export function evaluateOrder(question: OrderQuestion, answer: OrderAnswer, document: ScalesDocument = scalesDocument): OrderResult {
  const places = expectedOrder(question, document).map((expected, i) => {
    const card = answer.sequence[i]
    const given = card === undefined ? null : (question.cards[card] ?? null)
    return { place: i + 1, given, expected, correct: given === expected }
  })
  return { places, allCorrect: places.every((item) => item.correct) }
}
