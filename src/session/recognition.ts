import type { Catalog, Degree, Inversion, QualityKey, SetId, StringNumber, Voicing } from '../data/types'
import { inversionFromBass } from '../music/pitch'
import type { Difficulty, GameConfig } from './config'
import { newSlots } from './degrees'
import { pickOne, shuffle } from './rng'
import type { Rng } from './rng'

/** Orden de presentación de las calidades evaluables (R03). */
const QUALITY_ORDER: readonly QualityKey[] = ['maj7', '7', 'm7', 'm7b5']

/** Calidades que se ofrecen como respuesta: las evaluables del catálogo. Cdim7 queda como referencia. */
export function answerQualities(catalog: Catalog): QualityKey[] {
  return QUALITY_ORDER.filter((key) => catalog.qualities[key]?.quizEnabled !== false)
}

/** Formas evaluables de un set: 16 (cuatro calidades por cuatro inversiones). */
export function questionPool(catalog: Catalog, setId: SetId): Voicing[] {
  return catalog.voicings.filter((voicing) => voicing.quizEnabled && voicing.setId === setId)
}

/**
 * Una pregunta de reconocimiento. Identifica la forma del catálogo por su id y fija el orden de las
 * opciones de calidad. No lleva la solución como texto aparte: la solución es la propia forma.
 */
export interface RecognitionQuestion {
  /** Número de pregunta dentro de la sesión, desde 1. */
  number: number
  voicingId: string
  setId: SetId
  difficulty: Difficulty
  /** Orden de los botones de acorde en fácil: una permutación de las calidades evaluables. */
  qualityOrder: QualityKey[]
  /** Formas ya mostradas en la ronda actual. Solo vive en la sesión, nunca en el progreso guardado. */
  roundVoicingIds: readonly string[]
}

export function voicingOf(catalog: Catalog, question: Pick<RecognitionQuestion, 'voicingId'>): Voicing {
  const voicing = catalog.voicings.find((item) => item.id === question.voicingId)
  if (!voicing) throw new Error(`Forma desconocida: ${question.voicingId}`)
  return voicing
}

/**
 * Sortea entre las formas pendientes, todas con el mismo peso. Agota el set antes de iniciar otra ronda
 * y evita repetir la última forma al cruzar de ronda, salvo que solo exista una.
 */
export function createQuestion(
  catalog: Catalog,
  config: GameConfig,
  rng: Rng,
  previous?: Pick<RecognitionQuestion, 'number' | 'voicingId' | 'setId' | 'roundVoicingIds'>,
): RecognitionQuestion {
  const pool = questionPool(catalog, config.setId)
  if (pool.length === 0) throw new Error(`No hay formas evaluables en ${config.setId}`)
  const played = previous?.setId === config.setId ? previous.roundVoicingIds : []
  const pending = pool.filter((voicing) => !played.includes(voicing.id))
  const alternatives = pending.length > 0 ? pending : pool.filter((voicing) => voicing.id !== previous?.voicingId)
  const voicing = pickOne(alternatives.length > 0 ? alternatives : pool, rng)
  return {
    number: (previous?.number ?? 0) + 1,
    voicingId: voicing.id,
    setId: config.setId,
    difficulty: config.difficulty,
    qualityOrder: shuffle(answerQualities(catalog), rng),
    roundVoicingIds: pending.length > 0 ? [...played, voicing.id] : [voicing.id],
  }
}

/** Lo que ha contestado el usuario. Un campo vacío es null. */
export interface RecognitionAnswer {
  quality: QualityKey | null
  inversion: Inversion | null
  /** Grado colocado en cada destino, en el orden de las notas de la forma. Solo se usa en difícil. */
  degrees: readonly (Degree | null)[]
}

export const emptyAnswer = (): RecognitionAnswer => ({ quality: null, inversion: null, degrees: newSlots() })

export type AnswerField = 'quality' | 'inversion' | 'degrees'

/** Campos que exige cada nivel: fácil, el acorde; medio, acorde e inversión; difícil, además los cuatro grados. */
export function requiredFields(difficulty: Difficulty): AnswerField[] {
  if (difficulty === 'easy') return ['quality']
  return difficulty === 'medium' ? ['quality', 'inversion'] : ['quality', 'inversion', 'degrees']
}

export function isAnswerComplete(difficulty: Difficulty, answer: RecognitionAnswer): boolean {
  return requiredFields(difficulty).every((field) =>
    field === 'degrees' ? answer.degrees.length > 0 && answer.degrees.every((degree) => degree !== null) : answer[field] !== null,
  )
}

export type FieldResult =
  | { field: 'quality'; given: QualityKey | null; expected: QualityKey; correct: boolean }
  | { field: 'inversion'; given: Inversion | null; expected: Inversion; correct: boolean }
  | {
      field: 'degree'
      /** Destino: la nota de la forma en ese orden, con su cuerda y traste. */
      slot: number
      string: StringNumber
      fret: number
      given: Degree | null
      expected: Degree
      correct: boolean
    }

export interface RecognitionResult {
  /** Un resultado por cada campo del nivel, en el orden de la respuesta. */
  fields: FieldResult[]
  /** Acierto completo: todos los campos del nivel son correctos. */
  allCorrect: boolean
}

/**
 * Corrige por campos. La inversión esperada sale del bajo físico de la forma, no de la etiqueta que
 * lleve el dato ni del orden de sus notas.
 */
export function evaluate(catalog: Catalog, question: Pick<RecognitionQuestion, 'voicingId' | 'difficulty'>, answer: RecognitionAnswer): RecognitionResult {
  const voicing = voicingOf(catalog, question)
  const inversion = inversionFromBass(voicing, catalog)
  if (inversion === null) throw new Error(`El bajo de ${voicing.id} no es una nota del acorde`)
  const fields: FieldResult[] = requiredFields(question.difficulty).flatMap((field): FieldResult[] => {
    if (field === 'quality') {
      return [{ field, given: answer.quality, expected: voicing.quality, correct: answer.quality === voicing.quality }]
    }
    if (field === 'inversion') {
      return [{ field, given: answer.inversion, expected: inversion, correct: answer.inversion === inversion }]
    }
    // Un resultado por destino: los aciertos parciales se conservan y el grado se compara tal cual (b3 no es 3).
    return voicing.notes.map((note, slot) => {
      const given = answer.degrees[slot] ?? null
      return { field: 'degree', slot, string: note.string, fret: note.fret, given, expected: note.degree, correct: given === note.degree }
    })
  })
  return { fields, allCorrect: fields.every((item) => item.correct) }
}
