import { Fragment, useId } from 'react'
import { catalog } from '../../data'
import type { Degree, Inversion, QualityKey } from '../../data'
import { tonicReading } from '../../music/tonicReading'
import { DIFFICULTIES, DROP_LABELS, answerQualities, answerQualityLabel, evaluate, isAnswerComplete, voicingOf } from '../../session'
import type { FieldResult, QuestionState, RecognitionAttempt, RecognitionSummaryState, SessionAction, VerifiedState } from '../../session'
import { FretboardCard } from '../card/FretboardCard'
import { displayDegree, toPosition, toSolution } from '../card/model'
import { DegreeBoard } from './DegreeBoard'
import { useGameFocus } from './useGameFocus'

const INVERSIONS: Inversion[] = [0, 1, 2, 3]
const qualityName = (quality: QualityKey | null) => (quality ? answerQualityLabel(catalog, quality) : 'sin respuesta')
const inversionName = (inversion: Inversion | null) =>
  inversion === null ? 'sin respuesta' : (catalog.inversions[inversion] ?? 'sin respuesta')

interface RecognitionScreenProps {
  state: QuestionState | VerifiedState
  dispatch: (action: SessionAction) => void
  /** Semilla de la siguiente pregunta. La aplicación la saca del navegador. */
  newSeed: () => number
}

const degreeName = (degree: Degree | null) => (degree ? displayDegree(degree) : 'sin respuesta')

function fieldText(item: FieldResult): { name: string; given: string; expected: string } {
  if (item.field === 'quality') return { name: 'Acorde', given: qualityName(item.given), expected: qualityName(item.expected) }
  if (item.field === 'inversion') return { name: 'Inversión', given: inversionName(item.given), expected: inversionName(item.expected) }
  return {
    name: `Círculo ${item.slot + 1} (cuerda ${item.string}, traste ${item.fret})`,
    given: degreeName(item.given),
    expected: degreeName(item.expected),
  }
}

function headline(fields: FieldResult[]): string {
  const hits = fields.filter((item) => item.correct).length
  if (hits === fields.length) return 'Acierto completo'
  return hits > 0 ? 'Acierto parcial' : 'Incorrecto'
}

/** Resumen final del reconocimiento, con el detalle de cada campo que falló. */
export function RecognitionSummaryScreen({ state, dispatch }: { state: RecognitionSummaryState; dispatch: (action: SessionAction) => void }) {
  const correct = state.attempts.filter((attempt) => attempt.result?.allCorrect).length
  return (
    <main className="juego resumen-reconocimiento">
      <header className="juego-cabecera">
        <p>Reconocer voicings · revisión del test</p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>Salir al menú</button>
      </header>
      <h1>Revisión del test</h1>
      <p className="resumen-ruta-total">{correct} de {state.attempts.length} respuestas completas. Revisa tus errores pregunta por pregunta.</p>
      <ol className="lista-revision-ruta">
        {state.attempts.map((attempt) => <RecognitionAttemptReview key={attempt.question.number} attempt={attempt} />)}
      </ol>
    </main>
  )
}

function RecognitionAttemptReview({ attempt }: { attempt: RecognitionAttempt }) {
  const voicing = voicingOf(catalog, attempt.question)
  const result = attempt.result ?? evaluate(catalog, attempt.question, attempt.answer)
  const answered = attempt.result !== null
  const status = answered ? headline(result.fields) : 'Sin verificar'
  const solution = toSolution(voicing, catalog)
  return (
    <li className={`revision-ruta-item ${answered ? result.allCorrect ? 'ok' : 'ko' : 'pendiente'}`}>
      <h2>Pregunta {attempt.question.number}</h2>
      <p className="revision-ruta-estado">{status}{answered ? ` · ${result.fields.filter((field) => field.correct).length} de ${result.fields.length} campos correctos` : ''}</p>
      <ul className="correccion">
        {result.fields.map((field) => {
          const text = fieldText(field)
          return (
            <li key={field.field === 'degree' ? `degree-${field.slot}` : field.field} className={field.correct ? 'ok' : 'ko'}>
              <span className="marca" aria-hidden="true">{field.correct ? '✓' : '✗'}</span>
              <span><strong>{text.name}:</strong> tu respuesta: {text.given}; solución: {text.expected}.</span>
            </li>
          )
        })}
      </ul>
      <details className="revision-ruta-detalle">
        <summary>Ver voicing de la pregunta</summary>
        <div className="revision-ruta-diagramas">
          <section aria-label={`Solución de la pregunta ${attempt.question.number}`}>
            <h3>{solution.name} · {solution.inversionLabel}</h3>
            <FretboardCard view="solution" position={toPosition(voicing, catalog)} solution={solution} />
          </section>
        </div>
      </details>
    </li>
  )
}

const PROMPTS = {
  easy: '¿Qué acorde es?',
  medium: '¿Qué acorde e inversión es?',
  hard: '¿Qué acorde, inversión y grados son?',
} as const

const HINTS = {
  easy: 'Elige un acorde para verificar.',
  medium: 'Elige acorde e inversión para verificar.',
  hard: 'Elige acorde e inversión y coloca los cuatro grados para verificar.',
} as const

/**
 * Pantalla de una pregunta de reconocimiento (R02 a R10). Antes de verificar la tarjeta es neutra y solo
 * recibe posiciones; al verificar muestra la solución con sus colores y la corrección campo por campo.
 */
export function RecognitionScreen({ state, dispatch, newSeed }: RecognitionScreenProps) {
  const { question, answer, config } = state
  const verified = state.phase === 'verificada'
  const result = verified ? state.result : null
  const voicing = voicingOf(catalog, question)
  const position = toPosition(voicing, catalog)
  const solution = verified ? toSolution(voicing, catalog) : null
  const reading = verified ? tonicReading(voicing, catalog) : null
  const set = catalog.sets.find((item) => item.id === question.setId)
  const complete = isAnswerComplete(question.difficulty, answer)
  const hintId = useId()
  const { questionHeading, resultHeading, resultPanel } = useGameFocus(question.number, verified)

  const qualityResult = result?.fields.find((item) => item.field === 'quality')
  const difficultyLabel = DIFFICULTIES.find((item) => item.id === config.difficulty)?.label ?? ''

  return (
    <main className="juego" data-phase={state.phase}>
      <header className="juego-cabecera">
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'exit' })}>
          Salir
        </button>
        <button className="boton-secundario" type="button" disabled={state.position === 0} onClick={() => dispatch({ type: 'previous' })}>
          Anterior
        </button>
        <p>
          {DROP_LABELS[config.drop]} · set {set?.number} · {difficultyLabel}
          <span className="juego-tonica"><strong>Tónica: {voicing.root}</strong></span>
        </p>
        <button className="boton-secundario" type="button" onClick={() => dispatch({ type: 'finish-test' })}>
          Terminar y revisar
        </button>
      </header>

      <h1 tabIndex={-1} ref={questionHeading}>
        Pregunta {question.number}
      </h1>

      <section className="juego-tarjeta" aria-label="Posición">
        {solution ? (
          <FretboardCard view="solution" position={position} solution={solution} />
        ) : question.difficulty === 'hard' && state.phase === 'pregunta' ? (
          <DegreeBoard
            position={position}
            slots={answer.degrees}
            held={state.held}
            onAction={(action) => dispatch({ type: 'degree', action })}
          />
        ) : (
          <FretboardCard view="neutral" position={position} />
        )}
        <p className="juego-pie">
          {solution
            ? `Solución: ${solution.name}, ${solution.inversionLabel} (bajo: ${displayDegree(solution.bass)}).`
            : `Cuerdas del set: ${set?.strings.join('-')}.`}
        </p>
      </section>

      <section className="juego-respuesta" aria-labelledby="respuesta-titulo">
        <h2 id="respuesta-titulo">{PROMPTS[question.difficulty]}</h2>

        {question.difficulty === 'easy' ? (
          <div className="opciones opciones-acorde" role="group" aria-labelledby="respuesta-titulo">
            {question.qualityOrder.map((quality) => {
              const chosen = answer.quality === quality
              // Tras verificar: el elegido en verde o rojo y, si falló, también el correcto en verde.
              const isExpected = verified && qualityResult?.expected === quality
              const mark = verified ? (chosen ? (qualityResult?.correct ? 'ok' : 'ko') : isExpected ? 'ok' : undefined) : undefined
              const note = !verified
                ? undefined
                : isExpected
                  ? chosen
                    ? 'Tu respuesta, correcta'
                    : 'Respuesta correcta'
                  : chosen
                    ? 'Tu respuesta, incorrecta'
                    : undefined
              const noteId = note ? `${hintId}-${quality}` : undefined
              return (
                <Fragment key={quality}>
                  <button
                    type="button"
                    className={mark}
                    aria-pressed={chosen}
                    aria-describedby={noteId}
                    disabled={verified}
                    onClick={() => dispatch({ type: 'choose', change: { quality } })}
                  >
                    {qualityName(quality)}
                    {mark && <span aria-hidden="true"> {mark === 'ok' ? '✓' : '✗'}</span>}
                  </button>
                  {note && (
                    <span className="solo-lectores" id={noteId}>
                      {note}
                    </span>
                  )}
                </Fragment>
              )
            })}
          </div>
        ) : (
          <div className="desplegables">
            <label>
              <span>Acorde</span>
              <select
                value={answer.quality ?? ''}
                disabled={verified}
                onChange={(event) =>
                  dispatch({ type: 'choose', change: { quality: (event.target.value || null) as QualityKey | null } })
                }
              >
                <option value="">Elige el acorde</option>
                {answerQualities(catalog).map((quality) => (
                  <option key={quality} value={quality}>
                    {qualityName(quality)}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Inversión</span>
              <select
                value={answer.inversion === null ? '' : String(answer.inversion)}
                disabled={verified}
                onChange={(event) =>
                  dispatch({
                    type: 'choose',
                    change: { inversion: event.target.value === '' ? null : (Number(event.target.value) as Inversion) },
                  })
                }
              >
                <option value="">Elige la inversión</option>
                {INVERSIONS.map((inversion) => (
                  <option key={inversion} value={inversion}>
                    {inversionName(inversion)}
                  </option>
                ))}
              </select>
            </label>
          </div>
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
          {reading && (
            <div className="lectura-tonica">
              <p>
                Con tónica <strong>{voicing.root}</strong>, se lee <strong>{reading.name}</strong>. La tónica está en{' '}
                {reading.roots.map((note) => `la cuerda ${note.string}, traste ${note.fret}`).join(' y ')}.
              </p>
              {reading.equivalent && (
                <p>
                  Las mismas notas forman <strong>{reading.equivalent.name}</strong> si tomas{' '}
                  <strong>{reading.equivalent.root}</strong> como tónica. La inversión pasa a ser{' '}
                  <strong>{inversionName(reading.equivalent.inversion).toLowerCase()}</strong>.
                </p>
              )}
            </div>
          )}
          {result.fields.length > 1 && (
            <p className="resumen">
              {result.fields.filter((item) => item.correct).length} de {result.fields.length} campos correctos.
            </p>
          )}
          <ul className="correccion">
            {result.fields.map((item) => {
              const text = fieldText(item)
              return (
                <li key={item.field === 'degree' ? `degree-${item.slot}` : item.field} className={item.correct ? 'ok' : 'ko'}>
                  <span className="marca" aria-hidden="true">
                    {item.correct ? '✓' : '✗'}
                  </span>
                  <span>
                    <strong>
                      {text.name}: {item.correct ? 'correcto' : 'incorrecto'}.
                    </strong>{' '}
                    Tu respuesta: {text.given}.{item.correct ? '' : ` Solución: ${text.expected}.`}
                  </span>
                </li>
              )
            })}
          </ul>
          <button className="boton-principal" type="button" onClick={() => dispatch({ type: 'next', seed: newSeed() })}>
            Siguiente
          </button>
        </section>
      )}
    </main>
  )
}
