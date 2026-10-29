import { scalesDocument } from '../data'
import type { PatternNumber, ScaleDefinition, ScaleDegree, ScaleId, ScalesDocument, StringNumber } from '../data/types'
import { SCALE_TARGET_DEGREES, patternInKey } from '../music/scalePatterns'
import type { PlacedPattern } from '../music/scalePatterns'
import type { Difficulty, GameConfig, ScaleKey } from './config'
import { pickOne } from './rng'
import type { Rng } from './rng'

export const PATTERN_NUMBERS: readonly PatternNumber[] = [1, 2, 3, 4, 5]

/**
 * Banco fijo de Difícil, igual en las cuatro escalas: incluye las dos terceras y las tres posibles
 * séptimas o sexta, de modo que ofrecer solo los grados de la escala no delate la respuesta.
 */
export const SCALE_MARK_BANK: readonly ScaleDegree[] = ['1', 'b3', '3', '5', '6', 'b7', '7']

export function scaleOf(document: ScalesDocument, scaleId: ScaleId): ScaleDefinition {
  const scale = document.scales.find((item) => item.id === scaleId)
  if (!scale) throw new Error(`Escala desconocida: ${scaleId}`)
  return scale
}

/** Tonalidades posibles de una configuración: la elegida o las doce. */
export function keysOf(scaleKey: ScaleKey): number[] {
  return scaleKey === 'random' ? Array.from({ length: 12 }, (_, pc) => pc) : [scaleKey]
}

/** Grados que se marcan en cada nivel: ninguno en Fácil, las tónicas en Medio y 1-3-5-7 (o 6) en Difícil. */
export function markedDegrees(scaleId: ScaleId, difficulty: Difficulty): readonly ScaleDegree[] {
  if (difficulty === 'easy') return []
  return difficulty === 'medium' ? ['1'] : SCALE_TARGET_DEGREES[scaleId]
}

/** Pregunta de patrón: identifica escala, tonalidad y patrón. La solución es el propio patrón de los datos. */
export interface ScaleQuestion {
  number: number
  scaleId: ScaleId
  tonicPc: number
  difficulty: Difficulty
  pattern: PatternNumber
  /** Combinaciones de tonalidad y patrón ya mostradas en la ronda. Solo vive en la sesión. */
  roundIds: readonly string[]
}

const questionId = (tonicPc: number, pattern: PatternNumber) => `${tonicPc}:${pattern}`

export function placedPatternOf(
  question: Pick<ScaleQuestion, 'scaleId' | 'tonicPc' | 'pattern'>,
  document: ScalesDocument = scalesDocument,
): PlacedPattern {
  const scale = scaleOf(document, question.scaleId)
  const pattern = scale.patterns.find((item) => item.number === question.pattern)
  if (!pattern) throw new Error(`Patrón desconocido: ${question.scaleId} ${question.pattern}`)
  return patternInKey(pattern, question.tonicPc, document.tonicPc)
}

/**
 * Sortea con el mismo peso entre las combinaciones pendientes de la ronda (cinco patrones en una tonalidad, o
 * sesenta con tonalidad aleatoria). Al agotarlas empieza otra ronda sin repetir la última pregunta.
 */
export function createScaleQuestion(
  config: Pick<GameConfig, 'scaleId' | 'scaleKey' | 'difficulty'>,
  rng: Rng,
  previous?: Pick<ScaleQuestion, 'number' | 'scaleId' | 'tonicPc' | 'pattern' | 'roundIds'>,
): ScaleQuestion {
  const pool = keysOf(config.scaleKey).flatMap((tonicPc) => PATTERN_NUMBERS.map((pattern) => ({ tonicPc, pattern })))
  const played = previous?.scaleId === config.scaleId ? previous.roundIds : []
  const pending = pool.filter((item) => !played.includes(questionId(item.tonicPc, item.pattern)))
  const last = previous ? questionId(previous.tonicPc, previous.pattern) : null
  const alternatives = pending.length > 0 ? pending : pool.filter((item) => questionId(item.tonicPc, item.pattern) !== last)
  const choice = pickOne(alternatives.length > 0 ? alternatives : pool, rng)
  const id = questionId(choice.tonicPc, choice.pattern)
  return {
    number: (previous?.number ?? 0) + 1,
    scaleId: config.scaleId,
    tonicPc: choice.tonicPc,
    difficulty: config.difficulty,
    pattern: choice.pattern,
    roundIds: pending.length > 0 ? [...played, id] : [id],
  }
}

/** Respuesta: el patrón elegido y la marca de cada nota, en el orden de las notas del patrón. */
export interface ScaleAnswer {
  pattern: PatternNumber | null
  marks: readonly (ScaleDegree | null)[]
}

export function emptyScaleAnswer(question: Pick<ScaleQuestion, 'scaleId' | 'tonicPc' | 'pattern'>, document: ScalesDocument = scalesDocument): ScaleAnswer {
  return { pattern: null, marks: placedPatternOf(question, document).notes.map(() => null) }
}

/** Fácil exige el patrón; Medio y Difícil, además, al menos una nota marcada. */
export function isScaleAnswerComplete(difficulty: Difficulty, answer: ScaleAnswer): boolean {
  if (answer.pattern === null) return false
  return difficulty === 'easy' || answer.marks.some((mark) => mark !== null)
}

/** Marca o desmarca una nota. Solo admite grados del nivel: la tónica en Medio y el banco fijo en Difícil. */
export function markNote(question: ScaleQuestion, answer: ScaleAnswer, index: number, degree: ScaleDegree | null): ScaleAnswer {
  if (question.difficulty === 'easy' || !Number.isInteger(index) || index < 0 || index >= answer.marks.length) return answer
  const allowed = question.difficulty === 'medium' ? ['1'] : SCALE_MARK_BANK
  if (degree !== null && !allowed.includes(degree)) return answer
  if (answer.marks[index] === degree) return answer
  return { ...answer, marks: answer.marks.map((mark, i) => (i === index ? degree : mark)) }
}

export interface MarkedNote {
  index: number
  string: StringNumber
  fret: number
  /** Lo que se marcó en esa nota (null si nada). */
  given: ScaleDegree | null
}

export type ScaleFieldResult =
  | { field: 'pattern'; given: PatternNumber | null; expected: PatternNumber; correct: boolean }
  | {
      field: 'marks'
      degree: ScaleDegree
      /** Notas que llevan ese grado y había que marcar. */
      expected: number
      hits: number
      /** Notas de ese grado sin marcar o marcadas con otro grado. */
      missing: MarkedNote[]
      /** Notas marcadas con ese grado que no lo son. */
      extra: MarkedNote[]
      correct: boolean
    }

export interface ScaleResult {
  fields: ScaleFieldResult[]
  allCorrect: boolean
}

/**
 * Corrige por campos: el patrón y, en Medio y Difícil, cada grado pedido por separado. Una nota se compara con el
 * grado que tiene en el patrón: si es uno de los pedidos debe llevar esa marca y, si no, ninguna. Un grado del
 * banco que no se pide (por ejemplo 3 en una escala menor) solo aparece si se usó, y siempre como error.
 */
export function evaluateScale(question: ScaleQuestion, answer: ScaleAnswer, document: ScalesDocument = scalesDocument): ScaleResult {
  const placed = placedPatternOf(question, document)
  const wanted = markedDegrees(question.scaleId, question.difficulty)
  const fields: ScaleFieldResult[] = [
    { field: 'pattern', given: answer.pattern, expected: question.pattern, correct: answer.pattern === question.pattern },
  ]
  if (wanted.length > 0) {
    const notes = placed.notes.map((note, index): MarkedNote & { expected: ScaleDegree | null } => ({
      index,
      string: note.string,
      fret: note.fret,
      given: answer.marks[index] ?? null,
      expected: wanted.includes(note.degree) ? note.degree : null,
    }))
    const used = notes.flatMap((note) => (note.given && !wanted.includes(note.given) ? [note.given] : []))
    const degrees = [...wanted, ...SCALE_MARK_BANK.filter((degree) => used.includes(degree))]
    const plain = ({ index, string, fret, given }: MarkedNote): MarkedNote => ({ index, string, fret, given })
    for (const degree of degrees) {
      const own = notes.filter((note) => note.expected === degree)
      const missing = own.filter((note) => note.given !== degree).map(plain)
      const extra = notes.filter((note) => note.given === degree && note.expected !== degree).map(plain)
      fields.push({
        field: 'marks', degree, expected: own.length, hits: own.length - missing.length, missing, extra,
        correct: missing.length === 0 && extra.length === 0,
      })
    }
  }
  return { fields, allCorrect: fields.every((item) => item.correct) }
}
