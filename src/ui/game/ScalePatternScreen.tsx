import { Fragment, useId, useState } from 'react'
import { scalesDocument } from '../../data'
import type { Degree, ScaleDegree } from '../../data'
import {
  DIFFICULTIES,
  KEY_NAMES,
  PATTERN_NUMBERS,
  SCALE_MARK_BANK,
  evaluateScale,
  isScaleAnswerComplete,
  markedDegrees,
  placedPatternOf,
  scaleOf,
} from '../../session'
import type {
  MarkedNote,
  ScaleAnswer,
  ScaleAttempt,
  ScaleFieldResult,
  ScaleQuestion,
  ScaleQuestionState,
  ScaleSummaryState,
  ScaleVerifiedState,
  SessionAction,
} from '../../session'
import { SCALE_TARGET_DEGREES } from '../../music/scalePatterns'
import { displayDegree, spokenDegree } from '../card/model'
import { ScalePatternCard } from '../card/ScalePatternCard'
import { ScaleMarkBoard } from './ScaleMarkBoard'
import type { MarkStatus } from './ScaleMarkBoard'
import { MINOR_SCALES, capital, patternName } from './scaleText'
import { useGameFocus } from './useGameFocus'

const where = (notes: MarkedNote[]) => notes.map((note) => `cuerda ${note.string}, traste ${note.fret}`).join('; ')
const degreeTitle = (degree: ScaleDegree) => (degree === '1' ? 'Tónicas' : `Grado ${displayDegree(degree)}`)

function marksText(item: Extract<ScaleFieldResult, { field: 'marks' }>): string {
  const parts = [item.expected > 0 ? `${item.hits} de ${item.expected} marcadas.` : 'Este grado no se pide en esta escala.']
  if (item.missing.length) {
    parts.push(
      `Faltan: ${item.missing
        .map((note) => `cuerda ${note.string}, traste ${note.fret}${note.given ? ` (marcaste ${displayDegree(note.given)})` : ''}`)
        .join('; ')}.`,
    )
  }
  if (item.extra.length) parts.push(`Marcadas de más: ${where(item.extra)}.`)
  return parts.join(' ')
}

function headline(fields: ScaleFieldResult[]): string {
  const hits = fields.filter((item) => item.correct).length
  if (hits === fields.length) return 'Acierto completo'
  return hits > 0 ? 'Acierto parcial' : 'Incorrecto'
}

/** Aro de cada nota en la revisión: lo marcado frente a lo que se pedía en ese nivel. */
function markStatus(question: ScaleQuestion, answer: ScaleAnswer): MarkStatus[] {
  const wanted = markedDegrees(question.scaleId, question.difficulty)
  return placedPatternOf(question).notes.map((note, i) => {
    const expected = wanted.includes(note.degree) ? note.degree : null
    const given = answer.marks[i] ?? null
    if (given === null) return expected === null ? null : 'falta'
    return given === expected ? 'ok' : 'ko'
  })
}

function FieldList({ question, fields }: { question: ScaleQuestion; fields: ScaleFieldResult[] }) {
  return (
    <ul className="correccion">
      {fields.map((item) =>
        item.field === 'pattern' ? (
          <li key="pattern" className={item.correct ? 'ok' : 'ko'}>
            <span className="marca" aria-hidden="true">{item.correct ? '✓' : '✗'}</span>
            <span>
              <strong>Patrón: {item.correct ? 'correcto' : 'incorrecto'}.</strong> Tu respuesta: {patternName(question.scaleId, item.given)}.
              {item.correct ? '' : ` Solución: ${patternName(question.scaleId, item.expected)}.`}
            </span>
          </li>
        ) : (
          <li key={`marks-${item.degree}`} className={item.correct ? 'ok' : 'ko'}>
            <span className="marca" aria-hidden="true">{item.correct ? '✓' : '✗'}</span>
            <span>
              <strong>{degreeTitle(item.degree)}: {item.correct ? 'correcto' : 'incorrecto'}.</strong> {marksText(item)}
            </span>
          </li>
        ),
      )}
    </ul>
  )
}

function SolutionCard({ question }: { question: ScaleQuestion }) {
  const placed = placedPatternOf(question)
  const scale = scaleOf(scalesDocument, question.scaleId)
  return (
    <ScalePatternCard
      view="solution"
      notes={placed.notes}
      name={`Patrón ${placed.number}`}
      family={`FORMA ${placed.caged}`}
      targets={SCALE_TARGET_DEGREES[question.scaleId]}
      minor={MINOR_SCALES.has(question.scaleId)}
      label={`${scale.name} de ${KEY_NAMES[question.tonicPc]}, patrón ${placed.number}, forma ${placed.caged}`}
    />
  )
}

/** Revisión final de una sesión de patrones, con lo marcado y la solución de cada pregunta. */
export function ScaleSummaryScreen({ state, dispatch }: { state: ScaleSummaryState; dispatch: (action: SessionAction) => void }) {
  const correct = state.attempts.filter((attempt) => attempt.result?.allCorrect).length
  return (
    <main className="juego resumen-reconocimiento">
      <header className="juego-cabecera">
        <p>Reconocer patrones · revisión del test</p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>Salir al menú</button>
      </header>
      <h1>Revisión del test</h1>
      <p className="resumen-ruta-total">{correct} de {state.attempts.length} respuestas completas. Revisa tus errores pregunta por pregunta.</p>
      <ol className="lista-revision-ruta">
        {state.attempts.map((attempt) => <ScaleAttemptReview key={attempt.question.number} attempt={attempt} />)}
      </ol>
    </main>
  )
}

function ScaleAttemptReview({ attempt }: { attempt: ScaleAttempt }) {
  const { question, answer } = attempt
  const result = attempt.result ?? evaluateScale(question, answer)
  const answered = attempt.result !== null
  const placed = placedPatternOf(question)
  const marking = question.difficulty !== 'easy'
  return (
    <li className={`revision-ruta-item ${answered ? (result.allCorrect ? 'ok' : 'ko') : 'pendiente'}`}>
      <h2>Pregunta {question.number} · tónica {KEY_NAMES[question.tonicPc]}</h2>
      <p className="revision-ruta-estado">
        {answered ? headline(result.fields) : 'Sin verificar'}
        {answered ? ` · ${result.fields.filter((field) => field.correct).length} de ${result.fields.length} campos correctos` : ''}
      </p>
      <FieldList question={question} fields={result.fields} />
      <details className="revision-ruta-detalle">
        <summary>Ver el patrón de la pregunta</summary>
        <div className="revision-ruta-diagramas">
          {marking && (
            <section aria-label={`Tu respuesta en la pregunta ${question.number}`}>
              <h3>Tus marcas</h3>
              <ScaleMarkBoard notes={placed.notes} marks={answer.marks} status={markStatus(question, answer)} />
            </section>
          )}
          <section aria-label={`Solución de la pregunta ${question.number}`}>
            <h3>{capital(patternName(question.scaleId, question.pattern))} · trastes {placed.lowFret}–{placed.highFret}</h3>
            <SolutionCard question={question} />
          </section>
        </div>
      </details>
    </li>
  )
}

const PROMPTS = {
  easy: '¿Qué patrón es?',
  medium: '¿Qué patrón es y dónde están las tónicas?',
  hard: '¿Qué patrón es y dónde están los grados pedidos?',
} as const

const HINTS = {
  easy: 'Elige un patrón para verificar.',
  medium: 'Elige el patrón y marca al menos una tónica para verificar.',
  hard: 'Elige el patrón y marca al menos una nota para verificar.',
} as const

interface ScalePatternScreenProps {
  state: ScaleQuestionState | ScaleVerifiedState
  dispatch: (action: SessionAction) => void
  newSeed: () => number
}

/**
 * Pregunta de «Reconocer patrones». Antes de verificar el patrón se dibuja neutro, con los trastes visibles para
 * poder situar la tónica anunciada; al verificar se recuperan los colores y la corrección campo por campo.
 */
export function ScalePatternScreen({ state, dispatch, newSeed }: ScalePatternScreenProps) {
  const { question, answer } = state
  const verified = state.phase === 'escala-verificada'
  const result = verified ? state.result : null
  const scale = scaleOf(scalesDocument, question.scaleId)
  const placed = placedPatternOf(question)
  const wanted = markedDegrees(question.scaleId, question.difficulty)
  const complete = isScaleAnswerComplete(question.difficulty, answer)
  const [tool, setTool] = useState<ScaleDegree | null>('1')
  const hintId = useId()
  const bankId = useId()
  const { questionHeading, resultHeading, resultPanel } = useGameFocus(question.number, verified)
  const patternResult = result?.fields.find((item) => item.field === 'pattern')
  const difficultyLabel = DIFFICULTIES.find((item) => item.id === question.difficulty)?.label ?? ''
  const key = KEY_NAMES[question.tonicPc]

  const tap = (index: number) => {
    const degree = question.difficulty === 'medium' ? '1' : tool
    dispatch({ type: 'scale-mark', index, degree: answer.marks[index] === degree ? null : degree })
  }

  return (
    <main className="juego juego-escala" data-phase={state.phase}>
      <header className="juego-cabecera">
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>
          Salir
        </button>
        <button className="boton-secundario" type="button" disabled={state.position === 0} onClick={() => dispatch({ type: 'previous' })}>
          Anterior
        </button>
        <p>
          {scale.name} · {difficultyLabel}
          <span className="juego-tonica"><strong>Tónica: {key}</strong></span>
        </p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'finish-test' })}>
          Terminar y revisar
        </button>
      </header>

      <h1 tabIndex={-1} ref={questionHeading}>
        Pregunta {question.number}
      </h1>

      <section className="juego-tarjeta" aria-label="Patrón">
        {verified ? (
          <SolutionCard question={question} />
        ) : question.difficulty === 'easy' ? (
          <ScalePatternCard view="neutral" notes={placed.notes} />
        ) : (
          <ScaleMarkBoard notes={placed.notes} marks={answer.marks} onTap={tap} />
        )}
        <p className="juego-pie">
          {verified
            ? `Solución: ${patternName(question.scaleId, question.pattern)}, trastes ${placed.lowFret}–${placed.highFret}.`
            : `${scale.name} de ${key}. Los números de abajo son los trastes.`}
        </p>
      </section>

      <section className="juego-respuesta" aria-labelledby="respuesta-titulo">
        <h2 id="respuesta-titulo">{PROMPTS[question.difficulty]}</h2>
        <div className="opciones opciones-acorde opciones-patron" role="group" aria-labelledby="respuesta-titulo">
          {PATTERN_NUMBERS.map((number) => {
            const chosen = answer.pattern === number
            const isExpected = verified && patternResult?.expected === number
            const mark = verified ? (chosen ? (patternResult?.correct ? 'ok' : 'ko') : isExpected ? 'ok' : undefined) : undefined
            const note = !verified ? undefined : isExpected ? (chosen ? 'Tu respuesta, correcta' : 'Respuesta correcta') : chosen ? 'Tu respuesta, incorrecta' : undefined
            const noteId = note ? `${hintId}-${number}` : undefined
            const caged = scale.patterns.find((item) => item.number === number)?.caged
            return (
              <Fragment key={number}>
                <button
                  type="button"
                  className={mark}
                  aria-pressed={chosen}
                  aria-describedby={noteId}
                  disabled={verified}
                  onClick={() => dispatch({ type: 'scale-pattern', pattern: number })}
                >
                  <span>
                    Patrón {number}
                    {mark && <span aria-hidden="true"> {mark === 'ok' ? '✓' : '✗'}</span>}
                  </span>
                  <small>forma {caged}</small>
                </button>
                {note && <span className="solo-lectores" id={noteId}>{note}</span>}
              </Fragment>
            )
          })}
        </div>

        {!verified && question.difficulty === 'medium' && (
          <p className="juego-pista">Toca cada nota que sea tónica ({key}). Vuelve a tocarla para quitar la marca.</p>
        )}
        {!verified && question.difficulty === 'hard' && (
          <section className="banco" aria-labelledby={bankId}>
            <h3 id={bankId}>Grado que marcas</h3>
            <div className="fichas" role="group" aria-labelledby={bankId}>
              {SCALE_MARK_BANK.map((degree) => (
                <button
                  key={degree}
                  type="button"
                  className="ficha"
                  aria-pressed={tool === degree}
                  aria-label={`Grado ${spokenDegree(degree as Degree)}`}
                  onClick={() => setTool(degree)}
                >
                  {displayDegree(degree)}
                </button>
              ))}
              <button type="button" className="ficha ficha-borrar" aria-pressed={tool === null} onClick={() => setTool(null)}>
                Borrar
              </button>
            </div>
            <p className="tablero-nota">
              Marca todas las notas que sean {wanted.map((degree) => displayDegree(degree)).join(', ')}. Elige un grado y toca las
              notas; tócalas otra vez o usa Borrar para quitar la marca.
            </p>
          </section>
        )}

        {!verified && (
          <>
            <button
              className="boton-principal"
              type="button"
              disabled={!complete}
              aria-describedby={complete ? undefined : hintId}
              onClick={() => dispatch({ type: 'verify' })}
            >
              Verificar
            </button>
            {!complete && (
              <p className="juego-pista" id={hintId}>
                {HINTS[question.difficulty]}
              </p>
            )}
          </>
        )}
      </section>

      {result && (
        <section className="resultado" aria-labelledby="resultado-titulo" ref={resultPanel}>
          <h2 id="resultado-titulo" tabIndex={-1} ref={resultHeading}>
            {headline(result.fields)}
          </h2>
          {result.fields.length > 1 && (
            <p className="resumen">
              {result.fields.filter((item) => item.correct).length} de {result.fields.length} campos correctos.
            </p>
          )}
          <FieldList question={question} fields={result.fields} />
          {question.difficulty !== 'easy' && (
            <section className="tus-marcas" aria-label="Tus marcas">
              <h3>Tus marcas</h3>
              <ScaleMarkBoard notes={placed.notes} marks={answer.marks} status={markStatus(question, answer)} />
              <p className="tablero-nota">Aro verde: bien marcada. Rojo: marca errónea. Discontinuo: faltaba marcarla.</p>
            </section>
          )}
          <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'next', seed: newSeed() })}>
            Siguiente
          </button>
        </section>
      )}
    </main>
  )
}
